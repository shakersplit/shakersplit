# API Reference

12 serverless functions, deployed to `https://shakersplit.divyanshjha.in/api/*`. Authentication: pass the user's Supabase JWT as `Authorization: Bearer <jwt>`. All responses are JSON in the shape `{ success: true, data: ... }` or `{ success: false, error: { code, message, details? } }`.

## Function inventory

| File | Routes |
|---|---|
| `api/users/me.ts` | profile + push subs + data export |
| `api/food-logs.ts` | food log CRUD + AI parser |
| `api/workout-logs.ts` | workout log CRUD |
| `api/alcohol-logs.ts` | alcohol log CRUD |
| `api/weight-logs.ts` | weight log CRUD |
| `api/mental-health-logs.ts` | mental health log CRUD |
| `api/plans.ts` | weekly plan list/create |
| `api/plans/[id].ts` | weekly plan detail |
| `api/plans/[id]/entries.ts` | plan entries (with `?entryId=` for update/delete) |
| `api/friendships.ts` | friend requests, accept/decline |
| `api/analytics.ts` | dashboard + trends (`?type=`) |
| `api/admin.ts` | admin-only: users, recipes, routines, broadcasts (`?resource=`) |

## Endpoints in detail

### `/api/users/me`

| Method | Query | Description |
|---|---|---|
| `GET` | — | Get own user record |
| `GET` | `?action=push-subscriptions` | List devices receiving push |
| `GET` | `?action=export` | **Stream JSON dump** of all user data with `Content-Disposition: attachment` |
| `PATCH` | — | Update display name, avatar URL, height, weight, DOB |
| `DELETE` | — | Self-delete account (cascades) |
| `POST` | `?action=push-subscribe` | Body: `{ endpoint, keys: { p256dh, auth }, user_agent? }` |
| `POST` | `?action=push-unsubscribe` | Body: `{ endpoint }` |
| `POST` | `?action=push-test` | Send a test notification to all my devices |

### `/api/food-logs`

| Method | Query | Description |
|---|---|---|
| `GET` | — | List own logs (paginated, filterable by `from`/`to`/`meal_type`) |
| `GET` | `?id=:id` | Get one log |
| `POST` | — | Create log |
| `POST` | `?action=parse-ai` | Body: `{ description }`. Returns `{ meal_type, items, total_calories, total_protein_g, notes, confidence }` from Gemini. Returns 503 if `GEMINI_API_KEY` not set. |
| `PUT` | `?id=:id` | Update |
| `DELETE` | `?id=:id` | Delete |

Body for create/update follows `createFoodLogSchema` in `api/_lib/validators/food-log.validator.ts`:

```ts
{
  logged_at?: string;             // ISO 8601, defaults to now
  meal_type: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK' | 'PRE_GAME';
  food_items: { name, quantity, calories?, protein_g? }[];   // min 1
  total_calories?: number;
  total_protein_g?: number;
  photo_url?: string;             // Supabase Storage public URL
  notes?: string;
  share_with_friends?: boolean;   // default false
}
```

### `/api/workout-logs`, `/api/alcohol-logs`, `/api/weight-logs`, `/api/mental-health-logs`

Same shape as food-logs. Each takes resource-specific schemas (validators in `api/_lib/validators/`).

- Workout: `workout_type` enum, `duration_minutes`, `exercises[]`, `calories_burned?`
- Alcohol: `spirit_type`, `quantity_ml`, `mixer?`, `pre_game_meal_eaten`, `water_consumed_ml`, `intoxication_level (1-5)?`, `hangover_severity (1-5)?`
- Weight: `weight_kg`, `body_fat_pct?`, `notes?`. Unique-per-day index — POSTing twice on the same day returns 409 CONFLICT
- Mental: `mood_score (1-10)`, `sleep_hours?`, `sleep_quality (1-5)?`, `journal_entry?`, `tags[]?`

