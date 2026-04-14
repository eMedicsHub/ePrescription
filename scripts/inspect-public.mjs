import pg from 'pg';
const { Pool } = pg;

(async () => {
  let url = process.env.DATABASE_URL;
  if (!url) {
    // Try to read from .env in project root
    try {
      const fs = await import('fs');
      const envText = fs.readFileSync(new URL('../.env', import.meta.url), 'utf8');
      const m = envText.match(/DATABASE_URL\s*=\s*"?([^"\n]+)"?/);
      if (m) url = m[1].trim();
    } catch (e) {
      // ignore
    }
  }
  if (!url) {
    console.error('DATABASE_URL not set in environment and .env not found or missing DATABASE_URL.');
    process.exit(2);
  }

  const pool = new Pool({ connectionString: url });
  try {
    const schemas = await pool.query("SELECT schema_name FROM information_schema.schemata ORDER BY schema_name;");
    console.log('Schemas:');
    console.table(schemas.rows);

    const tables = await pool.query("SELECT table_schema, table_name, table_type FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;");
    console.log('\nTables in public schema:');
    console.table(tables.rows);

    const sequences = await pool.query("SELECT sequence_schema, sequence_name FROM information_schema.sequences WHERE sequence_schema='public' ORDER BY sequence_name;");
    console.log('\nSequences in public schema:');
    console.table(sequences.rows);

    const routines = await pool.query("SELECT routine_schema, routine_name, routine_type FROM information_schema.routines WHERE routine_schema='public' ORDER BY routine_name;");
    console.log('\nRoutines (functions/procedures) in public schema:');
    console.table(routines.rows);

    const types = await pool.query("SELECT n.nspname as schema, t.typname as type FROM pg_type t JOIN pg_namespace n ON t.typnamespace = n.oid WHERE n.nspname = 'public' ORDER BY t.typname;");
    console.log('\nCustom types in public schema:');
    console.table(types.rows);
  } catch (err) {
    console.error('Error querying database:', err.message || err);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
