import { z } from 'zod';

const envSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_URL: z.string().url().optional(),
  VITE_SUPABASE_URL: z.string().url().optional(),
});

function getEnv() {
  const raw = {
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_URL: process.env.SUPABASE_URL,
    VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
  };

  const result = envSchema.safeParse(raw);

  if (!result.success) {
    console.error('Missing environment variables:', result.error.flatten().fieldErrors);
    throw new Error('Missing required environment variables');
  }

  const supabaseUrl = result.data.SUPABASE_URL || result.data.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error(
      'Missing SUPABASE_URL (or VITE_SUPABASE_URL) environment variable',
    );
  }

  return {
    SUPABASE_URL: supabaseUrl,
    SUPABASE_SERVICE_ROLE_KEY: result.data.SUPABASE_SERVICE_ROLE_KEY,
  };
}

export const env = getEnv();
