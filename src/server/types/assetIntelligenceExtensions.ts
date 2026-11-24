/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { AssetCategory, AssetSection, UnifiedBrandAssetEntity } from './assetLibrary';

// =============================================================================
// 1. AI ASSET AUTOPILOT
// =============================================================================

export interface AutopilotExecutionResult {
  assetId: string;
  assignedSection: AssetSection;
  assignedCategory: AssetCategory;
  assignedCollections: string[];
  inferredTags: string[];
  associatedProductIds: string[];
  confidenceScore: number;
  reasoning: string;
  executedAt: string;
}

// =============================================================================
// 2. BRAND DRIFT MONITOR
// =============================================================================

export interface DriftedTokenAlert {
  assetId: string;
  assetName: string;
  driftType: 'color' | 'typography' | 'logo_ratio' | 'prohibited_claim' | 'clearspace';
  detectedValue: string;
  expectedValue: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recommendation: string;
}

export interface BrandDriftScanResult {
  workspaceId: string;
  scannedAssetCount: number;
  driftedAssetCount: number;
  workspaceComplianceScore: number; // 0-100
  alerts: DriftedTokenAlert[];
  scannedAt: string;
}

// =============================================================================
// 3. PRODUCT CHANGE IMPACT ENGINE
// =============================================================================

export interface ImpactedAssetItem {
  assetId: string;
  assetName: string;
  section: AssetSection;
  impactReason: 'price_change' | 'name_change' | 'sku_change' | 'ingredient_reformulation' | 'pack_size_change';
  currentDeclaredValue: string | number;
  newProductValue: string | number;
  urgency: 'critical' | 'high' | 'medium';
  actionRequired: string;
}

export interface ProductChangeImpactReport {
  workspaceId: string;
  productId: string;
  productName: string;
  blastRadiusAssetCount: number;
  affectedSections: AssetSection[];
  impactedAssets: ImpactedAssetItem[];
  generatedTasksCount: number;
  evaluatedAt: string;
}

// =============================================================================
// 4. CREATIVE DNA
// =============================================================================

export interface AestheticArchetype {
  archetypeId: string;
  name: string;
  roasBenchmark: number;
  ctrBenchmark: number;
  dominantAspectRatios: string[];
  dominantColors: string[];
  typographyHierarchy: {
    headingFont: string;
    headlineWeight: number;
    copyDensityPct: number;
  };
  visualTone: string;
  sampleAssetIds: string[];
}

export interface CreativeDnaProfile {
  workspaceId: string;
  extractedFromCount: number;
  averageRoas: number;
  topArchetypes: AestheticArchetype[];
  keyPerformanceDrivers: string[];
  analyzedAt: string;
}

// =============================================================================
// 5. ASSET OPPORTUNITY FINDER
// =============================================================================

export interface AssetCoverageOpportunity {
  productId: string;
  productName: string;
  sku?: string;
  currentCollateralCounts: {
    packaging: number;
    productPhotography: number;
    socialCreatives: number;
    printCollateral: number;
  };
  missingEssentialTypes: string[];
  opportunityScore: number; // 0-100 (higher = bigger gap)
  recommendedNextAsset: string;
}

export interface CatalogCoverageReport {
  workspaceId: string;
  totalProductsCount: number;
  fullyCoveredCount: number;
  underCoveredCount: number;
  opportunities: AssetCoverageOpportunity[];
  generatedAt: string;
}

// =============================================================================
// 6. SEASONAL ASSET PLANNER
// =============================================================================

export interface SeasonalEvent {
  eventId: string;
  name: string;
  region: 'India' | 'Global' | 'US';
  calendarMonth: number; // 1-12
  recommendedThemes: string[];
  recommendedColors: string[];
  relevantCategories: string[];
}

export interface SeasonalAssetRecommendation {
  eventId: string;
  eventName: string;
  leadTimeDays: number;
  suggestedCampaignAngle: string;
  recommendedProducts: string[];
  suggestedFormats: string[];
  status: 'upcoming' | 'urgent' | 'active';
}

// =============================================================================
// 7. AI ASSET BRIEF GENERATOR
// =============================================================================

