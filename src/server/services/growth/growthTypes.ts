/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ============================================================================
// BRAINWISE GROWTH DIRECTOR & EXECUTION INTELLIGENCE SYSTEM — CORE TYPES
// ============================================================================

export type TimeHorizon = 'IMMEDIATE_7_DAYS' | 'SHORT_TERM_30_DAYS' | 'MEDIUM_TERM_60_DAYS' | 'LONG_TERM_90_DAYS';

export type GrowthDepartment = 'Marketing' | 'Sales' | 'Product' | 'Operations' | 'Finance' | 'Growth';

export type TaskLifecycleStatus =
  | 'PROPOSED'
  | 'VALIDATED'
  | 'APPROVED'
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'BLOCKED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REJECTED'
  | 'ARCHIVED';

export type TaskProvenance =
  | 'MARKET_WATCH'
  | 'COMPETITIVE_RADAR'
  | 'IDEA_INTELLIGENCE'
  | 'BUSINESS_BRAIN'
  | 'GROWTH_DIAGNOSIS'
  | 'GROWTH_OPPORTUNITY'
  | 'AI_RECOMMENDATION'
  | 'USER_CREATED'
  | 'EXISTING_EXPERIMENT';

export type FactProvenance = 'USER_CONFIRMED' | 'AI_INFERRED' | 'EXTERNALLY_VERIFIED' | 'UNVERIFIED';

export type EvidenceQuality =
  | 'DIRECTLY_MEASURED'
  | 'INDEPENDENTLY_VERIFIED'
  | 'USER_REPORTED'
  | 'INFERRED'
  | 'UNVERIFIED';

export type OutcomeClassification = 'POSITIVE' | 'NEGATIVE' | 'INCONCLUSIVE' | 'NEUTRAL';

export type AutonomyMode = 'ADVISORY' | 'ASSISTED_EXECUTION' | 'CONTROLLED_AUTONOMY';

// ----------------------------------------------------------------------------
// 1. Business Context Engine Models
// ----------------------------------------------------------------------------
export interface GrowthContextUnitEconomics {
  averageOrderValue: number;
  customerAcquisitionCost: number;
  customerLifetimeValue: number;
  monthlyBurnRate: number;
  grossMarginPercent: number;
  currency: string;
}

export interface AssembledGrowthContext {
  workspaceId: string;
  businessName: string;
  industry?: string;
  stage: 'Idea Stage' | 'Pre-Launch' | 'Early Traction' | 'Growing Business' | 'Established';
  businessModel: string;
  targetAudience: string;
  brandPositioning: string;
  valueProposition: string;
  revenueModel: string;
  unitEconomics: GrowthContextUnitEconomics;
  channels: string[];
  activeGoals: Array<{
    goalId: string;
    title: string;
    category: string;
    currentValue: number;
    targetValue: number;
    unit: string;
    deadline: string;
    status: string;
  }>;
  validatedFacts: Array<{
    key: string;
    value: string;
    provenance: FactProvenance;
    confidence: number;
  }>;
  nearestCompetitor: string;
  competitorWeaknesses: string[];
  marketSignalsCount: number;
  founderCapacityHoursWeekly: number;
  marketingBudgetMonthly: number;
  freshness: {
    lastSynchronizedAt: string;
    completenessPercent: number;
    missingCriticalFields: string[];
  };
}

// ----------------------------------------------------------------------------
// 2. Growth Diagnosis Engine Models
// ----------------------------------------------------------------------------
export type DiagnosisDimension =
  | 'AWARENESS'
  | 'AUDIENCE_QUALITY'
  | 'TRAFFIC'
  | 'LEAD_GENERATION'
  | 'LEAD_QUALIFICATION'
  | 'CONVERSION'
  | 'SALES'
  | 'REVENUE'
  | 'RETENTION'
  | 'REPEAT_PURCHASES'
  | 'REFERRALS'
  | 'CAC'
  | 'LTV'
  | 'GROSS_MARGIN'
  | 'OPERATIONAL_CAPACITY';

export type DiagnosisSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type BottleneckClassification =
  | 'CONFIRMED_BOTTLENECK'
  | 'PROBABLE_BOTTLENECK'
  | 'POTENTIAL_BOTTLENECK'
  | 'INSUFFICIENT_EVIDENCE';

