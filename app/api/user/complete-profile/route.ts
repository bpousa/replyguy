import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Service role client for admin operations
const serviceSupabase = createClient(
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
  console.log('[complete-profile] Processing profile completion');
  
  try {
    // Authenticate user
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('[complete-profile] Authentication failed:', authError);
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { fullName, phone, smsOptIn } = await req.json();
    
    console.log('[complete-profile] Request details:', {
      userId: user.id,
      hasFullName: !!fullName,
      hasPhone: !!phone,
      smsOptIn: !!smsOptIn
    });

    // Validate inputs
    if (!fullName?.trim()) {
      return NextResponse.json(
        { error: 'Full name is required' },
        { status: 400 }
      );
    }

    // Convert phone to E164 format if provided
    let e164Phone = null;
    if (phone?.trim()) {
      const digits = phone.replace(/\D/g, '');
      if (digits.length === 10) {
        e164Phone = `+1${digits}`;
      } else if (digits.length === 11 && digits.startsWith('1')) {
        e164Phone = `+${digits}`;
      } else {
        return NextResponse.json(
          { error: 'Please enter a valid 10-digit phone number' },
          { status: 400 }
        );
      }
    }

    // Update user profile
    const updates: any = {
      full_name: fullName.trim(),
      profile_completed_at: new Date().toISOString()
    };

    if (e164Phone) {
      updates.phone = e164Phone;
      updates.phone_verified = false;
    }

    if (smsOptIn && e164Phone) {
      updates.sms_opt_in = true;
      updates.sms_opt_in_date = new Date().toISOString();
    }

    console.log('[complete-profile] Updating user profile:', updates);

    const { error: updateError } = await serviceSupabase
      .from('users')
      .update(updates)
      .eq('id', user.id);

    if (updateError) {
      console.error('[complete-profile] Profile update failed:', updateError);
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    console.log(`[complete-profile] ✅ Profile updated for user ${user.id}`);

    // Check if this user was an OAuth user who had their webhook delayed
    const isOAuthUser = user.app_metadata?.provider && user.app_metadata.provider !== 'email';
    
    // Send data to GHL if sync is enabled
    if (process.env.GHL_SYNC_ENABLED === 'true') {
      console.log('[complete-profile] Sending profile data to GHL');
      
      try {
        // For OAuth users, this is their first webhook (user_created with complete profile)
        // For email users, this is a profile update (user_profile_completed)
        const webhookEvent = isOAuthUser ? 'user_created' : 'user_profile_completed';
        
        console.log(`[complete-profile] Sending ${webhookEvent} event for ${isOAuthUser ? 'OAuth' : 'email'} user`);
        
        const ghlResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/ghl/webhook`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: webhookEvent,
            userId: user.id,
            data: {
              email: user.email,
              full_name: fullName.trim(),
              phone: e164Phone,
              sms_opt_in: smsOptIn && e164Phone ? true : false,
              selected_plan: 'free' // OAuth users default to free plan
            },
            metadata: {
              source: 'profile_completion_modal',
              timestamp: new Date().toISOString(),
              completed_fields: {
                full_name: true,
                phone: !!e164Phone,
                sms_opt_in: smsOptIn && e164Phone ? true : false
              },
              oauth_delayed_webhook: isOAuthUser
            },
            generateTrialToken: isOAuthUser // Generate trial token for OAuth users at this point
          })
        });
        
        if (ghlResponse.ok) {
          const ghlResult = await ghlResponse.json();
          console.log(`[complete-profile] ✅ GHL ${webhookEvent} event sent for user ${user.id}`, ghlResult);
        } else {
          console.error('[complete-profile] GHL webhook failed:', ghlResponse.status);
        }
      } catch (error) {
        console.error('[complete-profile] Failed to send GHL webhook:', error);
      }
    }

    return NextResponse.json({ 
      message: 'Profile completed successfully',
      profileData: {
        full_name: fullName.trim(),
        phone: e164Phone,
        sms_opt_in: smsOptIn && e164Phone ? true : false,
        profile_completed_at: updates.profile_completed_at
      }
    });
    
  } catch (error) {
    console.error('[complete-profile] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to complete profile' },
      { status: 500 }
    );
  }
}