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

async function getUserData(userId: string): Promise<GHLUserPayload | null> {
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
    
    const payload: GHLUserPayload = {
      external_id: userId,
      email: userInfo.email,
      name: userInfo.full_name || userInfo.email.split('@')[0],
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
      features
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