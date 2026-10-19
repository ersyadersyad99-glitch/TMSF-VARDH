import React, { createContext, useContext, useEffect, useState } from 'react';
import { getActiveTenantId, getTenantBranding } from '../config/tenants';

const defaultTenant = getActiveTenantId();
const TenantContext = createContext({
  tenantId: defaultTenant,
  branding: getTenantBranding(defaultTenant),
  setTenant: () => {},
});

export function TenantProvider({ children }) {
  const [tenantId, setTenantId] = useState(() => getActiveTenantId());
  const [branding, setBranding] = useState(() => getTenantBranding(tenantId));

  useEffect(() => {
    const currentBranding = getTenantBranding(tenantId);
    setBranding(currentBranding);

    // 1. Update Browser Title dynamically
    document.title = currentBranding.browserTitle;

    // 2. Dynamically inject CSS variables into document root element
    const root = document.documentElement;
    root.style.setProperty('--color-primary', currentBranding.colors.primary);
    root.style.setProperty('--color-primary-hover', currentBranding.colors.primaryHover);
    root.style.setProperty('--color-primary-dim', currentBranding.colors.primaryDim);
    root.style.setProperty('--color-primary-glow', currentBranding.colors.primaryGlow);
    root.style.setProperty('--color-bg-sidebar', currentBranding.colors.sidebarBg);
    root.style.setProperty('--color-bg-base', currentBranding.colors.bgBase);
    root.style.setProperty('--text-primary', currentBranding.colors.textPrimary);
  }, [tenantId]);

  return (
    <TenantContext.Provider value={{ tenantId, branding, setTenant: setTenantId }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}
