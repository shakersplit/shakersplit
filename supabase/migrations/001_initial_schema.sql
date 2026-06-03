-- ============================================================================
-- ShakerSplit — Complete Database Schema
-- A health & lifestyle tracker: food, workouts, alcohol, mental health, plans
--
-- Compatible with: Supabase (PostgreSQL 15) and standard PostgreSQL
-- Features: UUID PKs, CHECK constraints, RLS policies, auto-updated timestamps,
--           expression indexes, JSONB columns, seed data
--
-- Created: 2026-06-03
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- TRIGGER FUNCTION: auto-update updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TABLE 1: users
-- ============================================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(100),
    avatar_url TEXT,
    role VARCHAR(20) NOT NULL DEFAULT 'USER'
        CHECK (role IN ('ADMIN', 'USER')),
    height_cm DECIMAL(5,1),
    weight_kg DECIMAL(5,1),
    date_of_birth DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE users IS 'Core user accounts, synced with Supabase Auth. Stores profile info and role.';

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TABLE 2: user_preferences
-- ============================================================================

CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE
        REFERENCES users(id) ON DELETE CASCADE,
    theme VARCHAR(10) NOT NULL DEFAULT 'DARK'
        CHECK (theme IN ('DARK', 'LIGHT')),
    notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    default_units VARCHAR(10) NOT NULL DEFAULT 'METRIC'
        CHECK (default_units IN ('METRIC', 'IMPERIAL')),
    timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Kolkata',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE user_preferences IS 'Per-user app preferences: theme, units, timezone, notifications.';

CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);

CREATE TRIGGER trg_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TABLE 3: weekly_plans
-- ============================================================================

CREATE TABLE weekly_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,
    week_start_date DATE NOT NULL,
    name VARCHAR(100),
    is_template BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, week_start_date)
);

COMMENT ON TABLE weekly_plans IS 'Weekly plans for food, workouts, and alcohol. One plan per user per week.';

CREATE INDEX idx_weekly_plans_user_id ON weekly_plans(user_id);
CREATE INDEX idx_weekly_plans_week_start ON weekly_plans(week_start_date);

CREATE TRIGGER trg_weekly_plans_updated_at
    BEFORE UPDATE ON weekly_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TABLE 4: plan_entries
-- ============================================================================

CREATE TABLE plan_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    weekly_plan_id UUID NOT NULL
        REFERENCES weekly_plans(id) ON DELETE CASCADE,
    day_of_week INT NOT NULL
        CHECK (day_of_week >= 0 AND day_of_week <= 6),
    category VARCHAR(20) NOT NULL
        CHECK (category IN ('FOOD', 'WORKOUT', 'ALCOHOL')),
    time_slot VARCHAR(50),
    content JSONB NOT NULL DEFAULT '{}',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE plan_entries IS 'Individual plan entries within a weekly plan. Flexible JSONB content per category.';

CREATE INDEX idx_plan_entries_weekly_plan_id ON plan_entries(weekly_plan_id);
CREATE INDEX idx_plan_entries_category ON plan_entries(category);

-- ============================================================================
-- TABLE 5: food_logs
-- ============================================================================

CREATE TABLE food_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,
    logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    meal_type VARCHAR(20) NOT NULL
        CHECK (meal_type IN ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'PRE_GAME')),
    food_items JSONB NOT NULL DEFAULT '[]',
    total_calories DECIMAL(7,1),
    total_protein_g DECIMAL(5,1),
    photo_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE food_logs IS 'Food intake logs with meal type, items (JSONB), macros, and optional photo.';

CREATE INDEX idx_food_logs_user_id ON food_logs(user_id);
CREATE INDEX idx_food_logs_logged_at ON food_logs(logged_at);
CREATE INDEX idx_food_logs_meal_type ON food_logs(meal_type);

-- ============================================================================
-- TABLE 6: workout_logs
-- ============================================================================

CREATE TABLE workout_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,
    logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    workout_type VARCHAR(20) NOT NULL
        CHECK (workout_type IN ('GYM_PUSH', 'GYM_PULL', 'GYM_LEGS', 'GYM_UPPER', 'GYM_LOWER', 'GYM_FULL', 'RUN', 'WALK', 'SPORT', 'OTHER')),
    duration_minutes INT NOT NULL
        CHECK (duration_minutes > 0),
    exercises JSONB NOT NULL DEFAULT '[]',
    calories_burned DECIMAL(7,1),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE workout_logs IS 'Workout session logs: gym splits, runs, walks, sports. Exercises stored as JSONB.';

