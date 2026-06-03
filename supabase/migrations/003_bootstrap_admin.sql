-- ============================================================================
-- Migration 003 — Bootstrap admin role for the project owner
--
-- The schema's seed user (00000000-0000-0000-0000-000000000001) is a placeholder
-- because real users have UUIDs assigned by Supabase Auth. This migration:
--   1) Removes the placeholder admin row if present.
--   2) Promotes the project owner's email to ADMIN, regardless of when they
--      signed up. We hard-code the owner's email here so this migration is
--      self-contained and idempotent.
--   3) Re-runnable safely.
--
-- To grant ADMIN to additional users at any time, run:
--   UPDATE public.users SET role = 'ADMIN' WHERE email = 'someone@example.com';
-- ============================================================================

-- Drop the placeholder seed admin if it's still hanging around (created by 001's seed).
DELETE FROM public.activity_streaks WHERE user_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM public.user_preferences WHERE user_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM public.users WHERE id = '00000000-0000-0000-0000-000000000001';

-- Promote the project owner. Idempotent — running a second time has no effect.
UPDATE public.users
SET role = 'ADMIN', updated_at = NOW()
WHERE email IN ('jhadivyansh2003@gmail.com', 'divyanshjha30@gmail.com')
  AND role <> 'ADMIN';

-- ============================================================================
-- Add a Postgres helper function so admin checks from the API are a single RPC.
-- The is_admin() function from migration 001 reads auth.uid() which only works
-- inside RLS context; the API uses service-role and passes the user id explicitly.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_user_admin(check_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = check_user_id AND role = 'ADMIN'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.is_user_admin IS
  'Returns true if the given user_id has the ADMIN role. SECURITY DEFINER so the API can call it via service role.';
