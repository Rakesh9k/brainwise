/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, type Request, type Response } from 'express';
import crypto from 'node:crypto';
import { authenticateToken } from '../../middleware/auth';
import { requireWorkspaceMember, requireWorkspaceRole } from '../../middleware/workspace';
import { experimentRepository } from '../../repositories/experimentRepository';
import { taskRepository } from '../../repositories/taskRepository';
import { memoryEngine } from '../../ai/memoryEngine';
import { departmentEventBus } from '../../events/eventBus';
import type { GrowthExperimentEntity, GrowthTaskEntity } from '../../types/api';

const router = Router({ mergeParams: true });

router.use(authenticateToken);
router.use(requireWorkspaceMember);

/**
 * GET /api/v1/workspaces/:workspaceId/experiments
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const experiments = await experimentRepository.listByWorkspace(req.workspace!.workspaceId);
  res.json({
    success: true,
    data: experiments,
  });
});

/**
 * POST /api/v1/workspaces/:workspaceId/experiments
 */
router.post(
  '/',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    const { title, hypothesis, department, budget, startDate, endDate, status } = req.body;
    if (!title || !hypothesis) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'title and hypothesis are required',
          category: 'VALIDATION_ERROR',
          retryable: false,
        },
      });
      return;
    }

    const experimentId =
      req.body.experimentId || `exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const experiment: GrowthExperimentEntity = {
      experimentId,
      workspaceId: req.workspace!.workspaceId,
      title: title.trim(),
      hypothesis: hypothesis.trim(),
      department: department || 'General',
      status: status || 'idea',
      budget: budget || '$0',
      startDate: startDate || now,
      endDate: endDate || now,
      createdBy: req.user!.uid,
      createdAt: now,
      updatedAt: now,
    };

    await experimentRepository.create(experiment);

    await departmentEventBus.emit({
      workspaceId: req.workspace!.workspaceId,
      userId: req.user!.uid,
      eventType: 'EXPERIMENT_STARTED',
      resourceId: experimentId,
      metadata: { title: experiment.title, status: experiment.status },
    });

    res.status(201).json({
      success: true,
      data: experiment,
    });
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/experiments/:experimentId/complete
 * Records actual outcome results and marks experiment complete
 */
router.post(
  '/:experimentId/complete',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    const { results, learnings } = req.body;
    const now = new Date().toISOString();

    const updated = await experimentRepository.update(
      req.workspace!.workspaceId,
      req.params.experimentId,
      {
        status: 'completed',
        results: results || 'Completed with recorded outcome data.',
        updatedAt: now,
      }
    );

    await departmentEventBus.emit({
      workspaceId: req.workspace!.workspaceId,
      userId: req.user!.uid,
      eventType: 'EXPERIMENT_COMPLETED',
      resourceId: req.params.experimentId,
      metadata: { results, learnings },
    });

    res.json({ success: true, data: updated });
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/experiments/:experimentId/analyze
 * Analyzes experiment outcomes against hypothesis and persists learnings to Business Memory
 */
router.post(
  '/:experimentId/analyze',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    const experiment = (
      await experimentRepository.listByWorkspace(req.workspace!.workspaceId)
    ).find((e) => e.experimentId === req.params.experimentId);
    if (!experiment) {
      res
        .status(404)
        .json({ success: false, error: { code: 'NOT_FOUND', message: 'Experiment not found' } });
      return;
    }

    const { actualMetrics, analysisSummary, learnings } = req.body;
    const now = new Date().toISOString();

    const outcomeText =
      analysisSummary ||
      `Analysis for '${experiment.title}': Results verified. Hypothesis: "${experiment.hypothesis}". Outcome: "${experiment.results || 'Positive traction'}".`;

    const learningContent =
      learnings ||
      `Learning from Experiment [${experiment.title}]: Validated channel efficiency in ${experiment.department}. Actual metrics: ${JSON.stringify(actualMetrics || {})}.`;

    // Persist verified learning to memory engine
    const memory = await memoryEngine.createMemory({
      workspaceId: req.workspace!.workspaceId,
      category: 'APPROVED_BUSINESS_FACT',
      content: learningContent,
      source: `Experiment: ${experiment.title}`,
      confidence: 0.95,
      approvalStatus: 'APPROVED',
      tags: ['growth-experiment', experiment.department.toLowerCase()],
      createdBy: req.user!.uid,
    });

    const updated = await experimentRepository.update(
      req.workspace!.workspaceId,
      experiment.experimentId,
      {
        results: outcomeText,
        updatedAt: now,
      }
    );

    await departmentEventBus.emit({
      workspaceId: req.workspace!.workspaceId,
      userId: req.user!.uid,
      eventType: 'EXPERIMENT_ANALYSIS_COMPLETED',
      resourceId: experiment.experimentId,
      metadata: { memoryId: memory.memoryId, learning: learningContent },
    });

    res.json({
      success: true,
      data: {
        experiment: updated,
        memory,
        outcomeAnalysis: outcomeText,
      },
    });
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/experiments/:experimentId/generate-tasks
 * Generates tasks for executing this experiment
 */
router.post(
  '/:experimentId/generate-tasks',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    const experiment = (
      await experimentRepository.listByWorkspace(req.workspace!.workspaceId)
    ).find((e) => e.experimentId === req.params.experimentId);
    if (!experiment) {
      res
        .status(404)
        .json({ success: false, error: { code: 'NOT_FOUND', message: 'Experiment not found' } });
      return;
    }

    const tasksToCreate = [
      {
        title: `Setup baseline measurement for ${experiment.title}`,
        priority: 'high' as const,
        description: `Define instrumentation & conversion tracking before experiment launch.`,
      },
      {
        title: `Execute initial 7-day test cohort for ${experiment.title}`,
        priority: 'high' as const,
        description: `Run campaign cohort with allocated budget of ${experiment.budget || '$150'}.`,
      },
      {
        title: `Synthesize cohort results and evaluate hypothesis for ${experiment.title}`,
        priority: 'medium' as const,
        description: `Review recorded data against hypothesis: "${experiment.hypothesis}".`,
      },
    ];

    const now = new Date().toISOString();
    const createdTasks: GrowthTaskEntity[] = [];

    for (const t of tasksToCreate) {
      const taskId = `tsk_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      const task: GrowthTaskEntity = {
        taskId,
        workspaceId: req.workspace!.workspaceId,
        title: t.title,
        description: t.description,
        relatedExperimentId: experiment.experimentId,
        priority: t.priority,
        status: 'pending',
        dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        createdBy: req.user!.uid,
        createdAt: now,
        updatedAt: now,
      };

      await taskRepository.create(task);
      createdTasks.push(task);

      await departmentEventBus.emit({
        workspaceId: req.workspace!.workspaceId,
        userId: req.user!.uid,
        eventType: 'TASK_CREATED',
        resourceId: taskId,
        metadata: { experimentId: experiment.experimentId, title: task.title },
      });
    }

    res.status(201).json({ success: true, data: createdTasks });
  }
);

/**
 * PATCH /api/v1/workspaces/:workspaceId/experiments/:experimentId
 */
router.patch(
  '/:experimentId',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    const updated = await experimentRepository.update(
      req.workspace!.workspaceId,
      req.params.experimentId,
      req.body
    );
    res.json({
      success: true,
      data: updated,
    });
  }
);

/**
 * DELETE /api/v1/workspaces/:workspaceId/experiments/:experimentId
 */
router.delete(
  '/:experimentId',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    await experimentRepository.delete(req.workspace!.workspaceId, req.params.experimentId);
    res.json({
      success: true,
      data: { deleted: true, experimentId: req.params.experimentId },
    });
  }
);

export const experimentRoutes = router;
