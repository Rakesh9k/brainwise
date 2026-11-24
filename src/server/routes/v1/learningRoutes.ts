/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, type Request, type Response } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { requireWorkspaceMember } from '../../middleware/workspace';
import { performanceIngestionService } from '../../services/performanceIngestionService';
import { businessMetricRepository } from '../../repositories/businessMetricRepository';
import { campaignPerformanceRepository } from '../../repositories/campaignPerformanceRepository';
import { learningEngineService } from '../../services/learningEngineService';
import { proactiveIntelligenceService } from '../../services/proactiveIntelligenceService';
import { proactiveInsightRepository } from '../../repositories/proactiveInsightRepository';
import { recommendationLifecycleService } from '../../services/recommendationLifecycleService';
import { scheduledIntelligenceService } from '../../services/scheduledIntelligenceService';
import { scheduledReportRepository } from '../../repositories/scheduledReportRepository';
import type { WorkspaceRole, BusinessMetricType, MetricAttributionModel } from '../../types/api';

export const learningRoutes = Router({ mergeParams: true });

learningRoutes.use(authenticateToken);
learningRoutes.use(requireWorkspaceMember);

/**
 * POST /api/v1/workspaces/:workspaceId/learning/metrics
 * Ingests a granular business metric with attribution validation and deduplication
 */
learningRoutes.post('/metrics', async (req: Request, res: Response): Promise<void> => {
  try {
    const workspaceId = req.workspace!.workspaceId;
    const {
      source,
      metricType,
      metricName,
      value,
      currency,
      definition,
      channel,
      campaignId,
      attributionModel,
      isAttributed,
      sampleSize,
      measurementPeriod,
      timestamp,
      idempotencyKey,
      confidence,
    } = req.body;

    if (!source || !metricType || !metricName || value === undefined || !measurementPeriod) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'source, metricType, metricName, value, and measurementPeriod are required.',
          retryable: false,
        },
      });
      return;
    }

    const { metric, isDuplicate } = await performanceIngestionService.ingestMetricEvent({
      workspaceId,
      source,
      metricType: metricType as BusinessMetricType,
      metricName,
      value: Number(value),
      currency,
      definition: definition || metricName,
      channel,
      campaignId,
      attributionModel: attributionModel as MetricAttributionModel,
      isAttributed,
      sampleSize,
      measurementPeriod,
      timestamp,
      idempotencyKey,
      confidence,
    });

    res.status(isDuplicate ? 200 : 201).json({
      success: true,
      data: metric,
      meta: { isDuplicate },
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: {
        code: 'METRIC_INGESTION_FAILED',
        message: err.message || 'Failed to ingest metric',
        retryable: false,
      },
    });
  }
});

/**
 * GET /api/v1/workspaces/:workspaceId/learning/metrics
 */
learningRoutes.get('/metrics', async (req: Request, res: Response): Promise<void> => {
  try {
    const workspaceId = req.workspace!.workspaceId;
    const { metricType, channel, startDate, endDate } = req.query as Record<
      string,
      string | undefined
    >;

    const metrics = await businessMetricRepository.listByWorkspace(workspaceId, {
      metricType,
      channel,
      startDate,
      endDate,
    });

    res.json({
      success: true,
      data: metrics,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'METRICS_FETCH_FAILED', message: err.message, retryable: true },
    });
  }
});

/**
 * POST /api/v1/workspaces/:workspaceId/learning/campaigns
 * Ingests a completed campaign or marketing experiment
 */
