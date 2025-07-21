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
    const { token } = await req.json();
    
    if (!token) {
      return NextResponse.json(
        { error: 'Missing token' },
        { status: 400 }
      );
    }
    
    // Mark token as used
    const { error } = await supabase
      .from('trial_offer_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('token', token)
      .is('used_at', null); // Only update if not already used
      
    if (error) {
      console.error('[mark-used] Error marking token as used:', error);
      return NextResponse.json(
        { error: 'Failed to mark token as used' },
        { status: 500 }
      );
    }
    
    console.log('[mark-used] Token marked as used:', token.substring(0, 8) + '...');
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('[mark-used] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}