import fs from 'node:fs';
import { initDatabase } from '../server/db.js';
import { seedDemoData } from '../server/seed.js';

async function main() {
  const db = await initDatabase(':memory:');
  seedDemoData(db);

  const tables = db.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").map(r => r.name);

  let sql = 'PRAGMA foreign_keys = OFF;\n';
  let totalRows = 0;

  for (const table of tables) {
    const rows = db.all(`SELECT * FROM ${table}`);
    totalRows += rows.length;
    for (const row of rows) {
      const cols = Object.keys(row);
      const vals = cols.map(c => {
        const v = row[c];
        if (v === null || v === undefined) return 'NULL';
        if (typeof v === 'number') return v;
        return `'${String(v).replace(/'/g, "''")}'`;
      });
      sql += `INSERT OR REPLACE INTO ${table} (${cols.join(', ')}) VALUES (${vals.join(', ')});\n`;
    }
  }

  sql += 'PRAGMA foreign_keys = ON;\n';
  fs.writeFileSync('server/db/seed.sql', sql, 'utf8');
  console.log(`Generated server/db/seed.sql with ${totalRows} rows across ${tables.length} tables.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
