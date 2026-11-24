/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, type Request, type Response } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { requireWorkspaceMember, requireWorkspaceRole } from '../../middleware/workspace';
import { taskRepository } from '../../repositories/taskRepository';
import { departmentEventBus } from '../../events/eventBus';
import { growthDirectorService } from '../../services/growthDirectorService';
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

/**
 * POST /api/v1/workspaces/:workspaceId/tasks/roadmap/generate
 * Generates an actionable operational roadmap with multi-horizon tasks
 */
router.post(
  '/roadmap/generate',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const workspaceId = req.workspace!.workspaceId;
      const { focusCategory } = req.body;
      const roadmap = await growthDirectorService.generateOperationalRoadmap({
        workspaceId,
        focusCategory,
      });
      res.json({ success: true, data: roadmap });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'ROADMAP_GENERATION_FAILED', message: err.message },
      });
    }
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/tasks/growth-plans
 * Lists growth tasks with deterministic ICE scores and time horizons
 */
router.get(
  '/growth-plans',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const workspaceId = req.workspace!.workspaceId;
      const timeHorizon = req.query.timeHorizon as any;
      const status = req.query.status as any;
      const tasks = await growthDirectorService.getGrowthTasks(workspaceId, {
        timeHorizon,
        status,
      });
      res.json({ success: true, data: tasks });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'TASK_FETCH_FAILED', message: err.message },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/tasks/:taskId/outcome
 * Records real-world task outcome and triggers closed-loop learning
 */
router.post(
  '/:taskId/outcome',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const workspaceId = req.workspace!.workspaceId;
      const taskId = req.params.taskId;
      const { status = 'COMPLETED', outcomeMet, actualMetrics, notes, learningsToPersist } = req.body;

      const result = await growthDirectorService.recordTaskOutcome({
        taskId,
        workspaceId,
        status,
        outcomeMet: Boolean(outcomeMet),
        actualMetrics,
        notes: notes || '',
        learningsToPersist,
      });

      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'TASK_OUTCOME_FAILED', message: err.message },
      });
    }
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/tasks/intelligence/overview
 * Returns complete AI Growth Director intelligence overview
 */
router.get(
  '/intelligence/overview',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const workspaceId = req.workspace!.workspaceId;
      const overview = await growthDirectorService.getGrowthIntelligenceOverview(workspaceId);
      res.json({ success: true, data: overview });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'GROWTH_INTELLIGENCE_FAILED', message: err.message },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/tasks/intelligence/simulate
 * Simulates growth scenarios across conservative, expected, and optimistic models
 */
router.post(
  '/intelligence/simulate',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const workspaceId = req.workspace!.workspaceId;
      const {
        baselineRevenue = 50000,
        monthlyBudget = 10000,
        currentCac = 800,
        currentConversionRatePercent = 3.2,
        averageOrderValue = 499,
        grossMarginPercent = 75,
      } = req.body;

      const simulation = growthDirectorService.simulateGrowthScenarios({
        workspaceId,
        baselineRevenue: Number(baselineRevenue),
        monthlyBudget: Number(monthlyBudget),
        currentCac: Number(currentCac),
        currentConversionRatePercent: Number(currentConversionRatePercent),
        averageOrderValue: Number(averageOrderValue),
        grossMarginPercent: Number(grossMarginPercent),
      });

      res.json({ success: true, data: simulation });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'SIMULATION_FAILED', message: err.message },
      });
    }
  }
);

export const taskRoutes = router;
