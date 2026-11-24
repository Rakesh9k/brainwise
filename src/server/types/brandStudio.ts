/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { FactProvenanceItem } from './api';

export type BrandApprovalState =
  | 'DRAFT'
  | 'GENERATING'
  | 'REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'ARCHIVED';

export type BrandCollateralCategory =
  | 'Packaging'
  | 'Business Card'
  | 'Poster'
  | 'Flyer'
  | 'Banner'
  | 'Label'
  | 'Sticker'
  | 'Menu'
  | 'Presentation'
  | 'Letterhead'
  | 'Brochure';

export type BrandSocialPlatform =
  | 'Carousel'
  | 'Instagram Post'
  | 'Campaign'
  | 'Facebook Creative';

export type BrandDeterministicAssetType =
  | 'VECTOR_LOGO'
  | 'BUSINESS_CARD_SVG'
  | 'STATIONERY_LETTERHEAD_SVG'
  | 'POSTER_FLYER_SVG'
  | 'STATIC_CAROUSEL_SVG';

// -----------------------------------------------------------------------------
// 1. Brand Project Entity
// -----------------------------------------------------------------------------
export interface BrandProjectEntity {
  projectId: string;
  workspaceId: string;
  name: string;
  description: string;
  status: BrandApprovalState;
  activeBrandIdentityId?: string;
  activeVersion: number;
  tags: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// -----------------------------------------------------------------------------
// 2. Brand Profile Entity
// -----------------------------------------------------------------------------
export interface BrandProfileEntity {
  profileId: string;
  workspaceId: string;
  brandName: string;
  tagline: string;
  industry: string;
  businessModel: string;
  pricePositioning: string;
  targetAudience: string;
  customerSegments: string[];
  geographicMarket: string;
  valueProposition: string;
  brandPersonality: string[];
  differentiation: string;
  existingVisualIdentity?: {
    primaryColor?: string;
    headingFont?: string;
    styleTag?: string;
  };
  marketingObjectives: string[];
  missingInformation: Array<{
    field: string;
    question: string;
    importance: 'CRITICAL' | 'RECOMMENDED' | 'OPTIONAL';
  }>;
  status: 'COMPLETE' | 'NEEDS_INPUT';
  provenance: Record<string, FactProvenanceItem>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// -----------------------------------------------------------------------------
// 3. Brand Strategy Entity
// -----------------------------------------------------------------------------
export interface BrandStrategyEntity {
  strategyId: string;
  workspaceId: string;
  projectId?: string;
  version: number;
  brandName: string;
  tagline: string;
  positioningStatement: string;
  uniqueSellingProposition: string;
  valueProposition: string;
  contrarianWedge: string;
  personalityTraits: string[];
  voiceDirectives: {
    tone: string;
    wordsToEmphasize: string[];
    wordsToAvoid: string[];
    approvedClaims: string[];
    forbiddenClaims: string[];
  };
  strategicAngle: string;
  competitorDifferentiators: string[];
  status: BrandApprovalState;
  truthVerified: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// -----------------------------------------------------------------------------
// 4. Brand Research Entity
// -----------------------------------------------------------------------------
export interface BrandResearchEntity {
  researchId: string;
  workspaceId: string;
  industry: string;
  industryConventions: string[];
  categoryExpectations: string[];
  customerPreferences: string[];
  visualTrends: string[];
  productPresentationStandards: string[];
  regionalCulturalConsiderations: string[];
  marketOpportunities: string[];
  sources: Array<{
    title: string;
    url?: string;
    date: string;
    confidence: number;
  }>;
  status: 'DRAFT' | 'REVIEW' | 'APPROVED';
  createdAt: string;
  updatedAt: string;
}

// -----------------------------------------------------------------------------
// 5. Competitor Visual Analysis Entity
// -----------------------------------------------------------------------------
export interface CompetitorVisualAnalysisEntity {
  analysisId: string;
  workspaceId: string;
  competitorId: string;
  competitorName: string;
  logoStyle: string;
  colorPalette: {
    primary: string;
    secondary?: string;
    accent?: string;
    rationale?: string;
  };
  typographyStyle: string;
  packagingStyle: string;
  websiteAesthetic: string;
  socialMediaStyle: string;
  visualPositioning: string;
  sourceReferences: string[];
  observationDate: string;
  confidenceLevel: number;
  contrarianOpportunities: string[];
  createdAt: string;
  updatedAt: string;
}

// -----------------------------------------------------------------------------
// 6. Creative Direction Entity
// -----------------------------------------------------------------------------
export interface CreativeDirectionEntity {
  directionId: string;
  workspaceId: string;
  projectId?: string;
  version: number;
  title: string;
  rationale: string;
  mood: string;
  styleArchetype: string;
  visualMetaphor: string;
  colorRecommendations: {
    primary: string;
    secondary: string;
    accent: string;
    neutral: string;
    background: string;
    reasoning: string;
  };
  typographyRecommendations: {
    headingFont: string;
    bodyFont: string;
    monoFont: string;
    ratio: number; // 1.25 Modular ratio
    reasoning: string;
  };
  logoDirection: {
    prompt: string;
    archetype: string;
    reasoning: string;
  };
  packagingDirection: {
    prompt: string;
    finish: string;
    reasoning: string;
  };
  photographyDirection: {
    tone: string;
    lighting: string;
    reasoning: string;
  };
  socialContentDirection: {
    gridStyle: string;
    themes: string[];
    reasoning: string;
  };
  status: BrandApprovalState;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// -----------------------------------------------------------------------------
// 7. Brand Asset & Version Entities
// -----------------------------------------------------------------------------
export interface BrandAssetVersionEntity {
  versionId: string;
  assetId: string;
  workspaceId: string;
  version: number;
  svgContent: string;
  dimensions: { width: number; height: number };
  changeSummary: string;
  changedBy: string;
  createdAt: string;
}

// -----------------------------------------------------------------------------
// 8. Brand Guideline Entity
// -----------------------------------------------------------------------------
export interface BrandGuidelineEntity {
  guidelineId: string;
  workspaceId: string;
  version: number;
  brandName: string;
  logoUsageRules: {
    clearSpaceMultiplier: number;
    minWidthPx: number;
    approvedContexts: string[];
    prohibitedAlterations: string[];
  };
  colorRules: {
    primaryUsage: string;
    accentRatio: string;
    darkSurfaceRules: string;
  };
  typographyRules: {
    modularRatio: number; // 1.25
    hierarchyLadder: Record<string, string>;
    bodyLineHeight: number;
  };
  voiceRules: {
    tone: string;
    readingLevel: string;
    wordsToUse: string[];
    wordsToAvoid: string[];
    approvedClaims: string[];
    forbiddenClaims: string[];
  };
  packagingRules: string[];
  markdownFullDoc: string;
  status: BrandApprovalState;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// -----------------------------------------------------------------------------
// 9. Brand Design Token Entity
// -----------------------------------------------------------------------------
export interface BrandDesignTokenEntity {
  tokenId: string;
  workspaceId: string;
  version: number;
  colors: Record<string, string>;
  typography: Record<string, string>;
  spacing: Record<string, string>;
  cssVariables: string;
  jsonTokens: Record<string, unknown>;
  status: 'ACTIVE' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
}

// -----------------------------------------------------------------------------
// 10. Brand Generation Entity
// -----------------------------------------------------------------------------
export interface BrandGenerationEntity {
  generationId: string;
  workspaceId: string;
  userId: string;
  generationType:
    | 'LOGO_CONCEPTS'
    | 'COLLATERAL_SVG'
    | 'COLLATERAL_VARIATIONS'
    | 'SOCIAL_CREATIVE'
    | 'BRAND_STRATEGY'
    | 'SLIDE_REMIX';
  prompt: string;
  inputParams: Record<string, unknown>;
  outputPayload: Record<string, unknown>;
  modelUsed: string;
  creditsDeducted: number;
  reservationId?: string;
  status: 'QUEUED' | 'GENERATING' | 'COMPLETED' | 'FAILED';
  latencyMs: number;
  errorMessage?: string;
  createdAt: string;
}

// -----------------------------------------------------------------------------
// 11. Brand Approval Entity
// -----------------------------------------------------------------------------
export interface BrandApprovalEntity {
  approvalId: string;
  workspaceId: string;
  resourceType:
    | 'BRAND_IDENTITY'
    | 'BRAND_ASSET'
    | 'BRAND_STRATEGY'
    | 'CREATIVE_DIRECTION'
    | 'BRAND_GUIDELINE'
    | 'BRAND_PROJECT';
  resourceId: string;
  resourceVersion: number;
  previousState: BrandApprovalState;
  newState: BrandApprovalState;
  approvedBy: string;
  notes?: string;
  createdAt: string;
}

// -----------------------------------------------------------------------------
// 12. Brand Export Entity
// -----------------------------------------------------------------------------
export interface BrandExportEntity {
  exportId: string;
  workspaceId: string;
  version: number;
  format: 'ZIP' | 'JSON' | 'SVG_BUNDLE';
  assetCount: number;
  includedItems: string[];
  storagePath: string;
  downloadUrl: string;
  fileSizeBytes: number;
  expiresAt: string;
  status: 'READY' | 'EXPIRED';
  createdBy: string;
  createdAt: string;
}

// -----------------------------------------------------------------------------
// 13. Brand Quality Report Entity
// -----------------------------------------------------------------------------
export interface BrandQualityReportEntity {
  reportId: string;
  workspaceId: string;
  resourceType: string;
  resourceId: string;
  overallScore: number; // 0 - 100
  metrics: {
    contrastRatioScore: number;
    typographyConformanceScore: number;
    truthCheckScore: number;
    differentiationScore: number;
    svgPurityScore: number;
  };
  passed: boolean;
  warnings: string[];
  recommendations: string[];
  evaluatedAt: string;
}

// -----------------------------------------------------------------------------
// 14. Comprehensive Brand Strategic Profile (Deep Strategy Engine)
// -----------------------------------------------------------------------------
export interface CustomerPersonaDetail {
  id: string;
  name: string;
  role: string;
  demographics: string;
  motivations: string[];
  painPoints: string[];
  purchaseTriggers: string[];
  aspirations: string[];
  culturalConsiderations: string[];
}

export interface MessagingPillarDetail {
  pillar: string;
  description: string;
  proofPoint: string;
}

export interface BrandStrategicProfile {
  foundations: {
    purpose: string;
    mission: string;
    vision: string;
    coreValues: string[];
    brandPromise: string;
    brandPositioning: string;
    brandPersonality: string[];
    brandArchetype: string;
    brandStory: string;
    brandPhilosophy: string;
  };
  audience: {
    primaryAudience: string;
    secondaryAudience: string;
    customerPersonas: CustomerPersonaDetail[];
  };
  marketPositioning: {
    marketCategory: string;
    competitivePosition: string;
    pricePositioning: string;
    perceivedValue: string;
    differentiation: string;
    positioningOpportunities: string[];
    strategicRisks: string[];
  };
  messaging: {
    coreMessage: string;
    taglineOptions: string[];
    valueProposition: string;
    elevatorPitch: string;
    messagingPillars: MessagingPillarDetail[];
    toneOfVoice: string;
    vocabulary: string[];
    wordsToUse: string[];
    wordsToAvoid: string[];
  };
  hypothesesVsConfirmed: {
    confirmedFacts: string[];
    inferredHypotheses: string[];
    needsValidation: string[];
  };
  strategicRationale: string;
}

// -----------------------------------------------------------------------------
// 15. Visual Whitespace & Differentiation Analysis
// -----------------------------------------------------------------------------
export interface VisualWhitespaceAnalysis {
  recommendedVisualDirection: string;
  whyItWorks: string;
  targetAudienceRelevance: string;
  competitorContrast: string;
  potentialAdvantages: string[];
  potentialRisks: string[];
  practicalExecutionGuidelines: string[];
  overusedDesignApproaches: string[];
  underservedAestheticDirections: string[];
  nonNegotiableCategoryExpectations: string[];
}

// -----------------------------------------------------------------------------
// 16. Visual Moodboard Entity
// -----------------------------------------------------------------------------
export interface VisualMoodboardEntity {
  moodboardId: string;
  workspaceId: string;
  directionId: string;
  directionName: string;
  colorInspiration: Array<{
    name: string;
    hex: string;
    role: string;
    mood: string;
  }>;
  typographyReferences: {
    heading: string;
    body: string;
    mono: string;
    styleDescription: string;
  };
  photographyDirection: {
    tone: string;
    lighting: string;
    subjectMatter: string;
    rules: string[];
  };
  graphicMotifs: Array<{
    name: string;
    svgMarkup: string;
    description: string;
  }>;
  textureReferences: Array<{
    name: string;
    finish: string;
    tactileFeel: string;
  }>;
  materialInspiration: string[];
  packagingInspiration: {
    structure: string;
    finish: string;
    unboxingExperience: string;
  };
  overallArtDirection: string;
  status: 'ACTIVE' | 'ARCHIVED';
  userSelected: boolean;
  createdAt: string;
}

// -----------------------------------------------------------------------------
// 17. Brand Positioning & Competitor Map
// -----------------------------------------------------------------------------
export interface BrandPositioningMap {
  mapId: string;
  workspaceId: string;
  xAxis: {
    label: string;
    minLabel: string;
    maxLabel: string;
    dimension: string;
  };
  yAxis: {
    label: string;
    minLabel: string;
    maxLabel: string;
    dimension: string;
  };
  userPlacement: {
    brandName: string;
    x: number; // 0 to 100
    y: number; // 0 to 100
    rationale: string;
    isEstimated: boolean;
  };
  competitorPlacements: Array<{
    competitorId: string;
    name: string;
    x: number;
    y: number;
    rationale: string;
    classification: 'DIRECT' | 'INDIRECT';
    isEstimated: boolean;
  }>;
  whitespaceQuadrants: Array<{
    quadrant: string;
    opportunity: string;
    description: string;
  }>;
  strategicUtilityExplanation: string;
  createdAt: string;
}

// -----------------------------------------------------------------------------
// 18. Brand Strategy Validation Result
// -----------------------------------------------------------------------------
export interface BrandValidationDimension {
  score: number; // 0 - 100
  verdict: 'EXCELLENT' | 'STRONG' | 'MODERATE' | 'NEEDS_WORK';
  rationale: string;
}

export interface BrandValidationResult {
  validationId: string;
  workspaceId: string;
  overallSuitabilityScore: number; // 0 - 100
  evaluations: {
    targetAudienceSuitability: BrandValidationDimension;
    categoryRelevance: BrandValidationDimension;
    differentiation: BrandValidationDimension;
    memorability: BrandValidationDimension;
    scalability: BrandValidationDimension;
    culturalAppropriateness: BrandValidationDimension;
    pricePositioning: BrandValidationDimension;
    productCompatibility: BrandValidationDimension;
    futureExpansion: BrandValidationDimension;
  };
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  trademarkDisclaimer: string;
  evaluatedAt: string;
}

// -----------------------------------------------------------------------------
// 19. Creative Refinement Request
// -----------------------------------------------------------------------------
export type CreativeRefinementDirective =
  | 'MORE_PREMIUM'
  | 'MORE_YOUTHFUL'
  | 'STRONGER_INDIAN_IDENTITY'
  | 'LESS_GENERIC'
  | 'MORE_DISTINCTIVE'
  | 'EXPLORE_ALTERNATIVES'
  | 'CUSTOM';

export interface CreativeRefinementRequest {
  workspaceId: string;
  userId: string;
  directive: CreativeRefinementDirective;
  customPrompt?: string;
  targetDirectionId?: string;
}

// -----------------------------------------------------------------------------
// 20. Logo Studio Design Models
// -----------------------------------------------------------------------------
export interface LogoDesignBrief {
  workspaceId: string;
  brandName: string;
  tagline: string;
  category: string;
  industry: string;
  pricePositioning: string;
  targetAudience: string;
  brandPersonality: string[];
  approvedColors: {
    primary: string;
    secondary: string;
    accent: string;
    neutral: string;
    background: string;
  };
  typographyDirection: {
    headingFont: string;
    bodyFont: string;
    monoFont: string;
    ratio: number;
  };
  competitorDifferentiators: string[];
  contrarianWedge: string;
  userNotes?: string;
  logoArchetype?: string;
  logoMood?: string;
  createdAt: string;
}

export type LogoMarkStyle =
  | 'wordmark'
  | 'lettermark'
  | 'monogram'
  | 'geometric'
  | 'abstract'
  | 'emblem'
  | 'combination'
  | 'mascot';

export interface LogoConceptPresentation {
  id: string;
  workspaceId: string;
  conceptName: string;
  markStyle: LogoMarkStyle;
  designRationale: string;
  brandRelevance: string;
  audienceRelevance: string;
  competitorDifferentiation: string;
  typographyDetails: {
    fontName: string;
    weight: string;
    tracking: string;
    scaleRatio: number;
    rationale: string;
  };
  symbolMeaning: string;
  colorRationale: string;
  scalabilityRating: 'HIGH' | 'EXCELLENT' | 'VERY_HIGH';
  advantages: string[];
  limitations: string[];
  svgMarkup: string;
  dimensions: { width: number; height: number };
  safeSpaceMarginPx: number;
  primaryColor: string;
  accentColor: string;
  surfaceColor: string;
  approvalStatus: BrandApprovalState;
  version: number;
  parentConceptId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LogoFamilyVariants {
  conceptId: string;
  workspaceId: string;
  brandName: string;
  variants: {
    primaryHorizontal: string; // full horizontal lockup SVG
    secondaryStacked: string;  // stacked lockup SVG
    symbolOnly: string;        // isolated icon SVG
    monogramOnly: string;      // lettermark/monogram SVG
    monochromeBlack: string;   // pure #000000 SVG
    monochromeWhite: string;   // pure #FFFFFF SVG
    fullColorLight: string;    // light surface full-color SVG
    fullColorDark: string;     // dark surface full-color SVG
    faviconSvg: string;        // 32x32 favicon SVG
    socialAvatarSvg: string;   // 1080x1080 circle-safe avatar SVG
  };
  rasterExports: {
    png1xTransparentBase64?: string;
    png2xTransparentBase64?: string;
    png4xTransparentBase64?: string;
    pngDarkBackgroundBase64?: string;
    pngLightBackgroundBase64?: string;
  };
  createdAt: string;
}

export interface LogoQualityValidationReport {
  reportId: string;
  workspaceId: string;
  conceptId: string;
  brandName: string;
  overallPass: boolean;
  deterministicChecks: {
    brandNameSpellingCorrect: boolean;
    exactTextDetected: string;
    fileFormatValidSvg: boolean;
    xmlStructureValid: boolean;
    zeroActiveScripts: boolean;
    zeroEmbeddedRasters: boolean;
    zeroVideoTags: boolean; // STRICT VIDEO EXCLUSION
    dimensionsValid: boolean;
    viewBoxConfigured: boolean;
    aspectRatio: number;
    clippingDetected: boolean;
    safeSpaceCompliance: boolean;
    transparencyVerified: boolean;
  };
  surfaceContrastScores: {
    onWhite: { contrastRatio: number; wcagAaaPass: boolean };
    onBlack: { contrastRatio: number; wcagAaaPass: boolean };
    onBrandColor: { contrastRatio: number; wcagAaaPass: boolean };
    onDarkSurface: { contrastRatio: number; wcagAaaPass: boolean };
    onLightSurface: { contrastRatio: number; wcagAaaPass: boolean };
  };
  smallSizeLegibility: {
    at16px: { legible: boolean; strokeThicknessPx: number };
    at32px: { legible: boolean; strokeThicknessPx: number };
    at64px: { legible: boolean; strokeThicknessPx: number };
  };
  aiAestheticScore: number; // 0 - 100
  warnings: string[];
  recommendations: string[];
  trademarkDisclaimer: string;
  evaluatedAt: string;
}

export type LogoRefinementDirective =
  | 'MORE_PREMIUM'
  | 'SIMPLIFY_SYMBOL'
  | 'CHANGE_TYPOGRAPHY'
  | 'IMPROVE_READABILITY'
  | 'MORE_DISTINCTIVE'
  | 'SUITABLE_FOR_PACKAGING'
  | 'MORE_YOUTHFUL'
  | 'MORE_SOPHISTICATED'
  | 'IMPROVE_BALANCE'
  | 'ALTERNATIVE_LOCKUP'
  | 'CUSTOM';

export interface LogoRefinementActionRequest {
  workspaceId: string;
  userId: string;
  conceptId: string;
  directive: LogoRefinementDirective;
  customInstruction?: string;
  branchAsNew?: boolean;
}

export interface LogoPresentationDeck {
  deckId: string;
  workspaceId: string;
  brandName: string;
  tagline: string;
  activeConcept: LogoConceptPresentation;
  alternativeConcepts: LogoConceptPresentation[];
  colorPaletteTokens: Array<{ role: string; hex: string; name: string }>;
  typographyStack: {
    headingFont: string;
    bodyFont: string;
    modularScale: string;
  };
  symbolMeaningNarrative: string;
  lockupVariants: {
    horizontal: string;
    stacked: string;
    symbol: string;
  };
  mockupUsageApplications: Array<{
    application: string;
    description: string;
    svgMockupMarkup: string;
  }>;
  trademarkNotice: string;
  createdAt: string;
}

// -----------------------------------------------------------------------------
// 21. Living Design Tokens, Rules & Brand Book Models
// -----------------------------------------------------------------------------
export type TokenCategory =
  | 'color'
  | 'typography'
  | 'spacing'
  | 'border'
  | 'shape'
  | 'motif'
  | 'logo'
  | 'voice';

export interface LivingDesignToken {
  tokenId: string; // e.g. "brand.primary", "text.primary", "spacing.base"
  workspaceId: string;
  category: TokenCategory;
  name: string;
  value: string;
  semanticPath: string; // "colors.brand.primary"
  description: string;
  usageRules: string[];
  version: number;
  approvalStatus?: BrandApprovalState;
  status?: BrandApprovalState;
  source: 'BUSINESS_BRAIN' | 'CREATIVE_DIRECTION' | 'USER_EDITED' | 'SYSTEM_DEFAULT' | 'MANUAL_OVERRIDE';
  modificationHistory: Array<{
    previousValue?: string;
    newValue?: string;
    changedBy?: string;
    changedAt?: string;
    reason?: string;
    version?: number;
    modifiedBy?: string;
    changeReason?: string;
    timestamp?: string;
  }>;
  createdAt?: string;
  updatedAt: string;
}

export type DesignRuleSeverity = 'MANDATORY' | 'RECOMMENDED' | 'OPTIONAL' | 'CONTEXT_SPECIFIC';

export interface DesignRuleEntity {
  ruleId: string;
  workspaceId: string;
  guidelineVersion: number;
  domain: 'LOGO' | 'COLOR' | 'TYPOGRAPHY' | 'COMPOSITION' | 'PHOTOGRAPHY' | 'VOICE';
  ruleTitle: string;
  ruleStatement: string;
  severity: DesignRuleSeverity;
  contextScope?: string; // e.g. "packaging", "social_media", "stationery"
  deterministicCheckCode?: string;
  userApprovedExceptions: string[];
  autoRemediationAvailable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BrandConsistencyReport {
  evaluationId: string;
  workspaceId: string;
  assetId?: string;
  assetType: 'LOGO' | 'SOCIAL_CAROUSEL' | 'COLLATERAL' | 'PACKAGING' | 'COPYWRITING' | 'WEB_MOCKUP' | string;
  guidelineVersionEvaluated: number;
  overallScore: number; // 0 - 100
  verdict: 'PASS' | 'WARNING' | 'FAIL';
  overallVerdict?: 'PASS' | 'WARNING' | 'FAIL';
  status?: 'PASSED' | 'WARNING' | 'FAILED';
  launchReadiness?: 'READY_FOR_LAUNCH' | 'READY_WITH_RESERVATIONS' | 'ACTION_REQUIRED';
  checks?: Array<{ name: string; status: 'PASS' | 'WARN' | 'FAIL'; details: string }>;
  mandatoryViolationsCount?: number;
  issues?: Array<{ issue: string; [key: string]: any }>;
  autoRemediated?: boolean;
  evaluations: {
    logoCompliance: { pass: boolean; score: number; details: string };
    colorCompliance: { pass: boolean; score: number; details: string };
    typographyCompliance: { pass: boolean; score: number; details: string };
    compositionCompliance: { pass: boolean; score: number; details: string };
    photographyCompliance: { pass: boolean; score: number; details: string };
    voiceCompliance: { pass: boolean; score: number; details: string };
  };
  violations: Array<{
    domain: string;
    severity: DesignRuleSeverity;
    violationMessage: string;
    detectedValue?: string;
    expectedValue?: string;
    explanation: string;
    recommendedCorrection: string;
    ruleCode?: string;
    canAutoRemediate: boolean;
  }>;
  remediatedPayload?: Record<string, unknown>;
  remediatedContent?: string;
  evaluatedAt: string;
}

export interface BrandGuidelineImpactAnalysis {
  workspaceId?: string;
  guidelineVersionFrom: number;
  guidelineVersionTo: number;
  impactedDomains: string[];
  changedTokensCount: number;
  affectedLibraryAssetsCount: number;
  affectedAssetsCount?: number;
  affectedAssetIds?: string[];
  affectedAssetSummaries: Array<{
    assetId: string;
    title: string;
    category: string;
    currentVersion: number;
    recommendedAction: 'REGENERATE' | 'MANUAL_REVIEW' | 'KEEP_LEGACY';
  }>;
  summaryNarrative: string;
  remediationAdvice?: string;
  evaluatedAt: string;
}

export interface BrandBookDocument {
  documentId: string;
  bookId?: string;
  workspaceId: string;
  version: number;
  brandName: string;
  status: 'DRAFT' | 'REVIEW' | 'APPROVED' | 'PUBLISHED' | 'ARCHIVED';
  publishedAt?: string;
  sections: {
    foundations: {
      brandName?: string;
      overview: string;
      mission: string;
      vision: string;
      values: string[];
      positioning: string;
      personality: string[];
      targetAudience: string;
      brandStory: string;
      purpose?: string;
      promise?: string;
      philosophy?: string;
      audiencePersonas?: string[];
    };
    logoSystem: {
      primaryLogoSvg: string;
      secondaryLogoSvg: string;
      symbolSvg: string;
      invertedLogoSvg?: string;
      monochromeLogoSvg?: string;
      minimumWidthPx: number;
      clearSpaceMultiplier: number;
      clearSpaceRule?: string;
      minimumSizes?: { digitalPx: number; printMm: number };
      correctUsageGuidelines: string[];
      incorrectUsageWarnings: string[];
      incorrectUsageRules?: string[];
      backgroundCompatibility: Array<{ surface: string; approvedVariant: string; contrastRatio: number }>;
    };
    colorSystem: {
      primaryPalette: any;
      secondaryPalette: any;
      accentPalette?: any;
      accentColours: Array<{ name: string; hex: string; rgb: string; cmyk: string; role: string }>;
      neutralColours: Array<{ name: string; hex: string; rgb: string; cmyk: string }>;
      usageRatios?: { dominantPrimary: string; secondaryNegative: string; accentFocal: string };
      contrastMatrix: Array<{ foreground: string; background: string; ratio: number; rating: string }>;
    };
    typography: {
      primaryFontFamily?: string;
      primaryTypeface: string;
      secondaryTypeface: string;
      displayTypeface: string;
      scaleRatio?: number;
      modularRatio: number; // 1.25
      hierarchyLadder: Record<string, { sizePx: number; lineHeight: number; weight: string; letterSpacing: string }>;
      typeLadder?: any;
      fallbackFonts: string[];
      licensingNotes: string;
    };
    visualLanguage: {
      graphicMotifSvg?: string;
      graphicMotifsSvg: string[];
      texturesAndMaterials: string[];
      iconographyStyle: string;
      photographyDirection: { tone: string; lighting: string; compositionRules: string[] };
      photographyGuidelines?: { dos: string[]; donts: string[] };
    };
    communication: {
      toneOfVoice: string;
      writingPrinciples: string[];
      messagingPillars: Array<{ pillar: string; description: string; proofPoint: string }>;
      taglineOptions: string[];
      vocabularyWordsToUse: string[];
      vocabularyWordsToAvoid: string[];
      approvedClaims: string[];
      forbiddenClaims: string[];
    };
    applications: Array<{
      touchpoint?: string;
      application?: string;
      description: string;
      guidelines?: string[];
      specifications?: string;
      visualGuidelines?: string[];
      svgMockupPreview?: string;
    }> | any;
  };
  foundations?: BrandBookDocument['sections']['foundations'];
  logoSystem?: BrandBookDocument['sections']['logoSystem'];
  colorSystem?: BrandBookDocument['sections']['colorSystem'];
  typography?: BrandBookDocument['sections']['typography'];
  visualLanguage?: BrandBookDocument['sections']['visualLanguage'];
  communication?: BrandBookDocument['sections']['communication'];
  applications?: any;
  markdownDocument: string;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// AI ASSETS & SOCIAL STUDIO TYPES
// =============================================================================

export interface IndustryAssetRecommendation {
  id: string;
  industry: string;
  assetName: string;
  purpose: string;
  suitabilityRationale: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  audienceRelevance: string;
  brandRelevance: string;
  productionComplexity: 'SIMPLE' | 'MODERATE' | 'COMPLEX';
  isPhysical: boolean;
  specifications: string;
  suggestedFormats: string[];
}

export interface ProductMockupEntity {
  mockupId: string;
  workspaceId: string;
  productCategory: string;
  mockupType: string;
  materialAppearance: string;
  color: string;
  finish: string;
  environment: string;
  cameraAngle: string;
  lighting: string;
  presentationStyle: string;
  svgArtwork: string;
  disclaimer: string;
  guidelineVersion: number;
  consistencyReport?: BrandConsistencyReport;
  createdAt: string;
  updatedAt: string;
}

export interface PackagingArtworkEntity {
  packagingId: string;
  workspaceId: string;
  productCategory: string;
  packagingType: string;
  dielineType: string;
  dimensionsMm: { width: number; height: number; depth: number };
  bleedMm: number;
  safeAreaMarginMm: number;
  resolutionDpi: number;
  frontPanelSvg: string;
  backPanelSvg: string;
  completeDielineSvg: string;
  materialsRecommended: string[];
  finishingOptions: string[];
  regulatoryLabels: {
    foodSafetyFssaiFda: boolean;
    allergenWarningRequired: boolean;
    netQuantityStatement: string;
    batchAndExpiryCoordinates: string;
    barcodePlacement: { type: string; coordinates: string; clearSpaceMm: number };
    statutoryDisclaimer: string;
    fssaiOrFdaLicense?: string;
    netQuantity?: string;
    allergenWarning?: string;
  };
  productionReadiness: 'CONCEPT_PREVIEW' | 'EDITABLE_ARTWORK' | 'PRODUCTION_READY';
  guidelineVersion: number;
  consistencyReport?: BrandConsistencyReport;
  createdAt: string;
  updatedAt: string;
}

export interface DesignDocumentLayer {
  id: string;
  name: string;
  type: 'text' | 'image' | 'logo' | 'shape' | 'background';
  position: { x: number; y: number };
  dimensions: { width: number; height: number };
  rotationDeg: number;
  zIndex: number;
  visible: boolean;
  locked: boolean;
  properties: {
    text?: string;
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: string;
    fillColor?: string;
    strokeColor?: string;
    strokeWidth?: number;
    svgContent?: string;
    imageUrl?: string;
    opacity?: number;
    borderRadius?: number;
    alignment?: 'left' | 'center' | 'right';
  };
}

export interface EditableDesignDocument {
  documentId: string;
  workspaceId: string;
  title: string;
  format: string;
  canvasDimensions: { width: number; height: number };
  layers: DesignDocumentLayer[];
  renderedSvg: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export type CarouselStoryStructure =
  | 'Storytelling'
  | 'Educational'
  | 'ProductLaunch'
  | 'Comparison'
  | 'ProblemSolution'
  | 'ListBased'
  | 'Promotional'
  | 'BrandIntroduction'
  | 'CustomerTestimonials'
  | 'ProductCollection';

export interface SocialCarouselSlide {
  slideNumber: number;
  headline: string;
  subheadline?: string;
  bodyPoints: string[];
  ctaText?: string;
  artDirectionNote?: string;
  svgMotif: string;
  editableDoc?: EditableDesignDocument;
}

export interface SocialCreativeProject {
  projectId: string;
  workspaceId: string;
  title: string;
  platform: 'Instagram' | 'LinkedIn' | 'YouTube' | 'Facebook' | 'Ad' | 'Web';
  format: '1:1' | '4:5' | '9:16' | '16:9' | 'Carousel';
  carouselStructure?: CarouselStoryStructure;
  caption: string;
  hashtags: string[];
  safeAreaGuidelines: string;
  slides: SocialCarouselSlide[];
  guidelineVersion: number;
  consistencyReport?: BrandConsistencyReport;
  createdAt: string;
  updatedAt: string;
}

export interface CreativeCampaignPackage {
  campaignId: string;
  workspaceId: string;
  campaignName: string;
  objective: string;
  targetAudience: string;
  heroConcept: string;
  coreMessage: string;
  heroCreativeSvg: string;
  socialPosts: SocialCreativeProject[];
  productVisuals: ProductMockupEntity[];
  packagingArtwork?: PackagingArtworkEntity;
  guidelineVersion: number;
  status: 'DRAFT' | 'REVIEW' | 'APPROVED' | 'PUBLISHED';
  createdAt: string;
  updatedAt: string;
}

export interface CreativeOpportunityEntity {
  opportunityId: string;
  workspaceId: string;
  title: string;
  category:
    | 'PRODUCT_LAUNCH'
    | 'PACKAGING_REFRESH'
    | 'SEASONAL_CAMPAIGN'
    | 'SIGNATURE_SERIES'
    | 'EDUCATIONAL_CAROUSEL'
    | 'GIFT_COLLECTION';
  businessContextRationale: string;
  relevanceScore: number; // 0 - 100
  actionPrompt: string;
  status: 'ACTIVE' | 'DISMISSED' | 'EXECUTED';
  createdAt: string;
  updatedAt: string;
}

// -----------------------------------------------------------------------------
// 32. Brand Launch Command & Unified Launch Kit
// -----------------------------------------------------------------------------
export interface BrandLaunchKitManifestItem {
  id: string;
  category: string;
  fileName: string;
  format: 'SVG' | 'PNG' | 'JSON' | 'PDF';
  mimeType: string;
  sizeBytes: number;
  checksumSha256: string;
  sha256Checksum?: string;
  path?: string;
  description: string;
  downloadUrl?: string;
}

export interface BrandLaunchKitManifest {
  totalAssets: number;
  totalItemCount?: number;
  totalSizeBytes: number;
  generatedAt: string;
  items: BrandLaunchKitManifestItem[];
}

export interface BrandLaunchKitDeliverables {
  identityAndLogos: {
    brandName: string;
    masterLogoSvg: string;
    familyVariants: Array<{ variantType: string; svgContent: string; pngBase64?: string }>;
    colorPalette: Array<{ name: string; hex: string; role: string }>;
    typography: { primaryFont: string; secondaryFont: string };
  };
  masterLogo?: {
    primaryLogoSvg: string;
    transparentPngBase64: string;
    variants: Array<{ variantType: string; svgContent: string; pngBase64?: string }>;
  };
  guidelines: {
    brandBookId: string;
    version: number;
    tokensJson: Record<string, any>;
    w3cDesignTokens?: Record<string, any>;
    printPdfMarkup: string;
    typographyHierarchy?: { headingFont: string; bodyFont: string };
    colorRatios?: { '60_dominant': string; '30_secondary': string; '10_accent': string };
  };
  packagingAndMockups: {
    mockups: ProductMockupEntity[];
    packagingArtworks: PackagingArtworkEntity[];
    dielineSvg?: string;
    mockupSvg?: string;
    printBleedMm?: number;
    safeMarginMm?: number;
    printResolutionDpi?: number;
    mockupDisclaimer?: string;
  };
  campaignVisuals: {
    heroBannerSvg: string;
    editorialLookbookSvg: string;
    heroVisual?: { svgContent: string; aspectRatio: string; videoExcluded: boolean };
    editorialStills?: Array<{ svgContent: string; videoExcluded: boolean }>;
  };
  socialCreatives: {
    carousels: SocialCreativeProject[];
    staticStills: SocialCreativeProject[];
  };
  socialAssets?: {
    launchCarousel: {
      slidesCount: number;
      slides: Array<{ slideIndex: number; role: string; headline: string; svgContent: string }>;
    };
    squareFeedPost: { aspectRatio: string; svgContent: string };
    storyStill: {
      aspectRatio: string;
      svgContent: string;
      isStaticStillOnly: boolean;
      safeInsets: { topInsetPx: number; bottomInsetPx: number };
    };
  };
  webAndAdvertising: {
    webHeroSvg: string;
    linkedInBannerSvg: string;
    displayAdCardSvg: string;
    webHeroBanner?: { width: number; height: number; svgContent: string };
    linkedInBanner?: { width: number; height: number; svgContent: string };
    displayAdSquare?: { width: number; height: number; svgContent: string };
  };
  exportManifest: BrandLaunchKitManifest;
}

export interface BrandLaunchKitEntity {
  launchId: string;
  workspaceId: string;
  launchName: string;
  brandName: string;
  status: 'PREPARING' | 'READY' | 'PUBLISHED' | 'READY_FOR_LAUNCH';
  guidelineVersion: number;
  deliverables: BrandLaunchKitDeliverables;
  manifest?: BrandLaunchKitManifest;
  consistencyReport: BrandConsistencyReport;
  creditsDeducted: number;
  createdAt: string;
  updatedAt: string;
}

// -----------------------------------------------------------------------------
// 33. Prepress, Print Bleed, Color Profiles & Font Outlining Specifications
// -----------------------------------------------------------------------------
export type CmykColorProfile =
  | 'FOGRA39'       // ISO Coated v2 (ECI) - Standard for India & European Sheetfed Litho
  | 'GRACOL_2013'   // GRACoL 2013 (CGATS 21-2) - North American Commercial Sheetfed
  | 'SWOP_V2'       // US Web Coated SWOP v2 - Publication & Web Offset
  | 'FOGRA47';      // PSO Uncoated ISO 12647-2 - Letterheads, Kraft Paper, Uncoated Stocks

export interface PrintBleedSpec {
  bleedMm: number;
  safeMarginMm: number;
  trimWidthMm: number;
  trimHeightMm: number;
  substrateType: 'FOLDING_CARTON' | 'CORRUGATED_HEAVY_BOARD' | 'COMMERCIAL_STATIONERY' | 'LABEL_STICKER';
  includeCropMarks: boolean;
  includeColorBars: boolean;
  includeRegistrationTargets: boolean;
}

export type RasterExportTier = '1x' | '2x' | '4x' | '8x' | 'PRINT_300DPI';

export interface PrepressExportOptions {
  colorProfile?: CmykColorProfile;
  bleedSpec?: Partial<PrintBleedSpec>;
  fontMode?: 'OUTLINED_PATHS' | 'EMBEDDED_TEXT';
  resolutionTier?: RasterExportTier;
  format?: 'svg' | 'png' | 'pdf' | 'tiff' | 'zip';
}

export interface VectorOutliningResult {
  outlinedSvg: string;
  originalTextNodesCount: number;
  convertedPathsCount: number;
  fontMode: 'OUTLINED_PATHS' | 'EMBEDDED_TEXT';
  preservedDimensions: { width: number; height: number };
}

// -----------------------------------------------------------------------------
// 34. Automated Preliminary Trademark Clearance Specifications
// -----------------------------------------------------------------------------
export type TrademarkJurisdiction =
  | 'INDIA_IP_INDIA'     // Controller General of Patents, Designs and Trade Marks (India)
  | 'US_USPTO'           // United States Patent and Trademark Office
  | 'INTERNATIONAL_WIPO'; // WIPO Madrid System Global Brand Database

export interface ConflictingTrademarkMatch {
  markName: string;
  applicationNumber: string;
  owner: string;
  jurisdiction: TrademarkJurisdiction;
  niceClass: number;
  status: 'REGISTERED' | 'PENDING' | 'OBJECTED' | 'OPPOSED' | 'ABANDONED';
  phoneticSimilarity: number;       // 0 - 100 (Double Metaphone / Soundex)
  orthographicSimilarity: number;   // 0 - 100 (Levenshtein Edit Distance)
  overallConflictScore: number;     // 0 - 100 Weighted Risk
  goodsAndServicesSummary: string;
}

export interface TrademarkClearanceReport {
  reportId: string;
  workspaceId: string;
  queryWordmark: string;
  industryCategory: string;
  targetNiceClasses: number[];
  overallRiskScore: number;         // 0 - 100 (0 = Clean, 100 = Severe Conflict)
  riskLevel: 'LOW_RISK' | 'MODERATE_RISK' | 'HIGH_RISK';
  jurisdictionBreakdown: {
    indiaIpIndiaCount: number;
    usptoCount: number;
    internationalCount: number;
  };
  conflictingMatches: ConflictingTrademarkMatch[];
  phoneticCollisionsCount: number;
  exactMatchFound: boolean;
  clearanceRecommendation: string;
  statutoryDisclaimer: string;
  checkedAt: string;
}



