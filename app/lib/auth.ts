import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createServerClient as createSSRClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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
          detectSessionInUrl: true,
          // Additional options for better session handling
          flowType: 'pkce',
          debug: process.env.NODE_ENV === 'development'
        },
        global: {
          headers: {
            'x-client-info': 'replyguy-web'
          }
        }
      }
    );
  }
  return browserClient;
};

// Server-side Supabase client with cookie handling
export const createServerClient = (cookieStore: ReturnType<typeof cookies>) => {
  return createSSRClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          try {
            // Ensure proper cookie options for auth cookies
            const cookieOptions = {
              name,
              value,
              ...options,
              // Override with secure defaults for auth cookies
              ...(name.includes('sb-') || name.includes('supabase') ? {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax' as const,
                path: '/',
                // Add max age for better persistence (7 days)
                maxAge: 60 * 60 * 24 * 7
              } : {})
            };
            
            console.log(`[auth] Setting cookie: ${name}, httpOnly: ${cookieOptions.httpOnly}, secure: ${cookieOptions.secure}`);
            cookieStore.set(cookieOptions);
          } catch (error) {
            // This is critical for auth - log the full error
            console.error('[auth] Failed to set cookie:', name, error);
            // Re-throw if it's an auth cookie as this will break authentication
            if (name.includes('sb-') || name.includes('supabase')) {
              throw error;
            }
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.delete(name);
          } catch (error) {
            // This is critical for auth - log the full error
            console.error('Failed to remove cookie:', name, error);
            // Re-throw if it's an auth cookie as this will break authentication
            if (name.includes('sb-') || name.includes('supabase')) {
              throw error;
            }
          }
        },
      },
    }
  );
};