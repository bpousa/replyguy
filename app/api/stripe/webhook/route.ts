import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  {
    auth: {
      persistSession: false,
    },
  }
);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  // Handle replay requests (from our replay script)
  if (signature === 'replay') {
    try {
      event = JSON.parse(body) as Stripe.Event;
      console.log(`Processing replay event ${event.id} (${event.type})`);
    } catch (err) {
      console.error('Failed to parse replay event:', err);
      return NextResponse.json(
        { error: 'Invalid replay event format' },
        { status: 400 }
      );
    }
  } else {
    // Normal webhook signature verification
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }
  }

  try {
    // Check if event has already been processed (idempotency)
    const { data: existingEvent } = await supabase
      .from('stripe_webhook_events')
      .select('id')
      .eq('stripe_event_id', event.id)
      .single();

    if (existingEvent) {
      console.log(`Event ${event.id} already processed, skipping`);
      return NextResponse.json({ received: true, skipped: true });
    }

    // Store the event
    const { error: insertError } = await supabase
      .from('stripe_webhook_events')
      .insert({
        stripe_event_id: event.id,
        event_type: event.type,
        payload: event,
        status: 'processing'
      });

    if (insertError && insertError.code !== '23505') { // Ignore unique constraint violation
      console.error('Failed to store webhook event:', insertError);
    }

    // Process the event
    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          await handleCheckoutCompleted(session);
          break;
        }

        case 'customer.subscription.created':
        case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription;
          await handleSubscriptionUpdate(subscription, event.type);
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          await handleSubscriptionDeleted(subscription);
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice;
          await handlePaymentFailed(invoice);
          break;
        }

        case 'invoice.payment_succeeded': {
          const invoice = event.data.object as Stripe.Invoice;
          await handlePaymentSucceeded(invoice);
          break;
        }

        case 'customer.subscription.trial_will_end': {
          const subscription = event.data.object as Stripe.Subscription;
          await handleTrialWillEnd(subscription);
          break;
        }

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      // Mark event as processed
      await supabase
        .from('stripe_webhook_events')
        .update({ status: 'processed' })
        .eq('stripe_event_id', event.id);

    } catch (processingError) {
      // Mark event as failed
      await supabase
        .from('stripe_webhook_events')
        .update({ 
          status: 'failed',
          error_message: processingError instanceof Error ? processingError.message : 'Unknown error'
        })
        .eq('stripe_event_id', event.id);
      
      throw processingError;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.client_reference_id || session.metadata?.userId;
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  if (!userId || !subscriptionId) {
    console.error('Missing userId or subscriptionId in checkout session');
    return;
  }

  // Get subscription details
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const priceId = subscription.items.data[0].price.id;

  // Find the plan based on price ID
  const { data: plan } = await supabase
    .from('subscription_plans')
    .select('id')
    .or(`stripe_price_id_monthly.eq.${priceId},stripe_price_id_yearly.eq.${priceId}`)
    .single();

  if (!plan) {
    console.error('Plan not found for price ID:', priceId);
    return;
  }

  // Update user with Stripe customer ID and subscription tier
  await supabase
    .from('users')
    .update({ 
      stripe_customer_id: customerId,
      subscription_tier: plan.id,
      subscription_status: subscription.status
    })
    .eq('id', userId);

  // Calculate billing anchor day
  const billingAnchorDay = new Date(subscription.current_period_start * 1000).getDate();

  // Create subscription record with trial info if applicable
  const subscriptionData: any = {
    user_id: userId,
    plan_id: plan.id,
    stripe_subscription_id: subscriptionId,
    stripe_customer_id: customerId,
    status: subscription.status,
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    billing_anchor_day: billingAnchorDay,
  };

  // Add trial end date if subscription is trialing
  if (subscription.trial_end) {
    subscriptionData.trialing_until = new Date(subscription.trial_end * 1000).toISOString();
  }

  await supabase
    .from('subscriptions')
    .insert(subscriptionData);

  // Send event to GHL
  if (process.env.GHL_SYNC_ENABLED === 'true') {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/ghl/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'subscription_started',
          userId: userId,
          data: {
            planId: plan.id,
            subscriptionId: subscriptionId,
            customerId: customerId,
            status: subscription.status
          },
          metadata: {
            billingCycle: priceId.includes('yearly') ? 'yearly' : 'monthly',
            trial: !!subscription.trial_end
          }
        })
      });
    } catch (error) {
      console.error('Failed to send subscription started event to GHL:', error);
    }
  }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription, eventType: string) {
  const priceId = subscription.items.data[0].price.id;

  // Find the plan based on price ID
  const { data: plan } = await supabase
    .from('subscription_plans')
    .select('id')
    .or(`stripe_price_id_monthly.eq.${priceId},stripe_price_id_yearly.eq.${priceId}`)
    .single();

  if (!plan) {
    console.error('Plan not found for price ID:', priceId);
    return;
  }

  // Get current subscription state for logging
  const { data: currentSub } = await supabase
    .from('subscriptions')
    .select('id, status, plan_id')
    .eq('stripe_subscription_id', subscription.id)
    .single();

  // Calculate billing anchor day
  const billingAnchorDay = new Date(subscription.current_period_start * 1000).getDate();

  // Update subscription record with all relevant fields
  const updateData: any = {
    plan_id: plan.id,
    status: subscription.status,
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end,
    billing_anchor_day: billingAnchorDay,
  };

  // Handle trial period
  if (subscription.trial_end) {
    updateData.trialing_until = new Date(subscription.trial_end * 1000).toISOString();
  }

  // Handle cancellation timestamp
  if (subscription.canceled_at) {
    updateData.canceled_at = new Date(subscription.canceled_at * 1000).toISOString();
  }

  // Clear payment failed flag if status is active
  if (subscription.status === 'active') {
    updateData.payment_failed_at = null;
    updateData.payment_retry_count = 0;
  }

  await supabase
    .from('subscriptions')
    .update(updateData)
    .eq('stripe_subscription_id', subscription.id);

  // Log state change if there was a change
  if (currentSub && (currentSub.status !== subscription.status || currentSub.plan_id !== plan.id)) {
    await supabase
      .from('subscription_state_log')
      .insert({
        subscription_id: currentSub.id,
        stripe_subscription_id: subscription.id,
        old_status: currentSub.status,
        new_status: subscription.status,
        old_plan_id: currentSub.plan_id,
        new_plan_id: plan.id,
        metadata: { event_type: eventType, price_id: priceId }
      });
  }

  // Update user's subscription tier based on status
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_subscription_id', subscription.id)
    .single();

  if (sub) {
    if (subscription.status === 'past_due' || subscription.status === 'canceled' || subscription.status === 'unpaid') {
      // Update user's subscription_tier to free for bad statuses
      await supabase
        .from('users')
        .update({ 
          subscription_tier: 'free',
          subscription_status: subscription.status
        })
        .eq('id', sub.user_id);
    } else if (subscription.status === 'active' || subscription.status === 'trialing') {
      // Update user's subscription_tier to the plan for good statuses
      await supabase
        .from('users')
        .update({ 
          subscription_tier: plan.id,
          subscription_status: subscription.status
        })
        .eq('id', sub.user_id);
    }
    
    // Send event to GHL
    if (process.env.GHL_SYNC_ENABLED === 'true' && currentSub && (currentSub.status !== subscription.status || currentSub.plan_id !== plan.id)) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/ghl/webhook`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'subscription_updated',
            userId: sub.user_id,
            data: {
              oldPlanId: currentSub.plan_id,
              newPlanId: plan.id,
              oldStatus: currentSub.status,
              newStatus: subscription.status
            },
            metadata: {
              eventType: eventType,
              priceId: priceId
            }
          })
        });
      } catch (error) {
        console.error('Failed to send subscription update event to GHL:', error);
      }
    }
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  // Update subscription status to canceled
  await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      canceled_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  // Get user from customer ID
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('stripe_customer_id', subscription.customer)
    .single();

  if (user) {
    // Move user to free plan
    await supabase
      .from('users')
      .update({ 
        subscription_tier: 'free',
        subscription_status: 'active' // Free plan is always active
      })
      .eq('id', user.id);

    console.log(`User ${user.id} moved to free plan after subscription cancellation`);
    
    // Send event to GHL
    if (process.env.GHL_SYNC_ENABLED === 'true') {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/ghl/webhook`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'subscription_canceled',
            userId: user.id,
            data: {
              subscriptionId: subscription.id,
              customerId: subscription.customer
            },
            metadata: {
              canceledAt: new Date().toISOString()
            }
          })
        });
      } catch (error) {
        console.error('Failed to send subscription canceled event to GHL:', error);
      }
    }
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string;

  if (!subscriptionId) {
    return;
  }

  // Update subscription status
  await supabase
    .from('subscriptions')
    .update({
      status: 'past_due',
    })
    .eq('stripe_subscription_id', subscriptionId);

  // Get current retry count
  const { data: currentSub } = await supabase
    .from('subscriptions')
    .select('payment_retry_count')
    .eq('stripe_subscription_id', subscriptionId)
    .single();

  // Update payment failed timestamp and increment retry count
  await supabase
    .from('subscriptions')
    .update({
      payment_failed_at: new Date().toISOString(),
      payment_retry_count: (currentSub?.payment_retry_count || 0) + 1
    })
    .eq('stripe_subscription_id', subscriptionId);

  // Send email notification to user
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('stripe_customer_id', invoice.customer)
    .single();
    
  if (user) {
    const nextRetryDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days from now
    
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/send-payment-notification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id,
        type: 'payment_failed',
        metadata: {
          productName: invoice.lines.data[0]?.description || 'Premium',
          retryDate: nextRetryDate.toLocaleDateString()
        }
      })
    });
    
    // Send event to GHL
    if (process.env.GHL_SYNC_ENABLED === 'true') {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/ghl/webhook`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'payment_failed',
            userId: user.id,
            data: {
              subscriptionId: subscriptionId,
              invoiceId: invoice.id,
              amount: invoice.amount_due / 100
            },
            metadata: {
              failureReason: invoice.last_finalization_error?.message || 'unknown',
              nextRetryDate: nextRetryDate.toISOString(),
              retryCount: currentSub?.payment_retry_count || 1
            }
          })
        });
      } catch (error) {
        console.error('Failed to send payment failed event to GHL:', error);
      }
    }
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string;

  if (!subscriptionId) {
    return;
  }

  // Clear payment failed status
  await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      payment_failed_at: null,
      payment_retry_count: 0
    })
    .eq('stripe_subscription_id', subscriptionId);

  // Restore user's subscription tier
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('user_id, plan_id')
    .eq('stripe_subscription_id', subscriptionId)
    .single();

  if (sub) {
    await supabase
      .from('users')
      .update({ subscription_tier: sub.plan_id })
      .eq('id', sub.user_id);
      
    // Send event to GHL
    if (process.env.GHL_SYNC_ENABLED === 'true') {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/ghl/webhook`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'payment_recovered',
            userId: sub.user_id,
            data: {
              subscriptionId: subscriptionId,
              invoiceId: invoice.id,
              amount: invoice.amount_paid / 100
            },
            metadata: {
              recoveredAt: new Date().toISOString()
            }
          })
        });
      } catch (error) {
        console.error('Failed to send payment recovered event to GHL:', error);
      }
    }
  }
}

async function handleTrialWillEnd(subscription: Stripe.Subscription) {
  // This gives us a 3-day warning before trial ends
  console.log(`Trial ending soon for subscription ${subscription.id}`);
  
  // Get user from customer ID
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('stripe_customer_id', subscription.customer)
    .single();
    
  if (user && subscription.trial_end) {
    const trialEndDate = new Date(subscription.trial_end * 1000);
    
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/send-payment-notification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id,
        type: 'trial_ending',
        metadata: {
          productName: subscription.items.data[0]?.price.nickname || 'Premium',
          trialEndDate: trialEndDate.toLocaleDateString()
        }
      })
    });
      
    // Send event to GHL
    if (process.env.GHL_SYNC_ENABLED === 'true') {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/ghl/webhook`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'trial_ending',
            userId: user.id,
            data: {
              subscriptionId: subscription.id,
              customerId: subscription.customer
            },
            metadata: {
              trialEndDate: trialEndDate.toISOString(),
              daysRemaining: 3
            }
          })
        });
      } catch (error) {
        console.error('Failed to send trial ending event to GHL:', error);
      }
    }
  }
}