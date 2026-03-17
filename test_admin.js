import axios from 'axios';

const BASE_URL = 'http://localhost:5000';

async function testAdmin() {
  try {
    console.log("Attempting to login as admin@test.com...");
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@test.com',
      password: 'password123'
    });
    
    const token = loginRes.data.token;
    console.log("Login successful. Token acquired.");

    console.log("\n--- FETCHING CLIENTS ---");
    const clientsRes = await axios.get(`${BASE_URL}/clients`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log("Clients Response Status:", clientsRes.status);
    console.log("Search Mode:", clientsRes.data.searchMode);
    console.log(`Found ${clientsRes.data.clients.length} clients.`);

    console.log("\n--- FETCHING USERS (ADMIN ROUTE) ---");
    const usersRes = await axios.get(`${BASE_URL}/admin/users`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log("Users Response Status:", usersRes.status);
    console.log(`Found ${usersRes.data.users.length} users.`);
    
    if (usersRes.data.users.length > 0) {
        console.log("First User Email:", usersRes.data.users[0].email);
    }

  } catch (err) {
    console.error("Test failed:", err.response?.data || err.message);
  }
}

testAdmin();
