/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// =============================================================================
// MODULE 1 — BUSINESS CONTEXT UNDERSTANDING
// =============================================================================

export interface DynamicResearchPlanItem {
  taskId: string;
  name: string;
  objective: string;
  category: 'context' | 'discovery' | 'product' | 'pricing' | 'positioning' | 'voice' | 'trends' | 'benchmarking' | 'strategy';
  dependencies: string[];
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
  executionModel: 'cheaper_classifier' | 'advanced_reasoner' | 'search_scraper';
}

export interface BusinessContextAnalysis {
  businessIdea: string;
  industry: string;
  subIndustry: string;
  category: string;
  targetGeography: string;
  customerSegments: string[];
  intendedBusinessModel: string[];
  pricePositioning: 'Budget' | 'Mid-Market' | 'Premium' | 'Luxury' | 'Ultra-Premium';
  distributionModel: string[];
  businessStage: 'Concept' | 'Pre-Launch' | 'Early Traction' | 'Scaling' | 'Established';
  potentialMarketSegments: string[];
  relevantAdjacentIndustries: string[];
  dynamicResearchPlan: DynamicResearchPlanItem[];
  analyzedAt: string;
}

// =============================================================================
// MODULE 2 — COMPETITOR DISCOVERY & RELEVANCE
// =============================================================================

export type CompetitorClassification =
  | 'DIRECT'
  | 'INDIRECT'
  | 'SUBSTITUTE'
  | 'EMERGING'
  | 'LOCAL'
  | 'REGIONAL'
  | 'NATIONAL'
  | 'INTERNATIONAL'
  | 'ASPIRATIONAL_BENCHMARK'
  | 'FUTURE_DISRUPTOR';

export interface CompetitorRelevanceScore {
  overallScore: number; // 0 - 100
  productSimilarity: number;
  customerOverlap: number;
  geographicOverlap: number;
  businessModelSimilarity: number;
  pricingOverlap: number;
  competitiveThreat: number;
  reasoning: string;
}

export interface DiscoveredCompetitor {
  competitorId: string;
  name: string;
  canonicalName: string;
  aliases: string[];
  website: string;
  headquarters: string;
  geography: string;
  businessCategory: string;
  productCategory: string;
  businessModel: string;
  targetAudience: string;
  marketPositioning: string;
  classification: CompetitorClassification;
  relevanceScore: CompetitorRelevanceScore;
  reasonForInclusion: string;
  discoverySource: string;
  evidenceIds: string[];
  confidence: number;
  isUserExcluded?: boolean;
  isUserMarkedImportant?: boolean;
  userClassificationOverride?: CompetitorClassification;
}

// =============================================================================
// MODULE 3, 4, 5 — COMPETITOR PROFILES, PRODUCTS & PRICING
// =============================================================================

export interface ProductCatalogItem {
  productId: string;
  name: string;
  category: string;
  description: string;
  price: string;
  normalizedPrice?: {
    amount: number;
    currency: string;
    unit: string;
  };
  features: string[];
  specifications?: Record<string, string>;
  qualityClaims: string[];
  packaging?: string;
  variants?: string[];
  industrySpecificAttributes?: Record<string, string | number | boolean>;
  isDifferentiated: boolean;
}

export interface NormalizedPricingTier {
  tierName: string;
  price: number;
  currency: string;
  billingPeriod: 'one_time' | 'monthly' | 'yearly' | 'per_unit' | 'per_weight';
  normalizedMonthlyEquivalent?: number;
  normalizedPerUnitAmount?: number;
  features: string[];
  targetSegment?: string;
  discountDetails?: string;
  observationDate: string;
  sourceUrl?: string;
}

export interface PricingObservation {
  observationId: string;
  competitorId: string;
  productNameOrTier: string;
  rawPrice: string;
  normalizedAmount: number;
  currency: string;
  unitType: 'item' | 'gram' | 'kg' | 'month' | 'year' | 'seat' | 'transaction';
  region: string;
  taxIncluded: boolean;
  observationDate: string;
  sourceUrl: string;
  confidence: number;
}

