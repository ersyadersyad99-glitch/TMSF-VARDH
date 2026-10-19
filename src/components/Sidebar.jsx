import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Truck, Package, Receipt,
  Wallet, MapPin, Building2, Users, LogOut, Shield, Wrench, FileSpreadsheet
} from 'lucide-react';
import { useAuthStore } from '../store';
import { useTenant } from '../context/TenantContext';
import { roleLabels, roleColors, avatarGradients } from '../data/mockUsers';
import { hasPermission } from '../config/rbac';
import './Sidebar.css';

const navGroups = [
  {
    label: null,
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true, permission: 'orders.read' },
    ],
  },
  {
    label: 'Transport',
    items: [
      { to: '/transport/orders', icon: Package, label: 'Delivery Orders', permission: 'orders.read' },
      { to: '/transport/orders/bulk', icon: FileSpreadsheet, label: 'Bulk Booking', permission: 'orders.create' },
      { to: '/transport/assignments', icon: Truck, label: 'Penugasan', module: 'fleet', permission: 'assignments.read' },
    ],
  },
  {
    label: 'Finance',
    module: 'finance',
    permission: 'invoices.read',
    items: [
      { to: '/finance/invoices', icon: Receipt, label: 'Invoice', module: 'finance', permission: 'invoices.read' },
      { to: '/finance/travel-funds', icon: Wallet, label: 'Biaya Operasional', module: 'finance', permission: 'travel_funds.read' },
    ],
  },
  {
    label: 'Master Data',
    items: [
      { to: '/master/locations', icon: MapPin, label: 'GPS Tracking & Lokasi', permission: 'locations.read' },
      { to: '/master/clients', icon: Building2, label: 'Klien', permission: 'clients.read' },
      { to: '/master/fleet', icon: Truck, label: 'Armada Vendor', module: 'fleet', permission: 'fleet.read' },
      { to: '/master/maintenance', icon: Wrench, label: 'Perawatan Armada', module: 'maintenance', permission: 'fleet.read' },
    ],
  },
  {
    label: 'Pengaturan',
    permission: 'users.read',
    items: [
      { to: '/users', icon: Users, label: 'Akun Pengguna', permission: 'users.read' },
    ],
  },
];

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const { branding } = useTenant();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const userRole = user?.role || 'viewer';
  const roleColor = user ? (roleColors[user.role]?.color || '#8892a4') : '#8892a4';
  const avatarGrad = user ? (avatarGradients[user.role] || avatarGradients.viewer) : avatarGradients.viewer;

  // Filter groups and items based on BOTH tenant modules AND user permissions
  const filteredNavGroups = navGroups
    .map((group) => {
      // 1. Check group module flag
      if (group.module && branding.modules && branding.modules[group.module] === false) {
        return null;
      }
      // 2. Check group permission
      if (group.permission && !hasPermission(userRole, group.permission)) {
        return null;
      }

      // Filter items inside group
      const items = group.items.filter((item) => {
        // Module check
        if (item.module && branding.modules && branding.modules[item.module] === false) {
          return false;
        }
        // Permission check
        if (item.permission && !hasPermission(userRole, item.permission)) {
          return false;
        }
        return true;
      });

      if (items.length === 0) return null;
      return { ...group, items };
    })
    .filter(Boolean);

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="vardh-sidebar-brand">
          <img
            src={branding.logoImage || '/vardh-v-emblem.png'}
            alt={branding.sidebarTitle || 'VARDH'}
            className="vardh-sidebar-icon"
          />
          <div className="vardh-sidebar-text">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="vardh-sidebar-title">{branding.sidebarTitle || 'VARDH'}</span>
              {branding.badge && (
                <span style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.5px',
                  padding: '1px 5px',
                  borderRadius: 4,
                  background: branding.isDemo ? 'rgba(234, 179, 8, 0.15)' : 'rgba(0, 102, 255, 0.15)',
                  color: branding.isDemo ? '#b45309' : 'var(--color-primary, #0066ff)',
                  border: `1px solid ${branding.isDemo ? 'rgba(234, 179, 8, 0.3)' : 'rgba(0, 102, 255, 0.3)'}`,
                  textTransform: 'uppercase',
                }}>
                  {branding.isDemo ? 'DEMO' : 'LOGISTICS'}
                </span>
              )}
            </div>
            <span className="vardh-sidebar-subtitle">{branding.sidebarSubtitle || 'Smart Supply Chain & Freight'}</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {filteredNavGroups.map((group, gi) => (
          <div key={gi} className="sidebar-group">
            {group.label && (
              <span className="sidebar-group-label">{group.label}</span>
            )}
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                className={({ isActive }) =>
                  `sidebar-link ${isActive ? 'active' : ''}`
                }
              >
                <item.icon size={16} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* User footer */}
      {user && (
        <div className="sidebar-user-section">
          {/* Role badge */}
          <div className="sidebar-role-badge" style={{ color: roleColor, borderColor: `${roleColor}44`, background: `${roleColor}12` }}>
            <Shield size={10} />
            {roleLabels[user?.role] || user?.role || 'Super Admin'}
          </div>

          <div className="sidebar-user">
            <div className="sidebar-user-avatar" style={{ background: avatarGrad }}>
              {(user?.name || user?.email || 'Admin').charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="sidebar-user-name">{user?.name || 'Admin Utama'}</div>
              <div className="sidebar-user-role" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.email || 'admin@tms.id'}
              </div>
            </div>
            <button
              className="sidebar-logout-btn"
              onClick={handleLogout}
              title="Keluar"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
