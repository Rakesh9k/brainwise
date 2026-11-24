/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, type Request, type Response } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { requireWorkspaceMember, requireWorkspaceRole } from '../../middleware/workspace';
import { growthDirectorService } from '../../services/growthDirectorService';
import { growthContextEngine } from '../../services/growth/growthContextEngine';

const router = Router({ mergeParams: true });

router.use(authenticateToken);
router.use(requireWorkspaceMember);

// ----------------------------------------------------------------------------
// 1. Growth Missions
// ----------------------------------------------------------------------------

/**
 * POST /api/v1/workspaces/:workspaceId/growth-agency/missions
 * Creates a new Growth Mission
 */
router.post(
  '/missions',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const workspaceId = req.workspace!.workspaceId;
      const {
        title,
        strategicRationale,
        department = 'Marketing',
        targetAudience = 'Target ICP',
        timeHorizon = '30_DAYS',
        priority = 'HIGH',
        budgetCap = 0,
        strategyId,
        objectiveId,
        successCriteria,
      } = req.body;

      const mission = await growthDirectorService.createMission({
        workspaceId,
        title,
        strategicRationale,
        department,
        targetAudience,
        timeHorizon,
        priority,
        budgetCap,
        ownerId: req.user!.uid,
        approvalRequired: true,
        strategyId,
        objectiveId,
        successCriteria,
      });

      res.status(201).json({ success: true, data: mission });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: { code: 'MISSION_CREATION_FAILED', message: err.message },
      });
    }
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/growth-agency/missions
 * Lists all Growth Missions for the workspace
 */
router.get('/missions', async (req: Request, res: Response): Promise<void> => {
  try {
    const workspaceId = req.workspace!.workspaceId;
    const missions = await growthDirectorService.listMissions(workspaceId);
    res.json({ success: true, data: missions });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'MISSION_FETCH_FAILED', message: err.message },
    });
  }
});

/**
 * PATCH /api/v1/workspaces/:workspaceId/growth-agency/missions/:missionId/status
 * Transitions mission lifecycle status with validation
 */
router.patch(
  '/missions/:missionId/status',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const workspaceId = req.workspace!.workspaceId;
      const missionId = req.params.missionId;
      const { targetStatus, notes } = req.body;

      const updated = await growthDirectorService.transitionMissionStatus({
        workspaceId,
        missionId,
        targetStatus,
        actorId: req.user!.uid,
        notes,
      });

      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: { code: 'MISSION_TRANSITION_FAILED', message: err.message },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/growth-agency/missions/:missionId/outcome
 * Records verified mission outcome, feeding into strategic memory
 */
router.post(
  '/missions/:missionId/outcome',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const workspaceId = req.workspace!.workspaceId;
      const missionId = req.params.missionId;
      const { metricsAchieved = {}, summaryNotes, strategicLearnings } = req.body;

      const verified = await growthDirectorService.recordMissionOutcome({
        workspaceId,
        missionId,
        actorId: req.user!.uid,
        metricsAchieved,
        summaryNotes: summaryNotes || 'Mission verified by founder',
        strategicLearnings,
      });

      res.json({ success: true, data: verified });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: { code: 'MISSION_OUTCOME_FAILED', message: err.message },
      });
    }
  }
);

// ----------------------------------------------------------------------------
// 2. Growth Strategy & Scenarios
// ----------------------------------------------------------------------------

/**
 * POST /api/v1/workspaces/:workspaceId/growth-agency/strategy/formulate
 */
router.post(
  '/strategy/formulate',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const workspaceId = req.workspace!.workspaceId;
      const context = await growthContextEngine.assembleContext(workspaceId);
      const strategy = await growthDirectorService.formulateStrategy({
        context,
        executionApproach: req.body.executionApproach,
        customObjective: req.body.customObjective,
      });
      res.status(201).json({ success: true, data: strategy });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'STRATEGY_FORMULATION_FAILED', message: err.message },
      });
    }
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/growth-agency/strategy/active
 */
router.get('/strategy/active', async (req: Request, res: Response): Promise<void> => {
  try {
    const workspaceId = req.workspace!.workspaceId;
    const strategy = await growthDirectorService.getActiveStrategy(workspaceId);
    res.json({ success: true, data: strategy });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'STRATEGY_FETCH_FAILED', message: err.message },
    });
  }
});

/**
 * GET /api/v1/workspaces/:workspaceId/growth-agency/strategy/scenarios
 */
router.get('/strategy/scenarios', async (req: Request, res: Response): Promise<void> => {
  try {
    const workspaceId = req.workspace!.workspaceId;
    const context = await growthContextEngine.assembleContext(workspaceId);
    const scenarios = growthDirectorService.compareScenarios(context);
    res.json({ success: true, data: scenarios });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'SCENARIO_COMPARISON_FAILED', message: err.message },
    });
  }
});

// ----------------------------------------------------------------------------
// 3. Specialized Department Capabilities
// ----------------------------------------------------------------------------

