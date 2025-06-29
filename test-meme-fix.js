// Test script to verify meme generation improvements
const fetch = require('node-fetch');

// Test configuration
const TEST_CASES = [
  {
    name: 'Short reply with auto-generated meme',
    originalTweet: 'Just deployed a major update to production on Friday afternoon. What could go wrong?',
    responseIdea: 'Sarcastically agree that deploying on Friday is a great idea',
    responseType: 'agree',
    tone: 'sarcastic',
    replyLength: 'short',
    includeMeme: true,
    memeText: '',
    memeTextMode: undefined
  },
  {
    name: 'Short reply with custom meme text',
    originalTweet: 'Why is debugging so hard?',
    responseIdea: 'Sympathize about debugging challenges',
    responseType: 'agree',
    tone: 'humorous',
    replyLength: 'short',
    includeMeme: true,
    memeText: 'bugs everywhere',
    memeTextMode: 'exact'
  },
  {
    name: 'Long reply with auto-generated meme',
    originalTweet: 'Just spent 6 hours debugging only to find it was a missing semicolon',
    responseIdea: 'Share a similar experience with a tiny bug causing huge problems',
    responseType: 'agree',
    tone: 'humorous',
    replyLength: 'long',
    includeMeme: true,
    memeText: '',
    memeTextMode: undefined
  },
  {
    name: 'Short reply with enhanced meme text',
    originalTweet: 'My code works but I have no idea why',
    responseIdea: 'Make a joke about not questioning working code',
    responseType: 'neutral',
    tone: 'humorous',
    replyLength: 'short',
    includeMeme: true,
    memeText: 'it works somehow',
    memeTextMode: 'enhance'
  }
];

async function testMemeGeneration() {
  console.log('🧪 Testing meme generation with various configurations...\n');
  
  const results = [];
  
  for (const testCase of TEST_CASES) {
    console.log(`\n📋 Test: ${testCase.name}`);
    console.log('━'.repeat(50));
    
    try {
      // First test the meme text generation
      if (testCase.includeMeme) {
        console.log('🎯 Testing meme text generation...');
        const memeTextResponse = await fetch('http://localhost:3000/api/meme-text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userText: testCase.memeText,
            reply: 'Test reply for meme generation',
            tone: testCase.tone,
            enhance: testCase.memeTextMode === 'enhance',
            userId: 'test-user'
          })
        });
        
        if (memeTextResponse.ok) {
          const memeTextData = await memeTextResponse.json();
          console.log('✅ Meme text generated:', memeTextData.text);
          console.log('   Method:', memeTextData.method);
          console.log('   Enhanced:', memeTextData.enhanced);
          
          // Now test direct meme generation
          console.log('\n🖼️ Testing direct meme generation...');
          const memeResponse = await fetch('http://localhost:3000/api/meme', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: memeTextData.text,
              userId: 'test-user'
            })
          });
          
          if (memeResponse.ok) {
            const memeData = await memeResponse.json();
            console.log('✅ Meme generated successfully!');
            console.log('   URL:', memeData.url);
            console.log('   Page:', memeData.pageUrl);
            results.push({ ...testCase, success: true, memeUrl: memeData.url });
          } else {
            const error = await memeResponse.json();
            console.log('❌ Meme generation failed:', error);
            results.push({ ...testCase, success: false, error: error.error });
          }
        } else {
          const error = await memeTextResponse.json();
          console.log('❌ Meme text generation failed:', error);
          results.push({ ...testCase, success: false, error: 'Meme text generation failed' });
        }
      }
      
    } catch (error) {
      console.log('❌ Test failed with error:', error.message);
      results.push({ ...testCase, success: false, error: error.message });
    }
  }
  
  // Summary
  console.log('\n\n📊 TEST SUMMARY');
  console.log('═'.repeat(50));
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`✅ Successful: ${successful}/${results.length}`);
  console.log(`❌ Failed: ${failed}/${results.length}`);
  
  if (failed > 0) {
    console.log('\n❌ Failed tests:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
  }
  
  console.log('\n💡 Tips for debugging failures:');
  console.log('1. Check that IMGFLIP_USERNAME and IMGFLIP_PASSWORD are set');
  console.log('2. Verify OpenAI API key is configured');
  console.log('3. Look for "No meme was predicted" errors - text may be too complex');
  console.log('4. Check server logs for detailed error messages');
}

// Run the tests
testMemeGeneration().catch(console.error);