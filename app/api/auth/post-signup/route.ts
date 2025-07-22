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
    const { userId } = await req.json();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      );
    }
    
    console.log('[post-signup] Checking user:', userId);
    
    // Check if this is a new user (created within last 10 minutes)
    const { data: user } = await supabase
      .from('users')
      .select('created_at, email')
      .eq('id', userId)
      .single();
      
    if (!user) {
      console.error('[post-signup] User not found:', userId);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    const createdAt = new Date(user.created_at);
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    
    if (createdAt < tenMinutesAgo) {
      // Not a new user, skip processing
      console.log('[post-signup] Not a new user, skipping:', userId);
      return NextResponse.json({ 
        message: 'Not a new user, skipping post-signup processing' 
      });
    }
    
    console.log('[post-signup] Processing new user:', {
      userId,
      email: user.email,
      createdAt: user.created_at
    });
    
    // The actual webhook to GHL is handled by the database trigger
    // This endpoint is just for client-side notification
    
    return NextResponse.json({ 
      message: 'Post-signup processing completed',
      newUser: true 
    });
    
  } catch (error) {
    console.error('[post-signup] Error:', error);
    return NextResponse.json(
      { error: 'Post-signup processing failed' },
      { status: 500 }
    );
  }
}