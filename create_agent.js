// create_agent.js
import pkg from "pg";
const { Pool } = pkg;
import bcrypt from "bcryptjs";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

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

async function createAgent() {
    console.log("==============================================");
    console.log("👨‍💻 CREATING AGENT USER");
    console.log("==============================================\n");

    const email = "agent@test.com";
    const password = "agent123";
    const fullName = "Test Agent";
    const companyId = "d9740a4d-e20c-4964-b89b-cb1ae4015c92"; // Default Company

    try {
        const existingAgent = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
        
        if (existingAgent.rows.length > 0) {
            console.log("⚠️  Agent exists, updating password...");
            const hashedPassword = await bcrypt.hash(password, 10);
            await pool.query(`
                UPDATE users SET 
                    password = $1, 
                    is_admin = false, 
                    is_super_admin = false,
                    company_id = $2
                WHERE email = $3
            `, [hashedPassword, companyId, email]);
        } else {
            console.log("📝 Creating new agent...");
            const hashedPassword = await bcrypt.hash(password, 10);
            const userId = crypto.randomUUID();
            
            await pool.query(`
                INSERT INTO users (id, email, password, is_admin, is_super_admin, company_id, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
            `, [userId, email, hashedPassword, false, false, companyId]);

            await pool.query(`
                INSERT INTO profiles (id, user_id, full_name, created_at, updated_at)
                VALUES ($1, $2, $3, NOW(), NOW())
            `, [crypto.randomUUID(), userId, fullName]);
        }

        console.log("✅ Agent created/updated successfully!");
        console.log("\n==============================================");
        console.log("🔑 AGENT CREDENTIALS");
        console.log("==============================================");
        console.log(`Email: ${email}`);
        console.log(`Password: ${password}`);
        console.log(`Company: Default Company`);
        console.log(`Role: Agent (can start meetings/journeys)`);
        console.log("==============================================");

    } catch (err) {
        console.error("❌ Error:", err.message);
    }

    await pool.end();
}

createAgent();
