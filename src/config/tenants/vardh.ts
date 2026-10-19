import type { TenantBranding } from './types';

export const vardhLogisticsBranding: TenantBranding = {
  id: 'logistics',
  name: 'VARDH Logistics',
  sidebarTitle: 'VARDH Logistics',
  sidebarSubtitle: 'Smart Supply Chain & Freight',
  browserTitle: 'VARDH Logistics — Enterprise TMS',
  logoText: 'V',
  logoSub: 'VARDH',
  logoBg: 'linear-gradient(135deg, #0066ff 0%, #00b894 100%)',
  logoImage: '/vardh-v-emblem.png',
  badge: 'ENTERPRISE TMS',
  isDemo: false,
  portalLabel: 'VARDH LOGISTICS PORTAL',
  modules: {
    finance: true,
    fleet: true,
    maintenance: true,
  },
  colors: {
    primary: '#0066ff',
    primaryHover: '#0052cc',
    primaryDim: 'rgba(0, 102, 255, 0.10)',
    primaryGlow: 'rgba(0, 102, 255, 0.25)',
    sidebarBg: '#f8fafc',
    bgBase: '#f1f5f9',
    textPrimary: '#0a1931',
  },
};

// Backward compatibility alias
export const vardhBranding = vardhLogisticsBranding;
