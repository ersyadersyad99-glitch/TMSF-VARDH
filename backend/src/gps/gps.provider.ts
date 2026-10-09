import type { RawGPSPayload, NormalizedGPSLocation, VehicleGpsStatus } from './gps.types.js';

export interface IGPSProvider {
  readonly providerType: string;
  fetchLocations(baseUrl?: string, apiToken?: string, deviceUids?: string[]): Promise<RawGPSPayload[]>;
}

/**
 * Generic REST API Provider adapter for external telematics APIs.
 * Sensitive apiToken is processed solely within this backend boundary.
 */
export class GenericRestGPSProvider implements IGPSProvider {
  readonly providerType = 'generic_rest';

  async fetchLocations(baseUrl?: string, apiToken?: string, deviceUids: string[] = []): Promise<RawGPSPayload[]> {
    if (!baseUrl) return [];
    try {
      const headers: Record<string, string> = {
        'Accept': 'application/json',
      };
      if (apiToken) {
        headers['Authorization'] = `Bearer ${apiToken}`;
      }

      const res = await fetch(baseUrl, { method: 'GET', headers });
      if (!res.ok) {
        console.warn(`[GPS Provider] ${this.providerType} returned status ${res.status}`);
        return [];
      }
      const data = await res.json();
      if (!Array.isArray(data)) return [];

      return data.map((item: any) => ({
        deviceUid: String(item.deviceUid || item.deviceId || item.imei || ''),
        latitude:  Number(item.latitude || item.lat || 0),
        longitude: Number(item.longitude || item.lon || item.lng || 0),
        speed:     Number(item.speed || 0),
        heading:   Number(item.heading || item.bearing || item.course || 0),
        ignition:  Boolean(item.ignition ?? true),
        timestamp: item.timestamp || item.recordedAt || new Date().toISOString(),
      })).filter(p => p.deviceUid && !isNaN(p.latitude) && !isNaN(p.longitude));
    } catch (err: any) {
      console.warn(`[GPS Provider] GenericRest error:`, err.message);
      return [];
    }
  }
}

/**
 * Realistic Highway Waypoint corridors in Java (Trans-Java Toll corridor):
 * Jakarta - Cikampek - Cirebon - Semarang - Solo - Surabaya
 */
const DEMO_WAYPOINTS = [
  { lat: -6.175110, lng: 106.865039 }, // Jakarta Timur (Depot Tanjung Priok)
  { lat: -6.241586, lng: 106.992416 }, // Bekasi Barat
  { lat: -6.402484, lng: 107.288628 }, // Karawang Timur
  { lat: -6.417240, lng: 107.568321 }, // Cikampek Utama
  { lat: -6.551320, lng: 107.765412 }, // Subang
  { lat: -6.732100, lng: 108.552100 }, // Cirebon
  { lat: -6.890120, lng: 109.124500 }, // Tegal
  { lat: -6.914200, lng: 109.680400 }, // Pekalongan
  { lat: -6.993200, lng: 110.420300 }, // Semarang
  { lat: -7.560100, lng: 110.825100 }, // Solo
  { lat: -7.257500, lng: 112.752100 }, // Surabaya (Rungkut Industri)
];

interface SimState {
  segmentIndex: number;
  progress: number; // 0.0 to 1.0
  speed: number;
  ignition: boolean;
  status: VehicleGpsStatus;
}

/**
 * Demo GPS Simulator:
 * Provides realistic, smooth movement along real freight corridors for testing.
 * Can be turned ON/OFF on demand and does not pollute real hardware data.
 */
export class DemoSimulatorGPSProvider {
  private static simStates: Map<string, SimState> = new Map();
  private static enabled = true;

  static isEnabled(): boolean {
    return this.enabled;
  }

  static setEnabled(val: boolean) {
    this.enabled = val;
  }

  static getSimulatedVehicles(fleetUnits: Array<{ id: string; plate: string; type?: string | null; vendor?: string | null }>): NormalizedGPSLocation[] {
    const now = new Date();

    return fleetUnits.map((unit, index) => {
      let state = this.simStates.get(unit.id);
      if (!state) {
        // Offset starting positions along the corridor
        const seg = (index * 2) % (DEMO_WAYPOINTS.length - 1);
        const progress = (index * 0.25) % 1.0;
        state = {
          segmentIndex: seg,
          progress,
          speed: index === 2 ? 0 : 50 + (index * 8),
          ignition: index !== 3,
          status: index === 2 ? 'IDLE' : index === 3 ? 'STOPPED' : 'MOVING',
        };
        this.simStates.set(unit.id, state);
      }

      if (this.enabled && state.status === 'MOVING') {
        // Advance along segment
        state.progress += 0.035;
        if (state.progress >= 1.0) {
          state.progress = 0;
          state.segmentIndex = (state.segmentIndex + 1) % (DEMO_WAYPOINTS.length - 1);
        }
        // Realistic fluctuating speed
        state.speed = Math.max(35, Math.min(85, Math.round(state.speed + (Math.random() * 8 - 4))));
      }

      const p1 = DEMO_WAYPOINTS[state.segmentIndex];
      const p2 = DEMO_WAYPOINTS[state.segmentIndex + 1] || DEMO_WAYPOINTS[0];

      // Interpolate current coordinates
      const currentLat = p1.lat + (p2.lat - p1.lat) * state.progress;
      const currentLng = p1.lng + (p2.lng - p1.lng) * state.progress;

      // Compute heading angle (0-360)
      const dLng = p2.lng - p1.lng;
      const dLat = p2.lat - p1.lat;
      let heading = Math.round((Math.atan2(dLng, dLat) * 180) / Math.PI);
      if (heading < 0) heading += 360;

      // Evaluate status
      let status: VehicleGpsStatus = 'OFFLINE';
      if (!state.ignition) {
        status = 'STOPPED';
      } else if (state.speed <= 5) {
        status = 'IDLE';
      } else {
        status = 'MOVING';
      }

      return {
        vehicleId:   unit.id,
        plate:       unit.plate,
        vehicleType: unit.type || 'CDD Box',
        vendor:      unit.vendor || 'VARDH Logistics Fleet',
        deviceId:    `DEMO-GPS-${unit.id}`,
        latitude:    Number(currentLat.toFixed(6)),
        longitude:   Number(currentLng.toFixed(6)),
        speed:       state.speed,
        heading,
        ignition:    state.ignition,
        status,
        timestamp:   now.toISOString(),
        isSimulated: true,
      };
    });
  }
}