### `/api/plans` and `/api/plans/[id]/...`

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/plans` | List own plans |
| `POST` | `/api/plans` | Create — idempotent on `(user_id, week_start_date)` |
| `GET` | `/api/plans/:id` | Detail with entries inlined |
| `PUT` | `/api/plans/:id` | Update name / is_template |
| `DELETE` | `/api/plans/:id` | Delete plan + cascade entries |
| `GET` | `/api/plans/:id/entries` | List entries |
| `POST` | `/api/plans/:id/entries` | Create entry |
| `PUT` | `/api/plans/:id/entries?entryId=:eid` | Update entry |
| `DELETE` | `/api/plans/:id/entries?entryId=:eid` | Delete entry |

Entry body:
```ts
{
  day_of_week: 0|1|2|3|4|5|6;     // 0=Sunday
  category: 'FOOD' | 'WORKOUT' | 'ALCOHOL';
  time_slot?: string;
  content: object;                 // freeform JSONB
  notes?: string;
}
```

### `/api/friendships`

| Method | Query | Description |
|---|---|---|
| `GET` | — | List own friendships in any status. Returns `direction` ('outgoing' \| 'incoming') + `other_user` (joined display info) |
| `POST` | — | Body: `{ addressee_email }`. Anti-enumeration: returns `{ sent: true }` even if email doesn't exist. Auto-fires push notification. |
| `PATCH` | `?id=:id` | Body: `{ status: 'ACCEPTED' \| 'DECLINED' }`. Only addressee can act. ACCEPTED fires push to requester. |
| `DELETE` | `?id=:id` | Unfriend / cancel. Either party can call. Verifies ownership before delete. |

### `/api/analytics`

| Method | Query | Description |
|---|---|---|
| `GET` | `?type=dashboard` | Today + week aggregates, all 4 streaks, latest weight |
| `GET` | `?type=trends&days=N` | Daily-bucketed series (calories, workout minutes, alcohol drinks, weight) for last N days (clamped 7..90, default 30). Pre-fills empty days with zeros |

Dashboard shape:
```ts
{
  today: { food: { meals, calories }, workout: { sessions, minutes }, alcohol: { drinks, ml } };
  week:  { same shape };
  streaks: { food_log, workout, alcohol_free, overall };
  latest_weight: { weight_kg, body_fat_pct, logged_at } | null;
}
```

### `/api/admin` (admin-only — 403 for non-admin)

| Method | Query | Description |
|---|---|---|
| `GET` | `?resource=stats` | System-wide totals |
| `GET` | `?resource=users` | List all users with per-user log counts |
| `PATCH` | `?resource=users&id=:id` | Body `{ role?: 'USER'\|'ADMIN', display_name? }` (self-protected) |
| `DELETE` | `?resource=users&id=:id` | Cascade delete (self-protected) |
| `GET` | `?resource=recipes` | List ALL recipes (incl. private) |
| `POST` | `?resource=recipes` | Create recipe |
| `PATCH` | `?resource=recipes&id=:id` | Update recipe |
| `DELETE` | `?resource=recipes&id=:id` | Delete recipe |
| `GET` | `?resource=routines` | List ALL workout routines |
| `POST` | `?resource=routines` | Create routine |
| `PATCH` | `?resource=routines&id=:id` | Update routine |
| `DELETE` | `?resource=routines&id=:id` | Delete routine |
| `POST` | `?resource=push` | Body `{ title, body, url? }` — broadcast to all subscribed users |

## Direct Supabase reads (no API)

Some pages read directly from Supabase via the JS SDK with the user's JWT, relying on RLS:

| Page | Tables | Why |
|---|---|---|
| `ExploreRecipesPage` | `recipes WHERE is_public = true` | RLS policy `recipes_select_public` |
| `ExploreWorkoutsPage` | `workout_routines WHERE is_public = true` | RLS policy `workout_routines_select_public` |
| `GoalsPage` | `user_goals` | RLS policy `user_goals_select_own` |
| `WorkoutTemplatesPicker` | `workout_templates` | RLS policy `workout_templates_select_own` |
| `ActivityFeedPage` | `friend_activity_feed` view | RLS policies on underlying log tables |

This is intentional — going through the API would just add latency for already-RLS-protected reads.

## Standard error codes

| Code | HTTP | Meaning |
|---|---|---|
| `UNAUTHORIZED` | 401 | Missing / invalid JWT |
| `FORBIDDEN` | 403 | Authenticated but not permitted (admin route, ownership mismatch) |
| `NOT_FOUND` | 404 | Resource doesn't exist or doesn't belong to caller |
| `VALIDATION_ERROR` | 400 | Body failed Zod validation; `details` field has per-path errors |
| `CONFLICT` | 409 | Unique constraint violation (e.g. weight log already exists for today) |
| `RATE_LIMITED` | 429 | Upstream rate limit (Gemini, Resend) hit |
| `BAD_UPSTREAM` | 502 | Upstream API returned an error (Gemini, Supabase) |
| `INTERNAL_ERROR` | 500 | Unhandled error, check Vercel logs |
| `SERVICE_UNAVAILABLE` | 503 | Feature requires env var that isn't set (e.g. `GEMINI_API_KEY`) |
| `METHOD_NOT_ALLOWED` | 405 | Method not implemented for this route |

## Rate limits

Set in Supabase Auth config (`supabase/config.toml`):

| Limit | Value |
|---|---|
| `email_sent` | 150/hour |
| `sign_in_sign_ups` | 100 / 5min / IP |
| `token_verifications` | 100 / 5min / IP |
| `token_refresh` | 150 / 5min / IP |
| `max_frequency` (per-user email) | 60s |

Vercel itself has soft limits on free-tier function invocations (100k/day) — well above expected load.
