/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { StandardDepartmentType } from './brainwise';

export type GrowthOpportunityCategory = 'REVENUE' | 'MARKETING' | 'CUSTOMER' | 'OPERATIONAL_RISK';

export type GrowthOpportunityType =
  // Revenue opportunities
  | 'UNDER_PROMOTED_PRODUCT'
  | 'UPSELLING'
  | 'CROSS_SELLING'
  | 'NEW_CUSTOMER_SEGMENT'
  | 'NEW_MARKET_EXPANSION'
  | 'PRICING_OPTIMIZATION'
  // Marketing opportunities
  | 'UNDERUTILIZED_CHANNEL'
  | 'MISSING_CAMPAIGN_COVERAGE'
  | 'WEAK_CUSTOMER_TARGETING'
  | 'COMPETITOR_DIFFERENTIATION'
  | 'SEASONAL_CAMPAIGN'
  | 'CONTENT_OPPORTUNITY'
  // Customer opportunities
  | 'REPEAT_CUSTOMER_EXPANSION'
  | 'RETENTION_RISK'
  | 'CUSTOMER_OBJECTION'
  | 'UNSERVED_SEGMENT'
  | 'FEEDBACK_PATTERN'
  // Operational risks
  | 'CAPACITY_CONSTRAINT'
  | 'INCONSISTENT_PRICING'
  | 'MISSING_BUSINESS_POLICY'
  | 'PRODUCT_AVAILABILITY'
  | 'UNVERIFIED_CLAIM';

export type RadarLifecycleState =
  | 'DETECTED'
  | 'EVALUATING'
  | 'READY'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'DEFERRED'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'EVALUATED'
  | 'EXPIRED';

export interface OpportunityScoreWeights {
  businessImpact: number; // default 0.30 (30%)
  goalAlignment?: number; // default 0.25 (25%)
  strategicAlignment?: number; // default 0.25
  evidenceConfidence: number; // default 0.20 (20%)
  feasibility: number; // default 0.15 (15%)
  costEfficiency: number; // default 0.10 (10%)
}

export const DEFAULT_OPPORTUNITY_WEIGHTS: OpportunityScoreWeights = {
  businessImpact: 0.3,
  goalAlignment: 0.25,
  strategicAlignment: 0.25,
  evidenceConfidence: 0.2,
  feasibility: 0.15,
  costEfficiency: 0.1,
};

export interface OpportunitySupportingEvidence {
  sourceId: string;
  sourceType:
    | 'PRODUCT'
    | 'SERVICE'
    | 'GOAL'
    | 'COMPETITOR'
    | 'AUDIENCE'
    | 'CAMPAIGN'
    | 'METRIC'
    | 'DOCUMENT'
    | 'PROFILE'
    | 'MARKET';
  title: string;
  confidence: number;
  detail: string;
  verifiedAt?: string;
}

export interface GrowthRadarOpportunity {
  opportunityId: string;
  workspaceId: string;
  category: GrowthOpportunityCategory;
  type: GrowthOpportunityType;
  title: string;
  description: string;
  potentialImpact: string;
  opportunityScore: number; // 0 - 100
  rawFactors: {
    businessImpact: number; // 0 - 100
    goalAlignment: number; // 0 - 100
    evidenceConfidence: number; // 0 - 100
    feasibility: number; // 0 - 100
    costEfficiency: number; // 0 - 100
  };
  factorContributions: {
    businessImpact: number;
    goalAlignment: number;
    evidenceConfidence: number;
    feasibility: number;
    costEfficiency: number;
  };
  confidence: number; // 0 - 100
  confidenceBand: 'HIGH' | 'MEDIUM' | 'LOW';
  supportingEvidence: OpportunitySupportingEvidence[];
  estimatedEffort: 'LOW' | 'MEDIUM' | 'HIGH';
  requiredBudget: {
    amount?: number;
    currency?: string;
    isEstimate: boolean;
    note?: string;
  };
  relevantDepartment: StandardDepartmentType | string;
  dependencies: string[];
  recommendedAction: string;
  lifecycleState: RadarLifecycleState;
  lifecycleHistory: Array<{
    state: RadarLifecycleState;
    timestamp: string;
    actorId?: string;
    note?: string;
  }>;
  assignedToUserId?: string;
  assignedDepartmentTaskId?: string;
  rejectionReason?: string;
  deferredUntil?: string;
  expirationDate: string;
  rediscoveredCount: number;
  evidenceFingerprint: string;
  isBottleneck?: boolean;
  isRisk?: boolean;
  disclaimer: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface GrowthRadarSummary {
  workspaceId: string;
  totalOpportunities: number;
  readyCount: number;
  highPriorityCount: number;
  risksCount: number;
  bottlenecksCount: number;
  highestPriorityOpportunities: GrowthRadarOpportunity[];
  emergingOpportunities: GrowthRadarOpportunity[];
  businessRisks: GrowthRadarOpportunity[];
  growthBottlenecks: GrowthRadarOpportunity[];
  byDepartment: Record<string, GrowthRadarOpportunity[]>;
  byCategory: Record<GrowthOpportunityCategory, number>;
  lastAnalyzedAt: string;
}

export const GROWTH_RADAR_DISCLAIMER =
  'Opportunity scores and impact bands indicate relative strategic alignment under current business assumptions and do NOT imply guaranteed revenue, conversion, or commercial success.';
