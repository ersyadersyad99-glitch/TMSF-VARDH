import 'dotenv/config';
import pg from 'pg';

const NEON_BASE_URL = 'postgresql://neondb_owner:npg_F0aKd2qPlMjv@ep-lively-credit-b39j75ag-pooler.c-4.ap-southeast-1.aws.neon.tech/tms_db?sslmode=require';

function getDbUrl(dbName: string): string {
  return NEON_BASE_URL.replace(/\/[^/?]+(\?.*)?$/, `/${dbName}$1`);
}

const TABLES_SQL = [
  // 1. Clients
  `CREATE TABLE IF NOT EXISTS clients (
    id varchar(50) PRIMARY KEY,
    name varchar(255) NOT NULL,
    contact varchar(100),
    address text,
    bank_account varchar(255),
    pic varchar(150),
    phone varchar(50),
    email varchar(150),
    city varchar(100),
    status varchar(30) DEFAULT 'active',
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL
  )`,

  // 2. Drivers
  `CREATE TABLE IF NOT EXISTS drivers (
    id varchar(50) PRIMARY KEY,
    name varchar(255) NOT NULL,
    phone varchar(50),
    license varchar(100),
    status varchar(30) DEFAULT 'available' NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL
  )`,

  // 3. Fleet
  `CREATE TABLE IF NOT EXISTS fleet (
    id varchar(50) PRIMARY KEY,
    plate varchar(50) NOT NULL,
    type varchar(100),
    capacity varchar(50),
    vendor varchar(255),
    status varchar(30) DEFAULT 'available' NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL
  )`,

  // 4. Vendors
  `CREATE TABLE IF NOT EXISTS vendors (
    id varchar(50) PRIMARY KEY,
    name varchar(255) NOT NULL,
    contact varchar(100),
    address text,
    bank_account varchar(255),
    pic varchar(150),
    phone varchar(50),
    email varchar(150),
    city varchar(100),
    status varchar(30) DEFAULT 'active',
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL
  )`,

  // 5. Locations
  `CREATE TABLE IF NOT EXISTS locations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    province varchar(100) NOT NULL,
    city varchar(100) NOT NULL,
    store varchar(200),
    created_at timestamp DEFAULT now() NOT NULL
  )`,

  // 6. Orders
  `CREATE TABLE IF NOT EXISTS orders (
    id varchar(30) PRIMARY KEY,
    so_number varchar(50),
    client_name varchar(255),
    client_id varchar(50) REFERENCES clients(id),
    date date NOT NULL,
    pickup_date date,
    etd_date date,
    eta_date date,
    pod_date date,
    total_value integer NOT NULL,
    dp_amount integer DEFAULT 0 NOT NULL,
    final_amount integer DEFAULT 0 NOT NULL,
    buying_price integer DEFAULT 0,
    status varchar(30) DEFAULT 'menunggu_dp' NOT NULL,
    payment_status varchar(30) DEFAULT 'belum_dp' NOT NULL,
    payment_type varchar(50) DEFAULT '70:30',
    invoice_pending boolean DEFAULT false,
    top_days integer,
    service_type varchar(50) DEFAULT 'FTL',
    unit_type varchar(50),
    kubikasi varchar(50),
    tonase varchar(50),
    weight varchar(50),
    origin_province varchar(100),
    origin_city varchar(100),
    origin_district varchar(100),
    origin_store varchar(200),
    driver_id varchar(50) REFERENCES drivers(id),
    driver_name varchar(150),
    fleet_id varchar(50) REFERENCES fleet(id),
    fleet_plate varchar(50),
    vendor_name varchar(150),
    vendor_payment_status varchar(30) DEFAULT 'unpaid',
    vendor_payment_date date,
    vendor_payment_details text,
    cost_breakdown text,
    notes text,
    created_by text,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL
  )`,

  // 7. Order Drops
  `CREATE TABLE IF NOT EXISTS order_drops (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id varchar(30) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    seq integer NOT NULL,
    province varchar(100),
    city varchar(100),
    district varchar(100),
    store varchar(200),
    pic varchar(150),
    phone varchar(50),
    status varchar(20) DEFAULT 'pending' NOT NULL,
    pod_file varchar(500),
    pod_date date,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL
  )`,

  // 8. Invoices
  `CREATE TABLE IF NOT EXISTS invoices (
    id varchar(50) PRIMARY KEY,
    order_id varchar(30) NOT NULL REFERENCES orders(id),
    client_id varchar(50) REFERENCES clients(id),
    client_name varchar(255),
    payment_type varchar(50),
    top_days integer,
    type varchar(20) NOT NULL,
    amount integer NOT NULL,
    issue_date date NOT NULL,
    due_date date NOT NULL,
    status varchar(20) DEFAULT 'unpaid' NOT NULL,
    paid_at timestamp,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL
  )`,

  // 9. Travel Funds
  `CREATE TABLE IF NOT EXISTS travel_funds (
    id varchar(30) PRIMARY KEY,
    order_id varchar(30) NOT NULL REFERENCES orders(id),
    driver_id varchar(50) REFERENCES drivers(id),
    request_amount integer NOT NULL,
    disbursed_amount integer DEFAULT 0 NOT NULL,
    total_realized integer DEFAULT 0 NOT NULL,
    balance integer DEFAULT 0 NOT NULL,
    status varchar(30) DEFAULT 'pengajuan' NOT NULL,
    request_date date NOT NULL,
    disbursed_at timestamp,
    finalized_at timestamp,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL
  )`,

  // 10. Travel Fund Items
  `CREATE TABLE IF NOT EXISTS travel_fund_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    travel_fund_id varchar(30) NOT NULL REFERENCES travel_funds(id) ON DELETE CASCADE,
    category varchar(50) DEFAULT 'Uang Jalan Driver' NOT NULL,
    description varchar(255) NOT NULL,
    amount integer NOT NULL,
    has_receipt boolean DEFAULT false NOT NULL,
    receipt_file varchar(500),
    created_at timestamp DEFAULT now() NOT NULL
  )`,

  // 11. GPS Devices
  `CREATE TABLE IF NOT EXISTS gps_devices (
    id varchar(50) PRIMARY KEY,
    fleet_id varchar(50),
    vehicle_plate varchar(50) NOT NULL,
    provider varchar(50) NOT NULL,
    device_uid varchar(100) NOT NULL,
    api_endpoint varchar(255),
    api_token_encrypted text,
    status varchar(30) DEFAULT 'ACTIVE' NOT NULL,
    is_simulated boolean DEFAULT false NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL
  )`,

  // 12. GPS Telemetry
  `CREATE TABLE IF NOT EXISTS gps_telemetry (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id varchar(50) NOT NULL REFERENCES gps_devices(id) ON DELETE CASCADE,
    fleet_id varchar(50),
    vehicle_plate varchar(50) NOT NULL,
    latitude double precision NOT NULL,
    longitude double precision NOT NULL,
    speed double precision DEFAULT 0 NOT NULL,
    heading double precision DEFAULT 0 NOT NULL,
    ignition boolean DEFAULT false NOT NULL,
    status varchar(30) DEFAULT 'STOPPED' NOT NULL,
    raw_payload jsonb,
    is_simulated boolean DEFAULT false NOT NULL,
    timestamp timestamp NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL
  )`,

  // 13. Vendor Tracking Links (External GPS)
  `CREATE TABLE IF NOT EXISTS vendor_tracking_links (
    id varchar(50) PRIMARY KEY,
    vendor_id varchar(50),
    vendor_name varchar(255) NOT NULL,
    do_reference varchar(100),
    vehicle_plate varchar(50),
    fleet_id varchar(50),
    driver_name varchar(150),
    tracking_url text NOT NULL,
    expires_at timestamp,
    status varchar(30) DEFAULT 'ACTIVE' NOT NULL,
    notes text,
    created_by varchar(100),
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL
  )`,
];

