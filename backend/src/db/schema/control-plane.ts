import { pgTable, text, varchar, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { users } from './auth.js';

/**
 * 4.1 Organizations
 * Represents a customer company entity subscribing to TMSF SaaS.
 */
export const organizations = pgTable('organizations', {
  id:        text('id').primaryKey(), // e.g. org_xxx or uuid
  name:      text('name').notNull(),
  slug:      varchar('slug', { length: 80 }).notNull().unique(), // e.g. 'vardh-logistics', 'dam'
  status:    varchar('status', { length: 30 }).notNull().default('active'), // 'active' | 'suspended' | 'trial' | 'inactive'
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  slugIdx: uniqueIndex('idx_organizations_slug').on(table.slug),
  statusIdx: index('idx_organizations_status').on(table.status),
}));

/**
 * 4.2 Tenant Registry
 * Maps an organization / tenant key to its isolated PostgreSQL database.
 * No plaintext passwords stored in databaseReference.
 */
export const tenantRegistry = pgTable('tenant_registry', {
  id:                  text('id').primaryKey(),
  organizationId:      text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  tenantKey:           varchar('tenant_key', { length: 80 }).notNull().unique(), // maps to subdomain e.g. 'logistics', 'tms-demo'
  databaseProvider:    varchar('database_provider', { length: 50 }).notNull().default('neon'),
  databaseReference:   text('database_reference').notNull(), // database name e.g. 'tmsf_vardh' or safe config key
  region:              varchar('region', { length: 50 }).notNull().default('ap-southeast-1'),
  provisioningStatus:  varchar('provisioning_status', { length: 30 }).notNull().default('pending'), // 'pending' | 'provisioning' | 'ready' | 'failed' | 'suspended' | 'deprovisioning'
  schemaVersion:       varchar('schema_version', { length: 20 }).notNull().default('1.0.0'),
  createdAt:           timestamp('created_at').notNull().defaultNow(),
  updatedAt:           timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  tenantKeyIdx: uniqueIndex('idx_tenant_registry_key').on(table.tenantKey),
  orgIdx: index('idx_tenant_registry_org').on(table.organizationId),
  statusIdx: index('idx_tenant_registry_status').on(table.provisioningStatus),
}));

/**
 * 4.3 Organization Memberships
 * Maps users to organizations with their specific organization roles.
 */
export const organizationMemberships = pgTable('organization_memberships', {
  id:             text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  userId:         text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role:           varchar('role', { length: 30 }).notNull().default('viewer'), // 'owner' | 'admin' | 'dispatcher' | 'finance' | 'operations' | 'viewer'
  status:         varchar('status', { length: 30 }).notNull().default('active'), // 'active' | 'invited' | 'suspended'
  createdAt:      timestamp('created_at').notNull().defaultNow(),
  updatedAt:      timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userOrgIdx: uniqueIndex('idx_org_memberships_user_org').on(table.userId, table.organizationId),
  orgIdx: index('idx_org_memberships_org').on(table.organizationId),
  userIdx: index('idx_org_memberships_user').on(table.userId),
}));

/**
 * 4.4 Subscriptions
 * Tracks 14-day trial and paid plans for organizations.
 */
export const subscriptions = pgTable('subscriptions', {
  id:                 text('id').primaryKey(),
  organizationId:     text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }).unique(),
  planCode:           varchar('plan_code', { length: 50 }).notNull().default('trial_14d'), // 'trial_14d' | 'starter' | 'growth' | 'enterprise'
  status:             varchar('status', { length: 30 }).notNull().default('trialing'), // 'trialing' | 'active' | 'past_due' | 'suspended' | 'cancelled' | 'expired'
  trialStartedAt:     timestamp('trial_started_at').notNull().defaultNow(),
  trialEndsAt:        timestamp('trial_ends_at').notNull(),
  currentPeriodStart: timestamp('current_period_start').notNull().defaultNow(),
  currentPeriodEnd:   timestamp('current_period_end').notNull(),
  createdAt:          timestamp('created_at').notNull().defaultNow(),
  updatedAt:          timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  orgSubIdx: uniqueIndex('idx_subscriptions_org').on(table.organizationId),
  statusIdx: index('idx_subscriptions_status').on(table.status),
  trialEndsIdx: index('idx_subscriptions_trial_ends').on(table.trialEndsAt),
}));

/**
 * Audit Logs for Control Plane operations
 */
export const platformAuditLogs = pgTable('platform_audit_logs', {
  id:             text('id').primaryKey(),
  organizationId: text('organization_id'),
  userId:         text('user_id'),
  action:         varchar('action', { length: 100 }).notNull(), // e.g. 'ORGANIZATION_CREATED', 'TENANT_PROVISIONED', 'SUBSCRIPTION_EXTENDED'
  details:        text('details'),
  ipAddress:      varchar('ip_address', { length: 50 }),
  createdAt:      timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  orgIdx: index('idx_audit_logs_org').on(table.organizationId),
  userIdx: index('idx_audit_logs_user').on(table.userId),
  actionIdx: index('idx_audit_logs_action').on(table.action),
  createdIdx: index('idx_audit_logs_created').on(table.createdAt),
}));
