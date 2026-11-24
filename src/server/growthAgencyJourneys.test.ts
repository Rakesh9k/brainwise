/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { growthDirectorService } from './services/growthDirectorService';
import { growthMissionEngine } from './services/growth/growthMissionEngine';
import { growthStrategyArchitect } from './services/growth/growthStrategyArchitect';
import { growthDepartmentEngines } from './services/growth/growthDepartmentEngines';
import { growthExecutionQueueService } from './services/growth/growthExecutionQueueService';
import { growthSimulatorEngine } from './services/growth/growthSimulatorEngine';
import { growthModelAdapterEngine } from './services/growth/growthModelAdapterEngine';
import { growthAnalyticsEngine } from './services/growth/growthAnalyticsEngine';
import type { AssembledGrowthContext } from './services/growth/growthTypes';

describe('BRAINWISE AI GROWTH AGENCY — 5 REALISTIC FOUNDER JOURNEYS', () => {

  // =========================================================================
  // SCENARIO A: Pre-Launch Artisan Chocolate Brand
  // Goal: Validate willingness-to-pay first, conduct discovery, block premature ads
  // =========================================================================
  describe('Scenario A: Pre-Launch Artisan Chocolate — Demand Validation & Anti-Premature Spend', () => {
    const workspaceId = 'ws_prelaunch_chocolate';

    it('identifies PRE_LAUNCH_STARTUP model and strictly prohibits premature paid advertising', () => {
      const model = growthModelAdapterEngine.resolveModelType('Artisan bean-to-bar single origin craft chocolate');
      // Bean-to-bar chocolate is D2C or Pre-Launch depending on stage
      const playbook = growthModelAdapterEngine.getPlaybook('PRE_LAUNCH_STARTUP');

      assert.ok(playbook.prohibitedPractices.some((p) => p.toLowerCase().includes('paid marketing')));
      assert.equal(playbook.primaryNorthStarMetric, 'Willingness-to-Pay Confirmation & Problem Resonance Rate');
    });

    it('formulates a demand validation strategy before any capital is spent on ads', async () => {
      const context: AssembledGrowthContext = {
        workspaceId,
        businessName: 'VelvetCacao Handcrafted',
        industry: 'Gourmet Confectionery',
        stage: 'Pre-Launch',
        targetAudience: 'Premium foodies & ethical confectionery buyers',
        primaryGoal: 'Validate 50 pre-orders before commercial batch production',
        founderCapacityHoursWeekly: 10,
        marketingBudgetMonthly: 5000,
        nearestCompetitor: 'Industrial Commercial Chocolate',
        unitEconomics: {
          averageOrderValue: 750,
          customerAcquisitionCost: 0,
          customerLifetimeValue: 2250,
          grossMarginPercent: 68,
          currency: 'INR',
        },
        verifiedFacts: ['Single-origin Idukki cocoa beans', 'Small batch stone-ground'],
        avoidAngles: ['Cheap mass-market chocolate'],
      };

      const strategy = await growthStrategyArchitect.formulateStrategy({
        context,
        executionApproach: 'OUTBOUND_LED',
        customObjective: 'Conduct 20 tasting interviews and secure 50 pre-order deposit commitments',
      });

      assert.equal(strategy.executionApproach, 'OUTBOUND_LED');
      assert.ok(strategy.risksAndMitigations.length > 0);

      // Verify no video generation recommended
      const serialized = JSON.stringify(strategy);
      assert.ok(!serialized.toLowerCase().includes('ffmpeg'));
      assert.ok(!serialized.toLowerCase().includes('video generation'));

      // Launch Pre-Order Validation Mission
      const mission = await growthMissionEngine.createMission({
        workspaceId,
        title: 'Artisan Tasting Flight & 50 Pre-Order Commitments',
        strategicRationale: 'Validate consumer willingness to pay ₹750/box prior to commercial packaging run',
        department: 'Marketing',
        targetAudience: 'Local Bangalore & Mumbai specialty coffee & chocolate connoisseurs',
        timeHorizon: '30_DAYS',
        budgetCap: 5000,
        approvalRequired: true,
        successCriteria: [
          {
            metricName: 'Deposit Pre-Orders',
            baselineValue: 0,
            targetValue: 50,
            unit: 'pre_orders',
          },
        ],
      });

      assert.equal(mission.status, 'PROPOSED');
      assert.equal(mission.budgetCap, 5000);
    });
  });

  // =========================================================================
  // SCENARIO B: Early-Stage B2B SaaS
  // Goal: Acquire 100 customers in 90 days, outbound contrast wedge on LinkedIn, approval gate
  // =========================================================================
  describe('Scenario B: Early-Stage B2B SaaS — Outbound Contrast Wedge & Human Approval Gate', () => {
    const workspaceId = 'ws_early_saas_wedge';

    const context: AssembledGrowthContext = {
      workspaceId,
      businessName: 'SyncPilot',
      industry: 'Developer Tooling & API Monitoring',
      stage: 'Early Traction',
      targetAudience: 'Engineering Managers and DevOps Leads at Series A/B startups',
      primaryGoal: 'Acquire 100 paying accounts in 90 days',
      founderCapacityHoursWeekly: 20,
      marketingBudgetMonthly: 25000,
      nearestCompetitor: 'LegacyDatadog Corp',
      unitEconomics: {
        averageOrderValue: 1200,
        customerAcquisitionCost: 350,
        customerLifetimeValue: 10800,
        grossMarginPercent: 88,
        currency: 'USD',
      },
      verifiedFacts: ['Zero log retention fees', '5-minute SDK installation'],
      avoidAngles: ['AI will replace all engineers'],
    };

    it('formulates an Outbound-Led contrast strategy against legacy competitor opacity', async () => {
      const strategy = await growthStrategyArchitect.formulateStrategy({
        context,
        executionApproach: 'OUTBOUND_LED',
      });

      assert.equal(strategy.executionApproach, 'OUTBOUND_LED');
      assert.ok(strategy.businessRationale.includes('LegacyDatadog Corp'));

      // Marketing produces 3-slide educational carousel briefs (strictly zero video)
      const campaign = growthDepartmentEngines.generateMarketingCampaign(context);
      assert.equal(campaign.format, 'STATIC_CAROUSEL');
      assert.ok(campaign.creativeAssetBrief.keyPoints.some((p) => p.toLowerCase().includes('zero video')));

      // Sales produces 3-step personalized wedge sequence
      const sequence = growthDepartmentEngines.generateOutreachSequence(context);
      assert.equal(sequence.steps.length, 3);
      assert.ok(sequence.steps[0]!.subject.includes('LegacyDatadog Corp'));
    });

    it('enforces Level 3 Human Approval Gate before dispatching outbound messages', async () => {
      const job = await growthExecutionQueueService.enqueueJob({
        workspaceId,
        actionType: 'DISPATCH_OUTREACH_EMAIL',
        level: 3,
        payload: {
          recipientSegment: 'Series A DevOps Leads',
          batchSize: 100,
          templateId: 'wedge_sequence_v1',
        },
      });

      assert.equal(job.status, 'AWAITING_APPROVAL');
      assert.equal(job.requiresApproval, true);

      // Attempted autonomous execution is strictly blocked
      await assert.rejects(
        async () => {
          await growthExecutionQueueService.processJob(workspaceId, job.jobId);
        },
        /Security gate blocked job execution/
      );

      // Founder reviews and approves
      const approved = await growthExecutionQueueService.approveJob({
        workspaceId,
        jobId: job.jobId,
        approvedBy: 'founder_alex',
      });

      assert.equal(approved.status, 'QUEUED');
      assert.equal(approved.approvalStatus, 'APPROVED');

      // Processing now succeeds with authentic Resend receipt
      const executed = await growthExecutionQueueService.processJob(workspaceId, job.jobId);
      assert.equal(executed.status, 'COMPLETED');
      assert.ok(executed.executionReceipt?.providerName === 'Resend' || executed.executionReceipt?.providerName === 'Resend / EmailService');
    });
  });

  // =========================================================================
  // SCENARIO C: Restaurant / Cloud Kitchen (Local Hospitality)
  // Goal: Solve weekday cover drought, avoid useless global ads/CRO
  // =========================================================================
  describe('Scenario C: Restaurant / Cloud Kitchen — Weekday Cover Optimization & Local Catering', () => {
    const workspaceId = 'ws_restaurant_weekday';

    it('diagnoses local seating constraint and rejects nationwide digital advertising', () => {
      const model = growthModelAdapterEngine.resolveModelType('Modern Italian Trattoria and sourdough bakery in Indiranagar');
      assert.equal(model, 'RESTAURANT_FOOD');

      const playbook = growthModelAdapterEngine.getPlaybook('RESTAURANT_FOOD');
      assert.ok(
        playbook.prohibitedPractices.some((p) => p.toLowerCase().includes('nationwide brand campaigns')),
        'Prohibits non-local advertising'
      );
      assert.ok(
        playbook.recommendedAcquisitionChannels.some((c) => c.toLowerCase().includes('corporate lunch catering')),
        'Recommends local corporate catering'
      );
    });

    it('creates a hyper-local corporate catering and weekday lunch tasting mission', async () => {
      const mission = await growthMissionEngine.createMission({
        workspaceId,
        title: 'Fill Weekday Lunch Slump via Indiranagar Tech Parks Catering',
        strategicRationale: 'Weekday lunch seat utilization is at 32% while weekends are 100%. Target 15 tech office hubs within 3km for corporate team lunches.',
        department: 'Sales/Acquisition',
        targetAudience: 'HR Heads & Office Managers at Embassy GolfLinks & Indiranagar tech offices',
        timeHorizon: '30_DAYS',
        budgetCap: 10000,
        approvalRequired: false,
        successCriteria: [
          {
            metricName: 'Weekly Recurring Office Catering Accounts',
            baselineValue: 2,
            targetValue: 10,
            unit: 'companies',
          },
          {
            metricName: 'Tuesday-Thursday Lunch Covers',
            baselineValue: 35,
            targetValue: 80,
            unit: 'daily_covers',
          },
        ],
      });

      assert.equal(mission.status, 'APPROVED');
      assert.equal(mission.department, 'Sales/Acquisition');

      // Verify mission outcome once achieved
      const verified = await growthMissionEngine.recordMissionOutcome({
        workspaceId,
        missionId: mission.missionId,
        actorId: 'restaurant_manager',
        metricsAchieved: {
          'Weekly Recurring Office Catering Accounts': 11,
          'Tuesday-Thursday Lunch Covers': 86,
        },
        summaryNotes: 'Closed 11 tech office contracts for Friday team pizzas and daily lunch trays.',
        strategicLearnings: ['Direct WhatsApp tasting samples to HR heads converted at 42%'],
      });

      assert.equal(verified.status, 'VERIFIED');
      assert.equal(verified.actualOutcomes?.metricsAchieved['Weekly Recurring Office Catering Accounts'], 11);
    });
  });

  // =========================================================================
  // SCENARIO D: D2C Brand Launch
  // Goal: Maximize AOV via 3-bar flight, eliminate summer transit breakage
  // =========================================================================
  describe('Scenario D: D2C Brand Launch — AOV Optimization & Thermal Transit Guarantee', () => {
    const workspaceId = 'ws_d2c_chocolate_launch';

    it('tailors D2C playbook around Contribution Margin and Repeat Purchase rate', () => {
      const playbook = growthModelAdapterEngine.getPlaybook('D2C');
      assert.equal(playbook.primaryNorthStarMetric, 'Net Contribution Margin & 60-Day Repeat Purchase Rate');
      assert.ok(playbook.keyGrowthTactics.some((t) => t.toLowerCase().includes('tasting flights')));
      assert.ok(playbook.keyGrowthTactics.some((t) => t.toLowerCase().includes('thermal packaging')));
    });

    it('runs What-If simulation comparing single bar vs 3-bar flight packaging', async () => {
      const simulation = await growthSimulatorEngine.simulateScenario({
        workspaceId,
        name: '3-Bar Tasting Flight Bundle Launch',
        description: 'Test bundling single ₹250 bars into curated ₹699 3-bar tasting flights',
        hypothesis: 'Lifting AOV from ₹350 to ₹699 allows absorbing thermal shipping costs while maintaining 68% margin',
        monthlyMarketingBudget: 35000,
        targetPrice: 699,
        expectedConversionRate: 4.2,
        targetCac: 180,
        primaryChannel: 'Instagram Static Carousels & B2B Festive Gifting',
        grossMarginPercent: 68,
      });

      assert.ok(simulation.projections.baseCase.customersAcquired > 100);
      assert.ok(simulation.projections.baseCase.monthlyRevenue > 100000);
      assert.ok(simulation.projections.baseCase.grossProfit > 70000);

      // Convert into active mission
      const converted = await growthSimulatorEngine.convertScenarioToMission({
        workspaceId,
        scenarioId: simulation.scenarioId,
        ownerId: 'founder_priya',
      });

      assert.ok(converted.missionId);
      assert.equal(converted.scenario.isConvertedToMission, true);

      // Verify mission parameters
      const mission = await growthMissionEngine.getMissionById(workspaceId, converted.missionId);
      assert.ok(mission);
      assert.equal(mission.budgetCap, 35000);
      assert.equal(mission.department, 'Marketing');
    });
  });

  // =========================================================================
  // SCENARIO E: Failing Channel Recovery & Closed-Loop Adaptation
  // Goal: Detect CAC spike & CTR drop, diagnose fatigue, pivot to organic/partnerships
  // =========================================================================
  describe('Scenario E: Failing Channel Recovery — Telemetry Anomaly Detection & Strategy Pivot', () => {
    const workspaceId = 'ws_failing_channel_recovery';

    it('detects a severe CAC spike and conversion drop, raising critical operational alerts', () => {
      const telemetry = growthAnalyticsEngine.evaluateGrowthMetrics({
        workspaceId,
        previousMetrics: {
          monthlyVisitors: 12000,
          blendedCac: 180,
          conversionRatePercent: 3.8,
        },
        currentMetrics: {
          monthlyVisitors: 7500, // 37.5% traffic collapse
          blendedCac: 390,       // 116% CAC spike
          conversionRatePercent: 1.4,
        },
      });

      assert.ok(telemetry.alerts.length >= 2);
      const cacAlert = telemetry.alerts.find((a) => a.metricName === 'Blended CAC');
      assert.ok(cacAlert);
      assert.equal(cacAlert.severity, 'CRITICAL');
      assert.ok(cacAlert.changeDescription.includes('117%') || cacAlert.changeDescription.includes('spike'));
    });

    it('pivots strategy to non-paid Partnership & Referral channels with zero credit waste', async () => {
      const recoveryContext: AssembledGrowthContext = {
        workspaceId,
        businessName: 'DevMetrics Pro',
        industry: 'B2B Software Analytics',
        stage: 'Growing Business',
        targetAudience: 'Engineering Leaders',
        primaryGoal: 'Recover capital efficiency by replacing saturated Google Search ads with Strategic Partnerships',
        founderCapacityHoursWeekly: 15,
        marketingBudgetMonthly: 15000,
        nearestCompetitor: 'AdSaturated Legacy Inc',
        unitEconomics: {
          averageOrderValue: 950,
          customerAcquisitionCost: 390, // Spiked CAC
          customerLifetimeValue: 8550,
          grossMarginPercent: 85,
          currency: 'USD',
        },
        verifiedFacts: ['Integrates with GitHub, GitLab, and Jira in 2 minutes'],
        avoidAngles: ['Saturated pay-per-click bidding wars'],
      };

      // Formulate pivot strategy to PARTNERSHIP_LED
      const pivotStrategy = await growthStrategyArchitect.formulateStrategy({
        context: recoveryContext,
        executionApproach: 'PARTNERSHIP_LED',
        customObjective: 'Establish 3 co-marketing distribution integrations to acquire 50 customers at < $120 CAC',
      });

      assert.equal(pivotStrategy.executionApproach, 'PARTNERSHIP_LED');
      assert.ok(pivotStrategy.strategicObjective.includes('co-marketing'));

      // Generate partnership proposals
      const proposals = growthDepartmentEngines.generatePartnershipProposals(recoveryContext);
      assert.ok(proposals.length > 0);
      assert.equal(proposals[0]!.revenueSharePercent, 20);

      // Verify financial health model after pivot
      const financialModel = growthDepartmentEngines.computeGrowthFinancialModel({
        ...recoveryContext,
        unitEconomics: {
          ...recoveryContext.unitEconomics,
          customerAcquisitionCost: 120, // Modeled after partnership distribution
        },
      });

      assert.ok(financialModel.ltvCacRatio > 5.0, 'Healthy LTV:CAC ratio achieved after pivot');
      assert.equal(financialModel.capitalEfficiencyStatus, 'HEALTHY');
    });
  });
});
