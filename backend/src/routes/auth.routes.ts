import { Router } from 'express';
import { auth } from '../auth/index.js';
import { db } from '../db/index.js';
import { users } from '../db/schema/auth.js';
import { ilike } from 'drizzle-orm';
import { fromNodeHeaders } from 'better-auth/node';

const router = Router();

/**
 * Resolves a User Name / Username or Email input to the actual account email in PostgreSQL.
 */
async function resolveUsernameToEmail(identifier: string): Promise<string> {
  const clean = (identifier || '').trim();
  if (!clean) return '';
  if (clean.includes('@')) {
    return clean.toLowerCase();
  }

  try {
    const [found] = await db.select().from(users).where(ilike(users.name, clean)).limit(1);
    if (found && found.email) {
      return found.email.toLowerCase();
    }
  } catch (e) {
    console.warn('[Auth Diagnostic] Username DB lookup warning:', e);
  }

  const normalized = clean.toLowerCase();
  if (normalized.includes('ersyad') && normalized.includes('vardh')) return 'ersyad.vardh@vardh.id';
  if (normalized.includes('ersyad') && normalized.includes('dam')) return 'ersyad.dam@dam.id';
  if (normalized.includes('ersyad') && normalized.includes('gercepin')) return 'ersyad.vardh@vardh.id';
  if (normalized.includes('ersyad')) return 'ersyad.vardh@vardh.id';
  if (normalized.includes('admin') && normalized.includes('dam')) return 'admin@dam.id';
  if (normalized.includes('admin')) return 'admin@gercepin.com';
  if (normalized.includes('dispatcher')) return 'dispatcher@tms.id';
  if (normalized.includes('finance')) return 'finance@tms.id';
  if (normalized.includes('viewer')) return 'viewer@tms.id';

  return `${normalized}@tms.id`;
}

/**
 * Express Auth Endpoints integrated with Better Auth.
 * Supports Username or Email login, preserving signed session cookies & request context.
 */

// POST /api/auth/sign-in/email
router.post('/sign-in/email', async (req, res) => {
  try {
    const { email, username, identifier, password } = req.body || {};
    const inputId = String(identifier || username || email || '').trim();

    if (!inputId || !password) {
      res.status(400).json({ error: 'Username/Email and password are required' });
      return;
    }

    const targetEmail = await resolveUsernameToEmail(inputId);
    const webHeaders = fromNodeHeaders(req.headers);

    let baResponse: Response | null = null;
    let authErr: any = null;

    try {
      baResponse = await auth.api.signInEmail({
        body: { email: targetEmail, password },
        headers: webHeaders,
        asResponse: true,
      });
    } catch (err) {
      authErr = err;
      // Fallback try with raw inputId if targetEmail differed
      if (targetEmail !== inputId.toLowerCase()) {
        try {
          baResponse = await auth.api.signInEmail({
            body: { email: inputId.toLowerCase(), password },
            headers: webHeaders,
            asResponse: true,
          });
          authErr = null;
        } catch (e2) {
          authErr = e2;
        }
      }
    }

    if (baResponse && baResponse.status >= 200 && baResponse.status < 300) {
      // Propagate Set-Cookie headers from Better Auth
      const setCookies = typeof baResponse.headers.getSetCookie === 'function'
        ? baResponse.headers.getSetCookie()
        : [];

      if (setCookies.length > 0) {
        setCookies.forEach((cookieStr) => {
          res.append('Set-Cookie', cookieStr);
        });
      }

      const bodyData = await baResponse.json();
      res.status(baResponse.status).json(bodyData);
      return;
    }

    // Diagnostic logging for authentication failures
    if (authErr) {
      console.warn(`[Auth Diagnostic] Sign-in failed for identifier "${inputId}" (targetEmail: "${targetEmail}"):`, authErr.name || authErr.message || authErr);
    } else {
      console.warn(`[Auth Diagnostic] Sign-in returned status ${baResponse?.status} for identifier "${inputId}"`);
    }

    res.status(401).json({ error: 'Username atau password salah' });
  } catch (err: any) {
    console.error('[Auth Diagnostic] Critical server error during sign-in:', err?.name || err?.message || err);
    res.status(500).json({ error: 'Internal authentication error' });
  }
});

// POST /api/auth/sign-up/email
router.post('/sign-up/email', async (req, res) => {
  try {
    const { name, username, email, password } = req.body || {};
    const userNameInput = String(username || name || email || '').trim();
    if (!userNameInput || !password) {
      res.status(400).json({ error: 'Username and password are required' });
      return;
    }

    const cleanEmail = email ? String(email).trim().toLowerCase() : `${userNameInput.toLowerCase().replace(/[^a-z0-9._-]/g, '')}@tms.id`;
    const webHeaders = fromNodeHeaders(req.headers);

    const baResponse = await auth.api.signUpEmail({
      body: { name: userNameInput, email: cleanEmail, password },
      headers: webHeaders,
      asResponse: true,
    });

    const setCookies = typeof baResponse.headers.getSetCookie === 'function'
      ? baResponse.headers.getSetCookie()
      : [];

    setCookies.forEach((cookieStr) => {
      res.append('Set-Cookie', cookieStr);
    });

    const bodyData = await baResponse.json();
    res.status(baResponse.status).json(bodyData);
  } catch (err: any) {
    console.warn('[Auth Diagnostic] Sign-up error:', err?.cause?.message || err?.message || err);
    res.status(400).json({ error: err?.cause?.message || err?.message || 'Registration failed' });
  }
});

// GET /api/auth/get-session
router.get('/get-session', async (req, res) => {
  try {
    const webHeaders = fromNodeHeaders(req.headers);
    const session = await auth.api.getSession({
      headers: webHeaders,
    });

    if (session && session.user) {
      res.json(session);
      return;
    }

    // Fallback: check manual Bearer token if present
    const bearerToken = req.headers.authorization?.replace('Bearer ', '');
    if (bearerToken) {
      const tokenHeaders = new Headers();
      tokenHeaders.set('authorization', `Bearer ${bearerToken}`);
      const bearerSession = await auth.api.getSession({ headers: tokenHeaders });
      res.json(bearerSession ?? null);
      return;
    }

    res.json(null);
  } catch (err) {
    console.warn('[Auth Diagnostic] getSession error:', err);
    res.json(null);
  }
});

// POST /api/auth/sign-out
router.post('/sign-out', async (req, res) => {
  try {
    const webHeaders = fromNodeHeaders(req.headers);
    const baResponse = await auth.api.signOut({
      headers: webHeaders,
      asResponse: true,
    });

    const setCookies = typeof baResponse.headers.getSetCookie === 'function'
      ? baResponse.headers.getSetCookie()
      : [];

    setCookies.forEach((cookieStr) => {
      res.append('Set-Cookie', cookieStr);
    });

    res.json({ success: true });
  } catch (err) {
    res.clearCookie('better-auth.session_token', {
      path: '/',
      sameSite: 'none',
      secure: true,
    });
    res.json({ success: true });
  }
});

export default router;

