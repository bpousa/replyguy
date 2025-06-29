import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

// Types
export interface CreateCheckoutSessionParams {
  userId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  billingCycle?: 'monthly' | 'yearly';
}

export interface CreatePortalSessionParams {
  customerId: string;
  returnUrl: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  reply_limit: number;
  features: Record<string, any>;
  stripe_price_id_monthly: string;
  stripe_price_id_yearly: string;
  max_tweet_length: number;
  max_response_idea_length: number;
  max_reply_length: number;
  suggestion_limit: number;
  enable_long_replies: boolean;
  enable_style_matching: boolean;
  enable_perplexity_guidance: boolean;
}

export class StripeService {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
      {
        auth: {
          persistSession: false,
        },
      }
    );
  }

  /**
   * Create a Stripe checkout session for subscription
   */
  async createCheckoutSession(params: CreateCheckoutSessionParams): Promise<string> {
    const {
      userId,
      priceId,
      successUrl,
      cancelUrl,
      customerEmail,
      billingCycle = 'monthly'
    } = params;

    // Get or create customer
    let customerId: string | undefined;
    
    // Check if user already has a stripe customer ID
    const { data: user, error: userError } = await this.supabase
      .from('users')
      .select('stripe_customer_id, email')
      .eq('id', userId)
      .single();

    if (!userError && user?.stripe_customer_id) {
      customerId = user.stripe_customer_id;
    } else if (customerEmail || user?.email) {
      // Create a new customer
      const customer = await stripe.customers.create({
        email: customerEmail || user?.email,
        metadata: {
          userId: userId,
        },
      });
      customerId = customer.id;

      // Update user with customer ID
      await this.supabase
        .from('users')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId);
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      client_reference_id: userId,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: {
        trial_period_days: billingCycle === 'yearly' ? 14 : 7, // Longer trial for yearly
        metadata: {
          userId: userId,
        },
      },
      metadata: {
        userId: userId,
      },
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      customer_update: customerId ? {
        address: 'auto',
      } : undefined,
    });

    return session.url!;
  }

  /**
   * Create a Stripe customer portal session for managing subscription
   */
  async createPortalSession(params: CreatePortalSessionParams): Promise<string> {
    const { customerId, returnUrl } = params;

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return session.url;
  }

  /**
   * Get subscription plans from database
   */
  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    const { data, error } = await this.supabase
      .from('subscription_plans')
      .select('*')
      .eq('active', true)
      .order('sort_order');

    if (error) {
      console.error('Failed to fetch subscription plans:', error);
      throw new Error('Failed to fetch subscription plans');
    }

    return data || [];
  }

  /**
   * Get user's current subscription
   */
  async getUserSubscription(userId: string) {
    const { data, error } = await this.supabase
      .from('subscriptions')
      .select(`
        *,
        plan:subscription_plans(*)
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (error && error.code !== 'PGRST116') { // Not found error
      console.error('Failed to fetch user subscription:', error);
      throw new Error('Failed to fetch subscription');
    }

    return data;
  }

  /**
   * Cancel subscription at period end
   */
  async cancelSubscription(subscriptionId: string): Promise<void> {
    // Get subscription from database
    const { data: sub, error: subError } = await this.supabase
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('id', subscriptionId)
      .single();

    if (subError || !sub) {
      throw new Error('Subscription not found');
    }

    // Cancel in Stripe
    await stripe.subscriptions.update(sub.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    // Update in database
    await this.supabase
      .from('subscriptions')
      .update({
        cancel_at_period_end: true,
        canceled_at: new Date().toISOString(),
      })
      .eq('id', subscriptionId);
  }

  /**
   * Resume a canceled subscription
   */
  async resumeSubscription(subscriptionId: string): Promise<void> {
    // Get subscription from database
    const { data: sub, error: subError } = await this.supabase
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('id', subscriptionId)
      .single();

    if (subError || !sub) {
      throw new Error('Subscription not found');
    }

    // Resume in Stripe
    await stripe.subscriptions.update(sub.stripe_subscription_id, {
      cancel_at_period_end: false,
    });

    // Update in database
    await this.supabase
      .from('subscriptions')
      .update({
        cancel_at_period_end: false,
        canceled_at: null,
      })
      .eq('id', subscriptionId);
  }

  /**
   * Update subscription (change plan)
   */
  async updateSubscription(
    subscriptionId: string, 
    newPriceId: string
  ): Promise<void> {
    // Get subscription from database
    const { data: sub, error: subError } = await this.supabase
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('id', subscriptionId)
      .single();

    if (subError || !sub) {
      throw new Error('Subscription not found');
    }

    // Get the subscription from Stripe
    const stripeSubscription = await stripe.subscriptions.retrieve(
      sub.stripe_subscription_id
    );

    // Update the subscription item with new price
    await stripe.subscriptions.update(sub.stripe_subscription_id, {
      items: [
        {
          id: stripeSubscription.items.data[0].id,
          price: newPriceId,
        },
      ],
      proration_behavior: 'always_invoice',
    });
  }

  /**
   * Get usage for current billing period
   */
  async getCurrentUsage(userId: string) {
    const periodStart = new Date();
    periodStart.setDate(1);
    periodStart.setHours(0, 0, 0, 0);

    const { data, error } = await this.supabase
      .from('user_usage')
      .select('*')
      .eq('user_id', userId)
      .eq('period_start', periodStart.toISOString().split('T')[0])
      .single();

    if (error && error.code !== 'PGRST116') { // Not found error
      console.error('Failed to fetch usage:', error);
      throw new Error('Failed to fetch usage');
    }

    return data || {
      replies_generated: 0,
      total_cost: 0,
      period_start: periodStart.toISOString().split('T')[0],
    };
  }

  /**
   * Sync Stripe products and prices
   */
  async syncStripeProducts(): Promise<void> {
    // Get plans from database
    const { data: plans, error } = await this.supabase
      .from('subscription_plans')
      .select('*')
      .eq('active', true);

    if (error || !plans) {
      throw new Error('Failed to fetch plans');
    }

    for (const plan of plans) {
      // Create or update product in Stripe
      let product: Stripe.Product;
      
      try {
        // Try to retrieve existing product
        const products = await stripe.products.search({
          query: `metadata['plan_id']:'${plan.id}'`,
        });
        
        if (products.data.length > 0) {
          product = products.data[0];
          // Update product
          product = await stripe.products.update(product.id, {
            name: plan.name,
            description: plan.description,
          });
        } else {
          // Create new product
          product = await stripe.products.create({
            name: plan.name,
            description: plan.description,
            metadata: {
              plan_id: plan.id,
            },
          });
        }
      } catch (error) {
        console.error(`Failed to sync product for plan ${plan.id}:`, error);
        continue;
      }

      // Create or update prices
      try {
        // Monthly price
        if (plan.price_monthly > 0) {
          const monthlyPrice = await stripe.prices.create({
            product: product.id,
            unit_amount: Math.round(plan.price_monthly * 100), // Convert to cents
            currency: 'usd',
            recurring: {
              interval: 'month',
            },
            metadata: {
              plan_id: plan.id,
              billing_cycle: 'monthly',
            },
          });

          // Update plan with Stripe price ID
          await this.supabase
            .from('subscription_plans')
            .update({ stripe_price_id_monthly: monthlyPrice.id })
            .eq('id', plan.id);
        }

        // Yearly price
        if (plan.price_yearly > 0) {
          const yearlyPrice = await stripe.prices.create({
            product: product.id,
            unit_amount: Math.round(plan.price_yearly * 100), // Convert to cents
            currency: 'usd',
            recurring: {
              interval: 'year',
            },
            metadata: {
              plan_id: plan.id,
              billing_cycle: 'yearly',
            },
          });

          // Update plan with Stripe price ID
          await this.supabase
            .from('subscription_plans')
            .update({ stripe_price_id_yearly: yearlyPrice.id })
            .eq('id', plan.id);
        }
      } catch (error) {
        console.error(`Failed to create prices for plan ${plan.id}:`, error);
      }
    }

    console.log('Stripe products sync completed');
  }
}

// Export singleton instance
export const stripeService = new StripeService();