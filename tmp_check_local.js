
import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const localConfig = {
    user: process.env.DB_USER || "postgres",
    host: process.env.DB_HOST || "localhost",
    database: process.env.DB_NAME || "client_tracking_app",
    password: process.env.DB_PASSWORD || "root",
    port: parseInt(process.env.DB_PORT) || 5432,
};

async function checkLocal() {
    const client = new Client(localConfig);
    try {
        await client.connect();
        const res = await client.query(`
            SELECT table_name, column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name IN ('pincodes', 'plan_features', 'companies')
            ORDER BY table_name, ordinal_position
        `);
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

checkLocal();
