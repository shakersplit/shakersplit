import { createClient } from '@supabase/supabase-js';
import { env } from './env.config';

/**
 * Service-role Supabase client for API routes. Always scope queries by user_id explicitly
 * (never trust route params alone) — service role bypasses RLS, so we have to enforce
 * ownership in the handler layer.
 */
export const supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
