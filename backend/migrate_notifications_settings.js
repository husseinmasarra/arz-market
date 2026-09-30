const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://arzmart_db_user:mJ6iK7YbfltDcXqcHU8xHJ1kNml3flkM@dpg-damrvbrm8hqs73f4b85g-a.oregon-postgres.render.com/arzmart_db',
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  console.log('Migrating settings table...');
  await pool.query('ALTER TABLE settings ADD COLUMN IF NOT EXISTS telegram_bot_token TEXT');
  await pool.query('ALTER TABLE settings ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT');
  await pool.query('ALTER TABLE settings ADD COLUMN IF NOT EXISTS admin_whatsapp_number TEXT');
  await pool.query('ALTER TABLE settings ADD COLUMN IF NOT EXISTS auto_sync_enabled INTEGER DEFAULT 1');

  // Set default admin whatsapp number if empty
  await pool.query("UPDATE settings SET admin_whatsapp_number = '+96170000000' WHERE admin_whatsapp_number IS NULL OR admin_whatsapp_number = ''");

  const cols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'settings'");
  console.log('Updated settings columns:', cols.rows.map(c => c.column_name));
  await pool.end();
}

migrate().catch(console.error);
