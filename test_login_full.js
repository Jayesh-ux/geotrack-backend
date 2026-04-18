// test_login_full.js
import pkg from "pg";
const { Pool } = pkg;
import dotenv from "dotenv";
import jwt from "jsonwebtoken";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-me-12345";

const connectionString = process.env.DATABASE_URL;

const pool = new Pool(
    connectionString
        ? {
            connectionString: connectionString,
            ssl: { rejectUnauthorized: false }
        }
        : {
            user: process.env.DB_USER || "postgres",
            host: process.env.DB_HOST || "localhost",
            database: process.env.DB_NAME || "client_tracking_app",
            password: process.env.DB_PASSWORD || "root",
            port: parseInt(process.env.DB_PORT) || 5432,
        }
);

async function testFullLogin() {
    console.log("==============================================");
    console.log("🔐 TESTING FULL LOGIN FLOW");
    console.log("==============================================\n");

    try {
        // 1. Get user
        const userResult = await pool.query(`
            SELECT u.*, p.full_name, c.name as company_name
            FROM users u
            LEFT JOIN profiles p ON u.id = p.user_id
            LEFT JOIN companies c ON u.company_id = c.id
            WHERE u.email = 'admin@test.com'
        `);

        if (userResult.rows.length === 0) {
            console.log("❌ User not found!");
            return;
        }

        const user = userResult.rows[0];
        
        console.log("👤 USER DATA:");
        console.log(`   Email: ${user.email}`);
        console.log(`   is_admin: ${user.is_admin}`);
        console.log(`   is_super_admin: ${user.is_super_admin}`);
        console.log(`   company_id: ${user.company_id}`);
        console.log(`   company_name: ${user.company_name}`);

        // 2. Generate token
        console.log("\n🎫 GENERATING TOKEN:");
        const tokenPayload = {
            id: user.id,
            email: user.email,
            isAdmin: user.is_admin,
            isSuperAdmin: user.is_super_admin || false,
            isTrialUser: user.is_trial_user || false,
            companyId: user.company_id
        };
        
        console.log(`   Payload: ${JSON.stringify(tokenPayload)}`);

        const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });
        console.log(`   Token: ${token.substring(0, 50)}...`);

        // 3. Verify token
        console.log("\n🔍 VERIFYING TOKEN:");
        const decoded = jwt.verify(token, JWT_SECRET);
        console.log(`   Decoded: ${JSON.stringify(decoded)}`);

        // 4. Simulate middleware logic
        console.log("\n🏢 SIMULATING MIDDLEWARE:");
        console.log(`   req.user.isSuperAdmin: ${decoded.isSuperAdmin}`);
        
        // For superadmin without x-company-id header
        const isSuperAdmin = decoded.isSuperAdmin;
        const companyId = isSuperAdmin ? null : decoded.companyId;
        
        console.log(`   After attachCompanyContext:`);
        console.log(`     req.isSuperAdmin: ${isSuperAdmin}`);
        console.log(`     req.companyId: ${companyId}`);

        // 5. Simulate getClients query
        console.log("\n📊 SIMULATING GET CLIENTS QUERY:");
        
        let query = `SELECT * FROM clients WHERE 1=1`;
        const params = [];
        
        if (!isSuperAdmin && companyId) {
            query += ` AND company_id = $${params.push(companyId)}`;
            console.log(`   Query with company filter: ${query}`);
        } else if (!isSuperAdmin) {
            console.log(`   ❌ Would return 403 - NoCompanyContext`);
        } else {
            console.log(`   ✅ Query: ${query} (no company filter for superadmin)`);
        }

        const clientsResult = await pool.query(
            `SELECT COUNT(*) as count FROM clients ${!isSuperAdmin && companyId ? 'WHERE company_id = $1' : ''}`,
            !isSuperAdmin && companyId ? [companyId] : []
        );
        
        console.log(`   Total clients visible: ${clientsResult.rows[0].count}`);

        // 6. Test API call
        console.log("\n🌐 TESTING API CALL (Local):");
        const apiResult = await fetch('http://localhost:5000/clients?searchMode=remote&limit=10', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (apiResult.ok) {
            const data = await apiResult.json();
            console.log(`   ✅ API Response: ${data.clients?.length || 0} clients`);
        } else {
            console.log(`   ❌ API Error: ${apiResult.status}`);
            const errorText = await apiResult.text();
            console.log(`   Error: ${errorText}`);
        }

    } catch (err) {
        console.error("❌ Error:", err.message);
    }

    await pool.end();
}

testFullLogin();