learningRoutes.post('/campaigns', async (req: Request, res: Response): Promise<void> => {
  try {
    const workspaceId = req.workspace!.workspaceId;
    const {
      campaignName,
      objective,
      hypothesis,
      targetAudience,
      strategy,
      channel,
      contentReference,
      budget,
      cost,
      currency,
      startDate,
      endDate,
      executionDate,
      successCriteria,
      baselineMetrics,
      dataSources,
      idempotencyKey,
      results: rawResults,
      targetConversions,
      connectedGoalId,
    } = req.body;

    if (!campaignName || !objective || !channel || cost === undefined) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'campaignName, objective, channel, and cost are required.',
          retryable: false,
        },
      });
      return;
    }

    if (idempotencyKey) {
      const existing = await campaignPerformanceRepository.findByIdempotencyKey(
        workspaceId,
        idempotencyKey
      );
      if (existing) {
        res.status(200).json({
          success: true,
          data: existing,
          meta: { isDuplicate: true },
        });
        return;
      }
    }

    const mergedResults = {
      views: rawResults?.views ?? req.body.views ?? req.body.impressions ?? 0,
      clicks: rawResults?.clicks ?? req.body.clicks ?? 0,
      leads: rawResults?.leads ?? req.body.leads ?? 0,
      conversions: rawResults?.conversions ?? req.body.conversions ?? 0,
      revenue: rawResults?.revenue ?? req.body.revenue ?? 0,
    };

    const experiment = await performanceIngestionService.ingestCampaignExperiment({
      workspaceId,
      campaignName,
      objective,
      hypothesis: hypothesis || objective,
      targetAudience: targetAudience || 'Target Audience',
      strategy,
      channel,
      contentReference,
      budget: Number(budget) || Number(cost),
      cost: Number(cost),
      currency,
      startDate,
      endDate,
      executionDate,
      successCriteria,
      baselineMetrics,
      dataSources,
      idempotencyKey,
      results: mergedResults,
      targetConversions: targetConversions ? Number(targetConversions) : undefined,
      connectedGoalId,
    });

    res.status(201).json({
      success: true,
      data: experiment,
      meta: { isDuplicate: false },
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'CAMPAIGN_INGESTION_FAILED', message: err.message, retryable: false },
    });
  }
});

/**
 * GET /api/v1/workspaces/:workspaceId/learning/campaigns
 */
learningRoutes.get('/campaigns', async (req: Request, res: Response): Promise<void> => {
  try {
    const workspaceId = req.workspace!.workspaceId;
    const { channel, outcome } = req.query as Record<string, string | undefined>;
    const experiments = await campaignPerformanceRepository.listByWorkspace(workspaceId, {
      channel,
      outcome,
    });
    res.json({ success: true, data: experiments });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'CAMPAIGN_LIST_FAILED', message: err.message, retryable: true },
    });
  }
});

/**
 * POST /api/v1/workspaces/:workspaceId/learning/analyze-patterns
 * Alias: POST /api/v1/workspaces/:workspaceId/learning/patterns/synthesize
 * Runs the learning engine to synthesize patterns
 */
learningRoutes.post(
  ['/analyze-patterns', '/patterns/synthesize'],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const workspaceId = req.workspace!.workspaceId;
      const patterns = await learningEngineService.analyzePatterns(workspaceId);
      res.json({ success: true, data: patterns });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'PATTERN_ANALYSIS_FAILED', message: err.message, retryable: true },
      });
    }
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/learning/patterns
 */
learningRoutes.get('/patterns', async (req: Request, res: Response): Promise<void> => {
  try {
    const workspaceId = req.workspace!.workspaceId;
    const category = req.query.category as any;
    const patterns = await learningEngineService.listPatterns(workspaceId, category);
    res.json({ success: true, data: patterns });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'PATTERNS_FETCH_FAILED', message: err.message, retryable: true },
    });
  }
});

/**
 * GET /api/v1/workspaces/:workspaceId/learning/insights
 */
learningRoutes.get('/insights', async (req: Request, res: Response): Promise<void> => {
  try {
    const workspaceId = req.workspace!.workspaceId;
    const { category, status, isPermanentRule } = req.query as Record<string, string | undefined>;
    const insights = await learningEngineService.listInsights(workspaceId, {
      category: category as any,
      status: status as any,
      isPermanentRule: isPermanentRule !== undefined ? isPermanentRule === 'true' : undefined,
    });
    res.json({ success: true, data: insights });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'INSIGHTS_FETCH_FAILED', message: err.message, retryable: true },
    });
  }
});

