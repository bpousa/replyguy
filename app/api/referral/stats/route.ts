import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/app/lib/auth';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(cookieStore);
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get user's referral code and subscription info
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('referral_code, subscription_tier')
      .eq('id', user.id)
      .single();
      
    if (userError) {
      console.error('Error fetching user data:', userError);
      return NextResponse.json(
        { error: 'Failed to fetch user data' },
        { status: 500 }
      );
    }
    
    // Get referral bonuses
    const { data: bonuses, error: bonusError } = await supabase
      .from('referral_bonuses')
      .select('bonus_replies, bonus_research, total_referrals')
      .eq('user_id', user.id)
      .single();
    
    // Get list of successful referrals
    const { data: referrals, error: referralError } = await supabase
      .from('referrals')
      .select(`
        id,
        status,
        created_at,
        completed_at,
        referred:referred_id (
          email,
          created_at
        )
      `)
      .eq('referrer_id', user.id)
      .order('created_at', { ascending: false });
      
    if (referralError && referralError.code !== 'PGRST116') { // Ignore "no rows returned"
      console.error('Error fetching referrals:', referralError);
    }
    
    // Calculate totals
    const completedReferrals = referrals?.filter(r => r.status === 'completed') || [];
    const pendingReferrals = referrals?.filter(r => r.status === 'pending') || [];
    
    // Get the app URL dynamically
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
                   'http://localhost:3000';
    
    return NextResponse.json({
      referralCode: userData.referral_code,
      referralUrl: userData.referral_code ? `${appUrl}/auth/signup?ref=${userData.referral_code}` : null,
      isFreeTier: userData.subscription_tier === 'free' || !userData.subscription_tier,
      isPaidTier: isPaidTier(userData.subscription_tier),
      stats: {
        totalReferrals: bonuses?.total_referrals || 0,
        completedReferrals: completedReferrals.length,
        pendingReferrals: pendingReferrals.length,
        bonusReplies: bonuses?.bonus_replies || 0,
        bonusResearch: bonuses?.bonus_research || 0,
        maxBonusReplies: isPaidTier(userData.subscription_tier) ? 100 : 40, // Higher cap for paid users
        maxBonusResearch: isPaidTier(userData.subscription_tier) ? 10 : 4  // Higher cap for paid users
      },
      referrals: referrals || []
    });
    
  } catch (error) {
    console.error('Referral stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to check if user is on paid tier
function isPaidTier(tier: string | null): boolean {
  const paidTiers = ['basic', 'pro', 'x_business', 'growth', 'professional', 'enterprise'];
  return tier ? paidTiers.includes(tier) : false;
}