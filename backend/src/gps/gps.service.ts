import type { DB } from '../db/index.js';
import { fleet, gpsDevices, gpsProviders, gpsLocationHistory, vendorTrackingLinks } from '../db/schema/index.js';
import { eq, desc, and, gte, lte } from 'drizzle-orm';
import type {
  NormalizedGPSLocation,
  RawGPSPayload,
  VehicleGpsStatus,
  GPSLocationHistoryItem,
  VendorTrackingLinkItem,
  CreateTrackingLinkDTO,
  UpdateTrackingLinkDTO,
  TrackingLinkStatus
} from './gps.types.js';
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

  /**
   * Retrieves all vendor external tracking links for current tenant with search & filter
   */
  async getTrackingLinks(
    db: DB,
    options?: { search?: string; status?: string; doReference?: string }
  ): Promise<VendorTrackingLinkItem[]> {
    const conditions: any[] = [];
    if (options?.status && options.status !== 'ALL') {
      conditions.push(eq(vendorTrackingLinks.status, options.status));
    }
    if (options?.doReference) {
      conditions.push(eq(vendorTrackingLinks.doReference, options.doReference));
    }

    let rows = await db
      .select()
      .from(vendorTrackingLinks)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(vendorTrackingLinks.createdAt));

    // Filter in-memory for multi-column search
    const searchTerm = options?.search?.toLowerCase().trim();
    if (searchTerm) {
      rows = rows.filter((r) =>
        r.vendorName?.toLowerCase().includes(searchTerm) ||
        r.doReference?.toLowerCase().includes(searchTerm) ||
        r.vehiclePlate?.toLowerCase().includes(searchTerm) ||
        r.driverName?.toLowerCase().includes(searchTerm)
      );
    }

    const now = new Date();
    return rows.map((r) => {
      const isExpired = Boolean(r.expiresAt && new Date(r.expiresAt) < now && r.status === 'ACTIVE');
      return {
        id: r.id,
        vendorId: r.vendorId,
        vendorName: r.vendorName,
        doReference: r.doReference,
        vehiclePlate: r.vehiclePlate,
        fleetId: r.fleetId,
        driverName: r.driverName,
        trackingUrl: r.trackingUrl,
        expiresAt: r.expiresAt ? new Date(r.expiresAt).toISOString() : null,
        isExpired,
        status: isExpired ? 'EXPIRED' : (r.status as TrackingLinkStatus),
        notes: r.notes,
        createdBy: r.createdBy,
        createdAt: new Date(r.createdAt).toISOString(),
        updatedAt: new Date(r.updatedAt).toISOString(),
      };
    });
  },

  /**
   * Retrieves a single vendor external tracking link by ID
   */
  async getTrackingLinkById(db: DB, id: string): Promise<VendorTrackingLinkItem | null> {
    const [row] = await db
      .select()
      .from(vendorTrackingLinks)
      .where(eq(vendorTrackingLinks.id, id))
      .limit(1);

    if (!row) return null;
    const now = new Date();
    const isExpired = Boolean(row.expiresAt && new Date(row.expiresAt) < now && row.status === 'ACTIVE');
    return {
      id: row.id,
      vendorId: row.vendorId,
      vendorName: row.vendorName,
      doReference: row.doReference,
      vehiclePlate: row.vehiclePlate,
      fleetId: row.fleetId,
      driverName: row.driverName,
      trackingUrl: row.trackingUrl,
      expiresAt: row.expiresAt ? new Date(row.expiresAt).toISOString() : null,
      isExpired,
      status: isExpired ? 'EXPIRED' : (row.status as TrackingLinkStatus),
      notes: row.notes,
      createdBy: row.createdBy,
      createdAt: new Date(row.createdAt).toISOString(),
      updatedAt: new Date(row.updatedAt).toISOString(),
    };
  },

  /**
   * Creates a new vendor external tracking link
   */
  async createTrackingLink(
    db: DB,
    input: CreateTrackingLinkDTO,
    createdBy?: string
  ): Promise<VendorTrackingLinkItem> {
    let cleanUrl = input.trackingUrl.trim();
    if (!/^https?:\/\//i.test(cleanUrl)) {
      cleanUrl = `https://${cleanUrl}`;
    }
    const parsedUrl = new URL(cleanUrl);
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      throw new Error('URL tracking harus menggunakan protokol HTTP atau HTTPS yang aman');
    }

    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    const id = `VTL-${ts}-${rand}`;
    const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;

    const [row] = await db
      .insert(vendorTrackingLinks)
      .values({
        id,
        vendorId: input.vendorId || null,
        vendorName: input.vendorName.trim(),
        doReference: input.doReference?.trim() || null,
        vehiclePlate: input.vehiclePlate.trim().toUpperCase(),
        fleetId: input.fleetId || null,
        driverName: input.driverName?.trim() || null,
        trackingUrl: cleanUrl,
        expiresAt,
        status: input.status || 'ACTIVE',
        notes: input.notes?.trim() || null,
        createdBy: createdBy || null,
      })
      .returning();

    const now = new Date();
    const isExpired = Boolean(row.expiresAt && new Date(row.expiresAt) < now && row.status === 'ACTIVE');
    return {
      id: row.id,
      vendorId: row.vendorId,
      vendorName: row.vendorName,
      doReference: row.doReference,
      vehiclePlate: row.vehiclePlate,
      fleetId: row.fleetId,
      driverName: row.driverName,
      trackingUrl: row.trackingUrl,
      expiresAt: row.expiresAt ? new Date(row.expiresAt).toISOString() : null,
      isExpired,
      status: isExpired ? 'EXPIRED' : (row.status as TrackingLinkStatus),
      notes: row.notes,
      createdBy: row.createdBy,
      createdAt: new Date(row.createdAt).toISOString(),
      updatedAt: new Date(row.updatedAt).toISOString(),
    };
  },

  /**
   * Updates an existing vendor external tracking link
   */
  async updateTrackingLink(
    db: DB,
    id: string,
    input: UpdateTrackingLinkDTO
  ): Promise<VendorTrackingLinkItem | null> {
    const updatePayload: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (input.vendorName !== undefined) updatePayload.vendorName = input.vendorName.trim();
    if (input.vendorId !== undefined) updatePayload.vendorId = input.vendorId || null;
    if (input.doReference !== undefined) updatePayload.doReference = input.doReference?.trim() || null;
    if (input.vehiclePlate !== undefined) updatePayload.vehiclePlate = input.vehiclePlate.trim().toUpperCase();
    if (input.fleetId !== undefined) updatePayload.fleetId = input.fleetId || null;
    if (input.driverName !== undefined) updatePayload.driverName = input.driverName?.trim() || null;
    if (input.trackingUrl !== undefined) {
      let cleanUrl = input.trackingUrl.trim();
      if (!/^https?:\/\//i.test(cleanUrl)) {
        cleanUrl = `https://${cleanUrl}`;
      }
      const parsedUrl = new URL(cleanUrl);
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        throw new Error('URL tracking harus menggunakan protokol HTTP atau HTTPS yang aman');
      }
      updatePayload.trackingUrl = cleanUrl;
    }
    if (input.expiresAt !== undefined) updatePayload.expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
    if (input.status !== undefined) updatePayload.status = input.status;
    if (input.notes !== undefined) updatePayload.notes = input.notes?.trim() || null;

    const [row] = await db
      .update(vendorTrackingLinks)
      .set(updatePayload)
      .where(eq(vendorTrackingLinks.id, id))
      .returning();

    if (!row) return null;
    const now = new Date();
    const isExpired = Boolean(row.expiresAt && new Date(row.expiresAt) < now && row.status === 'ACTIVE');
    return {
      id: row.id,
      vendorId: row.vendorId,
      vendorName: row.vendorName,
      doReference: row.doReference,
      vehiclePlate: row.vehiclePlate,
      fleetId: row.fleetId,
      driverName: row.driverName,
      trackingUrl: row.trackingUrl,
      expiresAt: row.expiresAt ? new Date(row.expiresAt).toISOString() : null,
      isExpired,
      status: isExpired ? 'EXPIRED' : (row.status as TrackingLinkStatus),
      notes: row.notes,
      createdBy: row.createdBy,
      createdAt: new Date(row.createdAt).toISOString(),
      updatedAt: new Date(row.updatedAt).toISOString(),
    };
  },

  /**
   * Deletes a vendor external tracking link
   */
  async deleteTrackingLink(db: DB, id: string): Promise<boolean> {
    const result = await db
      .delete(vendorTrackingLinks)
      .where(eq(vendorTrackingLinks.id, id))
      .returning({ id: vendorTrackingLinks.id });

    return result.length > 0;
  },
};
