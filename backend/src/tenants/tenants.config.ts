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
  vardh: {
    id:     'vardh',
    name:   'VARDH Technology',
    dbName: 'tmsf_gercepin',
  },

  'tms-demo': {
    id:     'tms-demo',
    name:   'VARDH Technology',
    dbName: 'tmsf_gercepin',
  },

  gercepin: {
    id:     'gercepin',
    name:   'PT Gerak Cepat Indonesia',
    dbName: 'tmsf_gercepin',
  },

  dam: {
    id:     'dam',
    name:   'PT DAM',
    dbName: 'tmsf_dam',
  },
};

/** Default tenant when no subdomain / header is detected (e.g. bare localhost dev) */
export const DEFAULT_TENANT = 'vardh';
