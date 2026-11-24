/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  AssetCategory,
  AssetSection,
  AssetType,
  UnifiedBrandAssetEntity,
} from './assetLibrary';

// =============================================================================
// 1. FACT PROVENANCE & CONFIDENCE TYPES
// =============================================================================

export type MetadataProvenanceSource =
  | 'USER_CONFIRMED'
  | 'AI_INFERRED'
  | 'BUSINESS_BRAIN'
  | 'SYSTEM_GENERATED';

export interface ProvenanceField<T> {
  value: T;
  source: MetadataProvenanceSource;
  confidence: number; // 0.0 to 1.0
  verifiedBy?: string;
  updatedAt: string;
}

// =============================================================================
// 2. MULTIMODAL ASSET UNDERSTANDING SCHEMAS
// =============================================================================

export interface ColorPaletteItem {
  hex: string;
  name?: string;
  percentage?: number;
  role: 'primary' | 'secondary' | 'accent' | 'background' | 'text';
}

export interface ExtractedOcrBlock {
  text: string;
  confidence: number;
  boundingBox?: { x: number; y: number; width: number; height: number };
  detectedLanguage?: string;
}

export interface MultimodalAssetUnderstanding {
  fileType: string;
  detectedMimeType: string;
  extractedText: string;
  ocrBlocks: ExtractedOcrBlock[];
  detectedObjects: string[];
  dominantColors: ColorPaletteItem[];
  backgroundColorHex?: string;
  isDarkTheme: boolean;
  visualStyle: 'Minimalist' | 'Bold & Vibrant' | 'Artisanal & Organic' | 'Corporate' | 'Luxury & Editorial' | 'Playful';
  layoutComposition: 'Centered' | 'Grid' | 'Split' | 'Hero Product' | 'Typography Focused' | 'Multi-Panel';
  transparencyDetected: boolean;
  textDensity: 'Low' | 'Medium' | 'High';
}

// =============================================================================
// 3. AUTOMATIC CLASSIFICATION SCHEMA
// =============================================================================

export interface AssetAutomaticClassification {
  assetType: AssetType;
  category: AssetCategory;
  relevantSection: AssetSection;
  productAssociation?: {
    productId: string;
    productName: string;
    sku?: string;
    confidence: number;
  };
  brandAssociation?: {
    brandId: string;
    brandName: string;
    confidence: number;
  };
  campaignAssociation?: {
    campaignId?: string;
    campaignTheme?: string;
    seasonalTag?: string;
  };
  platform: 'Instagram' | 'Facebook' | 'LinkedIn' | 'Print' | 'Packaging' | 'Web' | 'Omnichannel';
  visualStyle: string;
  contentSubject: 'Product Hero' | 'Packaging Label' | 'Brand Logo' | 'Social Banner' | 'Infographic' | 'Collateral' | 'Document';
  intendedUsage: 'Social Feed' | 'Print Collateral' | 'Packaging Production' | 'Digital Ads' | 'Brand Standards' | 'Internal';
  confidence: number;
  provenance: MetadataProvenanceSource;
  humanOverrideApplied: boolean;
}

// =============================================================================
// 4. EXTRACTED METADATA & QUALITY SCHEMAS
// =============================================================================

export interface ExtractedAiMetadata {
  title: string;
  description: string;
  tags: string[];
  keywords: string[];
  visualConcepts: string[];
  suggestedHeadline?: string;
  usageRecommendations: string[];
  confidence: number;
  provenance: MetadataProvenanceSource;
}

export interface AssetQualityIntelligence {
  overallScore: number; // 0 - 100
  resolutionDpi: number;
  dimensionsWidth: number;
  dimensionsHeight: number;
  aspectRatio: string;
  isHighResolution: boolean;
  textReadabilityScore: number; // 0 - 100
  transparencyOptimal: boolean;
  productionSuitability: 'print_ready' | 'web_ready' | 'social_ready' | 'needs_enhancement' | 'unsuitable';
  issues: Array<{
    code: string;
    severity: 'info' | 'warning' | 'critical';
    message: string;
    suggestedFix: string;
  }>;
}

// =============================================================================
// 5. PERCEPTUAL HASH & SIMILARITY SCHEMAS
// =============================================================================

export interface PerceptualFingerprint {
  /** 64-bit difference hash represented as 16-character hex string */
  dHashHex: string;
  /** Color structure vector representation */
  colorVector: [number, number, number]; // Normalized R, G, B
  /** Dense semantic embedding vector (16-dim normalized array for lightweight cosine search) */
  semanticEmbedding: number[];
}

export type DuplicateType =
  | 'EXACT_DUPLICATE'
  | 'NEAR_DUPLICATE'
  | 'SIMILAR_STYLE'
  | 'NONE';

