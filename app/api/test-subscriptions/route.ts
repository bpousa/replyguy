import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Create a service role client to bypass RLS
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    {
      auth: {
        persistSession: false,
      },
    }
  );
  
  // Get ALL subscriptions with active status
  const { data: activeSubs, error } = await supabase
    .from('subscriptions')
    .select(`
      *,
      user:users(email, created_at)
    `)
    .eq('status', 'active')
    .order('created_at', { ascending: false });
  
  // Get count of all subscriptions
  const { count: totalCount } = await supabase
    .from('subscriptions')
    .select('*', { count: 'exact', head: true });
  
  // Get count by status
  const { data: statusCounts } = await supabase
    .from('subscriptions')
    .select('status')
    .order('status');
  
  const statusSummary = statusCounts?.reduce((acc, curr) => {
    acc[curr.status] = (acc[curr.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return NextResponse.json({
    active_subscriptions: activeSubs || [],
    active_count: activeSubs?.length || 0,
    total_subscriptions: totalCount || 0,
    status_summary: statusSummary || {},
    error: error?.message || null
  });
}