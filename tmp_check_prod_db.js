import pkg from 'pg';
const { Client } = pkg;
import dotenv from "dotenv";

dotenv.config();

const prodUrl = process.env.DATABASE_URL.replace("ppostgresql", "postgresql");

async function check() {
    const client = new Client({ connectionString: prodUrl, ssl: { rejectUnauthorized: false } });
    try {
        await client.connect();
        const users = await client.query("SELECT email, is_admin FROM users");
        console.log("USERS:", users.rows);
        const companies = await client.query("SELECT id, name FROM companies");
        console.log("COMPANIES:", companies.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

check();
