const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://arzmart_db_user:mJ6iK7YbfltDcXqcHU8xHJ1kNml3flkM@dpg-damrvbrm8hqs73f4b85g-a.oregon-postgres.render.com/arzmart_db',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  console.log('=== CHECKING USERS ===');
  const u = await pool.query("SELECT id, username, email, full_name, role, permissions FROM users WHERE LOWER(email) = 'info@arz-mart.com' OR LOWER(username) = 'info@arz-mart.com'");
  console.log('Users matched:', u.rows);

  console.log('=== CHECKING ALL ADMIN USERS ===');
  const admins = await pool.query("SELECT id, username, email, full_name, role FROM users WHERE role = 'admin'");
  console.log('Admins:', admins.rows);

  console.log('=== CHECKING SETTINGS ===');
  const settings = await pool.query("SELECT * FROM settings");
  console.log('Settings:', settings.rows);

  await pool.end();
}

run().catch(console.error);
