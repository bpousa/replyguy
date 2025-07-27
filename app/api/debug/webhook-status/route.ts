import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function GET(req: NextRequest) {
  // Allow access without authentication for debugging
  const authHeader = req.headers.get('authorization');
  const isDebugMode = req.nextUrl.searchParams.get('debug') === 'true';
  try {
    // Check environment variables
    const envCheck = {
      NEXT_PUBLIC_APP_URL: !!process.env.NEXT_PUBLIC_APP_URL,
      GHL_SYNC_ENABLED: process.env.GHL_SYNC_ENABLED,
      GHL_WEBHOOK_URL: !!process.env.GHL_WEBHOOK_URL,
      GHL_API_KEY: !!process.env.GHL_API_KEY,
      current_app_url: process.env.NEXT_PUBLIC_APP_URL
    };

    // Get recent trigger logs
    const { data: triggerLogs, error: logsError } = await supabase
      .from('trigger_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (logsError) {
      console.error('Error fetching trigger logs:', logsError);
    }

    // Get recent user signups to check if they triggered webhooks
    const { data: recentUsers, error: usersError } = await supabase
      .from('users')
      .select('id, email, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (usersError) {
      console.error('Error fetching recent users:', usersError);
    }

    // Check if webhook endpoints are accessible
    const webhookChecks = {
      handle_new_user: null as any,
      ghl_webhook: null as any,
      ghl_test_webhook: null as any
    };

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (baseUrl) {
      try {
        // Test handle-new-user endpoint (should return 400 for GET request)
        const handleNewUserResponse = await fetch(`${baseUrl}/api/auth/handle-new-user`, {
          method: 'GET'
        });
        webhookChecks.handle_new_user = {
          status: handleNewUserResponse.status,
          accessible: true
        };
      } catch (error) {
        webhookChecks.handle_new_user = {
          error: 'Not accessible',
          accessible: false
        };
      }

      try {
        // Test GHL webhook endpoint (GET should return health status)
        const ghlResponse = await fetch(`${baseUrl}/api/ghl/webhook`, {
          method: 'GET'
        });
        const ghlData = await ghlResponse.json();
        webhookChecks.ghl_webhook = {
          status: ghlResponse.status,
          data: ghlData,
          accessible: true
        };
      } catch (error) {
        webhookChecks.ghl_webhook = {
          error: 'Not accessible',
          accessible: false
        };
      }

      try {
        // Test GHL test webhook endpoint
        const testResponse = await fetch(`${baseUrl}/api/ghl/test-webhook`, {
          method: 'GET'
        });
        const testData = await testResponse.json();
        webhookChecks.ghl_test_webhook = {
          status: testResponse.status,
          data: testData,
          accessible: true
        };
      } catch (error) {
        webhookChecks.ghl_test_webhook = {
          error: 'Not accessible',
          accessible: false
        };
      }
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      environment: envCheck,
      recent_trigger_logs: triggerLogs || [],
      recent_users: recentUsers || [],
      webhook_endpoints: webhookChecks,
      webhook_flow_status: {
        database_trigger: 'Configured (check trigger_logs for execution)',
        api_endpoints: Object.values(webhookChecks).every(check => check?.accessible),
        ghl_integration: process.env.GHL_SYNC_ENABLED === 'true'
      }
    });

  } catch (error) {
    console.error('Webhook status check error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check webhook status',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Test webhook trigger manually (for debugging)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, test = false } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email required for webhook test' },
        { status: 400 }
      );
    }

    // Simulate calling the handle-new-user endpoint
    const testUser = {
      id: 'test-' + Date.now(),
      email: email,
      raw_user_meta_data: {
        full_name: test ? 'Test User' : undefined,
        phone: test ? '+1234567890' : undefined,
        provider: 'email'
      }
    };

    const webhookResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/auth/handle-new-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-supabase-event': 'user.created'
      },
      body: JSON.stringify({
        record: testUser,
        event_type: 'INSERT'
      })
    });

    const webhookResult = await webhookResponse.json();

    return NextResponse.json({
      test_triggered: true,
      webhook_response: {
        status: webhookResponse.status,
        data: webhookResult
      },
      test_user: testUser,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Webhook test error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to test webhook',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}