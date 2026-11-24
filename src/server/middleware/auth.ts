/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Request, Response, NextFunction } from 'express';
import { getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { userRepository } from '../repositories/userRepository';
import { serverConfig } from '../config/index';
import type { AuthenticatedUser, StandardApiError, WorkspaceMemberEntity } from '../types/api';

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      workspaceMember?: WorkspaceMemberEntity;
    }
  }
}
/* eslint-enable @typescript-eslint/no-namespace */

/**
 * Authentication Middleware
 * Enforces Firebase ID Token authentication on protected routes.
 * Supports deterministic dev/test tokens in non-production environments.
 */
export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization?.trim();
  if (!authHeader) {
    const errorEnvelope: StandardApiError = {
      success: false,
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Missing Authorization header. Expected Bearer token.',
        category: 'AUTHENTICATION_ERROR',
        retryable: false,
      },
    };
    res.status(401).json(errorEnvelope);
    return;
  }

  if (!authHeader.startsWith('Bearer')) {
    const errorEnvelope: StandardApiError = {
      success: false,
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Invalid Authorization scheme. Expected Bearer token.',
        category: 'AUTHENTICATION_ERROR',
        retryable: false,
      },
    };
    res.status(401).json(errorEnvelope);
    return;
  }

  const token = authHeader.replace(/^Bearer\s*/, '').trim();
  if (!token) {
    const errorEnvelope: StandardApiError = {
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Bearer token string is empty.',
        category: 'AUTHENTICATION_ERROR',
        retryable: false,
      },
    };
    res.status(401).json(errorEnvelope);
    return;
  }

  // 1. Development & Test Token Verification
  if (!serverConfig.isProduction) {
    if (
      token.startsWith('test-token-') ||
      token.startsWith('mock-token-') ||
      token.startsWith('bw-token-') ||
      token.startsWith('session-') ||
      token === 'demo-token'
    ) {
      const uid =
        token.replace(/^(test-token-|mock-token-|bw-token-|session-)/, '') || 'vishesh_demo_uid';
      const existingUser = await userRepository.findById(uid);
      req.user = {
        uid,
        userId: uid,
        email: existingUser ? existingUser.email : `${uid}@brain-wise.com`,
        displayName: existingUser
          ? existingUser.displayName
          : uid.charAt(0).toUpperCase() + uid.slice(1),
        isSuperAdmin: uid === 'admin_user',
      };
      next();
      return;
    }
  }

  // 2. Production Firebase Admin Token Verification
  try {
    if (getApps().length > 0) {
      const decoded = await getAuth().verifyIdToken(token);
      req.user = {
        uid: decoded.uid,
        userId: decoded.uid,
        email: decoded.email || `${decoded.uid}@user.brain-wise.com`,
        displayName: decoded.name || decoded.email?.split('@')[0],
        isSuperAdmin: Boolean(decoded.admin || decoded.isSuperAdmin),
      };
      next();
      return;
    }
  } catch (err) {
    const isExpired = err instanceof Error && err.message.toLowerCase().includes('expired');
    const errorEnvelope: StandardApiError = {
      success: false,
      error: {
        code: isExpired ? 'TOKEN_EXPIRED' : 'INVALID_CREDENTIALS',
        message: isExpired
          ? 'Firebase ID token has expired. Please refresh credentials.'
          : 'Failed to verify Firebase authentication token.',
        category: 'AUTHENTICATION_ERROR',
        details: err instanceof Error ? err.message : undefined,
        retryable: isExpired,
      },
    };
    res.status(401).json(errorEnvelope);
    return;
  }

  // Fallback if Firebase Admin is not initialized in dev
  if (!serverConfig.isProduction) {
    req.user = {
      uid: 'dev_user_default',
      userId: 'dev_user_default',
      email: 'dev@brain-wise.com',
      displayName: 'Developer',
      isSuperAdmin: true,
    };
    next();
    return;
  }

  const errorEnvelope: StandardApiError = {
    success: false,
    error: {
      code: 'AUTH_SERVICE_UNAVAILABLE',
      message: 'Authentication provider is not properly configured.',
      category: 'AUTHENTICATION_ERROR',
      retryable: true,
    },
  };
  res.status(500).json(errorEnvelope);
}
