/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// =============================================================================
// 1. LOGO VARIANT SPECIFICATIONS
// =============================================================================

export type LogoVariantType =
  | 'primary'
  | 'secondary'
  | 'horizontal'
  | 'vertical'
  | 'iconOnly'
  | 'monochrome'
  | 'white'
  | 'dark'
  | 'favicon'
  | 'appIcon';

export interface LogoVariantSpec {
  variantType: LogoVariantType;
  name: string;
  svgMarkup: string;
  aspectRatio: number; // width / height
  dimensions: { width: number; height: number };
  clearSpaceMultiplier: number; // multiplier of icon / cap-height
  minWidthPx: number;
  minWidthPrintMm: number;
  isApproved: boolean;
  storagePath?: string;
  usageRule: string;
}

// =============================================================================
// 2. DESIGN TOKENS & DESIGN SYSTEM SPECIFICATIONS
// =============================================================================

export interface ColorTokenSpec {
  hex: string;
  rgb: string;
  cmyk: string;
  name: string;
  roleRatioPct: number; // e.g. 60 for primary, 30 for secondary, 10 for accent
  description?: string;
}

export interface TypographyTokenSpec {
  family: string;
  fontFamily?: string;
  weight: number;
  sizePx: number;
  lineHeight: number;
  letterSpacing: string;
  usage: string;
}

export interface BrandDesignTokens {
  colors: {
    primary: ColorTokenSpec;
    secondary: ColorTokenSpec;
    accent: ColorTokenSpec;
    background: ColorTokenSpec;
    neutral: ColorTokenSpec;
    functional: {
      success: string;
      warning: string;
      error: string;
      info: string;
    };
  };
  typography: {
    display: TypographyTokenSpec;
    heading: TypographyTokenSpec;
    subheading: TypographyTokenSpec;
    body: TypographyTokenSpec;
    caption: TypographyTokenSpec;
    code: TypographyTokenSpec;
  };
  components: {
    buttonPrimary: {
      borderRadiusPx: number;
      padding: string;
      fontWeight: number;
      backgroundHex: string;
      textColorHex: string;
    };
    buttonSecondary: {
      borderRadiusPx: number;
      padding: string;
      fontWeight: number;
      borderHex: string;
      textColorHex: string;
    };
    card: {
      borderRadiusPx: number;
      borderHex: string;
      backgroundHex: string;
      shadow: string;
    };
    iconography: {
      strokeWidth: number;
      style: 'outline' | 'filled' | 'duotone';
      defaultSizePx: number;
    };
  };
  visualStyle: {
    photographyDirection: string;
    illustrationStyle: string;
    patterns: string;
    backgroundTreatments: string;
    layoutConventions: string;
  };
  rawTokensJson: string; // Machine-readable design tokens JSON format
}

// =============================================================================
// 3. AUTHORITATIVE BRAND IDENTITY ENTITY
// =============================================================================

export interface AuthoritativeBrandIdentityEntity {
  identityId: string;
  workspaceId: string;
  version: number;
  versionLabel: string;
  status: 'draft' | 'active' | 'superseded' | 'archived';
  effectiveFrom: string;
  effectiveTo?: string | null;
  brandName: string;
  tagline: string;
  mission: string;
  vision: string;
  brandVoice: {
    tone: string;
    personality: string[];
    wordsToUse: string[];
    wordsToAvoid: string[];
  };
  approvedClaims: string[];
  restrictedClaims: string[];
  businessBrainSync: {
    syncedAt: string;
    isAuthoritative: boolean;
    confirmedFactsCount: number;
  };
  logos: Record<LogoVariantType, LogoVariantSpec>;
  logoSourceFiles?: Array<{
    name: string;
    format: string;
    fileSizeBytes?: number;
    storagePath?: string;
  }>;
  tokens: BrandDesignTokens;
  guidelines: {
    logoDoRules: string[];
    logoDontRules: string[];
    colorRules: string[];
    typographyRules: string[];
    imageryRules: string[];
    spacingRules: string[];
  };
  changelog: string;
  previousVersionId?: string;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// 4. BRAND GUARDIAN AI COMPLIANCE REPORT
// =============================================================================

export type ComplianceCheckType =
  | 'logo_presence'
  | 'logo_proportions'
  | 'color_compliance'
  | 'typography'
  | 'spacing_clearspace'
  | 'claim_truth'
  | 'visual_style';

export interface BrandComplianceCheckItem {
  checkType: ComplianceCheckType;
  name: string;
  passed: boolean;
  score: number; // 0-100
  severity: 'critical' | 'warning' | 'info';
  confidence: number; // 0.0 - 1.0
  evidence: string;
  affectedRegion?: string;
  recommendedRemediation: string;
}

export interface BrandComplianceReport {
  reportId: string;
  assetId: string;
  workspaceId: string;
  evaluatedAt: string;
  appliedIdentityVersion: number;
  overallScore: number; // 0-100
  status: 'compliant' | 'warning' | 'non_compliant';
  humanReviewStatus: 'pending' | 'reviewed' | 'overridden' | 'waived';
  checks: BrandComplianceCheckItem[];
  detectedOffBrandColors: string[];
  detectedOffBrandFonts: string[];
  detectedProhibitedClaims: string[];
  remediatedSvg?: string;
  disclaimer: string;
}

// =============================================================================
// 5. BRAND DRIFT REPORT
// =============================================================================

export interface BrandDriftItem {
  assetId: string;
  assetTitle: string;
  section: string;
  category: string;
  driftReasons: string[];
  deprecatedTokensDetected: string[];
  recommendedAction: string;
}

export interface BrandDriftReport {
  workspaceId: string;
  evaluatedAt: string;
  identityVersion: number;
  totalAssetsScanned: number;
  driftedAssetsCount: number;
  driftPercentage: number;
  bySection: Record<string, { total: number; drifted: number }>;
  driftItems: BrandDriftItem[];
}

// =============================================================================
// 6. BRAND IDENTITY IMPACT ANALYSIS
// =============================================================================

export interface BrandIdentityImpactAnalysis {
  workspaceId: string;
  currentVersion: number;
  targetVersion: number;
  colorChanges: Array<{ token: string; fromHex: string; toHex: string }>;
  logoChanges: Array<{ variant: LogoVariantType; changed: boolean }>;
  typographyChanges: Array<{ token: string; fromFont: string; toFont: string }>;
  affectedAssetsCount: number;
  affectedAssets: Array<{
    assetId: string;
    assetTitle: string;
    section: string;
    reasons: string[];
  }>;
}
