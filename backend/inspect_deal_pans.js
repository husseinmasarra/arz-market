const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.sqlite');
const fs = require('fs');
const path = require('path');

db.all("SELECT id, name_ar, name_en, image_url FROM products WHERE id = 4487 OR name_en LIKE '%Frying Pan%' OR name_en LIKE '%Peeler%'", (err, rows) => {
  console.log('SQLite products count:', rows ? rows.length : 0);
  if (rows) {
    for (const r of rows) {
      console.log(`ID: ${r.id} | Name: ${r.name_en} | Image: ${r.image_url ? r.image_url.slice(0, 80) : null}`);
    }
  }
});