export interface GrowthBottleneckDiagnosis {
  diagnosisId: string;
  dimension: DiagnosisDimension;
  problem: string;
  supportingEvidence: string[];
  affectedGoalIds: string[];
  likelyCauses: string[];
  alternativeExplanations: string[];
  severity: DiagnosisSeverity;
  confidence: number; // 0.0 - 1.0
  businessImpact: string;
  classification: BottleneckClassification;
  recommendedInvestigation: string;
  recommendedCorrectiveAction: string;
}

// ----------------------------------------------------------------------------
// 3. Growth Opportunity Models
// ----------------------------------------------------------------------------
export type GrowthOpportunityCategory =
  | 'CUSTOMER_ACQUISITION'
  | 'CONVERSION_OPTIMIZATION'
  | 'RETENTION'
  | 'REFERRAL_VIRALITY'
  | 'PRICING_POWER'
  | 'OPERATIONAL_EFFICIENCY'
  | 'MARKET_EXPANSION';

export interface GrowthOpportunityChannelRecommendation {
  channelName: string;
  strategicFitPercent: number;
  expectedCac: number;
  formatType: 'SVG_COLLATERAL' | 'OUTREACH_COPY' | 'CONTENT_PACK'; // Strict zero video
  timeToFirstCustomerDays?: number;
}

export interface GrowthOpportunityDetail {
  opportunityId: string;
  workspaceId: string;
  title: string;
  category: GrowthOpportunityCategory;
  summary: string;
  rationale: string;
  estimatedRevenueImpactMonthly: number;
  expectedCacReductionPercent?: number;
  implementationDifficulty: 'LOW' | 'MEDIUM' | 'HIGH';
  financialRequirement: number;
  timeToResultsDays: number;
  riskAssessment: {
    level: 'LOW' | 'MEDIUM' | 'HIGH';
    mitigationStrategy: string;
  };
  evidenceQuality: EvidenceQuality;
  recommendedChannels: GrowthOpportunityChannelRecommendation[];
  supportingEvidenceIds: string[];
  rankedScore: number;
  createdAt: string;
}

// ----------------------------------------------------------------------------
// 4. Prioritization & ICE Score Models
// ----------------------------------------------------------------------------
export interface IceScoreDetail {
  impact: number;      // 1 - 10
  confidence: number;  // 1 - 10
  ease: number;        // 1 - 10
  rawComposite: number; // impact * confidence * ease (1 - 1000)
  urgencyModifier: number;        // 0.8 - 1.2
  goalAlignmentModifier: number;  // 0.8 - 1.2
  feasibilityModifier: number;    // 0.8 - 1.2
  finalWeightedScore: number;     // rawComposite * modifiers
  scoringExplanation: string;
  confidenceClassification: 'HIGH' | 'MEDIUM' | 'LOW';
  evaluatedAt: string;
}

// ----------------------------------------------------------------------------
// 5. Structured Task Models
// ----------------------------------------------------------------------------
export interface StructuredGrowthTask {
  taskId: string;
  workspaceId: string;
  title: string;
  description: string;
  actionVerb: string;
  executionSteps: string[];
  department: GrowthDepartment;
  timeHorizon: TimeHorizon;
  provenance: TaskProvenance;
  sourceEntityId?: string;
  relatedGoalIds: string[];
  relatedOpportunityIds: string[];
  relatedExperimentIds: string[];
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  iceScore: IceScoreDetail;
  expectedOutcome: string;
  successMetrics: {
    metricName: string;
    baselineValue: number;
    targetValue: number;
    unit: string;
  };
  completionCriteria: string;
  estimatedDurationMinutes: number;
  actualDurationMinutes?: number;
  requiredBudget: number;
  requiredSkills: string[];
  suggestedTools: string[];
  dependencies: string[];
  blockedByTaskIds: string[];
  status: TaskLifecycleStatus;
  scheduledDate?: string;
  deadline: string;
  completedAt?: string;
  outcomeMet?: boolean;
  executionOutcomeNotes?: string;
  actualExpenditure?: number;
  createdAt: string;
  updatedAt: string;
}

// ----------------------------------------------------------------------------
// 6. Resource & Capacity Models
// ----------------------------------------------------------------------------
export interface ResourceCapacityProfile {
  founderWorkingHoursPerDay: number;
  availableDaysPerWeek: number;
  weeklyTotalHours: number;
  teamSize: number;
  monthlyMarketingBudget: number;
  committedHoursWeekly: number;
  availableHoursWeekly: number;
  utilizationPercent: number;
  isOverloaded: boolean;
  overloadWarning?: string;
}

