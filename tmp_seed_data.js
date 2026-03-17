
import pkg from 'pg';
const { Client } = pkg;

const prodUrl = "postgresql://geotrackdb_user:gDBJB8LnmVT6UrIwKwv7uI13LH9BPMGp@dpg-d4rqmoc9c44c738du6dg-a.singapore-postgres.render.com/geotrackdb";
const localConfig = {
    user: "postgres",
    host: "localhost",
    database: "client_tracking_app",
    password: "root",
    port: 5432,
};

async function seedData() {
    const prodClient = new Client({ connectionString: prodUrl, ssl: { rejectUnauthorized: false } });
    const localClient = new Client(localConfig);

    try {
        await prodClient.connect();
        await localClient.connect();

        console.log("Seeding plan_features...");
        const plans = await prodClient.query("SELECT * FROM plan_features");
        for (const plan of plans.rows) {
            const keys = Object.keys(plan);
            const values = Object.values(plan);
            const placeholders = keys.map((_, i) => `$${i + 1}`).join(",");
            const sql = `INSERT INTO plan_features (${keys.map(k => `"${k}"`).join(",")}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;
            await localClient.query(sql, values);
        }
        console.log(`✅ Seeded ${plans.rows.length} plans.`);

        console.log("Seeding companies...");
        const companies = await prodClient.query("SELECT * FROM companies LIMIT 5");
        for (const company of companies.rows) {
            const keys = Object.keys(company);
            const values = Object.values(company);
            const placeholders = keys.map((_, i) => `$${i + 1}`).join(",");
            const sql = `INSERT INTO companies (${keys.map(k => `"${k}"`).join(",")}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;
            await localClient.query(sql, values);
        }
        console.log(`✅ Seeded ${companies.rows.length} companies.`);

    } catch (err) {
        console.error(err);
    } finally {
        await prodClient.end();
        await localClient.end();
    }
}

seedData();
