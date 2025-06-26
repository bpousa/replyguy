#!/usr/bin/env tsx

import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function testPerplexityIntegration() {
  console.log('🧪 === END-TO-END PERPLEXITY INTEGRATION TEST ===\n');

  // Test data that should trigger research
  const testData = {
    originalTweet: 'AI development has exploded in 2024. The growth is unprecedented.',
    responseIdea: 'I agree, the statistics are incredible',
    responseType: 'agree',
    tone: 'supportive',
    needsResearch: true,
    replyLength: 'short',
    perplexityGuidance: 'AI development statistics 2024',
    enableStyleMatching: true,
    includeMeme: false,
    useCustomStyle: false,
    userId: 'test-business@replyguy.com' // Business tier user with Perplexity access
  };

  try {
    console.log('1. Testing Research Endpoint Directly...');
    
    // Test research endpoint
    const researchResponse = await fetch(`${BASE_URL}/api/research`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        originalTweet: testData.originalTweet,
        responseIdea: testData.responseIdea,
        responseType: testData.responseType,
        guidance: testData.perplexityGuidance,
      }),
    });

    if (researchResponse.ok) {
      const researchData = await researchResponse.json();
      console.log('✅ Research API Success');
      console.log('📊 Query Generated:', researchData.data.searchQuery);
      console.log('📈 Results Length:', researchData.data.searchResults.length, 'characters');
      console.log('💰 Cost:', researchData.data.cost);
      console.log('🔍 Has Statistics:', /\d+%|\d+\s*(percent|million|thousand|billion)|\d{4}/.test(researchData.data.searchResults));
      console.log('📝 Preview:', researchData.data.searchResults.substring(0, 200) + '...\n');
    } else {
      console.log('❌ Research API Failed:', researchResponse.status);
      const errorData = await researchResponse.json();
      console.log('Error:', errorData);
      console.log('');
    }

    console.log('2. Testing Full Pipeline...');
    
    // Test full pipeline
    const pipelineResponse = await fetch(`${BASE_URL}/api/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData),
    });

    if (pipelineResponse.ok) {
      const pipelineData = await pipelineResponse.json();
      const result = pipelineData.data;
      
      console.log('✅ Full Pipeline Success');
      console.log('🎯 Final Reply:', result.reply);
      console.log('📊 Reply Type:', result.replyType);
      console.log('💰 Total Cost:', result.cost);
      console.log('⏱️ Processing Time:', result.processingTime + 'ms');
      console.log('🔍 Had Perplexity Data:', !!result.perplexityData);
      
      // Check if research data was included
      const hasStatistics = /\d+%|\d+\s*(percent|million|thousand|billion)|\d{4}/.test(result.reply);
      const hasSourceReferences = /according to|study|report|data shows/i.test(result.reply);
      
      console.log('📈 Contains Statistics:', hasStatistics);
      console.log('📚 Contains Source References:', hasSourceReferences);
      
      if (result.perplexityData && !hasStatistics && !hasSourceReferences) {
        console.log('⚠️  WARNING: Perplexity data was provided but not included in reply');
        console.log('📋 Perplexity Data Preview:', result.perplexityData.substring(0, 200) + '...');
      }
      
      console.log('');
    } else {
      console.log('❌ Full Pipeline Failed:', pipelineResponse.status);
      const errorData = await pipelineResponse.json();
      console.log('Error:', errorData);
      console.log('');
    }

    console.log('3. Testing Cache (Second Request)...');
    
    // Test cache with second identical request
    const cachedResponse = await fetch(`${BASE_URL}/api/research`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        originalTweet: testData.originalTweet,
        responseIdea: testData.responseIdea,
        responseType: testData.responseType,
        guidance: testData.perplexityGuidance,
      }),
    });

    if (cachedResponse.ok) {
      const cachedData = await cachedResponse.json();
      if (cachedData.data.cached) {
        console.log('✅ Cache Working - Request served from cache');
        console.log('💰 Cost Saved:', cachedData.data.originalCost);
      } else {
        console.log('❌ Cache Miss - Expected cached response');
      }
    }
    
    console.log('');

    console.log('4. Testing Debug Endpoint...');
    
    // Test debug endpoint
    const debugResponse = await fetch(`${BASE_URL}/api/debug/perplexity`, {
      method: 'GET',
    });

    if (debugResponse.ok) {
      const debugData = await debugResponse.json();
      console.log('✅ Debug Endpoint Success');
      console.log('🔧 Status:', debugData.status);
      console.log('📝 Test Response Preview:', debugData.test_response?.content.substring(0, 100) + '...');
    } else {
      console.log('❌ Debug Endpoint Failed:', debugResponse.status);
      const debugError = await debugResponse.json();
      console.log('Error:', debugError);
    }

  } catch (error) {
    console.error('❌ Test Failed:', error.message);
  }

  console.log('\n🎉 === TEST COMPLETE ===');
  console.log('💡 Tips:');
  console.log('- Check server console logs for detailed pipeline information');
  console.log('- Ensure test-business@replyguy.com user is on Business tier');
  console.log('- Verify PERPLEXITY_API_KEY and NEXT_PUBLIC_ENABLE_PERPLEXITY are set');
}

// Run the test
testPerplexityIntegration().catch(console.error);