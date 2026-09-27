export interface TenantModules {
  finance: boolean;
  fleet: boolean;
  maintenance: boolean;
}

export interface TenantBranding {
  id: string;
  name: string;
  sidebarTitle: string;
  sidebarSubtitle: string;
  browserTitle: string;
  logoText: string;
  logoSub: string;
  logoBg: string;
  logoImage?: string;   // Optional: path to actual logo image file (in /public)
  modules: TenantModules;
  colors: {
    primary: string;
    primaryHover: string;
    primaryDim: string;
    primaryGlow: string;
    sidebarBg: string;
    bgBase: string;
    textPrimary: string;
  };
}

export const gercepinBranding: TenantBranding = {
  id: 'gercepin',
  name: 'VARDH',
  sidebarTitle: 'VARDH',
  sidebarSubtitle: 'Technology. Systems. Growth.',
  browserTitle: 'VARDH — Transport Management System',
  logoText: 'V',
  logoSub: 'VARDH',
  logoBg: 'linear-gradient(135deg, #0066ff 0%, #0c182b 100%)',
  logoImage: '/logo-vardh.png',   // VARDH logo

  modules: {
    finance: true,
    fleet: true,
    maintenance: false,
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
