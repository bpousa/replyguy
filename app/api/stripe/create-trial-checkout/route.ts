import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { stripeService } from '@/app/lib/services/stripe.service';
import { createServerClient } from '@/app/lib/auth';
import { cookies } from 'next/headers';

const requestSchema = z.object({
  priceId: z.string(),
  plan: z.enum(['growth', 'professional']),
});

// Trial price IDs (LIVE MODE)
const TRIAL_PRICES = {
  growth: 'price_1Rlhbf08qNQAUd0lbUZR3RwW',      // X Basic $1 trial (LIVE)
  professional: 'price_1Rlhbg08qNQAUd0lmrEzmJWe', // X Pro $1 trial (LIVE)
};

export const dynamic = 'force-dynamic'; // Prevent caching

export async function POST(req: NextRequest) {
  const cookieStore = cookies();
  const supabase = createServerClient(cookieStore);
  
  try {
    // Get session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json(
        { 
          error: 'Unauthenticated',
          message: 'Please sign in to access this resource'
        },
        { status: 401 }
      );
    }
    
    const user = session.user;
    console.log('[trial-checkout] Creating trial checkout for user:', user.email, 'ID:', user.id);
    
    const body = await req.json();
    const { priceId, plan } = requestSchema.parse(body);
    
    console.log('[trial-checkout] Request:', { priceId, plan });

    // Validate the price ID matches the expected trial price
    if (priceId !== TRIAL_PRICES[plan]) {
      console.error('[trial-checkout] Invalid trial price ID:', priceId, 'for plan:', plan);
      return NextResponse.json(
        { error: 'Invalid trial price' },
        { status: 400 }
      );
    }

    // Check if user already has an active subscription
    console.log('[trial-checkout] Checking for existing subscriptions for user_id:', user.id);
    
    const { data: existingSubs, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active');

    console.log('[trial-checkout] Subscription query result:', {
      data: existingSubs,
      error: subError,
      count: existingSubs?.length || 0
    });

    // Only check for actual data, not errors from no rows
    if (existingSubs && existingSubs.length > 0) {
      console.error('[trial-checkout] USER HAS ACTIVE SUBSCRIPTION!', {
        user_id: user.id,
        email: user.email,
        subscriptions: existingSubs
      });
      return NextResponse.json(
        { error: 'You already have an active subscription' },
        { status: 400 }
      );
    }

    // Check if user has already claimed a trial
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('trial_offer_accepted')
      .eq('id', user.id)
      .maybeSingle(); // Use maybeSingle to handle no rows gracefully

    if (userData?.trial_offer_accepted) {
      console.log('[trial-checkout] User already claimed trial:', userData.trial_offer_accepted);
      return NextResponse.json(
        { error: 'You have already claimed a trial offer' },
        { status: 400 }
      );
    }

    console.log(`[trial-checkout] Creating checkout session for ${plan} trial, price ID: ${priceId}`);

    // Create checkout session with trial price
    const checkoutUrl = await stripeService.createCheckoutSession({
      userId: user.id,
      priceId,
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?trial=success&plan=${plan}`,
      cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/auth/trial-offer?canceled=true`,
      customerEmail: user.email,
      billingCycle: 'monthly', // Trials are always monthly
    });

    // Note: We'll update trial_offer_accepted after successful payment via webhook
    
    return NextResponse.json({ url: checkoutUrl });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    console.error('[trial-checkout] Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to create trial checkout session',
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      },
      { status: 500 }
    );
  }
}