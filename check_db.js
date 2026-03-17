
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL;

const config = connectionString
    ? {
        connectionString: connectionString,
        ssl: { rejectUnauthorized: false }
    }
    : {
        user: process.env.DB_USER || "postgres",
        host: process.env.DB_HOST || "localhost",
        database: process.env.DB_NAME || "client_tracking_app",
        password: process.env.DB_PASSWORD || "root",
        port: process.env.DB_PORT || 5432,
    };

console.log("Attempting connection with config:", JSON.stringify({ ...config, password: '***' }, null, 2));

const pool = new Pool(config);

try {
    const res = await pool.query('SELECT NOW()');
    console.log('✅ Connection successful. Current time from DB:', res.rows[0].now);
} catch (err) {
    console.error('❌ Connection failed:', err.message);
} finally {
    await pool.end();
}
