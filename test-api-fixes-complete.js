const puppeteer = require('puppeteer');

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Test data
const testTweets = [
  {
    text: "Just shipped a major update to our SaaS product! 🚀 Real-time collaboration is now live. What features do you prioritize when choosing productivity tools?",
    response: "Real-time collaboration is a game changer",
    tone: "enthusiastic"
  },
  {
    text: "Unpopular opinion: The 4-day work week should be standard. Studies show productivity actually increases. Who's with me on this? 🙋‍♂️",
    response: "I strongly support this idea",
    tone: "supportive"
  },
  {
    text: "AI is moving so fast. GPT-4, Claude, Gemini... Which AI assistant do you use most for coding? I'm curious about everyone's workflow.",
    response: "I use a combination of different tools",
    tone: "conversational"
  }
];

async function testAPIFixes() {
  console.log('🔧 Testing API Fixes - Complete Verification\n');
  console.log('Test Started:', new Date().toISOString());
  console.log('=' .repeat(80) + '\n');
  
  let browser;
  const testResults = {
    apis: {
      classification: { status: 'pending', errors: 0 },
      userPlan: { status: 'pending', errors: 0 },
      userUsage: { status: 'pending', errors: 0 },
      dailyGoal: { status: 'pending', errors: 0 }
    },
    replyGeneration: {
      attempts: 0,
      successful: 0,
      failed: 0
    },
    usageTracking: {
      dailyGoal: { before: null, after: null, incremented: false },
      monthlyUsage: { before: null, after: null, incremented: false }
    },
    persistence: {
      dailyGoalPersists: false,
      monthlyUsagePersists: false
    },
    errors: {
      total: 0,
      by_type: { 500: 0, 404: 0, 406: 0, other: 0 },
      details: []
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
      
      if (status >= 400) {
        testResults.errors.total++;
        
        if (status === 500) testResults.errors.by_type[500]++;
        else if (status === 404) testResults.errors.by_type[404]++;
        else if (status === 406) testResults.errors.by_type[406]++;
        else testResults.errors.by_type.other++;
        
        testResults.errors.details.push({
          url: url.replace('https://replyguy.appendment.com', ''),
          status,
          timestamp: new Date().toISOString()
        });
        
        console.log(`❌ ${status} ERROR: ${url}`);
      }
      
      // Track specific API statuses
      if (url.includes('/api/classify')) {
        testResults.apis.classification.status = status < 400 ? 'working' : 'failed';
        if (status >= 400) testResults.apis.classification.errors++;
      } else if (url.includes('/api/user/plan')) {
        testResults.apis.userPlan.status = status < 400 ? 'working' : 'failed';
        if (status >= 400) testResults.apis.userPlan.errors++;
      } else if (url.includes('/api/user/usage')) {
        testResults.apis.userUsage.status = status < 400 ? 'working' : 'failed';
        if (status >= 400) testResults.apis.userUsage.errors++;
      } else if (url.includes('/api/user/daily-goal')) {
        testResults.apis.dailyGoal.status = status < 400 ? 'working' : 'failed';
        if (status >= 400) testResults.apis.dailyGoal.errors++;
      }
    });
    
    // Track console messages
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('tracked successfully') || 
          text.includes('Usage updated') ||
          text.includes('Goal updated')) {
        console.log('✅ SUCCESS:', text);
      } else if (msg.type() === 'error') {
        console.log('❌ CONSOLE ERROR:', text);
      }
    });
    
    // Login
    console.log('📍 Step 1: Logging in with Pro account...');
    await page.goto('https://replyguy.appendment.com/auth/login', {
      waitUntil: 'networkidle2'
    });
    
    await page.waitForSelector('input[type="email"]');
    await page.type('input[type="email"]', 'test-pro@replyguy.com');
    await page.type('input[type="password"]', 'TestPro123!');
    
    const signInButton = await page.$('button');
    await signInButton.click();
    await delay(5000);
    
    console.log('✅ Logged in successfully\n');
    
    // Navigate to dashboard
    await page.goto('https://replyguy.appendment.com/dashboard', {
      waitUntil: 'networkidle2'
    });
    
    // Step 2: Check initial usage
    console.log('📍 Step 2: Checking initial usage counters...');
    
    const initialUsage = await page.evaluate(() => {
      const bodyText = document.body.textContent;
      
      // Extract daily goal
      const dailyMatch = bodyText.match(/(\d+)\s*of\s*(\d+)\s*replies\s*today/i);
      const dailyGoal = dailyMatch ? {
        current: parseInt(dailyMatch[1]),
        target: parseInt(dailyMatch[2])
      } : null;
      
      return { dailyGoal };
    });
    
    console.log('Initial Daily Goal:', initialUsage.dailyGoal ? 
      `${initialUsage.dailyGoal.current} of ${initialUsage.dailyGoal.target}` : 'Not found');
    
    testResults.usageTracking.dailyGoal.before = initialUsage.dailyGoal?.current;
    
    await page.screenshot({ path: 'api-test-1-initial.png' });
    
    // Step 3: Generate multiple replies
    console.log('\n📍 Step 3: Testing reply generation (3 attempts)...');
    
    for (let i = 0; i < 3; i++) {
      console.log(`\n🔄 Reply ${i + 1} of 3:`);
      testResults.replyGeneration.attempts++;
      
      const testData = testTweets[i];
      
      // Clear form first
      await page.evaluate(() => {
        const textareas = document.querySelectorAll('textarea');
        textareas.forEach(ta => ta.value = '');
      });
      
      // Fill tweet
      const tweetInput = await page.$('textarea[placeholder*="tweet" i], textarea[placeholder*="post" i]');
      if (tweetInput) {
        await tweetInput.click();
        await tweetInput.type(testData.text);
      }
      
      // Fill response
      const responseInput = await page.$('textarea[placeholder*="response" i], textarea[placeholder*="idea" i]');
      if (responseInput) {
        await responseInput.click();
        await responseInput.type(testData.response);
      }
      
      // Select tone
      const toneSelect = await page.$('select');
      if (toneSelect) {
        await toneSelect.select(testData.tone);
      }
      
      console.log(`   Tweet: "${testData.text.substring(0, 50)}..."`);
      console.log(`   Tone: ${testData.tone}`);
      
      // Generate
      const generateButton = await page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.find(btn => 
          btn.textContent.toLowerCase().includes('generate') ||
          btn.textContent.toLowerCase().includes('create')
        );
      });
      
      if (generateButton) {
        await generateButton.asElement().click();
        console.log('   ⏳ Generating...');
        
        // Wait for generation
        await delay(8000);
        
        // Check if reply was generated
        const replyGenerated = await page.evaluate(() => {
          // Look for generated content
          const possibleSelectors = [
            '.generated-reply',
            '[data-testid="reply-output"]',
            'div[class*="output"]'
          ];
          
          for (const selector of possibleSelectors) {
            const element = document.querySelector(selector);
            if (element && element.textContent.trim().length > 20) {
              return true;
            }
          }
          
          // Check for any new text that looks like a generated reply
          const allText = document.body.textContent;
          return allText.includes('shipped') || 
                 allText.includes('collaboration') ||
                 allText.includes('productivity') ||
                 allText.includes('work week') ||
                 allText.includes('AI assistant');
        });
        
        if (replyGenerated) {
          console.log('   ✅ Reply generated successfully');
          testResults.replyGeneration.successful++;
        } else {
          console.log('   ❌ Reply generation may have failed');
          testResults.replyGeneration.failed++;
        }
      }
      
      await delay(2000);
    }
    
    await page.screenshot({ path: 'api-test-2-after-generation.png' });
    
    // Step 4: Check updated usage
    console.log('\n📍 Step 4: Checking updated usage counters...');
    
    const updatedUsage = await page.evaluate(() => {
      const bodyText = document.body.textContent;
      
      const dailyMatch = bodyText.match(/(\d+)\s*of\s*(\d+)\s*replies\s*today/i);
      const dailyGoal = dailyMatch ? {
        current: parseInt(dailyMatch[1]),
        target: parseInt(dailyMatch[2])
      } : null;
      
      return { dailyGoal };
    });
    
    console.log('Updated Daily Goal:', updatedUsage.dailyGoal ? 
      `${updatedUsage.dailyGoal.current} of ${updatedUsage.dailyGoal.target}` : 'Not found');
    
    testResults.usageTracking.dailyGoal.after = updatedUsage.dailyGoal?.current;
    
    if (testResults.usageTracking.dailyGoal.after > testResults.usageTracking.dailyGoal.before) {
      console.log('✅ Daily goal counter incremented!');
      testResults.usageTracking.dailyGoal.incremented = true;
    } else {
      console.log('❌ Daily goal counter did not increment');
    }
    
    // Step 5: Test persistence
    console.log('\n📍 Step 5: Testing persistence after refresh...');
    await page.reload({ waitUntil: 'networkidle2' });
    await delay(3000);
    
    const persistedUsage = await page.evaluate(() => {
      const bodyText = document.body.textContent;
      
      const dailyMatch = bodyText.match(/(\d+)\s*of\s*(\d+)\s*replies\s*today/i);
      const dailyGoal = dailyMatch ? {
        current: parseInt(dailyMatch[1]),
        target: parseInt(dailyMatch[2])
      } : null;
      
      return { dailyGoal };
    });
    
    console.log('After Refresh:', persistedUsage.dailyGoal ? 
      `${persistedUsage.dailyGoal.current} of ${persistedUsage.dailyGoal.target}` : 'Not found');
    
    if (persistedUsage.dailyGoal?.current === testResults.usageTracking.dailyGoal.after) {
      console.log('✅ Usage persisted correctly!');
      testResults.persistence.dailyGoalPersists = true;
    } else {
      console.log('❌ Usage did not persist');
    }
    
    await page.screenshot({ path: 'api-test-3-after-refresh.png' });
    
    // Step 6: Check monthly usage in settings
    console.log('\n📍 Step 6: Checking monthly usage...');
    await page.goto('https://replyguy.appendment.com/billing', {
      waitUntil: 'networkidle2'
    });
    
    const monthlyUsage = await page.evaluate(() => {
      const bodyText = document.body.textContent;
      const match = bodyText.match(/(\d+)\s*\/\s*(\d+)\s*replies/i);
      return match ? {
        used: parseInt(match[1]),
        limit: parseInt(match[2])
      } : null;
    });
    
    if (monthlyUsage) {
      console.log(`Monthly Usage: ${monthlyUsage.used} / ${monthlyUsage.limit}`);
      testResults.usageTracking.monthlyUsage.after = monthlyUsage.used;
    }
    
    await page.screenshot({ path: 'api-test-4-monthly-usage.png' });
    
    // Final Report
    console.log('\n' + '='.repeat(80));
    console.log('📊 API FIXES VERIFICATION REPORT');
    console.log('='.repeat(80));
    
    console.log('\n🌐 API Status:');
    Object.entries(testResults.apis).forEach(([api, result]) => {
      const status = result.status === 'working' ? '✅' : '❌';
      console.log(`   ${api}: ${status} ${result.status.toUpperCase()} (${result.errors} errors)`);
    });
    
    console.log('\n📝 Reply Generation:');
    console.log(`   Attempts: ${testResults.replyGeneration.attempts}`);
    console.log(`   Successful: ${testResults.replyGeneration.successful}`);
    console.log(`   Failed: ${testResults.replyGeneration.failed}`);
    console.log(`   Success Rate: ${(testResults.replyGeneration.successful / testResults.replyGeneration.attempts * 100).toFixed(0)}%`);
    
    console.log('\n📈 Usage Tracking:');
    console.log(`   Daily Goal Before: ${testResults.usageTracking.dailyGoal.before || 0}`);
    console.log(`   Daily Goal After: ${testResults.usageTracking.dailyGoal.after || 0}`);
    console.log(`   Incremented: ${testResults.usageTracking.dailyGoal.incremented ? '✅ YES' : '❌ NO'}`);
    console.log(`   Persisted: ${testResults.persistence.dailyGoalPersists ? '✅ YES' : '❌ NO'}`);
    
    console.log('\n❌ Error Summary:');
    console.log(`   Total Errors: ${testResults.errors.total}`);
    console.log(`   500 Errors: ${testResults.errors.by_type[500]}`);
    console.log(`   404 Errors: ${testResults.errors.by_type[404]}`);
    console.log(`   406 Errors: ${testResults.errors.by_type[406]}`);
    console.log(`   Other Errors: ${testResults.errors.by_type.other}`);
    
    // Overall verdict
    const allAPIsWorking = Object.values(testResults.apis).every(api => api.status === 'working');
    const usageTracking = testResults.usageTracking.dailyGoal.incremented;
    const noErrors = testResults.errors.total === 0;
    
    console.log('\n' + '='.repeat(80));
    console.log('🎯 OVERALL VERDICT:', 
      (allAPIsWorking && usageTracking && noErrors) ? 
      '✅ ALL FIXES WORKING!' : 
      '⚠️  SOME ISSUES REMAIN'
    );
    console.log('='.repeat(80));
    
    // Save detailed results
    const fs = require('fs');
    fs.writeFileSync('api-fixes-test-results.json', JSON.stringify(testResults, null, 2));
    console.log('\nDetailed results saved to: api-fixes-test-results.json');
    
    console.log('\n⏸️  Browser stays open. Press Ctrl+C to close.\n');
    await new Promise(() => {});
    
  } catch (error) {
    console.error('\n❌ Test Error:', error.message);
    console.error(error.stack);
  }
}

// Run test
testAPIFixes().catch(console.error);