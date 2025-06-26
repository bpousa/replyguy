import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const plan = requestUrl.searchParams.get('plan');
  
  // Log for debugging
  console.log('Auth callback hit with URL:', request.url);
  console.log('Search params:', requestUrl.searchParams.toString());
  console.log('Plan selected:', plan);
  
  // After Supabase processes the magic link, it redirects here
  // The session should already be established via cookies
  
  // Redirect to loading page with plan parameter if present
  const loadingUrl = new URL('/auth/loading', requestUrl.origin);
  if (plan) {
    loadingUrl.searchParams.set('plan', plan);
  }
  
  const response = NextResponse.redirect(loadingUrl);
  
  return response;
}