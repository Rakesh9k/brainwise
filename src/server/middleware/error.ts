/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Request, Response, NextFunction } from 'express';
import type { StandardApiError } from '../types/api';
import { serverConfig } from '../config/index';

export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string,
    public readonly category: StandardApiError['error']['category'] = 'INTERNAL_ERROR',
    public readonly details?: unknown,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const isAppError = err instanceof AppError;
  const status = isAppError ? err.statusCode : 500;
  const code = isAppError ? err.code : 'INTERNAL_SERVER_ERROR';
  const category = isAppError ? err.category : 'INTERNAL_ERROR';
  const retryable = isAppError ? err.retryable : false;
  const details = isAppError ? err.details : serverConfig.isProduction ? undefined : err.stack;

  // Log server errors securely without leaking sensitive payload data
  if (status >= 500) {
    console.error(`[SERVER_ERROR] [${code}] ${err.message}`, err.stack);
  }

  const envelope: StandardApiError = {
    success: false,
    error: {
      code,
      message: err.message || 'An unexpected internal error occurred.',
      category,
      details,
      retryable,
    },
  };

  res.status(status).json(envelope);
}
