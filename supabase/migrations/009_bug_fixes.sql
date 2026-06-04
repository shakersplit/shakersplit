-- ============================================================================
-- Migration 009 — Bug fixes from audit
--
-- 1. Recreate friend_activity_feed view to include mental_health_logs (was omitted
--    in 007 even though the share_with_friends column + RLS policy exist).
-- 2. Add UPDATE policy on push_subscriptions so the API can bump last_used_at.
-- ============================================================================

-- 1. Recreate the view with the missing fifth UNION ALL.
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
    WHERE we.share_with_friends = TRUE
  UNION ALL
  SELECT
    m.user_id,
    'mental'::text AS kind,
    m.id,
    m.logged_at,
    jsonb_build_object(
      'mood_score', m.mood_score,
      'sleep_hours', m.sleep_hours,
      'sleep_quality', m.sleep_quality,
      -- Don't expose journal_entry through the public feed — too personal even with friends.
      -- Tags + mood are enough to convey "I'm having a rough day" without sharing the raw thoughts.
      'tags', m.tags
    ) AS payload
    FROM public.mental_health_logs m
    WHERE m.share_with_friends = TRUE;

-- 2. Add UPDATE policy on push_subscriptions so sendPushToUser() can bump last_used_at
-- when a notification fires successfully. Without this, the push helper silently fails
-- on the update step (we don't error-check that path) but the resulting timestamps stay
-- stale forever, which makes "device is dormant" detection impossible.
DROP POLICY IF EXISTS push_subscriptions_update_own ON public.push_subscriptions;
CREATE POLICY push_subscriptions_update_own ON public.push_subscriptions
    FOR UPDATE USING (user_id = auth.uid() OR public.is_admin());
