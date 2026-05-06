const https = require('https');

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function main() {
  try {
    // Try signup first
    const signupData = JSON.stringify({
      email: 'admin@test.com',
      password: 'test123',
      companyName: 'Test Company',
      fullName: 'Test Admin',
      isAdmin: true
    });
    
    const signupOptions = {
      hostname: 'geotrack-backend-f66i.onrender.com',
      path: '/auth/signup',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(signupData)
      }
    };
    
    console.log('Trying signup...');
    const signupRes = await makeRequest(signupOptions, signupData);
    console.log('Signup response:', signupRes.body);
    
    // Then login
    const loginData = JSON.stringify({
      email: 'admin@test.com',
      password: 'test123'
    });
    
    const loginOptions = {
      hostname: 'geotrack-backend-f66i.onrender.com',
      path: '/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginData)
      }
    };
    
    console.log('\nTrying login...');
    const loginRes = await makeRequest(loginOptions, loginData);
    console.log('Login response:', loginRes.body);
    
    const loginBody = JSON.parse(loginRes.body);
    const token = loginRes.headers['authorization'] || loginBody.token;
    
    if (!token) {
      console.log('❌ Login failed');
      return;
    }
    
    console.log('\n✅ Logged in, checking schema...');
    
    // Check schema
    const sql = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'location_logs' 
      ORDER BY ordinal_position;
    `;
    
    const sqlData = JSON.stringify({ sql });
    
    const sqlOptions = {
      hostname: 'geotrack-backend-f66i.onrender.com',
      path: '/api/admin/run-sql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(sqlData),
        'Authorization': token
      }
    };
    
    const sqlRes = await makeRequest(sqlOptions, sqlData);
    console.log('\n📋 Location_logs columns:');
    console.log(sqlRes.body);
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

main();
