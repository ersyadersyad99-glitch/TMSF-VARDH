import { Router } from 'express';
import dashboardRoutes    from './dashboard.routes.js';
import ordersRoutes       from './orders.routes.js';
import assignmentsRoutes  from './assignments.routes.js';
import invoicesRoutes     from './invoices.routes.js';
import travelFundsRoutes  from './travel-funds.routes.js';
import clientsRoutes      from './master/clients.routes.js';
import driversRoutes      from './master/drivers.routes.js';
import fleetRoutes        from './master/fleet.routes.js';
import vendorsRoutes      from './master/vendors.routes.js';
import locationsRoutes    from './master/locations.routes.js';
import usersRoutes        from './users.routes.js';
import gpsRoutes          from '../gps/gps.routes.js';

const router = Router();

router.use('/dashboard',      dashboardRoutes);
router.use('/orders',         ordersRoutes);
router.use('/assignments',    assignmentsRoutes);
router.use('/invoices',       invoicesRoutes);
router.use('/travel-funds',   travelFundsRoutes);
router.use('/master/clients', clientsRoutes);
router.use('/master/drivers', driversRoutes);
router.use('/master/fleet',   fleetRoutes);
router.use('/master/vendors', vendorsRoutes);
router.use('/master/locations', locationsRoutes);
router.use('/users',          usersRoutes);
router.use('/gps',            gpsRoutes);

export default router;
