/**
 * Tenant Resolver Middleware.
 *
 * Reads the tenant identifier from (in order of priority):
 *   1. X-Tenant HTTP header  →  "gercepin" or "dam"
 *   2. Subdomain of hostname →  "gercepin.tms.local" → "gercepin"
 *   3. DEFAULT_TENANT fallback (for bare localhost development)
 *
 * Attaches req.tenant (string) and req.db (Drizzle instance) for all downstream handlers.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * STAGING NOTE (as of 2026-08-21):
 *   X-Tenant header is intentionally kept for staging compatibility.
 *   Users are NOT yet restricted to specific tenants at this layer.
 *   Role/permission checks (requirePermission) are enforced by auth.middleware.ts.
 *
 * FUTURE — User → Tenant Authorization (TODO before production):
 *
 *   Step 1: Create table `user_tenants` in tms_db (auth database):
 *     CREATE TABLE user_tenants (
 *       user_id   TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
 *       tenant_id TEXT NOT NULL,
 *       role      VARCHAR(30) NOT NULL DEFAULT 'viewer',
 *       PRIMARY KEY (user_id, tenant_id)
 *     );
 *
 *   Step 2: Insert records:
 *     INSERT INTO user_tenants VALUES ('user-id-123', 'gercepin', 'admin');
 *     INSERT INTO user_tenants VALUES ('user-id-456', 'dam', 'dispatcher');
 *
 *   Step 3: Update tenantMiddleware (HERE, below the tenantId resolution):
 *     if (req.user) {
 *       const allowed = await globalDb
 *         .select()
 *         .from(userTenants)
 *         .where(
 *           and(eq(userTenants.userId, req.user.id), eq(userTenants.tenantId, tenantId))
 *         )
 *         .limit(1);
 *       if (!allowed.length) {
 *         res.status(403).json({ error: 'Forbidden — you do not have access to this tenant' });
 *         return;
 *       }
 *     }
 *
 *   Note: tenantMiddleware currently runs BEFORE requireAuth, so req.user is
 *         not available at this point. Either:
 *         a) Reorder middleware so requireAuth runs first, OR
 *         b) Move the user-tenant check into a separate middleware that runs
 *            AFTER requireAuth (preferred: see `requireTenantAccess` below).
 *
 *   Step 4 (alternative placement): Add `requireTenantAccess` middleware:
 *     export async function requireTenantAccess(req, res, next) {
 *       const [access] = await globalDb.select()...where(userId, tenantId);
 *       if (!access) { res.status(403)...; return; }
 *       next();
 *     }
 *   Then in routes/index.ts:
 *     app.use('/api', tenantMiddleware, requireAuth, requireTenantAccess);
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { Request, Response, NextFunction } from 'express';
import { getTenantDb } from './tenant-pool.js';
import { TENANTS, DEFAULT_TENANT } from './tenants.config.js';

export function tenantMiddleware(req: Request, res: Response, next: NextFunction): void {
  try {
    // 1. X-Tenant header (for curl / API testing / frontend)
    let tenantId = req.headers['x-tenant'] as string | undefined;

    // 2. Subdomain: e.g. logistics.vardh.id → "logistics", tms-demo.vardh.id → "tms-demo"
    if (!tenantId) {
      const host = req.hostname ?? '';        // express strips port from hostname
      const subdomain = host.split('.')[0]?.toLowerCase();
      if (subdomain && TENANTS[subdomain]) {
        tenantId = subdomain;
      }
    }

    // 3. Normalize aliases
    if (tenantId === 'vardh' || tenantId === 'vardh-logistics') {
      tenantId = 'logistics';
    } else if (tenantId === 'demo') {
      tenantId = 'tms-demo';
    }

    // 4. Fallback default
    if (!tenantId || !TENANTS[tenantId]) {
      tenantId = DEFAULT_TENANT;
    }

    req.tenant = tenantId;
    req.db     = getTenantDb(tenantId);

    next();
  } catch (err) {
    next(err);
  }
}