/**
 * GET /api/v1/workspaces/:workspaceId/learning/insights/:insightId
 */
learningRoutes.get('/insights/:insightId', async (req: Request, res: Response): Promise<void> => {
  try {
    const workspaceId = req.workspace!.workspaceId;
    const insightId = req.params.insightId;
    const insight = await learningEngineService.getInsight(workspaceId, insightId);
    if (!insight) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Insight not found', retryable: false },
      });
      return;
    }
    res.json({ success: true, data: insight });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'INSIGHT_FETCH_FAILED', message: err.message, retryable: true },
    });
  }
});

/**
 * PATCH /api/v1/workspaces/:workspaceId/learning/insights/:insightId/correct
 */
learningRoutes.patch(
  '/insights/:insightId/correct',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const workspaceId = req.workspace!.workspaceId;
      const insightId = req.params.insightId;
      const actorId = req.user?.uid || 'user';
      const { note, newInsightText, newActionableRecommendation } = req.body;

      if (!note) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Correction note is required.',
            retryable: false,
          },
        });
        return;
      }

      const updated = await learningEngineService.correctInsight(workspaceId, insightId, {
        correctedBy: actorId,
        note,
        newInsightText,
        newActionableRecommendation,
      });

      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'INSIGHT_CORRECTION_FAILED', message: err.message, retryable: false },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/learning/insights/:insightId/dismiss
 */
learningRoutes.post(
  '/insights/:insightId/dismiss',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const workspaceId = req.workspace!.workspaceId;
      const insightId = req.params.insightId;
      const actorId = req.user?.uid || 'user';
      const { reason = 'Dismissed by user' } = req.body;

      const updated = await learningEngineService.dismissInsight(workspaceId, insightId, {
        dismissedBy: actorId,
        reason,
      });

      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'INSIGHT_DISMISSAL_FAILED', message: err.message, retryable: false },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/learning/insights/:insightId/promote-rule
 * Human approval gate to promote an insight to a permanent business rule
 */
learningRoutes.post(
  '/insights/:insightId/promote-rule',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const workspaceId = req.workspace!.workspaceId;
      const insightId = req.params.insightId;
      const actorId = req.user?.uid || 'user';

      const updated = await learningEngineService.promoteToPermanentRule(
        workspaceId,
        insightId,
        actorId
      );
      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: { code: 'RULE_PROMOTION_FAILED', message: err.message, retryable: false },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/learning/insights/decay
 */
learningRoutes.post('/insights/decay', async (req: Request, res: Response): Promise<void> => {
  try {
    const workspaceId = req.workspace!.workspaceId;
    const refDate = req.body.referenceDate ? new Date(req.body.referenceDate) : new Date();
    const decayed = await learningEngineService.applyConfidenceDecay(workspaceId, refDate);
    res.json({ success: true, data: decayed });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'DECAY_EVALUATION_FAILED', message: err.message, retryable: true },
    });
  }
});

/**
 * POST /api/v1/workspaces/:workspaceId/learning/strategy/recommend
 * Alias: POST /api/v1/workspaces/:workspaceId/learning/strategy/generate
 * Generates strategy with comparative evidence (with vs without learning)
 */
learningRoutes.post(
  ['/strategy/recommend', '/strategy/generate'],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const workspaceId = req.workspace!.workspaceId;
      const { objective, targetAudience, product, budget } = req.body;

      if (!objective) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'objective is required', retryable: false },
        });
        return;
      }

      const recommendation = await learningEngineService.generateStrategyRecommendation(
        workspaceId,
        {
          objective,
          targetAudience,
          product,
          budget: budget ? Number(budget) : undefined,
        }
      );

      res.json({ success: true, data: recommendation });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'STRATEGY_GENERATION_FAILED', message: err.message, retryable: false },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/learning/proactive/evaluate
 * Triggers proactive intelligence evaluation
 */
