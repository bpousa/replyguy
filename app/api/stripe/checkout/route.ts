import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { stripeService } from '@/app/lib/services/stripe.service';
import { createServerClient } from '@/app/lib/auth';
import { cookies } from 'next/headers';

const requestSchema = z.object({
  planId: z.enum(['free', 'growth', 'professional', 'enterprise']),
  billingPeriod: z.enum(['monthly', 'yearly']).optional().default('monthly'),
  email: z.string().email().optional(),
});

export async function POST(req: NextRequest) {
  const cookieStore = cookies();
  const supabase = createServerClient(cookieStore);
  
  try {
    // Multiple attempts to get session with delays
    let session = null;
    let attempts = 0;
    const maxAttempts = 3;
    
    while (!session && attempts < maxAttempts) {
      attempts++;
      
      // Try to get the session
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
      
      if (currentSession) {
        session = currentSession;
        break;
      }
      
      console.log(`Attempt ${attempts}: No session found, trying to refresh...`);
      
      // Try to refresh the session
      const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshedSession) {
        session = refreshedSession;
        break;
      }
      
      // If not the last attempt, wait a bit before trying again
      if (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    if (!session) {
      console.error('Failed to establish session after', attempts, 'attempts');
      return NextResponse.json(
        { 
          error: 'Unauthenticated',
          message: 'Please sign in to access this resource'
        },
        { status: 401 }
      );
    }
    
    const user = session.user;
    console.log('Session established for user:', user.email);
    
    const body = await req.json();
    const { planId, billingPeriod, email } = requestSchema.parse(body);

    const userId = user.id;
    const userEmail = email || user.email;

    // Get the plan details
    const plans = await stripeService.getSubscriptionPlans();
    const selectedPlan = plans.find(p => p.id === planId);

    if (!selectedPlan) {
      return NextResponse.json(
        { error: 'Invalid plan selected' },
        { status: 400 }
      );
    }

    // Get the appropriate price ID
    const priceId = billingPeriod === 'yearly' 
      ? selectedPlan.stripe_price_id_yearly 
      : selectedPlan.stripe_price_id_monthly;

    if (!priceId) {
      console.error(`No ${billingPeriod} price ID found for plan:`, selectedPlan);
      return NextResponse.json(
        { 
          error: 'Plan pricing not configured',
          details: `Missing ${billingPeriod} price for ${selectedPlan.name} plan`
        },
        { status: 400 }
      );
    }

    console.log(`Creating checkout session for plan ${planId} (${billingPeriod}), price ID: ${priceId}`);

    // Create checkout session
    const checkoutUrl = await stripeService.createCheckoutSession({
      userId,
      priceId,
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
      cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
      customerEmail: userEmail,
      billingCycle: billingPeriod,
    });

    return NextResponse.json({ url: checkoutUrl });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Checkout error:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    
    return NextResponse.json(
      { 
        error: 'Failed to create checkout session',
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      },
      { status: 500 }
    );
  }
}