router.get('/departments/overview', async (req: Request, res: Response): Promise<void> => {
  try {
    const workspaceId = req.workspace!.workspaceId;
    const context = await growthContextEngine.assembleContext(workspaceId);

    const campaign = growthDirectorService.generateMarketingCampaign(context);
    const contentPillars = growthDirectorService.compareScenarios(context);
    const outreach = growthDirectorService.generateOutreachSequence(context);
    const croAudit = growthDirectorService.auditConversionFunnel(context);
    const retention = growthDirectorService.generateRetentionInitiatives(context);
    const partnerships = growthDirectorService.generatePartnershipProposals(context);
    const financials = growthDirectorService.computeGrowthFinancialModel(context);
    const playbook = growthDirectorService.getModelPlaybook(
      growthDirectorService.resolveModelType(context.businessModel || context.businessName)
    );

    res.json({
      success: true,
      data: {
        campaign,
        contentPillars,
        outreach,
        croAudit,
        retention,
        partnerships,
        financials,
        playbook,
      },
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'DEPARTMENT_OVERVIEW_FAILED', message: err.message },
    });
  }
});

// ----------------------------------------------------------------------------
// 4. Execution Queue & Human Approval Gate
// ----------------------------------------------------------------------------

/**
 * POST /api/v1/workspaces/:workspaceId/growth-agency/execution/jobs
 */
router.post(
  '/execution/jobs',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const workspaceId = req.workspace!.workspaceId;
      const { actionType, level = 3, payload = {}, missionId, taskId, idempotencyKey } = req.body;

      const job = await growthDirectorService.enqueueExecutionJob({
        workspaceId,
        actionType,
        level,
        payload,
        idempotencyKey,
        missionId,
        taskId,
      });

      res.status(201).json({ success: true, data: job });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: { code: 'JOB_ENQUEUE_FAILED', message: err.message },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/growth-agency/execution/jobs/:jobId/approve
 */
router.post(
  '/execution/jobs/:jobId/approve',
  requireWorkspaceRole(['owner', 'admin']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const workspaceId = req.workspace!.workspaceId;
      const jobId = req.params.jobId;

      const approved = await growthDirectorService.approveExecutionJob({
        workspaceId,
        jobId,
        approvedBy: req.user!.uid,
      });

      res.json({ success: true, data: approved });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: { code: 'JOB_APPROVAL_FAILED', message: err.message },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/growth-agency/execution/jobs/:jobId/process
 */
router.post(
  '/execution/jobs/:jobId/process',
  requireWorkspaceRole(['owner', 'admin']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const workspaceId = req.workspace!.workspaceId;
      const jobId = req.params.jobId;

      const processed = await growthDirectorService.processExecutionJob(workspaceId, jobId);
      res.json({ success: true, data: processed });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: { code: 'JOB_PROCESSING_FAILED', message: err.message },
      });
    }
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/growth-agency/execution/jobs
 */
router.get('/execution/jobs', async (req: Request, res: Response): Promise<void> => {
  try {
    const workspaceId = req.workspace!.workspaceId;
    const jobs = await growthDirectorService.listExecutionJobs(workspaceId);
    res.json({ success: true, data: jobs });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'JOBS_FETCH_FAILED', message: err.message },
    });
  }
});

// ----------------------------------------------------------------------------
// 5. What-If Simulator
// ----------------------------------------------------------------------------

/**
 * POST /api/v1/workspaces/:workspaceId/growth-agency/simulator/simulate
 */
router.post(
  '/simulator/simulate',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const workspaceId = req.workspace!.workspaceId;
      const {
        name = 'Custom Scenario',
        description = 'What-if growth simulation',
        hypothesis = 'Scaling primary marketing channel',
        monthlyMarketingBudget = 10000,
        targetPrice = 499,
        expectedConversionRate = 3.5,
        targetCac = 250,
        primaryChannel = 'Outbound Contrast Wedge',
        grossMarginPercent = 70,
      } = req.body;

      const scenario = await growthDirectorService.simulateScenario({
        workspaceId,
        name,
        description,
        hypothesis,
        monthlyMarketingBudget: Number(monthlyMarketingBudget),
        targetPrice: Number(targetPrice),
        expectedConversionRate: Number(expectedConversionRate),
        targetCac: Number(targetCac),
        primaryChannel,
        grossMarginPercent: Number(grossMarginPercent),
      });

      res.status(201).json({ success: true, data: scenario });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'SIMULATION_FAILED', message: err.message },
      });
    }
  }
);

/**
 * POST /api/v1/workspaces/:workspaceId/growth-agency/simulator/scenarios/:scenarioId/convert
 */
router.post(
  '/simulator/scenarios/:scenarioId/convert',
  requireWorkspaceRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const workspaceId = req.workspace!.workspaceId;
      const scenarioId = req.params.scenarioId;

      const result = await growthDirectorService.convertScenarioToMission({
        workspaceId,
        scenarioId,
        ownerId: req.user!.uid,
      });

      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: { code: 'SCENARIO_CONVERSION_FAILED', message: err.message },
      });
    }
  }
);

/**
 * GET /api/v1/workspaces/:workspaceId/growth-agency/simulator/scenarios
 */
router.get('/simulator/scenarios', async (req: Request, res: Response): Promise<void> => {
  try {
    const workspaceId = req.workspace!.workspaceId;
    const scenarios = await growthDirectorService.listScenarios(workspaceId);
    res.json({ success: true, data: scenarios });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'SCENARIOS_FETCH_FAILED', message: err.message },
    });
  }
});

export const growthAgencyRoutes = router;
