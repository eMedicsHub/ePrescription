const { execSync } = require('child_process');
const fs = require('fs');
const env = fs.existsSync('.env') ? fs.readFileSync('.env','utf8') : '';
const m = env.match(/DATABASE_URL="([^"]+)"/m);
if (!m) { console.error('DATABASE_URL not found in .env'); process.exit(1); }
let url = m[1];
url = url.replace(/&options=.*$/,'');
try {
  console.log('Running prisma migrate diff using prisma.config.ts...');
  // Use Prisma config datasource flags (removed --from-url in newer Prisma)
  const cmd = `npx prisma migrate diff --config prisma.config.ts --from-config-datasource --to-schema prisma/schema.prisma --script -o .tmp-split-admin.sql`;
  execSync(cmd, { stdio: 'inherit', maxBuffer: 10 * 1024 * 1024 });
  const out = fs.existsSync('.tmp-split-admin.sql') ? fs.readFileSync('.tmp-split-admin.sql','utf8') : '';
  console.log('Wrote .tmp-split-admin.sql, size', out.length);
} catch (e) {
  console.error('Failed to generate diff:', e.stdout ? e.stdout.toString() : e.message);
  process.exit(1);
}
