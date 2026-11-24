/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, type Request, type Response } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { requireWorkspaceMember, requireWorkspaceRole } from '../../middleware/workspace';
import { metricRegistry } from '../../services/analytics/metricRegistry';
import { metricCalculator } from '../../services/analytics/metricCalculator';
import { dataHealthService } from '../../services/analytics/dataHealthService';
import { marketingAttributionEngine } from '../../services/analytics/marketingAttributionEngine';
import { customerCohortEngine } from '../../services/analytics/customerCohortEngine';
import { predictiveAnalyticsEngine } from '../../services/analytics/predictiveAnalyticsEngine';
import { rootCauseAnalysisEngine } from '../../services/analytics/rootCauseAnalysisEngine';
import { decisionIntelligenceEngine } from '../../services/analytics/decisionIntelligenceEngine';
import { aiPerformanceAssistant } from '../../services/analytics/aiPerformanceAssistant';
import { dataIngestionService } from '../../integrations/dataIngestionService';
import { taskRepository } from '../../repositories/taskRepository';
import { goalRepository } from '../../repositories/goalRepository';
import { experimentRepository } from '../../repositories/experimentRepository';
import { businessProfileRepository } from '../../repositories/businessProfileRepository';

const router = Router({ mergeParams: true });

router.use(authenticateToken);
router.use(requireWorkspaceMember);

/**
 * GET /api/v1/workspaces/:workspaceId/analytics/overview
 * Canonical overview of business performance metrics grounded in deterministic calculations
 */
router.get('/overview', async (req: Request, res: Response): Promise<void> => {
  try {
    const workspaceId = req.workspace!.workspaceId;
    const profile = await businessProfileRepository.getProfile(workspaceId);

    const tasks = await taskRepository.listByWorkspace(workspaceId);
    const goals = await goalRepository.listByWorkspace(workspaceId);
    const experiments = await experimentRepository.listByWorkspace(workspaceId);

    const period = {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date().toISOString(),
    };

    // Deterministic operational metrics from real workspace entities
    const completedTasks = tasks.filter((t) => t.status === 'completed').length;
    const taskCompletionMetric = metricCalculator.calculateMetric({
      metricId: 'OPS_TASK_COMPLETION',
      directNumerator: completedTasks,
      directDenominator: Math.max(1, tasks.length),
      reportingPeriod: period,
    });

    const activeGoals = goals.length;
    const achievedGoals = goals.filter((g) => g.currentValue >= g.targetValue).length;
    const goalCompletionMetric = metricCalculator.calculateMetric({
      metricId: 'GOAL_COMPLETION_RATE',
      directNumerator: achievedGoals,
      directDenominator: Math.max(1, activeGoals),
      reportingPeriod: period,
    });

    // Query real imported financial records for revenue metric
    const importedRecords = await dataIngestionService.getWorkspaceRecords(workspaceId);
    const financialRecords = importedRecords.filter(
      (r) => r.category === 'revenue' || r.category === 'payment' || r.category === 'orders'
    );

    let revenueMetric: any;
    if (financialRecords.length > 0) {
      const calculationRecords = financialRecords.map((r) => ({
        recordId: r.recordId,
        amount: (r.metrics?.revenue as number) || (r.metrics?.amount as number) || 0,
        currency: (r.dimensions?.currency as string) || 'USD',
        timestamp: r.sourceTimestamp || new Date().toISOString(),
        source: r.sourceReference || r.provider,
      }));
      revenueMetric = metricCalculator.calculateMetric({
        metricId: 'REV_NET',
        records: calculationRecords,
        currency: 'USD',
        reportingPeriod: period,
      });
    } else {
      revenueMetric = metricCalculator.calculateMetric({
        metricId: 'REV_NET',
        directValue: null,
        currency: 'USD',
        reportingPeriod: period,
        assumptions: ['No live payment gateway or store telemetry connected.'],
      });
    }

    // Query real traffic / conversion records for conversion rate
    const analyticsRecords = importedRecords.filter(
      (r) => r.category === 'traffic' || r.category === 'analytics' || r.category === 'conversions'
    );

    let cvrMetric: any;
    if (analyticsRecords.length > 0) {
      let totalConversions = 0;
      let totalSessions = 0;
      for (const r of analyticsRecords) {
        totalConversions += (r.metrics?.conversions as number) || 0;
        totalSessions += (r.metrics?.sessions as number) || (r.metrics?.visitors as number) || 0;
      }
      cvrMetric = metricCalculator.calculateMetric({
        metricId: 'MKT_CVR',
        directNumerator: totalConversions,
        directDenominator: Math.max(1, totalSessions),
        reportingPeriod: period,
      });
    } else {
      cvrMetric = metricCalculator.calculateMetric({
        metricId: 'MKT_CVR',
        directNumerator: null,
        directDenominator: null,
        reportingPeriod: period,
        assumptions: ['No web analytics connector active in workspace.'],
      });
    }

    const healthOverview = await dataHealthService.getWorkspaceDataHealthOverview(workspaceId);

    res.json({
      success: true,
      data: {
        workspaceId,
        businessName: profile?.businessName || req.workspace?.workspaceName || 'My Business',
        reportingPeriod: period,
        metrics: [taskCompletionMetric, goalCompletionMetric, revenueMetric, cvrMetric],
        dataHealth: healthOverview,
        activeExperimentsCount: experiments.filter((e) => e.status === 'completed').length,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'ANALYTICS_OVERVIEW_FAILED', message: err.message } });
  }
});

