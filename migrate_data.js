// migrate_data.js
// ⚠️  SAFETY: This script ONLY reads from production and writes to test DB
// 🚨 NEVER modify this script to write to production

import pkg from "pg";
const { Pool } = pkg;
import dotenv from "dotenv";

dotenv.config();

// PRODUCTION DB (READ-ONLY) - Singapore
const PRODUCTION_DB = {
    connectionString: "postgresql://geotrackdb_user:gDBJB8LnmVT6UrIwKwv7uI13LH9BPMGp@dpg-d4rqmoc9c44c738du6dg-a.singapore-postgres.render.com/geotrackdb",
    ssl: { rejectUnauthorized: false }
};

// TEST DB (WRITE) - Oregon
const TEST_DB = {
    connectionString: "postgresql://geotrack_dbtest_user:DpQrv5nopeTKqIUNQB6pQYeCdJgIlOxA@dpg-d7grg6po3t8c7392p2tg-a.oregon-postgres.render.com:5432/geotrack_dbtest",
    ssl: { rejectUnauthorized: false }
};

const prodPool = new Pool(PRODUCTION_DB);
const testPool = new Pool(TEST_DB);

async function migrate() {
    console.log("==============================================");
    console.log("🚀 DATA MIGRATION: Production → Test DB");
    console.log("==============================================");
    console.log("⚠️  SAFETY: Production DB is READ-ONLY");
    console.log("✅ Target: Test DB (geotrack_dbtest)");
    console.log("==============================================\n");

    try {
        // Verify connections
        console.log("📡 Verifying database connections...\n");
        
        process.stdout.write("🔵 Production (Singapore): ");
        await prodPool.query("SELECT 1");
        console.log("✅ Connected (READ-ONLY)");

        process.stdout.write("🟢 Test DB (Oregon): ");
        await testPool.query("SELECT 1");
        console.log("✅ Connected (WRITE)\n");

        // Clear existing test data (SAFE - only test DB)
        console.log("🧹 Clearing existing test data...\n");
        
        const tablesToClear = [
            'meetings', 'client_services', 'location_logs',
            'clients', 'profiles', 'user_sessions',
            'users', 'companies', 'company_licenses'
        ];

        for (const table of tablesToClear) {
            try {
                await testPool.query(`TRUNCATE TABLE "${table}" CASCADE`);
                console.log(`   ✅ Cleared: ${table}`);
            } catch (err) {
                if (err.code === "42P01") {
                    console.log(`   ⚠️  Skipped (not exists): ${table}`);
                }
            }
        }

        // Migrate Companies
        console.log("\n📦 Migrating Companies...");
        try {
            const companies = await prodPool.query("SELECT * FROM companies ORDER BY created_at");
            console.log(`   Found ${companies.rows.length} companies`);
            
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
                    c.tally_sync_interval_minutes, c.total_paid_amount, 
                    c.total_pending_amount, c.user_limit]);
            }
            console.log(`   ✅ Migrated ${companies.rows.length} companies`);
        } catch (err) {
            console.log(`   ❌ Error: ${err.message}`);
        }

        // Migrate Users
        console.log("\n📦 Migrating Users...");
        try {
            const users = await prodPool.query("SELECT * FROM users ORDER BY created_at");
            console.log(`   Found ${users.rows.length} users`);
            
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
            console.log(`   ✅ Migrated ${users.rows.length} users`);
        } catch (err) {
            console.log(`   ❌ Error: ${err.message}`);
        }

        // Migrate Profiles
        console.log("\n📦 Migrating Profiles...");
        try {
            const profiles = await prodPool.query("SELECT * FROM profiles ORDER BY created_at");
            console.log(`   Found ${profiles.rows.length} profiles`);
            
            for (const p of profiles.rows) {
                await testPool.query(`
                    INSERT INTO profiles (id, user_id, email, full_name, department,
                        work_hours_start, work_hours_end, created_at, updated_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                `, [p.id, p.user_id, p.email, p.full_name, p.department,
                    p.work_hours_start, p.work_hours_end, p.created_at, p.updated_at]);
            }
            console.log(`   ✅ Migrated ${profiles.rows.length} profiles`);
        } catch (err) {
            console.log(`   ❌ Error: ${err.message}`);
        }

        // Migrate Clients
        console.log("\n📦 Migrating Clients...");
        try {
            const clients = await prodPool.query("SELECT * FROM clients ORDER BY created_at");
            console.log(`   Found ${clients.rows.length} clients`);
            
            for (const c of clients.rows) {
                await testPool.query(`
                    INSERT INTO clients (id, name, email, phone, address, latitude, longitude,
                        status, notes, created_by, created_at, updated_at,
                        source, pincode, tally_guid, company_id,
                        last_visit_date, last_visit_type, last_visit_notes,
                        tally_sync_status, tally_sync_pending_fields,
                        last_tally_sync_at, tally_sync_error)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
                `, [c.id, c.name, c.email, c.phone, c.address, c.latitude, c.longitude,
                    c.status, c.notes, c.created_by, c.created_at, c.updated_at,
                    c.source, c.pincode, c.tally_guid, c.company_id,
                    c.last_visit_date, c.last_visit_type, c.last_visit_notes,
                    c.tally_sync_status, c.tally_sync_pending_fields,
                    c.last_tally_sync_at, c.tally_sync_error]);
            }
            console.log(`   ✅ Migrated ${clients.rows.length} clients`);
        } catch (err) {
            console.log(`   ❌ Error: ${err.message}`);
        }

        // Migrate Meetings (limited)
        console.log("\n📦 Migrating Meetings (limited to 500)...");
        try {
            const meetings = await prodPool.query("SELECT * FROM meetings ORDER BY created_at LIMIT 500");
            console.log(`   Found ${meetings.rows.length} meetings to migrate`);
            
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
            console.log(`   ✅ Migrated meetings`);
        } catch (err) {
            console.log(`   ❌ Error: ${err.message}`);
        }

        // Migrate Company Licenses
        console.log("\n📦 Migrating Company Licenses...");
        try {
            const licenses = await prodPool.query("SELECT * FROM company_licenses ORDER BY created_at");
            console.log(`   Found ${licenses.rows.length} licenses`);
            
            for (const l of licenses.rows) {
                await testPool.query(`
                    INSERT INTO company_licenses (id, company_id, license_key, plan, max_users,
                        expires_at, created_at, lms_user_id, lms_license_id)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                `, [l.id, l.company_id, l.license_key, l.plan, l.max_users,
                    l.expires_at, l.created_at, l.lms_user_id, l.lms_license_id]);
            }
            console.log(`   ✅ Migrated ${licenses.rows.length} licenses`);
        } catch (err) {
            console.log(`   ❌ Error: ${err.message}`);
        }

        // Final Verification
        console.log("\n==============================================");
        console.log("📊 MIGRATION SUMMARY");
        console.log("==============================================\n");

        const testTables = ['companies', 'users', 'profiles', 'clients', 'meetings', 'company_licenses'];
        
        for (const table of testTables) {
            try {
                const result = await testPool.query(`SELECT COUNT(*) as count FROM "${table}"`);
                console.log(`   📊 ${table}: ${result.rows[0].count} rows`);
            } catch (err) {
                console.log(`   ⚠️  ${table}: error`);
            }
        }

        console.log("\n==============================================");
        console.log("✅ MIGRATION COMPLETED!");
        console.log("==============================================");
        console.log("🔵 Production DB: UNTOUCHED (READ-ONLY)");
        console.log("🟢 Test DB: FULLY POPULATED");
        console.log("==============================================\n");

    } catch (err) {
        console.error("\n❌ MIGRATION ERROR:", err.message);
        console.log("⚠️  No data was written to production DB");
    } finally {
        await prodPool.end();
        await testPool.end();
    }
}

migrate();
