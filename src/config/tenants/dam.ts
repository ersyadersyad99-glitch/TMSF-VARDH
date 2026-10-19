import type { TenantBranding } from './types';

export const damBranding: TenantBranding = {
  id: 'dam',
  name: 'PT Duta Armada Mandiri',
  sidebarTitle: 'DAM LOGISTICS',
  sidebarSubtitle: 'Transport Management',
  browserTitle: 'DAM — Transport Management System',
  logoText: 'D',
  logoSub: 'DAM LOGISTICS',
  logoBg: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
  modules: {
    finance: true,
    fleet: true,
    maintenance: true,
  },
  colors: {
    primary: '#2563eb',
    primaryHover: '#1d4ed8',
    primaryDim: 'rgba(37, 99, 235, 0.10)',
    primaryGlow: 'rgba(37, 99, 235, 0.25)',
    sidebarBg: '#1e293b',
    bgBase: '#f1f5f9',
    textPrimary: '#0f172a',
  },
};
