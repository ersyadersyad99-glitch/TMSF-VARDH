import 'dotenv/config';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '../db/index.js';
import * as schema from '../db/schema/index.js';

const getBaseUrl = (): string => {
  const envUrl = process.env.BETTER_AUTH_URL;
  if (envUrl && envUrl.startsWith('https://')) {
    return envUrl.replace(/\/+$/, '');
  }
  if (process.env.VERCEL === '1' || process.env.NODE_ENV === 'production') {
    return 'https://api-tmsgercepin.digitalinaja.net';
  }
  return envUrl || 'http://localhost:3000';
};

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET || 'tms_super_secret_production_key_987654321_secure',
  baseURL: getBaseUrl(),

  database: drizzleAdapter(db, {
    provider: 'pg',
    usePlural: false,
    schema: {
      user:         schema.users,
      session:      schema.sessions,
      account:      schema.accounts,
      verification: schema.verifications,
    },
  }),

  /**
   * Cross-Origin Cookie configuration for subdomains & Vercel deployments.
   * Enables sameSite: 'none' and secure: true so HttpOnly session cookies are transmitted across
   * https://tmsgercepin.digitalinaja.net and https://api-tmsgercepin.digitalinaja.net.
   */
  advanced: {
    defaultCookieAttributes: {
      sameSite: 'none',
      secure: true,
    },
  },

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // disable for internal tool
    minPasswordLength: 4,            // Allow passwords from 4+ characters (e.g. 12345, 123456)
  },

  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60 * 24 * 7, // 7 days
    },
  },

  /**
   * Extend the user model with custom fields.
   * Better Auth merges these into the `user` table.
   */
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: 'viewer',
      },
      status: {
        type: 'string',
        required: false,
        defaultValue: 'active',
      },
    },
  },

  /**
   * Trusted origins for Better Auth CSRF protection and cookie scoping.
   * Dynamically resolves origins and supports all .digitalinaja.net & .vercel.app subdomains.
   */
  trustedOrigins: (request?: Request) => {
    const origins: string[] = [
      'https://tmsgercepin.digitalinaja.net',
      'https://tmsdam.digitalinaja.net',
      'https://tms.digitalinaja.net',
      'https://api-tmsgercepin.digitalinaja.net',
      'https://tms-demo.vardh.id',
      'https://api-backend.vardh.id',
      'https://vardh.id',
    ];

    const corsOrigins = process.env.CORS_ORIGINS;
    if (corsOrigins) {
      corsOrigins.split(',').map(o => o.trim()).filter(Boolean).forEach(o => {
        if (!origins.includes(o)) origins.push(o);
      });
    }

    const frontendUrl = process.env.FRONTEND_URL;
    if (frontendUrl && !origins.includes(frontendUrl)) {
      origins.push(frontendUrl);
    }

    const reqOrigin = request?.headers?.get('origin');
    if (reqOrigin) {
      if (reqOrigin.endsWith('.digitalinaja.net') || reqOrigin.endsWith('.vercel.app') || reqOrigin.endsWith('.vardh.id') || reqOrigin === 'https://vardh.id') {
        if (!origins.includes(reqOrigin)) origins.push(reqOrigin);
      }
    }

    // Development fallbacks
    ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'].forEach(o => {
      if (!origins.includes(o)) origins.push(o);
    });

    return origins;
  },
});

export type Auth = typeof auth;
