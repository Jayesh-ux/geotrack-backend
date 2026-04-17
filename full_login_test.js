// full_login_test.js
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

async function testLogin() {
    console.log("==============================================");
    console.log("🔐 FULL LOGIN FLOW TEST");
    console.log("==============================================\n");

    const email = "admin@test.com";
    const password = "admin123";

    try {
        // Step 1: Find user
        console.log("📧 Step 1: Finding user...");
        const userResult = await pool.query(`
            SELECT u.*, p.full_name, p.department, p.work_hours_start, p.work_hours_end,
                   c.id as company_id, c.name as company_name, c.subdomain as company_subdomain,
                   c.is_active as company_active
            FROM users u
            LEFT JOIN profiles p ON u.id = p.user_id
            LEFT JOIN companies c ON u.company_id = c.id
            WHERE u.email = $1
        `, [email]);

        if (userResult.rows.length === 0) {
            console.log("❌ User not found!");
            return;
        }

        const user = userResult.rows[0];
        console.log(`✅ User found: ${user.email}`);
        console.log(`   Name: ${user.full_name}`);
        console.log(`   is_admin: ${user.is_admin}`);
        console.log(`   is_super_admin: ${user.is_super_admin}`);
        console.log(`   company_id: ${user.company_id}`);
        console.log(`   company_active: ${user.company_active}`);

        // Step 2: Validate password (using bcrypt)
        console.log("\n🔑 Step 2: Validating password...");
        const bcrypt = await import("bcryptjs");
        const validPassword = await bcrypt.default.compare(password, user.password);
        console.log(`   Password valid: ${validPassword ? '✅' : '❌'}`);

        if (!validPassword) {
            console.log("❌ Invalid password!");
            return;
        }

        // Step 3: Check company status
        console.log("\n🏢 Step 3: Checking company status...");
        
        if (!user.is_super_admin && !user.company_id) {
            console.log("❌ No company assigned!");
            return;
        }

        if (!user.is_super_admin && !user.company_active) {
            console.log("❌ Company inactive!");
            return;
        }

        console.log("   Company: ✅ OK");

        // Step 4: Generate JWT token
        console.log("\n🎫 Step 4: Generating JWT token...");
        const token = jwt.sign({
            id: user.id,
            email: user.email,
            isAdmin: user.is_admin,
            isSuperAdmin: user.is_super_admin || false,
            isTrialUser: user.is_trial_user || false,
            companyId: user.company_id
        }, JWT_SECRET, { expiresIn: '7d' });

        console.log(`   Token generated: ${token.substring(0, 50)}...`);

        // Step 5: Create session
        console.log("\n📝 Step 5: Creating session...");
        await pool.query(`
            DELETE FROM user_sessions WHERE user_id = $1
        `, [user.id]);

        await pool.query(`
            INSERT INTO user_sessions (user_id, token, expires_at, company_id)
            VALUES ($1, $2, NOW() + INTERVAL '7 days', $3)
        `, [user.id, token, user.company_id]);

        console.log("   Session created: ✅");

        // Step 6: Verify token
        console.log("\n🔍 Step 6: Verifying token...");
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            console.log(`   Token valid: ✅`);
            console.log(`   Decoded: ${JSON.stringify(decoded)}`);
        } catch (err) {
            console.log(`   Token valid: ❌ - ${err.message}`);
        }

        console.log("\n==============================================");
        console.log("✅ FULL LOGIN TEST PASSED!");
        console.log("==============================================");
        console.log(`\n📝 Use these credentials to login:`);
        console.log(`   Email: ${email}`);
        console.log(`   Password: ${password}`);
        console.log(`   Token: ${token.substring(0, 50)}...`);
        console.log("");

    } catch (err) {
        console.error("❌ Error:", err.message);
    }

    await pool.end();
}

testLogin();
