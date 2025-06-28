#!/usr/bin/env node
/**
 * Test script to verify environment variable encoding
 */

// Test URL encoding of the password
const password = 'Fun4Life!';
const username = 'mikeappendment';

console.log('Testing Imgflip credentials encoding:\n');

console.log('Username:', username);
console.log('Username length:', username.length);
console.log('Username URL encoded:', encodeURIComponent(username));
console.log('');

console.log('Password:', password);
console.log('Password length:', password.length);
console.log('Password URL encoded:', encodeURIComponent(password));
console.log('Password form encoded:', new URLSearchParams({ password }).toString());
console.log('');

// Test with URLSearchParams (what our code uses)
const params = new URLSearchParams({
  username: username,
  password: password,
  text: 'this is fine',
  no_watermark: '1'
});

console.log('URLSearchParams output:');
console.log(params.toString());
console.log('');

// Check if special characters are encoded
console.log('Special character check:');
console.log('Exclamation mark (!) URL encoded:', encodeURIComponent('!'));
console.log('Does URLSearchParams encode !?:', params.toString().includes('%21'));