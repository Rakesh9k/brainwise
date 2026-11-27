/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, type Request, type Response } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { requireWorkspaceMember, requireWorkspaceRole } from '../../middleware/workspace';
import { businessAnalysisService } from '../../services/businessAnalysisService';
import { businessDiagnosisEngine } from '../../services/businessDiagnosisEngine';
import { customerIntelligenceEngine } from '../../services/customerIntelligenceEngine';
import { opportunityScoringService } from '../../services/opportunityScoringService';
import { strategicReasoningService } from '../../services/strategicReasoningService';
import { scenarioPlanningService } from '../../services/scenarioPlanningService';
import { financialIntelligenceService } from '../../services/financialIntelligenceService';
import { goalRepository } from '../../repositories/goalRepository';
import { decisionRepository } from '../../repositories/decisionRepository';

const router = Router({ mergeParams: true });

router.use(authenticateToken);
router.use(requireWorkspaceMember);

/**
 * GET /api/v1/workspaces/:workspaceId/reasoning/health
 * Evaluates business health across 8 dimensions
 */
router.get('/health', async (req: Request, res: Response): Promise<void> => {
  try {
    const report = await businessAnalysisService.assessBusinessHealth(req.workspace!.workspaceId);
    res.json({ success: true, data: report });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: {
        code: 'HEALTH_ASSESSMENT_FAILED',
        message: err instanceof Error ? err.message : 'Error',
      },
    });
  }
});

/**
 * GET /api/v1/workspaces/:workspaceId/reasoning/comprehensive-diagnosis
 * Evaluates comprehensive 10-dimensional business health & primary constraint
 */
router.get('/comprehensive-diagnosis', async (req: Request, res: Response): Promise<void> => {
  try {
    const diagnosis = await businessDiagnosisEngine.diagnoseBusiness(req.workspace!.workspaceId);
    res.json({ success: true, data: diagnosis });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: {
        code: 'DIAGNOSIS_FAILED',
        message: err instanceof Error ? err.message : 'Error diagnosing business',
      },
    });
  }
});

/**
 * GET /api/v1/workspaces/:workspaceId/reasoning/primary-constraint
 * Theory of Constraints binding bottleneck & remediation sprints
 */
router.get('/primary-constraint', async (req: Request, res: Response): Promise<void> => {
  try {
    const diagnosis = await businessDiagnosisEngine.diagnoseBusiness(req.workspace!.workspaceId);
    res.json({ success: true, data: diagnosis.primaryConstraint });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: {
        code: 'PRIMARY_CONSTRAINT_FAILED',
        message: err instanceof Error ? err.message : 'Error identifying constraint',
      },
    });
  }
});

/**
 * GET /api/v1/workspaces/:workspaceId/reasoning/what-not-to-do
 * Guardrails preventing premature spend, video waste, and margin erosion
 */
router.get('/what-not-to-do', async (req: Request, res: Response): Promise<void> => {
  try {
    const diagnosis = await businessDiagnosisEngine.diagnoseBusiness(req.workspace!.workspaceId);
    res.json({ success: true, data: diagnosis.whatNotToDoDirectives });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: {
        code: 'WHAT_NOT_TO_DO_FAILED',
        message: err instanceof Error ? err.message : 'Error retrieving directives',
      },
    });
  }
});

/**
 * GET /api/v1/workspaces/:workspaceId/reasoning/swot
 * Generates evidence-backed SWOT analysis
 */
router.get('/swot', async (req: Request, res: Response): Promise<void> => {
  try {
    const swot = await businessAnalysisService.generateSwotAnalysis(req.workspace!.workspaceId);
    res.json({ success: true, data: swot });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: { code: 'SWOT_FAILED', message: err instanceof Error ? err.message : 'Error' },
    });
  }
});

/**
 * GET /api/v1/workspaces/:workspaceId/reasoning/gaps
 * Identifies business gaps between goals and operational capabilities
 */
router.get('/gaps', async (req: Request, res: Response): Promise<void> => {
  try {
    const gaps = await businessAnalysisService.analyzeBusinessGaps(req.workspace!.workspaceId);
    res.json({ success: true, data: gaps });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: { code: 'GAP_ANALYSIS_FAILED', message: err instanceof Error ? err.message : 'Error' },
    });
  }
});

