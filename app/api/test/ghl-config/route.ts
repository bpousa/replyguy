import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  console.log('[ghl-config] Checking GHL configuration');
  
  try {
    const config = {
      timestamp: new Date().toISOString(),
      ghl_sync_enabled: process.env.GHL_SYNC_ENABLED,
      ghl_sync_enabled_is_true: process.env.GHL_SYNC_ENABLED === 'true',
      ghl_api_key_set: !!process.env.GHL_API_KEY,
      ghl_webhook_url: process.env.GHL_WEBHOOK_URL ? 'SET' : 'NOT_SET',
      app_url: process.env.NEXT_PUBLIC_APP_URL,
      environment: process.env.NODE_ENV
    };
    
    console.log('[ghl-config] Configuration:', config);
    
    return NextResponse.json({
      message: 'GHL configuration check completed',
      config,
      diagnosis: process.env.GHL_SYNC_ENABLED === 'true' 
        ? '✅ GHL sync is enabled'
        : '❌ GHL sync is disabled - this explains why webhooks are not forwarded!'
    });
    
  } catch (error) {
    console.error('[ghl-config] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check GHL configuration',
        details: (error as Error).message
      },
      { status: 500 }
    );
  }
}