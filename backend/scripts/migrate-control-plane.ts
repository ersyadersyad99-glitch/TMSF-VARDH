import 'dotenv/config';
import pg from 'pg';

const NEON_BASE_URL = 'postgresql://neondb_owner:npg_F0aKd2qPlMjv@ep-lively-credit-b39j75ag-pooler.c-4.ap-southeast-1.aws.neon.tech/tms_db?sslmode=require';

const CONTROL_PLANE_TABLES = [
  // 1. Organizations
  `CREATE TABLE IF NOT EXISTS organizations (
    id varchar(50) PRIMARY KEY,
    name text NOT NULL,
    slug varchar(80) NOT NULL UNIQUE,
    status varchar(30) DEFAULT 'active' NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL
  )`,

  // 2. Tenant Registry
  `CREATE TABLE IF NOT EXISTS tenant_registry (
    id varchar(50) PRIMARY KEY,
    organization_id varchar(50) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    tenant_key varchar(80) NOT NULL UNIQUE,
    database_provider varchar(50) DEFAULT 'neon' NOT NULL,
    database_reference text NOT NULL,
    region varchar(50) DEFAULT 'ap-southeast-1' NOT NULL,
    provisioning_status varchar(30) DEFAULT 'pending' NOT NULL,
    schema_version varchar(20) DEFAULT '1.0.0' NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL
  )`,

  // 3. Organization Memberships
  `CREATE TABLE IF NOT EXISTS organization_memberships (
    id varchar(50) PRIMARY KEY,
    organization_id varchar(50) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    role varchar(30) DEFAULT 'viewer' NOT NULL,
    status varchar(30) DEFAULT 'active' NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL,
    CONSTRAINT uq_org_memberships_user_org UNIQUE (user_id, organization_id)
  )`,

  // 4. Subscriptions
  `CREATE TABLE IF NOT EXISTS subscriptions (
    id varchar(50) PRIMARY KEY,
    organization_id varchar(50) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
    plan_code varchar(50) DEFAULT 'trial_14d' NOT NULL,
    status varchar(30) DEFAULT 'trialing' NOT NULL,
    trial_started_at timestamp DEFAULT now() NOT NULL,
    trial_ends_at timestamp NOT NULL,
    current_period_start timestamp DEFAULT now() NOT NULL,
    current_period_end timestamp NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL
  )`,

  // 5. Platform Audit Logs
  `CREATE TABLE IF NOT EXISTS platform_audit_logs (
    id varchar(50) PRIMARY KEY,
    organization_id varchar(50),
    user_id text,
    action varchar(100) NOT NULL,
    details text,
    ip_address varchar(50),
    created_at timestamp DEFAULT now() NOT NULL
  )`
];

const INDEXES_SQL = [
  'CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations (slug)',
  'CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations (status)',
  'CREATE INDEX IF NOT EXISTS idx_tenant_registry_key ON tenant_registry (tenant_key)',
  'CREATE INDEX IF NOT EXISTS idx_tenant_registry_org ON tenant_registry (organization_id)',
  'CREATE INDEX IF NOT EXISTS idx_tenant_registry_status ON tenant_registry (provisioning_status)',
  'CREATE INDEX IF NOT EXISTS idx_org_memberships_org ON organization_memberships (organization_id)',
  'CREATE INDEX IF NOT EXISTS idx_org_memberships_user ON organization_memberships (user_id)',
  'CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions (status)',
  'CREATE INDEX IF NOT EXISTS idx_subscriptions_trial_ends ON subscriptions (trial_ends_at)',
  'CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON platform_audit_logs (organization_id)',
  'CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON platform_audit_logs (action)',
  'CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON platform_audit_logs (created_at DESC)'
];

