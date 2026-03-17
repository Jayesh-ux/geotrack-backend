
import pkg from 'pg';
const { Client } = pkg;

const prodUrl = "postgresql://geotrackdb_user:gDBJB8LnmVT6UrIwKwv7uI13LH9BPMGp@dpg-d4rqmoc9c44c738du6dg-a.singapore-postgres.render.com/geotrackdb";

async function checkTypes() {
    const client = new Client({ connectionString: prodUrl, ssl: { rejectUnauthorized: false } });
    try {
        await client.connect();
        const res = await client.query(`
            SELECT table_name, column_name, data_type, udt_name, column_default
            FROM information_schema.columns 
            WHERE table_name IN ('plan_features', 'trip_expenses', 'license_transactions')
            ORDER BY table_name, ordinal_position
        `);
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

checkTypes();
