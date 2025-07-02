import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { runScheduledPhraseAnalysis } from '@/app/lib/services/phrase-analyzer.service';

// This endpoint should be protected and only called by a cron job or admin
export async function POST(req: NextRequest) {
  try {
    // Simple auth check - you should use a proper auth mechanism
    const headersList = headers();
    const authHeader = headersList.get('authorization');
    
    // Check for a secret token (set this in your environment variables)
    const expectedToken = process.env.PHRASE_ANALYSIS_SECRET;
    if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Run the analysis
    await runScheduledPhraseAnalysis();
    
    return NextResponse.json({ 
      success: true,
      message: 'Phrase analysis completed'
    });
  } catch (error) {
    console.error('Phrase analysis endpoint error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to check analysis status
export async function GET(req: NextRequest) {
  try {
    const { createServerClient } = await import('@/app/lib/auth');
    const { cookies } = await import('next/headers');
    const cookieStore = cookies();
    const supabase = createServerClient(cookieStore);
    
    // Get analysis stats
    const { data: stats, error } = await supabase
      .from('reported_ai_phrases')
      .select('validated, count')
      .neq('validated', null);
    
    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch stats' },
        { status: 500 }
      );
    }
    
    const validated = stats?.filter(s => s.validated === true).length || 0;
    const rejected = stats?.filter(s => s.validated === false).length || 0;
    const pending = stats?.filter(s => s.validated === null).length || 0;
    
    return NextResponse.json({
      stats: {
        validated,
        rejected,
        pending,
        total: validated + rejected + pending
      }
    });
  } catch (error) {
    console.error('Get analysis stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}