import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/app/lib/auth';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  const cookieStore = cookies();
  const supabase = createServerClient(cookieStore);
  
  try {
    // Check if user is authenticated (optional, remove if you want public access)
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if style_refinement_sessions table exists by trying to query it
    const tableChecks = {
      user_styles: false,
      style_refinement_sessions: false,
      reply_corrections: false,
    };

    // Check user_styles table
    const { error: userStylesError } = await supabase
      .from('user_styles')
      .select('id')
      .limit(1);
    
    if (!userStylesError) {
      tableChecks.user_styles = true;
    }

    // Check style_refinement_sessions table
    const { error: refinementError } = await supabase
      .from('style_refinement_sessions')
      .select('id')
      .limit(1);
    
    if (!refinementError) {
      tableChecks.style_refinement_sessions = true;
    } else {
      console.error('style_refinement_sessions error:', refinementError);
    }

    // Check reply_corrections table
    const { error: correctionsError } = await supabase
      .from('reply_corrections')
      .select('id')
      .limit(1);
    
    if (!correctionsError) {
      tableChecks.reply_corrections = true;
    }

    // Check if user_styles has the new columns
    let userStylesColumns = null;
    if (tableChecks.user_styles) {
      const { data: styleData } = await supabase
        .from('user_styles')
        .select('*')
        .limit(1);
      
      if (styleData && styleData.length > 0) {
        userStylesColumns = Object.keys(styleData[0]);
      }
    }

    return NextResponse.json({
      tables: tableChecks,
      userStylesColumns,
      refinementError: refinementError ? {
        code: refinementError.code,
        message: refinementError.message,
        details: refinementError.details,
        hint: refinementError.hint
      } : null,
      message: 'Table existence check complete'
    });

  } catch (error) {
    console.error('Error checking tables:', error);
    return NextResponse.json({ 
      error: 'Failed to check tables',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}