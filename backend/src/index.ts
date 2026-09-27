import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import { auth } from './auth/index.js';
import authRoutes from './routes/auth.routes.js';
import apiRoutes from './routes/index.js';
import { errorMiddleware } from './middleware/error.middleware.js';
import { tenantMiddleware } from './tenants/tenant.middleware.js';
import { ordersService } from './services/orders.service.js';
import { getTenantDb } from './tenants/tenant-pool.js';
import { TENANTS } from './tenants/tenants.config.js';
import { getGlobalDb } from './db/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT ?? 3001);
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? 'uploads';

// ─── CORS ─────────────────────────────────────────────────────────────────
const buildCorsAllowlist = (): string[] => {
  const list: string[] = [];

  const corsOrigins = process.env.CORS_ORIGINS;
  if (corsOrigins) {
    corsOrigins.split(',').map(o => o.trim()).filter(Boolean).forEach(o => list.push(o));
  }

  const frontendUrl = process.env.FRONTEND_URL;
  if (frontendUrl && !list.includes(frontendUrl)) {
    list.push(frontendUrl);
  }

  if (process.env.NODE_ENV !== 'production') {
    ['http://localhost:5173', 'http://127.0.0.1:5173'].forEach(o => {
      if (!list.includes(o)) list.push(o);
    });
  }

  return list;
};

const corsAllowlist = buildCorsAllowlist();
console.log('[CORS] Allowed origins:', corsAllowlist.join(', ') || '(none)');

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (corsAllowlist.includes(origin)) return callback(null, true);

    if (origin.endsWith('.digitalinaja.net') || origin.endsWith('.vercel.app') || origin.endsWith('.vardh.id') || origin === 'https://vardh.id') {
      return callback(null, true);
    }

    if (process.env.NODE_ENV !== 'production') {
      const isLocalNetwork = /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/.test(origin);
      if (isLocalNetwork) return callback(null, true);
    }

    callback(new Error(`CORS: origin "${origin}" not allowed`));
  },
  credentials: true,
}));

// ─── Body parsers ─────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Native Auth Routes (/api/auth/*) ──────────────────────────────────────
app.use('/api/auth', authRoutes);

// ─── Serve uploaded files ──────────────────────────────────────────────────
const uploadsPath = path.join(__dirname, '..', UPLOAD_DIR);
app.use('/uploads', express.static(uploadsPath));
app.use('/uploads/pod', express.static(path.join(uploadsPath, 'pod')));
app.use('/uploads/receipts', express.static(path.join(uploadsPath, 'receipts')));

// Fallback file resolver across all upload subdirectories (DB first, then disk/tmp)
import fs from 'fs';
import os from 'os';

app.get(['/uploads/:file(*)', '/uploads/*'], async (req, res, next) => {
  try {
    const rawFile = (req.params as any)['file(*)'] || (req.params as any)[0] || (req.params as any).file || req.path.replace(/^\/uploads\//, '');
    const decoded = decodeURIComponent(rawFile || '');
    const cleanFilename = path.basename(decoded);

    // 1. Check PostgreSQL Database across all tenant databases & global DB for persistent Base64 file
    const tenantDbs = [
      getGlobalDb(),
      ...Object.keys(TENANTS).map(tId => getTenantDb(tId)),
    ];

    for (const tDb of tenantDbs) {
      try {
        const record = await ordersService.getUploadedFile(tDb, cleanFilename);
        if (record && record.data) {
          const fileBuffer = Buffer.from(record.data, 'base64');
          res.setHeader('Content-Type', record.mimeType || 'application/pdf');
          res.setHeader('Content-Length', fileBuffer.length);
          res.setHeader('Content-Disposition', `inline; filename="${record.filename}"`);
          res.send(fileBuffer);
          return;
        }
      } catch (e) {}
    }

    // 2. Fallback to disk / tmp directories
    const tmpPath = os.tmpdir();
    const possiblePaths = [
      path.join(uploadsPath, decoded),
      path.join(uploadsPath, 'pod', decoded),
      path.join(uploadsPath, 'receipts', decoded),
      path.join(tmpPath, decoded),
      path.join(tmpPath, 'pod', decoded),
      path.join(tmpPath, 'receipts', decoded),
      path.join(tmpPath, cleanFilename),
      path.join(tmpPath, 'pod', cleanFilename),
      path.join(uploadsPath, cleanFilename),
      path.join(uploadsPath, 'pod', cleanFilename),
    ];
    for (const p of possiblePaths) {
      try {
        if (fs.existsSync(p) && fs.statSync(p).isFile()) {
          return res.sendFile(p);
        }
      } catch (e) {}
    }
  } catch (err) {
    console.warn('[File Serve Error]', err);
  }
  next();
});

// ─── Tenant Resolver ──────────────────────────────────────────────────────
app.use('/api', tenantMiddleware);

// ─── Application API routes ───────────────────────────────────────────────
app.use('/api', apiRoutes);

// ─── Health check ─────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Global error handler ────────────────────────────────────────────────
app.use(errorMiddleware);

// ─── Start server ─────────────────────────────────────────────────────────
if (process.env.VERCEL !== '1') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ TMS Backend running on http://0.0.0.0:${PORT} (Access via local IP: ${PORT})`);
    console.log(`   Auth endpoints: /api/auth`);
    console.log(`   API endpoints:  /api`);
  });
}

export default app;
