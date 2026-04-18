// test_meetings_endpoint.js
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

async function testMeetings() {
    console.log("==============================================");
    console.log("🌐 TESTING MEETINGS ENDPOINT");
    console.log("==============================================\n");

    try {
        // 1. Login as admin (SuperAdmin)
        console.log("1️⃣  Login as admin@test.com (SuperAdmin)...");
        const login = await httpsRequest(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { email: 'admin@test.com', password: 'admin123' });

        if (login.status !== 200) {
            console.log(`❌ Login failed: ${login.status}`);
            return;
        }
        const adminToken = login.data.token;
        const adminUser = login.data.user;
        console.log(`   ✅ Logged in as admin@test.com`);
        console.log(`   isAdmin: ${adminUser.isAdmin}`);
        console.log(`   isSuperAdmin: ${adminUser.isSuperAdmin}`);
        console.log(`   companyId: ${adminUser.companyId}`);

        // 2. Get meetings using /meetings endpoint with userId=all
        console.log("\n2️⃣  Fetching /meetings?userId=all...");
        const meetings = await httpsRequest(`${BASE_URL}/meetings?userId=all&limit=5`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        console.log(`   Status: ${meetings.status}`);
        if (meetings.data.meetings) {
            console.log(`   Meetings found: ${meetings.data.meetings.length}`);
            meetings.data.meetings.forEach(m => {
                console.log(`   - ${m.agentName || 'N/A'}: ${m.status} - ${m.clientName || 'N/A'}`);
            });
        } else {
            console.log(`   Response: ${JSON.stringify(meetings.data).substring(0, 300)}`);
        }

        // 3. Get meetings without userId parameter
        console.log("\n3️⃣  Fetching /meetings (no userId)...");
        const allMeetings = await httpsRequest(`${BASE_URL}/meetings?limit=5`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        console.log(`   Status: ${allMeetings.status}`);
        if (allMeetings.data.meetings) {
            console.log(`   Meetings found: ${allMeetings.data.meetings.length}`);
        }

    } catch (err) {
        console.error("❌ Error:", err.message);
    }
}

testMeetings();