/**
 * GET /api/v1/workspaces/:workspaceId/analytics/metrics/:metricId
 * Detailed drill-down on single metric definition, formula, contributing records, and exclusions
 */
router.get('/metrics/:metricId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { metricId } = req.params;
    const def = metricRegistry.get(metricId);
    if (!def) {
      res.status(404).json({ success: false, error: { code: 'METRIC_NOT_FOUND', message: `Metric ${metricId} not in registry` } });
      return;
    }

    const period = {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date().toISOString(),
    };

    const importedRecords = await dataIngestionService.getWorkspaceRecords(req.workspace!.workspaceId);
    let calculated: any;

    if (metricId === 'REV_NET') {
      const fin = importedRecords.filter((r) => r.category === 'revenue' || r.category === 'payment');
      if (fin.length > 0) {
        calculated = metricCalculator.calculateMetric({
          metricId,
          records: fin.map((r) => ({
            recordId: r.recordId,
            amount: (r.metrics?.revenue as number) || (r.metrics?.amount as number) || 0,
            currency: (r.dimensions?.currency as string) || 'USD',
            timestamp: r.sourceTimestamp || new Date().toISOString(),
            source: r.sourceReference || r.provider,
          })),
          currency: 'USD',
          reportingPeriod: period,
        });
      } else {
        calculated = metricCalculator.calculateMetric({
          metricId,
          directValue: null,
          currency: 'USD',
          reportingPeriod: period,
          assumptions: ['No live payment gateway connected.'],
        });
      }
    } else if (metricId === 'MKT_CVR') {
      const traffic = importedRecords.filter((r) => r.category === 'traffic' || r.category === 'analytics');
      if (traffic.length > 0) {
        let conversions = 0;
        let sessions = 0;
        for (const r of traffic) {
          conversions += (r.metrics?.conversions as number) || 0;
          sessions += (r.metrics?.sessions as number) || 0;
        }
        calculated = metricCalculator.calculateMetric({
          metricId,
          directNumerator: conversions,
          directDenominator: Math.max(1, sessions),
          reportingPeriod: period,
        });
      } else {
        calculated = metricCalculator.calculateMetric({
          metricId,
          directNumerator: null,
          directDenominator: null,
          reportingPeriod: period,
          assumptions: ['No web analytics connector active.'],
        });
      }
    } else {
      calculated = metricCalculator.calculateMetric({
        metricId,
        directValue: null,
        reportingPeriod: period,
        assumptions: ['No active connector or records for metric.'],
      });
    }

    res.json({
      success: true,
      data: {
        definition: def,
        calculation: calculated,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'METRIC_DRILLDOWN_FAILED', message: err.message } });
  }
});

/**
 * GET /api/v1/workspaces/:workspaceId/analytics/data-health
 * Complete connector sync states and audit metrics
 */
router.get('/data-health', async (req: Request, res: Response): Promise<void> => {
  try {
    const workspaceId = req.workspace!.workspaceId;
    const overview = await dataHealthService.getWorkspaceDataHealthOverview(workspaceId);
    res.json({ success: true, data: overview });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'DATA_HEALTH_FAILED', message: err.message } });
  }
});

/**
 * GET /api/v1/workspaces/:workspaceId/analytics/attribution
 * Multi-touch marketing attribution
 */
