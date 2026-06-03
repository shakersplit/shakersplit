-- ============================================================================
-- Migration 006 — Web Push subscriptions
--
-- Stores PushSubscription objects (one per device per user) for sending Web Push
-- notifications via VAPID. iOS/Safari + Android/Chrome both use this same standard.
--
-- A user can have multiple subscriptions (laptop + phone + tablet) — each one is a
-- separate row keyed by the endpoint URL.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL
        REFERENCES public.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,    -- The push service URL — unique per device.
    p256dh TEXT NOT NULL,             -- Public key for encrypting the payload.
    auth TEXT NOT NULL,               -- Auth secret for the same.
    user_agent TEXT,                  -- Best-effort device identifier shown in Profile.
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.push_subscriptions IS
  'Web Push subscriptions per device. One row per browser/device, keyed by push service endpoint.';

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);

-- RLS — users only see/manage their own subscriptions; service role bypasses for sending.
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS push_subscriptions_select_own ON public.push_subscriptions;
DROP POLICY IF EXISTS push_subscriptions_insert_own ON public.push_subscriptions;
DROP POLICY IF EXISTS push_subscriptions_delete_own ON public.push_subscriptions;

CREATE POLICY push_subscriptions_select_own ON public.push_subscriptions
    FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY push_subscriptions_insert_own ON public.push_subscriptions
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY push_subscriptions_delete_own ON public.push_subscriptions
    FOR DELETE USING (user_id = auth.uid() OR public.is_admin());
