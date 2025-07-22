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
    const { userId, source = 'email' } = await req.json();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      );
    }
    
    // Check if user exists and is on free plan
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, created_at, email')
      .eq('id', userId)
      .single();
      
    if (userError || !user) {
      console.error('[generate-token] User not found:', userError);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Check if user has active paid subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plan_id, status')
      .eq('user_id', userId)
      .eq('status', 'active')
      .neq('plan_id', 'free')
      .single();
      
    if (subscription) {
      return NextResponse.json(
        { error: 'User already has active subscription' },
        { status: 400 }
      );
    }
    
    // Check if within 7 days of signup
    const userCreatedAt = new Date(user.created_at);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    if (userCreatedAt < sevenDaysAgo) {
      return NextResponse.json(
        { error: 'Trial offer period has expired' },
        { status: 400 }
      );
    }
    
    // Generate token using database function
    const { data: tokenData, error: tokenError } = await supabase
      .rpc('create_trial_offer_token', {
        p_user_id: userId,
        p_source: source
      })
      .single() as { data: { token: string; expires_at: string; url: string } | null; error: any };
      
    if (tokenError || !tokenData) {
      console.error('[generate-token] Error creating token:', tokenError);
      return NextResponse.json(
        { error: tokenError?.message || 'Failed to generate token' },
        { status: 500 }
      );
    }
    
    // Update user record to track email sent
    if (source === 'email') {
      await supabase
        .from('users')
        .update({ 
          trial_offer_email_sent_at: new Date().toISOString(),
          trial_offer_expires_at: tokenData.expires_at
        })
        .eq('id', userId);
    }
    
    console.log(`[generate-token] Token generated for user ${userId}:`, {
      token: tokenData.token.substring(0, 8) + '...',
      expires_at: tokenData.expires_at,
      source
    });
    
    return NextResponse.json({
      success: true,
      token: tokenData.token,
      expires_at: tokenData.expires_at,
      url: tokenData.url,
      user_email: user.email
    });
    
  } catch (error) {
    console.error('[generate-token] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to check token status
export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token');
    
    if (!token) {
      return NextResponse.json(
        { error: 'Missing token' },
        { status: 400 }
      );
    }
    
    // Check token validity
    const { data: tokenData, error } = await supabase
      .from('trial_offer_tokens')
      .select('*, users!inner(email)')
      .eq('token', token)
      .single();
      
    if (error || !tokenData) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 404 }
      );
    }
    
    const isExpired = new Date(tokenData.expires_at) < new Date();
    const isUsed = !!tokenData.used_at;
    
    return NextResponse.json({
      valid: !isExpired && !isUsed,
      expired: isExpired,
      used: isUsed,
      expires_at: tokenData.expires_at,
      user_email: tokenData.users.email
    });
    
  } catch (error) {
    console.error('[generate-token] GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}