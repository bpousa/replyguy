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
  console.log('[post-signup] Processing new signup notification');
  
  try {
    let userId;
    
    try {
      const body = await req.json();
      userId = body.userId;
    } catch (parseError) {
      console.error('[post-signup] Failed to parse request body:', parseError);
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      );
    }
    
    console.log('[post-signup] Checking user:', userId);
    
    // First try to get the user from auth to get metadata
    const { data: { user: authUser }, error: authError } = await supabase.auth.admin.getUserById(userId);
    
    if (authError || !authUser) {
      console.error('[post-signup] Auth user not found:', userId, authError);
      
      // For new OAuth users, the user might not be immediately available
      // Return success but skip processing to avoid blocking the auth flow
      if (authError?.message?.includes('User not found') || authError?.status === 404) {
        console.log('[post-signup] User not found - likely timing issue, skipping processing');
        return NextResponse.json(
          { message: 'User not found - skipping processing', skipped: true },
          { status: 200 }
        );
      }
      
      return NextResponse.json(
        { error: 'Auth user not found' },
        { status: 404 }
      );
    }
    
    console.log('[post-signup] Auth user found:', {
      id: authUser?.id,
      email: authUser?.email,
      created_at: authUser?.created_at
    });
    
    // Check if user exists in public.users table
    const { data: publicUser, error: publicUserError } = await supabase
      .from('users')
      .select('created_at, email')
      .eq('id', userId)
      .maybeSingle();
    
    if (publicUserError && publicUserError.code !== 'PGRST116') {
      console.error('[post-signup] Error checking public user:', publicUserError);
    }
    
    const createdAt = new Date(authUser?.created_at || new Date());
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    if (createdAt < fiveMinutesAgo) {
      // Not a new user, skip GHL notification
      console.log('[post-signup] Not a new user, skipping GHL notification');
      return NextResponse.json({ 
        message: 'Not a new user, skipping GHL notification' 
      });
    }
    
    console.log('[post-signup] Processing new user for GHL webhook:', {
      userId,
      email: authUser?.email,
      hasPublicRecord: !!publicUser,
      createdAt: authUser?.created_at
    });
    
    // Generate trial offer token for free users
    let trialOfferData = null;
    const selectedPlan = authUser?.user_metadata?.selected_plan || 'free';
    
    if (selectedPlan === 'free') {
      try {
        const tokenResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/trial-offer/generate-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            userId: userId, 
            source: 'post_signup_fallback' 
          })
        });
        
        if (tokenResponse.ok) {
          const tokenData = await tokenResponse.json();
          trialOfferData = {
            token: tokenData.token,
            url: tokenData.url,
            expires_at: tokenData.expires_at
          };
          console.log(`✅ [post-signup] Trial offer token generated for free user ${userId}`);
        }
      } catch (error) {
        console.error('[post-signup] Failed to generate trial offer token:', error);
      }
    } else {
      console.log(`[post-signup] Skipping trial token for paid signup: ${selectedPlan}`);
    }

    // Skip GHL webhook - database trigger now handles this properly
    // Keeping this code for emergency fallback but disabled by default
    console.log('[post-signup] Skipping GHL webhook - database trigger handles this now');
    if (false && process.env.GHL_SYNC_ENABLED === 'true') {
      try {
        const ghlResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/ghl/webhook`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'user_created',
            userId: userId,
            data: {
              email: authUser?.email || '',
              full_name: authUser?.user_metadata?.full_name || null,
              phone: authUser?.user_metadata?.phone || null,
              sms_opt_in: authUser?.user_metadata?.sms_opt_in || false,
              selected_plan: selectedPlan,
              // Include trial data in main data payload
              ...(trialOfferData && {
                trial_offer_url: trialOfferData.url,
                trial_offer_token: trialOfferData.token,
                trial_expires_at: trialOfferData.expires_at
              })
            },
            metadata: {
              source: 'post_signup_fallback',
              timestamp: createdAt.toISOString(),
              has_public_record: !!publicUser,
              has_trial_token: !!trialOfferData
            },
            generateTrialToken: false // We already generated it
          })
        });
        
        if (ghlResponse.ok) {
          const ghlResult = await ghlResponse.json();
          console.log(`✅ [post-signup] GHL user_created event sent for user ${userId}:`, ghlResult);
        } else {
          console.error('[post-signup] GHL webhook failed:', ghlResponse.status);
        }
      } catch (error) {
        console.error('[post-signup] Failed to send user_created event to GHL:', error);
        // Don't fail the request if GHL webhook fails
      }
    }
    
    return NextResponse.json({ 
      message: 'Post-signup processing completed',
      newUser: true,
      hasPublicRecord: !!publicUser
    });
    
  } catch (error) {
    console.error('[post-signup] Error:', error);
    return NextResponse.json(
      { error: 'Post-signup processing failed' },
      { status: 500 }
    );
  }
}