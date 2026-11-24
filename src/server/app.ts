/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { type Express } from 'express';
import { configureCors } from './middleware/cors';
import { rateLimiter } from './middleware/rateLimit';
import { errorHandler } from './middleware/error';
import { createApiRouter } from './routes/index';

export function createApp(): Express {
  const app = express();

  // Basic security headers
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    next();
  });

  // CORS
  app.use(configureCors());

  // JSON Body Parser with 2MB limit and rawBody capture for webhook signature verification
  app.use(
    express.json({
      limit: '2mb',
      verify: (req: any, _res, buf) => {
        req.rawBody = buf.toString('utf8');
      },
    })
  );

  // Direct Liveness & Readiness Probes (Cloud Run, Container Probes)
  app.get('/health/live', (_req, res) => {
    res.status(200).json({ status: 'UP', check: 'liveness', timestamp: new Date().toISOString() });
  });

  app.get('/health/ready', (_req, res) => {
    res.status(200).json({ status: 'UP', check: 'readiness', timestamp: new Date().toISOString() });
  });

  // Global Rate Limiting
  app.use('/api', rateLimiter({ windowMs: 60 * 1000, max: 200 }));

  // Mount API Router
  app.use('/api', createApiRouter());

  // Global Centralized Error Handler
  app.use(errorHandler);

  return app;
}
