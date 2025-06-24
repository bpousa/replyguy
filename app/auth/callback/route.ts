import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  
  // This callback handles the redirect from Supabase after magic link verification
  // Supabase has already set the session cookies, we just need to redirect
  
  // Create a response that redirects to dashboard
  const response = NextResponse.redirect(new URL('/dashboard', requestUrl.origin));
  
  return response;
}