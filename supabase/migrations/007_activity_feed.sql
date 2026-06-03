-- ============================================================================
-- Migration 007 — Activity feed visibility
--
-- Adds a `share_with_friends` boolean to each log table so users can opt
-- individual entries in/out of the feed. Defaults to FALSE (privacy-first).
--
-- Adds RLS policies that let ACCEPTED friends read shared rows from each log
-- table. Plus a `friend_activity_feed` view that the frontend queries.
-- ============================================================================

-- 1. Add share_with_friends column to each log table (idempotent).
ALTER TABLE public.food_logs        ADD COLUMN IF NOT EXISTS share_with_friends BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.workout_logs     ADD COLUMN IF NOT EXISTS share_with_friends BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.alcohol_logs     ADD COLUMN IF NOT EXISTS share_with_friends BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.weight_logs      ADD COLUMN IF NOT EXISTS share_with_friends BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.mental_health_logs ADD COLUMN IF NOT EXISTS share_with_friends BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Helper: returns true if `viewer` and `target` are accepted friends.
CREATE OR REPLACE FUNCTION public.are_friends(viewer UUID, target UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friendships
    WHERE status = 'ACCEPTED'
      AND (
        (requester_id = viewer AND addressee_id = target)
        OR (requester_id = target AND addressee_id = viewer)
      )
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 3. Add friend-read RLS policies (idempotent: drop+create).
DROP POLICY IF EXISTS food_logs_select_friends ON public.food_logs;
CREATE POLICY food_logs_select_friends ON public.food_logs
    FOR SELECT USING (
      share_with_friends = TRUE
      AND public.are_friends(auth.uid(), user_id)
    );

DROP POLICY IF EXISTS workout_logs_select_friends ON public.workout_logs;
CREATE POLICY workout_logs_select_friends ON public.workout_logs
    FOR SELECT USING (
      share_with_friends = TRUE
      AND public.are_friends(auth.uid(), user_id)
    );

DROP POLICY IF EXISTS alcohol_logs_select_friends ON public.alcohol_logs;
CREATE POLICY alcohol_logs_select_friends ON public.alcohol_logs
    FOR SELECT USING (
      share_with_friends = TRUE
      AND public.are_friends(auth.uid(), user_id)
    );

DROP POLICY IF EXISTS weight_logs_select_friends ON public.weight_logs;
CREATE POLICY weight_logs_select_friends ON public.weight_logs
    FOR SELECT USING (
      share_with_friends = TRUE
      AND public.are_friends(auth.uid(), user_id)
    );

DROP POLICY IF EXISTS mental_health_logs_select_friends ON public.mental_health_logs;
CREATE POLICY mental_health_logs_select_friends ON public.mental_health_logs
    FOR SELECT USING (
      share_with_friends = TRUE
      AND public.are_friends(auth.uid(), user_id)
    );

-- 4. Unified view used by the Feed page. UNION ALL on shared rows from all log
-- tables, normalized to a common shape: (user_id, kind, summary, logged_at).
-- The view itself is RLS-aware via the underlying tables.
CREATE OR REPLACE VIEW public.friend_activity_feed AS
  SELECT
    f.user_id,
    'food'::text AS kind,
    f.id,
    f.logged_at,
    jsonb_build_object(
      'meal_type', f.meal_type,
      'items', f.food_items,
      'calories', f.total_calories,
      'photo_url', f.photo_url,
      'notes', f.notes
    ) AS payload
    FROM public.food_logs f
    WHERE f.share_with_friends = TRUE
  UNION ALL
  SELECT
    w.user_id,
    'workout'::text AS kind,
    w.id,
    w.logged_at,
    jsonb_build_object(
      'workout_type', w.workout_type,
      'duration_minutes', w.duration_minutes,
      'exercises', w.exercises,
      'calories_burned', w.calories_burned,
      'notes', w.notes
    ) AS payload
    FROM public.workout_logs w
    WHERE w.share_with_friends = TRUE
  UNION ALL
  SELECT
    a.user_id,
    'alcohol'::text AS kind,
    a.id,
    a.logged_at,
    jsonb_build_object(
      'spirit_type', a.spirit_type,
      'quantity_ml', a.quantity_ml,
      'mixer', a.mixer,
      'notes', a.notes
    ) AS payload
    FROM public.alcohol_logs a
    WHERE a.share_with_friends = TRUE
  UNION ALL
  SELECT
    we.user_id,
    'weight'::text AS kind,
    we.id,
    we.logged_at,
    jsonb_build_object(
      'weight_kg', we.weight_kg,
      'body_fat_pct', we.body_fat_pct,
      'notes', we.notes
    ) AS payload
    FROM public.weight_logs we
    WHERE we.share_with_friends = TRUE;

COMMENT ON VIEW public.friend_activity_feed IS
  'Unified feed of shared logs across food/workout/alcohol/weight tables. RLS on the underlying tables enforces friend-only visibility automatically.';
