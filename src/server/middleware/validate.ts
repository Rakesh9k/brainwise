/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Request, Response, NextFunction } from 'express';
import { ZodError, type ZodSchema } from 'zod';
import type { StandardApiError } from '../types/api';

export function validateRequest(schemas: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }
      if (schemas.query) {
        req.query = (await schemas.query.parseAsync(req.query)) as typeof req.query;
      }
      if (schemas.params) {
        req.params = (await schemas.params.parseAsync(req.params)) as typeof req.params;
      }
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const errorEnvelope: StandardApiError = {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Input validation failed for request payload.',
            category: 'VALIDATION_ERROR',
            details: err.issues.map((e) => ({
              field: e.path.join('.'),
              message: e.message,
            })),
            retryable: false,
          },
        };
        res.status(400).json(errorEnvelope);
        return;
      }
      next(err);
    }
  };
}
