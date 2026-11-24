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
import { departmentEventBus } from '../../events/eventBus';
import { ideaIntelligenceService } from '../../services/ideaIntelligenceService';
import { marketIntelligenceService } from '../../services/marketIntelligenceService';
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

    const result = await ideaIntelligenceService.orchestrateResearch({
      workspaceId: req.workspace!.workspaceId,
      userId: req.user!.uid,
      ideaSummary: ideaSummary || 'Market Research',
      industry: industry || req.workspace!.industry,
      targetMarket: targetMarket || 'Commercial segment',
      geography: geography || req.workspace!.country,
      depth,
      idempotencyKey: req.headers['x-idempotency-key'] as string,
    });

    res.status(201).json({
      success: true,
      data: result.report,
      meta: {
        creditsDeducted: result.creditsDeducted,
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

// =============================================================================
// PHASE 3: IDEA INTELLIGENCE & MARKET INTELLIGENCE (DEPARTMENTS 1 & 2)
// =============================================================================

/**
 * POST /api/v1/workspaces/:workspaceId/research/understand-idea
 * Natural-language idea extraction: extracts concept, industry, geography, customer segments
 */
router.post(
  '/understand-idea',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { ideaPrompt } = req.body;
      if (!ideaPrompt || !ideaPrompt.trim()) {
        res.status(400).json({
          success: false,
          error: { code: 'MISSING_PROMPT', message: 'ideaPrompt is required.' },
        });
        return;
      }
      const understanding = await ideaIntelligenceService.understandIdea(ideaPrompt);
      res.json({
        success: true,
        data: understanding,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'IDEA_UNDERSTANDING_FAILED', message: err.message },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/research/orchestrate
 * Autonomous 8-agent research orchestration producing complete 15-section dossier
 */
router.post(
  '/orchestrate',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { ideaSummary, industry, targetMarket, geography, depth, budgetConstraint } = req.body;
      if (!ideaSummary || !ideaSummary.trim()) {
        res.status(400).json({
          success: false,
          error: { code: 'MISSING_IDEA_SUMMARY', message: 'ideaSummary is required.' },
        });
        return;
      }
      const result = await ideaIntelligenceService.orchestrateResearch({
        workspaceId: req.workspace!.workspaceId,
        userId: req.user!.uid,
        ideaSummary,
        industry,
        targetMarket,
        geography,
        depth,
        budgetConstraint,
        idempotencyKey: req.headers['x-idempotency-key'] as string,
      });
      res.status(201).json({
        success: true,
        data: result.report,
        meta: {
          creditsDeducted: result.creditsDeducted,
          truthScore: result.truthScore,
          modelUsed: result.modelUsed,
        },
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'ORCHESTRATION_FAILED', message: err.message },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/research/:reportId/conversation
 * Interactive follow-up conversational research with budget feasibility recalculation
 */
router.post(
  '/:reportId/conversation',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { query, context } = req.body;
      if (!query || !query.trim()) {
        res.status(400).json({
          success: false,
          error: { code: 'MISSING_QUERY', message: 'query is required.' },
        });
        return;
      }
      const response = await ideaIntelligenceService.conductConversationalResearch({
        workspaceId: req.workspace!.workspaceId,
        reportId: req.params.reportId,
        query,
        previousContext: context,
      });
      res.json({
        success: true,
        data: response,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'CONVERSATION_FAILED', message: err.message },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/research/:reportId/finalize
 * Finalize business direction, calculate 90-day roadmap, and gate Business Brain graduation
 */
router.post(
  '/:reportId/finalize',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { selectedOpportunityId, customizedDirection } = req.body;
      const blueprint = await ideaIntelligenceService.finalizeIdea({
        workspaceId: req.workspace!.workspaceId,
        reportId: req.params.reportId,
        selectedOpportunityId,
        customizedDirection,
        approvedBy: req.user!.uid,
      });
      res.json({
        success: true,
        data: blueprint,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'FINALIZATION_FAILED', message: err.message },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/research/validate-idea
 * Synthesizes a full idea validation dossier with transparent 7-score opportunity matrix
 */
router.post(
  '/validate-idea',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { ideaSummary, targetIndustry, targetGeography, targetAudience } = req.body;

      if (!ideaSummary) {
        res.status(400).json({
          success: false,
          error: { code: 'MISSING_IDEA_SUMMARY', message: 'ideaSummary is required.' },
        });
        return;
      }

      const dossier = await ideaIntelligenceService.validateIdea({
        workspaceId: req.workspace!.workspaceId,
        ideaSummary,
        targetIndustry,
        targetGeography,
        targetAudience,
        userId: req.user!.uid,
      });

      await departmentEventBus.emit({
        workspaceId: req.workspace!.workspaceId,
        userId: req.user!.uid,
        eventType: 'IDEA_VALIDATION_COMPLETED',
        resourceId: dossier.validationId,
        metadata: {
          verdict: dossier.executiveVerdict,
          overallScore: dossier.scores.overallOpportunityScore,
        },
      });

      res.status(201).json({
        success: true,
        data: dossier,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'IDEA_VALIDATION_FAILED', message: err.message },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/research/market-sizing
 * Computes top-down and bottom-up TAM/SAM/SOM market sizing breakdowns
 */
router.post(
  '/market-sizing',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { industry, geography, targetSegment, averageAnnualContractValue, currency } = req.body;

      if (!industry || !geography || !targetSegment) {
        res.status(400).json({
          success: false,
          error: { code: 'MISSING_SIZING_PARAMS', message: 'industry, geography, and targetSegment are required.' },
        });
        return;
      }

      const sizing = marketIntelligenceService.generateMarketSizing({
        workspaceId: req.workspace!.workspaceId,
        industry,
        geography,
        targetSegment,
        averageAnnualContractValue,
        currency,
      });

      res.json({
        success: true,
        data: sizing,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'MARKET_SIZING_FAILED', message: err.message },
      });
    }
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/research/market-intelligence
 * Retrieves complete market intelligence dossier including trends, demand signals, and territory analysis
 */
router.get(
  '/market-intelligence',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { industry, geography, targetSegment } = req.query;

      const dossier = await marketIntelligenceService.getMarketIntelligenceDossier({
        workspaceId: req.workspace!.workspaceId,
        industry: industry ? String(industry) : req.workspace!.industry || 'B2B Software',
        geography: geography ? String(geography) : req.workspace!.country || 'India',
        targetSegment: targetSegment ? String(targetSegment) : 'SME Business Owners',
      });

      res.json({
        success: true,
        data: dossier,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'MARKET_INTELLIGENCE_FAILED', message: err.message },
      });
    }
  }
);

export const researchRoutes = router;
