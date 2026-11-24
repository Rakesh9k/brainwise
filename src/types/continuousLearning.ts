/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ExperimentOutcome = 'SUCCESS' | 'FAILURE' | 'INCONCLUSIVE' | 'MIXED';

export type ExperimentStrategy =
  | 'EDUCATIONAL_CONTENT'
  | 'DISCOUNT_PROMOTION'
  | 'DIRECT_RESPONSE'
  | 'INFLUENCER_COLLAB'
  | 'VALUE_DEMONSTRATION'
  | 'COMMUNITY_LED'
  | string;

export interface ExperimentBaselineMetrics {
  ctr?: number;
  cvr?: number;
  cpa?: number;
  roas?: number;
  conversions?: number;
}

export interface ExperimentActualOutcomes {
  views?: number;
  clicks?: number;
  leads?: number;
  conversions?: number;
  revenue?: number;
  ctr?: number;
  cvr?: number;
  cpa?: number;
  roas?: number;
}

export interface BusinessExperimentEntity {
  experimentId: string;
  workspaceId: string;
  campaignName: string;
  businessObjective: string;
  hypothesis: string;
  targetAudience: string;
  strategy: ExperimentStrategy;
  channel: string;
  budget: number;
  cost: number;
  currency?: string;
  startDate: string;
  endDate: string;
  executionDate?: string;
  successCriteria: string;
  baselineMetrics: ExperimentBaselineMetrics;
  actualOutcomes: ExperimentActualOutcomes;
  dataSources: string[];
  attributionConfidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
  confidenceScore: number;
  sampleSizeAdequate: boolean;
  finalAssessment: ExperimentOutcome;
  lessonsLearned: string[];
  idempotencyKey?: string;
  connectedGoalId?: string;
  createdAt: string;
  updatedAt: string;
}

export type InsightCategory =
  | 'MESSAGING_PATTERN'
  | 'AUDIENCE_SEGMENT'
  | 'CHANNEL_EFFECTIVENESS'
  | 'PRODUCT_PERFORMANCE'
  | 'FAILED_STRATEGY'
  | 'SEASONAL_PATTERN'
  | 'OPERATIONAL_ISSUE'
  | 'RECURRING_OBJECTION'
  | 'SUCCESSFUL_CAMPAIGN_PATTERN'
  | 'UNDERPERFORMING_STRATEGY'
  | 'CHANNEL_PERFORMANCE'
  | 'COMMUNICATION_STYLE';

export type LearningConfidenceBand =
  'CONFIRMED' | 'HIGH' | 'MEDIUM' | 'LOW' | 'SUSPECTED' | 'STALE';

export type InsightStatus = 'ACTIVE' | 'SUPERSEDED' | 'DISMISSED' | 'STALE' | 'UNDER_REVIEW';

export interface InsightEvidenceItem {
  experimentId?: string;
  channel?: string;
  metricName?: string;
  value?: number | string;
  description: string;
  date?: string;
}

export interface UserInsightCorrection {
  correctedBy: string;
  correctedAt: string;
  note: string;
  originalInsight?: string;
}

export interface StructuredBusinessInsight {
  insightId?: string;
  patternId?: string;
  workspaceId: string;
  fingerprint?: string;
  category: InsightCategory;
  title: string;
  description?: string;
  insight?: string;
  supportingEvidence?: InsightEvidenceItem[];
  supportingExperiments?: Array<any>;
  source?: string[];
  timePeriod?: {
    startDate: string;
    endDate: string;
  };
  confidence: number; // 0.0 to 1.0
  confidenceBand: LearningConfidenceBand;
  sampleSize: number;
  sampleSizeAdequate?: boolean;
  businessRelevance?: 'HIGH' | 'MEDIUM' | 'LOW';
  limitations?: string;
  reviewDate?: string;
  status?: InsightStatus;
  isPermanentRule?: boolean;
  requiresApproval?: boolean;
  conflictingEvidenceDetected?: boolean;
  supersededBy?: string;
  userCorrection?: UserInsightCorrection;
  actionableRecommendation: string;
  tacticsToAvoid?: string[];
  version?: number;
  createdAt: string;
  updatedAt: string;
}

export interface StrategyPlanVariant {
  recommendedStrategy: string;
  primaryChannel: string;
  messagingApproach: string;
  tacticsToAvoid: string[];
  budgetAllocation: Record<string, number>;
  groundingInsights?: string[];
  rationale: string;
}

export interface LearningStrategyRecommendation {
  withLearning: StrategyPlanVariant;
  withoutLearning: StrategyPlanVariant;
  comparativeAnalysis: {
    keyDifferences: string[];
    expectedRiskReduction: string;
    lessonsApplied: number;
  };
}
