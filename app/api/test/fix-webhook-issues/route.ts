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

export async function POST(req: NextRequest) {
  console.log('[fix-webhook-issues] Testing new signup flow');
  
  try {
    // Instead of trying to apply SQL fixes (which require special permissions),
    // let's just test the current trigger status and suggest next steps
    
    const results = {
      timestamp: new Date().toISOString(),
      current_status: 'checking',
      recommendations: [] as string[]
    };

    // Check recent trigger logs to see current issues
    const { data: recentLogs, error: logsError } = await supabase
      .from('trigger_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (logsError) {
      return NextResponse.json(
        { error: 'Failed to check trigger logs', details: logsError.message },
        { status: 500 }
      );
    }

    // Analyze the logs to identify current issues
    const webhookFailures = recentLogs?.filter(log => 
      log.event_type === 'webhook_failed' && 
      log.error_message?.includes('extensions.http_post')
    ) || [];

    const subscriptionFailures = recentLogs?.filter(log => 
      log.event_type === 'subscription_failed' && 
      log.error_message?.includes('ON CONFLICT')
    ) || [];

    // Based on analysis, provide recommendations
    if (webhookFailures.length > 0) {
      results.recommendations.push(
        '❌ HTTP Extension Issue: The database trigger is failing because extensions.http_post does not exist. Need to either enable the http extension or switch to net.http_post.'
      );
    }

    if (subscriptionFailures.length > 0) {
      results.recommendations.push(
        '❌ Subscription Constraint Issue: The ON CONFLICT clause in subscription creation is failing due to missing or incorrect constraint. Need to fix the unique constraint on subscriptions table.'
      );
    }

    if (webhookFailures.length === 0 && subscriptionFailures.length === 0) {
      results.recommendations.push(
        '✅ No recent webhook or subscription failures detected. The trigger may be working correctly now.'
      );
    }

    // Provide immediate action plan
    results.recommendations.push(
      '🔧 Next Steps:',
      '1. Apply the migration file: 20250728_fix_webhook_and_subscription_issues.sql',
      '2. Test with a new user signup using: antoni.mike+test' + Date.now() + '@gmail.com',
      '3. Check trigger_logs table for webhook_sent events',
      '4. Verify GHL receives the webhook'
    );

    return NextResponse.json({
      message: 'Webhook issue analysis completed',
      current_issues: {
        webhook_failures: webhookFailures.length,
        subscription_failures: subscriptionFailures.length,
        recent_logs_count: recentLogs?.length || 0
      },
      recent_logs: recentLogs?.slice(0, 3), // Show 3 most recent
      recommendations: results.recommendations,
      next_action: webhookFailures.length > 0 || subscriptionFailures.length > 0 
        ? 'Apply database migration to fix issues'
        : 'Test with new user signup'
    });

  } catch (error) {
    console.error('[fix-webhook-issues] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to analyze webhook issues',
        details: (error as Error).message
      },
      { status: 500 }
    );
  }
}