const puppeteer = require('puppeteer');

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testAllAccountsFinal() {
  console.log('🎯 Final Comprehensive Authentication Test\n');
  console.log('Test Started:', new Date().toISOString());
  console.log('=' .repeat(80) + '\n');
  
  const accounts = [
    { email: 'test-free@replyguy.com', password: 'TestFree123!', tier: 'Free' },
    { email: 'test-basic@replyguy.com', password: 'TestBasic123!', tier: 'X Basic' },
    { email: 'test-pro@replyguy.com', password: 'TestPro123!', tier: 'X Pro' },
    { email: 'test-business@replyguy.com', password: 'TestBusiness123!', tier: 'X Business' }
  ];
  
  let browser;
  const results = {
    accounts: {},
    summary: {
      totalTested: 0,
      successful: 0,
      failed: 0
    }
  };
  
  try {
    browser = await puppeteer.launch({ 
      headless: false,
      devtools: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    for (const account of accounts) {
      console.log(`\n${'='.repeat(70)}`);
      console.log(`📍 Testing ${account.tier} Account`);
      console.log(`${'='.repeat(70)}`);
      
      const page = await browser.newPage();
      const accountResult = {
        tier: account.tier,
        email: account.email,
        login: 'pending',
        cookies: 0,
        session: false,
        dashboard: false,
        apiAccess: {},
        errors: []
      };
      
      try {
        // Track 401 errors
        let errors401 = 0;
        page.on('response', response => {
          if (response.status() === 401) {
            errors401++;
          }
        });
        
        // Login
        console.log('\n1️⃣ Logging in...');
        await page.goto('https://replyguy.appendment.com/auth/login', {
          waitUntil: 'networkidle2'
        });
        
        await page.waitForSelector('input[type="email"]');
        await page.type('input[type="email"]', account.email);
        await page.type('input[type="password"]', account.password);
        
        const signInButton = await page.evaluateHandle(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          return buttons.find(btn => btn.textContent.includes('Sign'));
        });
        
        await signInButton.click();
        await delay(5000);
        
        const afterLoginUrl = page.url();
        console.log('   After login URL:', afterLoginUrl);
        
        // Check cookies
        const cookies = await page.cookies();
        const authCookies = cookies.filter(c => c.name.includes('sb-') || c.name.includes('auth'));
        accountResult.cookies = authCookies.length;
        console.log(`   Auth cookies: ${authCookies.length}`);
        
        // Check session
        console.log('\n2️⃣ Checking session...');
        const sessionCheck = await page.evaluate(async () => {
          try {
            const response = await fetch('/api/auth/session');
            const data = await response.json();
            return {
              exists: data.session?.exists || false,
              user: data.session?.user?.email
            };
          } catch {
            return { exists: false };
          }
        });
        
        accountResult.session = sessionCheck.exists;
        console.log(`   Session exists: ${sessionCheck.exists ? 'YES' : 'NO'}`);
        
        if (sessionCheck.user === account.email) {
          console.log(`   ✅ Logged in as: ${sessionCheck.user}`);
          accountResult.login = 'success';
        } else {
          console.log(`   ❌ Login failed`);
          accountResult.login = 'failed';
        }
        
        // Test dashboard access
        console.log('\n3️⃣ Testing dashboard access...');
        await page.goto('https://replyguy.appendment.com/dashboard', {
          waitUntil: 'networkidle2'
        });
        
        const dashboardUrl = page.url();
        accountResult.dashboard = dashboardUrl.includes('/dashboard');
        console.log(`   Dashboard accessible: ${accountResult.dashboard ? 'YES' : 'NO'}`);
        
        // Test API access
        console.log('\n4️⃣ Testing API access...');
        const apiTest = await page.evaluate(async () => {
          const results = {};
          const endpoints = ['/api/user/usage', '/api/stripe/products'];
          
          for (const endpoint of endpoints) {
            try {
              const response = await fetch(endpoint);
              results[endpoint] = {
                status: response.status,
                ok: response.ok
              };
            } catch (error) {
              results[endpoint] = { error: error.message };
            }
          }
          
          return results;
        });
        
        Object.entries(apiTest).forEach(([endpoint, result]) => {
          console.log(`   ${endpoint}: ${result.status || 'ERROR'} ${result.ok ? '✅' : '❌'}`);
          accountResult.apiAccess[endpoint] = result;
        });
        
        // Check plan features
        if (accountResult.dashboard) {
          console.log('\n5️⃣ Checking plan features...');
          const planFeatures = await page.evaluate(() => {
            const bodyText = document.body.textContent;
            return {
              showsPlan: bodyText.includes('Plan') || bodyText.includes('tier'),
              showsUsage: bodyText.includes('replies') || bodyText.includes('usage'),
              hasMemeOption: bodyText.includes('meme') || bodyText.includes('Meme')
            };
          });
          
          console.log(`   Shows plan: ${planFeatures.showsPlan ? 'YES' : 'NO'}`);
          console.log(`   Shows usage: ${planFeatures.showsUsage ? 'YES' : 'NO'}`);
          console.log(`   Has meme option: ${planFeatures.hasMemeOption ? 'YES' : 'NO'}`);
        }
        
        // Summary for this account
        const success = accountResult.login === 'success' && 
                       accountResult.session && 
                       accountResult.dashboard &&
                       errors401 === 0;
        
        console.log(`\n✅ Summary for ${account.tier}:`);
        console.log(`   Login: ${accountResult.login}`);
        console.log(`   Cookies: ${accountResult.cookies}`);
        console.log(`   Session: ${accountResult.session ? 'YES' : 'NO'}`);
        console.log(`   Dashboard: ${accountResult.dashboard ? 'YES' : 'NO'}`);
        console.log(`   401 Errors: ${errors401}`);
        console.log(`   Overall: ${success ? '✅ PASSED' : '❌ FAILED'}`);
        
        results.accounts[account.tier] = accountResult;
        results.summary.totalTested++;
        if (success) {
          results.summary.successful++;
        } else {
          results.summary.failed++;
        }
        
      } catch (error) {
        console.error(`❌ Error testing ${account.tier}:`, error.message);
        accountResult.errors.push(error.message);
        results.accounts[account.tier] = accountResult;
        results.summary.totalTested++;
        results.summary.failed++;
      }
      
      await page.close();
    }
    
    // Final Report
    console.log('\n' + '='.repeat(80));
    console.log('📊 FINAL AUTHENTICATION TEST REPORT');
    console.log('='.repeat(80));
    
    console.log('\n📈 Overall Statistics:');
    console.log(`   Total Accounts Tested: ${results.summary.totalTested}`);
    console.log(`   Successful: ${results.summary.successful}`);
    console.log(`   Failed: ${results.summary.failed}`);
    console.log(`   Success Rate: ${(results.summary.successful / results.summary.totalTested * 100).toFixed(1)}%`);
    
    console.log('\n📋 Account Details:');
    Object.entries(results.accounts).forEach(([tier, result]) => {
      const status = result.login === 'success' && result.session && result.dashboard;
      console.log(`\n   ${tier}:`);
      console.log(`     Email: ${result.email}`);
      console.log(`     Status: ${status ? '✅ WORKING' : '❌ FAILED'}`);
      console.log(`     Cookies: ${result.cookies}`);
      console.log(`     Session: ${result.session ? 'YES' : 'NO'}`);
      console.log(`     Dashboard: ${result.dashboard ? 'YES' : 'NO'}`);
    });
    
    console.log('\n🔍 Key Findings:');
    
    // Check if authentication is working
    if (results.summary.successful === results.summary.totalTested) {
      console.log('   ✅ All accounts can authenticate successfully');
      console.log('   ✅ Cookie-based authentication is working');
      console.log('   ✅ Sessions persist correctly');
      console.log('   ✅ Protected routes are accessible');
    } else {
      console.log('   ❌ Some accounts failing to authenticate');
      const failedAccounts = Object.entries(results.accounts)
        .filter(([_, result]) => result.login !== 'success')
        .map(([tier]) => tier);
      console.log(`   ❌ Failed accounts: ${failedAccounts.join(', ')}`);
    }
    
    // API status
    const apiIssues = Object.values(results.accounts).some(account => 
      Object.values(account.apiAccess).some(api => !api.ok)
    );
    
    if (apiIssues) {
      console.log('   ⚠️  Some API endpoints returning errors');
    } else {
      console.log('   ✅ API endpoints accessible');
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('🎯 AUTHENTICATION STATUS:', 
      results.summary.successful === results.summary.totalTested ? 
      '✅ FULLY FUNCTIONAL' : '❌ PARTIALLY WORKING'
    );
    console.log('='.repeat(80));
    
    // Save results
    const fs = require('fs');
    fs.writeFileSync('final-auth-test-results.json', JSON.stringify(results, null, 2));
    console.log('\nDetailed results saved to: final-auth-test-results.json');
    
  } catch (error) {
    console.error('❌ Test suite error:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run test
testAllAccountsFinal().catch(console.error);