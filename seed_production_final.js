
import pkg from 'pg';
const { Client } = pkg;
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

// Ensure we have the production URL
const prodUrl = process.env.DATABASE_URL;

async function seedProduction() {
    const client = new Client({ 
        connectionString: prodUrl,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("🔗 Connected to production database.");

        const password = "password123";
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        // 1. Ensure a test company exists
        let finalCompanyId;
        const checkCompany = await client.query("SELECT id FROM companies WHERE subdomain = $1", ["test"]);
        if (checkCompany.rows.length > 0) {
            finalCompanyId = checkCompany.rows[0].id;
        } else {
            const companyRes = await client.query(
                "INSERT INTO companies (id, name, subdomain) VALUES ($1, $2, $3) RETURNING id",
                [crypto.randomUUID(), "Lodha Supremus Enterprises", "test"]
            );
            finalCompanyId = companyRes.rows[0].id;
        }
        console.log(`🏢 Company verified: Lodha Supremus Enterprises (ID: ${finalCompanyId})`);

        // 2. Create/Update Admin User
        const adminEmail = "admin@test.com";
        const adminRes = await client.query(
            "INSERT INTO users (id, email, password, is_admin, company_id) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (email) DO UPDATE SET password = $3, is_admin = $4, company_id = $5 RETURNING id",
            [crypto.randomUUID(), adminEmail, hash, true, finalCompanyId]
        );
        console.log(`✅ Admin user ${adminEmail} ready.`);

        // 3. Create/Update Agent User
        const agentEmail = "agent@test.com";
        const agentRes = await client.query(
            "INSERT INTO users (id, email, password, is_admin, company_id) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (email) DO UPDATE SET password = $3, is_admin = $4, company_id = $5 RETURNING id",
            [crypto.randomUUID(), agentEmail, hash, false, finalCompanyId]
        );
        console.log(`✅ Agent user ${agentEmail} ready.`);

        // 4. Seed Mock Clients near Lodha Supremus Tower 2
        // Coordinates for Lodha Supremus Tower 2
        const centerLat = 19.19825;
        const centerLng = 72.94904;
        const pincode = "400604";

        console.log("\n📍 Seeding 10 mock clients near Lodha Supremus Tower 2...");

        const mockClientNames = [
            "Tech Solutions Pvt Ltd", "Shiv Shakti Hardware", "Mehta Traders", 
            "Oceanic Logistics", "Rising Sun Cafe", "Dynamic Electronics", 
            "Swift Couriers", "Green Valley Landscaping", "Platinum Consultancies", 
            "Global Print Shop"
        ];

        for (let i = 0; i < 10; i++) {
            // Generate random offset within ~500m to 1km
            // 0.001 degree is roughly 110 meters
            const latOffset = (Math.random() - 0.5) * 0.015; // Up to ~800m north/south
            const lngOffset = (Math.random() - 0.5) * 0.015; // Up to ~800m east/west
            
            const clientLat = centerLat + latOffset;
            const clientLng = centerLng + lngOffset;
            const clientName = mockClientNames[i];
            const clientAddress = `${clientName}, Wagle Estate, Thane West, Near Road No. 22`;

            await client.query(
                `INSERT INTO clients (id, name, address, pincode, latitude, longitude, company_id) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7) 
                 ON CONFLICT DO NOTHING`,
                [crypto.randomUUID(), clientName, clientAddress, pincode, clientLat, clientLng, finalCompanyId]
            );
            console.log(`   - Added: ${clientName} at [${clientLat.toFixed(5)}, ${clientLng.toFixed(5)}]`);
        }

        console.log("\n🚀 PRODUCTION DATA SEEDED SUCCESSFULLY!");
        console.log("----------------------------------------");
        console.log(`Admin Login: ${adminEmail} / ${password}`);
        console.log(`Agent Login: ${agentEmail} / ${password}`);
        console.log(`Clients Seeded: 10 in Wagle Estate Area`);
        console.log("----------------------------------------");

    } catch (err) {
        console.error("❌ Seeding failed:", err.message);
    } finally {
        await client.end();
    }
}

seedProduction();
