/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type EvidenceClassification =
  | 'VERIFIED'
  | 'CORROBORATED'
  | 'ESTIMATED'
  | 'UNVERIFIED';

export type EvidenceDepartment =
  | 'IDEA'
  | 'MARKET'
  | 'COMPETITIVE'
  | 'FINANCIAL'
  | 'BRAND'
  | 'GROWTH'
  | 'WATCH';

export type EvidenceFindingSourceType =
  | 'OFFICIAL_WEBSITE'
  | 'INDUSTRY_REPORT'
  | 'GOVERNMENT_PUBLICATION'
  | 'REGULATORY_SOURCE'
  | 'PUBLIC_MARKET_DATA'
  | 'SEARCH_RESULTS'
  | 'COMMUNITY_DISCUSSION'
  | 'CUSTOMER_REVIEWS'
  | 'NEWS_PUBLICATION'
  | 'PRODUCT_DOCUMENTATION'
  | 'PUBLIC_DIRECTORY';

export interface EvidenceFinding {
  findingId: string;
  workspaceId: string;
  topic: string;
  sourceTitle: string;
  sourceUrl: string;
  sourceType: EvidenceFindingSourceType;
  publicationDate?: string;
  retrievalDate: string;
  extractedEvidence: string;
  quoteOrSummary: string;
  geographicRelevance: string;
  evidenceConfidence: number;
  classification: EvidenceClassification;
  relatedDepartment: EvidenceDepartment;
  contradictionNotes?: string;
  relatedEntityIds?: string[];
  extractedMetrics?: Record<string, string | number>;
}

export interface ContradictionReport {
  topic: string;
  metricOrClaim: string;
  hasContradiction: boolean;
  conflictingFindings: EvidenceFinding[];
  dateComparison: {
    newestDate?: string;
    oldestDate?: string;
    recencyAdvantageFindingId?: string;
  };
  credibilityComparison: {
    highestCredibilityFindingId?: string;
    explanation: string;
  };
  geographicDifference?: {
    findingIdA: string;
    geoA: string;
    findingIdB: string;
    geoB: string;
    explanation: string;
  };
  methodologyDifference?: string;
  reconciliationVerdict: string;
  recommendedPresentation: 'FLAG_DISAGREEMENT' | 'PREFER_NEWER' | 'PREFER_AUTHORITATIVE' | 'PRESENT_RANGE';
}

export interface EvidenceGraphEdge {
  edgeId: string;
  workspaceId: string;
  sourceNodeId: string;
  sourceNodeType:
    | 'BUSINESS'
    | 'COMPETITOR'
    | 'CUSTOMER'
    | 'PROBLEM'
    | 'TREND'
    | 'PRODUCT'
    | 'PRICING'
    | 'OPPORTUNITY'
    | 'RISK'
    | 'FINDING'
    | 'DECISION';
  targetNodeId: string;
  targetNodeType:
    | 'BUSINESS'
    | 'COMPETITOR'
    | 'CUSTOMER'
    | 'PROBLEM'
    | 'TREND'
    | 'PRODUCT'
    | 'PRICING'
    | 'OPPORTUNITY'
    | 'RISK'
    | 'FINDING'
    | 'DECISION';
  relationshipType: 'VALIDATES' | 'CONTRADICTS' | 'IMPACTS' | 'SOLVES' | 'ORIGINATES_FROM' | 'INFLUENCES';
  confidence: number;
  description: string;
  createdAt: string;
}
