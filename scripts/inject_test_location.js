
import { pool } from "../db.js";

async function injectTestLocation() {
  const email = 'agent@test.com';
  console.log(`🚀 Injecting test location for ${email}...`);

  try {
    // 1. Find the user
    const userRes = await pool.query("SELECT id, company_id FROM users WHERE email = $1", [email]);
    if (userRes.rows.length === 0) {
      console.log(`❌ User ${email} not found.`);
      return;
    }

    const { id: userId, company_id: companyId } = userRes.rows[0];

    // 2. Inject a location log near the test client (Lodha Supremus coordinates used in seed_test_client.js)
    const lat = 19.11529;
    const lng = 72.96509;

    await pool.query(`
      INSERT INTO location_logs 
      (user_id, latitude, longitude, accuracy, activity, battery, pincode, company_id, timestamp)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
    `, [userId, lat, lng, 10.5, 'walking', 85, '400604', companyId]);

    console.log(`✅ Successfully injected location log for ${email} at ${lat}, ${lng}`);

  } catch (err) {
    console.error("❌ Error injecting location:", err);
  } finally {
    process.exit();
  }
}

injectTestLocation();