CREATE INDEX idx_workout_logs_user_id ON workout_logs(user_id);
CREATE INDEX idx_workout_logs_logged_at ON workout_logs(logged_at);
CREATE INDEX idx_workout_logs_workout_type ON workout_logs(workout_type);

-- ============================================================================
-- TABLE 7: alcohol_logs
-- ============================================================================

CREATE TABLE alcohol_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,
    logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    spirit_type VARCHAR(50) NOT NULL,
    quantity_ml DECIMAL(6,1) NOT NULL
        CHECK (quantity_ml > 0),
    mixer VARCHAR(100),
    pre_game_meal_eaten BOOLEAN NOT NULL DEFAULT FALSE,
    water_consumed_ml DECIMAL(6,1) DEFAULT 0,
    intoxication_level INT
        CHECK (intoxication_level >= 1 AND intoxication_level <= 5),
    hangover_severity INT
        CHECK (hangover_severity >= 1 AND hangover_severity <= 5),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE alcohol_logs IS 'Alcohol consumption logs with harm-reduction fields: pre-game meal, water, intoxication/hangover scores.';

CREATE INDEX idx_alcohol_logs_user_id ON alcohol_logs(user_id);
CREATE INDEX idx_alcohol_logs_logged_at ON alcohol_logs(logged_at);

-- ============================================================================
-- TABLE 8: mental_health_logs
-- ============================================================================

CREATE TABLE mental_health_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,
    logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    mood_score INT NOT NULL
        CHECK (mood_score >= 1 AND mood_score <= 10),
    sleep_hours DECIMAL(3,1),
    sleep_quality INT
        CHECK (sleep_quality >= 1 AND sleep_quality <= 5),
    journal_entry TEXT,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE mental_health_logs IS 'Mental wellness logs: mood (1-10), sleep tracking, journal entries, freeform tags.';

CREATE INDEX idx_mental_health_logs_user_id ON mental_health_logs(user_id);
CREATE INDEX idx_mental_health_logs_logged_at ON mental_health_logs(logged_at);

-- ============================================================================
-- TABLE 9: weight_logs
-- ============================================================================

CREATE TABLE weight_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,
    logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    weight_kg DECIMAL(5,1) NOT NULL
        CHECK (weight_kg > 0),
    body_fat_pct DECIMAL(4,1)
        CHECK (body_fat_pct >= 0 AND body_fat_pct <= 100),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE weight_logs IS 'Daily weight and body fat tracking. One entry per user per day enforced via expression index.';

CREATE INDEX idx_weight_logs_user_id ON weight_logs(user_id);
CREATE INDEX idx_weight_logs_logged_at ON weight_logs(logged_at);

-- Expression-based unique constraint: one weight log per user per day
CREATE UNIQUE INDEX idx_weight_logs_user_day
    ON weight_logs(user_id, (logged_at::date));

-- ============================================================================
-- TABLE 10: recipes
-- ============================================================================

CREATE TABLE recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by UUID
        REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    ingredients JSONB NOT NULL DEFAULT '[]',
    instructions TEXT,
    youtube_url TEXT,
    category VARCHAR(30) NOT NULL
        CHECK (category IN ('PRE_WORKOUT', 'POST_WORKOUT', 'PRE_GAME', 'HEALTHY', 'COCKTAIL', 'SNACK')),
    calories DECIMAL(7,1),
    protein_g DECIMAL(5,1),
    prep_time_minutes INT,
    photo_url TEXT,
    is_public BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE recipes IS 'Recipe library with ingredients, instructions, YouTube links. Can be public or private.';

CREATE INDEX idx_recipes_created_by ON recipes(created_by);
CREATE INDEX idx_recipes_category ON recipes(category);
CREATE INDEX idx_recipes_is_public ON recipes(is_public);

CREATE TRIGGER trg_recipes_updated_at
    BEFORE UPDATE ON recipes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TABLE 11: workout_routines
-- ============================================================================

