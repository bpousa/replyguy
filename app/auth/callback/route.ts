import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  
  // Log for debugging
  console.log('Auth callback hit with URL:', request.url);
  console.log('Search params:', requestUrl.searchParams.toString());
  
  // After Supabase processes the magic link, it redirects here
  // The session should already be established via cookies
  
  // Redirect to loading page to give Supabase time to establish session
  const response = NextResponse.redirect(new URL('/auth/loading', requestUrl.origin));
  
  return response;
}