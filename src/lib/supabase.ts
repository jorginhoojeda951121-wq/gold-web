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
  
  // CRITICAL: Configure auth persistence to use localStorage
  // This ensures session persists across browser refreshes
  cached = createClient(supabaseUrl, supabaseAnonKey, { 
    db: { schema },
    auth: {
      storage: window.localStorage, // Explicitly use localStorage for session persistence
      autoRefreshToken: true, // Automatically refresh expired tokens
      persistSession: true, // Persist session across page refreshes
      detectSessionInUrl: true, // Detect session from URL (OAuth flows)
    }
  });
  return cached;
}


