// test_agent_login.js
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

async function testAgentLogin() {
    console.log("==============================================");
    console.log("🔐 TESTING AGENT LOGIN");
    console.log("==============================================\n");

    try {
        console.log("📡 Testing login for agent@test.com...");
        const login = await httpsRequest(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { email: 'agent@test.com', password: 'agent123' });

        console.log(`Status: ${login.status}`);
        
        if (login.status === 200) {
            console.log("\n📦 LOGIN RESPONSE:");
            console.log(JSON.stringify(login.data, null, 2));
        } else {
            console.log(`\n❌ Login failed: ${JSON.stringify(login.data)}`);
        }

    } catch (err) {
        console.error("❌ Error:", err.message);
    }
}

testAgentLogin();
