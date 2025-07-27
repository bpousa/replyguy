import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { email = 'test-direct-ghl@example.com' } = await req.json();
    
    console.log('[ghl-direct] Testing direct GHL webhook call');
    
    // Check environment variables
    const ghlWebhookUrl = process.env.GHL_WEBHOOK_URL;
    const ghlApiKey = process.env.GHL_API_KEY;
    
    console.log('[ghl-direct] Environment check:', {
      hasWebhookUrl: !!ghlWebhookUrl,
      webhookUrl: ghlWebhookUrl?.substring(0, 80) + '...',
      hasApiKey: !!ghlApiKey
    });
    
    if (!ghlWebhookUrl) {
      return NextResponse.json(
        { error: 'GHL_WEBHOOK_URL not configured' },
        { status: 500 }
      );
    }
    
    // Prepare test data
    const testData = {
      event: 'user_created',
      timestamp: new Date().toISOString(),
      user: {
        id: 'test-direct-' + Date.now(),
        email: email,
        full_name: 'Test Direct GHL User',
        phone: '+1234567890',
        sms_opt_in: true,
        selected_plan: 'free',
        referral_code: 'TEST123'
      },
      metadata: {
        source: 'direct_test',
        timestamp: new Date().toISOString(),
        test: true
      }
    };
    
    console.log('[ghl-direct] Sending to GHL:', {
      url: ghlWebhookUrl,
      dataPreview: JSON.stringify(testData).substring(0, 200) + '...'
    });
    
    // Send to GHL
    const response = await fetch(ghlWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(ghlApiKey && { 'Authorization': `Bearer ${ghlApiKey}` })
      },
      body: JSON.stringify(testData)
    });
    
    const responseText = await response.text();
    
    console.log('[ghl-direct] GHL Response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body: responseText.substring(0, 500)
    });
    
    return NextResponse.json({
      success: response.ok,
      ghl_response: {
        status: response.status,
        statusText: response.statusText,
        body: responseText,
        headers: Object.fromEntries(response.headers.entries())
      },
      test_data: testData,
      config: {
        webhook_url: ghlWebhookUrl,
        has_api_key: !!ghlApiKey,
        url_preview: ghlWebhookUrl?.substring(0, 80) + '...'
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[ghl-direct] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to test GHL webhook',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// GET endpoint to show configuration
export async function GET(req: NextRequest) {
  const ghlWebhookUrl = process.env.GHL_WEBHOOK_URL;
  const ghlApiKey = process.env.GHL_API_KEY;
  
  return NextResponse.json({
    config: {
      has_webhook_url: !!ghlWebhookUrl,
      webhook_url_preview: ghlWebhookUrl?.substring(0, 80) + '...',
      has_api_key: !!ghlApiKey,
      full_webhook_url: ghlWebhookUrl, // Show full URL for debugging
    },
    expected_url_format: 'https://services.leadconnectorhq.com/hooks/...',
    your_url: ghlWebhookUrl,
    timestamp: new Date().toISOString()
  });
}