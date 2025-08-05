import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

interface GHLUserPayload {
  // Core user data
  external_id: string;        // ReplyGuy user ID
  email: string;
  name: string;
  phone?: string;             // Phone number in E.164 format
  phone_verified?: boolean;   // Whether phone is verified
  sms_opt_in?: boolean;       // Opted in for SMS growth tips
  sms_opt_in_date?: string;   // ISO date when opted in
  timezone: string;
  
  // Subscription data
  member_level: 'free' | 'x_basic' | 'x_pro' | 'x_business';
  subscription_status: string;
  billing_day?: number;       // 1-31, only for paid
  trial_ends?: string;        // ISO date
  
  // Usage data
  daily_goal: number;
  total_replies: number;      // From usage tracking
  signup_date: string;
  last_active?: string;
  
  // Payment status (for follow-up automation)
  payment_status: 'current' | 'failed' | 'canceled' | 'trial';
  payment_failed_date?: string;
  payment_retry_count?: number;
  
  // Referral data
  referred_by?: string;       // Email of referrer
  referral_code?: string;
  
  // Plan limits
  monthly_reply_limit: number;
  monthly_meme_limit: number;
  features: string[];         // Array of enabled features
}

// Map internal plan IDs to GHL member levels
function mapPlanToMemberLevel(planId: string): GHLUserPayload['member_level'] {
  switch (planId) {
    case 'free':
      return 'free';
    case 'growth':
    case 'basic':
      return 'x_basic';
    case 'professional':
    case 'pro':
      return 'x_pro';
    case 'enterprise':
    case 'business':
      return 'x_business';
    default:
      return 'free';
  }
}

// Determine payment status based on subscription data
function getPaymentStatus(subscription: any): GHLUserPayload['payment_status'] {
  if (!subscription) return 'current'; // Free users are always current
  
  if (subscription.status === 'trialing') return 'trial';
  if (subscription.status === 'canceled') return 'canceled';
  if (subscription.status === 'past_due' || subscription.payment_failed_at) return 'failed';
  
  return 'current';
}

