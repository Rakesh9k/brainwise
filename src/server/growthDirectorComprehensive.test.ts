/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { growthPrioritizationEngine } from './services/growth/growthPrioritizationEngine';
import { growthTaskEngine } from './services/growth/growthTaskEngine';
import { growthCapacityEngine } from './services/growth/growthCapacityEngine';
import { growthExperimentEngine } from './services/growth/growthExperimentEngine';
import { growthStrategicMemoryEngine } from './services/growth/growthStrategicMemoryEngine';
import { growthFinancialEngine } from './services/growth/growthFinancialEngine';
import { growthDiagnosisEngine } from './services/growth/growthDiagnosisEngine';
import { growthOpportunityEngine } from './services/growth/growthOpportunityEngine';
import { growthRecommendationEngine } from './services/growth/growthRecommendationEngine';
import { growthRoadmapEngine } from './services/growth/growthRoadmapEngine';
import { growthDirectorService } from './services/growthDirectorService';
import type {
  AssembledGrowthContext,
  StructuredGrowthExperiment,
  StructuredGrowthTask,
} from './services/growth/growthTypes';

describe('BRAINWISE AI GROWTH DIRECTOR & EXECUTION INTELLIGENCE — MASTER SUITE', () => {
  const workspaceId = `ws_growth_master_test_${Date.now()}`;

  // ===========================================================================
  // SECTION A: UNIT TESTS
  // ===========================================================================
  describe('A. Unit Tests — Deterministic Engine Calculations', () => {
    it('A1. Calculates ICE scores with 1-10 clamping and bounded modifiers', () => {
      const res = growthPrioritizationEngine.calculateIceScore({
        impact: 8,
        confidence: 9,
        ease: 8,
        urgencyLevel: 'CRITICAL', // 1.2
        goalAlignmentScore: 10,  // 1.15
        isResourceFeasible: true,
      });

      assert.equal(res.impact, 8);
      assert.equal(res.confidence, 9);
      assert.equal(res.ease, 8);
      assert.equal(res.rawComposite, 576);
      assert.ok(res.finalWeightedScore > res.rawComposite, 'Critical urgency should elevate weighted score');
      assert.equal(res.confidenceClassification, 'HIGH');
    });

    it('A2. Evaluates goal health and progress percent accurately', () => {
      const goalEvaluation = growthPrioritizationEngine.evaluateGoalHealth({
        baselineValue: 10,
        currentValue: 35,
        targetValue: 100,
        startDate: '2026-01-01',
        targetDate: '2026-12-31',
      });
      // (35 - 10) / (100 - 10) = 25 / 90 = ~28%
      assert.equal(goalEvaluation.progressPercent, 28);
      assert.equal(goalEvaluation.remainingTarget, 65);
    });

    it('A3. Computes unit economics safely with zero-division protection', () => {
      const metrics = growthFinancialEngine.calculateUnitEconomics({
        totalMarketingSpend: 10000,
        newCustomersAcquired: 20,
        totalRevenue: 50000,
        grossMarginPercent: 80,
      });

      assert.equal(metrics.cac, 500); // 10000 / 20
      assert.equal(metrics.aov, 2500); // 50000 / 20
      assert.ok(metrics.ltv > metrics.cac);
      assert.ok(metrics.ltvCacRatio > 3.0);
      assert.equal(metrics.roas, 5.0); // 50000 / 10000
    });

    it('A4. Anti-Vague validation rejects vague buzzword tasks', () => {
      const vagueTask: Partial<StructuredGrowthTask> = {
        title: 'Improve SEO and do marketing',
        actionVerb: '',
        executionSteps: [],
        description: 'Need to improve conversion rate',
        completionCriteria: 'When done',
        estimatedDurationMinutes: 0,
        relatedGoalIds: [],
      };

      const result = growthTaskEngine.validateTaskQuality(vagueTask);
      assert.equal(result.isValid, false);
      assert.ok(result.rejectionReasons.some((r) => r.includes('vague phrase')));
      assert.ok(result.rejectionReasons.some((r) => r.includes('action verb')));
      assert.ok(result.rejectionReasons.some((r) => r.includes('Orphan task rejected')));
    });

    it('A5. Task dependency engine detects circular dependencies', () => {
      const taskA: StructuredGrowthTask = {
        taskId: 't_a',
        workspaceId,
        title: 'Task A',
        description: 'A',
        actionVerb: 'Deploy',
        executionSteps: ['step 1', 'step 2'],
        department: 'Product',
        timeHorizon: 'IMMEDIATE_7_DAYS',
        provenance: 'BUSINESS_BRAIN',
        relatedGoalIds: ['g1'],
        relatedOpportunityIds: [],
        relatedExperimentIds: [],
        priority: 'HIGH',
        iceScore: growthPrioritizationEngine.calculateIceScore({ impact: 8, confidence: 8, ease: 8 }),
        expectedOutcome: 'A outcome',
        successMetrics: { metricName: 'm', baselineValue: 0, targetValue: 1, unit: 'u' },
        completionCriteria: 'Criteria string 12345',
        estimatedDurationMinutes: 30,
        requiredBudget: 0,
        requiredSkills: [],
        suggestedTools: [],
        dependencies: ['t_b'], // A depends on B
        blockedByTaskIds: [],
        status: 'SCHEDULED',
        deadline: '2026-12-31',
        createdAt: '2026-11-22',
        updatedAt: '2026-11-22',
      };

      const taskB: StructuredGrowthTask = {
        ...taskA,
        taskId: 't_b',
        title: 'Task B',
        dependencies: ['t_a'], // B depends on A (Cycle!)
      };

      const { circularDependencyDetected } = growthTaskEngine.resolveDependencies([taskA, taskB]);
      assert.equal(circularDependencyDetected, true, 'Must detect circular dependency between A and B');
    });

    it('A6. Capacity engine flags overloaded workloads and warns founder', () => {
      const heavyTasks: StructuredGrowthTask[] = Array.from({ length: 10 }, (_, i) => ({
        taskId: `heavy_${i}`,
        workspaceId,
        title: `Heavy task ${i}`,
        description: 'High effort task',
        actionVerb: 'Execute',
        executionSteps: ['step 1', 'step 2'],
        department: 'Product',
        timeHorizon: 'IMMEDIATE_7_DAYS',
        provenance: 'BUSINESS_BRAIN',
        relatedGoalIds: ['g1'],
        relatedOpportunityIds: [],
        relatedExperimentIds: [],
        priority: 'HIGH',
        iceScore: growthPrioritizationEngine.calculateIceScore({ impact: 8, confidence: 8, ease: 8 }),
        expectedOutcome: 'Outcome',
        successMetrics: { metricName: 'm', baselineValue: 0, targetValue: 1, unit: 'u' },
        completionCriteria: 'Completion criteria 12345',
        estimatedDurationMinutes: 300, // 5 hours each = 50 hours total
        requiredBudget: 0,
        requiredSkills: [],
        suggestedTools: [],
        dependencies: [],
        blockedByTaskIds: [],
        status: 'SCHEDULED',
        deadline: '2026-12-31',
        createdAt: '2026-11-22',
        updatedAt: '2026-11-22',
      }));

      const capacity = growthCapacityEngine.evaluateCapacity({
        founderDailyHours: 4, // 20 hours/week available
        plannedTasks: heavyTasks,
      });

      assert.equal(capacity.isOverloaded, true);
      assert.ok(capacity.utilizationPercent > 100);
      assert.ok(capacity.overloadWarning);
    });

    it('A7. Kill-switch engine protects against premature termination when sample size is insufficient', () => {
      const exp: StructuredGrowthExperiment = {
        experimentId: 'exp_ks_1',
        workspaceId,
        title: 'High-Ticket Ad Test',
        hypothesis: 'Paid Ads produce CAC < ₹500',
        businessObjective: 'Acquisition',
        problemBeingTested: 'Ad economics',
        targetAudience: 'Founders',
        channel: 'Meta Ads',
        proposedIntervention: 'Static Carousels',
        baselineMetric: { metricName: 'CAC', value: 800, unit: 'INR' },
        primaryMetric: { metricName: 'CAC', targetValue: 500, unit: 'INR' },
        secondaryMetrics: [],
        expectedOutcome: 'CAC < 500',
        minMeaningfulResult: '50 conversions',
        budgetCap: 20000,
        currentExpenditure: 3000,
        startDate: '2026-11-01',
        endDate: '2026-11-15',
        killSwitch: {
          minSampleSize: 50,
          currentSampleSize: 4, // Only 4 conversions so far!
          stopThresholdValue: 800,
          metricName: 'CAC',
          comparison: 'GREATER_THAN',
          budgetCap: 20000,
          currentExpenditure: 3000,
          isTriggered: false,
        },
        dependencies: [],
        ownerId: 'founder',
        status: 'ACTIVE',
        createdAt: '2026-11-01',
        updatedAt: '2026-11-01',
      };

      const result = growthExperimentEngine.evaluateKillSwitch(exp);
      assert.equal(result.shouldKill, false, 'Should not kill when sample size is under minimum threshold');
      assert.ok(result.reason?.includes('Sample size too small'));
    });
  });

  // ===========================================================================
  // SECTION B & C: INTEGRATION AND SECURITY TESTS
  // ===========================================================================
  describe('B & C. Integration & Security — Context, Isolation, and Idempotency', () => {
    it('B1. Dual-persists tasks into growthTasks and standard taskRepository', async () => {
      const roadmap = await growthDirectorService.generateOperationalRoadmap({ workspaceId });
      assert.ok(roadmap.tasks.length >= 4);

      const tasks = await growthDirectorService.getGrowthTasks(workspaceId);
      assert.ok(tasks.length >= 4);
      assert.equal(tasks[0].workspaceId, workspaceId);
    });

    it('C1. Multi-tenant isolation prevents cross-workspace task leakage', async () => {
      const otherWorkspaceId = `ws_growth_other_${Date.now()}`;
      await growthDirectorService.generateOperationalRoadmap({ workspaceId: otherWorkspaceId });

      const tasksA = await growthDirectorService.getGrowthTasks(workspaceId);
      const tasksB = await growthDirectorService.getGrowthTasks(otherWorkspaceId);

      assert.ok(tasksA.every((t) => t.workspaceId === workspaceId));
      assert.ok(tasksB.every((t) => t.workspaceId === otherWorkspaceId));
    });
  });

  // ===========================================================================
  // SECTION D: 8 SCENARIO-BASED ACCEPTANCE TESTS
  // ===========================================================================
  describe('D. 8 Scenario-Based Acceptance Tests', () => {
    // -------------------------------------------------------------------------
    // Scenario 1: New SaaS Startup
    // -------------------------------------------------------------------------
    it('Scenario 1: New SaaS startup — identifies validation priorities and avoids premature ad scaling', async () => {
      const context: AssembledGrowthContext = {
        workspaceId: 'ws_saas_startup',
        businessName: 'CloudAudit AI',
        stage: 'Idea Stage',
        businessModel: 'B2B SaaS',
        targetAudience: 'CTOs & DevOps Leads',
        brandPositioning: 'Deterministic Security Engine',
        valueProposition: 'Instant compliance audits',
        revenueModel: 'Annual Contracts',
        unitEconomics: {
          averageOrderValue: 499,
          customerAcquisitionCost: 800,
          customerLifetimeValue: 3500,
          monthlyBurnRate: 30000,
          grossMarginPercent: 85,
          currency: 'INR',
        },
        channels: ['Direct LinkedIn Outbound'],
        activeGoals: [
          {
            goalId: 'g_first_100',
            title: 'Acquire first 100 paying customers',
            category: 'Customer Acquisition',
            currentValue: 0,
            targetValue: 100,
            unit: 'customers',
            deadline: '2026-12-31',
            status: 'on_track',
          },
        ],
        validatedFacts: [],
        nearestCompetitor: 'Legacy Audit Inc',
        competitorWeaknesses: ['Manual PDFs', 'Expensive consultants'],
        marketSignalsCount: 2,
        founderCapacityHoursWeekly: 30,
        marketingBudgetMonthly: 10000,
        freshness: { lastSynchronizedAt: '2026-11-22', completenessPercent: 90, missingCriticalFields: [] },
      };

      const diagnoses = growthDiagnosisEngine.diagnoseBottlenecks(context);
      assert.ok(diagnoses.some((d) => d.dimension === 'AWARENESS' && d.classification === 'CONFIRMED_BOTTLENECK'));

      const whatNotToDo = growthRecommendationEngine.generateWhatNotToDo({ context });
      assert.ok(
        whatNotToDo.some((w) => w.activityTitle.includes('Paid Ad Campaigns')),
        'Must advise avoiding paid ad campaigns in early idea stage'
      );
    });

    // -------------------------------------------------------------------------
    // Scenario 2: Restaurant
    // -------------------------------------------------------------------------
    it('Scenario 2: Restaurant — identifies weekday demand constraint without false conversion diagnosis', async () => {
      const context: AssembledGrowthContext = {
        workspaceId: 'ws_restaurant',
        businessName: 'The Rustic Hearth',
        stage: 'Growing Business',
        businessModel: 'Dine-In Hospitality',
        targetAudience: 'Local Urban Families & Professionals',
        brandPositioning: 'Farm-to-Table Woodfired Dining',
        valueProposition: 'Authentic sourdough and artisanal grill',
        revenueModel: 'Direct Table Sales',
        unitEconomics: {
          averageOrderValue: 1200,
          customerAcquisitionCost: 150,
          customerLifetimeValue: 7200,
          monthlyBurnRate: 150000,
          grossMarginPercent: 65,
          currency: 'INR',
        },
        channels: ['Local Google Business', 'Word of Mouth'],
        activeGoals: [
          {
            goalId: 'g_weekday',
            title: 'Increase Weekday Table Covers by 30%',
            category: 'Revenue',
            currentValue: 40,
            targetValue: 70,
            unit: 'covers/day',
            deadline: '2026-12-31',
            status: 'needs_attention',
          },
        ],
        validatedFacts: [],
        nearestCompetitor: 'Bistro Central',
        competitorWeaknesses: ['Inconsistent food quality'],
        marketSignalsCount: 1,
        founderCapacityHoursWeekly: 40,
        marketingBudgetMonthly: 20000,
        freshness: { lastSynchronizedAt: '2026-11-22', completenessPercent: 85, missingCriticalFields: [] },
      };

      // No website conversion telemetry available for a dine-in restaurant
      const diagnoses = growthDiagnosisEngine.diagnoseBottlenecks(context);
      const conversionDiag = diagnoses.find((d) => d.dimension === 'CONVERSION');
      assert.equal(
        conversionDiag?.classification,
        'INSUFFICIENT_EVIDENCE',
        'Must not falsely diagnose a website conversion bottleneck without funnel tracking data'
      );
    });

    // -------------------------------------------------------------------------
    // Scenario 3: Premium Chocolate Business
    // -------------------------------------------------------------------------
    it('Scenario 3: Premium chocolate business — calculates corporate gifting unit economics', () => {
      const simulation = growthFinancialEngine.simulateScenarios({
        workspaceId: 'ws_chocolate',
        currency: 'INR',
        baselineRevenue: 80000,
        monthlyBudget: 15000,
        currentCac: 1200,
        currentConversionRatePercent: 2.8,
        averageOrderValue: 4500, // Corporate gifting bulk box
        grossMarginPercent: 70,
      });

      assert.ok(simulation.scenarios.expected.projectedRevenueMonthly > 80000);
      assert.ok(simulation.scenarios.expected.breakEvenCustomersRequired > 0);
      assert.equal(simulation.currency, 'INR');
      assert.ok(simulation.confidenceDisclaimer.includes('parametric mathematical calculations'));
    });

    // -------------------------------------------------------------------------
    // Scenario 4: Failed Experiment
    // -------------------------------------------------------------------------
    it('Scenario 4: Failed experiment — distinguishes outreach execution from conversion and avoids permanent ban', async () => {
      const exp: StructuredGrowthExperiment = {
        experimentId: 'exp_influencer_01',
        workspaceId: 'ws_experiment_test',
        title: 'Micro-Influencer Outreach',
        hypothesis: 'Influencer co-marketing drives >= 15 customer purchases',
        businessObjective: 'Customer Acquisition',
        problemBeingTested: 'Influencer CAC',
        targetAudience: 'Lifestyle Founders',
        channel: 'Influencer Co-Marketing',
        proposedIntervention: 'Static Product Showcase',
        baselineMetric: { metricName: 'Purchases', value: 0, unit: 'orders' },
        primaryMetric: { metricName: 'Purchases', targetValue: 15, unit: 'orders' },
        secondaryMetrics: [],
        expectedOutcome: '15 orders',
        minMeaningfulResult: '5 orders',
        budgetCap: 10000,
        currentExpenditure: 8000,
        startDate: '2026-11-01',
        endDate: '2026-11-15',
        killSwitch: {
          minSampleSize: 20,
          currentSampleSize: 20,
          stopThresholdValue: 0,
          metricName: 'Purchases',
          comparison: 'LESS_THAN',
          budgetCap: 10000,
          currentExpenditure: 8000,
          isTriggered: false,
        },
        dependencies: [],
        ownerId: 'founder',
        status: 'ACTIVE',
        createdAt: '2026-11-01',
        updatedAt: '2026-11-01',
      };

      // 20 outreach attempts, 3 replies, 0 purchases
      const evalResult = growthExperimentEngine.evaluateExperimentOutcome({
        experiment: exp,
        actualPrimaryMetricValue: 0, // 0 purchases
        actualSampleSize: 20,
        actualExpenditure: 8000,
        executionCompletedSuccessfully: true,
        measurementValid: true,
        notes: 'Outreach was executed completely to 20 creators. Zero orders converted.',
      });

      assert.equal(evalResult.evaluation, 'HYPOTHESIS_REJECTED');
      assert.equal(evalResult.status, 'COMPLETED');
      assert.ok(evalResult.learningSummary.includes('Hypothesis Rejected'));

      // Ingest into strategic memory: Theme should record 1 negative occurrence, but NOT immediately declare channel permanently banned
      const memoryResult = await growthStrategicMemoryEngine.ingestLearningEvent({
        eventId: 'evt_influencer_fail',
        workspaceId: 'ws_experiment_test',
        category: 'CHANNEL_MEMORY',
        entityId: 'exp_influencer_01',
        theme: 'Micro-Influencer Co-Marketing',
        observation: '20 contacts yielded 3 replies and 0 conversions. Offer lacked compelling discount.',
        outcomeClassification: 'NEGATIVE',
        executionSuccess: true,
        evidenceQuality: 'DIRECTLY_MEASURED',
        sampleSize: 20,
      });

      assert.equal(memoryResult.record.isFatigued, false, 'Single failure must NOT trigger permanent channel ban');
      assert.equal(memoryResult.record.fatigueScore, 1);
    });

    // -------------------------------------------------------------------------
    // Scenario 5: Insufficient Evidence
    // -------------------------------------------------------------------------
    it('Scenario 5: Insufficient evidence — preserves uncertainty and rejects unverified fact promotion', async () => {
      const memoryResult = await growthStrategicMemoryEngine.ingestLearningEvent({
        eventId: 'evt_small_sample',
        workspaceId: 'ws_uncertainty_test',
        category: 'EXPERIMENT_MEMORY',
        entityId: 'exp_small',
        theme: 'One-off Social Blast',
        observation: '1 customer signed up after 1 post, but no baseline or attribution exists.',
        outcomeClassification: 'POSITIVE',
        executionSuccess: true,
        evidenceQuality: 'UNVERIFIED', // Unverified!
        sampleSize: 1, // Insufficient sample size!
      });

      assert.equal(
        memoryResult.promotedToBusinessBrain,
        false,
        'Unverified small-sample evidence MUST NOT be promoted to Business Brain facts'
      );
      assert.ok(memoryResult.record.confidenceScore <= 0.25, 'Confidence must remain appropriately low');
    });

    // -------------------------------------------------------------------------
    // Scenario 6: Overloaded Founder
    // -------------------------------------------------------------------------
    it('Scenario 6: Overloaded founder — selects top 3 focus priorities and rejects impossible schedule', () => {
      const mockTasks: StructuredGrowthTask[] = Array.from({ length: 15 }, (_, i) => ({
        taskId: `tsk_overload_${i}`,
        workspaceId: 'ws_overload',
        title: `Task #${i + 1}`,
        description: 'Operational task',
        actionVerb: 'Execute',
        executionSteps: ['step 1', 'step 2'],
        department: 'Marketing',
        timeHorizon: 'IMMEDIATE_7_DAYS',
        provenance: 'BUSINESS_BRAIN',
        relatedGoalIds: ['g1'],
        relatedOpportunityIds: [],
        relatedExperimentIds: [],
        priority: i < 3 ? 'HIGH' : 'LOW',
        iceScore: growthPrioritizationEngine.calculateIceScore({ impact: 10 - i, confidence: 8, ease: 7 }),
        expectedOutcome: 'Outcome',
        successMetrics: { metricName: 'm', baselineValue: 0, targetValue: 1, unit: 'u' },
        completionCriteria: 'Criteria 1234567890',
        estimatedDurationMinutes: 30,
        requiredBudget: 0,
        requiredSkills: [],
        suggestedTools: [],
        dependencies: i === 1 ? ['tsk_overload_0'] : [],
        blockedByTaskIds: i === 1 ? ['tsk_overload_0'] : [], // Task 1 is BLOCKED
        status: i === 1 ? 'BLOCKED' : 'SCHEDULED',
        deadline: '2026-12-31',
        createdAt: '2026-11-22',
        updatedAt: '2026-11-22',
      }));

      const focusTasks = growthCapacityEngine.selectFocusSprintTasks({
        tasks: mockTasks,
        limit: 3,
        availableMinutes: 45,
      });

      assert.equal(focusTasks.length, 3, 'Must select exactly 3 tasks');
      assert.ok(
        focusTasks.every((t) => t.status !== 'BLOCKED'),
        'Blocked tasks must never be scheduled into active focus sprint'
      );
    });

    // -------------------------------------------------------------------------
    // Scenario 7: Changing Business Objectives
    // -------------------------------------------------------------------------
    it('Scenario 7: Changing business objectives — marks stale roadmap and preserves completed work', () => {
      const context: AssembledGrowthContext = {
        workspaceId: 'ws_pivot',
        businessName: 'PivotFlow',
        stage: 'Early Traction',
        businessModel: 'B2B Enterprise',
        targetAudience: 'Global Fortune 500 Procurement', // Pivot to Enterprise!
        brandPositioning: 'Zero-Trust Verification',
        valueProposition: 'Enterprise vendor verification',
        revenueModel: 'Annual Contracts',
        unitEconomics: {
          averageOrderValue: 250000,
          customerAcquisitionCost: 50000,
          customerLifetimeValue: 750000,
          monthlyBurnRate: 100000,
          grossMarginPercent: 90,
          currency: 'INR',
        },
        channels: ['Direct Account-Based Marketing'],
        activeGoals: [
          {
            goalId: 'g_ent',
            title: 'Close 5 Enterprise Pilots',
            category: 'Revenue',
            currentValue: 1,
            targetValue: 5,
            unit: 'pilots',
            deadline: '2026-12-31',
            status: 'on_track',
          },
        ],
        validatedFacts: [],
        nearestCompetitor: 'Legacy Vendor Check',
        competitorWeaknesses: ['Slow annual cycles'],
        marketSignalsCount: 3,
        founderCapacityHoursWeekly: 35,
        marketingBudgetMonthly: 50000,
        freshness: { lastSynchronizedAt: '2026-11-22', completenessPercent: 95, missingCriticalFields: [] },
      };

      const diagnoses = growthDiagnosisEngine.diagnoseBottlenecks(context);
      const opportunities = growthOpportunityEngine.synthesizeOpportunities(context, diagnoses);
      const roadmapV2 = growthRoadmapEngine.generateDynamicRoadmap({
        context,
        diagnoses,
        opportunities,
        version: 2,
      });

      assert.equal(roadmapV2.version, 2);
      assert.ok(roadmapV2.changeSummary?.includes('Refreshed roadmap version 2'));
    });

    // -------------------------------------------------------------------------
    // Scenario 8: Duplicate Learning Event (Idempotency)
    // -------------------------------------------------------------------------
    it('Scenario 8: Duplicate learning event — guarantees idempotency and prevents duplicate memory records', async () => {
      const eventParams = {
        eventId: `idempotent_event_${Date.now()}`,
        workspaceId: 'ws_idempotency_test',
        category: 'EXPERIMENT_MEMORY' as const,
        entityId: 'exp_repeat_1',
        theme: 'A/B Pricing Tier Test',
        observation: 'Evidence badges increased checkout conversion by 1.6%.',
        outcomeClassification: 'POSITIVE' as const,
        executionSuccess: true,
        evidenceQuality: 'DIRECTLY_MEASURED' as const,
        sampleSize: 50,
      };

      // First submission
      const firstResult = await growthStrategicMemoryEngine.ingestLearningEvent(eventParams);
      assert.equal(firstResult.isDuplicate, false);
      assert.equal(firstResult.promotedToBusinessBrain, true);

      // Duplicate submission with same eventId
      const secondResult = await growthStrategicMemoryEngine.ingestLearningEvent(eventParams);
      assert.equal(secondResult.isDuplicate, true, 'Second submission must be recognized as duplicate');
      assert.equal(secondResult.promotedToBusinessBrain, false, 'Duplicate event must NOT re-promote fact to Business Brain');
    });
  });
});