export interface DuplicateCheckResult {
  duplicateType: DuplicateType;
  matchedAssetId?: string;
  matchedAssetName?: string;
  similarityScore: number; // 0.0 to 1.0
  sha256Match: boolean;
  perceptualDistance: number; // Hamming distance 0 to 64
  recommendation: 'REJECT_UPLOAD' | 'LINK_AS_VERSION' | 'FLAG_FOR_REVIEW' | 'KEEP_BOTH';
  reason: string;
  affectedCampaignIds?: string[];
  affectedProductIds?: string[];
}

export interface VisualSimilarityMatch {
  assetId: string;
  name: string;
  similarityScore: number;
  hammingDistance: number;
  matchType: 'IDENTICAL_CHECKSUM' | 'PERCEPTUAL_NEAR_MATCH' | 'STYLE_SIMILAR';
}

// =============================================================================
// 6. SEMANTIC SEARCH & HYBRID RETRIEVAL SCHEMAS
// =============================================================================

export interface SemanticAssetSearchQuery {
  workspaceId: string;
  query: string;
  section?: AssetSection;
  category?: AssetCategory;
  productId?: string;
  campaignId?: string;
  tags?: string[];
  platform?: string;
  visualStyle?: string;
  isDarkTheme?: boolean;
  minQualityScore?: number;
  onlyApproved?: boolean;
  limit?: number;
}

export interface SemanticAssetSearchResultItem {
  asset: UnifiedBrandAssetEntity;
  relevanceScore: number; // 0.0 to 1.0
  matchReasons: string[];
  similarityMetrics: {
    textScore: number;
    semanticScore: number;
    visualScore: number;
    metadataScore: number;
  };
}

// =============================================================================
// 7. ASSET RECOMMENDATION SCHEMAS
// =============================================================================

export interface AssetRecommendationRequest {
  workspaceId: string;
  campaignBrief?: string;
  productId?: string;
  targetChannel?: 'Instagram' | 'Facebook' | 'LinkedIn' | 'Print' | 'Packaging' | 'Web';
  businessObjective?: 'Brand Awareness' | 'Conversion / Sales' | 'Festive Launch' | 'Retention' | 'Pre-Press Production';
  audience?: string;
  limit?: number;
}

export interface AssetRecommendationItem {
  asset: UnifiedBrandAssetEntity;
  recommendationScore: number; // 0 to 100
  rationale: string;
  scoringBreakdown: {
    relevance: number;
    brandAlignment: number;
    channelSuitability: number;
    quality: number;
  };
  suggestedPlacements: string[];
}

// =============================================================================
// 8. ASSET RELATIONSHIP GRAPH SCHEMAS
// =============================================================================

export interface AssetRelationshipGraph {
  assetId: string;
  workspaceId: string;
  connectedProducts: Array<{ productId: string; productName: string; sku?: string }>;
  connectedBrands: Array<{ brandId: string; brandName: string }>;
  connectedCampaigns: Array<{ campaignId: string; campaignName: string }>;
  connectedVersions: Array<{ versionId: string; versionNumber: number; isCurrent: boolean }>;
  visuallySimilarAssetIds: string[];
  derivedAssetIds: string[];
  parentAssetId?: string | null;
}

// =============================================================================
// 9. COMPLETE AGGREGATED ASSET ANALYSIS RESULT
// =============================================================================

export interface AssetAnalysisResult {
  assetId: string;
  workspaceId: string;
  analyzedAt: string;
  multimodal: MultimodalAssetUnderstanding;
  classification: AssetAutomaticClassification;
  metadata: ExtractedAiMetadata;
  quality: AssetQualityIntelligence;
  fingerprint: PerceptualFingerprint;
  brandCompliance?: {
    complianceScore: number;
    isCompliant: boolean;
    violations: string[];
    brandIdentityVersion: number;
  };
  relationships: AssetRelationshipGraph;
  needsHumanReview: boolean;
  aiModelUsed: string;
  creditsConsumed: number;
}

// =============================================================================
// 10. AI PROCESSING BACKGROUND JOB SCHEMAS
// =============================================================================

export type AiAssetJobType =
  | 'ANALYZE_ASSET'
  | 'GENERATE_METADATA'
  | 'CHECK_DUPLICATE'
  | 'EVALUATE_COMPLIANCE'
  | 'BATCH_REINDEX';

export type AiAssetJobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface AiAssetJobLogItem {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}

export interface AiAssetJobEntity {
  jobId: string;
  workspaceId: string;
  assetId: string;
  jobType: AiAssetJobType;
  status: AiAssetJobStatus;
  idempotencyKey?: string;
  attempts: number;
  maxRetries: number;
  creditsConsumed: number;
  modelUsed: string;
  inputPayload: Record<string, unknown>;
  result?: AssetAnalysisResult;
  error?: string;
  logs: AiAssetJobLogItem[];
  createdAt: string;
  updatedAt: string;
}
