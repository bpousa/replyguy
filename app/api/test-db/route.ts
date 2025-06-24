import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with service role for testing
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    // 1. Check auth.users table
    const { data: authUsers, error: authError } = await supabase
      .from('auth.users')
      .select('id, email, created_at, email_confirmed_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (authError && authError.code !== 'PGRST106') {
      console.error('Auth users error:', authError);
    }

    // 2. Check public.users table
    const { data: publicUsers, error: publicError } = await supabase
      .from('users')
      .select('id, email, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    // 3. Check if trigger exists
    const { data: triggers, error: triggerError } = await supabase
      .rpc('get_triggers', { table_name: 'users', schema_name: 'auth' })
      .single();

    // 4. Check subscription_plans
    const { data: plans, error: plansError } = await supabase
      .from('subscription_plans')
      .select('*')
      .order('price_monthly');

    return NextResponse.json({
      success: true,
      data: {
        authUsers: authUsers || [],
        authUsersError: authError?.message,
        publicUsers: publicUsers || [],
        publicUsersError: publicError?.message,
        subscriptionPlans: plans || [],
        plansError: plansError?.message,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      }
    });
  } catch (error: any) {
    console.error('Test DB error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}