router.get('/attribution', async (req: Request, res: Response): Promise<void> => {
  try {
    const workspaceId = req.workspace!.workspaceId;
    const model = (req.query.model as any) || 'POSITION_BASED_U_SHAPED';

    const importedRecords = await dataIngestionService.getWorkspaceRecords(workspaceId);
    const attributionRecords = importedRecords.filter(
      (r) => r.category === 'attribution' || r.category === 'traffic'
    );

    let journeys: any[] = [];
    const channelSpend: Record<string, number> = {};

    if (attributionRecords.length > 0) {
      journeys = attributionRecords.map((r, idx) => ({
        conversionId: r.sourceReference || `conv_${idx}`,
        customerId: (r.dimensions?.customerId as string) || `cust_${idx}`,
        conversionTimestamp: r.sourceTimestamp || new Date().toISOString(),
        revenueAmount: (r.metrics?.revenue as number) || 0,
        currency: (r.dimensions?.currency as string) || 'USD',
        touchpoints: (r.rawPayload?.touchpoints as any[]) || [
          {
            touchpointId: `tp_${idx}`,
            customerId: (r.dimensions?.customerId as string) || `cust_${idx}`,
            channel: (r.dimensions?.channel as string) || 'Organic Search',
            timestamp: r.sourceTimestamp || new Date().toISOString(),
          },
        ],
      }));
    }

    const result = marketingAttributionEngine.evaluateAttribution({
      journeys,
      model,
      channelSpend,
    });

    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'ATTRIBUTION_FAILED', message: err.message } });
  }
});

/**
 * GET /api/v1/workspaces/:workspaceId/analytics/cohorts
 * Customer lifecycle distribution and retention matrix
 */
router.get('/cohorts', async (req: Request, res: Response): Promise<void> => {
  try {
    const workspaceId = req.workspace!.workspaceId;
    const period = {
      startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date().toISOString(),
    };

    const importedRecords = await dataIngestionService.getWorkspaceRecords(workspaceId);
    const transactions = importedRecords
      .filter((r) => r.category === 'payment' || r.category === 'orders' || r.category === 'revenue')
      .map((r, idx) => ({
        customerId: (r.dimensions?.customerId as string) || `cust_${idx}`,
        orderId: r.sourceReference || `ord_${idx}`,
        amount: (r.metrics?.amount as number) || (r.metrics?.revenue as number) || 0,
        timestamp: r.sourceTimestamp || new Date().toISOString(),
      }));

    const cohorts = customerCohortEngine.analyzeCohorts({
      workspaceId,
      transactions,
      reportingPeriod: period,
    });

    res.json({ success: true, data: cohorts });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'COHORTS_FAILED', message: err.message } });
  }
});

/**
 * GET /api/v1/workspaces/:workspaceId/analytics/forecast
 * 3-scenario forecasting based on real historical series
 */
router.get('/forecast', async (req: Request, res: Response): Promise<void> => {
  try {
    const workspaceId = req.workspace!.workspaceId;
    const importedRecords = await dataIngestionService.getWorkspaceRecords(workspaceId);

    // Group revenue by period (YYYY-MM)
    const periodTotals = new Map<string, number>();
    for (const r of importedRecords) {
      if (r.category === 'revenue' || r.category === 'payment') {
        const periodKey = r.sourceTimestamp ? r.sourceTimestamp.substring(0, 7) : 'Unknown';
        const val = (r.metrics?.revenue as number) || (r.metrics?.amount as number) || 0;
        periodTotals.set(periodKey, (periodTotals.get(periodKey) || 0) + val);
      }
    }

    const historical = Array.from(periodTotals.entries())
      .filter(([k]) => k !== 'Unknown')
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([period, value]) => ({ period, value }));

    const forecast = predictiveAnalyticsEngine.generateForecast({
      workspaceId,
      metricId: 'REV_NET',
      historicalSeries: historical,
      horizonPeriodsCount: 3,
    });

    res.json({ success: true, data: forecast });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'FORECAST_FAILED', message: err.message } });
  }
});

/**
 * GET /api/v1/workspaces/:workspaceId/analytics/root-cause
 * Mathematical KPI variance decomposition
 */
router.get('/root-cause', async (req: Request, res: Response): Promise<void> => {
  try {
    const workspaceId = req.workspace!.workspaceId;
    const importedRecords = await dataIngestionService.getWorkspaceRecords(workspaceId);

    const now = Date.now();
    const midPoint = now - 30 * 86400000;
    const priorPoint = now - 60 * 86400000;

    let baseRev = 0;
    let baseOrders = 0;
    let currRev = 0;
    let currOrders = 0;

    for (const r of importedRecords) {
      if (r.category === 'revenue' || r.category === 'payment') {
        const t = new Date(r.sourceTimestamp || '').getTime();
        const amt = (r.metrics?.revenue as number) || (r.metrics?.amount as number) || 0;
        if (t >= priorPoint && t < midPoint) {
          baseRev += amt;
          baseOrders++;
        } else if (t >= midPoint && t <= now) {
          currRev += amt;
          currOrders++;
        }
      }
    }

    const baseline = { label: 'Prior 30 Days', revenue: baseRev, ordersOrCustomers: baseOrders, refunds: 0 };
    const current = { label: 'Last 30 Days', revenue: currRev, ordersOrCustomers: currOrders, refunds: 0 };

    const rca = rootCauseAnalysisEngine.decomposeRevenueDelta({
      workspaceId,
      baseline,
      current,
    });

    res.json({ success: true, data: rca });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'ROOT_CAUSE_FAILED', message: err.message } });
  }
});

