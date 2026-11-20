/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, type Request, type Response } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { requireWorkspaceMember, requireWorkspaceRole } from '../../middleware/workspace';
import { taskRepository } from '../../repositories/taskRepository';
import { departmentEventBus } from '../../events/eventBus';
import type { GrowthTaskEntity } from '../../types/api';

const router = Router({ mergeParams: true });

router.use(authenticateToken);
router.use(requireWorkspaceMember);

/**
 * GET /api/v1/workspaces/:workspaceId/tasks
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const tasks = await taskRepository.listByWorkspace(req.workspace!.workspaceId);
  res.json({
    success: true,
    data: tasks,
  });
});

/**
 * POST /api/v1/workspaces/:workspaceId/tasks
 */
router.post(
  '/',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    const { title, description, priority, dueDate, relatedGoalId, relatedExperimentId } = req.body;
    if (!title) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_TITLE',
          message: 'Task title is required',
          category: 'VALIDATION_ERROR',
          retryable: false,
        },
      });
      return;
    }

    const taskId =
      req.body.taskId || `tsk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const task: GrowthTaskEntity = {
      taskId,
      workspaceId: req.workspace!.workspaceId,
      title: title.trim(),
      description: description || '',
      priority: priority || 'medium',
      status: 'pending',
      dueDate: dueDate || now,
      relatedGoalId,
      relatedExperimentId,
      createdBy: req.user!.uid,
      createdAt: now,
      updatedAt: now,
    };

    await taskRepository.create(task);

    await departmentEventBus.emit({
      workspaceId: req.workspace!.workspaceId,
      userId: req.user!.uid,
      eventType: 'TASK_CREATED',
      resourceId: taskId,
      metadata: { title: task.title, priority: task.priority },
    });

    res.status(201).json({
      success: true,
      data: task,
    });
  }
);

/**
 * PATCH /api/v1/workspaces/:workspaceId/tasks/:taskId
 */
router.patch(
  '/:taskId',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    const updated = await taskRepository.update(
      req.workspace!.workspaceId,
      req.params.taskId,
      req.body
    );

    if (req.body.status === 'completed') {
      await departmentEventBus.emit({
        workspaceId: req.workspace!.workspaceId,
        userId: req.user!.uid,
        eventType: 'TASK_COMPLETED',
        resourceId: req.params.taskId,
        metadata: { title: updated.title },
      });
    }

    res.json({
      success: true,
      data: updated,
    });
  }
);

/**
 * DELETE /api/v1/workspaces/:workspaceId/tasks/:taskId
 */
router.delete(
  '/:taskId',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    await taskRepository.delete(req.workspace!.workspaceId, req.params.taskId);
    res.json({
      success: true,
      data: { deleted: true, taskId: req.params.taskId },
    });
  }
);

export const taskRoutes = router;
