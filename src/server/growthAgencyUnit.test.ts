/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { growthMissionEngine } from './services/growth/growthMissionEngine';
import { growthStrategyArchitect } from './services/growth/growthStrategyArchitect';
import { growthDepartmentEngines } from './services/growth/growthDepartmentEngines';
import { growthExecutionQueueService } from './services/growth/growthExecutionQueueService';
import { growthSimulatorEngine } from './services/growth/growthSimulatorEngine';
import { growthModelAdapterEngine } from './services/growth/growthModelAdapterEngine';
import { growthAnalyticsEngine } from './services/growth/growthAnalyticsEngine';
import type { AssembledGrowthContext, BusinessModelType } from './services/growth/growthTypes';

describe('BRAINWISE AI GROWTH AGENCY — MASTER UNIT & ENGINE SUITE', () => {
  const workspaceId = 'ws_agency_unit_test';

  const mockContext: AssembledGrowthContext = {
    workspaceId,
    businessName: 'CloudAudit AI',
    industry: 'B2B DevOps & Compliance SaaS',
    stage: 'Early Traction',
    targetAudience: 'CTOs and VP Engineering at 50-500 person fintechs',
    primaryGoal: 'Acquire 25 enterprise accounts in 90 days',
    founderCapacityHoursWeekly: 15,
    marketingBudgetMonthly: 12000,
    nearestCompetitor: 'LegacyAudit Corp',
    unitEconomics: {
      averageOrderValue: 850,
      customerAcquisitionCost: 250,
      customerLifetimeValue: 7650,
      grossMarginPercent: 82,
      currency: 'USD',
    },
    verifiedFacts: ['Zero long-term contract lock-in', '14-day automated audit setup'],
    avoidAngles: ['Generic AI buzzwords'],
  };

  // =========================================================================
  // 1. Growth Mission Engine Lifecycle & Transitions
  // =========================================================================
  describe('1. Growth Mission Engine: Lifecycle, State Machine & Verification', () => {
    let missionId: string;

    it('creates a mission in PROPOSED status with validated targets', async () => {
      const mission = await growthMissionEngine.createMission({
        workspaceId,
        title: 'Q2 Outbound B2B Acquisition Wedge',
        strategicRationale: 'Direct contrast outreach against LegacyAudit pricing opacity',
        department: 'Sales/Acquisition',
        targetAudience: 'Fintech Engineering VPs',
        timeHorizon: '30_DAYS',
        priority: 'HIGH',
        budgetCap: 1500,
        approvalRequired: true,
        successCriteria: [
          {
            metricName: 'Signed B2B Accounts',
            baselineValue: 0,
            targetValue: 25,
            unit: 'accounts',
          },
        ],
      });

      assert.ok(mission.missionId);
      missionId = mission.missionId;
      assert.equal(mission.workspaceId, workspaceId);
      assert.equal(mission.status, 'PROPOSED');
      assert.equal(mission.isApproved, false);
      assert.equal(mission.successCriteria[0]!.targetValue, 25);
    });

    it('progresses status sequentially through valid transitions', async () => {
      // PROPOSED -> APPROVED
      let updated = await growthMissionEngine.transitionMissionStatus({
        workspaceId,
        missionId,
        targetStatus: 'APPROVED',
        actorId: 'founder_lead',
        notes: 'Founder approved allocation and kill criteria',
      });
      assert.equal(updated.status, 'APPROVED');
      assert.equal(updated.isApproved, true);
      assert.equal(updated.approvedBy, 'founder_lead');

      // APPROVED -> PLANNED
      updated = await growthMissionEngine.transitionMissionStatus({
        workspaceId,
        missionId,
        targetStatus: 'PLANNED',
        actorId: 'system_growth_director',
        notes: 'Department task blueprints generated',
      });
      assert.equal(updated.status, 'PLANNED');

      // PLANNED -> READY
      updated = await growthMissionEngine.transitionMissionStatus({
        workspaceId,
        missionId,
        targetStatus: 'READY',
        actorId: 'system_growth_director',
        notes: 'Execution queue loaded and verified',
      });
      assert.equal(updated.status, 'READY');

      // READY -> IN_PROGRESS
      updated = await growthMissionEngine.transitionMissionStatus({
        workspaceId,
        missionId,
        targetStatus: 'IN_PROGRESS',
        actorId: 'system_growth_director',
        notes: 'Touches initiated',
      });
      assert.equal(updated.status, 'IN_PROGRESS');
    });

    it('rejects invalid lifecycle transition jumps (e.g. IN_PROGRESS -> PLANNED)', async () => {
      await assert.rejects(
        async () => {
          await growthMissionEngine.transitionMissionStatus({
            workspaceId,
            missionId,
            targetStatus: 'PLANNED',
            actorId: 'system',
            notes: 'Attempting invalid backward skip',
          });
        },
        /Invalid mission status transition from 'IN_PROGRESS' to 'PLANNED'/
      );
    });

    it('links tasks and experiments to the mission', async () => {
      await growthMissionEngine.linkTaskToMission(workspaceId, missionId, 'task_outbound_101');
      await growthMissionEngine.linkExperimentToMission(workspaceId, missionId, 'exp_offer_headline_a');

      const mission = await growthMissionEngine.getMissionById(workspaceId, missionId);
      assert.ok(mission);
      assert.ok(mission.taskIds.includes('task_outbound_101'));
      assert.ok(mission.experimentIds.includes('exp_offer_headline_a'));
    });

    it('records verified mission outcome and stores strategic memory', async () => {
      // IN_PROGRESS -> REVIEW
      await growthMissionEngine.transitionMissionStatus({
        workspaceId,
        missionId,
        targetStatus: 'REVIEW',
        actorId: 'founder_lead',
        notes: 'Execution touches completed',
      });

      // REVIEW -> COMPLETED
      await growthMissionEngine.transitionMissionStatus({
        workspaceId,
        missionId,
        targetStatus: 'COMPLETED',
        actorId: 'founder_lead',
        notes: 'Data gathered from Stripe and HubSpot',
      });

      // Record outcome
      const outcome = await growthMissionEngine.recordMissionOutcome({
        workspaceId,
        missionId,
        actorId: 'founder_lead',
        metricsAchieved: { 'Signed B2B Accounts': 28 },
        summaryNotes: 'Outbound response rate was 4.2%, well above target. Acquired 28 accounts.',
        strategicLearnings: ['Pricing contrast wedge on LinkedIn converts 2.1x faster than cold email'],
      });

      assert.equal(outcome.status, 'VERIFIED');
      assert.ok(outcome.actualOutcomes);
      assert.equal(outcome.actualOutcomes.metricsAchieved['Signed B2B Accounts'], 28);
    });
  });

  // =========================================================================
  // 2. Growth Strategy Architect & Scenario Comparison
  // =========================================================================
  describe('2. Growth Strategy Architect: Formulation & Scenario Comparison', () => {
    it('formulates strategy grounded in business brain adhering to strict video exclusion', async () => {
      const strategy = await growthStrategyArchitect.formulateStrategy({
        context: mockContext,
        executionApproach: 'OUTBOUND_LED',
      });

      assert.ok(strategy.strategyId);
      assert.equal(strategy.executionApproach, 'OUTBOUND_LED');
      assert.equal(strategy.status, 'ACTIVE');
      assert.ok(strategy.successMetrics.length >= 3);

      // Verify ZERO video exclusion in strategy text and channels
      const fullText = JSON.stringify(strategy).toLowerCase();
      assert.ok(!fullText.includes('video generation'), 'Zero-video exclusion check');
      assert.ok(!fullText.includes('ffmpeg'), 'Zero-video exclusion check');
      assert.ok(!fullText.includes('remotion'), 'Zero-video exclusion check');
      assert.ok(fullText.includes('zero-video'), 'Mandatory zero-video mention');
    });

    it('compares growth scenarios with realistic trade-offs and capital requirements', () => {
      const comparison = growthStrategyArchitect.compareScenarios(mockContext);

      assert.ok(comparison.organicLed);
      assert.ok(comparison.outboundLed);
      assert.ok(comparison.partnershipLed);

      assert.ok(
        comparison.outboundLed.timeToResultsWeeks < comparison.organicLed.timeToResultsWeeks,
        'Outbound has faster time to results than SEO/organic'
      );
      assert.ok(comparison.outboundLed.confidence > 0.8);
      assert.ok(comparison.organicLed.reachEstimate.length > 0);
    });
  });

  // =========================================================================
  // 3. 7 Growth Department Specialized Output Engines
  // =========================================================================
  describe('3. Specialized Department Engines (7 Core Functions)', () => {
    it('Marketing Engine generates zero-video copy and multi-frame carousel briefs', () => {
      const campaign = growthDepartmentEngines.generateMarketingCampaign(mockContext);

      assert.ok(campaign.campaignId);
      assert.ok(campaign.name);
      assert.equal(campaign.format, 'STATIC_CAROUSEL');
      assert.ok(campaign.creativeAssetBrief.keyPoints.length >= 2);
      assert.ok(!campaign.creativeAssetBrief.headline.toLowerCase().includes('video'));
      assert.ok(campaign.creativeAssetBrief.keyPoints.some((p) => p.includes('Zero video')));
    });

    it('Content Engine creates pillars and distribution schedules', () => {
      const pillars = growthDepartmentEngines.generateContentPillars(mockContext);

      assert.ok(pillars.length >= 3);
      assert.ok(pillars.some((p) => p.format.includes('carousel')));
    });

    it('Sales/Acquisition Engine creates 3-step outbound sequence with strict personalization', () => {
      const outreach = growthDepartmentEngines.generateOutreachSequence(mockContext);

      assert.equal(outreach.steps.length, 3);
      assert.ok(outreach.steps[0]!.subject.length > 0);
      assert.ok(outreach.steps[0]!.bodyText.includes('{{firstName}}'));
      assert.ok(outreach.steps[0]!.proofPoint.length > 0);
    });

    it('CRO Engine audits conversion funnels and identifies concrete friction points', () => {
      const croFindings = growthDepartmentEngines.auditConversionFunnel(mockContext);

      assert.ok(croFindings.length >= 2);
      assert.ok(croFindings.some((f) => f.pageArea === 'PRICING_CARDS'));
      assert.ok(croFindings.some((f) => f.pageArea === 'CHECKOUT_FORM'));
      assert.ok(croFindings[0]!.projectedConversionUpliftPercent > 0);
    });

    it('Retention Engine develops targeted churn mitigation playbooks', () => {
      const retention = growthDepartmentEngines.generateRetentionInitiatives(mockContext);

      assert.ok(retention.length >= 2);
      assert.ok(retention.some((r) => r.lifecycleStage === 'DAY_14_ACTIVE'));
      assert.ok(retention.some((r) => r.lifecycleStage === 'ONBOARDING'));
      assert.ok(retention[0]!.expectedChurnReductionPercent > 0);
    });

    it('Partnership Engine drafts co-marketing and integration proposals', () => {
      const partnerships = growthDepartmentEngines.generatePartnershipProposals(mockContext);

      assert.ok(partnerships.length >= 1);
      assert.equal(partnerships[0]!.revenueSharePercent, 20);
      assert.ok(partnerships[0]!.outreachPitch.length > 0);
    });

    it('Growth Economics Engine models LTV, CAC, Payback, and Runway impact', () => {
      const model = growthDepartmentEngines.computeGrowthFinancialModel(mockContext);

      assert.equal(model.averageOrderValue, 850);
      assert.equal(model.customerAcquisitionCost, 250);
      assert.equal(model.customerLifetimeValue, 7650);
      assert.ok(model.ltvCacRatio > 3.0, 'LTV:CAC ratio should be healthy (> 3.0)');
      assert.ok(model.paybackPeriodMonths > 0);
      assert.equal(model.capitalEfficiencyStatus, 'HEALTHY');
    });
  });

  // =========================================================================
  // 4. Execution Queue & Level 3 Human Approval Gate
  // =========================================================================
  describe('4. Execution Queue Service: Levels & Human Approval Gate', () => {
    it('executes Level 1 and Level 2 jobs autonomously with receipts', async () => {
      const job = await growthExecutionQueueService.enqueueJob({
        workspaceId,
        actionType: 'GENERATE_CAMPAIGN_ASSETS',
        level: 1, // Read-only / draft generation
        payload: {
          assetTypes: ['SVG Flyer', '3-slide Carousel Draft'],
        },
      });

      assert.equal(job.level, 1);
      assert.equal(job.status, 'QUEUED');
      assert.equal(job.requiresApproval, false);

      const processed = await growthExecutionQueueService.processJob(workspaceId, job.jobId);
      assert.equal(processed.status, 'COMPLETED');
      assert.ok(processed.executionReceipt);
      assert.ok(processed.executionReceipt.providerTransactionId);
      assert.equal(processed.executionReceipt.providerName, 'BrainWise Dispatch Engine');
    });

    it('blocks Level 3 jobs from autonomous execution until approved by founder', async () => {
      const job = await growthExecutionQueueService.enqueueJob({
        workspaceId,
        actionType: 'DISPATCH_OUTREACH_EMAIL',
        level: 3, // Outbound email dispatch
        payload: {
          recipientCount: 150,
          subject: 'BrainWise Partnership Introduction',
        },
      });

      assert.equal(job.level, 3);
      assert.equal(job.status, 'AWAITING_APPROVAL');
      assert.equal(job.requiresApproval, true);

      // Attempting to process without approval must reject/block
      await assert.rejects(
        async () => {
          await growthExecutionQueueService.processJob(workspaceId, job.jobId);
        },
        /Security gate blocked job execution/
      );

      // Explicit founder approval
      const approved = await growthExecutionQueueService.approveJob({
        workspaceId,
        jobId: job.jobId,
        approvedBy: 'founder_jane_doe',
      });
      assert.equal(approved.status, 'QUEUED');
      assert.equal(approved.approvalStatus, 'APPROVED');
      assert.equal(approved.approvedBy, 'founder_jane_doe');

      // Now process succeeds with real simulated provider receipt
      const executed = await growthExecutionQueueService.processJob(workspaceId, job.jobId);
      assert.equal(executed.status, 'COMPLETED');
      assert.ok(executed.executionReceipt);
      assert.equal(executed.executionReceipt.providerName, 'Resend');
    });

    it('allows founder to reject a Level 3 job with reason', async () => {
      const job = await growthExecutionQueueService.enqueueJob({
        workspaceId,
        actionType: 'SCHEDULE_SOCIAL_POST',
        level: 3,
        payload: { postText: 'New announcement' },
      });

      const rejected = await growthExecutionQueueService.rejectJob({
        workspaceId,
        jobId: job.jobId,
        rejectedBy: 'founder_jane_doe',
        reason: 'Target post copy needs brand voice revision',
      });

      assert.equal(rejected.status, 'CANCELLED');
      assert.equal(rejected.approvalStatus, 'REJECTED');
      assert.equal(rejected.rejectionReason, 'Target post copy needs brand voice revision');
    });
  });

  // =========================================================================
  // 5. What-If Growth Simulator & 1-Click Conversion
  // =========================================================================
  describe('5. What-If Growth Simulator: Projections & Mission Conversion', () => {
    let scenarioId: string;

    it('simulates Base, Best (+35%), and Downside (-35%) projections accurately', async () => {
      const sim = await growthSimulatorEngine.simulateScenario({
        workspaceId,
        name: 'Scale B2B Outbound SDR Cadence',
        description: 'Test dedicated outbound SDR cadences against fintech VP leads',
        hypothesis: 'Direct contrast outreach generates 25 accounts at $300 CAC',
        monthlyMarketingBudget: 7500,
        targetPrice: 850,
        expectedConversionRate: 3.5,
        targetCac: 300,
        primaryChannel: 'LinkedIn Direct Messaging',
        grossMarginPercent: 80,
      });

      assert.ok(sim.scenarioId);
      scenarioId = sim.scenarioId;

      // Base: 7500 / 300 = 25 customers
      assert.equal(sim.projections.baseCase.customersAcquired, 25);
      assert.equal(sim.projections.baseCase.monthlyRevenue, 25 * 850);
      assert.equal(sim.projections.baseCase.grossProfit, Math.round(25 * 850 * 0.8));

      // Best: 25 * 1.35 = 33 customers
      assert.equal(sim.projections.bestCase.customersAcquired, Math.floor(25 * 1.35));

      // Downside: 25 * 0.65 = 16 customers
      assert.equal(sim.projections.downsideCase.customersAcquired, Math.floor(25 * 0.65));
      assert.ok(sim.sensitivityFactor.length > 0);
    });

    it('converts a What-If scenario into an active, actionable Growth Mission with 1 click', async () => {
      const result = await growthSimulatorEngine.convertScenarioToMission({
        workspaceId,
        scenarioId,
        ownerId: 'founder_lead',
      });

      assert.ok(result.missionId);
      assert.equal(result.scenario.isConvertedToMission, true);
      assert.equal(result.scenario.convertedMissionId, result.missionId);

      const mission = await growthMissionEngine.getMissionById(workspaceId, result.missionId);
      assert.ok(mission);
      assert.equal(mission.status, 'PROPOSED');
      assert.equal(mission.department, 'Marketing');
      assert.equal(mission.budgetCap, 7500);
      assert.equal(mission.successCriteria[0]!.targetValue, 25);
    });
  });

  // =========================================================================
  // 6. Business Model Adapter Engine (Playbooks & Tailored Metrics)
  // =========================================================================
  describe('6. Business Model Adapter Engine: Playbooks & Tailored Metrics', () => {
    const models: BusinessModelType[] = [
      'SAAS',
      'D2C',
      'RESTAURANT_FOOD',
      'SALON_SERVICES',
      'MARKETPLACE',
      'PROFESSIONAL_SERVICES',
      'ECOMMERCE',
      'MANUFACTURING_B2B',
      'PRE_LAUNCH_STARTUP',
    ];

    it('provides specialized playbooks and prohibited strategies for each model', () => {
      for (const model of models) {
        const playbook = growthModelAdapterEngine.getPlaybook(model);
        assert.ok(playbook.primaryNorthStarMetric.length > 0);
        assert.ok(playbook.coreMetrics.length >= 2);
        assert.ok(playbook.recommendedAcquisitionChannels.length >= 2);
        assert.ok(playbook.prohibitedPractices.length >= 1);
        assert.ok(playbook.keyGrowthTactics.length >= 1);
      }

      // Pre-launch prohibits premature paid ad scaling
      const prelaunch = growthModelAdapterEngine.getPlaybook('PRE_LAUNCH_STARTUP');
      assert.ok(prelaunch.prohibitedPractices.some((s) => s.toLowerCase().includes('paid')));

      // Restaurant prioritizes weekday covers and local retention
      const restaurant = growthModelAdapterEngine.getPlaybook('RESTAURANT_FOOD');
      assert.ok(
        restaurant.coreMetrics.some((m) => m.name.toLowerCase().includes('covers') || m.name.toLowerCase().includes('order'))
      );
    });

    it('infers business model accurately from description keywords', () => {
      assert.equal(growthModelAdapterEngine.resolveModelType('Cloud CRM software for doctors'), 'SAAS');
      assert.equal(growthModelAdapterEngine.resolveModelType('Artisan organic dark chocolate bars'), 'D2C');
      assert.equal(growthModelAdapterEngine.resolveModelType('Downtown Italian trattoria and cafe'), 'RESTAURANT_FOOD');
      assert.equal(growthModelAdapterEngine.resolveModelType('Hair & wellness styling beauty boutique'), 'SALON_SERVICES');
      assert.equal(growthModelAdapterEngine.resolveModelType('Two-sided freelance marketplace platform'), 'MARKETPLACE');
      assert.equal(growthModelAdapterEngine.resolveModelType('Legal advisory and consulting firm'), 'PROFESSIONAL_SERVICES');
    });
  });

  // =========================================================================
  // 7. Growth Analytics & Telemetry Anomaly Detection
  // =========================================================================
  describe('7. Growth Analytics Engine: Health Scoring & Anomaly Detection', () => {
    it('detects conversion drops and CAC spikes and issues operational alerts', () => {
      const evaluation = growthAnalyticsEngine.evaluateGrowthMetrics({
        workspaceId,
        previousMetrics: {
          monthlyVisitors: 5000,
          blendedCac: 150,
          conversionRatePercent: 4.0,
        },
        currentMetrics: {
          monthlyVisitors: 3200, // > 20% drop (36% drop)
          blendedCac: 240,       // > 25% spike (60% spike)
          conversionRatePercent: 2.1,
        },
      });

      assert.ok(evaluation.alerts.length >= 2);
      const trafficAlert = evaluation.alerts.find((a) => a.metricName === 'Monthly Visitors');
      const cacAlert = evaluation.alerts.find((a) => a.metricName === 'Blended CAC');

      assert.ok(trafficAlert);
      assert.equal(trafficAlert.severity, 'WARNING');
      assert.ok(cacAlert);
      assert.equal(cacAlert.severity, 'CRITICAL');
      assert.ok(cacAlert.recommendedAction.length > 0);
    });

    it('evaluates data completeness score and flags low sample sizes below statistical significance', () => {
      const evaluation = growthAnalyticsEngine.evaluateGrowthMetrics({
        workspaceId,
        previousMetrics: {
          monthlyVisitors: 20,
          blendedCac: 100,
        },
        currentMetrics: {
          monthlyVisitors: 12, // Very low sample size (< 30)
          blendedCac: 160,     // 60% spike, but statistically insignificant
          sampleSize: 12,
          dataFreshnessHours: 96, // Stale (> 72 hrs)
        },
      });

      assert.equal(evaluation.snapshot.isStatisticallySignificant, false);
      assert.ok(evaluation.snapshot.dataCompletenessScorePercent < 100);
      assert.ok(evaluation.snapshot.missingFields.length > 0);

      // Alert severity is downgraded to WARNING or INFO because sample size is not significant
      const cacAlert = evaluation.alerts.find((a) => a.metricName === 'Blended CAC');
      assert.ok(cacAlert);
      assert.equal(cacAlert.severity, 'WARNING'); // Downgraded from CRITICAL
      assert.ok(cacAlert.sampleSizeNotice?.includes('threshold'));

      // Stale data alert is triggered
      const staleAlert = evaluation.alerts.find((a) => a.metricName === 'Telemetry Freshness');
      assert.ok(staleAlert);
    });
  });

  // =========================================================================
  // 8. Financial Verification & Sensitivity Analysis
  // =========================================================================
  describe('8. Financial Model Verification: Sensitivity & Cash Flow Rigor', () => {
    it('computes contribution profit, LTV, max affordable CAC, and sensitivity breakdown', async () => {
      const sim = await growthSimulatorEngine.simulateScenario({
        workspaceId,
        name: 'Enterprise Outbound Wedge Modeling',
        description: 'Test high-touch B2B acquisition with custom sensitivity',
        hypothesis: 'Validate outbound economics with realistic margins',
        monthlyMarketingBudget: 10000,
        targetPrice: 1200,
        expectedConversionRate: 4.5,
        targetCac: 400,
        primaryChannel: 'LinkedIn Outbound',
        grossMarginPercent: 80,
        cacVariancePercent: 25,
        monthlyFixedOpEx: 5000,
        lifespanMonths: 18,
      });

      assert.ok(sim.financialMetrics);
      // LTV = 1200 * 0.80 * 18 = 17280
      assert.equal(sim.financialMetrics.ltv, 17280);
      // Max affordable CAC = 17280 * 0.33 = 5702
      assert.equal(sim.financialMetrics.maxAffordableCac, Math.round(17280 * 0.33));
      assert.ok(sim.financialMetrics.ltvCacRatio > 40);

      // Projections: Gross Revenue, Gross Profit, Contribution Profit, Net Cash Flow
      // 10000 / 400 = 25 customers
      const base = sim.projections.baseCase;
      assert.equal(base.customersAcquired, 25);
      assert.equal(base.monthlyRevenue, 30000);
      assert.equal(base.grossProfit, 24000); // 30000 * 0.8
      assert.equal(base.contributionProfit, 14000); // 24000 - 10000
      assert.equal(base.netCashFlow, 9000); // 14000 - 5000 OpEx

      // Sensitivity Breakdown
      assert.ok(sim.sensitivityBreakdown);
      assert.equal(sim.sensitivityBreakdown.primaryDriver, 'Target CAC & Conversion Rate Elasticity');
      assert.equal(sim.sensitivityBreakdown.uncertaintyRating, 'MEDIUM');
      assert.ok(sim.sensitivityBreakdown.confidenceScore >= 0.85);
    });
  });

  // =========================================================================
  // 9. Execution Reconciliation & Honest Simulation Labeling
  // =========================================================================
  describe('9. Execution Reconciliation & Transparent Provider Adapter Labeling', () => {
    it('strictly labels sandbox executions with simulation notice and preserves authenticity', async () => {
      const job = await growthExecutionQueueService.enqueueJob({
        workspaceId,
        actionType: 'DISPATCH_OUTREACH_EMAIL',
        level: 3,
        payload: {
          to: 'founder@fintech.io',
          subject: 'BrainWise Transparent Audit',
          bodyText: 'Personalized evidence note',
        },
      });

      await growthExecutionQueueService.approveJob({
        workspaceId,
        jobId: job.jobId,
        approvedBy: 'founder_lead',
      });

      const processed = await growthExecutionQueueService.processJob(workspaceId, job.jobId);
      assert.equal(processed.status, 'COMPLETED');
      assert.ok(processed.executionReceipt);

      // In test/sandbox environment without live RESEND_API_KEY, verifies honest labeling
      if (processed.executionReceipt.isSimulated) {
        assert.equal(processed.executionReceipt.executionMode, 'SIMULATED_SANDBOX');
        assert.ok(processed.executionReceipt.simulationNotice?.includes('safe simulation sandbox'));
        assert.ok(processed.executionReceipt.providerTransactionId.startsWith('sim_'));
      }

      // Reconcile job status
      const reconciled = await growthExecutionQueueService.reconcileJob(workspaceId, job.jobId);
      assert.equal(reconciled.executionReceipt?.reconciliationStatus, 'VERIFIED');
    });
  });
});
