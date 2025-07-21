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
    const { userId } = await req.json();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      );
    }
    
    // Check if this is a new user (created within last 5 minutes)
    const { data: user } = await supabase
      .from('users')
      .select('created_at')
      .eq('id', userId)
      .single();
      
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    const createdAt = new Date(user.created_at);
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    if (createdAt < fiveMinutesAgo) {
      // Not a new user, skip GHL notification
      return NextResponse.json({ 
        message: 'Not a new user, skipping GHL notification' 
      });
    }
    
    // Send user_created event to GHL
    if (process.env.GHL_SYNC_ENABLED === 'true') {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/ghl/webhook`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'user_created',
            userId: userId,
            data: {},
            metadata: {
              source: 'signup_form',
              timestamp: createdAt.toISOString()
            }
          })
        });
        
        console.log(`✅ GHL user_created event sent for user ${userId}`);
      } catch (error) {
        console.error('Failed to send user_created event to GHL:', error);
        // Don't fail the request if GHL webhook fails
      }
    }
    
    return NextResponse.json({ 
      message: 'Post-signup processing completed',
      newUser: true 
    });
    
  } catch (error) {
    console.error('Post-signup error:', error);
    return NextResponse.json(
      { error: 'Post-signup processing failed' },
      { status: 500 }
    );
  }
}