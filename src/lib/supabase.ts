import { createClient, SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (cached) return cached;
  const env = (import.meta as any).env ?? {};
  const supabaseUrl = env.VITE_SUPABASE_URL as string | undefined;
  // Support both ANON_KEY and PUBLISHABLE_KEY naming
  const supabaseAnonKey = (env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY) as string | undefined;
  const schema = (env.VITE_SUPABASE_SCHEMA as string) || 'public';
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase env. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY), then restart the dev server.');
  }
  // Ensure all queries use the configured REST schema (e.g., 'api' or 'public')
  cached = createClient(supabaseUrl, supabaseAnonKey, { db: { schema } });
  return cached;
}