export interface AiAssetCreativeBrief {
  briefId: string;
  workspaceId: string;
  title: string;
  objective: string;
  targetAudience: string;
  targetProductIds: string[];
  brandGuidelines: {
    voiceTone: string;
    mandatoryColors: string[];
    mandatoryFonts: string[];
    restrictedClaims: string[];
  };
  deliverables: Array<{
    format: string;
    dimensions: { width: number; height: number };
    platform: string;
    coreMessage: string;
  }>;
  groundedFacts: string[];
  createdAt: string;
}

// =============================================================================
// 8. INTELLIGENT RIGHTS MONITOR
// =============================================================================

export interface RightsLicenseRecord {
  licenseId: string;
  assetId: string;
  licenseeName: string;
  licenseType: 'commercial' | 'editorial' | 'model_release' | 'font_software' | 'trademark_license';
  issuedDate: string;
  expiryDate: string;
  territory: string;
  usageRestrictions: string[];
}

export interface RightsExpirationAlert {
  licenseId: string;
  assetId: string;
  assetName: string;
  daysUntilExpiry: number;
  isExpired: boolean;
  severity: 'critical' | 'warning' | 'info';
  actionPrompt: string;
}

// =============================================================================
// 9. INDIC LOCALIZATION ENGINE (PRIORITY)
// =============================================================================

export type SupportedIndicLanguage =
  | 'en' // English
  | 'hi' // Hindi (Devanagari)
  | 'te' // Telugu (Telugu script)
  | 'ta' // Tamil (Tamil script)
  | 'mr' // Marathi (Devanagari)
  | 'bn' // Bengali (Bengali script)
  | 'kn'; // Kannada (Kannada script)

export interface IndicFontMapping {
  language: SupportedIndicLanguage;
  languageName: string;
  scriptFamily: 'Devanagari' | 'Telugu' | 'Tamil' | 'Bengali' | 'Kannada' | 'Latin';
  primaryFontFamily: string;
  secondaryFontFamily: string;
  lineHeightMultiplier: number; // 1.25 - 1.35x to accommodate Indic vowel matras & conjuncts
  letterSpacingAdjustment: string; // Zero tracking for connected scripts like Devanagari
  sampleText: string;
}

export interface LocalizationDerivativeRequest {
  workspaceId: string;
  parentAssetId: string;
  targetLanguage: SupportedIndicLanguage;
  translatedHeadline?: string;
  translatedBody?: string;
  translatedCta?: string;
  userId?: string;
}

export interface LocalizationDerivativeResponse {
  derivativeAsset: UnifiedBrandAssetEntity;
  targetLanguage: SupportedIndicLanguage;
  scriptApplied: string;
  appliedFontFamily: string;
  lineHeightScale: number;
  preservationScore: number; // 0-100 layout parity score
}

// =============================================================================
// 10. ASSET WASTE DETECTOR
// =============================================================================

export interface RedundantAssetItem {
  assetId: string;
  assetName: string;
  section: AssetSection;
  fileSizeBytes: number;
  wasteReason: 'never_viewed' | 'orphan_lineage' | 'duplicate_hash' | 'stale_draft' | 'deprecated_brand';
  daysInactive: number;
  reclaimableStorageBytes: number;
  recommendedAction: 'archive' | 'deduplicate' | 'purge';
}

export interface AssetWasteAuditReport {
  workspaceId: string;
  totalAssetsEvaluated: number;
  flaggedWasteCount: number;
  reclaimableStorageMb: number;
  wastedAssets: RedundantAssetItem[];
  auditedAt: string;
}

// =============================================================================
// 11. CREATIVE EXPERIMENT TRACKER
// =============================================================================

export interface CreativeExperimentLink {
  experimentId: string;
  experimentName: string;
  hypothesis: string;
  assetVariantAId: string;
  assetVariantBId: string;
  metricGoal: 'ctr' | 'conversions' | 'roas';
  currentStatus: 'running' | 'concluded';
  winningVariantId?: string;
  upliftPercentage?: number;
  statisticalConfidence?: number;
}

// =============================================================================
// 12. CROSS-BRAND INTELLIGENCE
// =============================================================================

export interface MultiBrandAuditReport {
  workspaceId: string;
  registeredBrandsCount: number;
  crossContaminationDetected: boolean;
  violations: Array<{
    assetId: string;
    assetName: string;
    assignedBrand: string;
    contaminatingBrand: string;
    violatingToken: string;
    detail: string;
  }>;
  auditedAt: string;
}
