import { z } from 'zod';

const envSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  VITE_SUPABASE_URL: z.string().url().optional(),
  SUPABASE_URL: z.string().url().optional(),
});

function getEnv() {
  const raw = {
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
    SUPABASE_URL: process.env.SUPABASE_URL,
  };

  const result = envSchema.safeParse(raw);

  if (!result.success) {
    console.error('Missing environment variables:', result.error.flatten().fieldErrors);
    throw new Error('Missing required environment variables');
  }

  return {
    SUPABASE_URL: (result.data.SUPABASE_URL || result.data.VITE_SUPABASE_URL)!,
    SUPABASE_SERVICE_ROLE_KEY: result.data.SUPABASE_SERVICE_ROLE_KEY,
  };
}

export const env = getEnv();
