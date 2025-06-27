// Test the API directly without Puppeteer
const http = require('http');

async function testAPIDirectly() {
  console.log('Testing /api/process directly...\n');
  
  // Simulate the request the dashboard would make
  const requestData = JSON.stringify({
    originalTweet: "Just launched our new AI product!",
    responseIdea: "Congratulations on the launch",
    responseType: "agree",
    tone: "enthusiastic",
    needsResearch: false,
    userId: "test-user-123"
  });

  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/process',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': requestData.length,
      // Simulate the auth cookie
      'Cookie': 'sb-aaplsgskmoeyvvedjzxp-auth-token=base64string.base64string'
    },
    rejectUnauthorized: false
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('Status Code:', res.statusCode);
        console.log('Response Headers:', res.headers);
        console.log('Response Body:', data);
        
        if (res.statusCode === 500) {
          console.log('\n❌ Still getting 500 error!');
        } else if (res.statusCode === 401) {
          console.log('\n⚠️ Authentication failed - middleware rejected the request');
        } else if (res.statusCode === 200) {
          console.log('\n✅ Success! API is working');
        }
        
        resolve();
      });
    });
    
    req.on('error', (error) => {
      console.error('Request Error:', error);
      reject(error);
    });
    
    req.write(requestData);
    req.end();
  });
}

// Run the test
testAPIDirectly().catch(console.error);