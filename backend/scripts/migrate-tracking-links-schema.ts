import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

const base = 'postgresql://neondb_owner:npg_F0aKd2qPlMjv@ep-lively-credit-b39j75ag-pooler.c-4.ap-southeast-1.aws.neon.tech';
const TENANTS = ['tmsf_gercepin', 'tmsf_dam'];

async function main() {
  for (const tenantDb of TENANTS) {
    console.log(`Connecting to tenant database: ${tenantDb}...`);
    const pool = new Pool({
      connectionString: `${base}/${tenantDb}?sslmode=require`,
      ssl: { rejectUnauthorized: false },
    });

    const client = await pool.connect();
    try {
      console.log(`Applying vendor_tracking_links schema migration to ${tenantDb}...`);
      await client.query(`
        -- vendor_tracking_links table
        CREATE TABLE IF NOT EXISTS vendor_tracking_links (
          id VARCHAR(50) PRIMARY KEY,
          vendor_id VARCHAR(50) REFERENCES vendors(id) ON DELETE SET NULL,
          vendor_name VARCHAR(150) NOT NULL,
          do_reference VARCHAR(50),
          vehicle_plate VARCHAR(50) NOT NULL,
          fleet_id VARCHAR(50) REFERENCES fleet(id) ON DELETE SET NULL,
          driver_name VARCHAR(150),
          tracking_url TEXT NOT NULL,
          expires_at TIMESTAMP,
          status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
          notes TEXT,
          created_by TEXT,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );

        -- Performance & search indexes
        CREATE INDEX IF NOT EXISTS idx_vtl_do_ref ON vendor_tracking_links (do_reference);
        CREATE INDEX IF NOT EXISTS idx_vtl_plate ON vendor_tracking_links (vehicle_plate);
        CREATE INDEX IF NOT EXISTS idx_vtl_status ON vendor_tracking_links (status);
        CREATE INDEX IF NOT EXISTS idx_vtl_created_at ON vendor_tracking_links (created_at DESC);
      `);

      console.log(`✅ ${tenantDb} vendor_tracking_links table & indexes verified!`);
    } catch (err: any) {
      console.error(`Migration error for ${tenantDb}:`, err.message);
      throw err;
    } finally {
      client.release();
      await pool.end();
    }
  }
}

main().then(() => {
  console.log('All tenant database migrations completed successfully.');
  process.exit(0);
}).catch(e => {
  console.error('Fatal migration error:', e);
  process.exit(1);
});
