#!/usr/bin/env node

// Test if the ! is causing issues
const passwords = [
  'Fun4Life!',
  'Fun4Life',
  'Fun4Life123'
];

console.log('Testing password encoding:\n');

passwords.forEach(pwd => {
  const params = new URLSearchParams({
    username: 'mikeappendment',
    password: pwd,
    text: 'test'
  });
  
  console.log(`Password: ${pwd}`);
  console.log(`Encoded: ${params.toString()}`);
  console.log(`Contains %21: ${params.toString().includes('%21')}`);
  console.log('---');
});