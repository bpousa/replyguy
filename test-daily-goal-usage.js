const puppeteer = require('puppeteer');

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Sample tweets for testing
const sampleTweets = [
  "Just launched my new AI startup! We're building the future of customer service with LLMs. Who else is working on AI projects? 🚀",
  "Hot take: Remote work is here to stay. Companies forcing return to office are going to lose their best talent. What do you think?",
  "JavaScript framework fatigue is real. Do we really need another one? Sometimes vanilla JS is all you need 🤷‍♂️",
  "Unpopular opinion: 10x engineers do exist, but they're not who you think. They're the ones who make everyone around them better.",
  "The best career advice I ever got: 'Your network is your net worth.' Started taking coffee chats seriously and it changed everything."
];

const responseIdeas = [
  "Congratulations on the launch!",
  "I completely agree with this perspective",
  "This is such an important point",
  "Thanks for sharing this insight",
  "Interesting take on this topic"
];

async function testDailyGoalUsage() {
  console.log('📊 Testing Daily Goal & Usage Tracking\n');
  console.log('Test Started:', new Date().toISOString());
  console.log('=' .repeat(80) + '\n');
  
  let browser;
  const testResults = {
    dailyGoal: {
      defaultValue: null,
      afterReply: null,
      afterRefresh: null,
      persisted: false
    },
    monthlyUsage: {
      initial: null,
      afterReply: null,
      afterRefresh: null,
      persisted: false
    },
    replyGeneration: {
      success: false,
      errors: []
    },
    consoleErrors: [],
    warnings: []
  };
  
  try {
    browser = await puppeteer.launch({ 
      headless: false,
      devtools: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Capture console logs and errors
    page.on('console', msg => {
      const text = msg.text();
      const type = msg.type();
      
      if (type === 'error') {
        testResults.consoleErrors.push(text);
        console.log('❌ CONSOLE ERROR:', text);
      } else if (type === 'warning') {
        testResults.warnings.push(text);
        console.log('⚠️  WARNING:', text);
      } else if (text.includes('usage') || text.includes('goal') || text.includes('tracked')) {
        console.log('📝 LOG:', text);
      }
    });
    
    page.on('pageerror', error => {
      testResults.consoleErrors.push(error.message);
      console.log('❌ PAGE ERROR:', error.message);
    });
    
    // Test with Pro account (has higher limits)
    const account = {
      email: 'test-pro@replyguy.com',
      password: 'TestPro123!'
    };
    
    // Step 1: Login
    console.log('📍 Step 1: Logging in...');
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
    
    console.log('✅ Logged in successfully\n');
    
    // Step 2: Check default daily goal
    console.log('📍 Step 2: Checking default daily goal...');
    await page.goto('https://replyguy.appendment.com/dashboard', {
      waitUntil: 'networkidle2'
    });
    
    await delay(2000);
    
    const initialGoalInfo = await page.evaluate(() => {
      const goalText = document.body.textContent;
      const match = goalText.match(/(\d+)\s*of\s*(\d+)\s*replies/i);
      if (match) {
        return {
          current: parseInt(match[1]),
          target: parseInt(match[2]),
          text: match[0]
        };
      }
      return null;
    });
    
    if (initialGoalInfo) {
      console.log(`Daily Goal: ${initialGoalInfo.current} of ${initialGoalInfo.target} replies`);
      testResults.dailyGoal.defaultValue = initialGoalInfo.target;
    } else {
      console.log('⚠️  Could not find daily goal display');
    }
    
    await page.screenshot({ path: 'usage-test-1-initial-goal.png' });
    
    // Step 3: Generate a reply
    console.log('\n📍 Step 3: Generating a test reply...');
    
    // Fill in tweet
    const tweetTextarea = await page.$('textarea[placeholder*="tweet" i], textarea[placeholder*="post" i]');
    if (tweetTextarea) {
      await tweetTextarea.click();
      await tweetTextarea.type(sampleTweets[0]);
      console.log('✅ Tweet entered');
    }
    
    // Fill in response idea
    const responseTextarea = await page.$('textarea[placeholder*="response" i], textarea[placeholder*="idea" i]');
    if (responseTextarea) {
      await responseTextarea.click();
      await responseTextarea.type(responseIdeas[0]);
      console.log('✅ Response idea entered');
    }
    
    // Select tone
    const toneSelect = await page.$('select');
    if (toneSelect) {
      await toneSelect.select('supportive');
      console.log('✅ Tone selected: supportive');
    }
    
    await page.screenshot({ path: 'usage-test-2-form-filled.png' });
    
    // Generate reply
    console.log('\nGenerating reply...');
    const generateButton = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => 
        btn.textContent.toLowerCase().includes('generate') ||
        btn.textContent.toLowerCase().includes('create')
      );
    });
    
    if (generateButton) {
      await generateButton.click();
      console.log('⏳ Waiting for reply generation...');
      
      // Wait for reply to appear
      await delay(10000);
      
      // Check if reply was generated
      const replyGenerated = await page.evaluate(() => {
        const possibleSelectors = [
          '[data-testid="reply-output"]',
          '.reply-output',
          'div[class*="output"]',
          'div[class*="result"]'
        ];
        
        for (const selector of possibleSelectors) {
          const element = document.querySelector(selector);
          if (element && element.textContent.length > 20) {
            return true;
          }
        }
        
        // Check if there's new text that looks like a reply
        const bodyText = document.body.textContent;
        return bodyText.includes('Great to see another AI') || 
               bodyText.includes('Congrat') ||
               bodyText.includes('launch');
      });
      
      if (replyGenerated) {
        console.log('✅ Reply generated successfully');
        testResults.replyGeneration.success = true;
      } else {
        console.log('❌ Reply generation may have failed');
      }
      
      await page.screenshot({ path: 'usage-test-3-reply-generated.png' });
    }
    
    // Step 4: Check updated daily goal
    console.log('\n📍 Step 4: Checking updated daily goal...');
    await delay(2000);
    
    const updatedGoalInfo = await page.evaluate(() => {
      const goalText = document.body.textContent;
      const match = goalText.match(/(\d+)\s*of\s*(\d+)\s*replies/i);
      if (match) {
        return {
          current: parseInt(match[1]),
          target: parseInt(match[2]),
          text: match[0]
        };
      }
      return null;
    });
    
    if (updatedGoalInfo) {
      console.log(`Updated Goal: ${updatedGoalInfo.current} of ${updatedGoalInfo.target} replies`);
      testResults.dailyGoal.afterReply = updatedGoalInfo.current;
      
      if (updatedGoalInfo.current > (initialGoalInfo?.current || 0)) {
        console.log('✅ Daily goal counter increased!');
      } else {
        console.log('⚠️  Daily goal counter did not increase');
      }
    }
    
    // Step 5: Refresh and check persistence
    console.log('\n📍 Step 5: Testing daily goal persistence...');
    console.log('Refreshing page...');
    
    await page.reload({ waitUntil: 'networkidle2' });
    await delay(3000);
    
    const refreshedGoalInfo = await page.evaluate(() => {
      const goalText = document.body.textContent;
      const match = goalText.match(/(\d+)\s*of\s*(\d+)\s*replies/i);
      if (match) {
        return {
          current: parseInt(match[1]),
          target: parseInt(match[2]),
          text: match[0]
        };
      }
      return null;
    });
    
    if (refreshedGoalInfo) {
      console.log(`After Refresh: ${refreshedGoalInfo.current} of ${refreshedGoalInfo.target} replies`);
      testResults.dailyGoal.afterRefresh = refreshedGoalInfo.current;
      
      if (refreshedGoalInfo.current === updatedGoalInfo?.current) {
        console.log('✅ Daily goal persisted after refresh!');
        testResults.dailyGoal.persisted = true;
      } else {
        console.log('❌ Daily goal did not persist');
        testResults.dailyGoal.persisted = false;
      }
    }
    
    await page.screenshot({ path: 'usage-test-4-after-refresh.png' });
    
    // Step 6: Check monthly usage in settings
    console.log('\n📍 Step 6: Checking monthly usage in settings...');
    
    // Navigate to settings/billing
    const settingsLink = await page.$('a[href*="settings"], a[href*="billing"]');
    if (settingsLink) {
      await settingsLink.click();
      await delay(3000);
    } else {
      await page.goto('https://replyguy.appendment.com/billing', {
        waitUntil: 'networkidle2'
      });
    }
    
    // Look for monthly usage
    const monthlyUsage = await page.evaluate(() => {
      const bodyText = document.body.textContent;
      
      // Look for patterns like "X / Y replies this month"
      const patterns = [
        /(\d+)\s*\/\s*(\d+)\s*replies/i,
        /(\d+)\s*of\s*(\d+)\s*replies/i,
        /replies.*?(\d+)\s*\/\s*(\d+)/i,
        /used.*?(\d+).*?of.*?(\d+)/i
      ];
      
      for (const pattern of patterns) {
        const match = bodyText.match(pattern);
        if (match) {
          return {
            used: parseInt(match[1]),
            limit: parseInt(match[2]),
            text: match[0]
          };
        }
      }
      
      // Also check for just a number that might be usage
      const usageMatch = bodyText.match(/replies.*?(\d+)/i);
      if (usageMatch) {
        return {
          used: parseInt(usageMatch[1]),
          limit: null,
          text: usageMatch[0]
        };
      }
      
      return null;
    });
    
    if (monthlyUsage) {
      console.log(`Monthly Usage: ${monthlyUsage.used}${monthlyUsage.limit ? ` / ${monthlyUsage.limit}` : ''} replies`);
      testResults.monthlyUsage.initial = monthlyUsage.used;
    } else {
      console.log('⚠️  Could not find monthly usage display');
    }
    
    await page.screenshot({ path: 'usage-test-5-settings.png' });
    
    // Step 7: Refresh settings page
    console.log('\n📍 Step 7: Testing monthly usage persistence...');
    console.log('Refreshing settings page...');
    
    await page.reload({ waitUntil: 'networkidle2' });
    await delay(3000);
    
    const refreshedMonthlyUsage = await page.evaluate(() => {
      const bodyText = document.body.textContent;
      const patterns = [
        /(\d+)\s*\/\s*(\d+)\s*replies/i,
        /(\d+)\s*of\s*(\d+)\s*replies/i,
        /replies.*?(\d+)\s*\/\s*(\d+)/i
      ];
      
      for (const pattern of patterns) {
        const match = bodyText.match(pattern);
        if (match) {
          return {
            used: parseInt(match[1]),
            limit: parseInt(match[2])
          };
        }
      }
      return null;
    });
    
    if (refreshedMonthlyUsage) {
      console.log(`After Refresh: ${refreshedMonthlyUsage.used} / ${refreshedMonthlyUsage.limit} replies`);
      testResults.monthlyUsage.afterRefresh = refreshedMonthlyUsage.used;
      
      if (refreshedMonthlyUsage.used === monthlyUsage?.used) {
        console.log('✅ Monthly usage persisted!');
        testResults.monthlyUsage.persisted = true;
      } else {
        console.log('❌ Monthly usage changed after refresh');
      }
    }
    
    // Final Report
    console.log('\n' + '='.repeat(80));
    console.log('📊 DAILY GOAL & USAGE TRACKING TEST RESULTS');
    console.log('='.repeat(80));
    
    console.log('\n📅 Daily Goal:');
    console.log(`   Default Value: ${testResults.dailyGoal.defaultValue || 'Not found'}`);
    console.log(`   After Reply: ${testResults.dailyGoal.afterReply || 'Not found'}`);
    console.log(`   After Refresh: ${testResults.dailyGoal.afterRefresh || 'Not found'}`);
    console.log(`   Persistence: ${testResults.dailyGoal.persisted ? '✅ YES' : '❌ NO'}`);
    
    console.log('\n📈 Monthly Usage:');
    console.log(`   Initial: ${testResults.monthlyUsage.initial || 'Not found'}`);
    console.log(`   After Refresh: ${testResults.monthlyUsage.afterRefresh || 'Not found'}`);
    console.log(`   Persistence: ${testResults.monthlyUsage.persisted ? '✅ YES' : '❌ NO'}`);
    
    console.log('\n🎯 Reply Generation:');
    console.log(`   Success: ${testResults.replyGeneration.success ? '✅ YES' : '❌ NO'}`);
    
    console.log('\n⚠️  Console Errors: ' + testResults.consoleErrors.length);
    if (testResults.consoleErrors.length > 0) {
      testResults.consoleErrors.forEach((error, i) => {
        console.log(`   ${i + 1}. ${error}`);
      });
    }
    
    console.log('\n📸 Screenshots saved:');
    console.log('   - usage-test-1-initial-goal.png');
    console.log('   - usage-test-2-form-filled.png');
    console.log('   - usage-test-3-reply-generated.png');
    console.log('   - usage-test-4-after-refresh.png');
    console.log('   - usage-test-5-settings.png');
    
    // Overall assessment
    const allTestsPassed = 
      testResults.dailyGoal.persisted &&
      testResults.monthlyUsage.persisted &&
      testResults.replyGeneration.success &&
      testResults.consoleErrors.length === 0;
    
    console.log('\n' + '='.repeat(80));
    console.log('🎯 OVERALL RESULT:', allTestsPassed ? '✅ ALL TESTS PASSED' : '⚠️  SOME ISSUES FOUND');
    console.log('='.repeat(80));
    
    // Save results
    const fs = require('fs');
    fs.writeFileSync('daily-goal-test-results.json', JSON.stringify(testResults, null, 2));
    console.log('\nDetailed results saved to: daily-goal-test-results.json');
    
    console.log('\n⏸️  Browser stays open. Press Ctrl+C to close.\n');
    await new Promise(() => {});
    
  } catch (error) {
    console.error('\n❌ Test Error:', error.message);
    console.error(error.stack);
  }
}

// Run test
testDailyGoalUsage().catch(console.error);