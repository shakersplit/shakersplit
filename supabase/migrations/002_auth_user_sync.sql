-- ============================================================================
-- ShakerSplit — Auth User Sync Trigger
-- Automatically creates a row in public.users when a Supabase Auth user signs up
-- ============================================================================

-- Function: called by the trigger on auth.users insert
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'display_name',
    'USER',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_preferences (user_id, theme, notifications_enabled, default_units, timezone)
  VALUES (
    NEW.id,
    'DARK',
    TRUE,
    'METRIC',
    'Asia/Kolkata'
  )
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.activity_streaks (user_id, streak_type, current_count, longest_count)
  VALUES
    (NEW.id, 'FOOD_LOG',    0, 0),
    (NEW.id, 'WORKOUT',     0, 0),
    (NEW.id, 'ALCOHOL_FREE',0, 0),
    (NEW.id, 'OVERALL',     0, 0)
  ON CONFLICT (user_id, streak_type) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: fires after every new signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_auth_user();
