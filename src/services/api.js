import { getActiveTenantId } from '../config/tenants';

const RAW_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const BASE_HOST = RAW_BASE_URL.replace(/\/+$/, '');

export const API_BASE_URL = BASE_HOST ? `${BASE_HOST}/api` : '/api';
export const UPLOADS_BASE_URL = BASE_HOST ? `${BASE_HOST}/uploads` : '/uploads';

export const getUploadUrl = (filename) => {
  if (!filename) return '';
  if (filename.startsWith('http://') || filename.startsWith('https://')) return filename;
  return `${UPLOADS_BASE_URL}/${encodeURIComponent(filename)}`;
};

/** Base headers included with every API call, dynamically resolving active tenant */
export const getHeaders = () => ({
  'Content-Type': 'application/json',
  'X-Tenant': getActiveTenantId(),
});

/**
 * Debounced state update notifier.
 * Waits 150ms after the last mutation before dispatching, so that
 * rapid consecutive saves (e.g. addOrder + addInvoice) only trigger
 * one refetch cycle instead of two competing ones.
 */
let _notifyTimer = null;
const notifyStateUpdated = () => {
  if (typeof window === 'undefined') return;
  if (_notifyTimer) clearTimeout(_notifyTimer);
  _notifyTimer = setTimeout(() => {
    _notifyTimer = null;
    window.dispatchEvent(new CustomEvent('tms_state_updated'));
  }, 200);
};