CREATE TABLE workout_routines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by UUID
        REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    workout_type VARCHAR(20) NOT NULL
        CHECK (workout_type IN ('GYM_PUSH', 'GYM_PULL', 'GYM_LEGS', 'GYM_UPPER', 'GYM_LOWER', 'GYM_FULL', 'RUN', 'WALK', 'SPORT', 'OTHER')),
    exercises JSONB NOT NULL DEFAULT '[]',
    youtube_url TEXT,
    difficulty VARCHAR(20) NOT NULL
        CHECK (difficulty IN ('BEGINNER', 'INTERMEDIATE', 'ADVANCED')),
    is_public BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE workout_routines IS 'Reusable workout routine templates with exercises, difficulty level, and video links.';

CREATE INDEX idx_workout_routines_created_by ON workout_routines(created_by);
CREATE INDEX idx_workout_routines_workout_type ON workout_routines(workout_type);
CREATE INDEX idx_workout_routines_is_public ON workout_routines(is_public);

CREATE TRIGGER trg_workout_routines_updated_at
    BEFORE UPDATE ON workout_routines
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TABLE 12: friendships
-- ============================================================================

CREATE TABLE friendships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,
    addressee_id UUID NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(requester_id, addressee_id),
    CHECK (requester_id != addressee_id)
);

COMMENT ON TABLE friendships IS 'Friend connections between users. Bi-directional once accepted.';

CREATE INDEX idx_friendships_requester_id ON friendships(requester_id);
CREATE INDEX idx_friendships_addressee_id ON friendships(addressee_id);
CREATE INDEX idx_friendships_status ON friendships(status);

-- ============================================================================
-- TABLE 13: activity_streaks
-- ============================================================================

CREATE TABLE activity_streaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,
    streak_type VARCHAR(30) NOT NULL
        CHECK (streak_type IN ('FOOD_LOG', 'WORKOUT', 'ALCOHOL_FREE', 'OVERALL')),
    current_count INT NOT NULL DEFAULT 0,
    longest_count INT NOT NULL DEFAULT 0,
    last_logged_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, streak_type)
);

COMMENT ON TABLE activity_streaks IS 'Gamification streaks: consecutive days of logging food, working out, staying alcohol-free, or overall engagement.';

CREATE INDEX idx_activity_streaks_user_id ON activity_streaks(user_id);

CREATE TRIGGER trg_activity_streaks_updated_at
    BEFORE UPDATE ON activity_streaks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE alcohol_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE mental_health_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_streaks ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND role = 'ADMIN'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ────────────────────────────────────────────────────────────────────────────
-- USERS policies
-- ────────────────────────────────────────────────────────────────────────────

CREATE POLICY users_select_own ON users
    FOR SELECT USING (id = auth.uid() OR is_admin());

CREATE POLICY users_update_own ON users
    FOR UPDATE USING (id = auth.uid() OR is_admin());

CREATE POLICY users_insert_own ON users
    FOR INSERT WITH CHECK (id = auth.uid() OR is_admin());

CREATE POLICY users_delete_admin ON users
    FOR DELETE USING (is_admin());

-- ────────────────────────────────────────────────────────────────────────────
-- USER_PREFERENCES policies
-- ────────────────────────────────────────────────────────────────────────────

CREATE POLICY user_preferences_select ON user_preferences
    FOR SELECT USING (user_id = auth.uid() OR is_admin());

CREATE POLICY user_preferences_insert ON user_preferences
    FOR INSERT WITH CHECK (user_id = auth.uid() OR is_admin());

CREATE POLICY user_preferences_update ON user_preferences
    FOR UPDATE USING (user_id = auth.uid() OR is_admin());

CREATE POLICY user_preferences_delete ON user_preferences
    FOR DELETE USING (user_id = auth.uid() OR is_admin());

-- ────────────────────────────────────────────────────────────────────────────
-- WEEKLY_PLANS policies
-- ────────────────────────────────────────────────────────────────────────────

CREATE POLICY weekly_plans_select ON weekly_plans
    FOR SELECT USING (user_id = auth.uid() OR is_admin());

CREATE POLICY weekly_plans_insert ON weekly_plans
    FOR INSERT WITH CHECK (user_id = auth.uid() OR is_admin());

CREATE POLICY weekly_plans_update ON weekly_plans
    FOR UPDATE USING (user_id = auth.uid() OR is_admin());

CREATE POLICY weekly_plans_delete ON weekly_plans
    FOR DELETE USING (user_id = auth.uid() OR is_admin());

-- ────────────────────────────────────────────────────────────────────────────
-- PLAN_ENTRIES policies (access via parent weekly_plan ownership)
-- ────────────────────────────────────────────────────────────────────────────

