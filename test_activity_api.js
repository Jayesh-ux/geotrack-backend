// test_activity_api.js
import pkg from "pg";
const { Pool } = pkg;
import dotenv from "dotenv";
import https from "https";
import http from "http";

dotenv.config();

const BASE_URL = "https://geotrack-backend-f66i.onrender.com";

function httpsRequest(url, options, body = null) {
    return new Promise((resolve, reject) => {
        const lib = url.startsWith('https') ? https : http;
        const req = lib.request(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(data) });
                } catch {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function testActivity() {
    console.log("==============================================");
    console.log("🌐 TESTING ACTIVITY API");
    console.log("==============================================\n");

    try {
        // 1. Login as admin
        console.log("1️⃣  Login as admin@test.com...");
        const login = await httpsRequest(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { email: 'admin@test.com', password: 'admin123' });

        if (login.status !== 200) {
            console.log(`❌ Login failed: ${login.status}`);
            return;
        }
        const adminToken = login.data.token;
        console.log(`   ✅ Logged in as admin`);

        // 2. Get meetings for admin (showAllAgents=true)
        console.log("\n2️⃣  Fetching meetings for admin (all agents)...");
        const meetings = await httpsRequest(`${BASE_URL}/admin/user-meetings/all`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        console.log(`   Status: ${meetings.status}`);
        if (meetings.data.meetings) {
            console.log(`   Meetings found: ${meetings.data.meetings.length}`);
            meetings.data.meetings.slice(0, 3).forEach(m => {
                console.log(`   - ${m.agentName || 'N/A'}: ${m.status} - ${m.clientName || 'N/A'}`);
            });
        } else {
            console.log(`   Response: ${JSON.stringify(meetings.data).substring(0, 200)}`);
        }

        // 3. Get location logs for admin (showAllAgents=true)
        console.log("\n3️⃣  Fetching location logs for admin (all)...");
        const today = new Date().toISOString().split('T')[0];
        const logs = await httpsRequest(`${BASE_URL}/location-logs?userId=all&startDate=${today}&endDate=${today}&limit=10`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        console.log(`   Status: ${logs.status}`);
        if (logs.data.logs) {
            console.log(`   Logs found: ${logs.data.logs.length}`);
        } else {
            console.log(`   Response: ${JSON.stringify(logs.data).substring(0, 200)}`);
        }

        // 4. Login as agent
        console.log("\n4️⃣  Login as agent@test.com...");
        const agentLogin = await httpsRequest(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { email: 'agent@test.com', password: 'agent123' });

        if (agentLogin.status !== 200) {
            console.log(`❌ Agent login failed: ${agentLogin.status}`);
            return;
        }
        const agentToken = agentLogin.data.token;
        console.log(`   ✅ Logged in as agent`);

        // 5. Get agent's own meetings
        console.log("\n5️⃣  Fetching meetings for agent (own)...");
        const agentMeetings = await httpsRequest(`${BASE_URL}/admin/user-meetings/all`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${agentToken}` }
        });
        console.log(`   Status: ${agentMeetings.status}`);
        if (agentMeetings.data.meetings) {
            console.log(`   Meetings found: ${agentMeetings.data.meetings.length}`);
        }

        // 6. Get agent's own logs
        console.log("\n6️⃣  Fetching location logs for agent (own)...");
        const agentLogs = await httpsRequest(`${BASE_URL}/location-logs?startDate=${today}&endDate=${today}&limit=10`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${agentToken}` }
        });
        console.log(`   Status: ${agentLogs.status}`);
        if (agentLogs.data.logs) {
            console.log(`   Logs found: ${agentLogs.data.logs.length}`);
            agentLogs.data.logs.forEach(l => {
                console.log(`   - ${l.activity}: ${l.timestamp}`);
            });
        } else {
            console.log(`   Response: ${JSON.stringify(agentLogs.data).substring(0, 200)}`);
        }

    } catch (err) {
        console.error("❌ Error:", err.message);
    }
}

testActivity();
