import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  // Test the GHL webhook configuration
  const ghlWebhookUrl = process.env.GHL_WEBHOOK_URL;
  const ghlApiKey = process.env.GHL_API_KEY;
  const ghlSyncEnabled = process.env.GHL_SYNC_ENABLED === 'true';
  
  const config = {
    webhookUrl: ghlWebhookUrl ? 'Configured' : 'Not configured',
    webhookUrlPreview: ghlWebhookUrl ? ghlWebhookUrl.substring(0, 50) + '...' : null,
    apiKey: ghlApiKey ? 'Configured' : 'Not configured',
    syncEnabled: ghlSyncEnabled,
    appUrl: process.env.NEXT_PUBLIC_APP_URL
  };
  
  return NextResponse.json({
    status: 'GHL Webhook Test Endpoint',
    configuration: config,
    instructions: 'Use POST to test sending a webhook to GHL'
  });
}

export async function POST(req: NextRequest) {
  try {
    const { testUserId = 'test-user-123' } = await req.json().catch(() => ({}));
    
    console.log('[test-webhook] Starting GHL webhook test');
    
    // Check configuration
    const ghlWebhookUrl = process.env.GHL_WEBHOOK_URL;
    const ghlApiKey = process.env.GHL_API_KEY;
    const ghlSyncEnabled = process.env.GHL_SYNC_ENABLED === 'true';
    
    if (!ghlSyncEnabled) {
      return NextResponse.json({
        error: 'GHL sync is disabled',
        hint: 'Set GHL_SYNC_ENABLED=true in environment variables'
      }, { status: 400 });
    }
    
    if (!ghlWebhookUrl) {
      return NextResponse.json({
        error: 'GHL webhook URL not configured',
        hint: 'Set GHL_WEBHOOK_URL in environment variables'
      }, { status: 400 });
    }
    
    // Test direct webhook call
    console.log('[test-webhook] Sending test event to GHL webhook:', ghlWebhookUrl);
    
    const testPayload = {
      event: 'test_webhook',
      timestamp: new Date().toISOString(),
      user: {
        id: testUserId,
        email: 'test@example.com',
        full_name: 'Test User',
        phone: '+1234567890',
        created_at: new Date().toISOString()
      },
      metadata: {
        source: 'test_endpoint',
        test: true
      }
    };
    
    const response = await fetch(ghlWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(ghlApiKey && { 'Authorization': `Bearer ${ghlApiKey}` })
      },
      body: JSON.stringify(testPayload)
    });
    
    const responseText = await response.text();
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }
    
    console.log('[test-webhook] GHL response:', {
      status: response.status,
      statusText: response.statusText,
      data: responseData
    });
    
    // Also test internal webhook endpoint
    console.log('[test-webhook] Testing internal webhook endpoint');
    
    const internalResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/ghl/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'user_created',
        userId: testUserId,
        data: {
          email: 'test@example.com',
          full_name: 'Test User'
        },
        metadata: {
          source: 'test_endpoint',
          test: true
        },
        generateTrialToken: false
      })
    });
    
    const internalData = await internalResponse.json();
    
    return NextResponse.json({
      success: true,
      directWebhook: {
        url: ghlWebhookUrl,
        status: response.status,
        statusText: response.statusText,
        response: responseData,
        success: response.ok
      },
      internalWebhook: {
        status: internalResponse.status,
        response: internalData,
        success: internalResponse.ok
      },
      testPayload,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[test-webhook] Error:', error);
    
    return NextResponse.json({
      error: 'Test failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}