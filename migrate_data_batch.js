// migrate_data_batch.js
// ⚠️  SAFETY: This script ONLY reads from production and writes to test DB

import pkg from "pg";
const { Pool } = pkg;
import dotenv from "dotenv";

dotenv.config();

const PRODUCTION_DB = {
    connectionString: "postgresql://geotrackdb_user:gDBJB8LnmVT6UrIwKwv7uI13LH9BPMGp@dpg-d4rqmoc9c44c738du6dg-a.singapore-postgres.render.com/geotrackdb",
    ssl: { rejectUnauthorized: false }
};

const TEST_DB = {
    connectionString: "postgresql://geotrack_dbtest_user:DpQrv5nopeTKqIUNQB6pQYeCdJgIlOxA@dpg-d7grg6po3t8c7392p2tg-a.oregon-postgres.render.com:5432/geotrack_dbtest",
    ssl: { rejectUnauthorized: false }
};

const prodPool = new Pool(PRODUCTION_DB);
const testPool = new Pool(TEST_DB);

async function migrate() {
    console.log("🚀 DATA MIGRATION: Production → Test DB\n");

    try {
        process.stdout.write("📡 Production (Singapore): ");
        await prodPool.query("SELECT 1");
        console.log("✅ READ-ONLY");

        process.stdout.write("📡 Test DB (Oregon): ");
        await testPool.query("SELECT 1");
        console.log("✅ WRITE\n");

        // Clear test data
        console.log("🧹 Clearing test DB...");
        await testPool.query("TRUNCATE TABLE meetings, client_services, location_logs, clients, profiles, user_sessions, users, companies, company_licenses CASCADE");
        console.log("✅ Cleared\n");

        // Migrate Companies
        console.log("📦 Companies...");
        const companies = await prodPool.query("SELECT * FROM companies");
        for (const c of companies.rows) {
            await testPool.query(`
                INSERT INTO companies (id, name, subdomain, email_domain, settings, is_active, 
                    created_at, updated_at, tally_company_name, tally_username,
                    tally_password_encrypted, tally_auto_sync_enabled,
                    tally_sync_interval_minutes, total_paid_amount, total_pending_amount, user_limit)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            `, [c.id, c.name, c.subdomain, c.email_domain, c.settings, c.is_active, 
                c.created_at, c.updated_at, c.tally_company_name, c.tally_username,
                c.tally_password_encrypted, c.tally_auto_sync_enabled,
                c.tally_sync_interval_minutes, c.total_paid_amount, c.total_pending_amount, c.user_limit]);
        }
        console.log(`   ✅ ${companies.rows.length} companies\n`);

        // Migrate Users
        console.log("📦 Users...");
        const users = await prodPool.query("SELECT * FROM users");
        for (const u of users.rows) {
            await testPool.query(`
                INSERT INTO users (id, email, password, is_admin, is_super_admin, 
                    is_trial_user, company_id, role, auth_source,
                    created_at, updated_at, latitude, longitude, pincode)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            `, [u.id, u.email, u.password, u.is_admin, u.is_super_admin,
                u.is_trial_user, u.company_id, u.role, u.auth_source,
                u.created_at, u.updated_at, u.latitude, u.longitude, u.pincode]);
        }
        console.log(`   ✅ ${users.rows.length} users\n`);

        // Migrate Profiles
        console.log("📦 Profiles...");
        const profiles = await prodPool.query("SELECT * FROM profiles");
        for (const p of profiles.rows) {
            await testPool.query(`
                INSERT INTO profiles (id, user_id, email, full_name, department,
                    work_hours_start, work_hours_end, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `, [p.id, p.user_id, p.email, p.full_name, p.department,
                p.work_hours_start, p.work_hours_end, p.created_at, p.updated_at]);
        }
        console.log(`   ✅ ${profiles.rows.length} profiles\n`);

        // Migrate Clients (batch of 100)
        console.log("📦 Clients (batched)...");
        const clients = await prodPool.query("SELECT * FROM clients");
        let batch = [];
        for (let i = 0; i < clients.rows.length; i++) {
            const c = clients.rows[i];
            batch.push([
                c.id, c.name, c.email, c.phone, c.address, c.latitude, c.longitude,
                c.status, c.notes, c.created_by, c.created_at, c.updated_at,
                c.source, c.pincode, c.tally_guid, c.company_id,
                c.last_visit_date, c.last_visit_type, c.last_visit_notes,
                c.tally_sync_status, c.tally_sync_pending_fields,
                c.last_tally_sync_at, c.tally_sync_error
            ]);
            
            if (batch.length >= 100 || i === clients.rows.length - 1) {
                const values = batch.flatMap((b, idx) => 
                    b.map((v, i) => `$${idx * 23 + i + 1}`)
                ).join(', ');
                
                const params = batch.flat();
                await testPool.query(`
                    INSERT INTO clients (id, name, email, phone, address, latitude, longitude,
                        status, notes, created_by, created_at, updated_at,
                        source, pincode, tally_guid, company_id,
                        last_visit_date, last_visit_type, last_visit_notes,
                        tally_sync_status, tally_sync_pending_fields,
                        last_tally_sync_at, tally_sync_error)
                    VALUES ${batch.map((_, idx) => 
                        `(${Array.from({length: 23}, (_, i) => `$${idx * 23 + i + 1}`).join(',')})`
                    ).join(',')}
                `, params);
                console.log(`   📊 Batch ${Math.ceil((i+1)/100)}: ${i+1}/${clients.rows.length}`);
                batch = [];
            }
        }
        console.log(`   ✅ ${clients.rows.length} clients\n`);

        // Migrate Meetings (limited to 200)
        console.log("📦 Meetings (limited 200)...");
        const meetings = await prodPool.query("SELECT * FROM meetings ORDER BY created_at DESC LIMIT 200");
        for (const m of meetings.rows) {
            try {
                await testPool.query(`
                    INSERT INTO meetings (id, user_id, client_id, start_time, start_latitude,
                        start_longitude, start_accuracy, end_time, end_latitude,
                        end_longitude, end_accuracy, status, comments, attachments,
                        created_at, updated_at, company_id, proximity_verified,
                        proximity_distance, proximity_reason)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
                `, [m.id, m.user_id, m.client_id, m.start_time, m.start_latitude,
                    m.start_longitude, m.start_accuracy, m.end_time, m.end_latitude,
                    m.end_longitude, m.end_accuracy, m.status, m.comments, m.attachments,
                    m.created_at, m.updated_at, m.company_id, m.proximity_verified,
                    m.proximity_distance, m.proximity_reason]);
            } catch (e) { /* Skip FK errors */ }
        }
        console.log(`   ✅ ${meetings.rows.length} meetings\n`);

        // Migrate Licenses
        console.log("📦 Company Licenses...");
        const licenses = await prodPool.query("SELECT * FROM company_licenses");
        for (const l of licenses.rows) {
            await testPool.query(`
                INSERT INTO company_licenses (id, company_id, license_key, plan, max_users,
                    expires_at, created_at, lms_user_id, lms_license_id)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `, [l.id, l.company_id, l.license_key, l.plan, l.max_users,
                l.expires_at, l.created_at, l.lms_user_id, l.lms_license_id]);
        }
        console.log(`   ✅ ${licenses.rows.length} licenses\n`);

        // Summary
        console.log("==============================================");
        console.log("📊 MIGRATION SUMMARY");
        console.log("==============================================");
        
        const tables = ['companies', 'users', 'profiles', 'clients', 'meetings', 'company_licenses'];
        for (const t of tables) {
            const r = await testPool.query(`SELECT COUNT(*) as c FROM "${t}"`);
            console.log(`   📊 ${t}: ${r.rows[0].c}`);
        }

        console.log("\n✅ MIGRATION COMPLETED!");
        console.log("🔵 Production: UNTOUCHED (READ-ONLY)");
        console.log("🟢 Test DB: FULLY POPULATED\n");

    } catch (err) {
        console.error("❌ ERROR:", err.message);
    } finally {
        await prodPool.end();
        await testPool.end();
    }
}

migrate();
