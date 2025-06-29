// Test script to verify AI suggestions tracking
const fetch = require('node-fetch');

async function testSuggestionsTracking() {
  console.log('🧪 Testing AI Suggestions Tracking...\n');
  
  // Test configuration
  const testCases = [
    {
      tweet: "Just discovered that my code works, but I have no idea why. Should I be concerned?",
      responseType: "humorous",
      tone: "playful"
    },
    {
      tweet: "Why do programmers prefer dark mode?",
      responseType: "agree",
      tone: "witty"
    },
    {
      tweet: "JavaScript is the best programming language. Change my mind.",
      responseType: "disagree",
      tone: "respectful"
    }
  ];
  
  console.log('📋 Test Plan:');
  console.log('1. Call /api/suggest endpoint multiple times');
  console.log('2. Verify tracking is logged in console');
  console.log('3. Check if usage limits are enforced\n');
  
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`\n🔄 Test ${i + 1}/${testCases.length}:`);
    console.log(`Tweet: "${testCase.tweet}"`);
    
    try {
      const response = await fetch('http://localhost:3002/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testCase)
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Success: "${data.suggestion}"`);
        console.log(`   Cost: $${data.cost.toFixed(6)}`);
        console.log(`   Tokens: ${data.tokensUsed}`);
      } else {
        const error = await response.json();
        if (response.status === 429) {
          console.log(`⚠️ Rate limit reached:`);
          console.log(`   Used: ${error.used}/${error.limit}`);
          console.log(`   Message: ${error.error}`);
        } else {
          console.log(`❌ Error: ${error.error}`);
        }
      }
    } catch (error) {
      console.log(`❌ Network error: ${error.message}`);
    }
    
    // Small delay between requests
    if (i < testCases.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log('\n\n📊 Testing Complete!');
  console.log('\nTo verify tracking:');
  console.log('1. Check server logs for "[suggest] Successfully tracked suggestion usage"');
  console.log('2. Check database: SELECT * FROM billing_period_usage WHERE user_id = \'<user-id>\';');
  console.log('3. Visit /settings to see updated usage counts');
  console.log('\nNote: You need to be authenticated for tracking to work.');
}

// Run the test
testSuggestionsTracking().catch(console.error);