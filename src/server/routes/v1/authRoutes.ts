/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, type Request, type Response } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { authService } from '../../services/authService';
import { userRepository } from '../../repositories/userRepository';
import { workspaceRepository } from '../../repositories/workspaceRepository';
import type { StandardApiResponse } from '../../types/api';

const router = Router();

// ==========================================
// Public Authentication Routes (No Token)
// ==========================================

/**
 * POST /register
 * Registers a new user account with email and password
 */
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { fullName, email, password } = req.body;
    const result = await authService.register({ fullName, email, password });
    const response: StandardApiResponse<typeof result> = {
      success: true,
      data: result,
    };
    res.status(201).json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Registration failed';
    const code = message.split(':')[0].trim() || 'REGISTRATION_FAILED';
    const cleanMsg = message.includes(':') ? message.split(':')[1].trim() : message;

    res.status(400).json({
      success: false,
      error: {
        code,
        message: cleanMsg,
        category: 'AUTHENTICATION_ERROR',
        retryable: false,
      },
    });
  }
});

/**
 * POST /login
 * Authenticates user credentials and returns session token and next route
 */
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });
    const response: StandardApiResponse<typeof result> = {
      success: true,
      data: result,
    };
    res.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Login failed';
    const code = message.split(':')[0].trim() || 'INVALID_CREDENTIALS';
    const cleanMsg = message.includes(':') ? message.split(':')[1].trim() : message;
    const status = code === 'ACCOUNT_SUSPENDED' ? 403 : 401;

    res.status(status).json({
      success: false,
      error: {
        code,
        message: cleanMsg,
        category: 'AUTHENTICATION_ERROR',
        retryable: false,
      },
    });
  }
});

/**
 * POST /verify-email
 * Verifies 6-digit code or email verification token
 */
router.post('/verify-email', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, code, token } = req.body;
    const codeOrToken = code || token;
    const result = await authService.verifyEmail({ email, codeOrToken });
    const response: StandardApiResponse<typeof result> = {
      success: true,
      data: result,
    };
    res.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Verification failed';
    const code = message.split(':')[0].trim() || 'VERIFICATION_FAILED';
    const cleanMsg = message.includes(':') ? message.split(':')[1].trim() : message;

    res.status(400).json({
      success: false,
      error: {
        code,
        message: cleanMsg,
        category: 'AUTHENTICATION_ERROR',
        retryable: false,
      },
    });
  }
});

/**
 * POST /resend-verification
 * Resends verification code with rate-limit cooldown
 */
router.post('/resend-verification', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    const result = await authService.resendVerification(email);
    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: {
        code: 'RESEND_FAILED',
        message: err instanceof Error ? err.message : 'Failed to resend verification',
        category: 'AUTHENTICATION_ERROR',
        retryable: true,
      },
    });
  }
});

/**
 * POST /forgot-password
 * Triggers password reset email and token
 */
router.post('/forgot-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    const result = await authService.forgotPassword(email);
    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: {
        code: 'FORGOT_PASSWORD_FAILED',
        message: err instanceof Error ? err.message : 'Failed to process request',
        category: 'AUTHENTICATION_ERROR',
        retryable: false,
      },
    });
  }
});

/**
 * POST /reset-password
 * Verifies reset token and updates password
 */
router.post('/reset-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, newPassword } = req.body;
    const result = await authService.resetPassword({ token, newPassword });
    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Password reset failed';
    const code = message.split(':')[0].trim() || 'RESET_FAILED';
    const cleanMsg = message.includes(':') ? message.split(':')[1].trim() : message;

    res.status(400).json({
      success: false,
      error: {
        code,
        message: cleanMsg,
        category: 'AUTHENTICATION_ERROR',
        retryable: false,
      },
    });
  }
});

// ==========================================
// Protected Routes (Require Bearer Token)
// ==========================================

/**
 * GET /me
 * Retrieves authenticated user profile, active workspace, and workspace memberships
 */
router.get('/me', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  const result = await authService.getOrCreateUser(req.user!);
  const response: StandardApiResponse<typeof result> = {
    success: true,
    data: result,
  };
  res.json(response);
});

/**
 * PATCH /me
 * Updates personal user profile preferences
 */
router.patch('/me', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  const uid = req.user!.uid;
  const { displayName, preferences } = req.body;

  let user = await userRepository.findById(uid);
  if (!user) {
    user = (await authService.getOrCreateUser(req.user!)).user;
  }

  const updated = await userRepository.upsert({
    ...user,
    displayName: displayName || user.displayName,
    preferences: preferences ? { ...(user.preferences || {}), ...preferences } : user.preferences,
    updatedAt: new Date().toISOString(),
  });

  const response: StandardApiResponse<typeof updated> = {
    success: true,
    data: updated,
  };
  res.json(response);
});

/**
 * GET /me/workspaces
 * Lists all workspaces the authenticated user belongs to
 */
router.get(
  '/me/workspaces',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    const { workspaces, activeWorkspace } = await authService.getOrCreateUser(req.user!);
    const response: StandardApiResponse<{
      workspaces: typeof workspaces;
      activeWorkspace: typeof activeWorkspace;
    }> = {
      success: true,
      data: { workspaces, activeWorkspace },
    };
    res.json(response);
  }
);

/**
 * POST /me/switch-workspace
 * Switches active workspace for the authenticated user
 */
router.post(
  '/me/switch-workspace',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    const { workspaceId } = req.body;
    if (!workspaceId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_WORKSPACE_ID',
          message: 'workspaceId is required',
          category: 'VALIDATION_ERROR',
          retryable: false,
        },
      });
      return;
    }

    const ws = await workspaceRepository.findById(workspaceId);
    if (!ws) {
      res.status(404).json({
        success: false,
        error: {
          code: 'WORKSPACE_NOT_FOUND',
          message: `Workspace '${workspaceId}' not found.`,
          category: 'NOT_FOUND',
          retryable: false,
        },
      });
      return;
    }

    await userRepository.setActiveWorkspace(req.user!.uid, workspaceId);

    res.json({
      success: true,
      data: { activeWorkspaceId: workspaceId, workspace: ws },
    });
  }
);

/**
 * DELETE /me/account
 * Cascading account deletion
 */
router.delete(
  '/me/account',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      await authService.deleteAccount(req.user!.uid);
      res.json({
        success: true,
        data: { message: 'Account and associated resources successfully deleted.' },
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: {
          code: 'ACCOUNT_DELETION_FAILED',
          message: err instanceof Error ? err.message : 'Failed to delete account',
          category: 'INTERNAL_ERROR',
          retryable: false,
        },
      });
    }
  }
);

export const authRoutes = router;
