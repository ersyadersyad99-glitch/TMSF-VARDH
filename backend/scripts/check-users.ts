import pg from 'pg';

const neonBase = 'postgresql://neondb_owner:npg_F0aKd2qPlMjv@ep-lively-credit-b39j75ag-pooler.c-4.ap-southeast-1.aws.neon.tech/tms_db?sslmode=require';

async function main() {
  const client = new pg.Client({ connectionString: neonBase, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const res = await client.query('SELECT id, name, email, role, status FROM "user"');
    console.log('USERS IN TMS_DB:', res.rows);
  } finally {
    await client.end();
  }
}

main().catch(console.error);
