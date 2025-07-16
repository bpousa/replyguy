import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { stripeService } from '@/app/lib/services/stripe.service';
import { createServerClient } from '@/app/lib/auth';
import { cookies } from 'next/headers';

const requestSchema = z.object({
  priceId: z.string(),
  plan: z.enum(['growth', 'professional']),
});

// Trial price IDs
const TRIAL_PRICES = {
  growth: 'price_1RlGUQ08qNQAUd0lhSz7IEvB',      // X Basic $1 trial
  professional: 'price_1RlGV108qNQAUd0l4uxeX34V', // X Pro $1 trial
};

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
    console.log('[trial-checkout] Creating trial checkout for user:', user.email);
    
    const body = await req.json();
    const { priceId, plan } = requestSchema.parse(body);

    // Validate the price ID matches the expected trial price
    if (priceId !== TRIAL_PRICES[plan]) {
      console.error('[trial-checkout] Invalid trial price ID:', priceId, 'for plan:', plan);
      return NextResponse.json(
        { error: 'Invalid trial price' },
        { status: 400 }
      );
    }

    // Check if user already has an active subscription
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (existingSub) {
      console.log('[trial-checkout] User already has active subscription');
      return NextResponse.json(
        { error: 'You already have an active subscription' },
        { status: 400 }
      );
    }

    // Check if user has already claimed a trial
    const { data: userData } = await supabase
      .from('users')
      .select('trial_offer_accepted')
      .eq('id', user.id)
      .single();

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