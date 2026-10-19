import { create } from 'zustand';
import { authClient } from '../services/auth';
import { apiSync } from '../services/api';
import { mockUsers } from '../data/mockUsers';
import { mockOrders, mockInvoices, mockTravelFunds, mockFleet, mockDrivers, mockVendors, mockClients } from '../data/mockData';
import { getActiveTenantId } from '../config/tenants';

// ---- Server-backed Better Auth Store (HttpOnly Cookie Session) ----
export const useAuthStore = create((set, get) => ({
  user: null,
  session: null,
  isAuthenticated: false,
  loading: true,

  /**
   * Check active server session on app startup
   */
  checkSession: async () => {
    set({ loading: true });

    try {
      const data = await authClient.getSession();
      if (data && data.user) {
        const userObj = {
          ...data.user,
          name: data.user.name || data.user.email?.split('@')[0] || 'Admin Utama',
          role: data.user.role || 'super_admin',
        };
        try { localStorage.setItem('tms_session_user', JSON.stringify(userObj)); } catch {}
        set({
          user: userObj,
          session: data.session,
          isAuthenticated: true,
          loading: false,
        });
        return true;
      }
    } catch (e) {
      console.warn('Session check warning:', e);
    }

    // Check persisted session so page refresh stays on current page
    try {
      const savedUser = localStorage.getItem('tms_session_user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        set({
          user: parsed,
          session: { id: 'persisted-session' },
          isAuthenticated: true,
          loading: false,
        });
        return true;
      }
    } catch (e) {}

    set({
      user: null,
      session: null,
      isAuthenticated: false,
      loading: false,
    });
    return false;
  },

  /**
   * Sign in via Better Auth endpoint POST /api/auth/sign-in/email
   */
  login: async (email, password) => {
    try {
      const res = await authClient.signInEmail(email, password);
      if (res.ok && res.user) {
        const userObj = {
          ...res.user,
          name: res.user.name || res.user.email?.split('@')[0] || 'User',
          role: res.user.role || 'super_admin',
        };
        try { localStorage.setItem('tms_session_user', JSON.stringify(userObj)); } catch {}
        set({
          user: userObj,
          session: res.session,
          isAuthenticated: true,
          loading: false,
        });
        return { ok: true };
      }
    } catch (e) {
      console.warn('Backend login warning:', e);
    }

    // Dev fallback for demo accounts
    const mockFound = mockUsers.find(u => u.email === email && u.status === 'active');
    if (mockFound) {
      try { localStorage.setItem('tms_session_user', JSON.stringify(mockFound)); } catch {}
      set({
        user: mockFound,
        session: { id: 'dev-session' },
        isAuthenticated: true,
        loading: false,
      });
      return { ok: true };
    }

    return { ok: false, error: 'Email atau password salah, atau akun tidak aktif.' };
  },

  /**
   * Sign out via Better Auth endpoint POST /api/auth/sign-out
   */
  logout: async () => {
    try {
      await authClient.signOut();
    } catch (e) {}

    try { localStorage.removeItem('tms_session_user'); } catch {}
    set({
      user: null,
      session: null,
      isAuthenticated: false,
      loading: false,
    });
  },
}));

// ---- User Management Store ----
export const useUserStore = create((set) => ({
  users: mockUsers,

  fetchFromApi: async () => {
    const data = await apiSync.fetchUsers();
    if (data && Array.isArray(data) && data.length > 0) {
      set({ users: data });
    }
  },

  addUser: async (user) => {
    const created = await apiSync.createUser(user);
    if (created && created.id) {
      set(s => ({ users: [created, ...s.users.filter(u => u.id !== created.id)] }));
    } else {
      set(s => ({ users: [user, ...s.users] }));
    }
  },

  updateUser: async (id, updates) => {
    set(s => ({ users: s.users.map(u => u.id === id ? { ...u, ...updates } : u) }));
    await apiSync.updateUser(id, updates);
  },

  deleteUser: async (id) => {
    set(s => ({ users: s.users.filter(u => u.id !== id) }));
    await apiSync.deleteUser(id);
  },

  toggleStatus: (id) =>
    set(s => ({
      users: s.users.map(u =>
        u.id === id ? { ...u, status: u.status === 'active' ? 'inactive' : 'active' } : u
      ),
    })),
}));

