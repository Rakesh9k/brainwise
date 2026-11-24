/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  AdaptiveRoadmapVersion,
  AssembledGrowthContext,
  GrowthBottleneckDiagnosis,
  GrowthOpportunityDetail,
  RoadmapPhase,
  StructuredGrowthTask,
} from './growthTypes';
import { growthPrioritizationEngine } from './growthPrioritizationEngine';
import { growthTaskEngine } from './growthTaskEngine';

export class GrowthRoadmapEngine {
  /**
   * Generates a fully dynamic, multi-horizon operational roadmap grounded in Business Brain and diagnosis
   */
  public generateDynamicRoadmap(params: {
    context: AssembledGrowthContext;
    diagnoses: GrowthBottleneckDiagnosis[];
    opportunities: GrowthOpportunityDetail[];
    version?: number;
    previousVersion?: AdaptiveRoadmapVersion;
  }): AdaptiveRoadmapVersion {
    const { context, diagnoses, opportunities, version = 1 } = params;
    const roadmapId = `rdm_${Date.now()}_v${version}`;
    const now = new Date().toISOString();
    const nearestComp = context.nearestCompetitor;
    const primaryGoal = context.activeGoals[0];
    const primaryGoalId = primaryGoal?.goalId || 'goal_primary';

    // -------------------------------------------------------------------------
    // Phase 1: Immediate (Days 1–7)
    // -------------------------------------------------------------------------
    const immediateTask1: StructuredGrowthTask = {
      taskId: `tsk_${Date.now()}_imm_1`,
      workspaceId: context.workspaceId,
      title: `Deploy Evidence Badges & Transparent Math to Pricing Cards`,
      description: `Mount verified calculation badges on pricing cards to eliminate buyer skepticism and increase checkout conversions.`,
      actionVerb: 'Deploy',
      executionSteps: [
        'Render <EvidenceBadge> component on ₹499 and ₹799 pricing tier cards.',
        'Wire click-through drawer to show underlying mathematical sources and assumptions.',
        'Verify zero hydration mismatch on mobile (375px) and desktop (1440px).',
      ],
      department: 'Product',
      timeHorizon: 'IMMEDIATE_7_DAYS',
      provenance: 'GROWTH_OPPORTUNITY',
      relatedGoalIds: [primaryGoalId],
      relatedOpportunityIds: [opportunities[0]?.opportunityId || 'opp_1'],
      relatedExperimentIds: [],
      priority: 'HIGH',
      iceScore: growthPrioritizationEngine.calculateIceScore({
        impact: 8,
        confidence: 9,
        ease: 8,
        urgencyLevel: 'HIGH',
        goalAlignmentScore: 9,
        isResourceFeasible: true,
      }),
      expectedOutcome: 'Increase checkout initiation rate from 3.2% to at least 4.5%.',
      successMetrics: {
        metricName: 'Checkout Funnel Conversion Rate',
        baselineValue: 3.2,
        targetValue: 4.5,
        unit: '%',
      },
      completionCriteria: 'Evidence badges visible on 100% of live pricing tiers with telemetry tracking clicks.',
      estimatedDurationMinutes: 180,
      requiredBudget: 1500,
      requiredSkills: ['Frontend React', 'Analytics'],
      suggestedTools: ['React 19 Components', 'PostHog Telemetry'],
      dependencies: ['Business Brain Grounding Context'],
      blockedByTaskIds: [],
      status: 'SCHEDULED',
      deadline: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      createdAt: now,
      updatedAt: now,
    };

    const immediateTask2: StructuredGrowthTask = {
      taskId: `tsk_${Date.now()}_imm_2`,
      workspaceId: context.workspaceId,
      title: `Execute 50-Account Outbound Validation Campaign on ${nearestComp} Whitespace`,
      description: `Outreach to 50 verified ICP decision-makers highlighting our transparent pricing vs ${nearestComp}'s contract lock-in.`,
      actionVerb: 'Execute',
      executionSteps: [
        `Filter 50 verified prospects fitting ${context.targetAudience} profile.`,
        'Personalize problem-solution wedge message emphasizing deterministic proof.',
        'Log all interactions and measure reply and meeting booking rates.',
      ],
      department: 'Sales',
      timeHorizon: 'IMMEDIATE_7_DAYS',
      provenance: 'COMPETITIVE_RADAR',
      relatedGoalIds: [primaryGoalId],
      relatedOpportunityIds: [opportunities[0]?.opportunityId || 'opp_1'],
      relatedExperimentIds: [],
      priority: 'HIGH',
      iceScore: growthPrioritizationEngine.calculateIceScore({
        impact: 8,
        confidence: 8,
        ease: 8,
        urgencyLevel: 'HIGH',
        goalAlignmentScore: 9,
        isResourceFeasible: true,
      }),
      expectedOutcome: 'Achieve at least 12% positive reply rate and 4 product demos.',
      successMetrics: {
        metricName: 'Outbound Reply Rate',
        baselineValue: 4.0,
        targetValue: 12.0,
        unit: '%',
      },
      completionCriteria: 'All 50 outreach messages logged in workspace CRM with timestamps.',
      estimatedDurationMinutes: 240,
      requiredBudget: 3500,
      requiredSkills: ['B2B Outbound', 'Copywriting'],
      suggestedTools: ['LinkedIn Sales Navigator', 'BrainWise Outreach Pack'],
      dependencies: [immediateTask1.taskId],
      blockedByTaskIds: [immediateTask1.taskId],
      status: 'BLOCKED',
      deadline: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      createdAt: now,
      updatedAt: now,
    };

    const phase1: RoadmapPhase = {
      phaseId: 'phase_imm_7d',
      horizon: 'IMMEDIATE_7_DAYS',
      title: 'Immediate Validation & Conversion Instrumentation',
      strategicObjective: `Eliminate primary conversion friction and test outbound demand against ${nearestComp}.`,
      expectedBusinessOutcome: 'Validate willingness to pay and lift initial funnel conversion rate.',
      keyMilestones: [
        'Deploy Evidence Badges on pricing tiers',
        'Complete 50 ICP outbound contacts with zero video collateral',
      ],
      tasks: [immediateTask1, immediateTask2],
      dependencies: [],
      requiredBudget: 5000,
      requiredHours: 7.0,
      exitCriteria: '>= 4.5% checkout conversion or >= 10% positive outbound reply rate.',
    };

    // -------------------------------------------------------------------------
    // Phase 2: 30-Day Horizon
    // -------------------------------------------------------------------------
    const shortTermTask1: StructuredGrowthTask = {
      taskId: `tsk_${Date.now()}_st_1`,
      workspaceId: context.workspaceId,
      title: `Publish Multi-Frame Static Carousel Comparing Realistic Unit Economics`,
      description: `Create and distribute a 5-slide SVG carousel comparing realistic CAC payback vs bloated incumbent costs.`,
      actionVerb: 'Publish',
      executionSteps: [
        'Export SVG carousel from BrainWise Brand Studio adhering to Strict Zero Video policy.',
        'Distribute across LinkedIn and founder communities with UTM tracking.',
        'Track inbound referral visits and newsletter signups.',
      ],
      department: 'Marketing',
      timeHorizon: 'SHORT_TERM_30_DAYS',
      provenance: 'GROWTH_OPPORTUNITY',
      relatedGoalIds: [primaryGoalId],
      relatedOpportunityIds: [opportunities[1]?.opportunityId || 'opp_2'],
      relatedExperimentIds: [],
      priority: 'MEDIUM',
      iceScore: growthPrioritizationEngine.calculateIceScore({
        impact: 7,
        confidence: 8,
        ease: 7,
        urgencyLevel: 'MEDIUM',
        goalAlignmentScore: 8,
        isResourceFeasible: true,
      }),
      expectedOutcome: 'Generate 2,500 organic impressions and 35 new workspace signups.',
      successMetrics: {
        metricName: 'Organic Referral Signups',
        baselineValue: 5,
        targetValue: 35,
        unit: 'signups',
      },
      completionCriteria: 'Static SVG carousel published with active UTM tracking links.',
      estimatedDurationMinutes: 300,
      requiredBudget: 4000,
      requiredSkills: ['Brand Design', 'Organic Distribution'],
      suggestedTools: ['BrainWise Brand Studio', 'LinkedIn Analytics'],
      dependencies: ['Phase 6 Static Carousel SVG Generator', 'Phase 5 Strategy Simulator'],
      blockedByTaskIds: [immediateTask1.taskId],
      status: 'BLOCKED',
      deadline: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      createdAt: now,
      updatedAt: now,
    };

    const shortTermTask2: StructuredGrowthTask = {
      taskId: `tsk_${Date.now()}_st_2`,
      workspaceId: context.workspaceId,
      title: `Implement 14-Day Onboarding Milestone Guidance Sequence`,
      description: `Trigger contextual next-step recommendations when a founder finishes Idea Validation, directing them immediately to Market Sizing and Competitor Watch.`,
      actionVerb: 'Implement',
      executionSteps: [
        'Wire event listener on IDEA_REPORT_GENERATED in department event bus.',
        'Surface milestone recommendation banner directing founder to Market Sizing.',
        'Track engagement and Day-14 return frequency across active cohorts.',
      ],
      department: 'Product',
      timeHorizon: 'SHORT_TERM_30_DAYS',
      provenance: 'BUSINESS_BRAIN',
      relatedGoalIds: [primaryGoalId],
      relatedOpportunityIds: [opportunities[1]?.opportunityId || 'opp_2'],
      relatedExperimentIds: [],
      priority: 'HIGH',
      iceScore: growthPrioritizationEngine.calculateIceScore({
        impact: 9,
        confidence: 7,
        ease: 6,
        urgencyLevel: 'HIGH',
        goalAlignmentScore: 8,
        isResourceFeasible: true,
      }),
      expectedOutcome: 'Lift Day-14 workspace retention rate from 28% to 45%.',
      successMetrics: {
        metricName: 'Day-14 Multi-Department Engagement Rate',
        baselineValue: 28.0,
        targetValue: 45.0,
        unit: '%',
      },
      completionCriteria: '100% of newly onboarded workspaces trigger the milestone banner upon report generation.',
      estimatedDurationMinutes: 360,
      requiredBudget: 2500,
      requiredSkills: ['Full-Stack TypeScript', 'Analytics'],
      suggestedTools: ['BrainWise Event Bus', 'In-App Notifications Drawer'],
      dependencies: ['Business Brain Context Hooks'],
      blockedByTaskIds: [],
      status: 'SCHEDULED',
      deadline: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      createdAt: now,
      updatedAt: now,
    };

    const phase2: RoadmapPhase = {
      phaseId: 'phase_st_30d',
      horizon: 'SHORT_TERM_30_DAYS',
      title: 'Customer Acquisition & Evidence Distribution',
      strategicObjective: 'Establish predictable inbound traffic through organic vector collateral and positioning.',
      expectedBusinessOutcome: 'Double monthly qualified lead volume and lower blended CAC.',
      keyMilestones: [
        'Distribute 3 high-authority static SVG carousels',
        'Achieve first 50 paying customers',
      ],
      tasks: [shortTermTask1, shortTermTask2],
      dependencies: ['phase_imm_7d'],
      requiredBudget: 8000,
      requiredHours: 12.0,
      exitCriteria: '>= 30 new paying customers acquired with blended CAC under ₹800.',
    };

    // -------------------------------------------------------------------------
    // Phase 3: 60-Day Horizon
    // -------------------------------------------------------------------------
    const mediumTermTask1: StructuredGrowthTask = {
      taskId: `tsk_${Date.now()}_mt_1`,
      workspaceId: context.workspaceId,
      title: `Automate Two-Sided Credit Unlock Loop for Founder Referrals`,
      description: `Wire Cashfree and Firestore credit ledger so that when an invited colleague validates an idea, both users receive 50 bonus intelligence credits.`,
      actionVerb: 'Automate',
      executionSteps: [
        'Implement atomic credit transaction ledger verifying referral invite token.',
        'Award 50 bonus intelligence credits to both accounts upon first report generation.',
        'Ensure idempotent processing and fraud prevention via verified phone authentication.',
      ],
      department: 'Growth',
      timeHorizon: 'LONG_TERM_90_DAYS',
      provenance: 'GROWTH_OPPORTUNITY',
      relatedGoalIds: [primaryGoalId],
      relatedOpportunityIds: [opportunities[2]?.opportunityId || 'opp_3'],
      relatedExperimentIds: [],
      priority: 'MEDIUM',
      iceScore: growthPrioritizationEngine.calculateIceScore({
        impact: 8,
        confidence: 7,
        ease: 5,
        urgencyLevel: 'MEDIUM',
        goalAlignmentScore: 8,
        isResourceFeasible: true,
      }),
      expectedOutcome: 'Lower blended CAC by 35% and achieve a sustained referral coefficient of K = 0.25.',
      successMetrics: {
        metricName: 'Viral Referral Coefficient (K-factor)',
        baselineValue: 0.05,
        targetValue: 0.25,
        unit: 'k-factor',
      },
      completionCriteria: 'Atomic credit transaction verifies zero double-credit issuance and automatically updates user credit ledger balance.',
      estimatedDurationMinutes: 510,
      requiredBudget: 6000,
      requiredSkills: ['Backend Architecture', 'Firestore Transactions'],
      suggestedTools: ['Firestore Atomic Transactions', 'Cashfree Webhook Handler'],
      dependencies: ['Two-Phase Credit Reservation Protocol (ADR-006)'],
      blockedByTaskIds: [],
      status: 'SCHEDULED',
      deadline: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
      createdAt: now,
      updatedAt: now,
    };

    const phase3: RoadmapPhase = {
      phaseId: 'phase_mt_60d',
      horizon: 'MEDIUM_TERM_60_DAYS',
      title: 'Compounding Retention & Referral Virality',
      strategicObjective: 'Implement automated two-sided referral loops and Day-14 milestone retention sequences.',
      expectedBusinessOutcome: 'Increase Day-60 retention by 25% and generate organic founder referral loop.',
      keyMilestones: [
        'Deploy automated milestone satisfaction survey on Day 14',
        'Activate two-sided bonus credit referral link',
      ],
      tasks: [mediumTermTask1],
      dependencies: ['phase_st_30d'],
      requiredBudget: 12000,
      requiredHours: 18.0,
      exitCriteria: 'Referral coefficient K >= 0.20 and Day-60 retention >= 45%.',
    };

    // -------------------------------------------------------------------------
    // Phase 4: 90-Day Horizon
    // -------------------------------------------------------------------------
    const phase4: RoadmapPhase = {
      phaseId: 'phase_lt_90d',
      horizon: 'LONG_TERM_90_DAYS',
      title: 'Scale Proven Channels & Unit Economics Hardening',
      strategicObjective: 'Expand highest-ROI validated channels and achieve sustainable cash-flow positive flywheel.',
      expectedBusinessOutcome: `Scale ${context.businessName} to steady-state MRR with LTV:CAC >= 4.0x.`,
      keyMilestones: [
        'Scale top 2 validated acquisition channels with dedicated budget',
        'Publish quarterly growth performance benchmark dossier',
      ],
      tasks: [],
      dependencies: ['phase_mt_60d'],
      requiredBudget: 25000,
      requiredHours: 25.0,
      exitCriteria: 'LTV:CAC >= 4.0x with sustained monthly net margin > 65%.',
    };

    const phases = [phase1, phase2, phase3, phase4];
    const allTasks = phases.flatMap((p) => p.tasks);

    // Resolve dependencies and blocked states
    const { resolvedTasks } = growthTaskEngine.resolveDependencies(allTasks);
    // Re-map resolved tasks back to phases
    for (const phase of phases) {
      phase.tasks = phase.tasks.map((t) => resolvedTasks.find((rt) => rt.taskId === t.taskId) || t);
    }

    const totalBudget = phases.reduce((acc, p) => acc + p.requiredBudget, 0);
    const totalHours = phases.reduce((acc, p) => acc + p.requiredHours, 0);

    return {
      roadmapId,
      version,
      workspaceId: context.workspaceId,
      executiveSummary: `Dynamic 30/60/90-Day Operational Roadmap for ${context.businessName} targeting ${diagnoses[0]?.problem || 'accelerated growth'} across 4 sequential horizons.`,
      phases,
      totalBudget,
      totalHours,
      capacityFeasibility: {
        isFeasible: totalHours <= context.founderCapacityHoursWeekly * 4,
        bottleneckReason:
          totalHours > context.founderCapacityHoursWeekly * 4
            ? `Total estimated workload (${totalHours}h) exceeds monthly founder availability.`
            : undefined,
      },
      changeSummary: version > 1 ? `Refreshed roadmap version ${version} adapting to latest diagnosis.` : 'Initial dynamic roadmap generation.',
      approvedAt: now,
      createdAt: now,
      updatedAt: now,
    };
  }
}

export const growthRoadmapEngine = new GrowthRoadmapEngine();
