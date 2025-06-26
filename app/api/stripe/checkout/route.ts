import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { stripeService } from '@/app/lib/services/stripe.service';
import { createServerClient } from '@/app/lib/auth';
import { cookies } from 'next/headers';

const requestSchema = z.object({
  planId: z.enum(['free', 'pro', 'business']),
  billingCycle: z.enum(['monthly', 'yearly']).optional().default('monthly'),
  email: z.string().email().optional(),
});

export async function POST(req: NextRequest) {
  const cookieStore = cookies();
  const supabase = createServerClient(cookieStore);
  
  try {
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Please sign in to subscribe' },
        { status: 401 }
      );
    }
    
    const body = await req.json();
    const { planId, billingCycle, email } = requestSchema.parse(body);

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
    const priceId = billingCycle === 'yearly' 
      ? selectedPlan.stripe_price_id_yearly 
      : selectedPlan.stripe_price_id_monthly;

    if (!priceId) {
      return NextResponse.json(
        { error: 'Plan pricing not configured' },
        { status: 400 }
      );
    }

    // Create checkout session
    const checkoutUrl = await stripeService.createCheckoutSession({
      userId,
      priceId,
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
      cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
      customerEmail: userEmail,
      billingCycle,
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
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}