async function getUserData(userId: string): Promise<GHLUserPayload & { trial_offer_url?: string; trial_offer_token?: string; trial_expires_at?: string } | null> {
  try {
    // Get user info with subscription data
    const { data: userInfo, error: userError } = await supabase
      .from('user_subscription_info')
      .select('*')
      .eq('user_id', userId)
      .single();
      
    if (userError || !userInfo) {
      console.error('Error fetching user info:', userError);
      return null;
    }

    // Get trial token for free users (simplified logic)
    let trialOfferData = null;
    console.log(`[sync-user] Checking trial tokens for user ${userId}, plan: ${userInfo.plan_id}`);
    
    if (userInfo.plan_id === 'free') {
      try {
        // Check for existing valid trial token first
        const { data: existingToken } = await supabase
          .from('trial_offer_tokens')
          .select('token, expires_at')
          .eq('user_id', userId)
          .gt('expires_at', new Date().toISOString())
          .is('used_at', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
          
        if (existingToken) {
          trialOfferData = {
            token: existingToken.token,
            expires_at: existingToken.expires_at,
            url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://replyguy.appendment.com'}/auth/trial-offer?token=${existingToken.token}`
          };
          console.log(`[sync-user] Found existing trial token for user ${userId}`);
        } else {
          // No existing token, generate new one using the same logic as generate-token API
          console.log(`[sync-user] No existing trial token, generating new one for user ${userId}`);
          
          const { data: newToken } = await supabase
            .rpc('generate_user_trial_token', {
              p_user_id: userId,
              p_source: 'sync'
            })
            .single() as { data: { result_token: string; result_expires_at: string; result_url: string } | null };
            
          if (newToken) {
            trialOfferData = {
              token: newToken.result_token,
              expires_at: newToken.result_expires_at,
              url: newToken.result_url
            };
            console.log(`[sync-user] Generated new trial token for user ${userId}`);
          }
        }
      } catch (error) {
        console.error('Error checking trial token for sync:', error);
      }
    } else {
      console.log(`[sync-user] Skipping trial tokens for non-free plan: ${userInfo.plan_id}`);
    }
    
    console.log(`[sync-user] Final trialOfferData:`, trialOfferData ? { 
      hasToken: !!trialOfferData.token,
      hasUrl: !!trialOfferData.url,
      expires: trialOfferData.expires_at 
    } : null);
    
    // Get usage stats
    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    
    const { data: usage } = await supabase
      .from('user_usage')
      .select('replies_generated, memes_generated, suggestions_used')
      .eq('user_id', userId)
      .gte('month', startOfMonth.toISOString())
      .single();
    
    // Get last activity
    const { data: lastActivity } = await supabase
      .from('daily_usage')
      .select('date')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(1)
      .single();
    
    // Get referrer info if applicable
    let referrerEmail: string | undefined;
    if (userInfo.referred_by) {
      const { data: referrer } = await supabase
        .from('users')
        .select('email')
        .eq('id', userInfo.referred_by)
        .single();
      referrerEmail = referrer?.email;
    }
    
    // Build features array based on plan
    const features: string[] = [];
    if (userInfo.enable_memes) features.push('meme_generation');
    if (userInfo.enable_write_like_me) features.push('write_like_me');
    if (userInfo.enable_style_matching) features.push('style_matching');
    if (userInfo.enable_perplexity_guidance) features.push('research');
    if (userInfo.enable_long_replies) features.push('long_replies');
    
    // Get billing day from subscription
    let billingDay: number | undefined;
    if (userInfo.subscription_id && userInfo.billing_anchor_day) {
      billingDay = userInfo.billing_anchor_day;
    }
    
    const payload: GHLUserPayload & { trial_offer_url?: string; trial_offer_token?: string; trial_expires_at?: string } = {
      external_id: userId,
      email: userInfo.email,
      name: userInfo.full_name || userInfo.email.split('@')[0],
      phone: userInfo.phone,
      phone_verified: userInfo.phone_verified || false,
      sms_opt_in: userInfo.sms_opt_in || false,
      sms_opt_in_date: userInfo.sms_opt_in_date,
      timezone: userInfo.timezone || 'America/New_York',
      member_level: mapPlanToMemberLevel(userInfo.plan_id || 'free'),
      subscription_status: userInfo.subscription_status || 'active',
      billing_day: billingDay,
      trial_ends: userInfo.trialing_until,
      daily_goal: userInfo.daily_goal || 10,
      total_replies: usage?.replies_generated || 0,
      signup_date: userInfo.created_at,
      last_active: lastActivity?.date,
      payment_status: getPaymentStatus(userInfo),
      payment_failed_date: userInfo.payment_failed_at,
      payment_retry_count: userInfo.payment_retry_count,
      referred_by: referrerEmail,
      referral_code: userInfo.referral_code,
      monthly_reply_limit: userInfo.reply_limit || 10,
      monthly_meme_limit: userInfo.meme_limit || 0,
      features,
      // Include trial offer data if available
      ...(trialOfferData && {
        trial_offer_url: trialOfferData.url,
        trial_offer_token: trialOfferData.token,
        trial_expires_at: trialOfferData.expires_at
      })
    };
    
    return payload;
  } catch (error) {
    console.error('Error building user data:', error);
    return null;
  }
}

async function sendToGHL(payload: GHLUserPayload): Promise<boolean> {
  const ghlWebhookUrl = process.env.GHL_WEBHOOK_URL;
  const ghlApiKey = process.env.GHL_API_KEY;
  
  if (!ghlWebhookUrl) {
    console.error('GHL_WEBHOOK_URL not configured');
    return false;
  }
  
  try {
    const response = await fetch(ghlWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(ghlApiKey && { 'Authorization': `Bearer ${ghlApiKey}` })
      },
      body: JSON.stringify({
        event: 'user_sync',
        data: payload,
        timestamp: new Date().toISOString()
      })
    });
    
    if (!response.ok) {
      console.error('GHL webhook failed:', response.status, await response.text());
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error sending to GHL:', error);
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, userIds } = await req.json();
    
    // Support both single user and batch sync
    const idsToSync = userIds || (userId ? [userId] : []);
    
    if (idsToSync.length === 0) {
      return NextResponse.json(
        { error: 'No user IDs provided' },
        { status: 400 }
      );
    }
    
    const results = await Promise.all(
      idsToSync.map(async (id: string) => {
        const userData = await getUserData(id);
        if (!userData) {
          return { userId: id, success: false, error: 'User not found' };
        }
        
        const success = await sendToGHL(userData);
        return { userId: id, success, data: userData };
      })
    );
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    return NextResponse.json({
      message: `Synced ${successful} users, ${failed} failed`,
      results,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Sync user error:', error);
    return NextResponse.json(
      { error: 'Failed to sync user data' },
      { status: 500 }
    );
  }
}

// GET endpoint for testing/debugging
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const userId = searchParams.get('userId');
  
  if (!userId) {
    return NextResponse.json(
      { error: 'userId parameter required' },
      { status: 400 }
    );
  }
  
  const userData = await getUserData(userId);
  
  if (!userData) {
    return NextResponse.json(
      { error: 'User not found' },
      { status: 404 }
    );
  }
  
  return NextResponse.json({
    message: 'User data preview (not sent to GHL)',
    data: userData,
    ghlConfigured: !!process.env.GHL_WEBHOOK_URL
  });
}