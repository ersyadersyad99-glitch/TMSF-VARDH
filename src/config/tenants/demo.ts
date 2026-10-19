import type { TenantBranding } from './gercepin';

export const demoBranding: TenantBranding = {
  id: 'tms-demo',
  name: 'VARDH TMS (Demo)',
  sidebarTitle: 'VARDH TMS',
  sidebarSubtitle: 'Demonstration & Sandbox',
  browserTitle: 'VARDH TMS Demo — Showcase Platform',
  logoText: 'V',
  logoSub: 'VARDH',
  logoBg: 'linear-gradient(135deg, #0066ff 0%, #00b894 100%)',
  logoImage: '/vardh-v-emblem.png',
  badge: 'DEMO SANDBOX',
  isDemo: true,
  portalLabel: 'TMS DEMO PLATFORM',
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
