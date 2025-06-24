import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with service role
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    
    if (!email) {
      return NextResponse.json({
        success: false,
        error: 'Email is required'
      }, { status: 400 });
    }

    // 1. Check if user exists in auth.users
    const { data: authUser } = await supabase.auth.admin.getUserByEmail(email);

    if (!authUser?.user) {
      return NextResponse.json({
        success: false,
        error: 'No auth user found with this email. Please sign up first.'
      }, { status: 404 });
    }

    // 2. Check if user exists in public.users
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.user.id)
      .single();

    if (existingUser) {
      return NextResponse.json({
        success: true,
        message: 'User already exists in public.users',
        user: existingUser
      });
    }

    // 3. Create user in public.users
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        id: authUser.user.id,
        email: authUser.user.email!,
        daily_goal: 10,
        timezone: 'America/New_York'
      })
      .select()
      .single();

    if (createError) {
      throw createError;
    }

    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      user: newUser
    });
  } catch (error: any) {
    console.error('Create user error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}