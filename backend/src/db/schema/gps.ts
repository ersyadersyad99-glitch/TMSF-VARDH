import { pgTable, uuid, varchar, text, timestamp, boolean, integer, doublePrecision, real } from 'drizzle-orm/pg-core';
import { fleet } from './fleet.js';
import { vendors } from './vendors.js';

/**
 * GPS Providers configuration table
 * Stores provider settings & credentials securely on the backend.
 * apiToken is NEVER returned in client responses.
 */
export const gpsProviders = pgTable('gps_providers', {
  id:                 varchar('id', { length: 50 }).primaryKey(),
  name:               varchar('name', { length: 100 }).notNull(),
  baseUrl:            varchar('base_url', { length: 255 }),
  apiToken:           text('api_token'), // strictly protected, never exposed to frontend
  providerType:       varchar('provider_type', { length: 50 }).notNull().default('generic_rest'),
  active:             boolean('active').notNull().default(true),
  pollingIntervalSec: integer('polling_interval_sec').default(30),
  createdAt:          timestamp('created_at').notNull().defaultNow(),
  updatedAt:          timestamp('updated_at').notNull().defaultNow(),
});

/**
 * GPS Devices table
 * Associates tracker hardware (or demo unit) to an existing fleet vehicle.
 */
export const gpsDevices = pgTable('gps_devices', {
  id:            varchar('id', { length: 50 }).primaryKey(),
  vehicleId:     varchar('vehicle_id', { length: 50 })
    .references(() => fleet.id, { onDelete: 'cascade' })
    .notNull(),
  providerId:    varchar('provider_id', { length: 50 })
    .references(() => gpsProviders.id, { onDelete: 'set null' }),
  deviceUid:     varchar('device_uid', { length: 100 }).notNull().unique(),
  status:        varchar('status', { length: 30 }).notNull().default('OFFLINE'),
  lastLatitude:  doublePrecision('last_latitude'),
  lastLongitude: doublePrecision('last_longitude'),
  lastSpeed:     real('last_speed').default(0),
  lastHeading:   real('last_heading').default(0),
  lastIgnition:  boolean('last_ignition').default(false),
  lastTimestamp: timestamp('last_timestamp'),
  createdAt:     timestamp('created_at').notNull().defaultNow(),
  updatedAt:     timestamp('updated_at').notNull().defaultNow(),
});

/**
 * GPS Location History table
 * Stores sequential breadcrumbs for route visualization & trail playback.
 */
export const gpsLocationHistory = pgTable('gps_location_history', {
  id:         uuid('id').primaryKey().defaultRandom(),
  vehicleId:  varchar('vehicle_id', { length: 50 })
    .references(() => fleet.id, { onDelete: 'cascade' })
    .notNull(),
  deviceId:   varchar('device_id', { length: 50 })
    .references(() => gpsDevices.id, { onDelete: 'set null' }),
  latitude:   doublePrecision('latitude').notNull(),
  longitude:  doublePrecision('longitude').notNull(),
  speed:      real('speed').default(0),
  heading:    real('heading').default(0),
  ignition:   boolean('ignition').default(false),
  recordedAt: timestamp('recorded_at').notNull(),
  createdAt:  timestamp('created_at').notNull().defaultNow(),
});

export type GpsProvider = typeof gpsProviders.$inferSelect;
export type NewGpsProvider = typeof gpsProviders.$inferInsert;

export type GpsDevice = typeof gpsDevices.$inferSelect;
export type NewGpsDevice = typeof gpsDevices.$inferInsert;

export type GpsLocationHistory = typeof gpsLocationHistory.$inferSelect;
export type NewGpsLocationHistory = typeof gpsLocationHistory.$inferInsert;

/**
 * Vendor External Tracking Links table
 * Third-party vendors only provide a tracking URL.
 * Does not fake GPS coordinates.
 */
export const vendorTrackingLinks = pgTable('vendor_tracking_links', {
  id:           varchar('id', { length: 50 }).primaryKey(),
  vendorId:     varchar('vendor_id', { length: 50 }).references(() => vendors.id, { onDelete: 'set null' }),
  vendorName:   varchar('vendor_name', { length: 150 }).notNull(),
  doReference:  varchar('do_reference', { length: 50 }),
  vehiclePlate: varchar('vehicle_plate', { length: 50 }).notNull(),
  fleetId:      varchar('fleet_id', { length: 50 }).references(() => fleet.id, { onDelete: 'set null' }),
  driverName:   varchar('driver_name', { length: 150 }),
  trackingUrl:  text('tracking_url').notNull(),
  expiresAt:    timestamp('expires_at'),
  status:       varchar('status', { length: 30 }).notNull().default('ACTIVE'), // ACTIVE, EXPIRED, COMPLETED, INACTIVE
  notes:        text('notes'),
  createdBy:    text('created_by'),
  createdAt:    timestamp('created_at').notNull().defaultNow(),
  updatedAt:    timestamp('updated_at').notNull().defaultNow(),
});

export type VendorTrackingLink = typeof vendorTrackingLinks.$inferSelect;
export type NewVendorTrackingLink = typeof vendorTrackingLinks.$inferInsert;

