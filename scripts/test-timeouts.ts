import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;
// Use production URL for testing since we can't run dev server in this environment
const API_URL = 'https://replyguy.ai/api/process';

// Test user ID with Write Like Me configured
const TEST_USER_ID = '111c029b-9f52-447d-86cd-1d0ddac565ac';

interface TestCase {
  name: string;
  payload: {
    originalTweet: string;
    responseIdea: string;
    responseType: string;
    tone: string;
    needsResearch: boolean;
    includeMeme: boolean;
    useCustomStyle: boolean;
    userId: string;
  };
}

const testCases: TestCase[] = [
  {
    name: "Basic reply (no features)",
    payload: {
      originalTweet: "The best startups are those where you have a story to tell.",
      responseIdea: "Totally agree! Personal connection drives passion",
      responseType: "agree",
      tone: "witty",
      needsResearch: false,
      includeMeme: false,
      useCustomStyle: false,
      userId: TEST_USER_ID
    }
  },
  {
    name: "Research only",
    payload: {
      originalTweet: "The best startups are those where you have a story to tell.",
      responseIdea: "Totally agree! Personal connection drives passion",
      responseType: "agree",
      tone: "witty",
      needsResearch: true,
      includeMeme: false,
      useCustomStyle: false,
      userId: TEST_USER_ID
    }
  },
  {
    name: "Meme only",
    payload: {
      originalTweet: "The best startups are those where you have a story to tell.",
      responseIdea: "Totally agree! Personal connection drives passion",
      responseType: "agree",
      tone: "witty",
      needsResearch: false,
      includeMeme: true,
      useCustomStyle: false,
      userId: TEST_USER_ID
    }
  },
  {
    name: "Write Like Me only",
    payload: {
      originalTweet: "The best startups are those where you have a story to tell.",
      responseIdea: "Totally agree! Personal connection drives passion",
      responseType: "agree",
      tone: "witty",
      needsResearch: false,
      includeMeme: false,
      useCustomStyle: true,
      userId: TEST_USER_ID
    }
  },
  {
    name: "Research + Meme",
    payload: {
      originalTweet: "The best startups are those where you have a story to tell.",
      responseIdea: "Totally agree! Personal connection drives passion",
      responseType: "agree",
      tone: "witty",
      needsResearch: true,
      includeMeme: true,
      useCustomStyle: false,
      userId: TEST_USER_ID
    }
  },
  {
    name: "Research + Write Like Me",
    payload: {
      originalTweet: "The best startups are those where you have a story to tell.",
      responseIdea: "Totally agree! Personal connection drives passion",
      responseType: "agree",
      tone: "witty",
      needsResearch: true,
      includeMeme: false,
      useCustomStyle: true,
      userId: TEST_USER_ID
    }
  },
  {
    name: "Meme + Write Like Me",
    payload: {
      originalTweet: "The best startups are those where you have a story to tell.",
      responseIdea: "Totally agree! Personal connection drives passion",
      responseType: "agree",
      tone: "witty",
      needsResearch: false,
      includeMeme: true,
      useCustomStyle: true,
      userId: TEST_USER_ID
    }
  },
  {
    name: "All features (Research + Meme + Write Like Me)",
    payload: {
      originalTweet: "The best startups are those where you have a story to tell.",
      responseIdea: "Totally agree! Personal connection drives passion",
      responseType: "agree",
      tone: "witty",
      needsResearch: true,
      includeMeme: true,
      useCustomStyle: true,
      userId: TEST_USER_ID
    }
  }
];

async function runTest(testCase: TestCase) {
  console.log(`\n🧪 Testing: ${testCase.name}`);
  console.log('Features:', {
    research: testCase.payload.needsResearch,
    meme: testCase.payload.includeMeme,
    customStyle: testCase.payload.useCustomStyle
  });
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testCase.payload)
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Failed:', error.error);
      console.error('Details:', error.details);
      return { name: testCase.name, duration, success: false, error: error.error };
    }
    
    const data = await response.json();
    console.log('✅ Success in', duration, 'ms');
    
    // Extract timing breakdown if available
    if (data.data?.generateTimings) {
      console.log('Generation breakdown:', data.data.generateTimings);
    }
    
    // Show costs breakdown
    if (data.costs) {
      console.log('Costs:', {
        classification: data.costs.classification || 0,
        reasoning: data.costs.reasoning || 0,
        perplexity: data.costs.perplexityQuery || 0,
        generation: data.costs.generation || 0,
        total: Object.values(data.costs).reduce((a: number, b: any) => a + (b || 0), 0)
      });
    }
    
    return { 
      name: testCase.name, 
      duration, 
      success: true,
      costs: data.costs,
      generateTimings: data.data?.generateTimings
    };
    
  } catch (error: any) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    console.error('❌ Error:', error.message);
    return { name: testCase.name, duration, success: false, error: error.message };
  }
}

async function main() {
  console.log('🚀 Starting timeout tests...\n');
  console.log('Make sure the dev server is running on http://localhost:3000');
  console.log('Testing with user ID:', TEST_USER_ID);
  
  const results = [];
  
  // Run tests sequentially to avoid rate limits
  for (const testCase of testCases) {
    const result = await runTest(testCase);
    results.push(result);
    
    // Wait a bit between tests to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Summary
  console.log('\n\n📊 SUMMARY OF RESULTS:');
  console.log('='.repeat(80));
  
  const successfulTests = results.filter(r => r.success);
  const failedTests = results.filter(r => !r.success);
  
  console.log('\n✅ Successful tests:');
  successfulTests
    .sort((a, b) => a.duration - b.duration)
    .forEach(r => {
      console.log(`- ${r.name}: ${r.duration}ms`);
      if (r.generateTimings) {
        console.log(`  └─ Generation breakdown: validation=${r.generateTimings.validation}ms, fetch=${r.generateTimings.dataFetching}ms, anthropic=${r.generateTimings.anthropicCall}ms`);
      }
    });
  
  console.log('\n❌ Failed tests:');
  failedTests.forEach(r => {
    console.log(`- ${r.name}: ${r.duration}ms - ${r.error}`);
  });
  
  console.log('\n📈 Performance Analysis:');
  if (successfulTests.length > 0) {
    const avgDuration = successfulTests.reduce((sum, r) => sum + r.duration, 0) / successfulTests.length;
    const minDuration = Math.min(...successfulTests.map(r => r.duration));
    const maxDuration = Math.max(...successfulTests.map(r => r.duration));
    
    console.log(`Average duration: ${Math.round(avgDuration)}ms`);
    console.log(`Fastest: ${minDuration}ms`);
    console.log(`Slowest: ${maxDuration}ms`);
  }
}

// Run the tests
main().catch(console.error);