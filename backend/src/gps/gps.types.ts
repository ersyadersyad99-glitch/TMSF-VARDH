export type VehicleGpsStatus = 'MOVING' | 'IDLE' | 'STOPPED' | 'OFFLINE';

export interface NormalizedGPSLocation {
  vehicleId: string;
  plate: string;
  vehicleType: string;
  vendor?: string | null;
  deviceId?: string | null;
  latitude: number;
  longitude: number;
  speed: number;        // km/h
  heading: number;      // 0-360 degrees
  ignition: boolean;
  status: VehicleGpsStatus;
  timestamp: string;    // ISO timestamp
  isSimulated?: boolean;
}

export interface GPSLocationHistoryItem {
  id: string;
  vehicleId: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  ignition: boolean;
  recordedAt: string;
}

export interface RawGPSPayload {
  deviceUid: string;
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  ignition?: boolean;
  timestamp?: string | number | Date;
}

export interface GPSProviderConfig {
  id: string;
  name: string;
  baseUrl?: string | null;
  providerType: string;
  active: boolean;
  pollingIntervalSec: number;
  // NOTE: apiToken is deliberately omitted from this public interface
}
