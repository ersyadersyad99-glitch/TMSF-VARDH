import { API_BASE_URL, getHeaders } from './api';

export const gpsApi = {
  /**
   * Fetches all fleet vehicles for active tenant with their latest normalized GPS telemetry
   */
  async getVehicles() {
    try {
      const res = await fetch(`${API_BASE_URL}/gps/vehicles`, {
        method: 'GET',
        headers: { ...getHeaders() },
        credentials: 'include',
      });
      if (!res.ok) {
        console.warn('[GPS API] Failed to fetch vehicles:', res.status);
        return [];
      }
      return await res.json();
    } catch (err) {
      console.warn('[GPS API] getVehicles error:', err);
      return [];
    }
  },

  /**
   * Fetches latest GPS position for specific vehicle
   */
  async getVehicleById(vehicleId) {
    try {
      const res = await fetch(`${API_BASE_URL}/gps/vehicles/${encodeURIComponent(vehicleId)}`, {
        method: 'GET',
        headers: { ...getHeaders() },
        credentials: 'include',
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.warn('[GPS API] getVehicleById error:', err);
      return null;
    }
  },

  /**
   * Fetches historical breadcrumbs for route visualization
   */
  async getVehicleHistory(vehicleId, dateStr) {
    try {
      const query = dateStr ? `?date=${encodeURIComponent(dateStr)}` : '';
      const res = await fetch(`${API_BASE_URL}/gps/vehicles/${encodeURIComponent(vehicleId)}/history${query}`, {
        method: 'GET',
        headers: { ...getHeaders() },
        credentials: 'include',
      });
      if (!res.ok) return [];
      return await res.json();
    } catch (err) {
      console.warn('[GPS API] getVehicleHistory error:', err);
      return [];
    }
  },

  /**
   * Toggles the Demo GPS Simulator on or off
   */
  async toggleSimulator(enabled) {
    try {
      const res = await fetch(`${API_BASE_URL}/gps/demo/toggle`, {
        method: 'POST',
        headers: { ...getHeaders() },
        credentials: 'include',
        body: JSON.stringify(typeof enabled === 'boolean' ? { enabled } : {}),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.warn('[GPS API] toggleSimulator error:', err);
      return null;
    }
  },

  /**
   * Fetches all vendor external tracking links
   */
  async getTrackingLinks(params = {}) {
    try {
      const qs = new URLSearchParams();
      if (params.search) qs.set('search', params.search);
      if (params.status && params.status !== 'ALL') qs.set('status', params.status);
      if (params.doReference) qs.set('doReference', params.doReference);

      const url = `${API_BASE_URL}/gps/tracking-links${qs.toString() ? `?${qs.toString()}` : ''}`;
      const res = await fetch(url, {
        method: 'GET',
        headers: { ...getHeaders() },
        credentials: 'include',
      });
      if (!res.ok) return [];
      return await res.json();
    } catch (err) {
      console.warn('[GPS API] getTrackingLinks error:', err);
      return [];
    }
  },

  /**
   * Fetches single vendor tracking link details
   */
  async getTrackingLinkById(id) {
    try {
      const res = await fetch(`${API_BASE_URL}/gps/tracking-links/${encodeURIComponent(id)}`, {
        method: 'GET',
        headers: { ...getHeaders() },
        credentials: 'include',
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.warn('[GPS API] getTrackingLinkById error:', err);
      return null;
    }
  },

  /**
   * Registers a new vendor external tracking link
   */
  async createTrackingLink(data) {
    try {
      const res = await fetch(`${API_BASE_URL}/gps/tracking-links`, {
        method: 'POST',
        headers: { ...getHeaders(), 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Gagal menyimpan link tracking');
      }
      return await res.json();
    } catch (err) {
      console.error('[GPS API] createTrackingLink error:', err);
      throw err;
    }
  },

  /**
   * Updates an existing vendor external tracking link
   */
  async updateTrackingLink(id, data) {
    try {
      const res = await fetch(`${API_BASE_URL}/gps/tracking-links/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { ...getHeaders(), 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Gagal memperbarui link tracking');
      }
      return await res.json();
    } catch (err) {
      console.error('[GPS API] updateTrackingLink error:', err);
      throw err;
    }
  },

  /**
   * Deletes a vendor external tracking link
   */
  async deleteTrackingLink(id) {
    try {
      const res = await fetch(`${API_BASE_URL}/gps/tracking-links/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { ...getHeaders() },
        credentials: 'include',
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Gagal menghapus link tracking');
      }
      return await res.json();
    } catch (err) {
      console.error('[GPS API] deleteTrackingLink error:', err);
      throw err;
    }
  },
};
