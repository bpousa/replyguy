#!/usr/bin/env node

// Test script to verify environment variables are set correctly

const requiredEnvVars = [
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'PERPLEXITY_API_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_KEY'
];

console.log('Checking environment variables...\n');

let hasErrors = false;

requiredEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    console.error(`❌ ${varName} is not set`);
    hasErrors = true;
  } else {
    const masked = value.substring(0, 5) + '...' + value.substring(value.length - 5);
    console.log(`✅ ${varName} is set (${masked})`);
  }
});

console.log('\nOpenAI API Key specific check:');
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY is missing - this will cause 500 errors in user-style/refine route');
} else if (!process.env.OPENAI_API_KEY.startsWith('sk-')) {
  console.error('❌ OPENAI_API_KEY format seems incorrect (should start with "sk-")');
} else {
  console.log('✅ OPENAI_API_KEY format looks correct');
}

if (hasErrors) {
  console.log('\n⚠️  Some environment variables are missing. Check your .env.local file.');
  process.exit(1);
} else {
  console.log('\n✅ All required environment variables are set!');
}