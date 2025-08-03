import { NextRequest, NextResponse } from 'next/server';

// Direct test to GHL webhook URL
export async function POST(req: NextRequest) {
  const ghlWebhookUrl = process.env.GHL_WEBHOOK_URL;
  const ghlApiKey = process.env.GHL_API_KEY;
  
  if (\!ghlWebhookUrl) {
    return NextResponse.json({
      error: 'GHL_WEBHOOK_URL not configured'
    }, { status: 400 });
  }

  // Simple test payload
  const testPayload = {
    event: 'user_created',
    timestamp: new Date().toISOString(),
    user: {
      external_id: 'direct-test-user-123',
      email: 'direct-test@example.com',
      name: 'Direct Test User',
      phone: '+17275551234',
      sms_opt_in: true,
      selected_plan: 'free',
      trial_offer_token: 'DIRECT_TEST_TOKEN_123',
      trial_offer_url: 'https://replyguy.appendment.com/auth/trial-offer?token=DIRECT_TEST_TOKEN_123',
      trial_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    }
  };

  try {
    const response = await fetch(ghlWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'ReplyGuy-Webhook/1.0',
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

    return NextResponse.json({
      message: 'Direct GHL webhook test completed',
      ghlWebhookUrl: ghlWebhookUrl.substring(0, 50) + '...',
      response: {
        status: response.status,
        statusText: response.statusText,
        data: responseData
      },
      success: response.ok,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({
      message: 'Failed to send to GHL',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
EOF < /dev/null
