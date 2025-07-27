import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create service role client for admin operations
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

export async function POST(req: NextRequest) {
  try {
    const { email, testMode = true } = await req.json();
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email required for test' },
        { status: 400 }
      );
    }

    console.log('[webhook-test] Starting webhook test for email:', email);

    // Simulate what happens when a user signs up
    const testUser = {
      id: crypto.randomUUID(),
      email: email,
      email_confirmed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      raw_user_meta_data: {
        full_name: testMode ? 'Test User' : undefined,
        phone: testMode ? '+1234567890' : undefined,
        provider: 'email',
        signup_method: 'test'
      }
    };

    // Test step 1: Call handle-new-user directly
    console.log('[webhook-test] Testing handle-new-user endpoint...');
    const handleNewUserResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/auth/handle-new-user`, {
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

    const handleNewUserResult = await handleNewUserResponse.json();
    console.log('[webhook-test] handle-new-user response:', handleNewUserResult);

    // Check if trigger logs table exists and query it
    let triggerLogs = null;
    try {
      const { data: logs, error: logsError } = await supabase
        .from('trigger_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (logsError) {
        console.error('[webhook-test] Error fetching trigger logs:', logsError);
        triggerLogs = { error: logsError.message };
      } else {
        triggerLogs = logs;
      }
    } catch (error) {
      console.error('[webhook-test] Trigger logs table may not exist:', error);
      triggerLogs = { error: 'Table may not exist' };
    }

    // Test environment variables
    const envStatus = {
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      GHL_SYNC_ENABLED: process.env.GHL_SYNC_ENABLED,
      GHL_WEBHOOK_URL_EXISTS: !!process.env.GHL_WEBHOOK_URL,
      GHL_API_KEY_EXISTS: !!process.env.GHL_API_KEY
    };

    return NextResponse.json({
      success: true,
      test_user: testUser,
      results: {
        handle_new_user: {
          status: handleNewUserResponse.status,
          response: handleNewUserResult,
          success: handleNewUserResponse.ok
        }
      },
      environment: envStatus,
      recent_trigger_logs: triggerLogs,
      timestamp: new Date().toISOString(),
      next_steps: [
        'Check if data reaches Go High Level',
        'Verify trigger_logs table has entries',
        'Test with real signup flow'
      ]
    });

  } catch (error) {
    console.error('[webhook-test] Test failed:', error);
    return NextResponse.json(
      { 
        error: 'Webhook test failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check webhook configuration
export async function GET(req: NextRequest) {
  try {
    const envStatus = {
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      GHL_SYNC_ENABLED: process.env.GHL_SYNC_ENABLED,
      GHL_WEBHOOK_URL_EXISTS: !!process.env.GHL_WEBHOOK_URL,
      GHL_API_KEY_EXISTS: !!process.env.GHL_API_KEY,
      endpoints: {
        handle_new_user: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/handle-new-user`,
        ghl_webhook: `${process.env.NEXT_PUBLIC_APP_URL}/api/ghl/webhook`,
        ghl_test: `${process.env.NEXT_PUBLIC_APP_URL}/api/ghl/test-webhook`
      }
    };

    // Check recent trigger logs if available
    let triggerLogs = null;
    try {
      const { data: logs, error: logsError } = await supabase
        .from('trigger_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (!logsError) {
        triggerLogs = logs;
      }
    } catch (error) {
      // Table may not exist
    }

    return NextResponse.json({
      environment: envStatus,
      recent_trigger_logs: triggerLogs,
      timestamp: new Date().toISOString(),
      webhook_flow: [
        '1. User signs up → Supabase auth.users table',
        '2. Database trigger → handle_new_user() function',
        '3. Function calls → /api/auth/handle-new-user',
        '4. API calls → /api/ghl/webhook',
        '5. GHL webhook sends data to Go High Level'
      ]
    });

  } catch (error) {
    console.error('[webhook-test] Status check failed:', error);
    return NextResponse.json(
      { 
        error: 'Status check failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}