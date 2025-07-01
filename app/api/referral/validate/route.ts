import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// This endpoint validates referral codes during signup
// It doesn't require authentication since it's used before user creation
export async function POST(req: NextRequest) {
  try {
    const { referralCode } = await req.json();
    
    if (!referralCode) {
      return NextResponse.json(
        { error: 'Referral code is required' },
        { status: 400 }
      );
    }
    
    // Create Supabase client with service role for unauthenticated access
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
    
    // Check if referral code exists
    const { data: referrer, error } = await supabase
      .from('users')
      .select('id, email')
      .eq('referral_code', referralCode.toUpperCase())
      .single();
      
    if (error || !referrer) {
      return NextResponse.json({
        valid: false,
        message: 'Invalid referral code'
      });
    }
    
    // Check if referrer is on free tier (only free users can refer)
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plan_id')
      .eq('user_id', referrer.id)
      .eq('status', 'active')
      .single();
    
    const isFreeTier = !subscription || subscription.plan_id === 'free';
    
    return NextResponse.json({
      valid: true,
      referrerId: referrer.id,
      isFreeTier,
      message: isFreeTier ? 'Valid referral code' : 'Referral code is from a paid user'
    });
    
  } catch (error) {
    console.error('Referral validation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}