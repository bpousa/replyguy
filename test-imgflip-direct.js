#!/usr/bin/env node
/**
 * Direct test of Imgflip API credentials
 * This bypasses our API and tests Imgflip directly
 */

require('dotenv').config({ path: '.env.local' });

const IMGFLIP_USERNAME = process.env.IMGFLIP_USERNAME;
const IMGFLIP_PASSWORD = process.env.IMGFLIP_PASSWORD;

console.log('🔍 Testing Imgflip API directly...\n');

// Check credentials
console.log('📋 Credential Check:');
console.log(`  Username: ${IMGFLIP_USERNAME ? '✅ Set (' + IMGFLIP_USERNAME + ')' : '❌ Missing'}`);
console.log(`  Password: ${IMGFLIP_PASSWORD ? '✅ Set (hidden)' : '❌ Missing'}`);
console.log('');

if (!IMGFLIP_USERNAME || !IMGFLIP_PASSWORD) {
  console.error('❌ Missing Imgflip credentials! Set IMGFLIP_USERNAME and IMGFLIP_PASSWORD in .env.local');
  process.exit(1);
}

async function testImgflipDirect() {
  console.log('🚀 Testing automeme endpoint...');
  
  const testTexts = [
    'this is fine',
    'one does not simply test memes',
    'bugs everywhere',
    'why not both',
  ];
  
  for (const text of testTexts) {
    console.log(`\n📝 Testing with text: "${text}"`);
    
    try {
      const response = await fetch('https://api.imgflip.com/automeme', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          username: IMGFLIP_USERNAME,
          password: IMGFLIP_PASSWORD,
          text: text,
          no_watermark: '1',
        }),
      });
      
      console.log(`  Status: ${response.status} ${response.statusText}`);
      
      const responseText = await response.text();
      console.log(`  Raw response: ${responseText.substring(0, 200)}${responseText.length > 200 ? '...' : ''}`);
      
      try {
        const data = JSON.parse(responseText);
        
        if (data.success) {
          console.log(`  ✅ Success!`);
          console.log(`  🖼️  URL: ${data.data.url}`);
          console.log(`  🔗 Page: ${data.data.page_url}`);
        } else {
          console.log(`  ❌ API Error: ${data.error_message}`);
          
          // Check for common errors
          if (data.error_message?.includes('Premium')) {
            console.log(`  💡 This requires an Imgflip Premium API subscription ($9.99/mo)`);
          } else if (data.error_message?.includes('Incorrect username')) {
            console.log(`  💡 Check your username and password`);
          } else if (data.error_message?.includes('No meme was predicted')) {
            console.log(`  💡 The text didn't match any meme templates`);
          }
        }
      } catch (e) {
        console.log(`  ❌ Failed to parse JSON response`);
      }
    } catch (error) {
      console.error(`  ❌ Network error:`, error.message);
    }
  }
}

// Run the test
testImgflipDirect().then(() => {
  console.log('\n✅ Test complete!');
}).catch(error => {
  console.error('\n❌ Test failed:', error);
});