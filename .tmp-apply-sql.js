const { Client } = require('pg');
const fs = require('fs');

const env = fs.existsSync('.env') ? fs.readFileSync('.env','utf8') : '';
const urlMatch = env.match(/DATABASE_URL=\"([^\"]+)\"/m);
const conn = (process.env.DATABASE_URL) ? process.env.DATABASE_URL.replace(/&options=.*$/,'') : (urlMatch ? urlMatch[1] : null);
if (!conn) { console.error('DATABASE_URL not found in .env or env'); process.exit(1); }

if (!fs.existsSync('.tmp-split-admin.sql')) { console.error('.tmp-split-admin.sql not found'); process.exit(1); }
const sql = fs.readFileSync('.tmp-split-admin.sql','utf8');

// Split on semicolon followed by newline to get statements. Keep simple for generated SQL.
const stmts = sql.split(/;\n/).map(s=>s.trim()).filter(Boolean);

const client = new Client({ connectionString: conn });

(async ()=>{
  try {
    await client.connect();
    console.log('Connected; executing', stmts.length, 'statements');
    let i = 0;
    let inTx = false;
    for (const st of stmts) {
      i++;
      const preview = st.replace(/\n/g,' ').slice(0,200);

      const upper = st.trim().toUpperCase();
      try {
        // Detect BEGIN/COMMIT even if comments precede them
        if (/^\s*(?:--.*\n\s*)*BEGIN\b/i.test(st)) {
          inTx = true;
          await client.query('BEGIN');
          console.log(`${i}/${stmts.length} BEGIN`);
          continue;
        }
        if (/^\s*(?:--.*\n\s*)*COMMIT\b/i.test(st)) {
          await client.query('COMMIT');
          inTx = false;
          console.log(`${i}/${stmts.length} COMMIT`);
          continue;
        }

        await client.query(st);
        console.log(`${i}/${stmts.length} OK: ${preview}`);
      } catch (e) {
        const msg = (e && e.message) ? e.message : String(e);
        if (inTx) {
          // rollback to clear aborted transaction and continue
          try {
            await client.query('ROLLBACK');
            console.warn(`${i}/${stmts.length} Error in transaction, rolled back: ${msg}`);
          } catch (rbErr) {
            console.error('Rollback failed:', rbErr && rbErr.message ? rbErr.message : rbErr);
            throw rbErr;
          }
          inTx = false;
          continue;
        }
        // Non-fatal errors to ignore (object already exists, duplicate, etc.)
        if (/already exists|duplicate key value|duplicate|already an enum|type .* already exists|relation .* already exists|could not open file|does not exist/i.test(msg)) {
          console.warn(`${i}/${stmts.length} Skipped (exists): ${msg}`);
          continue;
        }
        console.error(`${i}/${stmts.length} Failed: ${msg}`);
        throw e;
      }
    }
    console.log('All statements processed');
  } catch (err) {
    console.error('Execution failed:', err && err.message ? err.message : err);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