CREATE POLICY plan_entries_select ON plan_entries
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM weekly_plans
            WHERE weekly_plans.id = plan_entries.weekly_plan_id
            AND (weekly_plans.user_id = auth.uid() OR is_admin())
        )
    );

CREATE POLICY plan_entries_insert ON plan_entries
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM weekly_plans
            WHERE weekly_plans.id = plan_entries.weekly_plan_id
            AND (weekly_plans.user_id = auth.uid() OR is_admin())
        )
    );

CREATE POLICY plan_entries_update ON plan_entries
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM weekly_plans
            WHERE weekly_plans.id = plan_entries.weekly_plan_id
            AND (weekly_plans.user_id = auth.uid() OR is_admin())
        )
    );

CREATE POLICY plan_entries_delete ON plan_entries
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM weekly_plans
            WHERE weekly_plans.id = plan_entries.weekly_plan_id
            AND (weekly_plans.user_id = auth.uid() OR is_admin())
        )
    );

-- ────────────────────────────────────────────────────────────────────────────
-- FOOD_LOGS policies
-- ────────────────────────────────────────────────────────────────────────────

CREATE POLICY food_logs_select ON food_logs
    FOR SELECT USING (user_id = auth.uid() OR is_admin());

CREATE POLICY food_logs_insert ON food_logs
    FOR INSERT WITH CHECK (user_id = auth.uid() OR is_admin());

CREATE POLICY food_logs_update ON food_logs
    FOR UPDATE USING (user_id = auth.uid() OR is_admin());

CREATE POLICY food_logs_delete ON food_logs
    FOR DELETE USING (user_id = auth.uid() OR is_admin());

-- ────────────────────────────────────────────────────────────────────────────
-- WORKOUT_LOGS policies
-- ────────────────────────────────────────────────────────────────────────────

CREATE POLICY workout_logs_select ON workout_logs
    FOR SELECT USING (user_id = auth.uid() OR is_admin());

CREATE POLICY workout_logs_insert ON workout_logs
    FOR INSERT WITH CHECK (user_id = auth.uid() OR is_admin());

CREATE POLICY workout_logs_update ON workout_logs
    FOR UPDATE USING (user_id = auth.uid() OR is_admin());

CREATE POLICY workout_logs_delete ON workout_logs
    FOR DELETE USING (user_id = auth.uid() OR is_admin());

-- ────────────────────────────────────────────────────────────────────────────
-- ALCOHOL_LOGS policies
-- ────────────────────────────────────────────────────────────────────────────

CREATE POLICY alcohol_logs_select ON alcohol_logs
    FOR SELECT USING (user_id = auth.uid() OR is_admin());

CREATE POLICY alcohol_logs_insert ON alcohol_logs
    FOR INSERT WITH CHECK (user_id = auth.uid() OR is_admin());

CREATE POLICY alcohol_logs_update ON alcohol_logs
    FOR UPDATE USING (user_id = auth.uid() OR is_admin());

CREATE POLICY alcohol_logs_delete ON alcohol_logs
    FOR DELETE USING (user_id = auth.uid() OR is_admin());

-- ────────────────────────────────────────────────────────────────────────────
-- MENTAL_HEALTH_LOGS policies
-- ────────────────────────────────────────────────────────────────────────────

CREATE POLICY mental_health_logs_select ON mental_health_logs
    FOR SELECT USING (user_id = auth.uid() OR is_admin());

CREATE POLICY mental_health_logs_insert ON mental_health_logs
    FOR INSERT WITH CHECK (user_id = auth.uid() OR is_admin());

CREATE POLICY mental_health_logs_update ON mental_health_logs
    FOR UPDATE USING (user_id = auth.uid() OR is_admin());

CREATE POLICY mental_health_logs_delete ON mental_health_logs
    FOR DELETE USING (user_id = auth.uid() OR is_admin());

-- ────────────────────────────────────────────────────────────────────────────
-- WEIGHT_LOGS policies
-- ────────────────────────────────────────────────────────────────────────────

CREATE POLICY weight_logs_select ON weight_logs
    FOR SELECT USING (user_id = auth.uid() OR is_admin());

CREATE POLICY weight_logs_insert ON weight_logs
    FOR INSERT WITH CHECK (user_id = auth.uid() OR is_admin());

