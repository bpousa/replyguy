const puppeteer = require('puppeteer');
const https = require('https');

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Test webhook directly with curl-like request
async function testWebhookDirect() {
  console.log('\n📍 Direct Webhook Test');
  console.log('=' .repeat(50));
  
  const webhookUrl = 'https://replyguy.appendment.com/api/webhooks/stripe';
  
  // Test 1: Simple GET request
  try {
    const response = await fetch(webhookUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Stripe Webhook Test'
      }
    });
    
    console.log('GET Request:');
    console.log(`  Status: ${response.status}`);
    console.log(`  Status Text: ${response.statusText}`);
    
    const text = await response.text();
    console.log(`  Response: ${text.substring(0, 100)}...`);
  } catch (error) {
    console.log('GET Request Error:', error.message);
  }
  
  // Test 2: POST request (as Stripe would send)
  console.log('\nPOST Request (Stripe-style):');
  
  const testPayload = JSON.stringify({
    id: 'evt_test_webhook',
    object: 'event',
    api_version: '2023-10-16',
    created: Math.floor(Date.now() / 1000),
    data: {
      object: {
        id: 'cs_test_123',
        object: 'checkout.session',
        status: 'complete'
      }
    },
    type: 'checkout.session.completed'
  });
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Stripe-Signature': 'test_signature',
        'User-Agent': 'Stripe/1.0 (+https://stripe.com)'
      },
      body: testPayload
    });
    
    console.log(`  Status: ${response.status}`);
    console.log(`  Status Text: ${response.statusText}`);
    
    const responseHeaders = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });
    console.log('  Response Headers:', JSON.stringify(responseHeaders, null, 2));
    
    const text = await response.text();
    console.log(`  Response Body: ${text.substring(0, 200)}...`);
  } catch (error) {
    console.log('POST Request Error:', error.message);
  }
}

