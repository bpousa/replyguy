import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
  console.log('[handle-new-user] Webhook received from Supabase');
  
  try {
    const body = await req.json();
    const { record } = body;
    
    console.log('[handle-new-user] Request details:', {
      hasRecord: !!record,
      recordId: record?.id,
      recordEmail: record?.email,
      hasMetadata: !!record?.raw_user_meta_data,
      eventType: body.event_type,
      headers: {
        'x-supabase-event': req.headers.get('x-supabase-event'),
        'content-type': req.headers.get('content-type')
      }
    });
    
    if (!record?.id) {
      console.error('[handle-new-user] No user record provided in webhook');
      return NextResponse.json(
        { error: 'No user record provided' },
        { status: 400 }
      );
    }
    
    // Extract user metadata
    const { 
      full_name, 
      phone, 
      sms_opt_in,
      referral_code,
      selected_plan 
    } = record.raw_user_meta_data || {};
    
    // Update the users table with additional information
    const updates: any = {};
    
    if (full_name) {
      updates.full_name = full_name;
    }
    
    if (phone) {
      updates.phone = phone;
      updates.phone_verified = false;
    }
    
    if (sms_opt_in && phone) {
      updates.sms_opt_in = true;
      updates.sms_opt_in_date = new Date().toISOString();
    }
    
    // Only update if there are fields to update
    if (Object.keys(updates).length > 0) {
      console.log('[handle-new-user] Updating user fields:', updates);
      
      const { error: updateError } = await supabase
        .from('users')
        .update(updates)
        .eq('id', record.id);
        
      if (updateError) {
        console.error('[handle-new-user] Error updating user fields:', updateError);
        // Don't fail the request - user is already created
      } else {
        console.log(`[handle-new-user] ✅ Updated user fields for ${record.id}:`, Object.keys(updates));
      }
    } else {
      console.log('[handle-new-user] No additional fields to update');
    }
    
    // Handle referral code if present
    if (referral_code) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/referral/claim`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            referralCode: referral_code,
            referredUserId: record.id
          })
        });
      } catch (error) {
        console.error('Failed to process referral:', error);
      }
    }
    
    // Generate trial offer token for new user (only for free signups)
    let trialOfferData = null;
    const selectedPlan = selected_plan || 'free';
    
    if (selectedPlan === 'free') {
      try {
        // Generate token using the API endpoint
        const tokenResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/trial-offer/generate-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            userId: record.id, 
            source: 'webhook' 
          })
        });
        
        if (tokenResponse.ok) {
          const tokenData = await tokenResponse.json();
          trialOfferData = {
            token: tokenData.token,
            url: tokenData.url,
            expires_at: tokenData.expires_at
          };
          console.log(`✅ Trial offer token generated for free user ${record.id}`);
        }
      } catch (error) {
        console.error('Failed to generate trial offer token:', error);
      }
    } else {
      console.log(`[handle-new-user] Skipping trial token for paid signup: ${selectedPlan}`);
    }
    
    // Check if this is an OAuth user (needs profile completion)
    const isOAuthUser = record.app_metadata?.provider && record.app_metadata.provider !== 'email';
    const hasCompleteProfile = full_name && full_name.trim() !== '';
    
    // For OAuth users without complete profile, delay webhook until profile completion
    const shouldDelayWebhook = isOAuthUser && !hasCompleteProfile;
    
    // Send GHL notification for new user
    console.log('[handle-new-user] GHL sync check:', {
      enabled: process.env.GHL_SYNC_ENABLED === 'true',
      webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/ghl/webhook`,
      hasTrialData: !!trialOfferData,
      isOAuthUser,
      hasCompleteProfile,
      shouldDelayWebhook
    });
    
    if (process.env.GHL_SYNC_ENABLED === 'true' && !shouldDelayWebhook) {
      console.log('[handle-new-user] Sending user_created event to GHL webhook');
      
      try {
        const ghlResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/ghl/webhook`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'user_created',
            userId: record.id,
            data: {
              email: record.email,
              full_name: full_name || null,
              phone: phone || null,
              sms_opt_in: sms_opt_in || false,
              selected_plan: selectedPlan,
              // Include trial data in main data payload
              ...(trialOfferData && {
                trial_offer_url: trialOfferData.url,
                trial_offer_token: trialOfferData.token,
                trial_expires_at: trialOfferData.expires_at
              })
            },
            metadata: {
              source: 'signup_form',
              timestamp: new Date().toISOString(),
              has_trial_token: !!trialOfferData
            },
            generateTrialToken: false // We already generated it
          })
        });
        
        const ghlResult = await ghlResponse.json();
        console.log(`[handle-new-user] ✅ GHL user_created event sent for user ${record.id}`, {
          status: ghlResponse.status,
          result: ghlResult,
          hadTrialData: !!trialOfferData
        });
      } catch (error) {
        console.error('Failed to send user_created event to GHL:', error);
      }
    } else if (shouldDelayWebhook) {
      console.log('[handle-new-user] Delaying webhook for OAuth user until profile completion');
    }
    
    return NextResponse.json({ 
      message: 'New user processing completed',
      userId: record.id,
      webhookDelayed: shouldDelayWebhook,
      ...(trialOfferData && {
        trial_offer: {
          token: trialOfferData.token,
          url: trialOfferData.url,
          expires_at: trialOfferData.expires_at
        }
      })
    });
    
  } catch (error) {
    console.error('New user webhook error:', error);
    return NextResponse.json(
      { error: 'Failed to process new user' },
      { status: 500 }
    );
  }
}