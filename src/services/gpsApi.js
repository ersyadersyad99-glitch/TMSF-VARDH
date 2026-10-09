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
};