async function main() {
  console.log('🚀 Connecting to Control Plane database (tms_db)...');
  const client = new pg.Client({ connectionString: NEON_BASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    // 1. Create Control Plane tables
    console.log('📦 Provisioning Control Plane tables in tms_db...');
    for (const sql of CONTROL_PLANE_TABLES) {
      await client.query(sql);
    }
    for (const idx of INDEXES_SQL) {
      await client.query(idx);
    }
    console.log('✅ Control Plane tables and indexes created successfully!');

    // 2. Seed Baseline Existing Tenants into Organizations & Tenant Registry
    console.log('🌱 Seeding / verifying baseline organizations & tenant registry...');

    // A. VARDH Logistics (Primary Enterprise Tenant)
    await client.query(`
      INSERT INTO organizations (id, name, slug, status)
      VALUES ('org_vardh_logistics', 'VARDH Logistics Indonesia', 'logistics', 'active')
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status;
    `);

    await client.query(`
      INSERT INTO tenant_registry (id, organization_id, tenant_key, database_provider, database_reference, region, provisioning_status, schema_version)
      VALUES ('tr_vardh_logistics', 'org_vardh_logistics', 'logistics', 'neon', 'tmsf_vardh', 'ap-southeast-1', 'ready', '1.0.0')
      ON CONFLICT (id) DO UPDATE SET provisioning_status = EXCLUDED.provisioning_status;
    `);

    // B. TMS Demo Platform
    await client.query(`
      INSERT INTO organizations (id, name, slug, status)
      VALUES ('org_tms_demo', 'VARDH TMS Demo Platform', 'tms-demo', 'active')
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status;
    `);

    await client.query(`
      INSERT INTO tenant_registry (id, organization_id, tenant_key, database_provider, database_reference, region, provisioning_status, schema_version)
      VALUES ('tr_tms_demo', 'org_tms_demo', 'tms-demo', 'neon', 'tmsf_demo', 'ap-southeast-1', 'ready', '1.0.0')
      ON CONFLICT (id) DO UPDATE SET provisioning_status = EXCLUDED.provisioning_status;
    `);

    // C. PT DAM
    await client.query(`
      INSERT INTO organizations (id, name, slug, status)
      VALUES ('org_dam', 'PT Duta Armada Mandiri', 'dam', 'active')
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status;
    `);

    await client.query(`
      INSERT INTO tenant_registry (id, organization_id, tenant_key, database_provider, database_reference, region, provisioning_status, schema_version)
      VALUES ('tr_dam', 'org_dam', 'dam', 'neon', 'tmsf_dam', 'ap-southeast-1', 'ready', '1.0.0')
      ON CONFLICT (id) DO UPDATE SET provisioning_status = EXCLUDED.provisioning_status;
    `);

    // 3. Map Ersyad (Super Admin) as Owner of VARDH Logistics
    const ersyadUser = await client.query(`SELECT id FROM "user" WHERE email = 'ersyad.vardh@vardh.id' LIMIT 1`);
    if (ersyadUser.rows.length > 0) {
      const ersyadId = ersyadUser.rows[0].id;
      await client.query(`
        INSERT INTO organization_memberships (id, organization_id, user_id, role, status)
        VALUES ('mem_ersyad_vardh', 'org_vardh_logistics', $1, 'owner', 'active')
        ON CONFLICT (user_id, organization_id) DO UPDATE SET role = EXCLUDED.role, status = EXCLUDED.status;
      `, [ersyadId]);
      console.log('✅ Linked Ersyad (Super Admin) as Owner of VARDH Logistics.');

      // Also link to Demo
      await client.query(`
        INSERT INTO organization_memberships (id, organization_id, user_id, role, status)
        VALUES ('mem_ersyad_demo', 'org_tms_demo', $1, 'owner', 'active')
        ON CONFLICT (user_id, organization_id) DO UPDATE SET role = EXCLUDED.role, status = EXCLUDED.status;
      `, [ersyadId]);
      console.log('✅ Linked Ersyad as Owner of TMS Demo Platform.');
    }

    // 4. Seed Subscriptions (VARDH Logistics: Active Enterprise, Demo: Sandbox)
    const now = new Date();
    const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const enterpriseEnd = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

    await client.query(`
      INSERT INTO subscriptions (id, organization_id, plan_code, status, trial_started_at, trial_ends_at, current_period_start, current_period_end)
      VALUES ('sub_vardh_logistics', 'org_vardh_logistics', 'enterprise', 'active', $1::timestamp, $2::timestamp, $1::timestamp, $3::timestamp)
      ON CONFLICT (organization_id) DO UPDATE SET status = EXCLUDED.status;
    `, [now.toISOString(), trialEnd.toISOString(), enterpriseEnd.toISOString()]);

    await client.query(`
      INSERT INTO subscriptions (id, organization_id, plan_code, status, trial_started_at, trial_ends_at, current_period_start, current_period_end)
      VALUES ('sub_tms_demo', 'org_tms_demo', 'sandbox', 'active', $1::timestamp, $2::timestamp, $1::timestamp, $3::timestamp)
      ON CONFLICT (organization_id) DO UPDATE SET status = EXCLUDED.status;
    `, [now.toISOString(), trialEnd.toISOString(), enterpriseEnd.toISOString()]);

    await client.query(`
      INSERT INTO subscriptions (id, organization_id, plan_code, status, trial_started_at, trial_ends_at, current_period_start, current_period_end)
      VALUES ('sub_dam', 'org_dam', 'enterprise', 'active', $1::timestamp, $2::timestamp, $1::timestamp, $3::timestamp)
      ON CONFLICT (organization_id) DO UPDATE SET status = EXCLUDED.status;
    `, [now.toISOString(), trialEnd.toISOString(), enterpriseEnd.toISOString()]);

    console.log('✅ Baseline Subscriptions seeded successfully.');

    // 5. Audit Log Entry
    await client.query(`
      INSERT INTO platform_audit_logs (id, organization_id, action, details)
      VALUES ('log_init_phase1', 'org_vardh_logistics', 'PHASE1_CONTROL_PLANE_INITIALIZED', 'Control plane schema provisioned and baseline tenants registered');
    `);
    console.log('✅ Platform audit log recorded.');

    console.log('\n🎉 Phase 1 Control Plane Foundation executed successfully in tms_db!');
  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error('❌ Error provisioning Control Plane:', err);
  process.exit(1);
});
