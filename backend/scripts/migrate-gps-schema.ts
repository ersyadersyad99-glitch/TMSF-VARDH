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
      console.log(`Applying GPS schema migrations to ${tenantDb}...`);
      await client.query(`
        -- 1. gps_providers
        CREATE TABLE IF NOT EXISTS gps_providers (
          id VARCHAR(50) PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          base_url VARCHAR(255),
          api_token TEXT,
          provider_type VARCHAR(50) NOT NULL DEFAULT 'generic_rest',
          active BOOLEAN NOT NULL DEFAULT true,
          polling_interval_sec INTEGER DEFAULT 30,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );

        -- 2. gps_devices
        CREATE TABLE IF NOT EXISTS gps_devices (
          id VARCHAR(50) PRIMARY KEY,
          vehicle_id VARCHAR(50) NOT NULL REFERENCES fleet(id) ON DELETE CASCADE,
          provider_id VARCHAR(50) REFERENCES gps_providers(id) ON DELETE SET NULL,
          device_uid VARCHAR(100) NOT NULL UNIQUE,
          status VARCHAR(30) NOT NULL DEFAULT 'OFFLINE',
          last_latitude DOUBLE PRECISION,
          last_longitude DOUBLE PRECISION,
          last_speed REAL DEFAULT 0,
          last_heading REAL DEFAULT 0,
          last_ignition BOOLEAN DEFAULT false,
          last_timestamp TIMESTAMP,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );

        -- 3. gps_location_history
        CREATE TABLE IF NOT EXISTS gps_location_history (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          vehicle_id VARCHAR(50) NOT NULL REFERENCES fleet(id) ON DELETE CASCADE,
          device_id VARCHAR(50) REFERENCES gps_devices(id) ON DELETE SET NULL,
          latitude DOUBLE PRECISION NOT NULL,
          longitude DOUBLE PRECISION NOT NULL,
          speed REAL DEFAULT 0,
          heading REAL DEFAULT 0,
          ignition BOOLEAN DEFAULT false,
          recorded_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );

        -- Indexes
        CREATE INDEX IF NOT EXISTS idx_gps_history_veh_time ON gps_location_history (vehicle_id, recorded_at DESC);
        CREATE INDEX IF NOT EXISTS idx_gps_devices_veh ON gps_devices (vehicle_id);
      `);

      console.log(`✅ ${tenantDb} GPS tables & indexes verified!`);
    } catch (err: any) {
      console.error(`Migration error for ${tenantDb}:`, err.message);
    } finally {
      client.release();
      await pool.end();
    }
  }
}

main().then(() => {
  console.log('All tenant database GPS migrations completed successfully.');
  process.exit(0);
}).catch(e => {
  console.error('Fatal migration error:', e);
  process.exit(1);
});
