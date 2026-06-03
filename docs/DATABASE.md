# Database

PostgreSQL 17 via Supabase. All migrations in `supabase/migrations/`, idempotent (re-runnable).

## Migrations history

| File | What it adds |
|---|---|
| `001_initial_schema.sql` | All 13 base tables, base RLS policies, `is_admin()` helper, seed admin |
| `002_auth_user_sync.sql` | `auth.users` → `public.users` insert trigger, plus seed prefs/streaks |
| `003_bootstrap_admin.sql` | Promotes project owner emails to ADMIN, removes placeholder seed |
| `004_streak_triggers.sql` | `bump_streak()` + per-table INSERT triggers, `compute_alcohol_free_streak()` RPC, backfill |
| `005_photos_storage.sql` | Photos bucket + 4 storage RLS policies (public read, owner write/update/delete) |
| `006_push_subscriptions.sql` | `push_subscriptions` table + RLS |
| `007_activity_feed.sql` | `share_with_friends` columns, `are_friends()` RPC, friend-read RLS, `friend_activity_feed` view |
| `008_goals_and_templates.sql` | `user_goals` + `workout_templates` tables with RLS |

## Tables

### Identity + auth

- **`users`** — synced from `auth.users` via the trigger in 002. Stores display_name, avatar_url, role (USER/ADMIN), height_cm, weight_kg, date_of_birth.
- **`user_preferences`** — theme, notifications_enabled, default_units (METRIC/IMPERIAL), timezone.
- **`push_subscriptions`** — one row per device (endpoint UNIQUE), p256dh + auth keys for Web Push.

### Logs

- **`food_logs`** — meal_type enum, food_items JSONB array, total_calories/protein, photo_url, notes, share_with_friends.
- **`workout_logs`** — workout_type enum, duration_minutes, exercises JSONB array, calories_burned, notes, share_with_friends.
- **`alcohol_logs`** — spirit_type, quantity_ml, mixer, pre_game_meal_eaten, water_consumed_ml, intoxication_level (1-5), hangover_severity (1-5), share_with_friends.
- **`weight_logs`** — weight_kg, body_fat_pct (0-100), notes, share_with_friends. **Unique per user per day** via expression index.
- **`mental_health_logs`** — mood_score (1-10), sleep_hours, sleep_quality (1-5), journal_entry, tags TEXT[], share_with_friends.

### Plans + goals + templates

- **`weekly_plans`** — user_id + week_start_date (UNIQUE), name, is_template.
- **`plan_entries`** — weekly_plan_id, day_of_week (0-6), category enum, time_slot, content JSONB, notes.
- **`user_goals`** — goal_type enum, target_value, period (DAY/WEEK/MONTH/ONGOING), label, is_active. **Unique partial index on (user_id, goal_type) WHERE is_active=true**.
- **`workout_templates`** — name, workout_type, duration_minutes, exercises JSONB, notes, use_count, last_used_at.

### Social

- **`friendships`** — requester_id + addressee_id (UNIQUE pair), status (PENDING/ACCEPTED/DECLINED), self-friend forbidden via CHECK.
- **`activity_streaks`** — streak_type (FOOD_LOG/WORKOUT/ALCOHOL_FREE/OVERALL), current_count, longest_count, last_logged_at. UNIQUE per (user_id, streak_type).
- **`friend_activity_feed`** (view) — UNION ALL of all log tables filtered by `share_with_friends = TRUE`. RLS on underlying tables enforces friend-only visibility.

### Content

- **`recipes`** — title, description, ingredients JSONB, instructions, youtube_url, category enum (PRE_WORKOUT/POST_WORKOUT/PRE_GAME/HEALTHY/COCKTAIL/SNACK), calories, protein_g, prep_time_minutes, photo_url, is_public.
- **`workout_routines`** — title, description, workout_type, exercises JSONB, youtube_url, difficulty (BEGINNER/INTERMEDIATE/ADVANCED), is_public.

## RLS strategy

Two patterns:

### 1. Owner-only tables

