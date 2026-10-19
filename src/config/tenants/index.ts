import { gercepinBranding, TenantBranding } from './gercepin';
import { damBranding } from './dam';
import { vardhLogisticsBranding } from './vardh';
import { demoBranding } from './demo';

export type { TenantBranding };

export const TENANT_BRANDINGS: Record<string, TenantBranding> = {
  logistics: vardhLogisticsBranding,
  vardh: vardhLogisticsBranding,
  'vardh-logistics': vardhLogisticsBranding,
  'tms-demo': demoBranding,
  demo: demoBranding,
  gercepin: gercepinBranding,
  dam: damBranding,
};

export const DEFAULT_TENANT = 'logistics';

/**
 * Resolves active tenant ID dynamically:
 * 1. Query parameter override (e.g. ?tenant=tms-demo or ?tenant=logistics)
 * 2. Hostname Subdomain (e.g. logistics.vardh.id -> logistics, tms-demo.vardh.id -> tms-demo)
 * 3. Saved tenant in localStorage (for localhost dev)
 * 4. VITE_TENANT env variable override
 * 5. Fallback to DEFAULT_TENANT ('logistics')
 */
export function getActiveTenantId(): string {
  if (typeof window !== 'undefined') {
    // 1. Query parameter override (e.g. http://localhost:5173/?tenant=logistics)
    const urlParams = new URLSearchParams(window.location.search);
    const queryTenant = urlParams.get('tenant')?.toLowerCase();
    if (queryTenant && TENANT_BRANDINGS[queryTenant]) {
      localStorage.setItem('active_tenant', queryTenant);
      return queryTenant;
    }

    // 2. Subdomain of hostname (e.g. logistics.vardh.id -> logistics, tms-demo.vardh.id -> tms-demo)
    const host = window.location.hostname.toLowerCase();
    const subdomain = host.split('.')[0];

    if (subdomain === 'logistics' || subdomain === 'vardh-logistics') {
      return 'logistics';
    }
    if (subdomain === 'tms-demo' || subdomain === 'demo') {
      return 'tms-demo';
    }
    if (subdomain && TENANT_BRANDINGS[subdomain] && subdomain !== 'localhost') {
      return subdomain;
    }

    // 3. Saved tenant in localStorage (convenient for local dev testing)
    const savedTenant = localStorage.getItem('active_tenant');
    if (savedTenant && TENANT_BRANDINGS[savedTenant]) {
      return savedTenant;
    }

    // 4. Fallback for main domain vardh.id
    if (host.includes('vardh.id')) {
      return 'logistics';
    }
  }

  // 5. Env variable override
  const envTenant = import.meta.env.VITE_TENANT?.toLowerCase();
  if (envTenant && TENANT_BRANDINGS[envTenant]) {
    return envTenant;
  }

  return DEFAULT_TENANT;
}

export function getTenantBranding(tenantId?: string): TenantBranding {
  const id = tenantId || getActiveTenantId();
  return TENANT_BRANDINGS[id] || vardhLogisticsBranding;
}
