const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://arzmart_db_user:mJ6iK7YbfltDcXqcHU8xHJ1kNml3flkM@dpg-damrvbrm8hqs73f4b85g-a.oregon-postgres.render.com/arzmart_db',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  console.log('=== ACTIVATING info@arz-mart.com ===');

  // 1. Update Admin user husseinmassara (id: 2) email to info@arz-mart.com
  await pool.query("UPDATE users SET email = 'info@arz-mart.com', full_name = 'Hussein Massara' WHERE id = 2");

  // 2. Ensure settings.contact_email is info@arz-mart.com
  await pool.query("UPDATE settings SET contact_email = 'info@arz-mart.com'");

  const admins = await pool.query("SELECT id, username, email, full_name, role FROM users WHERE role = 'admin'");
  console.table(admins.rows);

  const settings = await pool.query("SELECT contact_email, app_name FROM settings");
  console.table(settings.rows);

  console.log('info@arz-mart.com is now fully activated and linked to the Administrator account!');
  await pool.end();
}

run().catch(console.error);