export const apiSync = {
  // ─── GET Fetchers ────────────────────────────────────────────────
  fetchOrders: async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/orders`, { headers: { ...getHeaders() }, credentials: 'include' });
      if (res.ok) return await res.json();
    } catch (e) { console.warn('API fetch warning (orders):', e); }
    return [];
  },

  fetchInvoices: async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/invoices`, { headers: { ...getHeaders() }, credentials: 'include' });
      if (res.ok) return await res.json();
    } catch (e) { console.warn('API fetch warning (invoices):', e); }
    return [];
  },

  fetchTravelFunds: async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/travel-funds`, { headers: { ...getHeaders() }, credentials: 'include' });
      if (res.ok) return await res.json();
    } catch (e) { console.warn('API fetch warning (travel-funds):', e); }
    return [];
  },

  fetchClients: async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/master/clients`, { headers: { ...getHeaders() }, credentials: 'include' });
      if (res.ok) return await res.json();
    } catch (e) { console.warn('API fetch warning (clients):', e); }
    return [];
  },

  fetchVendors: async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/master/vendors`, { headers: { ...getHeaders() }, credentials: 'include' });
      if (res.ok) return await res.json();
    } catch (e) { console.warn('API fetch warning (vendors):', e); }
    return [];
  },

  fetchFleet: async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/master/fleet`, { headers: { ...getHeaders() }, credentials: 'include' });
      if (res.ok) return await res.json();
    } catch (e) { console.warn('API fetch warning (fleet):', e); }
    return [];
  },

  fetchDrivers: async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/master/drivers`, { headers: { ...getHeaders() }, credentials: 'include' });
      if (res.ok) return await res.json();
    } catch (e) { console.warn('API fetch warning (drivers):', e); }
    return [];
  },

  fetchUsers: async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/users`, { headers: { ...getHeaders() }, credentials: 'include' });
      if (res.ok) return await res.json();
    } catch (e) { console.warn('API fetch warning (users):', e); }
    return [];
  },

  // ─── POST / PUT Savers ───────────────────────────────────────────
  saveOrder: async (order) => {
    try {
      const res = await fetch(`${API_BASE_URL}/orders`, {
        method: 'POST',
        headers: { ...getHeaders() },
        credentials: 'include',
        body: JSON.stringify(order),
      });
      if (res.ok) { notifyStateUpdated(); return await res.json(); }
    } catch (e) { console.warn('API sync warning (orders):', e); }
    return null;
  },

  saveInvoice: async (invoice) => {
    try {
      const res = await fetch(`${API_BASE_URL}/invoices`, {
        method: 'POST',
        headers: { ...getHeaders() },
        credentials: 'include',
        body: JSON.stringify(invoice),
      });
      if (res.ok) { notifyStateUpdated(); return await res.json(); }
    } catch (e) { console.warn('API sync warning (invoices):', e); }
    return null;
  },

  markInvoicePaid: async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/invoices/${encodeURIComponent(id)}/mark-paid`, {
        method: 'PATCH',
        headers: { ...getHeaders() },
        credentials: 'include',
      });
      if (res.ok) { notifyStateUpdated(); return await res.json(); }
    } catch (e) { console.warn('API sync warning (mark-paid invoice):', e); }
    return null;
  },

  saveTravelFund: async (fund) => {
    try {
      const res = await fetch(`${API_BASE_URL}/travel-funds`, {
        method: 'POST',
        headers: { ...getHeaders() },
        credentials: 'include',
        body: JSON.stringify(fund),
      });
      if (res.ok) { notifyStateUpdated(); return await res.json(); }
    } catch (e) { console.warn('API sync warning (travel-funds):', e); }
    return null;
  },

  saveClient: async (client) => {
    try {
      const res = await fetch(`${API_BASE_URL}/master/clients`, {
        method: 'POST',
        headers: { ...getHeaders() },
        credentials: 'include',
        body: JSON.stringify(client),
      });
      if (res.ok) { notifyStateUpdated(); return await res.json(); }
    } catch (e) { console.warn('API sync warning (clients):', e); }
    return null;
  },

  saveVendor: async (vendor) => {
    try {
      const res = await fetch(`${API_BASE_URL}/master/vendors`, {
        method: 'POST',
        headers: { ...getHeaders() },
        credentials: 'include',
        body: JSON.stringify(vendor),
      });
      if (res.ok) { notifyStateUpdated(); return await res.json(); }
    } catch (e) { console.warn('API sync warning (vendors):', e); }
    return null;
  },

  deleteVendor: async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/master/vendors/${id}`, {
        method: 'DELETE',
        headers: { ...getHeaders() },
        credentials: 'include',
      });
      if (res.ok) { notifyStateUpdated(); return await res.json(); }
    } catch (e) { console.warn('API sync warning (delete vendor):', e); }
    return null;
  },

  saveFleet: async (unit) => {
    try {
      const res = await fetch(`${API_BASE_URL}/master/fleet`, {
        method: 'POST',
        headers: { ...getHeaders() },
        credentials: 'include',
        body: JSON.stringify(unit),
      });
      if (res.ok) { notifyStateUpdated(); return await res.json(); }
    } catch (e) { console.warn('API sync warning (fleet):', e); }
    return null;
  },

  deleteFleet: async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/master/fleet/${id}`, {
        method: 'DELETE',
        headers: { ...getHeaders() },
        credentials: 'include',
      });
      if (res.ok) { notifyStateUpdated(); return await res.json(); }
    } catch (e) { console.warn('API sync warning (delete fleet):', e); }
    return null;
  },

  saveDriver: async (driver) => {
    try {
      const res = await fetch(`${API_BASE_URL}/master/drivers`, {
        method: 'POST',
        headers: { ...getHeaders() },
        credentials: 'include',
        body: JSON.stringify(driver),
      });
      if (res.ok) { notifyStateUpdated(); return await res.json(); }
    } catch (e) { console.warn('API sync warning (drivers):', e); }
    return null;
  },

  deleteDriver: async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/master/drivers/${id}`, {
        method: 'DELETE',
        headers: { ...getHeaders() },
        credentials: 'include',
      });
      if (res.ok) { notifyStateUpdated(); return await res.json(); }
    } catch (e) { console.warn('API sync warning (delete driver):', e); }
    return null;
  },

  createUser: async (user) => {
    try {
      const res = await fetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: { ...getHeaders() },
        credentials: 'include',
        body: JSON.stringify(user),
      });
      if (res.ok) { notifyStateUpdated(); return await res.json(); }
    } catch (e) { console.warn('API sync warning (create user):', e); }
    return null;
  },

  updateUser: async (id, updates) => {
    try {
      const res = await fetch(`${API_BASE_URL}/users/${id}`, {
        method: 'PATCH',
        headers: { ...getHeaders() },
        credentials: 'include',
        body: JSON.stringify(updates),
      });
      if (res.ok) { notifyStateUpdated(); return await res.json(); }
    } catch (e) { console.warn('API sync warning (update user):', e); }
    return null;
  },

  deleteUser: async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/users/${id}`, {
        method: 'DELETE',
        headers: { ...getHeaders() },
        credentials: 'include',
      });
      if (res.ok) { notifyStateUpdated(); return await res.json(); }
    } catch (e) { console.warn('API sync warning (delete user):', e); }
    return null;
  },


  assignDriver: async (payload) => {
    try {
      const res = await fetch(`${API_BASE_URL}/assignments`, {
        method: 'POST',
        headers: { ...getHeaders() },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (res.ok) { notifyStateUpdated(); return await res.json(); }
    } catch (e) { console.warn('API sync warning (assignments):', e); }
    return null;
  },

  uploadPODFile: async (orderId, dropId, file, podDate = null) => {
    try {
      const formData = new FormData();
      formData.append('pod', file);
      if (podDate) formData.append('podDate', podDate);
      const res = await fetch(`${API_BASE_URL}/orders/${encodeURIComponent(orderId)}/drops/${dropId}/pod`, {
        method: 'POST',
        headers: {
          'X-Tenant': getActiveTenantId(),
        },
        credentials: 'include',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        notifyStateUpdated();
        return data.filename;
      }
    } catch (e) { console.warn('API upload POD warning:', e); }
    return file ? file.name : null;
  },

  removePODFile: async (orderId, dropId) => {
    try {
      const formData = new FormData();
      formData.append('action', 'remove');
      const res = await fetch(`${API_BASE_URL}/orders/${encodeURIComponent(orderId)}/drops/${dropId}/pod`, {
        method: 'POST',
        headers: {
          'X-Tenant': getActiveTenantId(),
        },
        credentials: 'include',
        body: formData,
      });
      if (res.ok) {
        notifyStateUpdated();
        return await res.json();
      }
    } catch (e) { console.warn('API remove POD warning:', e); }
    return null;
  },

  addTravelFundItem: async (fundId, category, desc, amount, file) => {
    try {
      const formData = new FormData();
      formData.append('category', category || 'Uang Jalan Driver');
      formData.append('description', desc || category);
      formData.append('amount', String(amount || 0));
      if (file && typeof file === 'object' && file instanceof File) {
        formData.append('receipt', file);
      }
      const res = await fetch(`${API_BASE_URL}/travel-funds/${fundId}/items`, {
        method: 'POST',
        headers: {
          'X-Tenant': getActiveTenantId(),
        },
        credentials: 'include',
        body: formData,
      });
      if (res.ok) {
        notifyStateUpdated();
        return await res.json();
      }
    } catch (e) { console.warn('API add travel fund item warning:', e); }
    return null;
  },
  updateOrderStatus: async (orderId, status, podDate) => {
    try {
      const body = { status };
      if (podDate) body.podDate = podDate;
      const res = await fetch(`${API_BASE_URL}/orders/${encodeURIComponent(orderId)}/status`, {
        method: 'PATCH',
        headers: { ...getHeaders() },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      if (res.ok) { notifyStateUpdated(); return await res.json(); }
    } catch (e) { console.warn('API update status warning:', e); }
    return null;
  },

  /** Update Tanggal POD Aktual for a specific drop point */
  updateDropPodDate: async (orderId, dropId, podDate) => {
    try {
      const res = await fetch(`${API_BASE_URL}/orders/${encodeURIComponent(orderId)}/drops/${dropId}/pod-date`, {
        method: 'PATCH',
        headers: { ...getHeaders() },
        credentials: 'include',
        body: JSON.stringify({ podDate }),
      });
      if (res.ok) { notifyStateUpdated(); return await res.json(); }
    } catch (e) { console.warn('API update drop pod date warning:', e); }
    return null;
  },
};
