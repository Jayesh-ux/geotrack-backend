// test_render_api.js
import pkg from "pg";
const { Pool } = pkg;
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import https from "https";
import http from "http";

dotenv.config();

// Use the actual Render URL
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

async function testRenderAPI() {
    console.log("==============================================");
    console.log("🌐 TESTING RENDER API");
    console.log("==============================================\n");

    try {
        // 1. Ping
        console.log("1️⃣  Testing /ping...");
        const ping = await httpsRequest(`${BASE_URL}/ping`, { method: 'GET' });
        console.log(`   Status: ${ping.status} | ${JSON.stringify(ping.data)}`);

        // 2. Login
        console.log("\n2️⃣  Testing /auth/login...");
        const login = await httpsRequest(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { email: 'admin@test.com', password: 'admin123' });

        console.log(`   Status: ${login.status}`);
        
        if (login.status === 200) {
            console.log(`   Token: ${login.data.token?.substring(0, 50)}...`);
            console.log(`   User: ${JSON.stringify(login.data.user)}`);
            
            const token = login.data.token;

            // 3. Get clients
            console.log("\n3️⃣  Testing /clients (with token)...");
            const clients = await httpsRequest(`${BASE_URL}/clients?searchMode=remote&limit=10`, {
                method: 'GET',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log(`   Status: ${clients.status}`);
            console.log(`   Response: ${JSON.stringify(clients.data)}`);

            // 4. Verify token
            console.log("\n4️⃣  Testing /auth/verify...");
            const verify = await httpsRequest(`${BASE_URL}/auth/verify`, {
                method: 'GET',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log(`   Status: ${verify.status}`);
            console.log(`   Response: ${JSON.stringify(verify.data)}`);

        } else {
            console.log(`   Error: ${JSON.stringify(login.data)}`);
        }

    } catch (err) {
        console.error("❌ Error:", err.message);
    }
}

testRenderAPI();
