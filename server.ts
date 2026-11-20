/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import 'dotenv/config';
import dns from 'node:dns';
import path from 'path';
import { fileURLToPath } from 'url';
import express, { type Request, type Response } from 'express';
import { createApp } from './src/server/app';
import { serverConfig } from './src/server/config/index';

dns.setDefaultResultOrder('ipv4first');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer(): Promise<void> {
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
    // In production, serve pre-built Vite assets from dist/
    const defaultDist = path.resolve(__dirname, 'dist');
    const distDir = process.env.CLIENT_DIST_DIR || defaultDist;
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
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
