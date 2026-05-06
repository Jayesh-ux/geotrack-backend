// test_api.js
const https = require('https');

function makeRequest(url, options) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function test() {
  try {
    // 1. Login
    console.log('1. Logging in as admin@test.com...');
    const loginRes = await makeRequest('https://geotrack-backend-f66i.onrender.com/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@test.com', password: 'admin123' })
    });
    
    if (loginRes.status !== 200) {
      console.log('Login failed:', loginRes.status, loginRes.body);
      return;
    }
    
    const token = loginRes.body.token;
    console.log('Login success, token:', token.substring(0, 30) + '...');
    
    // 2. Get clients
    console.log('\n2. Getting clients...');
    const clientsRes = await makeRequest('https://geotrack-backend-f66i.onrender.com/admin/clients?limit=5', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('Clients status:', clientsRes.status);
    if (clientsRes.status === 200) {
      console.log('Clients count:', clientsRes.body.clients?.length || 0);
      if (clientsRes.body.clients?.length > 0) {
        console.log('First client:', clientsRes.body.clients[0].name, clientsRes.body.clients[0].latitude, clientsRes.body.clients[0].longitude);
      }
    } else {
      console.log('Error:', clientsRes.body);
    }
    
    // 3. Test profiles endpoint
    console.log('\n3. Testing profiles...');
    const profileRes = await makeRequest('https://geotrack-backend-f66i.onrender.com/admin/users?limit=2', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('Users status:', profileRes.status);
    if (profileRes.status === 200 && profileRes.body.users?.length > 0) {
      console.log('First user:', profileRes.body.users[0].email, '| created_at:', profileRes.body.users[0].created_at);
    }
    
  } catch (e) {
    console.error('Error:', e.message);
  }
}

test();