/**
 * POST /api/v1/workspaces/:workspaceId/reasoning/root-cause
 * Investigates root causes for suboptimal performance
 */
router.post('/root-cause', async (req: Request, res: Response): Promise<void> => {
  const { issueDescription, observedMetric } = req.body;
  if (!issueDescription) {
    res.status(400).json({
      success: false,
      error: { code: 'MISSING_ISSUE', message: 'issueDescription is required' },
    });
    return;
  }

  try {
    const analysis = await businessAnalysisService.investigateRootCause({
      workspaceId: req.workspace!.workspaceId,
      issueDescription,
      observedMetric,
    });
    res.json({ success: true, data: analysis });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: { code: 'ROOT_CAUSE_FAILED', message: err instanceof Error ? err.message : 'Error' },
    });
  }
});

/**
 * GET /api/v1/workspaces/:workspaceId/reasoning/strategies
 * Generates or lists actionable strategic recommendations
 */
router.get('/strategies', async (req: Request, res: Response): Promise<void> => {
  const { department, goalId } = req.query;
  try {
    const strategies = await strategicReasoningService.generateStrategies({
      workspaceId: req.workspace!.workspaceId,
      targetDepartment: typeof department === 'string' ? department : undefined,
      goalId: typeof goalId === 'string' ? goalId : undefined,
    });
    res.json({ success: true, data: strategies });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: {
        code: 'STRATEGY_GENERATION_FAILED',
        message: err instanceof Error ? err.message : 'Error',
      },
    });
  }
});

/**
 * POST /api/v1/workspaces/:workspaceId/reasoning/strategies/generate
 */
router.post('/strategies/generate', async (req: Request, res: Response): Promise<void> => {
  const { targetDepartment, goalId } = req.body;
  try {
    const strategies = await strategicReasoningService.generateStrategies({
      workspaceId: req.workspace!.workspaceId,
      targetDepartment,
      goalId,
    });
    res.json({ success: true, data: strategies });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: {
        code: 'STRATEGY_GENERATION_FAILED',
        message: err instanceof Error ? err.message : 'Error',
      },
    });
  }
});

/**
 * POST /api/v1/workspaces/:workspaceId/reasoning/strategies/:strategyId/decision
 * Handles founder decision (accept, reject, defer)
 */
router.post(
  '/strategies/:strategyId/decision',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    const { decision, userFeedback, alternativesConsidered } = req.body;
    if (!['accepted', 'rejected', 'deferred'].includes(decision)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_DECISION',
          message: 'decision must be accepted, rejected, or deferred',
        },
      });
      return;
    }

    try {
      const result = await strategicReasoningService.handleRecommendationDecision({
        workspaceId: req.workspace!.workspaceId,
        strategyId: req.params.strategyId,
        decision,
        userId: req.user!.uid,
        userFeedback,
        alternativesConsidered,
      });
      res.json({ success: true, data: result });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: { code: 'DECISION_FAILED', message: err instanceof Error ? err.message : 'Error' },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/reasoning/opportunities/rank
 * Scores opportunities using 5-factor transparent model
 */
router.post('/opportunities/rank', async (req: Request, res: Response): Promise<void> => {
  const { opportunities, weights } = req.body;
  if (!Array.isArray(opportunities)) {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_OPPORTUNITIES', message: 'opportunities array is required' },
    });
    return;
  }

  try {
    const ranked = opportunityScoringService.rankOpportunities(opportunities, weights);
    res.json({ success: true, data: ranked });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: { code: 'RANKING_FAILED', message: err instanceof Error ? err.message : 'Error' },
    });
  }
});

/**
 * POST /api/v1/workspaces/:workspaceId/reasoning/scenarios/simulate
 * Simulates decision variations across Best-Case, Expected-Case, and Downside
 */
router.post('/scenarios/simulate', async (req: Request, res: Response): Promise<void> => {
  const { scenarioType, parameters } = req.body;
  if (!scenarioType) {
    res.status(400).json({
      success: false,
      error: { code: 'MISSING_SCENARIO_TYPE', message: 'scenarioType is required' },
    });
    return;
  }

  try {
    const simulation = await scenarioPlanningService.simulateScenario({
      workspaceId: req.workspace!.workspaceId,
      scenarioType,
      parameters,
    });
    res.json({ success: true, data: simulation });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: { code: 'SIMULATION_FAILED', message: err instanceof Error ? err.message : 'Error' },
    });
  }
});

