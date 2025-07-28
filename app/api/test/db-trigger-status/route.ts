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
  console.log('[db-trigger-status] Checking database trigger and function status');
  
  try {
    const results = {
      timestamp: new Date().toISOString(),
      checks: [] as any[]
    };

    // Check if handle_new_user function exists - direct SQL query
    try {
      const { data: functions, error: funcError } = await supabase
        .from('information_schema.routines')
        .select('routine_name, routine_type, specific_name')
        .eq('routine_name', 'handle_new_user')
        .eq('routine_schema', 'public');

      results.checks.push({
        type: 'function_exists',
        success: !funcError,
        data: functions,
        count: functions?.length || 0,
        error: funcError?.message
      });
    } catch (error) {
      results.checks.push({
        type: 'function_check_failed',
        success: false,
        error: (error as Error).message
      });
    }

    // Check if trigger exists
    try {
      const { data: triggers, error: trigError } = await supabase
        .from('information_schema.triggers')
        .select('trigger_name, event_manipulation, event_object_table, trigger_schema, action_statement')
        .eq('trigger_name', 'on_auth_user_created');

      results.checks.push({
        type: 'trigger_exists',
        success: !trigError,
        data: triggers,
        count: triggers?.length || 0,
        error: trigError?.message
      });
    } catch (error) {
      results.checks.push({
        type: 'trigger_check_failed',
        success: false,
        error: (error as Error).message
      });
    }

    // Check if HTTP extension is available
    try {
      const { data: extensions, error: extError } = await supabase
        .from('pg_extension')
        .select('extname, extversion')
        .in('extname', ['http', 'extensions']);

      results.checks.push({
        type: 'http_extension',
        success: !extError,
        data: extensions,
        count: extensions?.length || 0,
        error: extError?.message
      });
    } catch (error) {
      results.checks.push({
        type: 'extension_check_failed',
        success: false,
        error: (error as Error).message
      });
    }

    // Check recent trigger logs
    try {
      const { data: triggerLogs, error: logError } = await supabase
        .from('trigger_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      results.checks.push({
        type: 'recent_trigger_logs',
        success: !logError,
        data: triggerLogs,
        count: triggerLogs?.length || 0,
        error: logError?.message
      });
    } catch (error) {
      results.checks.push({
        type: 'trigger_logs_check_failed',
        success: false,
        error: (error as Error).message
      });
    }

    // Test manual function call (if it exists)
    try {
      const { data: testResult, error: testError } = await supabase
        .rpc('test_webhook_connection');

      results.checks.push({
        type: 'test_webhook_function',
        success: !testError,
        data: testResult,
        error: testError?.message
      });
    } catch (error) {
      results.checks.push({
        type: 'test_function_failed',
        success: false,
        error: (error as Error).message
      });
    }

    return NextResponse.json({
      message: 'Database trigger status check completed',
      results,
      summary: {
        total_checks: results.checks.length,
        successful_checks: results.checks.filter(c => c.success).length,
        failed_checks: results.checks.filter(c => !c.success).length
      }
    });

  } catch (error) {
    console.error('[db-trigger-status] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check database trigger status',
        details: (error as Error).message
      },
      { status: 500 }
    );
  }
}