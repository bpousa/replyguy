import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/app/lib/auth';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
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
    
    // Check if user already has a referral code
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
    
    // If user already has a code, return it
    if (userData.referral_code) {
      // Get the app URL dynamically
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 
                     process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
                     'http://localhost:3000';
      
      return NextResponse.json({
        referralCode: userData.referral_code,
        referralUrl: `${appUrl}/auth/signup?ref=${userData.referral_code}`,
        isFreeTier: userData.subscription_tier === 'free' || !userData.subscription_tier,
        isPaidTier: isPaidTier(userData.subscription_tier)
      });
    }
    
    // Generate new referral code
    const { data: result, error: generateError } = await supabase
      .rpc('generate_referral_code', { p_user_id: user.id });
      
    if (generateError) {
      console.error('Error generating referral code:', generateError);
      return NextResponse.json(
        { error: 'Failed to generate referral code' },
        { status: 500 }
      );
    }
    
    // Get the app URL dynamically
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
                   'http://localhost:3000';
    
    return NextResponse.json({
      referralCode: result,
      referralUrl: `${appUrl}/auth/signup?ref=${result}`,
      isFreeTier: userData.subscription_tier === 'free' || !userData.subscription_tier,
      isPaidTier: isPaidTier(userData.subscription_tier)
    });
    
  } catch (error) {
    console.error('Referral generation error:', error);
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