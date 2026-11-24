/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, type Request, type Response } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { requireWorkspaceMember } from '../../middleware/workspace';
import { sharedBusinessContextService } from '../../services/sharedBusinessContextService';
import { departmentCoordinationService } from '../../services/departmentCoordinationService';
import { departmentTaskRepository } from '../../repositories/departmentTaskRepository';
import type { WorkspaceRole } from '../../types/api';

export const departmentRoutes = Router({ mergeParams: true });

departmentRoutes.use(authenticateToken);
departmentRoutes.use(requireWorkspaceMember);

/**
 * GET /api/v1/workspaces/:workspaceId/departments/:department/context
 * Retrieves tailored, role-filtered shared business context
 */
departmentRoutes.get('/:department/context', async (req: Request, res: Response): Promise<void> => {
  try {
    const workspaceId = req.workspace!.workspaceId;
    const department = req.params.department as string;
    const userRole = (req.membership?.role || 'member') as WorkspaceRole;
    const bypassCache = req.query.bypassCache === 'true';
    const tokenBudget = req.query.tokenBudget
      ? parseInt(req.query.tokenBudget as string, 10)
      : 3000;

    const context = await sharedBusinessContextService.getDepartmentContext({
      workspaceId,
      department,
      userRole,
      callerWorkspaceId: req.workspace?.workspaceId || workspaceId,
      bypassCache,
      tokenBudget,
    });

    res.json({
      success: true,
      data: context,
    });
  } catch (err: any) {
    const status = err.statusCode || 500;
    res.status(status).json({
      success: false,
      error: {
        code: status === 403 ? 'AUTHORIZATION_ERROR' : 'CONTEXT_RETRIEVAL_FAILED',
        message: err.message || 'Failed to retrieve department context',
        retryable: status !== 403,
      },
    });
  }
});

/**
 * POST /api/v1/workspaces/:workspaceId/departments/:department/tasks
 * Submits a standard department task with duplicate prevention
 */
departmentRoutes.post('/:department/tasks', async (req: Request, res: Response): Promise<void> => {
  try {
    const workspaceId = req.workspace!.workspaceId;
    const department = req.params.department as string;
    const userRole = (req.membership?.role || 'member') as WorkspaceRole;
    const userId = req.user?.uid || 'anonymous';

    const {
      objective,
      inputContext = {},
      requestedAction,
      requiredOutputSchema,
      priority = 'MEDIUM',
      dependencies = [],
      permissionRequirements = [],
      approvalRequirements = { required: false },
      idempotencyKey,
    } = req.body;

    if (!objective || !requestedAction) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Both objective and requestedAction are required fields.',
          retryable: false,
        },
      });
      return;
    }

    const { task, isDuplicate } = await departmentCoordinationService.submitTask({
      workspaceId,
      department,
      objective,
      inputContext,
      requestedAction,
      requiredOutputSchema,
      priority,
      dependencies,
      permissionRequirements,
      approvalRequirements,
      idempotencyKey,
      userRole,
      userId,
    });

    res.status(isDuplicate ? 200 : 201).json({
      success: true,
      data: task,
      meta: {
        isDuplicate,
      },
    });
  } catch (err: any) {
    const status = err.statusCode || 500;
    res.status(status).json({
      success: false,
      error: {
        code: status === 403 ? 'AUTHORIZATION_ERROR' : 'TASK_SUBMISSION_FAILED',
        message: err.message || 'Failed to submit department task',
        retryable: status !== 403,
      },
    });
  }
});

/**
 * GET /api/v1/workspaces/:workspaceId/departments/:department/tasks
 * Lists tasks for a department
 */
departmentRoutes.get('/:department/tasks', async (req: Request, res: Response): Promise<void> => {
  try {
    const workspaceId = req.workspace!.workspaceId;
    const department = req.params.department as string;
    const status = req.query.status as string | undefined;

    const tasks = await departmentTaskRepository.listByWorkspace(workspaceId, {
      department,
      status,
    });

    res.json({
      success: true,
      data: tasks,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'TASK_LIST_FAILED',
        message: err.message || 'Failed to list department tasks',
        retryable: true,
      },
    });
  }
});

/**
 * GET /api/v1/workspaces/:workspaceId/departments/:department/tasks/:taskId
 * Retrieves specific department task
 */
departmentRoutes.get(
  '/:department/tasks/:taskId',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const workspaceId = req.workspace!.workspaceId;
      const taskId = req.params.taskId as string;

      const task = await departmentTaskRepository.findById(workspaceId, taskId);
      if (!task) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Department task '${taskId}' was not found.`,
            retryable: false,
          },
        });
        return;
      }

      res.json({
        success: true,
        data: task,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'TASK_RETRIEVAL_FAILED',
          message: err.message || 'Failed to retrieve department task',
          retryable: true,
        },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/departments/:department/tasks/:taskId/approve
 * Approves a task awaiting approval
 */
departmentRoutes.post(
  '/:department/tasks/:taskId/approve',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const workspaceId = req.workspace!.workspaceId;
      const taskId = req.params.taskId as string;
      const userRole = (req.membership?.role || 'member') as WorkspaceRole;
      const userId = req.user?.uid || 'system';
      const comments = req.body?.comments;

      const updated = await departmentCoordinationService.approveTask({
        workspaceId,
        taskId,
        actorId: userId,
        userRole,
        comments,
      });

      res.json({
        success: true,
        data: updated,
      });
    } catch (err: any) {
      const status = err.statusCode || 500;
      res.status(status).json({
        success: false,
        error: {
          code: status === 403 ? 'AUTHORIZATION_ERROR' : 'TASK_APPROVAL_FAILED',
          message: err.message || 'Failed to approve task',
          retryable: false,
        },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/departments/:department/tasks/:taskId/reject
 * Explicitly rejects a task
 */
departmentRoutes.post(
  '/:department/tasks/:taskId/reject',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const workspaceId = req.workspace!.workspaceId;
      const taskId = req.params.taskId as string;
      const userRole = (req.membership?.role || 'member') as WorkspaceRole;
      const userId = req.user?.uid || 'system';
      const reason = req.body?.reason || 'Task rejected by user';

      const updated = await departmentCoordinationService.rejectTask({
        workspaceId,
        taskId,
        actorId: userId,
        userRole,
        reason,
      });

      res.json({
        success: true,
        data: updated,
      });
    } catch (err: any) {
      const status = err.statusCode || 500;
      res.status(status).json({
        success: false,
        error: {
          code: status === 403 ? 'AUTHORIZATION_ERROR' : 'TASK_REJECTION_FAILED',
          message: err.message || 'Failed to reject task',
          retryable: false,
        },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/departments/:department/coordination/event
 * Emits a cross-department coordination event
 */
departmentRoutes.post(
  '/:department/coordination/event',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const workspaceId = req.workspace!.workspaceId;
      const sourceDepartment = req.params.department as string;
      const { targetDepartment, eventType, payload = {} } = req.body;
      const userId = req.user?.uid || 'system';

      if (!targetDepartment || !eventType) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Both targetDepartment and eventType are required.',
            retryable: false,
          },
        });
        return;
      }

      const result = await departmentCoordinationService.dispatchCoordinationEvent({
        workspaceId,
        sourceDepartment,
        targetDepartment,
        eventType,
        payload,
        userId,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'COORDINATION_EVENT_FAILED',
          message: err.message || 'Failed to dispatch coordination event',
          retryable: true,
        },
      });
    }
  }
);
