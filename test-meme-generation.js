#!/usr/bin/env node

/**
 * Test script to debug meme generation issues
 * Run with: node test-meme-generation.js
 */

const fetch = require('node-fetch');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const IMGFLIP_USERNAME = process.env.IMGFLIP_USERNAME;
const IMGFLIP_PASSWORD = process.env.IMGFLIP_PASSWORD;

console.log('🎭 MEME GENERATION TEST SCRIPT\n');
console.log('Environment Check:');
console.log('- BASE_URL:', BASE_URL);
console.log('- IMGFLIP_USERNAME:', IMGFLIP_USERNAME ? '✅ Set' : '❌ Not set');
console.log('- IMGFLIP_PASSWORD:', IMGFLIP_PASSWORD ? '✅ Set' : '❌ Not set');
console.log('- NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('\n');

async function testDirectImgflipAPI() {
  console.log('1️⃣ Testing Direct Imgflip API...\n');
  
  if (!IMGFLIP_USERNAME || !IMGFLIP_PASSWORD) {
    console.error('❌ Cannot test direct API - credentials not set');
    return false;
  }
  
  try {
    const response = await fetch('https://api.imgflip.com/automeme', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        username: IMGFLIP_USERNAME,
        password: IMGFLIP_PASSWORD,
        text: 'this is fine',
        no_watermark: '1',
      }),
    });
    
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log('✅ Direct Imgflip API works!');
      console.log('🖼️ Meme URL:', data.data.url);
      return true;
    } else {
      console.error('❌ Imgflip API error:', data.error_message);
      return false;
    }
  } catch (error) {
    console.error('❌ Network error:', error.message);
    return false;
  }
}

async function testMemeEndpoint(text, userId = 'test-user') {
  console.log(`\n2️⃣ Testing /api/meme endpoint with text: "${text}"\n`);
  
  try {
    const response = await fetch(`${BASE_URL}/api/meme`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text,
        userId: userId
      }),
    });
    
    console.log('Response Status:', response.status);
    console.log('Response Headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { rawResponse: responseText };
    }
    
    console.log('Response Body:', JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log('✅ Meme generated successfully!');
      console.log('🖼️ Meme URL:', data.url);
      console.log('🔗 Page URL:', data.pageUrl);
      return true;
    } else {
      console.error('❌ Meme generation failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Network error:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}

async function testProcessEndpoint() {
  console.log('\n3️⃣ Testing full /api/process endpoint with meme...\n');
  
  const testData = {
    originalTweet: "Just deployed on Friday afternoon. What could go wrong?",
    responseIdea: "That's a bold move! Friday deployments are living on the edge",
    responseType: "neutral",
    tone: "humorous",
    needsResearch: false,
    includeMeme: true,
    userId: "test-user"
  };
  
  console.log('Request:', JSON.stringify(testData, null, 2));
  
  try {
    const response = await fetch(`${BASE_URL}/api/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });
    
    console.log('Response Status:', response.status);
    
    const data = await response.json();
    console.log('Response Body:', JSON.stringify(data, null, 2));
    
    if (response.ok && data.data) {
      console.log('\n✅ Process completed successfully!');
      console.log('📝 Reply:', data.data.reply);
      console.log('🎯 Reply Type:', data.data.replyType);
      
      if (data.data.memeUrl) {
        console.log('🖼️ Meme URL:', data.data.memeUrl);
        console.log('🔗 Page URL:', data.data.memePageUrl);
      } else {
        console.log('❌ No meme URL in response');
        if (data.data.debugInfo) {
          console.log('Debug Info:', data.data.debugInfo);
        }
      }
      return true;
    } else {
      console.error('❌ Process failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Network error:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('Starting meme generation tests...\n');
  
  // Test 1: Direct Imgflip API
  const directApiWorks = await testDirectImgflipAPI();
  
  // Test 2: Meme endpoint with various texts
  const testTexts = [
    'this is fine',
    'one does not simply test memes',
    'y u no work',
    'shut up and take my money',
    'bugs everywhere'
  ];
  
  let memeEndpointWorks = false;
  for (const text of testTexts) {
    if (await testMemeEndpoint(text)) {
      memeEndpointWorks = true;
      break;
    }
  }
  
  // Test 3: Full process endpoint
  const processEndpointWorks = await testProcessEndpoint();
  
  // Summary
  console.log('\n📊 TEST SUMMARY:\n');
  console.log('Direct Imgflip API:', directApiWorks ? '✅ Working' : '❌ Failed');
  console.log('Meme Endpoint:', memeEndpointWorks ? '✅ Working' : '❌ Failed');
  console.log('Process Endpoint (with meme):', processEndpointWorks ? '✅ Working' : '❌ Failed');
  
  if (!directApiWorks && IMGFLIP_USERNAME && IMGFLIP_PASSWORD) {
    console.log('\n⚠️ Direct API failed - check your Imgflip credentials');
  }
  
  if (directApiWorks && !memeEndpointWorks) {
    console.log('\n⚠️ Direct API works but meme endpoint fails - check server configuration');
  }
  
  if (memeEndpointWorks && !processEndpointWorks) {
    console.log('\n⚠️ Meme endpoint works but process fails - check integration');
  }
}

// Run the tests
runTests().catch(console.error);