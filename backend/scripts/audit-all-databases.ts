import pg from 'pg';

const neonBase = 'postgresql://neondb_owner:npg_F0aKd2qPlMjv@ep-lively-credit-b39j75ag-pooler.c-4.ap-southeast-1.aws.neon.tech/tms_db?sslmode=require';

function getDbUrl(dbName: string): string {
  return neonBase.replace(/\/[^/?]+(\?.*)?$/, `/${dbName}$1`);
}

async function auditDatabase(dbName: string) {
  const url = getDbUrl(dbName);
  const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    const tables = tablesRes.rows.map(r => r.table_name);
    console.log(`\n=== DATABASE: ${dbName} (${tables.length} tables) ===`);
    console.log('Tables:', tables.join(', '));

    // Count rows in key tables
    for (const t of tables) {
      try {
        const countRes = await client.query(`SELECT COUNT(*) FROM "${t}"`);
        console.log(`  - ${t}: ${countRes.rows[0].count} rows`);
      } catch (err: any) {
        console.log(`  - ${t}: (error counting: ${err.message})`);
      }
    }
  } catch (err: any) {
    console.error(`Error auditing ${dbName}:`, err.message);
  } finally {
    await client.end();
  }
}

async function main() {
  const dbs = ['tms_db', 'tmsf_gercepin', 'tmsf_dam', 'tmsf_vardh'];
  for (const db of dbs) {
    await auditDatabase(db);
  }
}

main().catch(console.error);
