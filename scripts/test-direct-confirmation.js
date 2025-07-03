const https = require('https');

// Test what happens when we hit the Supabase confirmation URL directly
const confirmationUrl = 'https://aaplsgskmoeyvvedjzxp.supabase.co/auth/v1/verify?token=pkce_963e0390403f4efd0c2a07cc262ca9448a43e45a74778e9151076f91&type=signup&redirect_to=https://replyguy.appendment.com/auth/callback';

console.log('Testing Supabase confirmation redirect...\n');
console.log('URL:', confirmationUrl);

// Follow redirects manually to see what's happening
function followRedirects(url, depth = 0) {
  if (depth > 5) {
    console.log('Too many redirects!');
    return;
  }

  https.get(url, { 
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  }, (res) => {
    console.log(`\n[Redirect ${depth}]`);
    console.log('Status:', res.statusCode);
    console.log('Location:', res.headers.location || 'No redirect');
    
    // Log all headers
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      console.log('Following redirect to:', res.headers.location);
      followRedirects(res.headers.location, depth + 1);
    } else {
      console.log('\nFinal destination reached or no more redirects');
    }
  }).on('error', (err) => {
    console.error('Error:', err.message);
  });
}

followRedirects(confirmationUrl);