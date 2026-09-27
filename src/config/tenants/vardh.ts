import type { TenantBranding } from './gercepin';

export const vardhBranding: TenantBranding = {
  id: 'vardh',
  name: 'VARDH Indonesia',
  sidebarTitle: 'VARDH TMS',
  sidebarSubtitle: 'Technology. Systems. Growth.',
  browserTitle: 'VARDH — Transport Management System',
  logoText: 'V',
  logoSub: 'VARDH',
  logoBg: 'linear-gradient(135deg, #0066ff 0%, #00b894 100%)',
  logoImage: '/logo-vardh.png',
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
    sidebarBg: '#0c182b',
    bgBase: '#f1f5f9',
    textPrimary: '#0a1931',
  },
};
