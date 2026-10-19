/**
 * Tenant registry — add new tenants here.
 * Each tenant maps to its own PostgreSQL database.
 */

export interface TenantConfig {
  id:     string;  // tenant slug, used in X-Tenant header / subdomain
  name:   string;  // human-readable company name
  dbName: string;  // PostgreSQL database name for this tenant
}

export const TENANTS: Record<string, TenantConfig> = {
  logistics: {
    id:     'logistics',
    name:   'VARDH Logistics',
    dbName: 'tmsf_vardh',
  },

  vardh: {
    id:     'vardh',
    name:   'VARDH Logistics',
    dbName: 'tmsf_vardh',
  },

  'vardh-logistics': {
    id:     'vardh-logistics',
    name:   'VARDH Logistics',
    dbName: 'tmsf_vardh',
  },

  'tms-demo': {
    id:     'tms-demo',
    name:   'VARDH Demo Platform',
    dbName: 'tmsf_demo',
  },

  demo: {
    id:     'demo',
    name:   'VARDH Demo Platform',
    dbName: 'tmsf_demo',
  },

  dam: {
    id:     'dam',
    name:   'PT DAM',
    dbName: 'tmsf_dam',
  },
};

/** Default tenant when no subdomain / header is detected (e.g. bare localhost dev) */
export const DEFAULT_TENANT = 'logistics';
