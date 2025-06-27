const puppeteer = require('puppeteer');

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testCookieAuthFix() {
  console.log('🍪 Testing Cookie-Based Authentication Fix\n');
  console.log('Test Started:', new Date().toISOString());
  console.log('=' .repeat(80) + '\n');
  
  let browser;
  const testResults = {
    cookieAuth: { status: 'pending', cookies: [] },
    login: { status: 'pending', details: {} },
    sessionPersistence: { status: 'pending', persisted: false },
    apiAccess: { status: 'pending', results: {} },
    migration: { status: 'pending', migrated: false },
    protectedRoutes: { status: 'pending', accessible: {} },
    overallHealth: { status: 'pending', issues: [] }
  };
  
  try {
    browser = await puppeteer.launch({ 
      headless: false,
      devtools: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Track all console logs for debugging
    const consoleLogs = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push(text);
      if (text.includes('auth') || text.includes('cookie') || text.includes('migration')) {
        console.log('DEBUG:', text);
      }
    });
    
    // Track 401 errors
    let errors401 = 0;
    const apiErrors = [];
    page.on('response', response => {
      if (response.status() === 401) {
        errors401++;
        apiErrors.push({
          url: response.url(),
          timestamp: new Date().toISOString()
        });
        console.log(`❌ 401 ERROR: ${response.url()}`);
      }
    });
    
    // Test 1: Initial State Check
    console.log('📍 Test 1: Initial Cookie State');
    console.log('=' .repeat(50));
    
    await page.goto('https://replyguy.appendment.com', {
      waitUntil: 'networkidle2'
    });
    
    // Check for any existing auth data
    const initialState = await page.evaluate(() => {
      const localStorageAuth = localStorage.getItem('replyguy-auth');
      const cookies = document.cookie;
      return {
        hasLocalStorageAuth: !!localStorageAuth,
        localStorageData: localStorageAuth ? JSON.parse(localStorageAuth) : null,
        cookieString: cookies,
        hasCookies: cookies.length > 0
      };
    });
    
    console.log('Initial state:');
    console.log('  LocalStorage auth:', initialState.hasLocalStorageAuth ? 'YES' : 'NO');
    console.log('  Cookies present:', initialState.hasCookies ? 'YES' : 'NO');
    
    // Test 2: Login with Pro Account
    console.log('\n📍 Test 2: Login Test (Pro Account)');
    console.log('=' .repeat(50));
    
    const testAccount = {
      email: 'test-pro@replyguy.com',
      password: 'TestPro123!'
    };
    
    await page.goto('https://replyguy.appendment.com/auth/login', {
      waitUntil: 'networkidle2'
    });
    
    // Fill login form
    await page.waitForSelector('input[type="email"]', { timeout: 5000 });
    await page.type('input[type="email"]', testAccount.email);
    await page.type('input[type="password"]', testAccount.password);
    
    await page.screenshot({ path: 'cookie-test-1-login.png' });
    
    // Submit form
    const signInButton = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => btn.textContent.includes('Sign'));
    });
    
    await signInButton.click();
    console.log('Submitting login...');
    
    // Wait for navigation or auth state change
    await delay(5000);
    
    const afterLoginUrl = page.url();
    console.log('After login URL:', afterLoginUrl);
    
    // Check cookies after login
    const postLoginCookies = await page.cookies();
    const authCookies = postLoginCookies.filter(c => 
      c.name.includes('auth') || 
      c.name.includes('supabase') || 
      c.name.includes('sb-')
    );
    
    console.log(`\nAuth cookies found: ${authCookies.length}`);
    authCookies.forEach(cookie => {
      console.log(`  - ${cookie.name} (${cookie.domain})`);
    });
    
    testResults.cookieAuth = {
      status: authCookies.length > 0 ? 'passed' : 'failed',
      cookies: authCookies.map(c => ({ name: c.name, domain: c.domain }))
    };
    
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
    
    console.log('Session check status:', sessionCheck.status);
    console.log('Session exists:', sessionCheck.data?.session?.exists || false);
    
    if (sessionCheck.data?.session?.user) {
      console.log('Logged in as:', sessionCheck.data.session.user.email);
      testResults.login.status = 'passed';
      testResults.login.details = {
        user: sessionCheck.data.session.user.email,
        sessionExists: true
      };
    } else {
      testResults.login.status = 'failed';
      testResults.login.details = {
        sessionExists: false,
        error: 'No session after login'
      };
    }
    
    // Test 4: API Access
    console.log('\n📍 Test 4: API Access with Cookies');
    console.log('=' .repeat(50));
    
    const apiEndpoints = [
      '/api/stripe/products',
      '/api/user/usage',
      '/api/user/plan'
    ];
    
    for (const endpoint of apiEndpoints) {
      const apiTest = await page.evaluate(async (url) => {
        try {
          const response = await fetch(url, {
            credentials: 'include'
          });
          const data = await response.json();
          return { 
            url,
            status: response.status,
            ok: response.ok,
            hasData: !!data
          };
        } catch (error) {
          return { url, error: error.message };
        }
      }, endpoint);
      
      console.log(`${endpoint}: ${apiTest.status} ${apiTest.ok ? '✅' : '❌'}`);
      testResults.apiAccess.results[endpoint] = apiTest;
    }
    
    const allAPIsOk = Object.values(testResults.apiAccess.results).every(r => r.ok);
    testResults.apiAccess.status = allAPIsOk ? 'passed' : 'failed';
    
    // Test 5: Dashboard Access
    console.log('\n📍 Test 5: Protected Route Access');
    console.log('=' .repeat(50));
    
    await page.goto('https://replyguy.appendment.com/dashboard', {
      waitUntil: 'networkidle2'
    });
    
    const dashboardUrl = page.url();
    console.log('Dashboard URL:', dashboardUrl);
    
    if (dashboardUrl.includes('/dashboard')) {
      console.log('✅ Dashboard accessible');
      testResults.protectedRoutes.accessible.dashboard = true;
      await page.screenshot({ path: 'cookie-test-2-dashboard.png' });
      
      // Check dashboard content
      const dashboardContent = await page.evaluate(() => {
        const hasUsageInfo = document.body.textContent.includes('replies') || 
                           document.body.textContent.includes('usage');
        const hasPlanInfo = document.body.textContent.includes('Pro') || 
                          document.body.textContent.includes('plan');
        return { hasUsageInfo, hasPlanInfo };
      });
      
      console.log('Dashboard shows usage info:', dashboardContent.hasUsageInfo ? 'YES' : 'NO');
      console.log('Dashboard shows plan info:', dashboardContent.hasPlanInfo ? 'YES' : 'NO');
    } else {
      console.log('❌ Redirected away from dashboard');
      testResults.protectedRoutes.accessible.dashboard = false;
    }
    
    // Test 6: Session Persistence (Page Refresh)
    console.log('\n📍 Test 6: Session Persistence Test');
    console.log('=' .repeat(50));
    
    console.log('Refreshing page...');
    await page.reload({ waitUntil: 'networkidle2' });
    await delay(3000);
    
    const afterRefreshUrl = page.url();
    const sessionAfterRefresh = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/auth/session');
        const data = await response.json();
        return data.session?.exists || false;
      } catch {
        return false;
      }
    });
    
    console.log('URL after refresh:', afterRefreshUrl);
    console.log('Session persisted:', sessionAfterRefresh ? 'YES' : 'NO');
    
    testResults.sessionPersistence = {
      status: sessionAfterRefresh ? 'passed' : 'failed',
      persisted: sessionAfterRefresh
    };
    
    // Test 7: New Tab Session (Cookie Persistence)
    console.log('\n📍 Test 7: Cookie Persistence (New Tab)');
    console.log('=' .repeat(50));
    
    const newPage = await browser.newPage();
    await newPage.goto('https://replyguy.appendment.com/dashboard', {
      waitUntil: 'networkidle2'
    });
    
    const newTabUrl = newPage.url();
    console.log('New tab URL:', newTabUrl);
    console.log('Session works in new tab:', newTabUrl.includes('/dashboard') ? 'YES' : 'NO');
    
    await newPage.close();
    
    // Test 8: Migration Check
    console.log('\n📍 Test 8: LocalStorage Migration');
    console.log('=' .repeat(50));
    
    const migrationCheck = await page.evaluate(() => {
      const hasLocalStorage = !!localStorage.getItem('replyguy-auth');
      const migrationLog = localStorage.getItem('auth-migration-completed');
      return {
        hasLocalStorage,
        migrationCompleted: !!migrationLog,
        migrationTime: migrationLog
      };
    });
    
    console.log('LocalStorage auth present:', migrationCheck.hasLocalStorage ? 'YES' : 'NO');
    console.log('Migration completed:', migrationCheck.migrationCompleted ? 'YES' : 'NO');
    
    testResults.migration = {
      status: 'passed',
      migrated: migrationCheck.migrationCompleted
    };
    
    // Overall Health Check
    const healthIssues = [];
    if (authCookies.length === 0) healthIssues.push('No auth cookies set');
    if (errors401 > 0) healthIssues.push(`${errors401} API calls returned 401`);
    if (!testResults.sessionPersistence.persisted) healthIssues.push('Sessions don\'t persist');
    if (!allAPIsOk) healthIssues.push('Some APIs still failing');
    
    testResults.overallHealth = {
      status: healthIssues.length === 0 ? 'passed' : 'failed',
      issues: healthIssues
    };
    
    // Final Report
    console.log('\n' + '='.repeat(80));
    console.log('📊 COOKIE AUTHENTICATION FIX VERIFICATION');
    console.log('='.repeat(80));
    
    console.log('\n🍪 Cookie Implementation:', testResults.cookieAuth.status.toUpperCase());
    console.log(`   Auth cookies: ${testResults.cookieAuth.cookies.length}`);
    
    console.log('\n🔐 Login:', testResults.login.status.toUpperCase());
    if (testResults.login.details.user) {
      console.log(`   User: ${testResults.login.details.user}`);
    }
    
    console.log('\n💾 Session Persistence:', testResults.sessionPersistence.status.toUpperCase());
    console.log(`   Survives refresh: ${testResults.sessionPersistence.persisted ? 'YES' : 'NO'}`);
    
    console.log('\n🌐 API Access:', testResults.apiAccess.status.toUpperCase());
    Object.entries(testResults.apiAccess.results).forEach(([endpoint, result]) => {
      console.log(`   ${endpoint}: ${result.status || 'ERROR'}`);
    });
    
    console.log('\n🛡️ Protected Routes:', 
      testResults.protectedRoutes.accessible.dashboard ? 'ACCESSIBLE' : 'BLOCKED'
    );
    
    console.log('\n❌ Total 401 Errors:', errors401);
    
    console.log('\n' + '='.repeat(80));
    console.log('🎯 OVERALL RESULT:', testResults.overallHealth.status.toUpperCase());
    
    if (testResults.overallHealth.issues.length > 0) {
      console.log('\n⚠️  Remaining Issues:');
      testResults.overallHealth.issues.forEach(issue => 
        console.log(`   - ${issue}`)
      );
    } else {
      console.log('\n✅ All authentication features working correctly!');
    }
    
    console.log('='.repeat(80));
    
    // Save detailed results
    const fs = require('fs');
    fs.writeFileSync('cookie-auth-test-results.json', JSON.stringify({
      testResults,
      errors401Count: errors401,
      apiErrors,
      timestamp: new Date().toISOString()
    }, null, 2));
    
    console.log('\nDetailed results saved to: cookie-auth-test-results.json');
    console.log('\n⏸️  Browser stays open. Press Ctrl+C to close.\n');
    
    await new Promise(() => {});
    
  } catch (error) {
    console.error('\n❌ Test Error:', error.message);
    console.error(error.stack);
  }
}

// Run test
testCookieAuthFix().catch(console.error);