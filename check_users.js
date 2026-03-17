
import { pool } from "./db.js";

async function checkUsers() {
  try {
    const res = await pool.query(`
      SELECT email, is_admin, is_super_admin, company_id 
      FROM users
    `);
    console.log("Users in DB:");
    console.table(res.rows);

    const compRes = await pool.query(`SELECT id, name FROM companies`);
    console.log("Companies in DB:");
    console.table(compRes.rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

checkUsers();