const INDEXES_SQL = [
  'CREATE INDEX IF NOT EXISTS idx_vtl_do_reference ON vendor_tracking_links (do_reference)',
  'CREATE INDEX IF NOT EXISTS idx_vtl_vehicle_plate ON vendor_tracking_links (vehicle_plate)',
  'CREATE INDEX IF NOT EXISTS idx_vtl_status ON vendor_tracking_links (status)',
  'CREATE INDEX IF NOT EXISTS idx_gps_device_plate ON gps_devices (vehicle_plate)',
  'CREATE INDEX IF NOT EXISTS idx_telemetry_device_time ON gps_telemetry (device_id, timestamp DESC)',
];

async function main() {
  console.log('🚀 Connecting to Neon PostgreSQL master...');
  const masterClient = new pg.Client({ connectionString: NEON_BASE_URL });
  await masterClient.connect();

  try {
    // 1. Check or Create Database
    const res = await masterClient.query("SELECT datname FROM pg_database WHERE datname = 'tmsf_vardh'");
    if (res.rows.length === 0) {
      console.log('📦 Creating database tmsf_vardh on Neon...');
      await masterClient.query('CREATE DATABASE tmsf_vardh');
      console.log('✅ Database tmsf_vardh created successfully!');
    } else {
      console.log('ℹ️ Database tmsf_vardh already exists on Neon.');
    }
  } finally {
    await masterClient.end();
  }

  // 2. Connect to tmsf_vardh and provision schema
  const vardhDbUrl = getDbUrl('tmsf_vardh');
  console.log('🔧 Connecting to tmsf_vardh to provision tables...');
  const vardhClient = new pg.Client({ connectionString: vardhDbUrl });
  await vardhClient.connect();

  try {
    for (const sql of TABLES_SQL) {
      await vardhClient.query(sql);
    }
    for (const sql of INDEXES_SQL) {
      await vardhClient.query(sql);
    }
    console.log('✅ All 13 core & GPS tables created successfully in tmsf_vardh!');

    // 3. Seed baseline initial master data for VARDH Logistics
    console.log('🌱 Checking / Seeding baseline data for VARDH Logistics...');
    const clientCheck = await vardhClient.query('SELECT COUNT(*) FROM clients');
    if (parseInt(clientCheck.rows[0].count, 10) === 0) {
      await vardhClient.query(`
        INSERT INTO clients (id, name, contact, phone, email, city, status) VALUES
        ('CLI-VARDH-001', 'PT Sinar Logistik Nusantara', 'Budi Santoso', '081234567890', 'budi@sinarlogistik.co.id', 'Jakarta', 'active'),
        ('CLI-VARDH-002', 'PT Mitra Distribusi Utama', 'Hendro Wijaya', '081198765432', 'hendro@mitradistribusi.com', 'Surabaya', 'active')
        ON CONFLICT (id) DO NOTHING;
      `);
      console.log('✅ Seeded initial clients for VARDH Logistics.');
    }

    const fleetCheck = await vardhClient.query('SELECT COUNT(*) FROM fleet');
    if (parseInt(fleetCheck.rows[0].count, 10) === 0) {
      await vardhClient.query(`
        INSERT INTO fleet (id, plate, type, capacity, vendor, status) VALUES
        ('FL-001', 'B 9201 VDH', 'CDD Long Box', '5 Ton', 'VARDH Fleet Dedicated', 'available'),
        ('FL-002', 'B 9202 VDH', 'Fuso Wingbox', '15 Ton', 'VARDH Fleet Dedicated', 'available'),
        ('FL-003', 'B 9203 VDH', 'Tronton Wingbox', '25 Ton', 'VARDH Fleet Dedicated', 'available')
        ON CONFLICT (id) DO NOTHING;
      `);
      console.log('✅ Seeded initial fleet for VARDH Logistics.');
    }

    const driverCheck = await vardhClient.query('SELECT COUNT(*) FROM drivers');
    if (parseInt(driverCheck.rows[0].count, 10) === 0) {
      await vardhClient.query(`
        INSERT INTO drivers (id, name, phone, license, status) VALUES
        ('DRV-001', 'Ahmad Fauzi', '081211223344', 'B2 Umum', 'available'),
        ('DRV-002', 'Supriadi', '081255667788', 'B2 Umum', 'available')
        ON CONFLICT (id) DO NOTHING;
      `);
      console.log('✅ Seeded initial drivers for VARDH Logistics.');
    }

    console.log('🎉 Setup for tmsf_vardh database completed successfully!');
  } finally {
    await vardhClient.end();
  }
}

main().catch((err) => {
  console.error('❌ Error executing setup-vardh-tenant:', err);
  process.exit(1);
});