CREATE POLICY weight_logs_update ON weight_logs
    FOR UPDATE USING (user_id = auth.uid() OR is_admin());

CREATE POLICY weight_logs_delete ON weight_logs
    FOR DELETE USING (user_id = auth.uid() OR is_admin());

-- ────────────────────────────────────────────────────────────────────────────
-- RECIPES policies (public readable, own-only write)
-- ────────────────────────────────────────────────────────────────────────────

CREATE POLICY recipes_select_public ON recipes
    FOR SELECT USING (is_public = TRUE OR created_by = auth.uid() OR is_admin());

CREATE POLICY recipes_insert ON recipes
    FOR INSERT WITH CHECK (created_by = auth.uid() OR is_admin());

CREATE POLICY recipes_update ON recipes
    FOR UPDATE USING (created_by = auth.uid() OR is_admin());

CREATE POLICY recipes_delete ON recipes
    FOR DELETE USING (created_by = auth.uid() OR is_admin());

-- ────────────────────────────────────────────────────────────────────────────
-- WORKOUT_ROUTINES policies (public readable, own-only write)
-- ────────────────────────────────────────────────────────────────────────────

CREATE POLICY workout_routines_select_public ON workout_routines
    FOR SELECT USING (is_public = TRUE OR created_by = auth.uid() OR is_admin());

CREATE POLICY workout_routines_insert ON workout_routines
    FOR INSERT WITH CHECK (created_by = auth.uid() OR is_admin());

CREATE POLICY workout_routines_update ON workout_routines
    FOR UPDATE USING (created_by = auth.uid() OR is_admin());

CREATE POLICY workout_routines_delete ON workout_routines
    FOR DELETE USING (created_by = auth.uid() OR is_admin());

-- ────────────────────────────────────────────────────────────────────────────
-- FRIENDSHIPS policies (both parties can see, only requester can create)
-- ────────────────────────────────────────────────────────────────────────────

CREATE POLICY friendships_select ON friendships
    FOR SELECT USING (
        requester_id = auth.uid()
        OR addressee_id = auth.uid()
        OR is_admin()
    );

CREATE POLICY friendships_insert ON friendships
    FOR INSERT WITH CHECK (requester_id = auth.uid() OR is_admin());

CREATE POLICY friendships_update ON friendships
    FOR UPDATE USING (
        requester_id = auth.uid()
        OR addressee_id = auth.uid()
        OR is_admin()
    );

CREATE POLICY friendships_delete ON friendships
    FOR DELETE USING (
        requester_id = auth.uid()
        OR addressee_id = auth.uid()
        OR is_admin()
    );

-- ────────────────────────────────────────────────────────────────────────────
-- ACTIVITY_STREAKS policies
-- ────────────────────────────────────────────────────────────────────────────

CREATE POLICY activity_streaks_select ON activity_streaks
    FOR SELECT USING (user_id = auth.uid() OR is_admin());

CREATE POLICY activity_streaks_insert ON activity_streaks
    FOR INSERT WITH CHECK (user_id = auth.uid() OR is_admin());

CREATE POLICY activity_streaks_update ON activity_streaks
    FOR UPDATE USING (user_id = auth.uid() OR is_admin());

CREATE POLICY activity_streaks_delete ON activity_streaks
    FOR DELETE USING (user_id = auth.uid() OR is_admin());

-- ============================================================================
-- SEED DATA: Admin User
-- ============================================================================

-- NOTE: Replace this ID with the actual Supabase Auth UID after signup
INSERT INTO users (id, email, display_name, role, created_at, updated_at)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'admin@shakersplit.app',
    'ShakerSplit Admin',
    'ADMIN',
    NOW(),
    NOW()
);

INSERT INTO user_preferences (id, user_id, theme, notifications_enabled, default_units, timezone)
VALUES (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'DARK',
    TRUE,
    'METRIC',
    'Asia/Kolkata'
);

-- Initialize streaks for admin
INSERT INTO activity_streaks (user_id, streak_type, current_count, longest_count)
VALUES
    ('00000000-0000-0000-0000-000000000001', 'FOOD_LOG', 0, 0),
    ('00000000-0000-0000-0000-000000000001', 'WORKOUT', 0, 0),
    ('00000000-0000-0000-0000-000000000001', 'ALCOHOL_FREE', 0, 0),
    ('00000000-0000-0000-0000-000000000001', 'OVERALL', 0, 0);

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
