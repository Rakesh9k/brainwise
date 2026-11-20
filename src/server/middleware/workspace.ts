/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Request, Response, NextFunction } from 'express';
import { db } from '../db/firestore';
import type {
  StandardApiError,
  WorkspaceEntity,
  WorkspaceMemberEntity,
  WorkspaceRole,
} from '../types/api';

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Express {
    interface Request {
      workspace?: WorkspaceEntity;
      membership?: WorkspaceMemberEntity;
    }
  }
}
/* eslint-enable @typescript-eslint/no-namespace */

/**
 * Workspace Authorization Middleware
 * Verifies that:
 * 1. User is authenticated
 * 2. Requested workspace exists
 * 3. User is an active member or owner of the workspace
 * 4. Workspace status is active
 */
export async function requireWorkspaceMember(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const user = req.user;
  if (!user) {
    const errorEnvelope: StandardApiError = {
      success: false,
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Authentication required prior to workspace authorization.',
        category: 'AUTHENTICATION_ERROR',
        retryable: false,
      },
    };
    res.status(401).json(errorEnvelope);
    return;
  }

  const workspaceId =
    (req.params.workspaceId as string) ||
    (req.headers['x-workspace-id'] as string) ||
    (req.body && typeof req.body === 'object' && req.body.workspaceId);

  if (!workspaceId || typeof workspaceId !== 'string') {
    const errorEnvelope: StandardApiError = {
      success: false,
      error: {
        code: 'MISSING_WORKSPACE_CONTEXT',
        message:
          'Workspace identifier must be provided in URL parameters or X-Workspace-Id header.',
        category: 'VALIDATION_ERROR',
        retryable: false,
      },
    };
    res.status(400).json(errorEnvelope);
    return;
  }

  // 1. Fetch Workspace Record
  const wsDoc = await db.doc<WorkspaceEntity>(`workspaces/${workspaceId}`).get();
  if (!wsDoc.exists || !wsDoc.data()) {
    const errorEnvelope: StandardApiError = {
      success: false,
      error: {
        code: 'WORKSPACE_NOT_FOUND',
        message: `Requested workspace with ID '${workspaceId}' does not exist.`,
        category: 'NOT_FOUND',
        retryable: false,
      },
    };
    res.status(404).json(errorEnvelope);
    return;
  }

  const workspace = wsDoc.data()!;
  if (workspace.workspaceStatus === 'archived' && req.method !== 'GET') {
    const errorEnvelope: StandardApiError = {
      success: false,
      error: {
        code: 'WORKSPACE_ARCHIVED',
        message: 'This workspace is archived. Write operations are disabled.',
        category: 'AUTHORIZATION_ERROR',
        retryable: false,
      },
    };
    res.status(403).json(errorEnvelope);
    return;
  }

  // 2. Check Ownership or Active Membership
  let membership: WorkspaceMemberEntity | undefined;

  if (workspace.ownerUserId === user.uid || user.isSuperAdmin) {
    membership = {
      membershipId: `mem_${user.uid}_${workspaceId}`,
      workspaceId,
      userId: user.uid,
      role: 'owner',
      membershipStatus: 'active',
      joinedAt: workspace.createdAt,
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt,
    };
  } else {
    // Check membership collection
    const memberDoc = await db
      .doc<WorkspaceMemberEntity>(`workspaces/${workspaceId}/members/${user.uid}`)
      .get();

    if (memberDoc.exists && memberDoc.data()?.membershipStatus === 'active') {
      membership = memberDoc.data();
    } else {
      // Check root workspaceMembers
      const rootMemberSnap = await db
        .collection<WorkspaceMemberEntity>('workspaceMembers')
        .where('workspaceId', '==', workspaceId)
        .where('userId', '==', user.uid)
        .where('membershipStatus', '==', 'active')
        .limit(1)
        .get();

      if (!rootMemberSnap.empty) {
        membership = rootMemberSnap.docs[0].data();
      }
    }
  }

  if (!membership) {
    const errorEnvelope: StandardApiError = {
      success: false,
      error: {
        code: 'FORBIDDEN_WORKSPACE_ACCESS',
        message: 'You do not have active membership in this workspace. Access denied.',
        category: 'AUTHORIZATION_ERROR',
        details: { requestedWorkspaceId: workspaceId, userId: user.uid },
        retryable: false,
      },
    };
    res.status(403).json(errorEnvelope);
    return;
  }

  req.workspace = workspace;
  req.membership = membership;
  next();
}

/**
 * Role-Based Access Control Middleware Generator
 * Ensures the authenticated user possesses minimum required role level.
 */
export function requireWorkspaceRole(allowedRoles: WorkspaceRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const membership = req.membership;
    if (!membership) {
      res.status(403).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED_ROLE',
          message: 'Workspace membership context missing.',
          category: 'AUTHORIZATION_ERROR',
          retryable: false,
        },
      });
      return;
    }

    if (!allowedRoles.includes(membership.role)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_ROLE_PERMISSIONS',
          message: `Operation requires one of the following roles: [${allowedRoles.join(
            ', '
          )}]. Current role: '${membership.role}'.`,
          category: 'AUTHORIZATION_ERROR',
          details: { currentRole: membership.role, requiredRoles: allowedRoles },
          retryable: false,
        },
      });
      return;
    }

    next();
  };
}
