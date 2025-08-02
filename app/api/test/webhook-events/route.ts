import { NextRequest, NextResponse } from 'next/server';

// Test webhook events for GHL mapping
export async function POST(req: NextRequest) {
  try {
    const { eventType, userId } = await req.json();
    
    if (!eventType) {
      return NextResponse.json(
        { error: 'eventType required' },
        { status: 400 }
      );
    }

    const testUserId = userId || 'test-user-12345';
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://replyguy.appendment.com';
    const ghlWebhookUrl = `${baseUrl}/api/ghl/webhook`;

    let testPayload;

    switch (eventType) {
      case 'user_created_free':
        testPayload = {
          event: 'user_created',
          userId: testUserId,
          data: {
            email: 'test.free@example.com',
            full_name: 'Free Test User',
            phone: '+17275551234',
            sms_opt_in: true,
            selected_plan: 'free',
            trial_offer_token: 'TEST_TOKEN_AbC123XyZ456',
            trial_offer_url: `${baseUrl}/auth/trial-offer?token=TEST_TOKEN_AbC123XyZ456`,
            trial_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          },
          metadata: {
            source: 'signup_form',
            timestamp: new Date().toISOString(),
            has_trial_token: true
          },
          generateTrialToken: false
        };
        break;

      case 'user_created_paid':
        testPayload = {
          event: 'user_created',
          userId: testUserId,
          data: {
            email: 'test.paid@example.com',
            full_name: 'Paid Test User',
            phone: '+17275551235',
            sms_opt_in: true,
            selected_plan: 'professional'
          },
          metadata: {
            source: 'signup_form',
            timestamp: new Date().toISOString(),
            has_trial_token: false
          },
          generateTrialToken: false
        };
        break;

      case 'subscription_started_trial':
        testPayload = {
          event: 'subscription_started',
          userId: testUserId,
          data: {
            planId: 'professional',
            subscriptionId: 'sub_test_trial_123',
            customerId: 'cus_test_123',
            status: 'trialing'
          },
          metadata: {
            billingCycle: 'monthly',
            trial: true,
            subscriptionId: 'sub_test_trial_123',
            priceId: 'price_test_trial',
            paymentType: 'trial_payment'
          }
        };
        break;

      case 'subscription_started_direct':
        testPayload = {
          event: 'subscription_started',
          userId: testUserId,
          data: {
            planId: 'professional',
            subscriptionId: 'sub_test_direct_123',
            customerId: 'cus_test_123',
            status: 'active'
          },
          metadata: {
            billingCycle: 'monthly',
            trial: false,
            subscriptionId: 'sub_test_direct_123',
            priceId: 'price_test_monthly',
            paymentType: 'direct_payment'
          }
        };
        break;

      case 'subscription_updated':
        testPayload = {
          event: 'subscription_updated',
          userId: testUserId,
          data: {
            oldPlanId: 'growth',
            newPlanId: 'professional',
            oldStatus: 'active',
            newStatus: 'active'
          },
          metadata: {
            eventType: 'customer.subscription.updated',
            priceId: 'price_test_upgrade'
          }
        };
        break;

      case 'payment_failed':
        testPayload = {
          event: 'payment_failed',
          userId: testUserId,
          data: {
            subscriptionId: 'sub_test_failed_123',
            invoiceId: 'in_test_failed',
            amount: 49.00
          },
          metadata: {
            failureReason: 'insufficient_funds',
            nextRetryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            retryCount: 1
          }
        };
        break;

      case 'payment_recovered':
        testPayload = {
          event: 'payment_recovered',
          userId: testUserId,
          data: {
            subscriptionId: 'sub_test_recovered_123',
            invoiceId: 'in_test_recovered',
            amount: 49.00
          },
          metadata: {
            recoveredAt: new Date().toISOString()
          }
        };
        break;

      case 'subscription_canceled':
        testPayload = {
          event: 'subscription_canceled',
          userId: testUserId,
          data: {
            subscriptionId: 'sub_test_canceled_123',
            customerId: 'cus_test_123'
          },
          metadata: {
            canceledAt: new Date().toISOString()
          }
        };
        break;

      case 'trial_ending':
        testPayload = {
          event: 'trial_ending',
          userId: testUserId,
          data: {
            subscriptionId: 'sub_test_ending_123',
            customerId: 'cus_test_123'
          },
          metadata: {
            trialEndDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            daysRemaining: 3
          }
        };
        break;

      case 'user_profile_completed':
        testPayload = {
          event: 'user_profile_completed',
          userId: testUserId,
          data: {
            completedFields: ['full_name', 'phone', 'timezone'],
            profileCompletion: 85
          },
          metadata: {
            completedAt: new Date().toISOString()
          }
        };
        break;

      default:
        return NextResponse.json(
          { error: `Unknown event type: ${eventType}` },
          { status: 400 }
        );
    }

    // Send to GHL webhook
    console.log(`[test-webhook] Sending ${eventType} event to GHL`);
    
    const response = await fetch(ghlWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload)
    });

    const result = await response.json();

    return NextResponse.json({
      message: `Test webhook sent: ${eventType}`,
      eventType,
      testPayload,
      ghlResponse: {
        status: response.status,
        result
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[test-webhook] Error:', error);
    return NextResponse.json(
      { error: 'Failed to send test webhook' },
      { status: 500 }
    );
  }
}

// GET endpoint to list all available test events
export async function GET() {
  const availableEvents = [
    {
      eventType: 'user_created_free',
      description: 'Free user signup with trial tokens',
      webhook: 'user_created',
      includes: ['trial_offer_token', 'trial_offer_url', 'trial_expires_at']
    },
    {
      eventType: 'user_created_paid',
      description: 'Paid user signup (no trial tokens)',
      webhook: 'user_created',
      includes: ['selected_plan (paid)']
    },
    {
      eventType: 'subscription_started_trial',
      description: '$1 trial payment completed',
      webhook: 'subscription_started', 
      includes: ['trial: true', 'paymentType: trial_payment']
    },
    {
      eventType: 'subscription_started_direct',
      description: 'Direct paid subscription (no trial)',
      webhook: 'subscription_started',
      includes: ['trial: false', 'paymentType: direct_payment']
    },
    {
      eventType: 'subscription_updated',
      description: 'Plan upgrade/downgrade',
      webhook: 'subscription_updated',
      includes: ['oldPlanId', 'newPlanId']
    },
    {
      eventType: 'payment_failed',
      description: 'Payment failure (retry needed)',
      webhook: 'payment_failed',
      includes: ['retryCount', 'nextRetryDate']
    },
    {
      eventType: 'payment_recovered',
      description: 'Failed payment recovered',
      webhook: 'payment_recovered',
      includes: ['recoveredAt']
    },
    {
      eventType: 'subscription_canceled',
      description: 'User canceled subscription',
      webhook: 'subscription_canceled',
      includes: ['canceledAt']
    },
    {
      eventType: 'trial_ending',
      description: '3-day warning before trial ends',
      webhook: 'trial_ending',
      includes: ['daysRemaining', 'trialEndDate']
    },
    {
      eventType: 'user_profile_completed',
      description: 'User completed profile setup',
      webhook: 'user_profile_completed',
      includes: ['completedFields', 'profileCompletion']
    }
  ];

  return NextResponse.json({
    message: 'Available test webhook events',
    baseUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/test/webhook-events`,
    usage: 'POST with { "eventType": "event_name", "userId": "optional-user-id" }',
    availableEvents,
    ghlWebhookUrl: process.env.GHL_WEBHOOK_URL ? 'configured' : 'not configured'
  });
}