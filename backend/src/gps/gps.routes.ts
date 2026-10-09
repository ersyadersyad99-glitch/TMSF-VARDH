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

export default router;
