const puppeteer = require('puppeteer');

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testEmergencyFixes() {
  console.log('🚨 Testing ReplyGuy Emergency Authentication Fixes\n');
  console.log('Test Started:', new Date().toISOString());
  console.log('=' .repeat(70) + '\n');
  
  let browser;
  const testResults = {
    debugEndpoint: { status: 'pending', data: null },
    login: { status: 'pending', errors: [] },
    sessionPersistence: { status: 'pending', persisted: false },
    apiAccess: { status: 'pending', endpoints: {} },
    redirects: { status: 'pending', correct: [] },
    cookies: { status: 'pending', found: [] },
    autoRefresh: { status: 'pending', refreshed: false }
  };
  
  try {
    browser = await puppeteer.launch({ 
      headless: false,
      devtools: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Track important events
    const errors401 = [];
    const consoleLogs = [];
    const networkRequests = [];
    
    page.on('response', response => {
      const url = response.url();
      const status = response.status();
      
      if (url.includes('/api/')) {
        networkRequests.push({ url, status, timestamp: Date.now() });
      }
      
      if (status === 401) {
        errors401.push({ url, timestamp: new Date().toISOString() });
        console.log(`❌ 401 ERROR: ${url}`);
      }
    });
    
    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push(text);
      if (text.includes('[auth') || text.includes('session') || text.includes('✅')) {
        console.log('LOG:', text);
      }
    });
    
    // Test 1: Debug Endpoint
    console.log('📍 Test 1: Debug Endpoint Check');
    console.log('=' .repeat(50));
    
    await page.goto('https://replyguy.appendment.com/api/auth/debug', {
      waitUntil: 'networkidle2'
    });
    
    const debugContent = await page.evaluate(() => {
      const pre = document.querySelector('pre');
      if (pre) {
        try {
          return JSON.parse(pre.textContent);
        } catch {
          return { text: pre.textContent };
        }
      }
      return { body: document.body.textContent };
    });
    
    console.log('Debug endpoint response:', JSON.stringify(debugContent, null, 2).substring(0, 500) + '...');
    testResults.debugEndpoint = { status: 'passed', data: debugContent };
    
    // Test 2: Login Flow
    console.log('\n📍 Test 2: Login Flow Test');
    console.log('=' .repeat(50));
    
    const testAccount = {
      email: 'test-pro@replyguy.com',
      password: 'TestPro123!'
    };
    
    console.log('Testing with:', testAccount.email);
    
    // Navigate to login
    await page.goto('https://replyguy.appendment.com/auth/login', {
      waitUntil: 'networkidle2'
    });
    
    const loginPageUrl = page.url();
    console.log('Login page URL:', loginPageUrl);
    
    // Check if login page exists (not 404)
    const pageTitle = await page.title();
    if (pageTitle.includes('404')) {
      console.log('❌ Login page returns 404!');
      testResults.login.errors.push('Login page is 404');
    } else {
      console.log('✅ Login page exists');
    }
    
    // Fill and submit login form
    await page.waitForSelector('input[type="email"]', { timeout: 5000 });
    await page.type('input[type="email"]', testAccount.email);
    await page.type('input[type="password"]', testAccount.password);
    
    await page.screenshot({ path: 'emergency-test-1-login-filled.png' });
    
    // Click sign in button
    const signInButton = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => btn.textContent.trim().toLowerCase().includes('sign'));
    });
    
    if (signInButton) {
      await signInButton.click();
      console.log('Clicked sign in button...');
    }
    
    // Wait for navigation
    await delay(5000);
    
    const afterLoginUrl = page.url();
    console.log('After login URL:', afterLoginUrl);
    
    if (afterLoginUrl.includes('/dashboard') || afterLoginUrl.includes('/billing')) {
      console.log('✅ Login successful - redirected to app');
      testResults.login.status = 'passed';
    } else if (afterLoginUrl.includes('/auth/login')) {
      console.log('❌ Still on login page');
      testResults.login.status = 'failed';
      testResults.login.errors.push('Login failed - still on login page');
    } else {
      console.log('⚠️  Unexpected redirect:', afterLoginUrl);
      testResults.login.status = 'partial';
    }
    
    await page.screenshot({ path: 'emergency-test-2-after-login.png' });
    
    // Test 3: Session Check
    console.log('\n📍 Test 3: Session Verification');
    console.log('=' .repeat(50));
    
    const sessionCheck = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/auth/session');
        const data = await response.json();
        return { status: response.status, data };
      } catch (error) {
        return { error: error.message };
      }
    });
    
    console.log('Session check:', JSON.stringify(sessionCheck, null, 2).substring(0, 300) + '...');
    
    if (sessionCheck.data?.session?.exists) {
      console.log('✅ Valid session exists');
      console.log('User:', sessionCheck.data.session.user?.email);
      testResults.sessionPersistence.status = 'passed';
    } else {
      console.log('❌ No valid session');
      testResults.sessionPersistence.status = 'failed';
    }
    
    // Test 4: Cookie Check
    console.log('\n📍 Test 4: Cookie Verification');
    console.log('=' .repeat(50));
    
    const cookies = await page.cookies();
    const authCookies = cookies.filter(c => 
      c.name.includes('auth') || 
      c.name.includes('supabase') || 
      c.name.includes('session')
    );
    
    console.log(`Found ${authCookies.length} auth-related cookies`);
    authCookies.forEach(cookie => {
      console.log(`  - ${cookie.name}: ${cookie.value.substring(0, 20)}...`);
    });
    
    testResults.cookies = { 
      status: authCookies.length > 0 ? 'passed' : 'failed',
      found: authCookies.map(c => c.name)
    };
    
    // Test 5: API Access
    console.log('\n📍 Test 5: API Access Test');
    console.log('=' .repeat(50));
    
    const apiEndpoints = [
      '/api/stripe/products',
      '/api/user/usage',
      '/api/user/plan'
    ];
    
    for (const endpoint of apiEndpoints) {
      const apiTest = await page.evaluate(async (url) => {
        try {
          const response = await fetch(url);
          return { 
            status: response.status, 
            ok: response.ok,
            url 
          };
        } catch (error) {
          return { error: error.message, url };
        }
      }, endpoint);
      
      console.log(`${endpoint}: ${apiTest.status} ${apiTest.ok ? '✅' : '❌'}`);
      testResults.apiAccess.endpoints[endpoint] = apiTest;
    }
    
    const allAPIsOk = Object.values(testResults.apiAccess.endpoints).every(r => r.ok);
    testResults.apiAccess.status = allAPIsOk ? 'passed' : 'failed';
    
    // Test 6: Session Persistence (Refresh)
    console.log('\n📍 Test 6: Session Persistence Test');
    console.log('=' .repeat(50));
    
    console.log('Refreshing page...');
    await page.reload({ waitUntil: 'networkidle2' });
    await delay(3000);
    
    const afterRefreshUrl = page.url();
    console.log('URL after refresh:', afterRefreshUrl);
    
    const sessionAfterRefresh = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/auth/session');
        const data = await response.json();
        return { exists: data.session?.exists, user: data.session?.user?.email };
      } catch {
        return { exists: false };
      }
    });
    
    if (sessionAfterRefresh.exists) {
      console.log('✅ Session persisted after refresh');
      console.log('User still:', sessionAfterRefresh.user);
      testResults.sessionPersistence.persisted = true;
    } else {
      console.log('❌ Session lost after refresh');
    }
    
    // Test 7: Dashboard Access
    console.log('\n📍 Test 7: Protected Route Access');
    console.log('=' .repeat(50));
    
    await page.goto('https://replyguy.appendment.com/dashboard', {
      waitUntil: 'networkidle2'
    });
    
    const dashboardUrl = page.url();
    console.log('Dashboard URL:', dashboardUrl);
    
    if (dashboardUrl.includes('/dashboard')) {
      console.log('✅ Dashboard accessible');
      testResults.redirects.correct.push('dashboard');
    } else if (dashboardUrl.includes('/auth/login')) {
      console.log('❌ Redirected to login');
      testResults.redirects.status = 'failed';
    } else {
      console.log('⚠️  Unexpected redirect:', dashboardUrl);
    }
    
    await page.screenshot({ path: 'emergency-test-3-dashboard.png' });
    
    // Final Report
    console.log('\n' + '='.repeat(70));
    console.log('📊 EMERGENCY FIX VERIFICATION RESULTS');
    console.log('='.repeat(70));
    
    console.log('\n1️⃣ Debug Endpoint:', testResults.debugEndpoint.status.toUpperCase());
    console.log('2️⃣ Login Flow:', testResults.login.status?.toUpperCase() || 'UNKNOWN');
    console.log('3️⃣ Session Exists:', testResults.sessionPersistence.status?.toUpperCase() || 'UNKNOWN');
    console.log('4️⃣ Session Persists:', testResults.sessionPersistence.persisted ? 'YES' : 'NO');
    console.log('5️⃣ Cookies Set:', testResults.cookies.found.length > 0 ? 'YES' : 'NO');
    console.log('6️⃣ API Access:', testResults.apiAccess.status?.toUpperCase() || 'UNKNOWN');
    console.log('7️⃣ Total 401 Errors:', errors401.length);
    
    console.log('\n📈 API Endpoint Status:');
    Object.entries(testResults.apiAccess.endpoints).forEach(([endpoint, result]) => {
      console.log(`   ${endpoint}: ${result.status || 'ERROR'}`);
    });
    
    console.log('\n🍪 Cookies Found:');
    testResults.cookies.found.forEach(name => console.log(`   - ${name}`));
    
    // Overall assessment
    const criticalPassed = 
      testResults.login.status === 'passed' &&
      testResults.sessionPersistence.persisted &&
      testResults.apiAccess.status === 'passed' &&
      errors401.length === 0;
    
    console.log('\n' + '='.repeat(70));
    console.log('🎯 OVERALL RESULT:', criticalPassed ? '✅ FIXES WORKING!' : '❌ FIXES INCOMPLETE');
    console.log('='.repeat(70));
    
    if (!criticalPassed) {
      console.log('\n⚠️  Remaining Issues:');
      if (testResults.login.status !== 'passed') console.log('  - Login still failing');
      if (!testResults.sessionPersistence.persisted) console.log('  - Sessions not persisting');
      if (testResults.apiAccess.status !== 'passed') console.log('  - API access still blocked');
      if (errors401.length > 0) console.log(`  - Still getting ${errors401.length} 401 errors`);
    }
    
    console.log('\n📸 Screenshots saved:');
    console.log('  - emergency-test-1-login-filled.png');
    console.log('  - emergency-test-2-after-login.png');
    console.log('  - emergency-test-3-dashboard.png');
    
    console.log('\n⏸️  Browser stays open. Press Ctrl+C to close.\n');
    await new Promise(() => {});
    
  } catch (error) {
    console.error('\n❌ Test Error:', error.message);
    console.error(error.stack);
  }
}

// Run test
testEmergencyFixes().catch(console.error);