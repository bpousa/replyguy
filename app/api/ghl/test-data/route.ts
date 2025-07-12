import { NextRequest, NextResponse } from 'next/server';

// Generate realistic dummy data for testing GHL integration
function generateDummyUser(type: 'free' | 'x_basic' | 'x_pro' | 'x_business' | 'failed_payment' | 'canceled') {
  const baseDate = new Date();
  const signupDate = new Date(baseDate);
  signupDate.setDate(baseDate.getDate() - Math.floor(Math.random() * 365)); // Random signup within last year
  
  const userId = `test_${type}_${Math.random().toString(36).substring(7)}`;
  const email = `test_${type}_${Math.random().toString(36).substring(7)}@example.com`;
  const name = `Test User ${type.charAt(0).toUpperCase() + type.slice(1)}`;
  
  const basePayload = {
    external_id: userId,
    email: email,
    name: name,
    timezone: 'America/New_York',
    daily_goal: 10,
    signup_date: signupDate.toISOString(),
    referral_code: `REF${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
  };
  
  switch (type) {
    case 'free':
      return {
        ...basePayload,
        member_level: 'free',
        subscription_status: 'active',
        total_replies: Math.floor(Math.random() * 10),
        last_active: new Date().toISOString(),
        payment_status: 'current',
        monthly_reply_limit: 10,
        monthly_meme_limit: 0,
        features: []
      };
      
    case 'x_basic':
      return {
        ...basePayload,
        member_level: 'x_basic',
        subscription_status: 'active',
        billing_day: Math.floor(Math.random() * 28) + 1,
        total_replies: Math.floor(Math.random() * 300),
        last_active: new Date().toISOString(),
        payment_status: 'current',
        monthly_reply_limit: 300,
        monthly_meme_limit: 10,
        features: ['meme_generation']
      };
      
    case 'x_pro':
      const trialEnds = new Date();
      trialEnds.setDate(trialEnds.getDate() + 3);
      return {
        ...basePayload,
        member_level: 'x_pro',
        subscription_status: 'trialing',
        trial_ends: trialEnds.toISOString(),
        total_replies: Math.floor(Math.random() * 50),
        last_active: new Date().toISOString(),
        payment_status: 'trial',
        monthly_reply_limit: 500,
        monthly_meme_limit: 50,
        features: ['meme_generation', 'write_like_me', 'style_matching']
      };
      
    case 'x_business':
      return {
        ...basePayload,
        member_level: 'x_business',
        subscription_status: 'active',
        billing_day: 15,
        total_replies: Math.floor(Math.random() * 1000) + 500,
        last_active: new Date().toISOString(),
        payment_status: 'current',
        referred_by: 'referrer@example.com',
        monthly_reply_limit: 1000,
        monthly_meme_limit: 100,
        features: ['meme_generation', 'write_like_me', 'style_matching', 'research', 'long_replies']
      };
      
    case 'failed_payment':
      const failedDate = new Date();
      failedDate.setDate(failedDate.getDate() - 2);
      return {
        ...basePayload,
        member_level: 'x_pro',
        subscription_status: 'past_due',
        billing_day: 1,
        total_replies: Math.floor(Math.random() * 400) + 100,
        last_active: failedDate.toISOString(),
        payment_status: 'failed',
        payment_failed_date: failedDate.toISOString(),
        payment_retry_count: 2,
        monthly_reply_limit: 500,
        monthly_meme_limit: 50,
        features: ['meme_generation', 'write_like_me', 'style_matching']
      };
      
    case 'canceled':
      const canceledDate = new Date();
      canceledDate.setDate(canceledDate.getDate() - 30);
      return {
        ...basePayload,
        member_level: 'free',
        subscription_status: 'canceled',
        total_replies: Math.floor(Math.random() * 200),
        last_active: canceledDate.toISOString(),
        payment_status: 'canceled',
        monthly_reply_limit: 10,
        monthly_meme_limit: 0,
        features: []
      };
      
    default:
      return basePayload;
  }
}

// Generate test events
function generateTestEvent(eventType: string, userType: string) {
  const userData = generateDummyUser(userType as any);
  
  switch (eventType) {
    case 'user_created':
      return {
        event: 'user_created',
        timestamp: new Date().toISOString(),
        user: userData,
        metadata: {
          source: 'signup_form',
          referral_code: 'referred_by' in userData && userData.referred_by ? 'FRIEND123' : undefined
        }
      };
      
    case 'subscription_started':
      return {
        event: 'subscription_started',
        timestamp: new Date().toISOString(),
        user: userData,
        metadata: {
          plan: 'member_level' in userData ? userData.member_level : 'free',
          billing_cycle: 'monthly',
          amount: 'member_level' in userData ? (userData.member_level === 'x_basic' ? 19 : userData.member_level === 'x_pro' ? 49 : 99) : 0
        }
      };
      
    case 'payment_failed':
      return {
        event: 'payment_failed',
        timestamp: new Date().toISOString(),
        user: { ...userData, payment_status: 'failed', payment_failed_date: new Date().toISOString() },
        metadata: {
          failure_reason: 'insufficient_funds',
          retry_scheduled: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
        }
      };
      
    case 'trial_ending':
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 3);
      return {
        event: 'trial_ending',
        timestamp: new Date().toISOString(),
        user: { ...userData, subscription_status: 'trialing', trial_ends: trialEndDate.toISOString() },
        metadata: {
          trial_end_date: trialEndDate.toISOString(),
          plan_after_trial: 'member_level' in userData ? userData.member_level : 'free'
        }
      };
      
    default:
      return {
        event: eventType,
        timestamp: new Date().toISOString(),
        user: userData,
        metadata: {}
      };
  }
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const scenario = searchParams.get('scenario') || 'all';
  
  let testData: any[] = [];
  
  switch (scenario) {
    case 'all':
      // Generate one of each type
      testData = [
        generateTestEvent('user_created', 'free'),
        generateTestEvent('user_created', 'x_basic'),
        generateTestEvent('subscription_started', 'x_pro'),
        generateTestEvent('subscription_started', 'x_business'),
        generateTestEvent('payment_failed', 'failed_payment'),
        generateTestEvent('trial_ending', 'x_pro'),
        generateTestEvent('subscription_canceled', 'canceled'),
      ];
      break;
      
    case 'new_free_user':
      testData = [generateTestEvent('user_created', 'free')];
      break;
      
    case 'new_paid_user':
      testData = [
        generateTestEvent('user_created', 'x_basic'),
        generateTestEvent('subscription_started', 'x_basic')
      ];
      break;
      
    case 'upgrade':
      const upgradedUser = generateDummyUser('x_pro');
      testData = [
        {
          event: 'subscription_updated',
          timestamp: new Date().toISOString(),
          user: upgradedUser,
          metadata: {
            old_plan: 'x_basic',
            new_plan: 'x_pro',
            upgrade_reason: 'manual'
          }
        }
      ];
      break;
      
    case 'payment_failure':
      testData = [generateTestEvent('payment_failed', 'failed_payment')];
      break;
      
    case 'payment_recovery':
      const recoveredUser = generateDummyUser('x_pro');
      testData = [
        {
          event: 'payment_recovered',
          timestamp: new Date().toISOString(),
          user: { ...recoveredUser, payment_status: 'current' },
          metadata: {
            previous_failure_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            recovery_method: 'card_update'
          }
        }
      ];
      break;
      
    case 'trial':
      testData = [generateTestEvent('trial_ending', 'x_pro')];
      break;
      
    case 'cancellation':
      testData = [generateTestEvent('subscription_canceled', 'canceled')];
      break;
      
    default:
      return NextResponse.json(
        { 
          error: 'Invalid scenario',
          availableScenarios: [
            'all',
            'new_free_user',
            'new_paid_user',
            'upgrade',
            'payment_failure',
            'payment_recovery',
            'trial',
            'cancellation'
          ]
        },
        { status: 400 }
      );
  }
  
  return NextResponse.json({
    message: `Generated ${testData.length} test events for scenario: ${scenario}`,
    scenario,
    events: testData,
    instructions: [
      '1. Copy the events array above',
      '2. Send each event as a POST request to your GHL webhook endpoint',
      '3. Or use the /api/ghl/test-send endpoint to automatically send these to GHL',
      '4. Check your GHL instance to verify the data was received correctly'
    ]
  });
}

// POST endpoint to send test data to GHL
export async function POST(req: NextRequest) {
  try {
    const { scenario = 'all', sendToGHL = false } = await req.json();
    
    // Generate test data
    const response = await fetch(`${req.nextUrl.origin}/api/ghl/test-data?scenario=${scenario}`);
    const { events } = await response.json();
    
    if (!sendToGHL) {
      return NextResponse.json({
        message: 'Test data generated (not sent)',
        events
      });
    }
    
    // Send to GHL
    const ghlWebhookUrl = process.env.GHL_WEBHOOK_URL;
    if (!ghlWebhookUrl) {
      return NextResponse.json({
        error: 'GHL_WEBHOOK_URL not configured',
        events
      });
    }
    
    const results = await Promise.all(
      events.map(async (event: any) => {
        try {
          const response = await fetch(ghlWebhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(process.env.GHL_API_KEY && { 'Authorization': `Bearer ${process.env.GHL_API_KEY}` })
            },
            body: JSON.stringify(event)
          });
          
          return {
            event: event.event,
            success: response.ok,
            status: response.status
          };
        } catch (error) {
          return {
            event: event.event,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      })
    );
    
    return NextResponse.json({
      message: 'Test data sent to GHL',
      scenario,
      results,
      ghlWebhookUrl: ghlWebhookUrl.replace(/\/[^\/]+$/, '/***') // Hide sensitive part
    });
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process test data' },
      { status: 500 }
    );
  }
}