// ----------------------------------------------------------------------------
// 7. Dynamic Roadmap Models
// ----------------------------------------------------------------------------
export interface RoadmapPhase {
  phaseId: string;
  horizon: TimeHorizon;
  title: string;
  strategicObjective: string;
  expectedBusinessOutcome: string;
  keyMilestones: string[];
  tasks: StructuredGrowthTask[];
  dependencies: string[];
  requiredBudget: number;
  requiredHours: number;
  exitCriteria: string;
}

export interface AdaptiveRoadmapVersion {
  roadmapId: string;
  version: number;
  workspaceId: string;
  executiveSummary: string;
  phases: RoadmapPhase[];
  totalBudget: number;
  totalHours: number;
  capacityFeasibility: {
    isFeasible: boolean;
    bottleneckReason?: string;
  };
  changeSummary?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ----------------------------------------------------------------------------
// 8. Experiment & Kill Switch Models
// ----------------------------------------------------------------------------
export type ExperimentLifecycleStatus =
  | 'DRAFT'
  | 'VALIDATED'
  | 'PLANNED'
  | 'APPROVED'
  | 'ACTIVE'
  | 'PAUSED'
  | 'COMPLETED'
  | 'ABORTED'
  | 'INCONCLUSIVE';

export type ExperimentHypothesisEvaluation =
  | 'HYPOTHESIS_SUPPORTED'
  | 'HYPOTHESIS_REJECTED'
  | 'INCONCLUSIVE'
  | 'EXECUTION_FAILURE'
  | 'MEASUREMENT_FAILURE'
  | 'EXTERNAL_DISRUPTION';

export interface KillSwitchCriteria {
  minSampleSize: number;
  currentSampleSize: number;
  stopThresholdValue: number;
  metricName: string;
  comparison: 'LESS_THAN' | 'GREATER_THAN';
  budgetCap: number;
  currentExpenditure: number;
  isTriggered: boolean;
  triggeredReason?: string;
}

export interface StructuredGrowthExperiment {
  experimentId: string;
  workspaceId: string;
  title: string;
  hypothesis: string;
  businessObjective: string;
  problemBeingTested: string;
  targetAudience: string;
  channel: string;
  proposedIntervention: string;
  baselineMetric: {
    metricName: string;
    value: number;
    unit: string;
  };
  primaryMetric: {
    metricName: string;
    targetValue: number;
    unit: string;
  };
  secondaryMetrics: Array<{
    metricName: string;
    targetValue: number;
    unit: string;
  }>;
  expectedOutcome: string;
  minMeaningfulResult: string;
  budgetCap: number;
  currentExpenditure: number;
  startDate: string;
  endDate: string;
  killSwitch: KillSwitchCriteria;
  dependencies: string[];
  ownerId: string;
  status: ExperimentLifecycleStatus;
  hypothesisEvaluation?: ExperimentHypothesisEvaluation;
  evidenceNotes?: string;
  lessonsLearned?: string;
  createdAt: string;
  updatedAt: string;
}

// ----------------------------------------------------------------------------
// 9. Strategic Memory & Closed-Loop Learning Models
// ----------------------------------------------------------------------------
export type MemoryCategory =
  | 'CHANNEL_MEMORY'
  | 'AUDIENCE_MEMORY'
  | 'OFFER_MEMORY'
  | 'CREATIVE_ANGLE_MEMORY'
  | 'CAMPAIGN_FORMAT_MEMORY'
  | 'EXPERIMENT_MEMORY'
  | 'GROWTH_LEARNING'
  | 'OPERATIONAL_LEARNING'
  | 'FINANCIAL_LEARNING'
  | 'MARKET_COMPETITIVE_LEARNING';

export interface CategorizedStrategicMemoryRecord {
  memoryId: string;
  workspaceId: string;
  category: MemoryCategory;
  entityId: string;
  theme: string;
  observation: string;
  hypothesis?: string;
  outcomeClassification: OutcomeClassification;
  executionSuccess: boolean;
  evidenceQuality: EvidenceQuality;
  sampleSize?: number;
  confidenceScore: number; // 0.0 - 1.0 bounded
  applicabilityConditions: string[];
  fatigueScore: number; // count of consecutive occurrences/failures
  isFatigued: boolean;
  createdAt: string;
  lastValidatedAt: string;
  version: number;
}

// ----------------------------------------------------------------------------
// 10. Financial & Scenario Simulation Models
// ----------------------------------------------------------------------------
export interface GrowthScenarioProjection {
  scenarioName: 'Conservative' | 'Expected' | 'Optimistic';
  projectedRevenueMonthly: number;
  projectedMarketingCostMonthly: number;
  projectedGrossProfitMonthly: number;
  projectedNewCustomersMonthly: number;
  effectiveCac: number;
  estimatedRoas: number;
  breakEvenCustomersRequired: number;
  keyAssumptions: string[];
}

export interface GrowthScenarioSimulationResult {
  simulationId: string;
  workspaceId: string;
  currency: string;
  baseline: {
    monthlyRevenue: number;
    customerAcquisitionCost: number;
    conversionRatePercent: number;
    monthlyBudget: number;
  };
  scenarios: {
    conservative: GrowthScenarioProjection;
    expected: GrowthScenarioProjection;
    optimistic: GrowthScenarioProjection;
  };
  sensitivityFactor: string;
  confidenceDisclaimer: string;
  generatedAt: string;
}

// ----------------------------------------------------------------------------
// 11. Growth Risk Monitor Models
// ----------------------------------------------------------------------------
export type GrowthRiskType =
  | 'DECLINING_REVENUE'
  | 'INCREASING_CAC'
  | 'FALLING_CONVERSION'
  | 'CHANNEL_CONCENTRATION'
  | 'CAPACITY_OVERLOAD'
  | 'BUDGET_EXHAUSTION'
  | 'UNVALIDATED_EXPANSION';

export interface GrowthRiskAlert {
  alertId: string;
  workspaceId: string;
  riskType: GrowthRiskType;
  severity: DiagnosisSeverity;
  evidence: string;
  potentialConsequence: string;
  recommendedAction: string;
  detectedAt: string;
}

export interface WhatNotToDoRecommendation {
  recommendationId: string;
  workspaceId: string;
  actionType: 'STOP' | 'AVOID' | 'POSTPONE';
  activityTitle: string;
  reasoning: string;
  resourceFreedUp: string;
  alternativePriority: string;
  createdAt: string;
}

// ----------------------------------------------------------------------------
// 12. Complete AI Growth Agency Models (Phases 1 - 16)
// ----------------------------------------------------------------------------

export type BusinessModelType =
  | 'SAAS'
  | 'D2C'
  | 'ECOMMERCE'
  | 'RESTAURANT_FOOD'
  | 'SALON_SERVICES'
  | 'MARKETPLACE'
  | 'PROFESSIONAL_SERVICES'
  | 'MANUFACTURING_B2B'
  | 'PRE_LAUNCH_STARTUP';

export type GrowthStageType =
  | 'IDEA_PRELAUNCH'
  | 'DEMAND_VALIDATION'
  | 'FIRST_CUSTOMERS'
  | 'EARLY_TRACTION'
  | 'REPEATABLE_GROWTH'
  | 'SCALING'
  | 'MARKET_EXPANSION';

export type MissionLifecycleStatus =
  | 'DRAFT'
  | 'PROPOSED'
  | 'APPROVED'
  | 'PLANNED'
  | 'READY'
  | 'IN_PROGRESS'
  | 'BLOCKED'
  | 'REVIEW'
  | 'COMPLETED'
  | 'VERIFIED'
  | 'PAUSED'
  | 'CANCELLED'
  | 'FAILED'
  | 'ARCHIVED';

export type GrowthDepartmentType =
  | 'Marketing'
  | 'Content'
  | 'Acquisition'
  | 'Conversion'
  | 'Retention'
  | 'Partnerships'
  | 'Economics'
  | 'Orchestration';

export interface GrowthMissionEntity {
  missionId: string;
  workspaceId: string;
  strategyId?: string;
  objectiveId?: string;
  title: string;
  strategicRationale: string;
  department: GrowthDepartmentType;
  targetAudience: string;
  timeHorizon: '7_DAYS' | '30_DAYS' | '90_DAYS';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  budgetCap: number;
  currentExpenditure: number;
  startDate: string;
  endDate: string;
  ownerId: string;
  approvalRequired: boolean;
  isApproved: boolean;
  approvedBy?: string;
  approvedAt?: string;
  status: MissionLifecycleStatus;
  successCriteria: Array<{
    metricName: string;
    baselineValue: number;
    targetValue: number;
    unit: string;
  }>;
  taskIds: string[];
  experimentIds: string[];
  deliverableIds: string[];
  actualOutcomes?: {
    verifiedAt: string;
    metricsAchieved: Record<string, number>;
    summaryNotes: string;
    strategicLearnings: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface GrowthStrategyEntity {
  strategyId: string;
  workspaceId: string;
  version: number;
  title: string;
  strategicObjective: string;
  businessRationale: string;
  supportingEvidence: string[];
  targetCustomerSegment: string;
  primaryGrowthChannel: string;
  executionApproach: 'ORGANIC_LED' | 'OUTBOUND_LED' | 'PAID_ACQUISITION' | 'PARTNERSHIP_LED' | 'PRODUCT_LED';
  requiredBudgetMonthly: number;
  expectedTimeframeWeeks: number;
  successMetrics: Array<{
    metricName: string;
    targetValue: number;
    unit: string;
  }>;
  risksAndMitigations: Array<{
    risk: string;
    mitigation: string;
  }>;
  alternativeApproaches: string[];
  status: 'DRAFT' | 'ACTIVE' | 'SUPERSEDED' | 'ARCHIVED';
  approvedAt?: string;
  approvedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export type ExecutionJobStatus =
  | 'QUEUED'
  | 'AWAITING_APPROVAL'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'TIMED_OUT';

export interface GrowthExecutionJob {
  jobId: string;
  workspaceId: string;
  missionId?: string;
  taskId?: string;
  actionType:
    | 'DISPATCH_OUTREACH_EMAIL'
    | 'SCHEDULE_SOCIAL_POST'
    | 'PUBLISH_EXPERIMENT_VARIANT'
    | 'SYNC_ANALYTICS_DATA'
    | 'NOTIFY_FOUNDER_ALERT';
  level: 1 | 2 | 3;
  idempotencyKey: string;
  payload: Record<string, unknown>;
  requiresApproval: boolean;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  status: ExecutionJobStatus;
  retryCount: number;
  maxRetries: number;
  executionReceipt?: {
    receiptId?: string;
    executionMode?: 'PROVIDER_VERIFIED' | 'SIMULATED_SANDBOX';
    providerName: string;
    providerTransactionId: string;
    status?: string;
    dispatchedAt: string;
    responsePayload?: Record<string, unknown>;
    isSimulated?: boolean;
    simulationNotice?: string;
    reconciliationStatus?: 'VERIFIED' | 'PENDING_CONFIRMATION' | 'FAILED_RECONCILIATION';
    externalDeliveryConfirmation?: {
      confirmedAt: string;
      deliveredCount?: number;
      bounceCount?: number;
      receiptSignature?: string;
    };
  };
  errorHistory: Array<{
    attemptNumber: number;
    errorMessage: string;
    occurredAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface WhatIfScenarioModel {
  scenarioId: string;
  workspaceId: string;
  name: string;
  description: string;
  hypothesis: string;
  inputs: {
    monthlyMarketingBudget: number;
    targetPrice: number;
    expectedConversionRate: number;
    targetCac: number;
    primaryChannel: string;
  };
  projections: {
    baseCase: {
      monthlyRevenue: number;
      customersAcquired: number;
      grossProfit: number;
      contributionProfit?: number;
      netCashFlow?: number;
      roas: number;
      paybackMonths: number;
    };
    bestCase: {
      monthlyRevenue: number;
      customersAcquired: number;
      grossProfit: number;
      contributionProfit?: number;
      netCashFlow?: number;
      roas: number;
      paybackMonths: number;
    };
    downsideCase: {
      monthlyRevenue: number;
      customersAcquired: number;
      grossProfit: number;
      contributionProfit?: number;
      netCashFlow?: number;
      roas: number;
      paybackMonths: number;
    };
  };
  financialMetrics?: {
    ltv: number;
    maxAffordableCac: number;
    ltvCacRatio: number;
    contributionMarginPercent: number;
  };
  sensitivityBreakdown?: {
    primaryDriver: string;
    cacElasticity: number;
    conversionElasticity: number;
    uncertaintyRating: 'LOW' | 'MEDIUM' | 'HIGH';
    confidenceScore: number;
  };
  sensitivityFactor: string;
  confidenceDisclaimer: string;
  isConvertedToMission: boolean;
  convertedMissionId?: string;
  createdAt: string;
}
