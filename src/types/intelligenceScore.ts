/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface IntelligenceScoreWeights {
  businessIdentity: number;
  productService: number;
  customerIntelligence: number;
  brandIntelligence: number;
  goalsStrategy: number;
  marketIntelligence: number;
  resourcesConstraints: number;
  dataVerificationFreshness: number;
}

export const DEFAULT_INTELLIGENCE_WEIGHTS: IntelligenceScoreWeights = {
  businessIdentity: 15,
  productService: 15,
  customerIntelligence: 15,
  brandIntelligence: 15,
  goalsStrategy: 15,
  marketIntelligence: 10,
  resourcesConstraints: 5,
  dataVerificationFreshness: 10,
};

export type IntelligenceDimensionKey = keyof IntelligenceScoreWeights;

export interface AccuracyIndicator {
  status: 'pass' | 'warning' | 'fail';
  metric: string;
  details: string;
}

export interface MissingCriticalInformationItem {
  field: string;
  description: string;
  severity: 'critical' | 'high' | 'recommended';
}

export interface DataQualityIssue {
  field: string;
  issue: string;
  recommendation: string;
  severity: 'warning' | 'alert';
}

export interface DimensionScoreDetail {
  dimensionKey: IntelligenceDimensionKey;
  name: string;
  weight: number;
  score: number; // 0 - 100
  weightedScore: number; // score * (weight / 100)
  completeness: number; // 0 - 100
  verificationCoverage: number; // 0 - 100
  freshness: number; // 0 - 100
  evidenceAvailability: number; // 0 - 100
  accuracyIndicators: AccuracyIndicator[];
  missingCriticalInformation: MissingCriticalInformationItem[];
  dataQualityIssues: DataQualityIssue[];
  staleWarnings: string[];
}

export interface IntelligenceImprovementRecommendation {
  id: string;
  title: string;
  description: string;
  dimension: IntelligenceDimensionKey;
  priority: 'critical' | 'high' | 'medium' | 'low';
  estimatedScoreImpact: number;
  actionType: 'navigate' | 'verify' | 'upload' | 'input';
  targetTab?: string;
  targetRoute?: string;
}

export type ScoreGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export type ReadinessLabel =
  | 'Fully Grounded'
  | 'Strategic Ready'
  | 'Partially Synced'
  | 'Baseline Grounding'
  | 'Action Required';

export interface ScoreDeltaInfo {
  previousScore: number;
  previousCalculatedAt: string;
  delta: number;
}

export interface BusinessIntelligenceScore {
  scoreId: string;
  workspaceId: string;
  version: number;
  calculatedAt: string;
  overallScore: number; // 0 - 100
  grade: ScoreGrade;
  readinessLabel: ReadinessLabel;
  summaryNarrative: string;
  weights: IntelligenceScoreWeights;
  dimensions: Record<IntelligenceDimensionKey, DimensionScoreDetail>;
  overallVerificationCoverage: number; // 0 - 100
  overallFreshnessScore: number; // 0 - 100
  criticalMissingCount: number;
  dataQualityIssuesCount: number;
  staleItemsCount: number;
  topRecommendations: IntelligenceImprovementRecommendation[];
  scoreDelta?: ScoreDeltaInfo;
  triggerEvent?: string;
}

export interface IntelligenceScoreHistoryEntry {
  scoreId: string;
  workspaceId: string;
  version: number;
  calculatedAt: string;
  overallScore: number;
  overallVerificationCoverage: number;
  overallFreshnessScore: number;
  dimensionScores: Record<string, number>;
  deltaFromPrevious?: number;
  triggerEvent: string;
}

export function validateAndNormalizeWeights(
  weights?: Partial<IntelligenceScoreWeights>
): IntelligenceScoreWeights {
  if (!weights) return { ...DEFAULT_INTELLIGENCE_WEIGHTS };

  const merged: IntelligenceScoreWeights = {
    businessIdentity: weights.businessIdentity ?? DEFAULT_INTELLIGENCE_WEIGHTS.businessIdentity,
    productService: weights.productService ?? DEFAULT_INTELLIGENCE_WEIGHTS.productService,
    customerIntelligence:
      weights.customerIntelligence ?? DEFAULT_INTELLIGENCE_WEIGHTS.customerIntelligence,
    brandIntelligence: weights.brandIntelligence ?? DEFAULT_INTELLIGENCE_WEIGHTS.brandIntelligence,
    goalsStrategy: weights.goalsStrategy ?? DEFAULT_INTELLIGENCE_WEIGHTS.goalsStrategy,
    marketIntelligence:
      weights.marketIntelligence ?? DEFAULT_INTELLIGENCE_WEIGHTS.marketIntelligence,
    resourcesConstraints:
      weights.resourcesConstraints ?? DEFAULT_INTELLIGENCE_WEIGHTS.resourcesConstraints,
    dataVerificationFreshness:
      weights.dataVerificationFreshness ?? DEFAULT_INTELLIGENCE_WEIGHTS.dataVerificationFreshness,
  };

  const total = Object.values(merged).reduce((a, b) => a + Math.max(0, b), 0);
  if (total === 0) return { ...DEFAULT_INTELLIGENCE_WEIGHTS };

  // Normalize so sum is exactly 100
  if (Math.abs(total - 100) > 0.001) {
    const keys = Object.keys(merged) as IntelligenceDimensionKey[];
    let running = 0;
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      if (i === keys.length - 1) {
        merged[k] = Math.max(0, 100 - running);
      } else {
        const normalized = Math.round((merged[k] / total) * 100);
        merged[k] = normalized;
        running += normalized;
      }
    }
  }

  return merged;
}
