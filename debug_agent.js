
import { pool } from './db.js';

async function debugAgent() {
    try {
        console.log("--- Checking User agent@test.com ---");
        const userRes = await pool.query("SELECT id, company_id, email FROM users WHERE email = $1", ["agent@test.com"]);
        if (userRes.rows.length === 0) {
            console.log("User agent@test.com NOT FOUND");
            return;
        }
        const user = userRes.rows[0];
        console.table(userRes.rows);

        console.log("\n--- Checking Clients in Lodha Supremus 2 Tower ---");
        const clientRes = await pool.query("SELECT id, name, latitude, longitude, company_id, address FROM clients WHERE name ILIKE $1 OR building ILIKE $2", ["%Lodha Supremus%", "%Lodha Supremus%"]);
        console.table(clientRes.rows);

        if (clientRes.rows.length > 0) {
            clientRes.rows.forEach(client => {
                if (client.company_id !== user.company_id) {
                    console.log(`\n❌ MISMATCH: Client '${client.name}' belongs to company ${client.company_id}, but agent belongs to ${user.company_id}`);
                } else {
                    console.log(`\n✅ MATCH: Client '${client.name}' and agent share the same company ID.`);
                }
                
                // Check distance
                const targetLat = 19.1980182;
                const targetLng = 72.9474803;
                console.log(`Target location (Google Maps): ${targetLat}, ${targetLng}`);
                console.log(`Stored location (DB): ${client.latitude}, ${client.longitude}`);
            });
        } else {
            console.log("No clients found matching 'Lodha Supremus'.");
        }

    } catch (err) {
        console.error("Error debugging:", err);
    } finally {
        process.exit();
    }
}

debugAgent();
