const puppeteer = require('puppeteer');

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testCookieAnalysis() {
  console.log('🍪 Deep Cookie Analysis Test\n');
  
  let browser;
  
  try {
    browser = await puppeteer.launch({ 
      headless: false,
      devtools: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Enable request interception to see headers
    await page.setRequestInterception(true);
    
    const requestHeaders = {};
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        requestHeaders[request.url()] = request.headers();
      }
      request.continue();
    });
    
    page.on('response', response => {
      if (response.url().includes('/api/auth') || response.url().includes('login')) {
        const headers = response.headers();
        if (headers['set-cookie']) {
          console.log('🍪 Set-Cookie headers:', headers['set-cookie']);
        }
      }
    });
    
    // Test account
    const account = {
      email: 'test-pro@replyguy.com',
      password: 'TestPro123!'
    };
    
    console.log('📍 Step 1: Initial Cookie State');
    console.log('=' .repeat(50));
    
    await page.goto('https://replyguy.appendment.com', {
      waitUntil: 'networkidle2'
    });
    
    const initialCookies = await page.cookies();
    console.log(`Initial cookies: ${initialCookies.length}`);
    initialCookies.forEach(c => console.log(`  - ${c.name}: ${c.domain}`));
    
    console.log('\n📍 Step 2: Login Attempt');
    console.log('=' .repeat(50));
    
    await page.goto('https://replyguy.appendment.com/auth/login', {
      waitUntil: 'networkidle2'
    });
    
    await page.waitForSelector('input[type="email"]');
    await page.type('input[type="email"]', account.email);
    await page.type('input[type="password"]', account.password);
    
    // Monitor network during login
    console.log('\nMonitoring login request...');
    
    const signInButton = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => btn.textContent.includes('Sign'));
    });
    
    await signInButton.click();
    await delay(5000);
    
    console.log('\n📍 Step 3: Post-Login Cookie Analysis');
    console.log('=' .repeat(50));
    
    const postLoginCookies = await page.cookies();
    console.log(`Cookies after login: ${postLoginCookies.length}`);
    
    const authCookies = postLoginCookies.filter(c => 
      c.name.includes('auth') || 
      c.name.includes('supabase') || 
      c.name.includes('session') ||
      c.name.includes('sb-')
    );
    
    console.log(`\nAuth-related cookies: ${authCookies.length}`);
    authCookies.forEach(cookie => {
      console.log(`\nCookie: ${cookie.name}`);
      console.log(`  Domain: ${cookie.domain}`);
      console.log(`  Path: ${cookie.path}`);
      console.log(`  Secure: ${cookie.secure}`);
      console.log(`  HttpOnly: ${cookie.httpOnly}`);
      console.log(`  SameSite: ${cookie.sameSite}`);
      console.log(`  Expires: ${new Date(cookie.expires * 1000).toISOString()}`);
    });
    
    console.log('\n📍 Step 4: Storage Analysis');
    console.log('=' .repeat(50));
    
    const storageData = await page.evaluate(() => {
      const localStorage = {};
      const sessionStorage = {};
      
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key.includes('supabase') || key.includes('auth')) {
          localStorage[key] = window.localStorage.getItem(key);
        }
      }
      
      for (let i = 0; i < window.sessionStorage.length; i++) {
        const key = window.sessionStorage.key(i);
        if (key.includes('supabase') || key.includes('auth')) {
          sessionStorage[key] = window.sessionStorage.getItem(key);
        }
      }
      
      return { localStorage, sessionStorage };
    });
    
    console.log('LocalStorage items:', Object.keys(storageData.localStorage).length);
    Object.entries(storageData.localStorage).forEach(([key, value]) => {
      console.log(`  - ${key}: ${value.substring(0, 50)}...`);
    });
    
    console.log('\nSessionStorage items:', Object.keys(storageData.sessionStorage).length);
    Object.entries(storageData.sessionStorage).forEach(([key, value]) => {
      console.log(`  - ${key}: ${value.substring(0, 50)}...`);
    });
    
    console.log('\n📍 Step 5: API Request Headers');
    console.log('=' .repeat(50));
    
    // Make an API request to see headers
    const apiHeaders = await page.evaluate(async () => {
      const response = await fetch('/api/auth/session', {
        credentials: 'include'
      });
      return {
        sentCookies: document.cookie,
        responseStatus: response.status
      };
    });
    
    console.log('Cookies sent with API request:', apiHeaders.sentCookies || 'NONE');
    console.log('API response status:', apiHeaders.responseStatus);
    
    console.log('\n📍 Step 6: Cross-Domain Cookie Test');
    console.log('=' .repeat(50));
    
    // Check if cookies work on subdomain
    const domain = new URL(page.url()).hostname;
    console.log('Current domain:', domain);
    
    const cookieDomains = [...new Set(postLoginCookies.map(c => c.domain))];
    console.log('Cookie domains:', cookieDomains);
    
    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('🔍 COOKIE ANALYSIS SUMMARY');
    console.log('='.repeat(70));
    
    console.log(`\n✅ Total cookies: ${postLoginCookies.length}`);
    console.log(`🔐 Auth cookies: ${authCookies.length}`);
    console.log(`📦 LocalStorage auth items: ${Object.keys(storageData.localStorage).length}`);
    console.log(`🗂️ SessionStorage auth items: ${Object.keys(storageData.sessionStorage).length}`);
    
    const hasSufficientAuth = 
      authCookies.length > 0 || 
      Object.keys(storageData.localStorage).length > 0;
    
    console.log(`\n🎯 Authentication data present: ${hasSufficientAuth ? 'YES' : 'NO'}`);
    
    if (!hasSufficientAuth) {
      console.log('\n⚠️  CRITICAL: No authentication data is being stored!');
      console.log('This explains why sessions don\'t persist.');
    }
    
    console.log('\n⏸️  Browser stays open. Press Ctrl+C to close.\n');
    await new Promise(() => {});
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

// Run test
testCookieAnalysis().catch(console.error);