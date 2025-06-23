import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { stripeService } from '@/app/lib/services/stripe.service';

const requestSchema = z.object({
  planId: z.enum(['basic', 'pro', 'business', 'enterprise']),
  billingCycle: z.enum(['monthly', 'yearly']).optional().default('monthly'),
  email: z.string().email().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { planId, billingCycle, email } = requestSchema.parse(body);

    // TODO: Get authenticated user ID
    // For now, create a temporary user ID
    const userId = 'temp-' + Date.now();

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
      customerEmail: email,
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