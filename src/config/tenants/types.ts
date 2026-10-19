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
  badge?: string;
  isDemo?: boolean;
  portalLabel?: string;
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
