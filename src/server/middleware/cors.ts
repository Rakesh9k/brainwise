/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import cors from 'cors';
import { serverConfig } from '../config/index';

const ALLOWED_ORIGIN_REGEX =
  /^https?:\/\/(?:[a-zA-Z0-9-]+\.)*(?:brain-wise\.com|hosted\.app|web\.app|firebaseapp\.com|run\.app)(?::\d+)?$/;

export const configureCors = () =>
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, or same-origin SSR)
      if (!origin) return callback(null, true);

      if (
        !serverConfig.isProduction ||
        serverConfig.corsOrigins.includes(origin) ||
        origin === 'https://brain-wise.com' ||
        origin === 'https://www.brain-wise.com' ||
        origin === 'http://brain-wise.com' ||
        origin === 'http://www.brain-wise.com' ||
        ALLOWED_ORIGIN_REGEX.test(origin)
      ) {
        return callback(null, true);
      }

      callback(null, false);
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
