/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import cors from 'cors';
import { serverConfig } from '../config/index';

export const configureCors = () =>
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, or same-origin SSR)
      if (!origin) return callback(null, true);

      if (
        !serverConfig.isProduction ||
        serverConfig.corsOrigins.includes(origin) ||
        origin.endsWith('.brain-wise.com')
      ) {
        return callback(null, true);
      }

      callback(new Error(`Origin '${origin}' blocked by CORS policy.`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Workspace-Id',
      'X-Idempotency-Key',
      'X-Requested-With',
    ],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'Retry-After'],
    maxAge: 86400,
  });
