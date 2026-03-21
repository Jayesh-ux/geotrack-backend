import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: "postgresql://geotrackdb_user:gDBJB8LnmVT6UrIwKwv7uI13LH9BPMGp@dpg-d4rqmoc9c44c738du6dg-a.singapore-postgres.render.com/geotrackdb",
  ssl: { rejectUnauthorized: false }
});

async function checkSgDb() {
  try {
    const res = await pool.query(`SELECT COUNT(*) FROM clients WHERE company_id = 'd9740a4d-e20c-4964-b89b-cb1ae4015c92'`);
    console.log("Clients in admin company:", res.rows[0].count);
    
    // Total companies
    const compRes = await pool.query(`SELECT id, name FROM companies LIMIT 5`);
    console.log("Some companies:", compRes.rows);
  } catch(e) {
    console.error("Error:", e);
  } finally {
    await pool.end();
  }
}

checkSgDb();
