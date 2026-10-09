import type { DB } from '../db/index.js';
import { fleet, gpsDevices, gpsProviders, gpsLocationHistory } from '../db/schema/index.js';
import { eq, desc, and, gte, lte } from 'drizzle-orm';
import type { NormalizedGPSLocation, RawGPSPayload, VehicleGpsStatus, GPSLocationHistoryItem } from './gps.types.js';
import { DemoSimulatorGPSProvider } from './gps.provider.js';

const OFFLINE_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

export const gpsService = {
  /**
   * Evaluates operational vehicle status based on normalized inputs
   */
  computeStatus(speed: number, ignition: boolean, timestamp: Date | string): VehicleGpsStatus {
    const diff = Date.now() - new Date(timestamp).getTime();
    if (diff > OFFLINE_THRESHOLD_MS) {
      return 'OFFLINE';
    }
    if (speed > 5) {
      return 'MOVING';
    }
    if (ignition) {
      return 'IDLE';
    }
    return 'STOPPED';
  },

  /**
   * Returns all active vehicles for the tenant with their latest GPS positions
   */
  async getVehicles(db: DB): Promise<NormalizedGPSLocation[]> {
    // 1. Fetch fleet units for the active tenant
    const fleetUnits = await db
      .select({
        id:     fleet.id,
        plate:  fleet.plate,
        type:   fleet.type,
        vendor: fleet.vendor,
        status: fleet.status,
      })
      .from(fleet);

    // 2. Fetch all bound GPS devices
    const devices = await db.select().from(gpsDevices);
    const deviceMap = new Map(devices.map(d => [d.vehicleId, d]));

    const realLocations: NormalizedGPSLocation[] = [];
    const unboundFleetUnits: typeof fleetUnits = [];

    for (const unit of fleetUnits) {
      const dev = deviceMap.get(unit.id);
      if (dev && dev.lastLatitude != null && dev.lastLongitude != null && dev.lastTimestamp != null) {
        const status = this.computeStatus(dev.lastSpeed || 0, Boolean(dev.lastIgnition), dev.lastTimestamp);
        realLocations.push({
          vehicleId:   unit.id,
          plate:       unit.plate,
          vehicleType: unit.type || 'CDD Long',
          vendor:      unit.vendor,
          deviceId:    dev.deviceUid,
          latitude:    dev.lastLatitude,
          longitude:   dev.lastLongitude,
          speed:       dev.lastSpeed || 0,
          heading:     dev.lastHeading || 0,
          ignition:    Boolean(dev.lastIgnition),
          status,
          timestamp:   new Date(dev.lastTimestamp).toISOString(),
          isSimulated: false,
        });
      } else {
        unboundFleetUnits.push(unit);
      }
    }

    // 3. If Demo Simulator is enabled, generate realistic simulated telemetry
    // for testing (either for unbound units or default demo fleet if fleet is empty)
    if (DemoSimulatorGPSProvider.isEnabled()) {
      let targetUnits = unboundFleetUnits;
      if (fleetUnits.length === 0) {
        // Default standard VARDH demonstration fleet
        targetUnits = [
          { id: 'DEMO-001', plate: 'B 9241 VDH', type: 'CDD Long Box', vendor: 'VARDH Logistics Express', status: 'on_trip' },
          { id: 'DEMO-002', plate: 'B 9812 VDH', type: 'Truk Fuso 8 Ton', vendor: 'VARDH Heavy Transport', status: 'on_trip' },
          { id: 'DEMO-003', plate: 'B 9033 VDH', type: 'Tronton Wingbox', vendor: 'VARDH Intercity Logistics', status: 'available' },
          { id: 'DEMO-004', plate: 'D 8110 VDH', type: 'CDD Refrigerator', vendor: 'VARDH Cold Chain', status: 'maintenance' },
        ];
      }
      const simLocations = DemoSimulatorGPSProvider.getSimulatedVehicles(targetUnits);
      return [...realLocations, ...simLocations];
    }

    return realLocations;
  },

  /**
   * Retrieves single vehicle GPS location
   */
  async getVehicleById(db: DB, vehicleId: string): Promise<NormalizedGPSLocation | null> {
    const list = await this.getVehicles(db);
    return list.find(v => v.vehicleId === vehicleId) || null;
  },

  /**
   * Ingests GPS telemetry from a webhook or device payload
   */
  async ingestLocation(db: DB, payload: RawGPSPayload) {
    const lat = Number(payload.latitude);
    const lng = Number(payload.longitude);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw Object.assign(new Error('Invalid GPS coordinate bounds'), { status: 400 });
    }

    // Look up device
    const [device] = await db
      .select()
      .from(gpsDevices)
      .where(eq(gpsDevices.deviceUid, payload.deviceUid))
      .limit(1);

    if (!device) {
      throw Object.assign(new Error(`Unregistered GPS device: ${payload.deviceUid}`), { status: 404 });
    }

    const recordedAt = payload.timestamp ? new Date(payload.timestamp) : new Date();
    const speed = Math.max(0, Number(payload.speed || 0));
    const heading = Math.max(0, Math.min(360, Number(payload.heading || 0)));
    const ignition = Boolean(payload.ignition);
    const status = this.computeStatus(speed, ignition, recordedAt);

    // Update latest device state
    await db
      .update(gpsDevices)
      .set({
        lastLatitude:  lat,
        lastLongitude: lng,
        lastSpeed:     speed,
        lastHeading:   heading,
        lastIgnition:  ignition,
        lastTimestamp: recordedAt,
        status,
        updatedAt:     new Date(),
      })
      .where(eq(gpsDevices.id, device.id));

    // Record into location history
    await db.insert(gpsLocationHistory).values({
      vehicleId:  device.vehicleId,
      deviceId:   device.id,
      latitude:   lat,
      longitude:  lng,
      speed,
      heading,
      ignition,
      recordedAt,
    });

    return {
      success:   true,
      deviceUid: payload.deviceUid,
      vehicleId: device.vehicleId,
      status,
      timestamp: recordedAt.toISOString(),
    };
  },

  /**
   * Retrieves historical breadcrumb trail for an authorized vehicle
   */
  async getHistory(db: DB, vehicleId: string, dateStr?: string): Promise<GPSLocationHistoryItem[]> {
    const queryDate = dateStr ? new Date(dateStr) : new Date();
    const startOfDay = new Date(queryDate.getFullYear(), queryDate.getMonth(), queryDate.getDate(), 0, 0, 0);
    const endOfDay   = new Date(queryDate.getFullYear(), queryDate.getMonth(), queryDate.getDate(), 23, 59, 59);

    const rows = await db
      .select({
        id:         gpsLocationHistory.id,
        vehicleId:  gpsLocationHistory.vehicleId,
        latitude:   gpsLocationHistory.latitude,
        longitude:  gpsLocationHistory.longitude,
        speed:      gpsLocationHistory.speed,
        heading:    gpsLocationHistory.heading,
        ignition:   gpsLocationHistory.ignition,
        recordedAt: gpsLocationHistory.recordedAt,
      })
      .from(gpsLocationHistory)
      .where(
        and(
          eq(gpsLocationHistory.vehicleId, vehicleId),
          gte(gpsLocationHistory.recordedAt, startOfDay),
          lte(gpsLocationHistory.recordedAt, endOfDay),
        )
      )
      .orderBy(gpsLocationHistory.recordedAt)
      .limit(500);

    return rows.map(r => ({
      id:         r.id,
      vehicleId:  r.vehicleId,
      latitude:   r.latitude,
      longitude:  r.longitude,
      speed:      r.speed || 0,
      heading:    r.heading || 0,
      ignition:   Boolean(r.ignition),
      recordedAt: new Date(r.recordedAt).toISOString(),
    }));
  },

  /**
   * Registers or binds a GPS Device to an existing fleet vehicle
   */
  async registerDevice(db: DB, input: { vehicleId: string; deviceUid: string; providerId?: string }) {
    const id = `dev-${Date.now()}`;
    const [created] = await db
      .insert(gpsDevices)
      .values({
        id,
        vehicleId:  input.vehicleId,
        deviceUid:  input.deviceUid,
        providerId: input.providerId || null,
        status:     'OFFLINE',
      })
      .onConflictDoUpdate({
        target: gpsDevices.deviceUid,
        set: {
          vehicleId:  input.vehicleId,
          providerId: input.providerId || null,
          updatedAt:  new Date(),
        },
      })
      .returning();
    return created;
  },

  /**
   * Registers a GPS Provider configuration.
   * NOTE: apiToken is accepted for storage but will never be exposed in public responses.
   */
  async registerProvider(db: DB, input: { id?: string; name: string; baseUrl?: string; apiToken?: string; providerType?: string; pollingIntervalSec?: number }) {
    const id = input.id || `prov-${Date.now()}`;
    const [created] = await db
      .insert(gpsProviders)
      .values({
        id,
        name:               input.name,
        baseUrl:            input.baseUrl || null,
        apiToken:           input.apiToken || null,
        providerType:       input.providerType || 'generic_rest',
        pollingIntervalSec: input.pollingIntervalSec || 30,
        active:             true,
      })
      .returning({
        id:                 gpsProviders.id,
        name:               gpsProviders.name,
        baseUrl:            gpsProviders.baseUrl,
        providerType:       gpsProviders.providerType,
        active:             gpsProviders.active,
        pollingIntervalSec: gpsProviders.pollingIntervalSec,
        createdAt:          gpsProviders.createdAt,
      });

    return created;
  },
};
