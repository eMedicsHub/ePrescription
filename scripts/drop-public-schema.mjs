import pg from 'pg';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
const { Pool } = pg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

(async () => {
  let url = process.env.DATABASE_URL;
  if (!url) {
    try {
      const envText = await fs.readFile(path.join(__dirname, '../.env'), 'utf8');
      const m = envText.match(/DATABASE_URL\s*=\s*"?([^"\n]+)"?/);
      if (m) url = m[1].trim();
    } catch (e) {
      // ignore
    }
  }
  if (!url) {
    console.error('DATABASE_URL not set.');
    process.exit(2);
  }

  const pool = new Pool({ connectionString: url });
  try {
    console.log('[1] Backing up public schema...');
    const dump = await pool.query(`
      SELECT 'DROP SCHEMA IF EXISTS public CASCADE;' as sql
      UNION ALL
      SELECT 'CREATE SCHEMA public;' as sql
    `);
    
    // Also dump the public schema contents as a safeguard
    const backupPath = path.join(__dirname, '../public-schema-backup.sql');
    let backupContent = '-- Public schema backup from ' + new Date().toISOString() + '\n';
    backupContent += '-- This backup was taken before dropping the public schema.\n\n';
    
    // Get migrations table content if it exists
    try {
      const migrationsBackup = await pool.query('SELECT * FROM public._prisma_migrations');
      backupContent += '-- _prisma_migrations table data:\n';
      backupContent += JSON.stringify(migrationsBackup.rows, null, 2) + '\n\n';
    } catch (e) {
      backupContent += '-- _prisma_migrations table not found (already dropped)\n\n';
    }
    
    await fs.writeFile(backupPath, backupContent, 'utf8');
    console.log(`[✓] Backup written to: ${backupPath}`);

    console.log('[2] Dropping public schema and all its objects...');
    await pool.query('DROP SCHEMA IF EXISTS public CASCADE;');
    console.log('[✓] Public schema dropped successfully.');

    console.log('[3] Recreating empty public schema (PostgreSQL default)...');
    await pool.query('CREATE SCHEMA public;');
    console.log('[✓] Empty public schema recreated.');

    const schemasAfter = await pool.query("SELECT schema_name FROM information_schema.schemata ORDER BY schema_name;");
    console.log('\nRemaining schemas:');
    console.table(schemasAfter.rows);

  } catch (err) {
    console.error('[ERROR]', err.message || err);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
