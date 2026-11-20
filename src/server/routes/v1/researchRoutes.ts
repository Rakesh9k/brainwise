/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, type Request, type Response } from 'express';
import crypto from 'node:crypto';
import { authenticateToken } from '../../middleware/auth';
import { requireWorkspaceMember, requireWorkspaceRole } from '../../middleware/workspace';
import { researchRepository } from '../../repositories/researchRepository';
import { taskRepository } from '../../repositories/taskRepository';
import { experimentRepository } from '../../repositories/experimentRepository';
import { aiOrchestrationService } from '../../services/aiOrchestrationService';
import { departmentEventBus } from '../../events/eventBus';
import type { GrowthTaskEntity, GrowthExperimentEntity } from '../../types/api';

const router = Router({ mergeParams: true });

router.use(authenticateToken);
router.use(requireWorkspaceMember);

/**
 * GET /api/v1/workspaces/:workspaceId/research
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const reports = await researchRepository.listByWorkspace(req.workspace!.workspaceId);
  res.json({
    success: true,
    data: reports,
  });
});

/**
 * POST /api/v1/workspaces/:workspaceId/research
 * Generates an AI commercial TAM/SAM/SOM validation dossier
 * Credits: 8 credits
 */
router.post(
  '/',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    const { ideaSummary, industry, targetMarket, geography, depth } = req.body;

    const result = await aiOrchestrationService.generateDossier({
      workspaceId: req.workspace!.workspaceId,
      userId: req.user!.uid,
      ideaSummary: ideaSummary || 'Market Research',
      industry: industry || req.workspace!.industry,
      targetMarket: targetMarket || 'Commercial segment',
      geography: geography || req.workspace!.country,
      depth,
      idempotencyKey: req.headers['x-idempotency-key'] as string,
    });

    await departmentEventBus.emit({
      workspaceId: req.workspace!.workspaceId,
      userId: req.user!.uid,
      eventType: 'IDEA_VALIDATION_COMPLETED',
      resourceId: result.report.reportId,
      metadata: {
        title: result.report.title,
        tamValue: result.report.tamValue,
        truthScore: result.truthScore,
      },
    });

    res.status(201).json({
      success: true,
      data: result.report,
      meta: {
        creditsDeducted: result.creditsDeducted,
        creditBalanceRemaining: result.creditBalanceRemaining,
        truthScore: result.truthScore,
        modelUsed: result.modelUsed,
      },
    });
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/research/:reportId/convert-to-experiment
 * Converts a report's validation hypothesis into a live Growth Experiment
 */
router.post(
  '/:reportId/convert-to-experiment',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    const report = await researchRepository.findById(
      req.workspace!.workspaceId,
      req.params.reportId
    );
    if (!report) {
      res.status(404).json({
        success: false,
        error: { code: 'REPORT_NOT_FOUND', message: 'Report not found' },
      });
      return;
    }

    const { experimentTitle, hypothesis, budget } = req.body;
    const experimentId = `exp_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const now = new Date().toISOString();

    const experiment: GrowthExperimentEntity = {
      experimentId,
      workspaceId: req.workspace!.workspaceId,
      title: experimentTitle || `Validate ${report.title}`,
      hypothesis: hypothesis || `Market demand signal validation for ${report.title}`,
      department: 'Idea Intelligence',
      status: 'idea',
      budget: budget || '$200',
      startDate: now,
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      results: `Created from Idea Intelligence report ${report.reportId}.`,
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
      metadata: { reportId: report.reportId, title: experiment.title },
    });

    res.status(201).json({
      success: true,
      data: experiment,
    });
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/research/:reportId/convert-to-tasks
 * Enqueues validation experiments as actionable sprint tasks in Growth Planner
 */
router.post(
  '/:reportId/convert-to-tasks',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    const report = await researchRepository.findById(
      req.workspace!.workspaceId,
      req.params.reportId
    );
    if (!report) {
      res.status(404).json({
        success: false,
        error: { code: 'REPORT_NOT_FOUND', message: 'Report not found' },
      });
      return;
    }

    const tasksPayload: Array<{
      title: string;
      description?: string;
      priority?: 'high' | 'medium' | 'low';
    }> = req.body.tasks || [
      {
        title: `Validate: ${report.title} Core Assumption`,
        description: `Derived from report ${report.reportId}. TAM estimate: ${report.tamValue || 'N/A'}.`,
        priority: 'high',
      },
    ];

    const now = new Date().toISOString();
    const createdTasks: GrowthTaskEntity[] = [];

    for (const t of tasksPayload) {
      const taskId = `tsk_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      const task: GrowthTaskEntity = {
        taskId,
        workspaceId: req.workspace!.workspaceId,
        title: t.title,
        description: t.description || '',
        priority: t.priority || 'medium',
        status: 'pending',
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        notes: `Origin: Idea Intelligence Report ${report.reportId}`,
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
        metadata: { title: task.title, reportId: report.reportId },
      });
    }

    res.status(201).json({
      success: true,
      data: createdTasks,
    });
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/research/:reportId
 */
router.get('/:reportId', async (req: Request, res: Response): Promise<void> => {
  const report = await researchRepository.findById(req.workspace!.workspaceId, req.params.reportId);
  if (!report) {
    res.status(404).json({
      success: false,
      error: {
        code: 'REPORT_NOT_FOUND',
        message: `Research report '${req.params.reportId}' not found.`,
        category: 'NOT_FOUND',
        retryable: false,
      },
    });
    return;
  }

  res.json({
    success: true,
    data: report,
  });
});

/**
 * PATCH /api/v1/workspaces/:workspaceId/research/:reportId
 */
router.patch(
  '/:reportId',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    const updated = await researchRepository.update(
      req.workspace!.workspaceId,
      req.params.reportId,
      req.body
    );
    res.json({
      success: true,
      data: updated,
    });
  }
);

export const researchRoutes = router;
