import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/app/lib/auth';
import { cookies } from 'next/headers';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function POST(req: NextRequest) {
  const cookieStore = cookies();
  const supabase = createServerClient(cookieStore);

  try {
    // Get authenticated session first
    let { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.log('No session found, attempting to refresh...');
      
      // Try to refresh the session
      const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError || !refreshedSession) {
        console.error('Session refresh failed:', refreshError || 'No session after refresh');
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
      
      session = refreshedSession;
    }
    
    const user = session.user;

    // Get user's Stripe customer ID
    const { data: userData } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (!userData?.stripe_customer_id) {
      return NextResponse.json(
        { 
          error: 'No billing information found',
          message: 'Please complete a purchase to set up billing',
          requiresCheckout: true
        },
        { status: 422 }
      );
    }

    // Get return URL from request or use default
    const body = await req.json().catch(() => ({}));
    const baseReturnUrl = body.returnUrl || `${process.env.NEXT_PUBLIC_APP_URL}/settings`;
    // Add billingUpdated parameter to the return URL
    const returnUrl = `${baseReturnUrl}${baseReturnUrl.includes('?') ? '&' : '?'}billingUpdated=1`;

    // Create Stripe billing portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: userData.stripe_customer_id,
      return_url: returnUrl,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error('Portal session error:', error);
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    );
  }
}