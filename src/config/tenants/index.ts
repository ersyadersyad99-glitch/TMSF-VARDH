import { gercepinBranding, TenantBranding } from './gercepin';
import { damBranding } from './dam';
import { vardhBranding } from './vardh';

export type { TenantBranding };

export const TENANT_BRANDINGS: Record<string, TenantBranding> = {
  vardh: vardhBranding,
  'tms-demo': vardhBranding,
  gercepin: gercepinBranding,
  dam: damBranding,
};

export const DEFAULT_TENANT = 'vardh';

/**
 * Resolves active tenant ID dynamically:
 * 1. Query parameter override (e.g. ?tenant=dam)
 * 2. Saved tenant in localStorage
 * 3. Subdomain of hostname (e.g. dam.local -> dam, gercepin.local -> gercepin)
 * 4. VITE_TENANT env variable override
 * 5. Fallback to DEFAULT_TENANT ('vardh')
 */
export function getActiveTenantId(): string {
  if (typeof window !== 'undefined') {
    // 1. Query parameter override (e.g. http://localhost:5173/?tenant=dam)
    const urlParams = new URLSearchParams(window.location.search);
    const queryTenant = urlParams.get('tenant');
    if (queryTenant && TENANT_BRANDINGS[queryTenant]) {
      localStorage.setItem('active_tenant', queryTenant);
      return queryTenant;
    }

    // 2. Saved tenant in localStorage
    const savedTenant = localStorage.getItem('active_tenant');
    if (savedTenant && TENANT_BRANDINGS[savedTenant]) {
      return savedTenant;
    }

    // 3. Subdomain of hostname (e.g. dam.vardh.id -> dam, gercepin.vardh.id -> gercepin)
    const host = window.location.hostname;
    const subdomain = host.split('.')[0];
    if (subdomain && TENANT_BRANDINGS[subdomain]) {
      return subdomain;
    }

    // 4. Default to vardh for vardh.id domains
    if (host.includes('vardh.id')) {
      return 'vardh';
    }
  }

  // 5. Env variable override
  const envTenant = import.meta.env.VITE_TENANT;
  if (envTenant && TENANT_BRANDINGS[envTenant]) {
    return envTenant;
  }

  return DEFAULT_TENANT;
}

export function getTenantBranding(tenantId?: string): TenantBranding {
  const id = tenantId || getActiveTenantId();
  return TENANT_BRANDINGS[id] || vardhBranding;
}

