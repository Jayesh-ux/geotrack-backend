// fix_member_since.js
const { Pool } = require('pg');

const DATABASE_URL = "postgresql://geotrack_dbtest_user:DpQrv5nopeTKqIUNQB6pQYeCdJgIlOxA@dpg-d7grg6po3t8c7392p2tg-a.oregon-postgres.render.com:5432/geotrack_dbtest";

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function fixMemberSince() {
  try {
    const users = ['agent@test.com', 'admin@test.com'];
    
    for (const email of users) {
      // Get user details
      const userResult = await pool.query(
        'SELECT id, email, created_at FROM users WHERE email = $1',
        [email]
      );
      
      if (userResult.rows.length === 0) {
        console.log('User not found:', email);
        continue;
      }
      
      const user = userResult.rows[0];
      console.log('\nUser:', email);
      console.log('  User created_at:', user.created_at);
      
      // Get profile
      const profileResult = await pool.query(
        'SELECT id, created_at FROM profiles WHERE user_id = $1',
        [user.id]
      );
      
      if (profileResult.rows.length === 0) {
        console.log('  No profile - creating with user.created_at...');
        await pool.query(
          'INSERT INTO profiles (id, user_id, full_name, created_at, updated_at) VALUES (gen_random_uuid(), $1, NULL, $2, NOW())',
          [user.id, user.created_at]
        );
        console.log('  ✅ Profile created with created_at:', user.created_at);
      } else {
        const profile = profileResult.rows[0];
        console.log('  Profile exists, created_at:', profile.created_at);
        
        // Update profile created_at to match user.created_at
        if (profile.created_at !== user.created_at) {
          console.log('  ⚠️ Updating profile created_at to:', user.created_at);
          await pool.query(
            'UPDATE profiles SET created_at = $1, updated_at = NOW() WHERE user_id = $2',
            [user.created_at, user.id]
          );
          console.log('  ✅ Profile created_at updated');
        } else {
          console.log('  ✅ Profile created_at already correct');
        }
      }
    }
    
    await pool.end();
    console.log('\n✅ All done!');
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

fixMemberSince();
