const puppeteer = require('puppeteer');

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testAuthFixFocused() {
  console.log('🔐 Testing Authentication Fix - Focused Test\n');
  console.log('Test Started:', new Date().toISOString());
  console.log('=' .repeat(80) + '\n');
  
  let browser;
  const results = {
    authWorking: false,
    processApiFixed: false,
    usageIncremented: false,
    errors: []
  };
  
  try {
    browser = await puppeteer.launch({ 
      headless: false,
      devtools: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      timeout: 60000
    });
    
    const page = await browser.newPage();
    page.setDefaultTimeout(30000);
    
    // Track process API calls
    let processApiCalled = false;
    let processApiStatus = null;
    
    page.on('response', response => {
      const url = response.url();
      const status = response.status();
      
      if (url.includes('/api/process')) {
        processApiCalled = true;
        processApiStatus = status;
        console.log(`📡 /api/process response: ${status}`);
        
        if (status >= 400) {
          results.errors.push(`/api/process returned ${status}`);
        }
      }
    });
    
    // Capture debug logs
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('Checking cookies') || text.includes('auth')) {
        console.log(`📝 Debug: ${text}`);
      }
    });
    
    // Step 1: Login
    console.log('📍 Step 1: Login');
    await page.goto('https://replyguy.appendment.com/auth/login', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.type('input[type="email"]', 'test-pro@replyguy.com');
    await page.type('input[type="password"]', 'TestPro123!');
    
    // Click sign in button
    const signInButton = await page.$('button[type="submit"]') || await page.$('button');
    if (signInButton) {
      await signInButton.click();
    }
    
    // Wait for navigation
    await delay(5000);
    
    // Check if we're on dashboard
    const currentUrl = page.url();
    results.authWorking = currentUrl.includes('/dashboard');
    console.log(`✅ Auth successful: ${results.authWorking}`);
    console.log(`   Current URL: ${currentUrl}`);
    
    if (!results.authWorking) {
      throw new Error('Authentication failed - not on dashboard');
    }
    
    // Step 2: Get initial usage
    console.log('\n📍 Step 2: Check initial usage');
    await delay(3000);
    
    const initialUsage = await page.evaluate(() => {
      const text = document.body.textContent;
      const match = text.match(/(\d+)\s*of\s*\d+\s*replies/i);
      return match ? parseInt(match[1]) : -1;
    });
    
    console.log(`   Initial usage: ${initialUsage} replies`);
    
    // Step 3: Generate one reply
    console.log('\n📍 Step 3: Generate reply');
    
    // Fill form
    await page.evaluate(() => {
      const textareas = document.querySelectorAll('textarea');
      if (textareas[0]) textareas[0].value = 'Testing the new authentication fix!';
      if (textareas[1]) textareas[1].value = 'Great to see this working';
    });
    
    // Click generate
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const genBtn = buttons.find(b => 
        b.textContent.toLowerCase().includes('generate') ||
        b.textContent.toLowerCase().includes('create')
      );
      if (genBtn) genBtn.click();
    });
    
    console.log('   Waiting for API call...');
    await delay(10000);
    
    // Check if process API was called and succeeded
    if (processApiCalled) {
      results.processApiFixed = processApiStatus < 400;
      console.log(`   Process API called: ${processApiStatus < 400 ? '✅ Success' : '❌ Failed'} (${processApiStatus})`);
    } else {
      console.log('   ❌ Process API was not called');
    }
    
    // Step 4: Check if usage incremented
    console.log('\n📍 Step 4: Check usage increment');
    await delay(2000);
    
    const finalUsage = await page.evaluate(() => {
      const text = document.body.textContent;
      const match = text.match(/(\d+)\s*of\s*\d+\s*replies/i);
      return match ? parseInt(match[1]) : -1;
    });
    
    results.usageIncremented = finalUsage > initialUsage;
    console.log(`   Final usage: ${finalUsage} replies`);
    console.log(`   Incremented: ${results.usageIncremented ? '✅ YES' : '❌ NO'}`);
    
    // Final Summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 AUTHENTICATION FIX TEST SUMMARY');
    console.log('='.repeat(80));
    
    console.log('\n✅ Fixed:');
    if (results.authWorking) console.log('  - Authentication works');
    if (results.processApiFixed) console.log('  - Process API no longer returns 500');
    if (results.usageIncremented) console.log('  - Usage tracking increments');
    
    console.log('\n❌ Still Broken:');
    if (!results.authWorking) console.log('  - Authentication not working');
    if (!results.processApiFixed) console.log('  - Process API still failing');
    if (!results.usageIncremented) console.log('  - Usage tracking not incrementing');
    
    if (results.errors.length > 0) {
      console.log('\n⚠️  Errors:');
      results.errors.forEach(err => console.log(`  - ${err}`));
    }
    
    const allFixed = results.authWorking && results.processApiFixed && results.usageIncremented;
    
    console.log('\n' + '='.repeat(80));
    console.log('🎯 OVERALL STATUS:', allFixed ? '✅ ALL ISSUES FIXED!' : '⚠️ SOME ISSUES REMAIN');
    console.log('='.repeat(80));
    
    // Save results
    const fs = require('fs');
    fs.writeFileSync('auth-fix-focused-results.json', JSON.stringify(results, null, 2));
    
    await page.screenshot({ path: 'auth-fix-final-state.png' });
    
    console.log('\n⏸️  Browser stays open. Press Ctrl+C to close.\n');
    await new Promise(() => {});
    
  } catch (error) {
    console.error('\n❌ Test Error:', error.message);
    results.errors.push(error.message);
  }
}

// Run test
testAuthFixFocused().catch(console.error);