learningRoutes.post('/proactive/evaluate', async (req: Request, res: Response): Promise<void> => {
  try {
    const workspaceId = req.workspace!.workspaceId;
    const insights = await proactiveIntelligenceService.evaluateTriggers(workspaceId);
    res.json({ success: true, data: insights });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'PROACTIVE_EVALUATION_FAILED', message: err.message, retryable: true },
    });
  }
});

/**
 * GET /api/v1/workspaces/:workspaceId/learning/proactive/insights
 */
learningRoutes.get('/proactive/insights', async (req: Request, res: Response): Promise<void> => {
  try {
    const workspaceId = req.workspace!.workspaceId;
    const { status, triggerType } = req.query as Record<string, string | undefined>;
    const insights = await proactiveInsightRepository.listByWorkspace(workspaceId, {
      status,
      triggerType,
    });
    res.json({ success: true, data: insights });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'INSIGHTS_FETCH_FAILED', message: err.message, retryable: true },
    });
  }
});

/**
 * POST /api/v1/workspaces/:workspaceId/learning/proactive/insights/:insightId/action
 * Alias: POST /api/v1/workspaces/:workspaceId/learning/recommendations/act
 * Handles one of 7 recommendation lifecycle actions
 */
learningRoutes.post(
  ['/proactive/insights/:insightId/action', '/recommendations/act'],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const workspaceId = req.workspace!.workspaceId;
      const insightId = (req.params.insightId || req.body.insightId) as string;
      const userRole = (req.body.userRole || req.membership?.role || 'member') as WorkspaceRole;
      const actorId = req.user?.uid || 'system';

      const {
        action,
        userFeedback,
        rejectionReason,
        reason,
        deferredUntil,
        assignedTo,
        editedFields,
      } = req.body;

      if (!insightId || !action) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message:
              'insightId and action are required (ACCEPT, REJECT, EDIT, DEFER, ASSIGN, EXECUTE, MARK_COMPLETE).',
            retryable: false,
          },
        });
        return;
      }

      const updated = await recommendationLifecycleService.handleAction({
        workspaceId,
        insightId,
        userRole,
        payload: {
          action,
          actorId,
          userFeedback,
          rejectionReason: rejectionReason || reason,
          deferredUntil,
          assignedTo,
          editedFields,
        },
      });

      res.json({ success: true, data: updated });
    } catch (err: any) {
      const status = err.statusCode || 500;
      res.status(status).json({
        success: false,
        error: {
          code: status === 403 ? 'AUTHORIZATION_ERROR' : 'ACTION_FAILED',
          message: err.message || 'Failed to process recommendation action',
          retryable: false,
        },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/learning/scheduled/generate
 * Alias: POST /api/v1/workspaces/:workspaceId/learning/reports/generate
 */
learningRoutes.post(
  ['/scheduled/generate', '/reports/generate'],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const workspaceId = req.workspace!.workspaceId;
      const { frequency = 'WEEKLY', reportType, channel = 'IN_APP' } = req.body;

      const report = await scheduledIntelligenceService.generateReport({
        workspaceId,
        frequency,
        reportType,
        channel,
      });

      res.status(201).json({ success: true, data: report });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'SCHEDULED_REPORT_FAILED', message: err.message, retryable: true },
      });
    }
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/learning/scheduled/reports
 */
learningRoutes.get('/scheduled/reports', async (req: Request, res: Response): Promise<void> => {
  try {
    const workspaceId = req.workspace!.workspaceId;
    const { frequency, reportType } = req.query as Record<string, string | undefined>;
    const reports = await scheduledReportRepository.listByWorkspace(workspaceId, {
      frequency,
      reportType,
    });
    res.json({ success: true, data: reports });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'REPORTS_FETCH_FAILED', message: err.message, retryable: true },
    });
  }
});