export interface CompetitorDetailedProfile {
  competitorId: string;
  workspaceId: string;
  companyName: string;
  canonicalName: string;
  website: string;
  country: string;
  headquarters: string;
  foundingYear?: number;
  leadershipInfo?: string;
  classification: CompetitorClassification;
  businessModel: string;
  productsAndServices: ProductCatalogItem[];
  targetSegments: string[];
  geographyServed: string;
  distributionChannels: string[];
  positioning: string;
  uniqueValueProposition: string;
  differentiators: string[];
  pricingTiers: NormalizedPricingTier[];
  priceRange: string;
  pricingObservations: PricingObservation[];
  scaleIndicators: {
    revenueVerified?: string;
    revenueEstimate?: string;
    fundingRounds?: string;
    totalFunding?: string;
    employeeRange?: string;
    publicGrowthSignals?: string[];
    factTypes: {
      revenue: 'VERIFIED' | 'ESTIMATED' | 'UNAVAILABLE';
      funding: 'VERIFIED' | 'ESTIMATED' | 'UNAVAILABLE';
    };
  };
  digitalPresence: {
    websiteClarityScore: number;
    primaryCta: string;
    estimatedSearchTrafficBand?: string;
    topOrganicKeywords?: string[];
    socialFootprint: Array<{
      channel: string;
      handle?: string;
      cadence?: string;
      estimatedFollowersBand?: string;
    }>;
    publicReviewAggregations: Array<{
      source: string;
      rating: string;
      reviewCount: string;
    }>;
  };
  customerSentiment: {
    score: number; // 0 - 100
    ratingSummary: string;
    commonPraises: string[];
    topComplaints: string[];
    sentimentDistribution: { positive: number; neutral: number; negative: number };
    painPointThemes: CustomerPainPointTheme[];
  };
  strengths: string[];
  weaknesses: string[];
  opportunitiesForUser: string[];
  potentialThreats: string[];
  isMonitored: boolean;
  monitoringFrequency: 'Daily' | 'Weekly' | 'Monthly';
  lastResearched: string;
  researchConfidence: number;
  evidenceIds: string[];
}

// =============================================================================
// MODULE 6, 7, 8, 9 — BRAND, MARKETING, VOICE & SEO
// =============================================================================

export interface BrandPositioningAnalysis {
  competitorId: string;
  companyName: string;
  archetype: string;
  tagline: string;
  usp: string;
  messagingThemes: string[];
  toneOfVoice: string;
  emotionalPositioning: string;
  visualIdentityCues: string[];
  trustSignals: string[];
  brandStorytellingAngle: string;
  overusedTropes: string[];
  differentiationOpportunities: string[];
}

export interface CustomerPainPointTheme {
  themeId: string;
  category: 'Product' | 'Service' | 'Pricing' | 'Delivery' | 'Support' | 'Onboarding';
  title: string;
  description: string;
  frequencyScore: number; // 0 - 100
  severityLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  affectedCompetitors: string[];
  sampleQuotes: Array<{
    quote: string;
    source: string;
    date?: string;
  }>;
  switchingMotivation: string;
  exploitableOpportunity: string;
}

export interface SeoAndDigitalFootprint {
  domain: string;
  estimatedVisibilityTier: 'Low' | 'Moderate' | 'High' | 'Dominant';
  searchIntentClusters: Array<{
    intent: string;
    keywords: string[];
    difficulty: 'Low' | 'Medium' | 'High';
  }>;
  contentGaps: string[];
  commercialSearchOpportunities: string[];
}

// =============================================================================
// MODULE 10, 11 — FINANCIAL SIGNALS, TRENDS & THREATS
// =============================================================================

export interface MarketTrendItem {
  trendId: string;
  title: string;
  description: string;
  trendPhase: 'EARLY_SIGNAL' | 'EMERGING' | 'GROWING' | 'ESTABLISHED' | 'DECLINING';
  evidenceSummary: string;
  drivingForces: string[];
  potentialImpactOnCategory: string;
  sourceUrls: string[];
  discoveredAt: string;
}

export interface EmergingThreatAssessment {
  threatId: string;
  threatTitle: string;
  description: string;
  competitorOrFactor: string;
  probability: 'LOW' | 'MEDIUM' | 'HIGH';
  businessImpact: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXISTENTIAL';
  timeHorizon: 'IMMEDIATE' | '3_TO_6_MONTHS' | '6_TO_12_MONTHS' | 'LONG_TERM';
  evidenceQuality: 'HIGH' | 'MODERATE' | 'LOW';
  recommendedResponse: string;
}

