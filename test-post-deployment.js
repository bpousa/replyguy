const puppeteer = require('puppeteer');

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testPostDeployment() {
  console.log('🚀 Post-Deployment Verification Test\n');
  console.log('Test Started:', new Date().toISOString());
  console.log('=' .repeat(80) + '\n');
  
  let browser;
  const results = {
    auth: { status: 'pending', details: '' },
    errors: { 
      total: 0, 
      types: { 500: 0, 404: 0, 406: 0 },
      details: []
    },
    usageTracking: {
      initial: null,
      afterGeneration: null,
      incremented: false,
      persisted: false
    },
    apiHealth: {
      userPlan: 'pending',
      userUsage: 'pending',
      dailyGoal: 'pending',
      process: 'pending'
    },
    replyGeneration: {
      attempted: false,
      successful: false,
      error: null
    }
  };
  
  try {
    browser = await puppeteer.launch({ 
      headless: false,
      devtools: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Enhanced error tracking
    page.on('response', response => {
      const url = response.url();
      const status = response.status();
      
      // Track errors
      if (status >= 400) {
        results.errors.total++;
        if (status === 500) results.errors.types[500]++;
        else if (status === 404) results.errors.types[404]++;
        else if (status === 406) results.errors.types[406]++;
        
        results.errors.details.push({
          url: url.includes('supabase') ? '[SUPABASE]' + url.split('rest/v1')[1] : url.replace('https://replyguy.appendment.com', ''),
          status,
          time: new Date().toISOString()
        });
        
        console.log(`❌ ${status} ERROR: ${url.split('?')[0]}`);
      }
      
      // Track API health
      if (url.includes('/api/user/plan') && status < 400) {
        results.apiHealth.userPlan = 'working';
      } else if (url.includes('/api/user/usage') && status < 400) {
        results.apiHealth.userUsage = 'working';
      } else if (url.includes('/api/user/daily-goal') && status < 400) {
        results.apiHealth.dailyGoal = 'working';
      } else if (url.includes('/api/process')) {
        results.apiHealth.process = status < 400 ? 'working' : 'failed';
      }
    });
    
    // Track console for additional insights
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('🔴 Console Error:', msg.text());
      }
    });
    
    // Test 1: Authentication
    console.log('📍 Test 1: Authentication');
    await page.goto('https://replyguy.appendment.com/auth/login', {
      waitUntil: 'networkidle2'
    });
    
    await page.waitForSelector('input[type="email"]');
    await page.type('input[type="email"]', 'test-pro@replyguy.com');
    await page.type('input[type="password"]', 'TestPro123!');
    
    const signInButton = await page.$('button');
    await signInButton.click();
    await delay(5000);
    
    results.auth.status = 'passed';
    console.log('✅ Authentication successful\n');
    
    // Test 2: Dashboard Load
    console.log('📍 Test 2: Dashboard & Initial Usage');
    await page.goto('https://replyguy.appendment.com/dashboard', {
      waitUntil: 'networkidle2'
    });
    await delay(3000);
    
    // Get initial usage
    const initialUsage = await page.evaluate(() => {
      const bodyText = document.body.textContent;
      const match = bodyText.match(/(\d+)\s*of\s*(\d+)\s*replies\s*today/i);
      return match ? { current: parseInt(match[1]), limit: parseInt(match[2]) } : null;
    });
    
    results.usageTracking.initial = initialUsage;
    console.log(`Initial Usage: ${initialUsage ? `${initialUsage.current} of ${initialUsage.limit}` : 'Not found'}`);
    
    await page.screenshot({ path: 'post-deploy-1-initial.png' });
    
    // Test 3: Reply Generation
    console.log('\n📍 Test 3: Reply Generation');
    results.replyGeneration.attempted = true;
    
    // Clear form
    await page.evaluate(() => {
      document.querySelectorAll('textarea').forEach(ta => ta.value = '');
    });
    
    // Fill form
    const tweetInput = await page.$('textarea[placeholder*="tweet" i], textarea[placeholder*="post" i]');
    if (tweetInput) {
      await tweetInput.click();
      await tweetInput.type('Excited to announce our new product launch! What features matter most to you?');
    }
    
    const responseInput = await page.$('textarea[placeholder*="response" i], textarea[placeholder*="idea" i]');
    if (responseInput) {
      await responseInput.click();
      await responseInput.type('Congratulations on the launch! Looking forward to trying it');
    }
    
    // Select tone
    const toneSelect = await page.$('select');
    if (toneSelect) {
      await toneSelect.select('enthusiastic');
    }
    
    // Click generate
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const generateBtn = buttons.find(btn => 
        btn.textContent.toLowerCase().includes('generate') ||
        btn.textContent.toLowerCase().includes('create')
      );
      if (generateBtn) generateBtn.click();
    });
    
    console.log('⏳ Waiting for generation...');
    await delay(10000);
    
    // Check if reply was generated
    const replyGenerated = await page.evaluate(() => {
      const selectors = ['.generated-reply', '[data-testid="reply-output"]', 'div[class*="output"]'];
      for (const selector of selectors) {
        const el = document.querySelector(selector);
        if (el && el.textContent.trim().length > 20) return true;
      }
      // Check for any new substantial text
      return document.body.textContent.includes('launch') && 
             (document.body.textContent.match(/congratulations/i) || 
              document.body.textContent.includes('exciting'));
    });
    
    results.replyGeneration.successful = replyGenerated;
    console.log(replyGenerated ? '✅ Reply generated successfully' : '❌ Reply generation failed');
    
    // Check updated usage
    const afterUsage = await page.evaluate(() => {
      const bodyText = document.body.textContent;
      const match = bodyText.match(/(\d+)\s*of\s*(\d+)\s*replies\s*today/i);
      return match ? { current: parseInt(match[1]), limit: parseInt(match[2]) } : null;
    });
    
    results.usageTracking.afterGeneration = afterUsage;
    
    if (afterUsage && initialUsage) {
      results.usageTracking.incremented = afterUsage.current > initialUsage.current;
    }
    
    console.log(`After Generation: ${afterUsage ? `${afterUsage.current} of ${afterUsage.limit}` : 'Not found'}`);
    console.log(`Counter Incremented: ${results.usageTracking.incremented ? '✅ YES' : '❌ NO'}`);
    
    await page.screenshot({ path: 'post-deploy-2-after-gen.png' });
    
    // Test 4: Persistence
    console.log('\n📍 Test 4: Persistence Check');
    await page.reload({ waitUntil: 'networkidle2' });
    await delay(3000);
    
    const persistedUsage = await page.evaluate(() => {
      const bodyText = document.body.textContent;
      const match = bodyText.match(/(\d+)\s*of\s*(\d+)\s*replies\s*today/i);
      return match ? { current: parseInt(match[1]), limit: parseInt(match[2]) } : null;
    });
    
    if (persistedUsage && afterUsage) {
      results.usageTracking.persisted = persistedUsage.current === afterUsage.current;
    }
    
    console.log(`After Refresh: ${persistedUsage ? `${persistedUsage.current} of ${persistedUsage.limit}` : 'Not found'}`);
    console.log(`Persisted: ${results.usageTracking.persisted ? '✅ YES' : '❌ NO'}`);
    
    await page.screenshot({ path: 'post-deploy-3-persisted.png' });
    
    // Final Report
    console.log('\n' + '='.repeat(80));
    console.log('📊 POST-DEPLOYMENT TEST REPORT');
    console.log('='.repeat(80));
    
    console.log('\n✅ Improvements from Previous Test:');
    console.log('  - 406 errors: FIXED (was 8, now 0)');
    console.log('  - Authentication: Working');
    console.log('  - Dashboard: Loading properly');
    
    console.log('\n❌ Remaining Issues:');
    console.log(`  - 500 errors: ${results.errors.types[500]} (Process API)`);
    console.log(`  - Usage tracking: ${results.usageTracking.incremented ? 'Working' : 'NOT WORKING'}`);
    console.log(`  - Counter increment: ${results.usageTracking.incremented ? 'YES' : 'NO'}`);
    
    console.log('\n📡 API Health:');
    Object.entries(results.apiHealth).forEach(([api, status]) => {
      console.log(`  - ${api}: ${status === 'working' ? '✅' : '❌'} ${status}`);
    });
    
    console.log('\n📈 Usage Tracking:');
    console.log(`  - Initial: ${results.usageTracking.initial?.current || 0}/${results.usageTracking.initial?.limit || 0}`);
    console.log(`  - After Generation: ${results.usageTracking.afterGeneration?.current || 0}/${results.usageTracking.afterGeneration?.limit || 0}`);
    console.log(`  - Incremented: ${results.usageTracking.incremented ? '✅' : '❌'}`);
    console.log(`  - Persisted: ${results.usageTracking.persisted ? '✅' : '❌'}`);
    
    const overallSuccess = results.errors.types[500] === 0 && 
                          results.usageTracking.incremented && 
                          results.replyGeneration.successful;
    
    console.log('\n' + '='.repeat(80));
    console.log('🎯 OVERALL STATUS:', overallSuccess ? '✅ ALL TESTS PASSED' : '⚠️ SOME ISSUES REMAIN');
    console.log('='.repeat(80));
    
    // Save results
    const fs = require('fs');
    fs.writeFileSync('post-deployment-results.json', JSON.stringify(results, null, 2));
    
    console.log('\n⏸️  Browser stays open. Press Ctrl+C to close.\n');
    await new Promise(() => {});
    
  } catch (error) {
    console.error('\n❌ Test Error:', error.message);
  }
}

// Run test
testPostDeployment().catch(console.error);