/**
 * POST /api/v1/workspaces/:workspaceId/analytics/ask-assistant
 * Grounded natural-language performance assistant
 */
router.post('/ask-assistant', async (req: Request, res: Response): Promise<void> => {
  try {
    const { question } = req.body;
    if (!question) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Question parameter is required.' } });
      return;
    }

    const workspaceId = req.workspace!.workspaceId;
    const profile = await businessProfileRepository.getProfile(workspaceId);
    const businessName = profile?.businessName || req.workspace?.workspaceName || 'My Business';

    const period = {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date().toISOString(),
    };

    const importedRecords = await dataIngestionService.getWorkspaceRecords(workspaceId);
    const fin = importedRecords.filter((r) => r.category === 'revenue' || r.category === 'payment');

    const rev = metricCalculator.calculateMetric({
      metricId: 'REV_NET',
      directValue: fin.length > 0 ? fin.reduce((acc, r) => acc + ((r.metrics?.revenue as number) || 0), 0) : null,
      currency: 'USD',
      reportingPeriod: period,
      assumptions: fin.length === 0 ? ['No live revenue data available'] : [],
    });

    const tasks = await taskRepository.listByWorkspace(workspaceId);
    const completedTasks = tasks.filter((t) => t.status === 'completed').length;
    const taskMetric = metricCalculator.calculateMetric({
      metricId: 'OPS_TASK_COMPLETION',
      directNumerator: completedTasks,
      directDenominator: Math.max(1, tasks.length),
      reportingPeriod: period,
    });

    const answer = aiPerformanceAssistant.answerQuestion({
      question,
      verifiedMetrics: [rev, taskMetric],
      businessName,
    });

    res.json({ success: true, data: answer });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'ASSISTANT_FAILED', message: err.message } });
  }
});

/**
 * GET /api/v1/workspaces/:workspaceId/analytics/decisions
 * Lists strategic decisions
 */
router.get('/decisions', async (req: Request, res: Response): Promise<void> => {
  try {
    const workspaceId = req.workspace!.workspaceId;
    const decisions = await decisionIntelligenceEngine.listDecisions(workspaceId);
    res.json({ success: true, data: decisions });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'DECISIONS_FETCH_FAILED', message: err.message } });
  }
});

/**
 * POST /api/v1/workspaces/:workspaceId/analytics/decisions
 * Registers a new strategic decision
 */
router.post(
  '/decisions',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const workspaceId = req.workspace!.workspaceId;
      const {
        problemStatement,
        hypothesis,
        recommendedAction,
        supportingMetricIds,
        expectedImpact,
        priority,
        baselineMetricValue,
        targetMetricValue,
        reviewDate,
      } = req.body;

      const decision = await decisionIntelligenceEngine.createDecision({
        workspaceId,
        problemStatement,
        hypothesis,
        recommendedAction,
        supportingMetricIds: supportingMetricIds || ['REV_NET'],
        expectedImpact,
        priority,
        baselineMetricValue: baselineMetricValue !== undefined ? baselineMetricValue : 0,
        targetMetricValue: targetMetricValue !== undefined ? targetMetricValue : 0,
        reviewDate: reviewDate || new Date(Date.now() + 30 * 86400000).toISOString(),
      });

      res.status(201).json({ success: true, data: decision });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'DECISION_CREATE_FAILED', message: err.message } });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/analytics/decisions/:decisionId/evaluate
 * Evaluates decision outcome
 */
router.post(
  '/decisions/:decisionId/evaluate',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const workspaceId = req.workspace!.workspaceId;
      const { decisionId } = req.params;
      const { actualMetricValue, postMortemNotes } = req.body;

      const evaluated = await decisionIntelligenceEngine.evaluateOutcome({
        workspaceId,
        decisionId,
        actualMetricValue: actualMetricValue !== undefined ? actualMetricValue : 0,
        postMortemNotes,
      });

      res.json({ success: true, data: evaluated });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'DECISION_EVAL_FAILED', message: err.message } });
    }
  }
);

export const analyticsRoutes = router;
