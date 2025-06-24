import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Singleton instance
let browserClient: SupabaseClient | null = null;

// Client-side Supabase client (singleton)
export const createBrowserClient = () => {
  if (!browserClient) {
    browserClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: true,
          storageKey: 'replyguy-auth',
          storage: typeof window !== 'undefined' ? window.localStorage : undefined,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      }
    );
  }
  return browserClient;
};