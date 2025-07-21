import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { record } = await req.json();
    
    if (!record?.id) {
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
      const { error: updateError } = await supabase
        .from('users')
        .update(updates)
        .eq('id', record.id);
        
      if (updateError) {
        console.error('Error updating user fields:', updateError);
        // Don't fail the request - user is already created
      } else {
        console.log(`✅ Updated user fields for ${record.id}:`, Object.keys(updates));
      }
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
    
    // Send GHL notification for new user
    if (process.env.GHL_SYNC_ENABLED === 'true') {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/ghl/webhook`, {
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
              selected_plan: selected_plan || 'free'
            },
            metadata: {
              source: 'signup_form',
              timestamp: new Date().toISOString()
            }
          })
        });
        
        console.log(`✅ GHL user_created event sent for user ${record.id}`);
      } catch (error) {
        console.error('Failed to send user_created event to GHL:', error);
      }
    }
    
    return NextResponse.json({ 
      message: 'New user processing completed',
      userId: record.id 
    });
    
  } catch (error) {
    console.error('New user webhook error:', error);
    return NextResponse.json(
      { error: 'Failed to process new user' },
      { status: 500 }
    );
  }
}