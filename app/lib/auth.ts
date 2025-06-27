import { SupabaseClient } from '@supabase/supabase-js';
import { createServerClient as createSSRClient, createBrowserClient as createSSRBrowserClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Singleton instance
let browserClient: SupabaseClient | null = null;

// Client-side Supabase client with proper cookie handling
export const createBrowserClient = () => {
  if (!browserClient) {
    browserClient = createSSRBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            if (typeof window === 'undefined') return '';
            
            const cookies = document.cookie.split('; ');
            const cookie = cookies.find(c => c.startsWith(`${name}=`));
            return cookie ? decodeURIComponent(cookie.split('=')[1]) : '';
          },
          set(name: string, value: string, options: any) {
            if (typeof window === 'undefined') return;
            
            let cookieString = `${name}=${encodeURIComponent(value)}`;
            
            if (options.maxAge) {
              cookieString += `; Max-Age=${options.maxAge}`;
            }
            if (options.expires) {
              cookieString += `; Expires=${options.expires.toUTCString()}`;
            }
            if (options.path) {
              cookieString += `; Path=${options.path}`;
            }
            if (options.domain) {
              cookieString += `; Domain=${options.domain}`;
            }
            if (options.secure) {
              cookieString += '; Secure';
            }
            if (options.sameSite) {
              cookieString += `; SameSite=${options.sameSite}`;
            }
            
            document.cookie = cookieString;
            console.log('[auth] Browser cookie set:', name);
          },
          remove(name: string, options: any) {
            if (typeof window === 'undefined') return;
            
            // Remove cookie by setting it with expired date
            let cookieString = `${name}=; Max-Age=0`;
            if (options.path) {
              cookieString += `; Path=${options.path}`;
            }
            if (options.domain) {
              cookieString += `; Domain=${options.domain}`;
            }
            
            document.cookie = cookieString;
            console.log('[auth] Browser cookie removed:', name);
          }
        },
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
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
            const isAuthCookie = name.includes('sb-') || name.includes('supabase');
            const isProduction = process.env.NODE_ENV === 'production';
            
            const cookieOptions = {
              name,
              value,
              ...options,
              // Override with secure defaults for auth cookies
              ...(isAuthCookie ? {
                httpOnly: true,
                secure: isProduction,
                sameSite: 'lax' as const,
                path: '/',
                // Preserve Supabase's original maxAge if provided
                ...(options.maxAge ? { maxAge: options.maxAge } : {})
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