// =============================================================================
// MODULE 12 — BENCHMARKING & 2D POSITIONING
// =============================================================================

export interface BenchmarkingScoreDimension {
  score: number; // 0 - 100
  weight: number;
  reasoning: string;
  supportingEvidenceIds: string[];
  confidence: number;
}

export interface CompetitorBenchmarkingRecord {
  competitorId: string;
  companyName: string;
  dimensions: {
    productStrength: BenchmarkingScoreDimension;
    productDifferentiation: BenchmarkingScoreDimension;
    brandPositioning: BenchmarkingScoreDimension;
    pricingCompetitiveness: BenchmarkingScoreDimension;
    marketingExecution: BenchmarkingScoreDimension;
    digitalPresence: BenchmarkingScoreDimension;
    customerSatisfaction: BenchmarkingScoreDimension;
    distributionBreadth: BenchmarkingScoreDimension;
    innovationRate: BenchmarkingScoreDimension;
  };
  aggregateBenchmarkScore: number; // 0 - 100
  positioningCoordinates: {
    xPrice: number; // 0 (Budget) to 100 (Premium/Luxury)
    yDepthOrDiff: number; // 0 (Simple/Generic) to 100 (Deep/Specialized)
  };
  confidence: number;
}

export interface PositioningMatrixResult {
  userCoordinates: {
    xPrice: number;
    yDepthOrDiff: number;
    label: string;
  };
  competitors: Array<{
    competitorId: string;
    companyName: string;
    xPrice: number;
    yDepthOrDiff: number;
    euclideanDistance: number;
    category: CompetitorClassification;
    threatTier: 'Immediate Rival' | 'Adjacent Alternative' | 'Distant Player';
  }>;
  nearestCompetitor: string;
  nearestDistance: number;
  whitespaceOpportunities: string[];
  quadrantAnalysis: {
    userQuadrant: string;
    marketCrowding: 'DENSE' | 'MODERATE' | 'SPARSE' | 'UNCONTESTED';
    recommendation: string;
  };
}

// =============================================================================
// MODULE 13, 14 — OPPORTUNITY DETECTION & STRATEGIC RECOMMENDATIONS
// =============================================================================

export interface MarketOpportunity {
  opportunityId: string;
  name: string;
  description: string;
  targetCustomer: string;
  supportingEvidence: string[];
  competitorWeaknessesInvolved: string[];
  marketDemandSignals: string[];
  potentialDifferentiation: string;
  implementationComplexity: 'LOW' | 'MEDIUM' | 'HIGH';
  potentialCommercialImpact: 'MODERATE' | 'HIGH' | 'TRANSFORMATIVE';
  confidenceLevel: number;
  validationMethod: string;
  suggestedNextAction: string;
  priorityRank: number;
}

export interface StrategicRecommendation {
  recommendationId: string;
  title: string;
  category:
    | 'MARKET_ENTRY'
    | 'POSITIONING'
    | 'TARGET_AUDIENCE'
    | 'PRODUCT_STRATEGY'
    | 'PRICING_STRATEGY'
    | 'DISTRIBUTION'
    | 'MARKETING'
    | 'CUSTOMER_EXPERIENCE'
    | 'DIFFERENTIATION'
    | 'EXPANSION';
  whatToDo: string;
  whyToDoIt: string;
  evidencePoints: string[];
  expectedImpact: string;
  requiredEffort: 'LOW' | 'MEDIUM' | 'HIGH';
  risks: string[];
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  confidence: number;
  immediateNextAction: string;
  howToValidateSuccess: string;
}

// =============================================================================
// MODULE 15 — EVIDENCE AND FACT VERIFICATION
// =============================================================================

export type ClaimVerificationStatus =
  | 'VERIFIED'
  | 'CORROBORATED'
  | 'ESTIMATED'
  | 'INFERRED'
  | 'UNVERIFIED'
  | 'CONTRADICTED'
  | 'UNAVAILABLE';

