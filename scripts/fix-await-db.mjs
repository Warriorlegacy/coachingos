import fs from 'node:fs';

const files = fs.readdirSync('server/routes').map(f => 'server/routes/' + f);
files.push('server/middleware/auth.js');

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  const updated = content.replace(/(?<!await\s)db\.(get|all|run|exec)\(/g, (m, fn) => `await db.${fn}(`);
  if (content !== updated) {
    fs.writeFileSync(file, updated, 'utf8');
    console.log(`Updated ${file}`);
  }
}