// =============================================================================
// PHASE 5: FINANCIAL INTELLIGENCE & STRATEGY SIMULATOR (DEPARTMENT 4)
// =============================================================================

/**
 * POST /api/v1/workspaces/:workspaceId/reasoning/financial/simulate-decisions
 * Compares two business decisions (e.g. ₹499 vs ₹799) with real-time recalculation
 */
router.post(
  '/financial/simulate-decisions',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { decisionA, decisionB, currency } = req.body;

      if (!decisionA || !decisionB) {
        res.status(400).json({
          success: false,
          error: { code: 'MISSING_DECISIONS', message: 'decisionA and decisionB are required.' },
        });
        return;
      }

      const comparison = await financialIntelligenceService.compareDecisions({
        workspaceId: req.workspace!.workspaceId,
        decisionA,
        decisionB,
        currency,
      });

      res.json({
        success: true,
        data: comparison,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'FINANCIAL_SIMULATION_FAILED', message: err.message },
      });
    }
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/reasoning/financial/startup-costs
 * Computes CapEx, OpEx, and working capital runway requirements
 */
router.get('/financial/startup-costs', async (req: Request, res: Response): Promise<void> => {
  try {
    const currency = (req.query.currency as string) || req.workspace!.currency || 'INR';
    const estimate = await financialIntelligenceService.calculateStartupCosts({
      workspaceId: req.workspace!.workspaceId,
      currency,
    });

    res.json({
      success: true,
      data: estimate,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'STARTUP_COSTS_FAILED', message: err.message },
    });
  }
});

/**
 * POST /api/v1/workspaces/:workspaceId/reasoning/financial/export-csv
 * Generates RFC-compliant CSV formatted financial model
 */
router.post(
  '/financial/export-csv',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { simulation } = req.body;
      if (!simulation) {
        res.status(400).json({
          success: false,
          error: { code: 'MISSING_SIMULATION', message: 'simulation object is required.' },
        });
        return;
      }

      const csv = financialIntelligenceService.exportFinancialModelCsv(simulation);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="financial_model_${req.workspace!.workspaceId}.csv"`
      );
      res.send(csv);
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'CSV_EXPORT_FAILED', message: err.message },
      });
    }
  }
);

/**
 * GOAL MANAGEMENT
 */

router.get('/goals', async (req: Request, res: Response): Promise<void> => {
  const { status, department, parentGoalId } = req.query;
  const goals = await goalRepository.listGoals(req.workspace!.workspaceId, {
    status: status as any,
    department: typeof department === 'string' ? department : undefined,
    parentGoalId: typeof parentGoalId === 'string' ? parentGoalId : undefined,
  });
  res.json({ success: true, data: goals });
});

router.post(
  '/goals',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    const goalId =
      req.body.goalId || `goal_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const goal = await goalRepository.createGoal({
      ...req.body,
      goalId,
      workspaceId: req.workspace!.workspaceId,
      ownerUserId: req.user!.uid,
    });
    res.status(201).json({ success: true, data: goal });
  }
);

router.get('/goals/:goalId', async (req: Request, res: Response): Promise<void> => {
  const goal = await goalRepository.getGoal(req.workspace!.workspaceId, req.params.goalId);
  if (!goal) {
    res
      .status(404)
      .json({ success: false, error: { code: 'GOAL_NOT_FOUND', message: 'Goal not found' } });
    return;
  }
  res.json({ success: true, data: goal });
});

router.patch(
  '/goals/:goalId',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const updated = await goalRepository.updateGoal(
        req.workspace!.workspaceId,
        req.params.goalId,
        req.body
      );
      res.json({ success: true, data: updated });
    } catch (err) {
      res.status(404).json({
        success: false,
        error: {
          code: 'GOAL_UPDATE_FAILED',
          message: err instanceof Error ? err.message : 'Error',
        },
      });
    }
  }
);

router.delete(
  '/goals/:goalId',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    await goalRepository.deleteGoal(req.workspace!.workspaceId, req.params.goalId);
    res.json({ success: true, data: { deleted: true, goalId: req.params.goalId } });
  }
);