export interface EvidenceClaimRecord {
  evidenceId: string;
  workspaceId: string;
  competitorId?: string;
  claim: string;
  sourceUrl: string;
  sourceName: string;
  sourceCategory:
    | 'OFFICIAL_WEBSITE'
    | 'PUBLIC_FILING'
    | 'INDUSTRY_REPORT'
    | 'NEWS_MEDIA'
    | 'CUSTOMER_REVIEW'
    | 'COMMUNITY_FORUM'
    | 'MARKETPLACE'
    | 'ESTIMATION_MODEL';
  collectionDate: string;
  publicationDate?: string;
  evidenceExcerpt: string;
  verificationStatus: ClaimVerificationStatus;
  confidence: number;
  sourceAuthority: number; // 0 - 100
  freshnessScore: number; // 0 - 100
  supportingResearchTaskId?: string;
}

// =============================================================================
// MODULE 18 — COMPREHENSIVE 24-SECTION REPORT
// =============================================================================

export interface ComprehensiveCompetitiveReport {
  reportId: string;
  workspaceId: string;
  generatedAt: string;
  businessIdeaInput: string;
  status: 'COMPLETED' | 'PARTIAL' | 'FAILED';
  modelUsed: string;
  creditsDeducted: number;
  sections: {
    s1_executiveSummary: string;
    s2_businessContext: BusinessContextAnalysis;
    s3_marketLandscape: string;
    s4_competitorDiscovery: {
      direct: DiscoveredCompetitor[];
      indirect: DiscoveredCompetitor[];
      substitute: DiscoveredCompetitor[];
      emerging: DiscoveredCompetitor[];
      benchmarks: DiscoveredCompetitor[];
    };
    s5_directCompetitorProfiles: CompetitorDetailedProfile[];
    s6_indirectCompetitorAnalysis: Array<{
      competitorName: string;
      classification: string;
      substitutionThreat: string;
      mitigationStrategy: string;
    }>;
    s7_productComparison: {
      comparisonMatrix: Array<{
        featureOrAttribute: string;
        userOffering: string;
        competitors: Record<string, string>;
      }>;
      productOpportunities: string[];
    };
    s8_pricingAnalysis: {
      priceBands: Array<{
        bandName: string;
        range: string;
        competitorsInBand: string[];
        crowding: string;
      }>;
      crowdedSegments: string[];
      pricingGaps: string[];
      discountPatterns: string[];
    };
    s9_brandPositioning: BrandPositioningAnalysis[];
    s10_marketingIntelligence: Array<{
      competitorName: string;
      channels: string[];
      messagingPillars: string[];
      repeatableTactics: string[];
    }>;
    s11_customerVoice: {
      overallSentimentSummary: string;
      painPointThemes: CustomerPainPointTheme[];
      topComplaintsSummary: string[];
      topPraisesSummary: string[];
    };
    s12_seoAndDigitalPresence: SeoAndDigitalFootprint[];
    s13_financialAndGrowthSignals: Array<{
      companyName: string;
      verifiedMetrics: string[];
      estimatedMetrics: string[];
      growthNarrative: string;
    }>;
    s14_marketTrends: MarketTrendItem[];
    s15_competitiveBenchmarking: CompetitorBenchmarkingRecord[];
    s16_positioningMap: PositioningMatrixResult;
    s17_customerPainPointMap: {
      highSeverityHighFrequency: string[];
      quickWinFixes: string[];
    };
    s18_marketOpportunities: MarketOpportunity[];
    s19_competitiveThreats: EmergingThreatAssessment[];
    s20_strategicRecommendations: StrategicRecommendation[];
    s21_validationExperiments: Array<{
      experimentName: string;
      hypothesis: string;
      testChannel: string;
      budgetEstimate: string;
      successThreshold: string;
      durationDays: number;
    }>;
    s22_sourcesAndEvidence: EvidenceClaimRecord[];
    s23_dataLimitations: string[];
    s24_researchConfidence: {
      overallScore: number;
      explanation: string;
      highConfidenceAreas: string[];
      lowerConfidenceAreas: string[];
    };
  };
}

// =============================================================================
// MODULE 16 — PERSISTENT KNOWLEDGE BASE & PROJECT ENTITY
// =============================================================================

