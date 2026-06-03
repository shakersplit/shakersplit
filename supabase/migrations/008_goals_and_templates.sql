-- ============================================================================
-- Migration 008 — User goals + workout templates
--
-- Two new tables for the Goals and Workout Templates features.
-- Both are simple, owner-scoped, with idempotent CREATE IF NOT EXISTS.
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- USER GOALS
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL
        REFERENCES public.users(id) ON DELETE CASCADE,
    goal_type VARCHAR(40) NOT NULL
        CHECK (goal_type IN (
            'WORKOUTS_PER_WEEK',
            'CALORIES_PER_DAY_MAX',
            'CALORIES_PER_DAY_MIN',
            'PROTEIN_PER_DAY_MIN',
            'ALCOHOL_FREE_DAYS_PER_WEEK',
            'WEIGHT_TARGET_KG',
            'MOOD_AVG_MIN'
        )),
    target_value DECIMAL(10,2) NOT NULL,
    -- Period determines the calculation window for "actual" — week starts Monday.
    period VARCHAR(10) NOT NULL DEFAULT 'WEEK'
        CHECK (period IN ('DAY', 'WEEK', 'MONTH', 'ONGOING')),
    label VARCHAR(120),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- A user can have at most one ACTIVE goal of a given type at a time.
    UNIQUE NULLS NOT DISTINCT (user_id, goal_type, is_active)
);

COMMENT ON TABLE public.user_goals IS 'Per-user goals with target value + period for progress tracking on the dashboard.';

CREATE INDEX IF NOT EXISTS idx_user_goals_user_id ON public.user_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_user_goals_active ON public.user_goals(user_id, is_active) WHERE is_active = TRUE;

DROP TRIGGER IF EXISTS trg_user_goals_updated_at ON public.user_goals;
CREATE TRIGGER trg_user_goals_updated_at
    BEFORE UPDATE ON public.user_goals
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.user_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_goals_select_own ON public.user_goals;
DROP POLICY IF EXISTS user_goals_insert_own ON public.user_goals;
DROP POLICY IF EXISTS user_goals_update_own ON public.user_goals;
DROP POLICY IF EXISTS user_goals_delete_own ON public.user_goals;

CREATE POLICY user_goals_select_own ON public.user_goals
    FOR SELECT USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY user_goals_insert_own ON public.user_goals
    FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY user_goals_update_own ON public.user_goals
    FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY user_goals_delete_own ON public.user_goals
    FOR DELETE USING (user_id = auth.uid() OR public.is_admin());

-- ────────────────────────────────────────────────────────────────────────────
-- WORKOUT TEMPLATES — saved favorite workouts the user can re-log instantly.
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.workout_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL
        REFERENCES public.users(id) ON DELETE CASCADE,
    name VARCHAR(80) NOT NULL,
    workout_type VARCHAR(20) NOT NULL
        CHECK (workout_type IN ('GYM_PUSH', 'GYM_PULL', 'GYM_LEGS', 'GYM_UPPER', 'GYM_LOWER', 'GYM_FULL', 'RUN', 'WALK', 'SPORT', 'OTHER')),
    duration_minutes INT NOT NULL CHECK (duration_minutes > 0),
    exercises JSONB NOT NULL DEFAULT '[]',
    notes TEXT,
    use_count INT NOT NULL DEFAULT 0,        -- bumped each time user logs from this template
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.workout_templates IS 'User-saved workout templates for one-click logging.';

CREATE INDEX IF NOT EXISTS idx_workout_templates_user_id ON public.workout_templates(user_id);

DROP TRIGGER IF EXISTS trg_workout_templates_updated_at ON public.workout_templates;
CREATE TRIGGER trg_workout_templates_updated_at
    BEFORE UPDATE ON public.workout_templates
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.workout_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workout_templates_select_own ON public.workout_templates;
DROP POLICY IF EXISTS workout_templates_insert_own ON public.workout_templates;
DROP POLICY IF EXISTS workout_templates_update_own ON public.workout_templates;
DROP POLICY IF EXISTS workout_templates_delete_own ON public.workout_templates;

CREATE POLICY workout_templates_select_own ON public.workout_templates
    FOR SELECT USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY workout_templates_insert_own ON public.workout_templates
    FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY workout_templates_update_own ON public.workout_templates
    FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY workout_templates_delete_own ON public.workout_templates
    FOR DELETE USING (user_id = auth.uid() OR public.is_admin());
