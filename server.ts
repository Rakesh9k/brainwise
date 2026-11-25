/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import 'dotenv/config';
import fs from 'fs';
import dns from 'node:dns';
import path from 'path';
import { fileURLToPath } from 'url';
import express, { type Request, type Response } from 'express';
import { createApp } from './src/server/app';
import { serverConfig } from './src/server/config/index';
import { db } from './src/server/db/firestore';
import { MigrationManager, SYSTEM_MIGRATIONS } from './src/server/db/migrations';
import { dbLogger } from './src/server/db/dbLogger';

dns.setDefaultResultOrder('ipv4first');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer(): Promise<void> {
  // Execute database bootstrap & schema migrations before listening
  try {
    dbLogger.info('Verifying database initialization and applying pending migrations...', {
      operation: 'STARTUP_PRECHECK',
      details: { provider: db.providerName, persistent: db.isPersistent },
    });
    await MigrationManager.applyMigrations(db, SYSTEM_MIGRATIONS);
  } catch (err: unknown) {
    dbLogger.error('Failed to apply database migrations on startup', {
      operation: 'STARTUP_PRECHECK',
      error: err instanceof Error ? err.message : String(err),
    });
    if (serverConfig.isProduction) {
      throw err; // Stop application startup in production
    }
  }

  const app = createApp();
  const PORT = serverConfig.port;

  // In development, mount Vite middleware for instant HMR
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production, locate the static client assets directory
    const candidates = [
      process.env.CLIENT_DIST_DIR,
      path.resolve(__dirname),
      path.resolve(__dirname, 'dist'),
      path.resolve(process.cwd(), 'dist'),
    ].filter(Boolean) as string[];

    const distDir =
      candidates.find((dir) => fs.existsSync(path.join(dir, 'index.html'))) ||
      path.resolve(__dirname, 'dist');
    console.log(`[BRAINWISE_SERVER] Serving production frontend from: ${distDir}`);

    // Immutable caching for hashed assets in /assets (never fall through to index.html on missing assets)
    const assetsDir = path.join(distDir, 'assets');
    if (fs.existsSync(assetsDir)) {
      app.use(
        '/assets',
        express.static(assetsDir, {
          maxAge: '1y',
          immutable: true,
          fallthrough: false,
        })
      );
    }

    // Static files with explicit no-cache headers on HTML
    app.use(
      express.static(distDir, {
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
          }
        },
      })
    );

    // SPA fallback route: Prevent missing static assets (.js, .css, .ico, etc.) from returning index.html
    app.get('*', (req: Request, res: Response) => {
      if (/\.[a-zA-Z0-9]+$/.test(req.path)) {
        res.status(404).type('text/plain').send('Resource not found');
        return;
      }
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[BRAINWISE_SERVER] Enterprise backend running at http://localhost:${PORT}`);
    console.log(
      `[BRAINWISE_SERVER] Environment: ${serverConfig.nodeEnv} | Gemini Model: ${serverConfig.geminiModel}`
    );
  });

  // Graceful shutdown handling for Cloud Run & container lifecycle
  const gracefulShutdown = (signal: string) => {
    console.log(`[BRAINWISE_SERVER] Received ${signal}. Commencing graceful shutdown...`);
    server.close(() => {
      console.log('[BRAINWISE_SERVER] HTTP server terminated successfully. Exiting process.');
      process.exit(0);
    });

    // Enforce shutdown after 10-second timeout if connections remain open
    setTimeout(() => {
      console.error('[BRAINWISE_SERVER] Forceful shutdown triggered after timeout.');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

startServer().catch((err) => {
  console.error('[FATAL] Failed to start BrainWise server:', err);
  process.exit(1);
});
