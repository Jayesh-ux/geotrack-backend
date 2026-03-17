import axios from 'axios';

const BASE_URL = 'http://localhost:5000';

async function testAgentClients() {
  try {
    console.log("Attempting to login as agent@test.com...");
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'agent@test.com',
      password: 'password123'
    });
    
    const token = loginRes.data.token;
    console.log("Login successful. Token acquired.");

    console.log("\nFetching clients...");
    const clientsRes = await axios.get(`${BASE_URL}/clients`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log("Clients Response Status:", clientsRes.status);
    console.log("User Pincode:", clientsRes.data.userPincode);
    console.log("Filtered by Pincode:", clientsRes.data.filteredByPincode);
    console.log("Search Mode:", clientsRes.data.searchMode);
    console.log(`Found ${clientsRes.data.clients.length} clients.`);
    
    if (clientsRes.data.clients.length > 0) {
        console.log("\nFirst Client:", JSON.stringify(clientsRes.data.clients[0], null, 2));
    } else {
        console.log("\nMessage:", clientsRes.data.message);
    }

  } catch (err) {
    console.error("Test failed:", err.response?.data || err.message);
  }
}

testAgentClients();
