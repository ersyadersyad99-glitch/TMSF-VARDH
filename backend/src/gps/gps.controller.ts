import type { Request, Response, NextFunction } from 'express';
import { gpsService } from './gps.service.js';
import { DemoSimulatorGPSProvider } from './gps.provider.js';
import { z } from 'zod';

export const ingestSchema = z.object({
  deviceUid: z.string().min(1),
  latitude:  z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  speed:     z.number().min(0).optional().default(0),
  heading:   z.number().min(0).max(360).optional().default(0),
  ignition:  z.boolean().optional().default(true),
  timestamp: z.union([z.string(), z.number()]).optional(),
});

export const registerDeviceSchema = z.object({
  vehicleId:  z.string().min(1),
  deviceUid:  z.string().min(1),
  providerId: z.string().optional(),
});

export const registerProviderSchema = z.object({
  name:               z.string().min(1),
  baseUrl:            z.string().url().optional(),
  apiToken:           z.string().optional(),
  providerType:       z.string().optional().default('generic_rest'),
  pollingIntervalSec: z.number().min(5).max(3600).optional().default(30),
});

export const createTrackingLinkSchema = z.object({
  vendorId:     z.string().optional(),
  vendorName:   z.string().min(1, 'Nama vendor wajib diisi'),
  doReference:  z.string().optional(),
  vehiclePlate: z.string().min(1, 'Plat nomor armada wajib diisi'),
  fleetId:      z.string().optional(),
  driverName:   z.string().optional(),
  trackingUrl:  z.string().min(3, 'URL tracking vendor wajib diisi'),
  expiresAt:    z.string().nullable().optional(),
  status:       z.enum(['ACTIVE', 'EXPIRED', 'COMPLETED', 'INACTIVE']).optional().default('ACTIVE'),
  notes:        z.string().optional(),
});

export const updateTrackingLinkSchema = z.object({
  vendorId:     z.string().nullable().optional(),
  vendorName:   z.string().min(1).optional(),
  doReference:  z.string().nullable().optional(),
  vehiclePlate: z.string().min(1).optional(),
  fleetId:      z.string().nullable().optional(),
  driverName:   z.string().nullable().optional(),
  trackingUrl:  z.string().min(3).optional(),
  expiresAt:    z.string().nullable().optional(),
  status:       z.enum(['ACTIVE', 'EXPIRED', 'COMPLETED', 'INACTIVE']).optional(),
  notes:        z.string().nullable().optional(),
});

export const gpsController = {
  async getVehicles(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await gpsService.getVehicles(req.db);
      res.json(data);
    } catch (err) { next(err); }
  },

  async getVehicleById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await gpsService.getVehicleById(req.db, req.params.vehicleId as string);
      if (!data) {
        res.status(404).json({ error: 'Vehicle GPS location not found' });
        return;
      }
      res.json(data);
    } catch (err) { next(err); }
  },

  async getVehicleHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const { date } = req.query as { date?: string };
      const data = await gpsService.getHistory(req.db, req.params.vehicleId as string, date);
      res.json(data);
    } catch (err) { next(err); }
  },

  async registerProvider(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = registerProviderSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
        return;
      }
      const created = await gpsService.registerProvider(req.db, parsed.data);
      res.status(201).json(created);
    } catch (err) { next(err); }
  },

  async registerDevice(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = registerDeviceSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
        return;
      }
      const created = await gpsService.registerDevice(req.db, parsed.data);
      res.status(201).json(created);
    } catch (err) { next(err); }
  },

  async ingestLocation(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = ingestSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid GPS payload', details: parsed.error.flatten() });
        return;
      }
      const result = await gpsService.ingestLocation(req.db, parsed.data);
      res.status(200).json(result);
    } catch (err) { next(err); }
  },

  async toggleSimulator(req: Request, res: Response, next: NextFunction) {
    try {
      const { enabled } = req.body as { enabled?: boolean };
      if (typeof enabled === 'boolean') {
        DemoSimulatorGPSProvider.setEnabled(enabled);
      } else {
        DemoSimulatorGPSProvider.setEnabled(!DemoSimulatorGPSProvider.isEnabled());
      }
      res.json({
        simulatorActive: DemoSimulatorGPSProvider.isEnabled(),
        message: `GPS Demo Simulator is now ${DemoSimulatorGPSProvider.isEnabled() ? 'ENABLED' : 'DISABLED'}`,
      });
    } catch (err) { next(err); }
  },

  async getTrackingLinks(req: Request, res: Response, next: NextFunction) {
    try {
      const { search, status, doReference } = req.query as {
        search?: string;
        status?: string;
        doReference?: string;
      };
      const data = await gpsService.getTrackingLinks(req.db, { search, status, doReference });
      res.json(data);
    } catch (err) { next(err); }
  },

  async getTrackingLinkById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const data = await gpsService.getTrackingLinkById(req.db, id);
      if (!data) {
        res.status(404).json({ error: 'Vendor tracking link not found' });
        return;
      }
      res.json(data);
    } catch (err) { next(err); }
  },

  async createTrackingLink(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = createTrackingLinkSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Data link tracking tidak valid', details: parsed.error.flatten() });
        return;
      }
      const createdBy = req.user?.id || req.user?.email || undefined;
      const result = await gpsService.createTrackingLink(req.db, parsed.data, createdBy);
      res.status(201).json(result);
    } catch (err) { next(err); }
  },

  async updateTrackingLink(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const parsed = updateTrackingLinkSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Data pembaruan tidak valid', details: parsed.error.flatten() });
        return;
      }
      const result = await gpsService.updateTrackingLink(req.db, id, parsed.data);
      if (!result) {
        res.status(404).json({ error: 'Vendor tracking link not found' });
        return;
      }
      res.json(result);
    } catch (err) { next(err); }
  },

  async deleteTrackingLink(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const success = await gpsService.deleteTrackingLink(req.db, id);
      if (!success) {
        res.status(404).json({ error: 'Vendor tracking link not found' });
        return;
      }
      res.json({ success: true, message: 'Vendor tracking link deleted' });
    } catch (err) { next(err); }
  },
};
