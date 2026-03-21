import pool from './db.js';

async function runFixes() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // --- FIX 1: Create missing profile for admin@test.com ---
        console.log('\n--- FIX 1: Ensuring admin@test.com has a profile row ---');
        const adminUser = await client.query(
            `SELECT id, email FROM users WHERE email = 'admin@test.com' LIMIT 1`
        );

        if (adminUser.rows.length === 0) {
            console.log('❌ admin@test.com not found in users table!');
        } else {
            const adminId = adminUser.rows[0].id;
            const existingProfile = await client.query(
                `SELECT id FROM profiles WHERE user_id = $1`, [adminId]
            );

            if (existingProfile.rows.length > 0) {
                console.log('✅ Profile already exists for admin@test.com');
                await client.query(
                    `UPDATE profiles SET full_name = 'Admin User' WHERE user_id = $1`,
                    [adminId]
                );
                console.log('✅ Updated profile name');
            } else {
                await client.query(
                    `INSERT INTO profiles (user_id, full_name) VALUES ($1, 'Admin User')`,
                    [adminId]
                );
                console.log('✅ Created profile row for admin@test.com');
            }
        }

        // --- FIX 2: Ensure every user has a profile row ---
        console.log('\n--- FIX 2: Inserting missing profile rows for all users ---');
        const usersWithoutProfile = await client.query(`
            SELECT u.id, u.email
            FROM users u
            LEFT JOIN profiles p ON u.id = p.user_id
            WHERE p.user_id IS NULL
        `);
        
        let profilesCreated = 0;
        for (const user of usersWithoutProfile.rows) {
            const displayName = user.email.split('@')[0];
            await client.query(
                `INSERT INTO profiles (user_id, full_name) VALUES ($1, $2)`,
                [user.id, displayName]
            );
            profilesCreated++;
        }
        console.log(`✅ Created ${profilesCreated} missing profile rows`);

        // --- FIX 3: Update last_seen for seeded agents so they show as active ---
        console.log('\n--- FIX 3: Setting last_seen for agents to NOW so they appear active ---');
        const lastSeenUpdate = await client.query(
            `UPDATE users SET last_seen = NOW() WHERE is_admin = false AND last_seen IS NULL RETURNING email`
        );
        console.log(`✅ Updated last_seen for ${lastSeenUpdate.rows.length} agents`);

        await client.query('COMMIT');
        console.log('\n✅✅✅ All fixes applied successfully!');

        // --- VERIFY ---
        console.log('\n--- VERIFICATION ---');
        const stats = await pool.query(`
            SELECT
                (SELECT COUNT(*) FROM users) as total_users,
                (SELECT COUNT(*) FROM profiles) as total_profiles,
                (SELECT COUNT(*) FROM users u LEFT JOIN profiles p ON u.id = p.user_id WHERE p.user_id IS NULL) as users_without_profile,
                (SELECT COUNT(*) FROM users WHERE last_seen > NOW() - INTERVAL '15 minutes') as recently_active,
                (SELECT COUNT(*) FROM clients) as total_clients
        `);
        console.log(stats.rows[0]);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Fix failed, rolled back:', err.message);
        throw err;
    } finally {
        client.release();
        process.exit(0);
    }
}

runFixes();
