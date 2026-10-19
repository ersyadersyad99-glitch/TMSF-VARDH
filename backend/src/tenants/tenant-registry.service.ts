import { db } from '../db/index.js';
import { tenantRegistry, organizations, organizationMemberships, subscriptions, platformAuditLogs } from '../db/schema/control-plane.js';
import { eq, and } from 'drizzle-orm';
import { getTenantDb } from './tenant-pool.js';
import type { DB } from '../db/index.js';

export interface TenantResolutionResult {
  tenantKey: string;
  organizationId: string;
  organizationName: string;
  databaseReference: string;
  provisioningStatus: string;
  planCode?: string;
  subscriptionStatus?: string;
  isTrialExpired?: boolean;
}

export const tenantRegistryService = {
  /**
   * Resolves tenant info from Control Plane database (tms_db).
   */
  async getTenantByKey(tenantKey: string): Promise<TenantResolutionResult | null> {
    const cleanKey = tenantKey.trim().toLowerCase();

    try {
      const records = await db
        .select({
          tenantKey: tenantRegistry.tenantKey,
          organizationId: tenantRegistry.organizationId,
          organizationName: organizations.name,
          databaseReference: tenantRegistry.databaseReference,
          provisioningStatus: tenantRegistry.provisioningStatus,
          planCode: subscriptions.planCode,
          subscriptionStatus: subscriptions.status,
          trialEndsAt: subscriptions.trialEndsAt,
        })
        .from(tenantRegistry)
        .innerJoin(organizations, eq(tenantRegistry.organizationId, organizations.id))
        .leftJoin(subscriptions, eq(tenantRegistry.organizationId, subscriptions.organizationId))
        .where(eq(tenantRegistry.tenantKey, cleanKey))
        .limit(1);

      if (!records || records.length === 0) return null;

      const r = records[0];
      const now = new Date();
      const isTrialExpired = r.trialEndsAt ? new Date(r.trialEndsAt) < now && r.subscriptionStatus === 'trialing' : false;

      return {
        tenantKey: r.tenantKey,
        organizationId: r.organizationId,
        organizationName: r.organizationName,
        databaseReference: r.databaseReference,
        provisioningStatus: r.provisioningStatus,
        planCode: r.planCode || 'trial_14d',
        subscriptionStatus: r.subscriptionStatus || 'active',
        isTrialExpired,
      };
    } catch (err) {
      console.warn(`[TenantRegistryService] Error looking up tenant "${cleanKey}":`, err);
      return null;
    }
  },

  /**
   * Checks if user has valid membership in the given organization.
   */
  async checkUserMembership(userId: string, organizationId: string): Promise<{ isMember: boolean; role?: string } | null> {
    try {
      const records = await db
        .select({
          role: organizationMemberships.role,
          status: organizationMemberships.status,
        })
        .from(organizationMemberships)
        .where(
          and(
            eq(organizationMemberships.userId, userId),
            eq(organizationMemberships.organizationId, organizationId),
            eq(organizationMemberships.status, 'active')
          )
        )
        .limit(1);

      if (!records || records.length === 0) return { isMember: false };
      return { isMember: true, role: records[0].role };
    } catch (err) {
      console.warn(`[TenantRegistryService] Error checking membership for user "${userId}":`, err);
      return null;
    }
  },

  /**
   * Log an audit event in platform_audit_logs.
   */
  async logAuditEvent(params: { organizationId?: string; userId?: string; action: string; details?: string; ipAddress?: string }): Promise<void> {
    try {
      await db.insert(platformAuditLogs).values({
        id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        organizationId: params.organizationId,
        userId: params.userId,
        action: params.action,
        details: params.details,
        ipAddress: params.ipAddress,
      });
    } catch (err) {
      console.warn('[TenantRegistryService] Failed to record audit log:', err);
    }
  }
};
