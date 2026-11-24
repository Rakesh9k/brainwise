/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { UnifiedBrandAssetEntity } from './assetLibrary';

// =============================================================================
// 1. PLATFORM FORMAT SPECIFICATIONS
// =============================================================================

export type SocialPlatform =
  | 'instagram'
  | 'facebook'
  | 'linkedin'
  | 'youtube'
  | 'x_twitter'
  | 'advertising_network';

export type SocialContentType =
  | 'square_post'
  | 'portrait_post'
  | 'story_slide'
  | 'reel_cover'
  | 'carousel_multi_slide'
  | 'feed_ad'
  | 'story_ad'
  | 'landscape_banner'
  | 'article_header'
  | 'youtube_thumbnail'
  | 'youtube_video_cover'
  | 'youtube_shorts_cover'
  | 'x_promotional_card'
  | 'leaderboard_ad';

export interface PlatformSafeZones {
  topPx: number; // Reserved for platform navigation, app headers, account info
  bottomPx: number; // Reserved for like/comment buttons, audio labels, CTA overlays
  leftPx: number; // Safety gutter
  rightPx: number; // Reserved for engagement icons (IG/TikTok/Shorts sidebars)
  specialZones?: Array<{
    name: string;
    description: string;
    rect: { x: number; y: number; width: number; height: number };
  }>;
}

export interface PlatformFormatSpec {
  specId: string;
  platform: SocialPlatform;
  contentType: SocialContentType;
  name: string;
  dimensions: { width: number; height: number };
  aspectRatio: string;
  safeZones: PlatformSafeZones;
  recommendedTextMaxChars: number;
  maxFileSizeMb: number;
  formatDescription: string;
}

// =============================================================================
// 2. CREATIVE METADATA
// =============================================================================

export type PublicationStatus = 'draft' | 'scheduled' | 'published' | 'archived';

export interface SocialCreativeMetadata {
  platform: SocialPlatform;
  contentType: SocialContentType;
  aspectRatio: string;
  dimensions: { width: number; height: number };
  campaignId?: string;
  campaignName?: string;
  productId?: string;
  productName?: string;
  targetAudience?: string;
  objective?: 'brand_awareness' | 'engagement' | 'conversion' | 'lead_generation' | 'educational';
  callToAction?: string;
  captionReference?: string;
  hashtags?: string[];
  creativeConcept?: string;
  publicationStatus: PublicationStatus;
  publicationDate?: string;
  sourceAssetId?: string;
  derivativeAssetIds?: string[];
  safeZoneCompliant: boolean;
  carouselSlideCount?: number;
}

export interface SocialAssetEntity extends UnifiedBrandAssetEntity {
  socialMetadata: SocialCreativeMetadata;
}

// =============================================================================
// 3. PLATFORM ADAPTATION ENGINE
// =============================================================================

export interface PlatformAdaptationRequest {
  workspaceId: string;
  sourceAssetId: string;
  targetFormats: Array<{
    platform: SocialPlatform;
    contentType: SocialContentType;
  }>;
  headlineOverride?: string;
  ctaOverride?: string;
  preserveBrandTokens?: boolean;
  userId?: string;
}

export interface AdaptedDerivativeResult {
  derivativeAssetId: string;
  platform: SocialPlatform;
  contentType: SocialContentType;
  dimensions: { width: number; height: number };
  aspectRatio: string;
  svgContent: string;
  safeZoneCompliance: {
    isCompliant: boolean;
    safeZonesApplied: PlatformSafeZones;
    warnings: string[];
  };
  recomposedElementsCount: number;
}

export interface PlatformAdaptationResponse {
  sourceAssetId: string;
  workspaceId: string;
  adaptedDerivatives: AdaptedDerivativeResult[];
  adaptedAt: string;
}

// =============================================================================
// 4. AI CREATIVE GENERATION
// =============================================================================

export interface SocialCreativeGenerationRequest {
  workspaceId: string;
  userId: string;
  platform: SocialPlatform;
  contentType: SocialContentType;
  promptHeadline: string;
  subheadline?: string;
  callToAction?: string;
  productId?: string;
  campaignId?: string;
  creativeConcept?: string;
  targetAudience?: string;
  carouselSlides?: Array<{
    slideNumber: number;
    title: string;
    body: string;
    visualConcept: string;
  }>;
  customDimensions?: { width: number; height: number };
}

export interface SocialCreativeGenerationResponse {
  assetId: string;
  workspaceId: string;
  name: string;
  platform: SocialPlatform;
  contentType: SocialContentType;
  dimensions: { width: number; height: number };
  svgContent: string;
  socialMetadata: SocialCreativeMetadata;
  groundedIn: {
    brandName: string;
    verifiedProductSku?: string;
    appliedPalette: string[];
  };
  generatedAt: string;
}

// =============================================================================
// 5. CAMPAIGN INTEGRATION
// =============================================================================

export interface CampaignCreativeBindingRequest {
  workspaceId: string;
  campaignId: string;
  campaignName: string;
  assetIds: string[];
  userId?: string;
}

export interface CampaignCollectionSummary {
  campaignId: string;
  campaignName: string;
  collectionId: string;
  totalAssetsCount: number;
  approvedCount: number;
  platformsCovered: SocialPlatform[];
  contentTypesCovered: SocialContentType[];
  lastUpdated: string;
}

// =============================================================================
// 6. PERFORMANCE INTELLIGENCE
// =============================================================================

export interface SocialPerformanceIngestionRecord {
  recordId?: string;
  workspaceId: string;
  assetId: string;
  platform: SocialPlatform;
  channel: string;
  reportingDate: string;
  reach?: number;
  impressions: number;
  engagement?: number;
  saves?: number;
  shares?: number;
  clicks: number;
  views?: number;
  watchTimeSeconds?: number;
  conversions: number;
  spend: number;
  revenue: number;
  provenance: 'API_DIRECT' | 'MANUAL_IMPORT' | 'ANALYTICS_CSV';
}

export interface SocialPerformanceMetricsSummary {
  assetId: string;
  platform: SocialPlatform;
  totalImpressions: number;
  totalReach: number;
  totalClicks: number;
  totalSaves: number;
  totalShares: number;
  totalConversions: number;
  ctr: number; // Click-through rate (%)
  engagementRate: number; // Engagement / Reach (%)
  roas?: number; // Return on ad spend
  lastReportedDate: string;
}

// =============================================================================
// 7. CREATIVE PERFORMANCE MEMORY & REPURPOSING
// =============================================================================

export interface CreativePerformancePattern {
  patternId: string;
  patternName: string;
  dominantFormat: SocialContentType;
  dominantPlatform: SocialPlatform;
  winningVisualElements: string[];
  averageEngagementRate: number;
  averageRoas: number;
  evidenceBasedRecommendation: string;
  causationCaution: string;
  sampleAssetIds: string[];
}

export interface CreativeRepurposingRequest {
  workspaceId: string;
  sourceAssetId: string;
  targetPlatform: SocialPlatform;
  targetContentType: SocialContentType;
  userId?: string;
}