// ---- Toast Store ----
export const useToastStore = create((set) => ({
  toasts: [],
  addToast: (message, type = 'info') => {
    const id = Date.now();
    set(s => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => {
      set(s => ({ toasts: s.toasts.filter(t => t.id !== id) }));
    }, 3500);
  },
  removeToast: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),
}));

// LocalStorage helper for Zustand stores with tenant namespacing
const loadStored = (key, fallback) => {
  try {
    const tenantKey = `${getActiveTenantId()}_${key}`;
    const raw = localStorage.getItem(tenantKey);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    // Backward compatibility fallback
    const legacyRaw = localStorage.getItem(key);
    if (legacyRaw !== null) {
      const parsed = JSON.parse(legacyRaw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    // First time initialization or empty local data — store fallback into localStorage
    localStorage.setItem(tenantKey, JSON.stringify(fallback));
    return fallback;
  } catch (e) {
    console.error(`Error loading stored key ${key}`, e);
  }
  return fallback;
};

const saveStored = (key, data) => {
  try {
    const tenantKey = `${getActiveTenantId()}_${key}`;
    localStorage.setItem(tenantKey, JSON.stringify(data));
  } catch (e) {
    console.error(`Error saving key ${key}`, e);
  }
};

// ---- Orders Store (persisted to localStorage & PostgreSQL DB) ----
export const useOrderStore = create((set, get) => ({
  orders: loadStored('tms_orders', mockOrders),

  addOrder: (order) => set(s => {
    const next = [order, ...s.orders];
    saveStored('tms_orders', next);
    apiSync.saveOrder(order);
    return { orders: next };
  }),

  updateOrderStatus: (id, status) => set(s => {
    const next = s.orders.map(o => o.id === id ? { ...o, status } : o);
    saveStored('tms_orders', next);
    const updated = next.find(o => o.id === id);
    if (updated) apiSync.saveOrder(updated);
    return { orders: next };
  }),

  updateDropPOD: (orderId, dropId, filename, podDate = null, isExplicitRemove = false) => set(s => {
    const next = s.orders.map(o => {
      if (o.id !== orderId) return o;
      const drops = (o.drops || []).map((d, idx) => {
        const matches = d.id === dropId || d.seq === dropId || String(d.id) === String(dropId) || String(d.seq) === String(dropId) || String(idx + 1) === String(dropId) || o.drops.length === 1;
        if (matches) {
          if (isExplicitRemove || (filename === null && podDate === null)) {
            return {
              ...d,
              pod: null,
              podFile: null,
              podDate: null,
              status: 'pending',
            };
          }
          // If filename=null but podDate has a value → date-only update, preserve existing file
          const isDateOnlyUpdate = filename === null && podDate !== null;
          const newFilename = isDateOnlyUpdate ? (d.pod || d.podFile || null) : (filename || null);
          const newStatus = newFilename ? 'done' : 'pending';
          return {
            ...d,
            pod: newFilename,
            podFile: newFilename,
            podDate: podDate !== null ? podDate : (d.podDate || null),
            status: newStatus,
          };
        }
        return d;
      });
      return { ...o, drops };
    });
    saveStored('tms_orders', next);
    const updated = next.find(o => o.id === orderId);
    if (updated) apiSync.saveOrder(updated);
    // Always sync podDate to dedicated backend endpoint if podDate provided
    if (podDate) apiSync.updateDropPodDate(orderId, dropId, podDate);
    return { orders: next };
  }),

  assignDriver: (orderId, driverId, driverName, fleetId, fleetPlate, serviceType = 'FTL', vendorName = null) => set(s => {
    const next = s.orders.map(o =>
      o.id === orderId
        ? { ...o, driverId, driverName, fleetId, fleetPlate, serviceType, vendorName, status: 'picked_up' }
        : o
    );
    saveStored('tms_orders', next);
    apiSync.assignDriver({ orderId, driverId, driverName, fleetId, fleetPlate, serviceType, vendorName });
    return { orders: next };
  }),

  updateShipmentStatus: (orderId, newStatus, podDate = null) => set(s => {
    const next = s.orders.map(o => {
      if (o.id !== orderId) return o;
      const update = { status: newStatus };
      if (newStatus === 'delivered' && podDate) {
        update.podDate = podDate;
        if (o.drops && Array.isArray(o.drops)) {
          update.drops = o.drops.map(d => ({ ...d, podDate: d.podDate || podDate }));
        }
      }
      return { ...o, ...update };
    });
    saveStored('tms_orders', next);
    // Use dedicated PATCH /status endpoint so podDate is persisted in PostgreSQL
    apiSync.updateOrderStatus(orderId, newStatus, podDate);
    const updated = next.find(o => o.id === orderId);
    if (updated) apiSync.saveOrder(updated);
    return { orders: next };
  }),


  closeOrder: (orderId) => set(s => {
    const next = s.orders.map(o =>
      o.id === orderId ? { ...o, status: 'selesai', paymentStatus: 'dp_lunas' } : o
    );
    saveStored('tms_orders', next);
    const updated = next.find(o => o.id === orderId);
    if (updated) apiSync.saveOrder(updated);
    return { orders: next };
  }),

  markDPPaid: (orderId) => set(s => {
    const next = s.orders.map(o =>
      o.id === orderId ? { ...o, paymentStatus: 'dp_lunas', status: o.status === 'menunggu_dp' ? 'aktif' : o.status } : o
    );
    saveStored('tms_orders', next);
    const updated = next.find(o => o.id === orderId);
    if (updated) apiSync.saveOrder(updated);
    return { orders: next };
  }),

  markOrderLunas: (orderId) => set(s => {
    const next = s.orders.map(o =>
      o.id === orderId ? { ...o, paymentStatus: 'lunas' } : o
    );
    saveStored('tms_orders', next);
    const updated = next.find(o => o.id === orderId);
    if (updated) apiSync.saveOrder(updated);
    return { orders: next };
  }),

  markVendorPayment: (orderId, paymentDetails = {}) => set(s => {
    const next = s.orders.map(o =>
      o.id === orderId
        ? {
            ...o,
            vendorPaymentStatus: 'paid',
            vendorPaymentDate: new Date().toISOString().split('T')[0],
            vendorPaymentDetails: paymentDetails,
          }
        : o
    );
    saveStored('tms_orders', next);
    const updated = next.find(o => o.id === orderId);
    if (updated) apiSync.saveOrder(updated);
    return { orders: next };
  }),

  fetchFromApi: async () => {
    const data = await apiSync.fetchOrders();
    if (data && Array.isArray(data)) {
      set({ orders: data });
      saveStored('tms_orders', data);
    }
  },
}));

// ---- Invoice Store (persisted to localStorage & PostgreSQL DB) ----
export const useInvoiceStore = create((set) => ({
  invoices: loadStored('tms_invoices', mockInvoices),

  markPaid: (id) => set(s => {
    const next = s.invoices.map(inv => inv.id === id ? { ...inv, status: 'paid' } : inv);
    saveStored('tms_invoices', next);
    const updated = next.find(i => i.id === id);
    if (updated) {
      apiSync.saveInvoice(updated);
      apiSync.markInvoicePaid(id);
    }
    return { invoices: next };
  }),

  addInvoice: (inv) => set(s => {
    const next = [inv, ...s.invoices];
    saveStored('tms_invoices', next);
    apiSync.saveInvoice(inv);
    return { invoices: next };
  }),

  fetchFromApi: async () => {
    const data = await apiSync.fetchInvoices();
    if (data && Array.isArray(data)) {
      set({ invoices: data });
      saveStored('tms_invoices', data);
    }
  },
}));

// ---- Travel Fund Store (persisted to localStorage & PostgreSQL DB) ----
export const useTravelFundStore = create((set) => ({
  funds: loadStored('tms_funds', mockTravelFunds),

  addFund: (fund) => set(s => {
    const next = [fund, ...s.funds];
    saveStored('tms_funds', next);
    apiSync.saveTravelFund(fund);
    return { funds: next };
  }),

  updateStatus: (id, status) => set(s => {
    const next = s.funds.map(f => f.id === id ? { ...f, status } : f);
    saveStored('tms_funds', next);
    const updated = next.find(f => f.id === id);
    if (updated) apiSync.saveTravelFund(updated);
    return { funds: next };
  }),

  addRealization: (fundId, item) => set(s => {
    const next = s.funds.map(f => {
      const targetId = f.id || f.fund?.id;
      if (targetId !== fundId) return f;

      const currentItems = f.realizations || f.items || f.fund?.realizations || f.fund?.items || [];
      const realizations = [...currentItems, item];
      const totalRealized = realizations.reduce((sum, r) => sum + (r.amount || 0), 0);
      const disbursed = f.disbursedAmount || f.fund?.disbursedAmount || f.requestAmount || 0;
      const balance = disbursed - totalRealized;

      if (f.fund) {
        return {
          ...f,
          fund: {
            ...f.fund,
            realizations,
            items: realizations,
            totalRealized,
            balance,
          },
          realizations,
          items: realizations,
          totalRealized,
          balance,
        };
      }

      return {
        ...f,
        realizations,
        items: realizations,
        totalRealized,
        balance,
      };
    });

    saveStored('tms_funds', next);
    const updated = next.find(f => f.id === fundId || f.fund?.id === fundId);
    if (updated) {
      const fundPayload = updated.fund
        ? { ...updated.fund, items: updated.fund.realizations || updated.realizations }
        : { ...updated, items: updated.realizations };
      apiSync.saveTravelFund(fundPayload);
    }
    return { funds: next };
  }),

  finalizeRealization: (fundId) => set(s => {
    const next = s.funds.map(f =>
      f.id === fundId ? { ...f, status: 'realisasi_selesai' } : f
    );
    saveStored('tms_funds', next);
    const updated = next.find(f => f.id === fundId);
    if (updated) apiSync.saveTravelFund(updated);
    return { funds: next };
  }),

  disburse: (fundId) => set(s => {
    const next = s.funds.map(f =>
      f.id === fundId ? { ...f, status: 'dicairkan', disbursedAmount: f.requestAmount, balance: f.requestAmount } : f
    );
    saveStored('tms_funds', next);
    const updated = next.find(f => f.id === fundId);
    if (updated) apiSync.saveTravelFund(updated);
    return { funds: next };
  }),

  fetchFromApi: async () => {
    const data = await apiSync.fetchTravelFunds();
    if (data && Array.isArray(data)) {
      set({ funds: data });
      saveStored('tms_funds', data);
    }
  },
}));

// ---- Fleet & Driver Store (persisted to localStorage & PostgreSQL DB) ----
export const useFleetStore = create((set) => ({
  fleet: loadStored('tms_fleet', mockFleet),
  drivers: loadStored('tms_drivers', mockDrivers),

  addFleet: (unit) => set(s => {
    const next = [unit, ...s.fleet];
    saveStored('tms_fleet', next);
    apiSync.saveFleet(unit);
    return { fleet: next };
  }),
  updateFleet: (id, updates) => set(s => {
    const next = s.fleet.map(f => f.id === id ? { ...f, ...updates } : f);
    saveStored('tms_fleet', next);
    const updated = next.find(f => f.id === id);
    if (updated) apiSync.saveFleet(updated);
    return { fleet: next };
  }),
  deleteFleet: (id) => set(s => {
    const next = s.fleet.filter(f => f.id !== id);
    saveStored('tms_fleet', next);
    apiSync.deleteFleet(id);
    return { fleet: next };
  }),

  addDriver: (driver) => set(s => {
    const next = [driver, ...s.drivers];
    saveStored('tms_drivers', next);
    apiSync.saveDriver(driver);
    return { drivers: next };
  }),
  updateDriver: (id, updates) => set(s => {
    const next = s.drivers.map(d => d.id === id ? { ...d, ...updates } : d);
    saveStored('tms_drivers', next);
    const updated = next.find(d => d.id === id);
    if (updated) apiSync.saveDriver(updated);
    return { drivers: next };
  }),
  deleteDriver: (id) => set(s => {
    const next = s.drivers.filter(d => d.id !== id);
    saveStored('tms_drivers', next);
    apiSync.deleteDriver(id);
    return { drivers: next };
  }),

  fetchFromApi: async () => {
    const fData = await apiSync.fetchFleet();
    if (fData && Array.isArray(fData)) {
      set({ fleet: fData });
      saveStored('tms_fleet', fData);
    }
    const dData = await apiSync.fetchDrivers();
    if (dData && Array.isArray(dData)) {
      set({ drivers: dData });
      saveStored('tms_drivers', dData);
    }
  },
}));

// ---- Vendor Armada Store (persisted to localStorage & PostgreSQL DB) ----
export const useVendorStore = create((set) => ({
  vendors: loadStored('tms_vendors', mockVendors),
  addVendor: (vendor) => set(s => {
    const next = [vendor, ...s.vendors];
    saveStored('tms_vendors', next);
    apiSync.saveVendor(vendor);
    return { vendors: next };
  }),
  updateVendor: (id, updates) => set(s => {
    const next = s.vendors.map(v => v.id === id ? { ...v, ...updates } : v);
    saveStored('tms_vendors', next);
    const updated = next.find(v => v.id === id);
    if (updated) apiSync.saveVendor(updated);
    return { vendors: next };
  }),
  deleteVendor: (id) => set(s => {
    const next = s.vendors.filter(v => v.id !== id);
    saveStored('tms_vendors', next);
    apiSync.deleteVendor(id);
    return { vendors: next };
  }),


  fetchFromApi: async () => {
    const data = await apiSync.fetchVendors();
    if (data && Array.isArray(data)) {
      set({ vendors: data });
      saveStored('tms_vendors', data);
    }
  },
}));

// ---- Master Client Store (persisted to localStorage & PostgreSQL DB) ----
export const useClientStore = create((set) => ({
  clients: loadStored('tms_clients', mockClients),
  addClient: (client) => set(s => {
    const next = [client, ...s.clients];
    saveStored('tms_clients', next);
    apiSync.saveClient(client);
    return { clients: next };
  }),
  updateClient: (id, updates) => set(s => {
    const next = s.clients.map(c => c.id === id ? { ...c, ...updates } : c);
    saveStored('tms_clients', next);
    const updated = next.find(c => c.id === id);
    if (updated) apiSync.saveClient(updated);
    return { clients: next };
  }),
  deleteClient: (id) => set(s => {
    const next = s.clients.filter(c => c.id !== id);
    saveStored('tms_clients', next);
    return { clients: next };
  }),

  fetchFromApi: async () => {
    const data = await apiSync.fetchClients();
    if (data && Array.isArray(data)) {
      set({ clients: data });
      saveStored('tms_clients', data);
    }
  },
}));

// Centralized Global Store Refetch Engine — debounced & non-re-entrant
let _isSyncing = false;
export const syncAllStoresFromDatabase = async () => {
  if (_isSyncing) return; // prevent re-entrant calls
  _isSyncing = true;
  try {
    const [orders, invoices, funds, vendors, clients] = await Promise.all([
      apiSync.fetchOrders(),
      apiSync.fetchInvoices(),
      apiSync.fetchTravelFunds(),
      apiSync.fetchVendors(),
      apiSync.fetchClients(),
    ]);
    const [fleetData, driversData, usersData] = await Promise.all([
      apiSync.fetchFleet(),
      apiSync.fetchDrivers(),
      apiSync.fetchUsers(),
    ]);

    // Batch-update stores from API — sync exact data from active tenant's PostgreSQL database
    if (Array.isArray(orders)) {
      useOrderStore.setState({ orders });
      saveStored('tms_orders', orders);
    }
    if (Array.isArray(invoices)) {
      useInvoiceStore.setState({ invoices });
      saveStored('tms_invoices', invoices);
    }
    if (Array.isArray(funds)) {
      useTravelFundStore.setState({ funds });
      saveStored('tms_funds', funds);
    }

    if (Array.isArray(vendors)) {
      useVendorStore.setState({ vendors });
      saveStored('tms_vendors', vendors);
    }
    if (Array.isArray(clients)) {
      useClientStore.setState({ clients });
      saveStored('tms_clients', clients);
    }
    if (Array.isArray(fleetData)) {
      useFleetStore.setState({ fleet: fleetData });
      saveStored('tms_fleet', fleetData);
    }
    if (Array.isArray(driversData)) {
      useFleetStore.setState({ drivers: driversData });
      saveStored('tms_drivers', driversData);
    }
    if (Array.isArray(usersData) && usersData.length > 0) {
      useUserStore.setState({ users: usersData });
    }
  } catch (e) {
    console.warn('Global store sync warning:', e);
  } finally {
    _isSyncing = false;
  }
};

// Register global event listeners for reactive cache invalidation on any mutation
if (typeof window !== 'undefined') {
  window.addEventListener('tms_state_updated', () => {
    syncAllStoresFromDatabase();
  });
  window.addEventListener('focus', () => {
    syncAllStoresFromDatabase();
  });
}

// On initial load: sync from database without wiping localStorage
setTimeout(() => {
  syncAllStoresFromDatabase();
}, 50);

