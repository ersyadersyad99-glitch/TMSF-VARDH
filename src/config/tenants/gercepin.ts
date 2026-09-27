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
    primary: '#3d7a7a',
    primaryHover: '#2d6363',
    primaryDim: 'rgba(61, 122, 122, 0.10)',
    primaryGlow: 'rgba(61, 122, 122, 0.25)',
    sidebarBg: '#2d5f5f',
    bgBase: '#f0f4f4',
    textPrimary: '#1a3333',
  },
};
