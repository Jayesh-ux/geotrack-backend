
import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const prodUrl = "postgresql://geotrackdb_user:gDBJB8LnmVT6UrIwKwv7uI13LH9BPMGp@dpg-d4rqmoc9c44c738du6dg-a.singapore-postgres.render.com/geotrackdb";

const localConfig = {
    user: process.env.DB_USER || "postgres",
    host: process.env.DB_HOST || "localhost",
    database: process.env.DB_NAME || "client_tracking_app",
    password: process.env.DB_PASSWORD || "root",
    port: parseInt(process.env.DB_PORT) || 5432,
};

async function getStructure(client, name) {
    console.log(`--- Structure for ${name} ---`);
    const tables = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        ORDER BY table_name
    `);

    for (const row of tables.rows) {
        const tableName = row.table_name;
        if (tableName === 'spatial_ref_sys') continue;
        console.log(`Table: ${tableName}`);
        const columns = await client.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = $1 AND table_schema = 'public'
            ORDER BY ordinal_position
        `, [tableName]);
        
        columns.rows.forEach(col => {
            console.log(`  - ${col.column_name} (${col.data_type}) [${col.is_nullable}]`);
        });
    }
}

async function run() {
    const prodClient = new Client({ connectionString: prodUrl, ssl: { rejectUnauthorized: false } });
    const localClient = new Client(localConfig);

    try {
        await prodClient.connect();
        await getStructure(prodClient, "PRODUCTION (Render)");
        
        await localClient.connect();
        await getStructure(localClient, "LOCAL");
        
    } catch (err) {
        console.error("Error:", err);
    } finally {
        await prodClient.end();
        await localClient.end();
    }
}

run();
