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
  console.log('[check-trigger-exists] Checking if database trigger exists');
  
  try {
    const results = {
      timestamp: new Date().toISOString(),
      checks: [] as any[]
    };

    // Check if the trigger function exists using information_schema
    try {
      const { data: functions, error } = await supabase
        .from('information_schema.routines')
        .select('routine_name, routine_type, routine_schema, specific_name')
        .eq('routine_name', 'handle_new_user')
        .eq('routine_schema', 'public');

      results.checks.push({
        type: 'function_exists',
        success: !error,
        data: functions,
        count: functions?.length || 0,
        error: error?.message
      });
    } catch (error) {
      results.checks.push({
        type: 'function_check_failed',
        success: false,
        error: (error as Error).message
      });
    }

    // Check if the trigger exists using information_schema
    try {
      const { data: triggers, error } = await supabase
        .from('information_schema.triggers')
        .select('trigger_name, event_manipulation, event_object_table, trigger_schema, action_statement')
        .eq('trigger_name', 'on_auth_user_created');

      results.checks.push({
        type: 'trigger_exists',
        success: !error,
        data: triggers,
        count: triggers?.length || 0,
        error: error?.message
      });
    } catch (error) {
      results.checks.push({
        type: 'trigger_check_failed',
        success: false,
        error: (error as Error).message
      });
    }

    // Check if auth.users table exists using information_schema
    try {
      const { data: authTable, error } = await supabase
        .from('information_schema.tables')
        .select('table_name, table_schema, table_type')
        .eq('table_name', 'users')
        .eq('table_schema', 'auth');

      results.checks.push({
        type: 'auth_users_table',
        success: !error,
        data: authTable,
        count: authTable?.length || 0,
        error: error?.message
      });
    } catch (error) {
      results.checks.push({
        type: 'auth_table_check_failed',
        success: false,
        error: (error as Error).message
      });
    }

    // Check all triggers on auth.users table
    try {
      const { data: allTriggers, error } = await supabase
        .from('information_schema.triggers')
        .select('trigger_name, event_manipulation, event_object_table')
        .eq('event_object_table', 'users')
        .eq('trigger_schema', 'auth');

      results.checks.push({
        type: 'auth_users_all_triggers',
        success: !error,
        data: allTriggers,
        count: allTriggers?.length || 0,
        error: error?.message
      });
    } catch (error) {
      results.checks.push({
        type: 'all_triggers_check_failed',
        success: false,
        error: (error as Error).message
      });
    }

    return NextResponse.json({
      message: 'Trigger existence check completed',
      results,
      diagnosis: results.checks.some(c => c.type === 'trigger_exists' && c.count === 0) 
        ? '❌ TRIGGER NOT FOUND - This explains why webhooks are not working!'
        : results.checks.some(c => c.type === 'function_exists' && c.count === 0)
        ? '❌ FUNCTION NOT FOUND - Trigger function is missing!'
        : '✅ Components appear to exist, investigating further...',
      summary: {
        total_checks: results.checks.length,
        successful_checks: results.checks.filter(c => c.success).length,
        failed_checks: results.checks.filter(c => !c.success).length
      }
    });

  } catch (error) {
    console.error('[check-trigger-exists] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check trigger existence',
        details: (error as Error).message
      },
      { status: 500 }
    );
  }
}