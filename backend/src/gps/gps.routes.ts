import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/permission.middleware.js';
import { gpsController } from './gps.controller.js';

const router = Router();

/** GET /api/gps/vehicles — list all fleet vehicles with latest normalized GPS telemetry */
router.get('/vehicles', requireAuth, requirePermission('locations.read'), gpsController.getVehicles);

/** GET /api/gps/vehicles/:vehicleId — get latest GPS position for specific vehicle */
router.get('/vehicles/:vehicleId', requireAuth, requirePermission('locations.read'), gpsController.getVehicleById);

/** GET /api/gps/vehicles/:vehicleId/history — get breadcrumb trail for route visualization */
router.get('/vehicles/:vehicleId/history', requireAuth, requirePermission('locations.read'), gpsController.getVehicleHistory);

/** POST /api/gps/providers — register GPS provider (api_token secured on backend) */
router.post('/providers', requireAuth, requirePermission('fleet.create'), gpsController.registerProvider);

/** POST /api/gps/devices — bind GPS tracker UID to fleet vehicle */
router.post('/devices', requireAuth, requirePermission('fleet.create'), gpsController.registerDevice);

/** POST /api/gps/ingest — webhook ingestion endpoint for GPS hardware push */
router.post('/ingest', gpsController.ingestLocation);

/** POST /api/gps/demo/toggle — toggle demo simulator on/off */
router.post('/demo/toggle', requireAuth, gpsController.toggleSimulator);

/** GET /api/gps/tracking-links — list vendor external tracking links with filter & search */
router.get('/tracking-links', requireAuth, requirePermission('locations.read'), gpsController.getTrackingLinks);

/** GET /api/gps/tracking-links/:id — get single vendor tracking link */
router.get('/tracking-links/:id', requireAuth, requirePermission('locations.read'), gpsController.getTrackingLinkById);

/** POST /api/gps/tracking-links — create vendor tracking link */
router.post('/tracking-links', requireAuth, requirePermission('locations.create'), gpsController.createTrackingLink);

/** PUT /api/gps/tracking-links/:id — update vendor tracking link */
router.put('/tracking-links/:id', requireAuth, requirePermission('locations.create'), gpsController.updateTrackingLink);

/** DELETE /api/gps/tracking-links/:id — delete vendor tracking link */
router.delete('/tracking-links/:id', requireAuth, requirePermission('locations.delete'), gpsController.deleteTrackingLink);

export default router;
