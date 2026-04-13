const { Client } = require('pg');
const fs = require('fs');

// Determine tenant schema from environment or .env
const envText = fs.existsSync('.env') ? fs.readFileSync('.env','utf8') : '';
let tenant = process.env.TENANT_ID || 'saas';
const m = envText.match(/^TENANT_ID\s*=\s*"?([^"\n]+)"?/m);
if (m) tenant = m[1];
const schema = tenant.toLowerCase().replace(/[^a-z0-9_]/g,'_');

const urlMatch = envText.match(/DATABASE_URL="([^"]+)"/m);
const conn = (process.env.DATABASE_URL) ? process.env.DATABASE_URL.replace(/&options=.*$/,'') : (urlMatch ? urlMatch[1] : null);
if (!conn) { console.error('DATABASE_URL not found'); process.exit(1); }

const client = new Client({ connectionString: conn });

(async ()=>{
  try {
    await client.connect();
    console.log('Ensuring schema', schema);
    await client.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);

    const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'");
    const tableNames = res.rows.map(r=>r.table_name).filter(n=>n && !n.startsWith('_prisma'));
    console.log('Public tables to consider:', tableNames);

    for (const name of tableNames) {
      try {
        console.log('Moving table', name);
        await client.query(`ALTER TABLE public."${name}" SET SCHEMA "${schema}"`);
      } catch (e) {
        console.warn('Failed to move table', name, e.message);
      }
    }

    const seqs = await client.query(`SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema='public'`);
    for (const row of seqs.rows) {
      const seq = row.sequence_name;
      try {
        console.log('Moving sequence', seq);
        await client.query(`ALTER SEQUENCE public."${seq}" SET SCHEMA "${schema}"`);
      } catch (e) {
        console.warn('Failed to move sequence', seq, e.message);
      }
    }

    console.log('Done moving objects to schema', schema);
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
const { Client } = require('pg');
const fs = require('fs');
const env = fs.existsSync('.env') ? fs.readFileSync('.env','utf8') : '';
let tenant = process.env.TENANT_ID || 'saas';
const m = env.match(/^TENANT_ID\s*=\s*"?([^"\n]+)"?/m);
if (m) tenant = m[1];
const schema = tenant.toLowerCase().replace(/[^a-z0-9_]/g,'_');

const urlMatch = env.match(/DATABASE_URL="([^"]+)"/m);
const conn = (process.env.DATABASE_URL) ? process.env.DATABASE_URL.replace(/&options=.*$/,'') : (urlMatch ? urlMatch[1] : null);
if (!conn) { console.error('DATABASE_URL not found'); process.exit(1); }

const client = new Client({ connectionString: conn });

(async ()=>{
  try {
    await client.connect();
    console.log('Ensuring schema', schema);
    await client.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);

    const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'");
    const tableNames = res.rows.map(r=>r.table_name).filter(n=>n && !n.startsWith('_prisma'));
    console.log('Public tables to consider:', tableNames);

    for (const name of tableNames) {
      try {
        console.log('Moving table', name);
        await client.query(`ALTER TABLE public."${name}" SET SCHEMA "${schema}"`);
      } catch (e) {
        console.warn('Failed to move table', name, e.message);
      }
    }

    const seqs = await client.query(`SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema='public'`);
    for (const row of seqs.rows) {
      const seq = row.sequence_name;
      try {
        console.log('Moving sequence', seq);
        await client.query(`ALTER SEQUENCE public."${seq}" SET SCHEMA "${schema}"`);
      } catch (e) {
        console.warn('Failed to move sequence', seq, e.message);
      }
    }

    console.log('Done moving objects to schema', schema);
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
const { Client } = require('pg');
const fs = require('fs');
const env = fs.existsSync('.env') ? fs.readFileSync('.env','utf8') : '';
let tenant = process.env.TENANT_ID || 'saas';
const m = env.match(/^TENANT_ID\s*=\s*"?([^"\n]+)"?/m);
if (m) tenant = m[1];
const schema = tenant.toLowerCase().replace(/[^a-z0-9_]/g,'_');

const urlMatch = env.match(/DATABASE_URL="([^"]+)"/m);
const conn = (process.env.DATABASE_URL) ? process.env.DATABASE_URL.replace(/&options=.*$/,'') : (urlMatch ? urlMatch[1] : null);
if (!conn) { console.error('DATABASE_URL not found'); process.exit(1); }

const client = new Client({ connectionString: conn });

const tables = [
  '"User"','"Admin"','"Patient"','"Doctor"','"Pharmacist"','"Prescription"','"Medication"','"Medicine"','"Consent"','"PatientRecord"','"AccessLog"'
];

(async ()=>{
  try {
    await client.connect();
    console.log('Ensuring schema', schema);
    await client.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);

    for (const t of tables) {
      const exists = await client.query(`SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name = ${t.replace(/"/g,'')}`);
      // use safer check
      const q = `SELECT to_regclass('public.' || ${t}) IS NOT NULL as exists`;
      try {
        const r = await client.query(q);
        if (r.rows && r.rows[0] && r.rows[0].exists) {
          console.log('Moving table', t, 'to schema', schema);
          await client.query(`ALTER TABLE public.${t} SET SCHEMA "${schema}"`);
        } else {
          // try without quotes
          const rn = t.replace(/"/g,'');
          const r2 = await client.query(`SELECT to_regclass('public.' || '${rn}') IS NOT NULL as exists`);
          if (r2.rows[0].exists) {
            console.log('Moving table', rn, 'to schema', schema);
            await client.query(`ALTER TABLE public."${rn}" SET SCHEMA "${schema}"`);
          } else {
            // no-op
          }
        }
      } catch (e) {
        // ignore per-table errors
        console.warn('Check/move errored for', t, e.message);
      }
    }

    // move sequences in public to tenant schema
    const seqs = await client.query(`SELECT sequence_schema, sequence_name FROM information_schema.sequences WHERE sequence_schema='public'`);
    for (const row of seqs.rows) {
      try {
        console.log('Moving sequence', row.sequence_schema + '.' + row.sequence_name);
        await client.query(`ALTER SEQUENCE public."${row.sequence_name}" SET SCHEMA "${schema}"`);
      } catch (e) {
        console.warn('Failed moving sequence', row.sequence_name, e.message);
      }
    }

    console.log('Done moving objects to schema', schema);
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
