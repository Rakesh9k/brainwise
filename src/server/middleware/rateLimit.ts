/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Request, Response, NextFunction } from 'express';
import type { StandardApiError } from '../types/api';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

/**
 * Sliding window rate limiter
 * Limits requests per client IP or authenticated user ID.
 */
export function rateLimiter(options: { windowMs?: number; max?: number } = {}) {
  const windowMs = options.windowMs ?? 60 * 1000; // 1 minute default
  const max = options.max ?? 120; // 120 requests per minute default

  return (req: Request, res: Response, next: NextFunction): void => {
    // Clean expired entries occasionally
    const now = Date.now();
    const identifier = req.user?.uid || req.ip || 'anonymous_client';
    const record = rateLimitStore.get(identifier);

    if (!record || now > record.resetAt) {
      rateLimitStore.set(identifier, {
        count: 1,
        resetAt: now + windowMs,
      });
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', max - 1);
      next();
      return;
    }

    if (record.count >= max) {
      const retryAfterSec = Math.ceil((record.resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfterSec);
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', 0);

      const errorEnvelope: StandardApiError = {
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Too many requests. Please retry in ${retryAfterSec} seconds.`,
          category: 'RATE_LIMIT_ERROR',
          details: { retryAfterSeconds: retryAfterSec },
          retryable: true,
        },
      };
      res.status(429).json(errorEnvelope);
      return;
    }

    record.count += 1;
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', max - record.count);
    next();
  };
}