async function testStripeWebhook() {
  console.log('🔍 Stripe Webhook Endpoint Investigation\n');
  console.log('Webhook URL: https://replyguy.appendment.com/api/webhooks/stripe');
  console.log('Issue: 246 failed webhook attempts since June 23, 2025');
  console.log('=' .repeat(70) + '\n');
  
  let browser;
  
  try {
    // First do direct tests
    await testWebhookDirect();
    
    // Now browser-based tests
    browser = await puppeteer.launch({ 
      headless: false,
      devtools: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Enable console logging
    page.on('console', msg => {
      if (msg.text().includes('webhook') || msg.text().includes('stripe')) {
        console.log('CONSOLE:', msg.text());
      }
    });
    
    // Track network responses
    const networkResponses = [];
    page.on('response', response => {
      if (response.url().includes('webhook')) {
        networkResponses.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText()
        });
      }
    });
    
    console.log('\n📍 Browser-based Webhook Test');
    console.log('=' .repeat(50));
    
    // Navigate to webhook URL directly
    console.log('Navigating to webhook endpoint...');
    const webhookResponse = await page.goto('https://replyguy.appendment.com/api/webhooks/stripe', {
      waitUntil: 'networkidle2',
      timeout: 30000
    }).catch(err => ({ error: err.message }));
    
    if (webhookResponse.error) {
      console.log('Navigation error:', webhookResponse.error);
    } else {
      console.log('Response status:', webhookResponse.status());
      console.log('Response status text:', webhookResponse.statusText());
    }
    
    await page.screenshot({ path: 'webhook-test-1-direct.png' });
    
    // Get page content
    const pageContent = await page.evaluate(() => ({
      title: document.title,
      bodyText: document.body.textContent,
      isJSON: document.body.textContent.trim().startsWith('{') || document.body.textContent.trim().startsWith('[')
    }));
    
    console.log('Page content:', JSON.stringify(pageContent, null, 2).substring(0, 300) + '...');
    
    // Test from within page context
    console.log('\n📍 API Test from Page Context');
    console.log('=' .repeat(50));
    
    await page.goto('https://replyguy.appendment.com', {
      waitUntil: 'networkidle2'
    });
    
    const apiTest = await page.evaluate(async () => {
      const testEvent = {
        id: 'evt_test_' + Date.now(),
        object: 'event',
        type: 'checkout.session.completed',
        created: Math.floor(Date.now() / 1000),
        data: {
          object: {
            id: 'cs_test_123',
            status: 'complete'
          }
        }
      };
      
      try {
        const response = await fetch('/api/webhooks/stripe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Stripe-Signature': 'test_sig'
          },
          body: JSON.stringify(testEvent)
        });
        
        const text = await response.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }
        
        return {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: data
        };
      } catch (error) {
        return { error: error.message };
      }
    });
    
    console.log('API Test Result:', JSON.stringify(apiTest, null, 2));
    
    // Check for common issues
    console.log('\n📍 Common Webhook Issues Check');
    console.log('=' .repeat(50));
    
    const issues = [];
    
    // Check if endpoint exists
    if (apiTest.status === 404) {
      issues.push('❌ Webhook endpoint not found (404)');
    }
    
    // Check if it requires authentication
    if (apiTest.status === 401 || apiTest.status === 403) {
      issues.push('❌ Webhook endpoint requires authentication (should be public)');
    }
    
    // Check if it accepts POST
    if (apiTest.status === 405) {
      issues.push('❌ Webhook endpoint does not accept POST method');
    }
    
    // Check response codes
    if (apiTest.status && (apiTest.status < 200 || apiTest.status > 299)) {
      issues.push(`❌ Webhook returns non-success status: ${apiTest.status}`);
    }
    
    // Check for middleware blocking
    if (apiTest.body && typeof apiTest.body === 'string' && apiTest.body.includes('unauthorized')) {
      issues.push('❌ Middleware blocking webhook requests');
    }
    
    if (issues.length === 0 && apiTest.status >= 200 && apiTest.status <= 299) {
      issues.push('✅ Webhook endpoint appears accessible');
    }
    
    console.log('\nIssues found:');
    issues.forEach(issue => console.log('  ' + issue));
    
    // Look for webhook route file
    console.log('\n📍 Checking Webhook Implementation');
    console.log('=' .repeat(50));
    
    console.log('Expected webhook file location:');
    console.log('  /app/api/webhooks/stripe/route.ts (or .js)');
    
    // Summary and recommendations
    console.log('\n' + '='.repeat(70));
    console.log('📊 WEBHOOK DIAGNOSIS SUMMARY');
    console.log('='.repeat(70));
    
    console.log('\n🔍 Findings:');
    console.log(`  - Webhook URL: https://replyguy.appendment.com/api/webhooks/stripe`);
    console.log(`  - Direct GET Status: ${webhookResponse?.status() || 'Unknown'}`);
    console.log(`  - POST Test Status: ${apiTest.status || 'Failed'}`);
    console.log(`  - Failed attempts: 246 since June 23`);
    
    console.log('\n🚨 Likely Causes:');
    if (apiTest.status === 404) {
      console.log('  1. Webhook route file missing or incorrectly placed');
      console.log('  2. Route not properly exported');
      console.log('  3. Deployment didn\'t include webhook file');
    } else if (apiTest.status === 401 || apiTest.status === 403) {
      console.log('  1. Middleware blocking webhook requests');
      console.log('  2. Webhook requires authentication (should be public)');
      console.log('  3. CORS or security headers blocking Stripe');
    } else if (apiTest.status >= 500) {
      console.log('  1. Server error in webhook handler');
      console.log('  2. Missing environment variables');
      console.log('  3. Database connection issues');
    }
    
    console.log('\n💡 Recommended Fixes:');
    console.log('  1. Ensure webhook route exists at /app/api/webhooks/stripe/route.ts');
    console.log('  2. Exclude /api/webhooks/* from auth middleware');
    console.log('  3. Verify Stripe webhook secret is set in environment');
    console.log('  4. Return 200 status for successfully processed events');
    console.log('  5. Add proper error handling and logging');
    
    console.log('\n' + '='.repeat(70));
    
    console.log('\n⏸️  Browser stays open. Press Ctrl+C to close.\n');
    await new Promise(() => {});
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

// Run test
testStripeWebhook().catch(console.error);