/**
 * DECISION HISTORY
 */

router.get('/decisions', async (req: Request, res: Response): Promise<void> => {
  const { department, approvalStatus, relatedStrategyId } = req.query;
  const decisions = await decisionRepository.listDecisions(req.workspace!.workspaceId, {
    department: typeof department === 'string' ? department : undefined,
    approvalStatus: approvalStatus as any,
    relatedStrategyId: typeof relatedStrategyId === 'string' ? relatedStrategyId : undefined,
  });
  res.json({ success: true, data: decisions });
});

router.post(
  '/decisions',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    const decisionId =
      req.body.decisionId || `dec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const decision = await decisionRepository.recordDecision({
      ...req.body,
      decisionId,
      workspaceId: req.workspace!.workspaceId,
      decisionDate: req.body.decisionDate || new Date().toISOString(),
      userApproval: req.body.userApproval || {
        status: 'approved',
        approvedBy: req.user!.displayName || req.user!.email,
        timestamp: new Date().toISOString(),
      },
    });
    res.status(201).json({ success: true, data: decision });
  }
);

router.patch(
  '/decisions/:decisionId',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const updated = await decisionRepository.updateDecision(
        req.workspace!.workspaceId,
        req.params.decisionId,
        req.body
      );
      res.json({ success: true, data: updated });
    } catch (err) {
      res.status(404).json({
        success: false,
        error: {
          code: 'DECISION_UPDATE_FAILED',
          message: err instanceof Error ? err.message : 'Error',
        },
      });
    }
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/reasoning/customer-intelligence
 * Comprehensive customer intelligence snapshot (Personas, Objections, Triggers, Churn)
 */
router.get('/customer-intelligence', async (req: Request, res: Response): Promise<void> => {
  try {
    const report = await customerIntelligenceEngine.getComprehensiveCustomerIntelligence(
      req.workspace!.workspaceId
    );
    res.json({ success: true, data: report });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: {
        code: 'CUSTOMER_INTELLIGENCE_FAILED',
        message: err instanceof Error ? err.message : 'Error retrieving customer intelligence',
      },
    });
  }
});

/**
 * POST /api/v1/workspaces/:workspaceId/reasoning/customer-personas/generate
 * Synthesize or enrich Ideal Customer Profile (ICP) personas
 */
router.post(
  '/customer-personas/generate',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const personas = await customerIntelligenceEngine.generateOrEnrichPersonas(
        req.workspace!.workspaceId,
        {
          targetSegment: req.body.targetSegment,
          forceRegenerate: req.body.forceRegenerate,
        }
      );
      res.json({ success: true, data: personas });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: {
          code: 'PERSONA_GENERATION_FAILED',
          message: err instanceof Error ? err.message : 'Error generating customer personas',
        },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/reasoning/objection-playbook
 * Clusters raw feedback and synthesizes brand-aligned objection handling playbooks
 */
router.post('/objection-playbook', async (req: Request, res: Response): Promise<void> => {
  try {
    const clusters = await customerIntelligenceEngine.clusterAndSynthesizeObjections(
      req.workspace!.workspaceId,
      req.body.feedback
    );
    res.json({ success: true, data: clusters });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: {
        code: 'OBJECTION_CLUSTERING_FAILED',
        message: err instanceof Error ? err.message : 'Error synthesizing objections',
      },
    });
  }
});

/**
 * POST /api/v1/workspaces/:workspaceId/reasoning/churn-risk
 * Predicts customer churn risk with RFM transaction telemetry and friction signals
 */
router.post('/churn-risk', async (req: Request, res: Response): Promise<void> => {
  try {
    const assessment = customerIntelligenceEngine.predictChurnRisk({
      workspaceId: req.workspace!.workspaceId,
      transactions: req.body.transactions,
      unresolvedComplaints: req.body.unresolvedComplaints,
      referenceDate: req.body.referenceDate,
    });
    res.json({ success: true, data: assessment });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: {
        code: 'CHURN_PREDICTION_FAILED',
        message: err instanceof Error ? err.message : 'Error predicting churn',
      },
    });
  }
});

export const businessReasoningRoutes = router;