export interface CompetitiveIntelligenceProjectEntity {
  projectId: string;
  workspaceId: string;
  businessPrompt: string;
  context: BusinessContextAnalysis;
  status: 'PENDING' | 'RESEARCHING' | 'ANALYZING' | 'COMPLETED' | 'FAILED';
  activeReportId?: string;
  competitorsCount: number;
  monitoredCount: number;
  lastRunAt: string;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// MODULE 24 — CONVERSATIONAL INTELLIGENCE ADVISOR
// =============================================================================

export interface CompetitiveAdvisorMessage {
  messageId: string;
  workspaceId: string;
  projectId: string;
  sender: 'user' | 'advisor';
  text: string;
  citedEvidence: Array<{
    claim: string;
    sourceName: string;
    sourceUrl: string;
    verificationStatus: ClaimVerificationStatus;
  }>;
  factProvenance: {
    verifiedFacts: string[];
    interpretations: string[];
    assumptions: string[];
  };
  suggestedFollowUps: string[];
  createdAt: string;
}

// =============================================================================
// MODULE 25 — PHASE 5 STRATEGY ENGINE CONTRACTS
// =============================================================================

export interface FeatureParityItem {
  capabilityName: string;
  category: 'CORE_QUALITY' | 'SPEED_FULFILLMENT' | 'CUSTOMER_EXPERIENCE' | 'TRANSPARENCY_TRUST' | 'B2B_CUSTOMIZATION';
  userStatus: 'SUPPORTED' | 'PARTIAL' | 'UNSUPPORTED';
  competitorStatus: 'SUPPORTED' | 'PARTIAL' | 'UNSUPPORTED';
  classification: 'USER_ADVANTAGE' | 'COMPETITOR_ADVANTAGE' | 'TABLE_STAKES_PARITY' | 'WHITESPACE_GAP';
  userFeatureDetail: string;
  competitorFeatureDetail: string;
  strategicSignificance: string;
}

export interface FeatureParityMatrix {
  workspaceId: string;
  competitorId: string;
  competitorName: string;
  overallAdvantageRatio: {
    userAdvantages: number;
    competitorAdvantages: number;
    tableStakes: number;
    whitespaceGaps: number;
  };
  features: FeatureParityItem[];
  strategicTakeaway: string;
}

export interface PricingTierComparison {
  competitorName: string;
  tierName: string;
  price: number;
  normalizedMonthlyPrice?: number;
}

export interface PricingGapAnalysis {
  workspaceId: string;
  userAveragePrice: number;
  userPriceRange: { min: number; max: number };
  competitorTiers: PricingTierComparison[];
  competitorAveragePrice: number;
  gapPercentage: number;
  pricingPosition: 'DISCOUNT_ENTRY' | 'VALUE_DISRUPTOR' | 'PARITY_TIER' | 'PREMIUM_TIER' | 'LUXURY_TIER';
  identifiedAnomalies: string[];
  recommendedPricingAction: string;
}

export interface VulnerableSegment {
  segmentId: string;
  competitorName: string;
  vulnerabilityType: 'DELIVERY_DELAYS' | 'OPAQUE_SOURCING' | 'PRICE_HIKES' | 'CUSTOMER_SUPPORT' | 'PROCUREMENT_FRICTION' | 'PRODUCT_STALENESS' | 'FEATURE_BLOAT';
  evidenceProof: string[];
  affectedAudience: string;
  acquisitionPlaybook: {
    playbookTitle: string;
    hookMessage: string;
    recommendedChannel: string;
    suggestedAssetFormat: 'STATIC_CAROUSEL' | 'PRINT_COLLATERAL' | 'OUTREACH_SEQUENCE' | 'RETARGETING_COPY';
  };
}

export interface CounterPositioningAngle {
  angleId: string;
  angleName: string;
  incumbentVulnerability: string;
  contrastStatement: string;
  targetAudience: string;
  suggestedCampaignFormat: 'STATIC_CAROUSEL' | 'PRINT_COLLATERAL' | 'OUTREACH_SEQUENCE' | 'RETARGETING_COPY';
  groundedProofPoint: string;
}

export interface ComprehensiveCompetitiveStrategy {
  workspaceId: string;
  analyzedAt: string;
  parityMatrix: FeatureParityMatrix;
  pricingGap: PricingGapAnalysis;
  vulnerableSegments: VulnerableSegment[];
  counterPositioningAngles: CounterPositioningAngle[];
  benchmarks: CompetitorBenchmarkingRecord[];
  positioningMatrix: PositioningMatrixResult;
  opportunities: MarketOpportunity[];
  recommendations: StrategicRecommendation[];
}
