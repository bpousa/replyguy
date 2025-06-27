const puppeteer = require('puppeteer');
const fs = require('fs');

async function quickAuthTest() {
  console.log('🚀 Quick Authentication Fix Test\n');
  
  let browser;
  
  try {
    browser = await puppeteer.launch({ 
      headless: false,
      devtools: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Track API responses
    let processApiStatus = null;
    page.on('response', response => {
      const url = response.url();
      if (url.includes('/api/process')) {
        processApiStatus = response.status();
        console.log(`\n🎯 /api/process response: ${processApiStatus}`);
      }
    });
    
    // Go directly to authenticated dashboard
    console.log('1️⃣ Attempting direct login...');
    await page.goto('https://replyguy.appendment.com/auth/login');
    
    // Wait for page to load
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    
    // Login
    await page.type('input[type="email"]', 'test-pro@replyguy.com');
    await page.type('input[type="password"]', 'TestPro123!');
    
    // Find and click sign in button
    const buttons = await page.$$('button');
    for (const button of buttons) {
      const text = await page.evaluate(el => el.textContent, button);
      if (text.toLowerCase().includes('sign')) {
        await button.click();
        break;
      }
    }
    
    // Wait a bit
    console.log('2️⃣ Waiting for authentication...');
    await new Promise(r => setTimeout(r, 8000));
    
    // Check if we're on dashboard
    const url = page.url();
    console.log(`   Current URL: ${url}`);
    console.log(`   Authenticated: ${url.includes('dashboard') ? '✅' : '❌'}`);
    
    if (!url.includes('dashboard')) {
      // Try navigating directly
      await page.goto('https://replyguy.appendment.com/dashboard');
      await new Promise(r => setTimeout(r, 3000));
    }
    
    // Get initial count
    console.log('\n3️⃣ Checking initial usage...');
    const initialCount = await page.evaluate(() => {
      const text = document.body.textContent;
      const match = text.match(/(\d+)\s*of\s*\d+\s*replies/i);
      return match ? match[1] : 'not found';
    });
    console.log(`   Initial: ${initialCount} replies`);
    
    // Try to generate a reply
    console.log('\n4️⃣ Testing reply generation...');
    
    // Fill the form
    await page.evaluate(() => {
      const textareas = document.querySelectorAll('textarea');
      if (textareas[0]) {
        textareas[0].value = 'Testing authentication fix';
        textareas[0].dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (textareas[1]) {
        textareas[1].value = 'This is a test';
        textareas[1].dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    
    // Click generate
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const genBtn = buttons.find(b => 
        b.textContent.includes('Generate') || 
        b.textContent.includes('Create')
      );
      if (genBtn) {
        console.log('Clicking generate button...');
        genBtn.click();
      }
    });
    
    // Wait for response
    console.log('   Waiting for API response...');
    await new Promise(r => setTimeout(r, 10000));
    
    // Get final count
    const finalCount = await page.evaluate(() => {
      const text = document.body.textContent;
      const match = text.match(/(\d+)\s*of\s*\d+\s*replies/i);
      return match ? match[1] : 'not found';
    });
    console.log(`   Final: ${finalCount} replies`);
    
    // Results
    console.log('\n' + '='.repeat(50));
    console.log('📊 RESULTS:');
    console.log('='.repeat(50));
    console.log(`Authentication: ${url.includes('dashboard') ? '✅ Working' : '❌ Failed'}`);
    console.log(`Process API: ${processApiStatus ? (processApiStatus < 400 ? '✅ Fixed' : `❌ Still ${processApiStatus}`) : '⚠️ Not called'}`);
    console.log(`Usage Tracking: ${finalCount > initialCount ? '✅ Working' : '❌ Not working'}`);
    console.log('='.repeat(50));
    
    // Save screenshot
    await page.screenshot({ path: 'auth-fix-quick-result.png' });
    
    // Save results
    fs.writeFileSync('auth-fix-quick-results.json', JSON.stringify({
      authenticated: url.includes('dashboard'),
      processApiStatus,
      initialCount,
      finalCount,
      incremented: parseInt(finalCount) > parseInt(initialCount)
    }, null, 2));
    
    console.log('\n⏸️  Browser stays open. Check the console for errors.\n');
    await new Promise(() => {});
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

quickAuthTest();