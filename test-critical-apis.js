const puppeteer = require('puppeteer');

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testCriticalAPIs() {
  console.log('🔍 Testing Critical API Endpoints\n');
  console.log('Test Started:', new Date().toISOString());
  console.log('=' .repeat(80) + '\n');
  
  let browser;
  const errors = [];
  
  try {
    browser = await puppeteer.launch({ 
      headless: false,
      devtools: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Track all errors
    page.on('response', response => {
      const url = response.url();
      const status = response.status();
      
      if (status >= 400) {
        const shortUrl = url.replace('https://replyguy.appendment.com', '')
                           .replace('https://aaplsgskmoeyvvedjzxp.supabase.co', '[SUPABASE]');
        errors.push({ url: shortUrl, status, time: new Date().toISOString() });
        console.log(`❌ ${status} ERROR: ${shortUrl}`);
      }
    });
    
    // Login
    console.log('📍 Step 1: Logging in...');
    await page.goto('https://replyguy.appendment.com/auth/login', {
      waitUntil: 'networkidle2'
    });
    
    await page.waitForSelector('input[type="email"]');
    await page.type('input[type="email"]', 'test-pro@replyguy.com');
    await page.type('input[type="password"]', 'TestPro123!');
    
    const signInButton = await page.$('button');
    await signInButton.click();
    await delay(5000);
    
    console.log('✅ Logged in\n');
    
    // Navigate to dashboard
    console.log('📍 Step 2: Loading dashboard...');
    await page.goto('https://replyguy.appendment.com/dashboard', {
      waitUntil: 'networkidle2'
    });
    await delay(3000);
    
    // Check daily goal
    const dailyGoal = await page.evaluate(() => {
      const bodyText = document.body.textContent;
      const match = bodyText.match(/(\d+)\s*of\s*(\d+)\s*replies\s*today/i);
      return match ? `${match[1]} of ${match[2]}` : 'Not found';
    });
    
    console.log(`Daily Goal: ${dailyGoal}`);
    await page.screenshot({ path: 'critical-test-1-dashboard.png' });
    
    // Try one reply generation
    console.log('\n📍 Step 3: Testing reply generation...');
    
    // Fill form
    const tweetInput = await page.$('textarea[placeholder*="tweet" i], textarea[placeholder*="post" i]');
    if (tweetInput) {
      await tweetInput.click();
      await tweetInput.type('Just launched my new AI startup! What do you think?');
    }
    
    const responseInput = await page.$('textarea[placeholder*="response" i], textarea[placeholder*="idea" i]');
    if (responseInput) {
      await responseInput.click();
      await responseInput.type('Congratulations on the launch');
    }
    
    // Find and click generate button
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
    
    // Check for errors after generation
    const afterGeneration = await page.evaluate(() => {
      const bodyText = document.body.textContent;
      const match = bodyText.match(/(\d+)\s*of\s*(\d+)\s*replies\s*today/i);
      return match ? `${match[1]} of ${match[2]}` : 'Not found';
    });
    
    console.log(`Daily Goal After: ${afterGeneration}`);
    await page.screenshot({ path: 'critical-test-2-after-generation.png' });
    
    // Final report
    console.log('\n' + '='.repeat(80));
    console.log('📊 ERROR SUMMARY');
    console.log('='.repeat(80));
    
    const errorsByType = {};
    errors.forEach(err => {
      errorsByType[err.status] = (errorsByType[err.status] || 0) + 1;
    });
    
    console.log(`\nTotal Errors: ${errors.length}`);
    Object.entries(errorsByType).forEach(([status, count]) => {
      console.log(`  ${status} errors: ${count}`);
    });
    
    console.log('\nDetailed Errors:');
    errors.forEach(err => {
      console.log(`  ${err.status}: ${err.url}`);
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('VERDICT:', errors.length === 0 ? '✅ NO ERRORS FOUND' : '❌ CRITICAL ERRORS DETECTED');
    console.log('='.repeat(80));
    
    // Save error log
    const fs = require('fs');
    fs.writeFileSync('critical-api-errors.json', JSON.stringify({ errors, summary: errorsByType }, null, 2));
    
    console.log('\n⏸️  Browser stays open. Press Ctrl+C to close.\n');
    await new Promise(() => {});
    
  } catch (error) {
    console.error('\n❌ Test Error:', error.message);
  }
}

// Run test
testCriticalAPIs().catch(console.error);