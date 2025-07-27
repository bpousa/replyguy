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
    const { email, skipTrigger = false } = await req.json();
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email required for test' },
        { status: 400 }
      );
    }

    console.log('[trigger-test] Starting database trigger test for email:', email);

    // Create a test user directly in auth.users to trigger our webhook
    const testUserId = crypto.randomUUID();
    const testUser = {
      id: testUserId,
      email: email,
      encrypted_password: 'test-password-hash',
      email_confirmed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      raw_user_meta_data: {
        full_name: 'Test Database User',
        phone: '+1234567890',
        provider: 'email',
        signup_method: 'database_test'
      }
    };

    // Insert directly into auth.users table to trigger our function
    if (!skipTrigger) {
      const { error: insertError } = await supabase
        .from('auth.users')
        .insert([testUser]);

      if (insertError) {
        console.error('[trigger-test] Error inserting test user:', insertError);
        return NextResponse.json(
          { 
            error: 'Failed to insert test user',
            details: insertError.message
          },
          { status: 500 }
        );
      }
    }

    // Wait a moment for trigger to execute
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check trigger logs for this user
    const { data: triggerLogs, error: logsError } = await supabase
      .from('trigger_logs')
      .select('*')
      .eq('user_id', testUserId)
      .order('created_at', { ascending: true });

    if (logsError) {
      console.error('[trigger-test] Error fetching trigger logs:', logsError);
    }

    // Check if user was created in public.users
    const { data: publicUser, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', testUserId)
      .single();

    if (userError && userError.code !== 'PGRST116') {
      console.error('[trigger-test] Error checking public user:', userError);
    }

    // Get recent overall trigger logs
    const { data: recentLogs, error: recentLogsError } = await supabase
      .from('trigger_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      success: true,
      test_user_id: testUserId,
      test_email: email,
      results: {
        user_inserted: !skipTrigger,
        public_user_created: !!publicUser,
        trigger_logs_count: triggerLogs?.length || 0,
        webhook_executed: triggerLogs?.some(log => log.event_type === 'webhook_sent' || log.event_type === 'webhook_sent_fallback') || false,
        webhook_failed: triggerLogs?.some(log => log.event_type === 'webhook_failed') || false
      },
      trigger_logs: triggerLogs || [],
      public_user: publicUser,
      recent_trigger_logs: recentLogs || [],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[trigger-test] Test failed:', error);
    return NextResponse.json(
      { 
        error: 'Database trigger test failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check recent trigger activity
export async function GET(req: NextRequest) {
  try {
    // Get recent trigger logs
    const { data: recentLogs, error: logsError } = await supabase
      .from('trigger_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (logsError) {
      console.error('[trigger-test] Error fetching recent logs:', logsError);
    }

    // Group logs by user
    const logsByUser = recentLogs?.reduce((acc, log) => {
      const userId = log.user_id || 'unknown';
      if (!acc[userId]) {
        acc[userId] = [];
      }
      acc[userId].push(log);
      return acc;
    }, {} as Record<string, any[]>) || {};

    // Count webhook successes and failures
    const webhookStats = recentLogs?.reduce((acc, log) => {
      if (log.event_type === 'webhook_sent' || log.event_type === 'webhook_sent_fallback') {
        acc.successes++;
      } else if (log.event_type === 'webhook_failed') {
        acc.failures++;
      }
      return acc;
    }, { successes: 0, failures: 0 }) || { successes: 0, failures: 0 };

    return NextResponse.json({
      recent_logs: recentLogs || [],
      logs_by_user: logsByUser,
      webhook_stats: webhookStats,
      total_logs: recentLogs?.length || 0,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[trigger-test] Status check failed:', error);
    return NextResponse.json(
      { 
        error: 'Status check failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}