```sql
CREATE POLICY <table>_select_own ON <table>
  FOR SELECT USING (user_id = auth.uid() OR is_admin());
CREATE POLICY <table>_insert_own ON <table>
  FOR INSERT WITH CHECK (user_id = auth.uid());
-- ... update + delete same pattern
```

Used for: every log table, user_preferences, weekly_plans, user_goals, workout_templates, push_subscriptions, activity_streaks.

### 2. Public-read tables

```sql
CREATE POLICY recipes_select_public ON recipes
  FOR SELECT USING (is_public = TRUE OR created_by = auth.uid() OR is_admin());
```

Used for: recipes, workout_routines.

### 3. Friend-read overlay (migration 007)

Adds an additional SELECT policy to log tables:

```sql
CREATE POLICY food_logs_select_friends ON food_logs
  FOR SELECT USING (
    share_with_friends = TRUE
    AND are_friends(auth.uid(), user_id)
  );
```

`are_friends(viewer, target)` SECURITY DEFINER STABLE function checks the `friendships` table for an `ACCEPTED` row in either direction.

## Helper functions

### `is_admin()` — check if current user is admin
```sql
SELECT EXISTS (
  SELECT 1 FROM users
  WHERE id = auth.uid() AND role = 'ADMIN'
);
```
SECURITY DEFINER. Used in every RLS policy as the admin override.

### `is_user_admin(uuid)` — same check but for an explicit user_id
Used by the API where `auth.uid()` isn't relevant (service-role calls).

### `bump_streak(user_id, streak_type, logged_at)` — incremental streak update

Logic:
- First-ever entry → INSERT with current=1
- Same-day re-log → no-op
- Logged date is yesterday's last+1 → current += 1
- Gap detected → reset current to 1
- Older-date entry → leave streak alone

Trigger-fired on every INSERT to `food_logs`, `workout_logs`. `alcohol_logs` resets ALCOHOL_FREE on insert; sober days computed on read.

### `compute_alcohol_free_streak(user_id)` — sober-days RPC

Returns `TODAY - MAX(alcohol_logs.logged_at)`, or `TODAY - first activity` for never-drank users. Called from `/api/analytics?type=dashboard` on every load — sober days produce no rows so a trigger alone can't track them.

### `are_friends(viewer, target)` — friendship check
Used in friend-read RLS policies on log tables.

### `update_updated_at_column()` — generic trigger function
Called from `BEFORE UPDATE` triggers on every table that has an `updated_at` column.

## Storage

Single bucket `photos`:
- `public = true` (read-anyone)
- `file_size_limit = 10485760` (10 MB)
- `allowed_mime_types = jpeg / png / webp / heic`

Path convention: `<user-uid>/<scope>/<random-uuid>.jpg`
Where `<scope>` is one of: `food`, `recipe`, `workout`, future scopes.

RLS policies on `storage.objects`:
- `photos_public_read` — SELECT for anon + authenticated WHERE bucket_id='photos'
- `photos_owner_insert` — INSERT for authenticated WHERE first path segment = auth.uid()::text
- `photos_owner_update` — UPDATE same condition
- `photos_owner_delete` — DELETE same condition

## Recovering admin access

If you lose admin access to all your accounts:

```sql
UPDATE public.users
SET role = 'ADMIN'
WHERE email = 'your-email@example.com';
```

Run this via Supabase dashboard SQL editor. Requires database owner privileges (all dashboard SQL editor sessions are owner).

## Schema introspection

To see live table structure:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'food_logs'
ORDER BY ordinal_position;
```

For RLS policies on a table:
```sql
SELECT polname, polcmd, polroles::regrole[], polqual::text, polwithcheck::text
FROM pg_policy
WHERE polrelid = 'public.food_logs'::regclass;
```

## Backfills + maintenance

The `004_streak_triggers.sql` migration includes a one-shot backfill at the bottom. Re-running it is safe (idempotent via `bump_streak`'s same-day no-op).

If you ever need to recompute all streaks from scratch:

```sql
-- Delete current streak counts, then re-run backfill block from 004.
-- Or write a custom procedure that walks every user's full log history.
```
