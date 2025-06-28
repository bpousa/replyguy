import { NextRequest, NextResponse } from 'next/server';
import { imgflipService } from '@/app/lib/services/imgflip.service';

// Test endpoint to diagnose meme generation issues
// This bypasses auth and directly tests the Imgflip service
export async function GET(req: NextRequest) {
  const startTime = Date.now();
  
  // Check environment
  const diagnostics = {
    environment: process.env.NODE_ENV,
    imgflipUsername: process.env.IMGFLIP_USERNAME ? 'SET' : 'NOT SET',
    imgflipPassword: process.env.IMGFLIP_PASSWORD ? 'SET' : 'NOT SET',
    imgflipUsernameLength: process.env.IMGFLIP_USERNAME?.length || 0,
    enableAutomeme: process.env.ENABLE_IMGFLIP_AUTOMEME,
    isConfigured: imgflipService.isConfigured(),
    timestamp: new Date().toISOString(),
  };
  
  console.log('[test-meme] Starting diagnostics:', diagnostics);
  
  // Test direct Imgflip API call
  const testResults = {
    diagnostics,
    tests: [] as any[],
  };
  
  // Test 1: Check service configuration
  testResults.tests.push({
    test: 'Service Configuration',
    result: imgflipService.isConfigured() ? 'PASS' : 'FAIL',
    details: {
      hasUsername: !!process.env.IMGFLIP_USERNAME,
      hasPassword: !!process.env.IMGFLIP_PASSWORD,
    }
  });
  
  // Test 2: Try to generate a simple meme
  if (imgflipService.isConfigured()) {
    try {
      console.log('[test-meme] Attempting to generate meme with text: "this is fine"');
      const memeResult = await imgflipService.generateAutomeme('this is fine');
      
      testResults.tests.push({
        test: 'Generate Meme',
        result: 'PASS',
        meme: {
          url: memeResult.url,
          pageUrl: memeResult.pageUrl,
        }
      });
    } catch (error) {
      console.error('[test-meme] Meme generation failed:', error);
      testResults.tests.push({
        test: 'Generate Meme',
        result: 'FAIL',
        error: error instanceof Error ? error.message : 'Unknown error',
        errorType: error?.constructor?.name,
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }
  
  // Test 3: Direct Imgflip API call (bypass our service)
  try {
    console.log('[test-meme] Testing direct Imgflip API call');
    const directResponse = await fetch('https://api.imgflip.com/automeme', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        username: process.env.IMGFLIP_USERNAME || '',
        password: process.env.IMGFLIP_PASSWORD || '',
        text: 'bugs everywhere',
        no_watermark: '1',
      }),
    });
    
    const responseText = await directResponse.text();
    console.log('[test-meme] Direct API response:', responseText);
    
    let directData;
    try {
      directData = JSON.parse(responseText);
    } catch (e) {
      directData = { parseError: true, rawResponse: responseText };
    }
    
    testResults.tests.push({
      test: 'Direct Imgflip API',
      result: directResponse.ok && directData?.success ? 'PASS' : 'FAIL',
      status: directResponse.status,
      statusText: directResponse.statusText,
      response: directData,
    });
  } catch (error) {
    console.error('[test-meme] Direct API call failed:', error);
    testResults.tests.push({
      test: 'Direct Imgflip API',
      result: 'FAIL',
      error: error instanceof Error ? error.message : 'Unknown error',
      errorType: error?.constructor?.name,
    });
  }
  
  const processingTime = Date.now() - startTime;
  
  return NextResponse.json({
    ...testResults,
    processingTime: `${processingTime}ms`,
    summary: {
      passed: testResults.tests.filter(t => t.result === 'PASS').length,
      failed: testResults.tests.filter(t => t.result === 'FAIL').length,
      total: testResults.tests.length,
    }
  });
}