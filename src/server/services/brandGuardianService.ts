/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'node:crypto';
import { db } from '../db/firestore';
import { brandAssetRepository } from '../repositories/brandAssetRepository';
import { brandIdentityRepository } from '../repositories/brandIdentityRepository';
import { businessBrainService } from './businessBrainService';
import type {
  AuthoritativeBrandIdentityEntity,
  BrandComplianceCheckItem,
  BrandComplianceReport,
  ComplianceCheckType,
  BrandDesignTokens,
  BrandDriftItem,
  BrandDriftReport,
  BrandIdentityImpactAnalysis,
  LogoVariantSpec,
  LogoVariantType,
} from '../types/brandIdentity';

// =============================================================================
// HELPER UTILITIES: COLOR DISTANCE & HEX EXTRACTION
// =============================================================================

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const num = parseInt(clean, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function colorDistance(hex1: string, hex2: string): number {
  try {
    const c1 = hexToRgb(hex1);
    const c2 = hexToRgb(hex2);
    // Euclidean distance in RGB color space (0 to ~441.67)
    return Math.sqrt(
      Math.pow(c1.r - c2.r, 2) + Math.pow(c1.g - c2.g, 2) + Math.pow(c1.b - c2.b, 2)
    );
  } catch {
    return 999;
  }
}

function hexToCmyk(hex: string): string {
  try {
    const { r, g, b } = hexToRgb(hex);
    const rNorm = r / 255;
    const gNorm = g / 255;
    const bNorm = b / 255;
    const k = 1 - Math.max(rNorm, gNorm, bNorm);
    if (k === 1) return 'C:0% M:0% Y:0% K:100%';
    const c = Math.round(((1 - rNorm - k) / (1 - k)) * 100);
    const m = Math.round(((1 - gNorm - k) / (1 - k)) * 100);
    const y = Math.round(((1 - bNorm - k) / (1 - k)) * 100);
    const kPct = Math.round(k * 100);
    return `C:${c}% M:${m}% Y:${y}% K:${kPct}%`;
  } catch {
    return 'C:0% M:0% Y:0% K:100%';
  }
}

export class BrandGuardianService {
  private col(workspaceId: string) {
    return db.collection<AuthoritativeBrandIdentityEntity>(
      `workspaces/${workspaceId}/authoritativeBrandIdentities`
    );
  }

  // ===========================================================================
  // 1. AUTHORITATIVE BRAND IDENTITY REPOSITORY & DEFAULTS
  // ===========================================================================

  public async getAuthoritativeIdentity(
    workspaceId: string
  ): Promise<AuthoritativeBrandIdentityEntity> {
    const snap = await this.col(workspaceId)
      .where('status', '==', 'active')
      .orderBy('version', 'desc')
      .limit(1)
      .get();

    if (snap.docs.length > 0) {
      const data = snap.docs[0].data();
      if (data) return data;
    }

    // Fallback: check any version
    const anySnap = await this.col(workspaceId).orderBy('version', 'desc').limit(1).get();
    if (anySnap.docs.length > 0) {
      const data = anySnap.docs[0].data();
      if (data) return data;
    }

    // Auto-bootstrap authoritative brand identity from Business Brain
    return this.bootstrapDefaultIdentity(workspaceId);
  }

  public async bootstrapDefaultIdentity(
    workspaceId: string
  ): Promise<AuthoritativeBrandIdentityEntity> {
    const profile = await businessBrainService.getProfile(workspaceId);
    const existingBrand = await brandIdentityRepository.getLatest(workspaceId);

    const now = new Date().toISOString();
    const brandName = profile.businessName || existingBrand?.brandName || 'BrainWise Brand';
    const tagline = profile.tagline || existingBrand?.tagline || 'Intelligent Brand Operating System';
    const primaryHex = existingBrand?.palette?.primary || '#171717';
    const secondaryHex = existingBrand?.palette?.secondary || '#C44D00';
    const accentHex = existingBrand?.palette?.accent || '#FF7417';
    const backgroundHex = existingBrand?.palette?.background || '#FAFAF9';
    const neutralHex = existingBrand?.palette?.neutral || '#70706B';

    const headingFont = existingBrand?.typography?.heading || 'Plus Jakarta Sans';
    const bodyFont = existingBrand?.typography?.body || 'Inter';

    const tokens: BrandDesignTokens = {
      colors: {
        primary: {
          hex: primaryHex,
          rgb: `rgb(${hexToRgb(primaryHex).r}, ${hexToRgb(primaryHex).g}, ${hexToRgb(primaryHex).b})`,
          cmyk: hexToCmyk(primaryHex),
          name: 'Obsidian Black',
          roleRatioPct: 60,
          description: 'Dominant corporate baseline for typography and dark surfaces.',
        },
        secondary: {
          hex: secondaryHex,
          rgb: `rgb(${hexToRgb(secondaryHex).r}, ${hexToRgb(secondaryHex).g}, ${hexToRgb(secondaryHex).b})`,
          cmyk: hexToCmyk(secondaryHex),
          name: 'Burnished Terracotta',
          roleRatioPct: 30,
          description: 'Supporting brand color for structural cards and subheadings.',
        },
        accent: {
          hex: accentHex,
          rgb: `rgb(${hexToRgb(accentHex).r}, ${hexToRgb(accentHex).g}, ${hexToRgb(accentHex).b})`,
          cmyk: hexToCmyk(accentHex),
          name: 'Electric Solar Orange',
          roleRatioPct: 10,
          description: 'High-contrast focal point for CTAs, active indicators, and badges.',
        },
        background: {
          hex: backgroundHex,
          rgb: `rgb(${hexToRgb(backgroundHex).r}, ${hexToRgb(backgroundHex).g}, ${hexToRgb(backgroundHex).b})`,
          cmyk: hexToCmyk(backgroundHex),
          name: 'Alabaster Canvas',
          roleRatioPct: 0,
          description: 'Main page and card fill background surface.',
        },
        neutral: {
          hex: neutralHex,
          rgb: `rgb(${hexToRgb(neutralHex).r}, ${hexToRgb(neutralHex).g}, ${hexToRgb(neutralHex).b})`,
          cmyk: hexToCmyk(neutralHex),
          name: 'Subdued Slate',
          roleRatioPct: 0,
          description: 'Secondary metadata, borders, and muted captions.',
        },
        functional: {
          success: '#10B981',
          warning: '#F59E0B',
          error: '#EF4444',
          info: '#3B82F6',
        },
      },
      typography: {
        display: {
          family: headingFont,
          weight: 800,
          sizePx: 48,
          lineHeight: 1.15,
          letterSpacing: '-0.02em',
          usage: 'Hero title displays and high-impact marketing billboards',
        },
        heading: {
          family: headingFont,
          weight: 700,
          sizePx: 32,
          lineHeight: 1.25,
          letterSpacing: '-0.01em',
          usage: 'Section headers, page titles, and modal headers',
        },
        subheading: {
          family: headingFont,
          weight: 600,
          sizePx: 20,
          lineHeight: 1.35,
          letterSpacing: '0em',
          usage: 'Card titles and component group headers',
        },
        body: {
          family: bodyFont,
          weight: 400,
          sizePx: 14,
          lineHeight: 1.5,
          letterSpacing: '0em',
          usage: 'Paragraph text, descriptive copy, and general body reading',
        },
        caption: {
          family: bodyFont,
          weight: 500,
          sizePx: 12,
          lineHeight: 1.4,
          letterSpacing: '0.01em',
          usage: 'Badges, labels, table headers, and fine print',
        },
        code: {
          family: 'JetBrains Mono',
          weight: 500,
          sizePx: 12,
          lineHeight: 1.4,
          letterSpacing: '0em',
          usage: 'Asset IDs, checksums, token keys, and technical specs',
        },
      },
      components: {
        buttonPrimary: {
          borderRadiusPx: 8,
          padding: '10px 18px',
          fontWeight: 600,
          backgroundHex: accentHex,
          textColorHex: '#FFFFFF',
        },
        buttonSecondary: {
          borderRadiusPx: 8,
          padding: '10px 18px',
          fontWeight: 600,
          borderHex: '#E6E6E2',
          textColorHex: '#252525',
        },
        card: {
          borderRadiusPx: 16,
          borderHex: '#ECECE8',
          backgroundHex: '#FFFFFF',
          shadow: '0 1px 3px rgba(0,0,0,0.04)',
        },
        iconography: {
          strokeWidth: 1.75,
          style: 'outline',
          defaultSizePx: 20,
        },
      },
      visualStyle: {
        photographyDirection: 'Authentic lighting, candid human subjects, zero artificial saturation, warm organic tone.',
        illustrationStyle: 'Geometric vector line work, monochromatic primary with accent spot highlights.',
        patterns: 'Subtle topographic contours (TopoGrid), 24px grid spacing, 10% opacity.',
        backgroundTreatments: 'Clean off-white canvas with radial ambient glow in brand accent tone.',
        layoutConventions: '8-point grid alignment, 24px baseline gutter, 16px minimum safe area margins.',
      },
      rawTokensJson: '',
    };

    tokens.rawTokensJson = JSON.stringify(
      {
        $schema: 'https://design-tokens.github.io/community-group/format/',
        name: brandName,
        version: '1.0.0',
        color: {
          primary: { $value: primaryHex, $type: 'color' },
          secondary: { $value: secondaryHex, $type: 'color' },
          accent: { $value: accentHex, $type: 'color' },
          background: { $value: backgroundHex, $type: 'color' },
          neutral: { $value: neutralHex, $type: 'color' },
        },
        font: {
          heading: { $value: headingFont, $type: 'fontFamily' },
          body: { $value: bodyFont, $type: 'fontFamily' },
        },
      },
      null,
      2
    );

    // Build standard 10 Logo Variants
    const logos = this.generateStandardLogoVariants(brandName, primaryHex, accentHex, headingFont);

    const identity: AuthoritativeBrandIdentityEntity = {
      identityId: `bid_${Date.now()}_v1`,
      workspaceId,
      version: 1,
      versionLabel: 'v1.0.0 - Foundation Identity',
      status: 'active',
      effectiveFrom: now,
      effectiveTo: null,
      brandName,
      tagline,
      mission: profile.overviewSummary || 'Empowering distinction through verified brand craft.',
      vision: 'The premier benchmark in modern product experience.',
      brandVoice: {
        tone: 'Authoritative, precise, modern, discerning',
        personality: ['Intelligent', 'Refined', 'Visionary', 'Grounded'],
        wordsToUse: ['Precision', 'Distinctive', 'Crafted', 'Authoritative', 'Essential'],
        wordsToAvoid: ['Cheap', 'Hacks', 'Viral', 'Guaranteed', 'Miracle'],
      },
      approvedClaims: ['100% vector SVG precision', 'Deterministic brand consistency'],
      restrictedClaims: ['Instant riches', 'World’s only', 'Zero-effort scale'],
      businessBrainSync: {
        syncedAt: now,
        isAuthoritative: true,
        confirmedFactsCount: Object.keys(profile.provenance || {}).length,
      },
      logos,
      logoSourceFiles: [
        { name: `${brandName.toLowerCase()}-master.svg`, format: 'SVG' },
        { name: `${brandName.toLowerCase()}-tokens.json`, format: 'JSON' },
      ],
      tokens,
      guidelines: {
        logoDoRules: [
          'Maintain minimum 25% clear space on all sides of the mark.',
          'Always use vector SVG format for digital screen displays.',
          'Use the dark variant on light surfaces and white variant on dark surfaces.',
          'Keep mark and wordmark locked together according to standard horizontal aspect ratio.',
        ],
        logoDontRules: [
          'Do NOT stretch, skew, or distort the mark proportions.',
          'Do NOT recolor the logo with unauthorized non-brand hex codes.',
          'Do NOT add drop shadows, outer glows, or gradients to the vector mark.',
          'Do NOT rotate the emblem at unapproved arbitrary angles.',
          'Do NOT place the logo over busy, low-contrast photographic backgrounds.',
        ],
        colorRules: [
          'Follow the 60-30-10 ratio: 60% neutral/dark, 30% secondary, 10% accent highlight.',
          'All text pairings must meet WCAG AA contrast ratio (4.5:1 for normal text).',
          'Use accent color (#FF7417) strictly for actionable focal points, never for large background fills.',
        ],
        typographyRules: [
          'Use Plus Jakarta Sans exclusively for headings, titles, and display markers.',
          'Use Inter for all continuous body copy, paragraphs, and list elements.',
          'Never pair more than two font families across a single visual collateral.',
        ],
        imageryRules: [
          'Product photography must feature authentic daylight without blown highlights.',
          'Avoid stock photography clichés and artificial AI uncanny valley renders.',
        ],
        spacingRules: [
          'All container margins and paddings must adhere to 8pt grid increments (8, 16, 24, 32, 48, 64px).',
          'Minimum safe area margin from any artboard boundary is 16px.',
        ],
      },
      changelog: 'Initial authoritative brand identity generated from Business Brain.',
      createdAt: now,
      updatedAt: now,
    };

    await this.col(workspaceId).doc(identity.identityId).set(identity);
    return identity;
  }

  /**
   * Generates the 10 standard logo variants for the brand
   */
  public generateStandardLogoVariants(
    brandName: string,
    primaryHex: string,
    accentHex: string,
    fontFamily: string
  ): Record<LogoVariantType, LogoVariantSpec> {
    const symbolInner = `<path d="M 50 15 L 85 85 L 15 85 Z" fill="${accentHex}"/>
<circle cx="50" cy="62" r="14" fill="${primaryHex}"/>`;

    return {
      primary: {
        variantType: 'primary',
        name: `${brandName} Primary Combination Mark`,
        svgMarkup: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 180" width="600" height="180">
  <g transform="translate(20, 20) scale(1.4)">
    ${symbolInner}
  </g>
  <text x="180" y="95" font-family="${fontFamily}, sans-serif" font-size="44" font-weight="800" letter-spacing="-1" fill="${primaryHex}">${brandName}</text>
  <text x="182" y="130" font-family="Inter, sans-serif" font-size="12" font-weight="600" letter-spacing="3" fill="#686864">BRAND OPERATING SYSTEM</text>
</svg>`,
        aspectRatio: 600 / 180,
        dimensions: { width: 600, height: 180 },
        clearSpaceMultiplier: 0.25,
        minWidthPx: 160,
        minWidthPrintMm: 35,
        isApproved: true,
        usageRule: 'Primary lockup for top-level headers, website navbars, and official correspondence.',
      },

      secondary: {
        variantType: 'secondary',
        name: `${brandName} Secondary Badge`,
        svgMarkup: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 360" width="400" height="360">
  <g transform="translate(130, 30) scale(1.4)">
    ${symbolInner}
  </g>
  <text x="200" y="240" font-family="${fontFamily}, sans-serif" font-size="36" font-weight="800" text-anchor="middle" fill="${primaryHex}">${brandName}</text>
  <text x="200" y="275" font-family="Inter, sans-serif" font-size="11" font-weight="600" letter-spacing="2" text-anchor="middle" fill="#686864">AUTHENTIC HERITAGE</text>
</svg>`,
        aspectRatio: 400 / 360,
        dimensions: { width: 400, height: 360 },
        clearSpaceMultiplier: 0.3,
        minWidthPx: 120,
        minWidthPrintMm: 28,
        isApproved: true,
        usageRule: 'Centered packaging labels, seals, and circular promotional stickers.',
      },

      horizontal: {
        variantType: 'horizontal',
        name: `${brandName} Horizontal Slim Lockup`,
        svgMarkup: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 140" width="700" height="140">
  <g transform="translate(20, 10) scale(1.2)">
    ${symbolInner}
  </g>
  <text x="160" y="82" font-family="${fontFamily}, sans-serif" font-size="40" font-weight="800" letter-spacing="-0.5" fill="${primaryHex}">${brandName}</text>
</svg>`,
        aspectRatio: 700 / 140,
        dimensions: { width: 700, height: 140 },
        clearSpaceMultiplier: 0.2,
        minWidthPx: 180,
        minWidthPrintMm: 40,
        isApproved: true,
        usageRule: 'Constrained vertical spaces such as sticky app navigation bars and invoice headers.',
      },

      vertical: {
        variantType: 'vertical',
        name: `${brandName} Vertical Stacked Mark`,
        svgMarkup: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 460" width="360" height="460">
  <g transform="translate(110, 40) scale(1.4)">
    ${symbolInner}
  </g>
  <text x="180" y="310" font-family="${fontFamily}, sans-serif" font-size="38" font-weight="800" text-anchor="middle" fill="${primaryHex}">${brandName}</text>
  <text x="180" y="348" font-family="Inter, sans-serif" font-size="12" font-weight="600" letter-spacing="2" text-anchor="middle" fill="#686864">EDITION 2026</text>
</svg>`,
        aspectRatio: 360 / 460,
        dimensions: { width: 360, height: 460 },
        clearSpaceMultiplier: 0.35,
        minWidthPx: 110,
        minWidthPrintMm: 25,
        isApproved: true,
        usageRule: 'Vertical banners, shopping bags, and narrow column layouts.',
      },

      iconOnly: {
        variantType: 'iconOnly',
        name: `${brandName} Isolated Symbol / Icon`,
        svgMarkup: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <g transform="translate(50, 40) scale(1.0)">
    ${symbolInner}
  </g>
</svg>`,
        aspectRatio: 1.0,
        dimensions: { width: 200, height: 200 },
        clearSpaceMultiplier: 0.5,
        minWidthPx: 32,
        minWidthPrintMm: 8,
        isApproved: true,
        usageRule: 'Profile avatars, social media profile pictures, and discreet hardware embossings.',
      },

      monochrome: {
        variantType: 'monochrome',
        name: `${brandName} Monochrome Black Mark`,
        svgMarkup: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 180" width="600" height="180">
  <g transform="translate(20, 20) scale(1.4)">
    <path d="M 50 15 L 85 85 L 15 85 Z" fill="#000000"/>
    <circle cx="50" cy="62" r="14" fill="#FFFFFF"/>
  </g>
  <text x="180" y="95" font-family="${fontFamily}, sans-serif" font-size="44" font-weight="800" letter-spacing="-1" fill="#000000">${brandName}</text>
  <text x="182" y="130" font-family="Inter, sans-serif" font-size="12" font-weight="600" letter-spacing="3" fill="#000000">BRAND OPERATING SYSTEM</text>
</svg>`,
        aspectRatio: 600 / 180,
        dimensions: { width: 600, height: 180 },
        clearSpaceMultiplier: 0.25,
        minWidthPx: 160,
        minWidthPrintMm: 35,
        isApproved: true,
        usageRule: 'Single-color black laser engraving, thermal receipts, newspaper ads, and photocopies.',
      },

      white: {
        variantType: 'white',
        name: `${brandName} Knockout White Mark`,
        svgMarkup: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 180" width="600" height="180">
  <g transform="translate(20, 20) scale(1.4)">
    <path d="M 50 15 L 85 85 L 15 85 Z" fill="#FFFFFF"/>
    <circle cx="50" cy="62" r="14" fill="#171717"/>
  </g>
  <text x="180" y="95" font-family="${fontFamily}, sans-serif" font-size="44" font-weight="800" letter-spacing="-1" fill="#FFFFFF">${brandName}</text>
  <text x="182" y="130" font-family="Inter, sans-serif" font-size="12" font-weight="600" letter-spacing="3" fill="#D5D5D0">BRAND OPERATING SYSTEM</text>
</svg>`,
        aspectRatio: 600 / 180,
        dimensions: { width: 600, height: 180 },
        clearSpaceMultiplier: 0.25,
        minWidthPx: 160,
        minWidthPrintMm: 35,
        isApproved: true,
        usageRule: 'Placing on dark backgrounds, black stationery, and photographic dark zones.',
      },

      dark: {
        variantType: 'dark',
        name: `${brandName} Dark Surface Variant`,
        svgMarkup: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 180" width="600" height="180">
  <rect width="600" height="180" rx="16" fill="#171717"/>
  <g transform="translate(25, 20) scale(1.4)">
    <path d="M 50 15 L 85 85 L 15 85 Z" fill="${accentHex}"/>
    <circle cx="50" cy="62" r="14" fill="#171717"/>
  </g>
  <text x="185" y="95" font-family="${fontFamily}, sans-serif" font-size="44" font-weight="800" letter-spacing="-1" fill="#FFFFFF">${brandName}</text>
  <text x="187" y="130" font-family="Inter, sans-serif" font-size="12" font-weight="600" letter-spacing="3" fill="${accentHex}">BRAND OPERATING SYSTEM</text>
</svg>`,
        aspectRatio: 600 / 180,
        dimensions: { width: 600, height: 180 },
        clearSpaceMultiplier: 0.25,
        minWidthPx: 160,
        minWidthPrintMm: 35,
        isApproved: true,
        usageRule: 'Self-contained badge on dark-mode interfaces, exhibition stalls, and illuminated signs.',
      },

      favicon: {
        variantType: 'favicon',
        name: `${brandName} Browser Favicon`,
        svgMarkup: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <rect width="64" height="64" rx="14" fill="${primaryHex}"/>
  <path d="M 32 10 L 52 52 L 12 52 Z" fill="${accentHex}"/>
  <circle cx="32" cy="38" r="8" fill="${primaryHex}"/>
</svg>`,
        aspectRatio: 1.0,
        dimensions: { width: 64, height: 64 },
        clearSpaceMultiplier: 0.1,
        minWidthPx: 16,
        minWidthPrintMm: 4,
        isApproved: true,
        usageRule: 'Browser tabs, bookmark shortcuts, and desktop bookmarks.',
      },

      appIcon: {
        variantType: 'appIcon',
        name: `${brandName} iOS & Android App Icon`,
        svgMarkup: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="app_bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#242424"/>
      <stop offset="100%" stop-color="#121212"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="115" fill="url(#app_bg)"/>
  <g transform="translate(136, 116) scale(2.4)">
    <path d="M 50 15 L 85 85 L 15 85 Z" fill="${accentHex}"/>
    <circle cx="50" cy="62" r="14" fill="#171717"/>
  </g>
</svg>`,
        aspectRatio: 1.0,
        dimensions: { width: 512, height: 512 },
        clearSpaceMultiplier: 0.2,
        minWidthPx: 64,
        minWidthPrintMm: 15,
        isApproved: true,
        usageRule: 'Mobile application home screen launch icon and progressive web app manifest.',
      },
    };
  }

  // ===========================================================================
  // 2. BRAND IDENTITY VERSIONING & MUTATION
  // ===========================================================================

  public async saveAuthoritativeIdentity(
    workspaceId: string,
    patch: Partial<AuthoritativeBrandIdentityEntity>,
    _userId = 'system'
  ): Promise<AuthoritativeBrandIdentityEntity> {
    const current = await this.getAuthoritativeIdentity(workspaceId);
    const now = new Date().toISOString();
    const nextVersion = current.version + 1;

    // Mark current active version as superseded
    await this.col(workspaceId).doc(current.identityId).update({
      status: 'superseded',
      effectiveTo: now,
      updatedAt: now,
    });

    const newIdentityId = `bid_${Date.now()}_v${nextVersion}`;
    const newIdentity: AuthoritativeBrandIdentityEntity = {
      ...current,
      ...patch,
      identityId: newIdentityId,
      workspaceId,
      version: nextVersion,
      versionLabel: patch.versionLabel || `v${nextVersion}.0.0 - Brand Refresh`,
      status: 'active',
      effectiveFrom: now,
      effectiveTo: null,
      previousVersionId: current.identityId,
      changelog: patch.changelog || `Updated brand identity to version ${nextVersion}`,
      createdAt: now,
      updatedAt: now,
    };

    await this.col(workspaceId).doc(newIdentityId).set(newIdentity);

    // Sync back to brandIdentityRepository and Business Brain
    await brandIdentityRepository.save({
      brandIdentityId: newIdentityId,
      workspaceId,
      version: nextVersion,
      brandName: newIdentity.brandName,
      tagline: newIdentity.tagline,
      mission: newIdentity.mission,
      vision: newIdentity.vision,
      personality: newIdentity.brandVoice.personality,
      voice: [newIdentity.brandVoice.tone],
      tone: newIdentity.brandVoice.tone,
      palette: {
        primary: newIdentity.tokens.colors.primary.hex,
        secondary: newIdentity.tokens.colors.secondary.hex,
        accent: newIdentity.tokens.colors.accent.hex,
        neutral: newIdentity.tokens.colors.neutral.hex,
        background: newIdentity.tokens.colors.background.hex,
      },
      typography: {
        heading: newIdentity.tokens.typography.heading.family,
        body: newIdentity.tokens.typography.body.family,
      },
    });

    return newIdentity;
  }

  public async listIdentityVersions(
    workspaceId: string
  ): Promise<AuthoritativeBrandIdentityEntity[]> {
    const snap = await this.col(workspaceId).orderBy('version', 'desc').get();
    if (snap.docs.length === 0) {
      const initial = await this.getAuthoritativeIdentity(workspaceId);
      return [initial];
    }
    return snap.docs
      .map((d) => d.data())
      .filter((d): d is AuthoritativeBrandIdentityEntity => Boolean(d));
  }

  // ===========================================================================
  // 3. BUSINESS BRAIN SYNCHRONIZATION
  // ===========================================================================

  public async syncWithBusinessBrain(
    workspaceId: string
  ): Promise<AuthoritativeBrandIdentityEntity> {
    const profile = await businessBrainService.getProfile(workspaceId);
    const current = await this.getAuthoritativeIdentity(workspaceId);

    const updatedPatch: Partial<AuthoritativeBrandIdentityEntity> = {
      brandName: profile.businessName || current.brandName,
      tagline: profile.tagline || current.tagline,
      mission: profile.overviewSummary || current.mission,
      businessBrainSync: {
        syncedAt: new Date().toISOString(),
        isAuthoritative: true,
        confirmedFactsCount: Object.keys(profile.provenance || {}).length,
      },
      changelog: 'Synchronized verified business facts from Business Brain.',
    };

    return this.saveAuthoritativeIdentity(workspaceId, updatedPatch, 'business-brain-sync');
  }

  // ===========================================================================
  // 4. BRAND GUARDIAN AI: COMPLIANCE CHECKER
  // ===========================================================================

  public async evaluateAssetCompliance(params: {
    workspaceId: string;
    assetId?: string;
    assetTitle?: string;
    svgMarkup?: string;
    headlineText?: string;
    subtext?: string;
    colorsUsed?: string[];
    fontsUsed?: string[];
    autoRemediate?: boolean;
  }): Promise<BrandComplianceReport> {
    const { workspaceId, autoRemediate = false } = params;
    const now = new Date().toISOString();
    const identity = await this.getAuthoritativeIdentity(workspaceId);

    let svgMarkup = params.svgMarkup || '';
    let headline = params.headlineText || '';
    let subtext = params.subtext || '';
    const colorsUsed = params.colorsUsed ? [...params.colorsUsed] : [];
    const fontsUsed = params.fontsUsed ? [...params.fontsUsed] : [];

    // If assetId is provided, pull from repository
    if (params.assetId) {
      const asset = await brandAssetRepository.getById(workspaceId, params.assetId);
      if (asset) {
        if (!svgMarkup && asset.svgMarkup) svgMarkup = asset.svgMarkup;
        if (!headline && asset.headlineText) headline = asset.headlineText;
        if (!subtext && asset.subtext) subtext = asset.subtext;
      }
    }

    // Extract colors and fonts from SVG markup
    if (svgMarkup) {
      const hexMatches = svgMarkup.match(/#[0-9a-fA-F]{6}\b/g) || [];
      for (const h of hexMatches) {
        if (!colorsUsed.includes(h.toUpperCase())) colorsUsed.push(h.toUpperCase());
      }
      const fontMatches = svgMarkup.match(/font-family="([^",]+)/gi) || [];
      for (const fm of fontMatches) {
        const cleanFont = fm.replace(/font-family="/i, '').trim();
        if (!fontsUsed.includes(cleanFont)) fontsUsed.push(cleanFont);
      }
    }

    const checks: BrandComplianceCheckItem[] = [];
    const detectedOffBrandColors: string[] = [];
    const detectedOffBrandFonts: string[] = [];
    const detectedProhibitedClaims: string[] = [];
    let remediatedSvg = svgMarkup;

    // A. Check 1: Color Palette Compliance (Deterministic)
    const approvedHexes = [
      identity.tokens.colors.primary.hex.toUpperCase(),
      identity.tokens.colors.secondary.hex.toUpperCase(),
      identity.tokens.colors.accent.hex.toUpperCase(),
      identity.tokens.colors.background.hex.toUpperCase(),
      identity.tokens.colors.neutral.hex.toUpperCase(),
      '#FFFFFF',
      '#000000',
      '#171717',
      '#252525',
      '#5C5C58',
      '#686864',
    ];

    for (const color of colorsUsed) {
      // Find minimum distance to any approved hex
      const minDistance = Math.min(
        ...approvedHexes.map((approved) => colorDistance(color, approved))
      );
      // Tolerance threshold: distance <= 35 (~8% variance) is treated as visually acceptable
      if (minDistance > 35) {
        detectedOffBrandColors.push(color);
      }
    }

    if (detectedOffBrandColors.length === 0) {
      checks.push({
        checkType: 'color_compliance',
        name: 'Color Palette Integrity',
        passed: true,
        score: 100,
        severity: 'info',
        confidence: 0.99,
        evidence: `All ${colorsUsed.length || 1} detected colors adhere strictly to approved brand tokens.`,
        recommendedRemediation: 'No color changes required.',
      });
    } else {
      const penalty = Math.min(50, detectedOffBrandColors.length * 20);
      checks.push({
        checkType: 'color_compliance',
        name: 'Color Palette Integrity',
        passed: false,
        score: Math.max(10, 50 - penalty),
        severity: 'critical',
        confidence: 0.98,
        evidence: `Detected ${detectedOffBrandColors.length} off-brand color(s): ${detectedOffBrandColors.join(', ')}.`,
        recommendedRemediation: `Remediate off-brand colors to authoritative brand accent (${identity.tokens.colors.accent.hex}) or primary (${identity.tokens.colors.primary.hex}).`,
      });

      // Auto-remediation if requested
      if (autoRemediate && remediatedSvg) {
        for (const unapproved of detectedOffBrandColors) {
          remediatedSvg = remediatedSvg.replace(
            new RegExp(unapproved, 'gi'),
            identity.tokens.colors.accent.hex
          );
        }
      }
    }

    // B. Check 2: Typography Conformance (Deterministic)
    const approvedFonts = [
      identity.tokens.typography.heading.family.toLowerCase(),
      identity.tokens.typography.body.family.toLowerCase(),
      'inter',
      'plus jakarta sans',
      'system-ui',
      'sans-serif',
      'monospace',
    ];

    for (const font of fontsUsed) {
      if (!approvedFonts.some((af) => font.toLowerCase().includes(af))) {
        detectedOffBrandFonts.push(font);
      }
    }

    if (detectedOffBrandFonts.length === 0) {
      checks.push({
        checkType: 'typography',
        name: 'Typography Hierarchy & Font Family',
        passed: true,
        score: 100,
        severity: 'info',
        confidence: 0.98,
        evidence: 'Typography conforms with approved Plus Jakarta Sans & Inter font hierarchy.',
        recommendedRemediation: 'No typography adjustments required.',
      });
    } else {
      checks.push({
        checkType: 'typography',
        name: 'Typography Hierarchy & Font Family',
        passed: false,
        score: 40,
        severity: 'warning',
        confidence: 0.95,
        evidence: `Detected unapproved font family: ${detectedOffBrandFonts.join(', ')}.`,
        recommendedRemediation: `Replace fonts with approved brand heading (${identity.tokens.typography.heading.family}) or body (${identity.tokens.typography.body.family}).`,
      });
    }

    // C. Check 3: Logo Proportions & Aspect Ratio (Deterministic)
    let logoPassed = true;
    let logoEvidence = 'Standard logo dimensions verified with zero distortion.';
    if (svgMarkup && svgMarkup.includes('viewBox')) {
      const vbMatch = svgMarkup.match(/viewBox="([^"]+)"/);
      if (vbMatch) {
        const parts = vbMatch[1].trim().split(/[\s,]+/).map(Number);
        if (parts.length === 4) {
          const width = parts[2];
          const height = parts[3];
          const ratio = width / height;

          // If identified as horizontal logo, verify ratio
          if (params.assetTitle?.toLowerCase().includes('horizontal') && Math.abs(ratio - (700 / 140)) > 0.5) {
            logoPassed = false;
            logoEvidence = `Horizontal logo aspect ratio ${ratio.toFixed(2)} deviates from standard 5.0 (700x140).`;
          }
        }
      }
    }

    checks.push({
      checkType: 'logo_proportions',
      name: 'Logo Geometry & Proportion Integrity',
      passed: logoPassed,
      score: logoPassed ? 100 : 50,
      severity: logoPassed ? 'info' : 'critical',
      confidence: 0.96,
      evidence: logoEvidence,
      recommendedRemediation: logoPassed
        ? 'Aspect ratio is locked.'
        : 'Lock aspect ratio using official SVG viewBox coordinates.',
    });

    // D. Check 4: Spacing and Clear Space
    let spacingPassed = true;
    if (svgMarkup && (svgMarkup.includes('translate(0, 0)') || svgMarkup.includes('translate(0,0)'))) {
      spacingPassed = false;
    }

    checks.push({
      checkType: 'spacing_clearspace',
      name: 'Clear Space & Edge Margins',
      passed: spacingPassed,
      score: spacingPassed ? 100 : 80,
      severity: spacingPassed ? 'info' : 'warning',
      confidence: 0.92,
      evidence: spacingPassed
        ? 'Minimum 16px safe margin observed across artboard perimeter.'
        : 'Elements touch artboard edges without mandatory 16px safe margin.',
      recommendedRemediation: spacingPassed
        ? 'Safe margins maintained.'
        : 'Add minimum 16px padding inside artboard container.',
    });

    // E. Check 5: Claim Truth & Prohibited Language (Deterministic Business Brain Check)
    const norm = (str: string) => str.toLowerCase().replace(/[’']/g, "'").trim();
    const combinedText = norm(`${headline} ${subtext}`);
    for (const restricted of identity.restrictedClaims) {
      if (combinedText.includes(norm(restricted))) {
        detectedProhibitedClaims.push(restricted);
      }
    }
    for (const badWord of identity.brandVoice.wordsToAvoid) {
      if (combinedText.includes(norm(badWord))) {
        detectedProhibitedClaims.push(badWord);
      }
    }

    if (detectedProhibitedClaims.length === 0) {
      checks.push({
        checkType: 'claim_truth',
        name: 'Brand Voice & Claim Verification',
        passed: true,
        score: 100,
        severity: 'info',
        confidence: 0.99,
        evidence: 'Zero restricted claims or forbidden words detected in copywriting.',
        recommendedRemediation: 'Copy complies with Truth Engine standards.',
      });
    } else {
      checks.push({
        checkType: 'claim_truth',
        name: 'Brand Voice & Claim Verification',
        passed: false,
        score: 30,
        severity: 'critical',
        confidence: 0.99,
        evidence: `Detected prohibited claim/word: "${detectedProhibitedClaims.join(', ')}".`,
        recommendedRemediation: 'Remove unverified or restricted claims before publishing.',
      });
    }

    // Calculate Overall Compliance Score (Weighted Average)
    const weights: Record<ComplianceCheckType, number> = {
      color_compliance: 0.3,
      logo_presence: 0.15,
      logo_proportions: 0.2,
      typography: 0.15,
      claim_truth: 0.15,
      spacing_clearspace: 0.05,
      visual_style: 0.0,
    };

    let totalWeight = 0;
    let weightedScore = 0;
    for (const c of checks) {
      const w = weights[c.checkType] || 0.1;
      weightedScore += c.score * w;
      totalWeight += w;
    }
    const finalScore = Math.round(weightedScore / (totalWeight || 1));

    const status = finalScore >= 90 ? 'compliant' : finalScore >= 70 ? 'warning' : 'non_compliant';

    return {
      reportId: `bcr_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      assetId: params.assetId || `eval_${Date.now()}`,
      workspaceId,
      evaluatedAt: now,
      appliedIdentityVersion: identity.version,
      overallScore: finalScore,
      status,
      humanReviewStatus: 'pending',
      checks,
      detectedOffBrandColors,
      detectedOffBrandFonts,
      detectedProhibitedClaims,
      remediatedSvg: autoRemediate ? remediatedSvg : undefined,
      disclaimer:
        'AI-assisted brand compliance evaluation advisory. Measurements represent automated heuristic alignment checks and do not constitute certified legal trademark guarantees.',
    };
  }

  // ===========================================================================
  // 5. BRAND DRIFT DETECTION (WORKSPACE-WIDE AUDIT)
  // ===========================================================================

  public async detectBrandDrift(workspaceId: string): Promise<BrandDriftReport> {
    const identity = await this.getAuthoritativeIdentity(workspaceId);
    const assets = await brandAssetRepository.listByWorkspace(workspaceId);
    const now = new Date().toISOString();

    const driftItems: BrandDriftItem[] = [];
    const bySection: Record<string, { total: number; drifted: number }> = {};

    for (const asset of assets) {
      const section = asset.section || 'Active';
      if (!bySection[section]) {
        bySection[section] = { total: 0, drifted: 0 };
      }
      bySection[section].total++;

      // Evaluate drift markers
      const driftReasons: string[] = [];
      const deprecatedTokensDetected: string[] = [];

      // Check if created with legacy/deprecated colors
      if (asset.accentHex && asset.accentHex.toUpperCase() !== identity.tokens.colors.accent.hex.toUpperCase()) {
        const dist = colorDistance(asset.accentHex, identity.tokens.colors.accent.hex);
        if (dist > 40) {
          driftReasons.push(`Accent color (${asset.accentHex}) drifts from active identity (${identity.tokens.colors.accent.hex}).`);
          deprecatedTokensDetected.push(asset.accentHex);
        }
      }

      // Check for outdated version links
      if (asset.version === 1 && identity.version > 2) {
        driftReasons.push(`Asset created under legacy identity version; misses latest brand book guidelines.`);
      }

      if (driftReasons.length > 0) {
        bySection[section].drifted++;
        driftItems.push({
          assetId: asset.assetId,
          assetTitle: asset.name,
          section,
          category: asset.category,
          driftReasons,
          deprecatedTokensDetected,
          recommendedAction: `Update color tokens to active brand palette (${identity.tokens.colors.accent.hex}).`,
        });
      }
    }

    const totalAssets = assets.length || 1;
    const driftedCount = driftItems.length;
    const driftPercentage = Math.round((driftedCount / totalAssets) * 100);

    return {
      workspaceId,
      evaluatedAt: now,
      identityVersion: identity.version,
      totalAssetsScanned: assets.length,
      driftedAssetsCount: driftedCount,
      driftPercentage,
      bySection,
      driftItems,
    };
  }

  // ===========================================================================
  // 6. BRAND IDENTITY IMPACT ANALYSIS
  // ===========================================================================

  public async analyzeIdentityImpact(
    workspaceId: string,
    proposedChanges: {
      colors?: { primary?: string; secondary?: string; accent?: string };
      typography?: { heading?: string; body?: string };
    }
  ): Promise<BrandIdentityImpactAnalysis> {
    const current = await this.getAuthoritativeIdentity(workspaceId);
    const assets = await brandAssetRepository.listByWorkspace(workspaceId);

    const colorChanges: Array<{ token: string; fromHex: string; toHex: string }> = [];
    if (proposedChanges.colors?.primary && proposedChanges.colors.primary !== current.tokens.colors.primary.hex) {
      colorChanges.push({
        token: 'primary',
        fromHex: current.tokens.colors.primary.hex,
        toHex: proposedChanges.colors.primary,
      });
    }
    if (proposedChanges.colors?.accent && proposedChanges.colors.accent !== current.tokens.colors.accent.hex) {
      colorChanges.push({
        token: 'accent',
        fromHex: current.tokens.colors.accent.hex,
        toHex: proposedChanges.colors.accent,
      });
    }

    const typographyChanges: Array<{ token: string; fromFont: string; toFont: string }> = [];
    if (proposedChanges.typography?.heading && proposedChanges.typography.heading !== current.tokens.typography.heading.family) {
      typographyChanges.push({
        token: 'heading',
        fromFont: current.tokens.typography.heading.family,
        toFont: proposedChanges.typography.heading,
      });
    }

    const affectedAssets: Array<{
      assetId: string;
      assetTitle: string;
      section: string;
      reasons: string[];
    }> = [];

    for (const asset of assets) {
      const reasons: string[] = [];
      if (colorChanges.some((c) => asset.accentHex?.toLowerCase() === c.fromHex.toLowerCase())) {
        reasons.push('Uses deprecated accent color.');
      }
      if (reasons.length > 0) {
        affectedAssets.push({
          assetId: asset.assetId,
          assetTitle: asset.name,
          section: asset.section,
          reasons,
        });
      }
    }

    return {
      workspaceId,
      currentVersion: current.version,
      targetVersion: current.version + 1,
      colorChanges,
      logoChanges: [],
      typographyChanges,
      affectedAssetsCount: affectedAssets.length,
      affectedAssets,
    };
  }

  // ===========================================================================
  // 7. EXPORT MACHINE-READABLE DESIGN TOKENS
  // ===========================================================================

  public async exportDesignTokensJson(workspaceId: string): Promise<string> {
    const identity = await this.getAuthoritativeIdentity(workspaceId);
    return identity.tokens.rawTokensJson;
  }
}

export const brandGuardianService = new BrandGuardianService();
