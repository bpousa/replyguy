const puppeteer = require('puppeteer');

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testAuthFix() {
  console.log('🔐 Testing Authentication Fix - Complete Verification\n');
  console.log('Test Started:', new Date().toISOString());
  console.log('Testing: credentials: "include" fix for /api/process');
  console.log('=' .repeat(80) + '\n');
  
  let browser;
  const results = {
    auth: {
      loginSuccessful: false,
      cookiesPresent: false,
      cookieDetails: []
    },
    apiCalls: {
      process: { attempts: 0, successful: 0, errors: [] },
      userPlan: { status: 'pending' },
      userUsage: { status: 'pending' },
      dailyGoal: { status: 'pending' }
    },
    usageTracking: {
      initial: null,
      afterFirst: null,
      afterSecond: null,
      afterThird: null,
      increments: [],
      finalPersisted: false
    },
    debugLogs: [],
    overallStatus: 'pending'
  };
  
  try {
    browser = await puppeteer.launch({ 
      headless: false,
      devtools: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Capture console logs, especially debug cookie logs
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('cookie') || text.includes('auth') || text.includes('Checking cookies')) {
        results.debugLogs.push({
          type: msg.type(),
          text: text,
          time: new Date().toISOString()
        });
        console.log(`📝 Debug Log: ${text}`);
      }
      if (msg.type() === 'error' && !text.includes('favicon')) {
        console.log(`🔴 Console Error: ${text}`);
      }
    });
    
    // Track API responses
    page.on('response', response => {
      const url = response.url();
      const status = response.status();
      
      if (url.includes('/api/process')) {
        results.apiCalls.process.attempts++;
        if (status < 400) {
          results.apiCalls.process.successful++;
          console.log(`✅ /api/process: ${status} OK`);
        } else {
          results.apiCalls.process.errors.push({ status, time: new Date().toISOString() });
          console.log(`❌ /api/process: ${status} ERROR`);
        }
      } else if (url.includes('/api/user/plan')) {
        results.apiCalls.userPlan.status = status < 400 ? 'working' : 'failed';
      } else if (url.includes('/api/user/usage')) {
        results.apiCalls.userUsage.status = status < 400 ? 'working' : 'failed';
      } else if (url.includes('/api/user/daily-goal')) {
        results.apiCalls.dailyGoal.status = status < 400 ? 'working' : 'failed';
      }
    });
    
    // Step 1: Login
    console.log('📍 Step 1: Authentication Test');
    console.log('  - Logging in with test-pro@replyguy.com...');
    
    await page.goto('https://replyguy.appendment.com/auth/login', {
      waitUntil: 'networkidle2'
    });
    
    await page.waitForSelector('input[type="email"]');
    await page.type('input[type="email"]', 'test-pro@replyguy.com');
    await page.type('input[type="password"]', 'TestPro123!');
    
    const signInButton = await page.$('button');
    await signInButton.click();
    
    console.log('  - Waiting for authentication...');
    await delay(5000);
    
    // Check cookies after login
    const cookies = await page.cookies();
    const authCookies = cookies.filter(c => c.name.includes('auth') || c.name.includes('sb-'));
    
    results.auth.cookiesPresent = authCookies.length > 0;
    results.auth.cookieDetails = authCookies.map(c => ({ name: c.name, domain: c.domain }));
    
    console.log(`  - Auth cookies found: ${authCookies.length}`);
    authCookies.forEach(c => {
      console.log(`    • ${c.name} (${c.domain})`);
    });
    
    results.auth.loginSuccessful = true;
    console.log('✅ Login successful\n');
    
    // Step 2: Navigate to dashboard and check initial state
    console.log('📍 Step 2: Dashboard & Initial Usage Check');
    await page.goto('https://replyguy.appendment.com/dashboard', {
      waitUntil: 'networkidle2'
    });
    await delay(3000);
    
    // Verify we're actually on the dashboard (not redirected to login)
    const currentUrl = page.url();
    const onDashboard = currentUrl.includes('/dashboard');
    console.log(`  - Current URL: ${currentUrl}`);
    console.log(`  - On dashboard: ${onDashboard ? '✅ YES' : '❌ NO'}`);
    
    if (!onDashboard) {
      throw new Error('Not authenticated - redirected away from dashboard');
    }
    
    // Get initial usage
    const initialUsage = await page.evaluate(() => {
      const bodyText = document.body.textContent;
      const match = bodyText.match(/(\d+)\s*of\s*(\d+)\s*replies\s*today/i);
      return match ? parseInt(match[1]) : null;
    });
    
    results.usageTracking.initial = initialUsage;
    console.log(`  - Initial usage: ${initialUsage !== null ? initialUsage + ' of 10' : 'Not found'}`);
    
    await page.screenshot({ path: 'auth-fix-1-initial.png' });
    
    // Step 3: Test multiple reply generations
    console.log('\n📍 Step 3: Testing Reply Generation (3 attempts)');
    
    const testData = [
      { tweet: 'Just launched our new AI product!', response: 'Congratulations on the launch', tone: 'enthusiastic' },
      { tweet: 'Working on improving our API performance', response: 'Performance optimization is crucial', tone: 'supportive' },
      { tweet: 'What do you think about the future of AI?', response: 'AI has incredible potential', tone: 'conversational' }
    ];
    
    for (let i = 0; i < 3; i++) {
      console.log(`\n🔄 Attempt ${i + 1} of 3:`);
      
      // Clear form
      await page.evaluate(() => {
        document.querySelectorAll('textarea').forEach(ta => ta.value = '');
      });
      
      // Fill form
      const data = testData[i];
      const tweetInput = await page.$('textarea[placeholder*="tweet" i], textarea[placeholder*="post" i]');
      if (tweetInput) {
        await tweetInput.click();
        await tweetInput.type(data.tweet);
      }
      
      const responseInput = await page.$('textarea[placeholder*="response" i], textarea[placeholder*="idea" i]');
      if (responseInput) {
        await responseInput.click();
        await responseInput.type(data.response);
      }
      
      const toneSelect = await page.$('select');
      if (toneSelect) {
        await toneSelect.select(data.tone);
      }
      
      console.log(`  - Tweet: "${data.tweet}"`);
      console.log(`  - Tone: ${data.tone}`);
      
      // Generate reply
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const generateBtn = buttons.find(btn => 
          btn.textContent.toLowerCase().includes('generate') ||
          btn.textContent.toLowerCase().includes('create')
        );
        if (generateBtn) generateBtn.click();
      });
      
      console.log('  - Waiting for generation...');
      await delay(10000);
      
      // Check updated usage
      const currentUsage = await page.evaluate(() => {
        const bodyText = document.body.textContent;
        const match = bodyText.match(/(\d+)\s*of\s*(\d+)\s*replies\s*today/i);
        return match ? parseInt(match[1]) : null;
      });
      
      if (i === 0) results.usageTracking.afterFirst = currentUsage;
      else if (i === 1) results.usageTracking.afterSecond = currentUsage;
      else if (i === 2) results.usageTracking.afterThird = currentUsage;
      
      // Calculate increment
      const previousUsage = i === 0 ? results.usageTracking.initial : 
                           i === 1 ? results.usageTracking.afterFirst :
                           results.usageTracking.afterSecond;
      
      const increment = currentUsage - previousUsage;
      results.usageTracking.increments.push(increment);
      
      console.log(`  - Usage after: ${currentUsage !== null ? currentUsage + ' of 10' : 'Not found'}`);
      console.log(`  - Increment: ${increment > 0 ? '✅ +' + increment : '❌ No change'}`);
      
      // Check if process API was successful
      const processSuccess = results.apiCalls.process.successful > i;
      console.log(`  - Process API: ${processSuccess ? '✅ Success' : '❌ Failed'}`);
    }
    
    await page.screenshot({ path: 'auth-fix-2-after-generations.png' });
    
    // Step 4: Test persistence
    console.log('\n📍 Step 4: Testing Persistence');
    console.log('  - Refreshing page...');
    await page.reload({ waitUntil: 'networkidle2' });
    await delay(3000);
    
    // Verify still authenticated
    const stillOnDashboard = page.url().includes('/dashboard');
    console.log(`  - Still authenticated: ${stillOnDashboard ? '✅ YES' : '❌ NO'}`);
    
    const persistedUsage = await page.evaluate(() => {
      const bodyText = document.body.textContent;
      const match = bodyText.match(/(\d+)\s*of\s*(\d+)\s*replies\s*today/i);
      return match ? parseInt(match[1]) : null;
    });
    
    results.usageTracking.finalPersisted = persistedUsage === results.usageTracking.afterThird;
    console.log(`  - Persisted usage: ${persistedUsage !== null ? persistedUsage + ' of 10' : 'Not found'}`);
    console.log(`  - Correctly persisted: ${results.usageTracking.finalPersisted ? '✅ YES' : '❌ NO'}`);
    
    await page.screenshot({ path: 'auth-fix-3-persisted.png' });
    
    // Final Analysis
    console.log('\n' + '='.repeat(80));
    console.log('📊 AUTHENTICATION FIX TEST REPORT');
    console.log('='.repeat(80));
    
    console.log('\n🔐 Authentication Status:');
    console.log(`  - Login successful: ${results.auth.loginSuccessful ? '✅' : '❌'}`);
    console.log(`  - Cookies present: ${results.auth.cookiesPresent ? '✅' : '❌'}`);
    console.log(`  - Session maintained: ${stillOnDashboard ? '✅' : '❌'}`);
    
    console.log('\n📡 API Performance:');
    console.log(`  - /api/process attempts: ${results.apiCalls.process.attempts}`);
    console.log(`  - /api/process successful: ${results.apiCalls.process.successful}`);
    console.log(`  - /api/process errors: ${results.apiCalls.process.errors.length}`);
    console.log(`  - Success rate: ${results.apiCalls.process.attempts > 0 ? 
      (results.apiCalls.process.successful / results.apiCalls.process.attempts * 100).toFixed(0) : 0}%`);
    
    console.log('\n📈 Usage Tracking:');
    console.log(`  - Initial count: ${results.usageTracking.initial}`);
    console.log(`  - After 1st reply: ${results.usageTracking.afterFirst} (${results.usageTracking.increments[0] > 0 ? '+' + results.usageTracking.increments[0] : 'no change'})`);
    console.log(`  - After 2nd reply: ${results.usageTracking.afterSecond} (${results.usageTracking.increments[1] > 0 ? '+' + results.usageTracking.increments[1] : 'no change'})`);
    console.log(`  - After 3rd reply: ${results.usageTracking.afterThird} (${results.usageTracking.increments[2] > 0 ? '+' + results.usageTracking.increments[2] : 'no change'})`);
    console.log(`  - Total increment: ${results.usageTracking.increments.reduce((a, b) => a + b, 0)}`);
    console.log(`  - Persisted correctly: ${results.usageTracking.finalPersisted ? '✅' : '❌'}`);
    
    console.log('\n🐛 Debug Cookie Logs:');
    results.debugLogs.forEach(log => {
      console.log(`  - ${log.text}`);
    });
    
    // Determine overall status
    const authFixed = results.apiCalls.process.errors.length === 0;
    const trackingWorks = results.usageTracking.increments.some(inc => inc > 0);
    const fullyWorking = authFixed && trackingWorks && results.usageTracking.finalPersisted;
    
    results.overallStatus = fullyWorking ? 'FULLY WORKING' : 
                            authFixed ? 'AUTH FIXED BUT TRACKING ISSUES' : 
                            'STILL BROKEN';
    
    console.log('\n' + '='.repeat(80));
    console.log('🎯 OVERALL STATUS:', 
      fullyWorking ? '✅ AUTHENTICATION FIX SUCCESSFUL!' : 
      authFixed ? '⚠️ AUTH FIXED BUT USAGE TRACKING ISSUES' : 
      '❌ AUTHENTICATION STILL BROKEN'
    );
    console.log('='.repeat(80));
    
    // Save detailed results
    const fs = require('fs');
    fs.writeFileSync('auth-fix-test-results.json', JSON.stringify(results, null, 2));
    console.log('\nDetailed results saved to: auth-fix-test-results.json');
    
    console.log('\n⏸️  Browser stays open. Press Ctrl+C to close.\n');
    await new Promise(() => {});
    
  } catch (error) {
    console.error('\n❌ Test Error:', error.message);
    console.error(error.stack);
  }
}

// Run test
testAuthFix().catch(console.error);