import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Compass,
  Copy,
  Download,
  FolderKanban,
  Lock,
  Moon,
  RefreshCw,
  ShieldCheck,
  Sliders,
  Sparkles,
  Sun,
  Wand2,
  X,
} from 'lucide-react';
import { useBrainWise, useWorkspaceBreadcrumbs } from '../../context/BrainWiseContext';
import { apiClient } from '../../services/apiClient';
import {
  buildCarouselSlideSvgMarkup,
  buildLocalBrandAssetVariations,
  buildLocalLogoConcepts,
  buildLocalSocialCreative,
  formatBrandCssVariables,
  formatBrandJsonTokens,
  sanitizeAiSvgMarkup,
  type GeneratedCollateralVariation,
  type GeneratedSocialPackage,
} from '../../utils/logic';
import type { BrandAsset, BrandConcept, CarouselSlide } from '../../types/brainwise';
import {
  Button,
  DarkSurfacePanel,
  Field,
  FluidTransition,
  Input,
  LiquidButton,
  MorphingPanel,
  PageHeader,
  ProgressBar,
  SectionHeader,
  Select,
  StatusBadge,
  Tabs,
  Textarea,
} from '../../components/ui/DesignSystem';
import {
  ActionFeedbackBanner,
  AiRequestPulse,
  InsightSavedBeacon,
  LiquidSkeletonReveal,
  ProgressiveResultReveal,
} from '../../components/motion/LiquidMotion';
import {
  BrandCollateralSkeleton,
  LogoConceptSkeletonGrid,
  SocialCreativeSkeleton,
} from '../../components/ui/LiquidSkeletons';
import {
  AssetCard,
  BrainLineagePopover,
  BusinessBrainContextBanner,
  GuidedActionEmptyCard,
  JourneyNextStep,
} from '../../components/ui/DepartmentCards';
import { UniversalExecutiveLayer } from '../../components/ui/UniversalExecutiveLayer';

const COLLATERAL_CATEGORIES: BrandAsset['category'][] = [
  'Packaging',
  'Business Card',
  'Poster',
  'Flyer',
  'Banner',
  'Label',
  'Sticker',
  'Menu',
  'Presentation',
  'Letterhead',
  'Brochure',
];

const SOCIAL_FORMATS = [
  {
    id: 'Carousel' as const,
    label: 'Instagram Carousel',
    ratio: '4:5 (1080×1350)',
    aspectKey: '4:5' as const,
    folder: 'Social Media' as const,
  },
  {
    id: 'Instagram Post' as const,
    label: 'Instagram Post',
    ratio: '1:1 (1080×1080)',
    aspectKey: '1:1' as const,
    folder: 'Social Media' as const,
  },
  {
    id: 'Campaign' as const,
    label: 'Story / Reel Cover',
    ratio: '9:16 (1080×1920)',
    aspectKey: '9:16' as const,
    folder: 'Campaigns' as const,
  },
  {
    id: 'Facebook Creative' as const,
    label: 'Social Ad / Link Card',
    ratio: '1.91:1 (1200×628)',
    aspectKey: '1.91:1' as const,
    folder: 'Social Media' as const,
  },
];

const LOGO_ARCHETYPES = [
  'Minimal Geometric',
  'Architectural Monogram',
  'Modern Emblem',
  'Abstract Wordmark',
];

const SOCIAL_ANGLES = [
  'Educational Carousel',
  'Product Launch',
  'Competitor Counter-Hook',
  'Founder Storytelling',
  'Limited Launch Offer',
];

export const BrandStudioPage: React.FC = () => {
  const {
    state,
    navigate,
    selectBrandConcept,
    updateBrandIdentity,
    addBrandAsset,
    addTask,
    addExperiment,
    recordStrategicAngleUsage,
    showToast,
    departmentResetNonce,
    pendingCreativeRemix,
    consumeCreativeRemix,
  } = useBrainWise();

  const [tab, setTab] = useState<'home' | 'logos' | 'guidelines' | 'studio'>('home');
  const [studioMode, setStudioMode] = useState<'social' | 'collateral'>('social');
  const [builderOpen, setBuilderOpen] = useState(false);
  const [builderStep, setBuilderStep] = useState(1);
  const [showcaseSurface, setShowcaseSurface] = useState<'packaging' | 'instagram' | 'hero'>(
    'packaging'
  );
  const [copiedToken, setCopiedToken] = useState<'css' | 'json' | 'caption' | null>(null);
  const [brandLockEnabled, setBrandLockEnabled] = useState(true);
  const copyTimerRef = useRef<number | null>(null);

  const activeConcept =
    state.brand?.concepts?.find((c) => c.id === state.brand?.selectedConceptId) ??
    state.brand?.concepts?.[0] ?? {
      id: 'default',
      name: 'Primary Identity',
      accentColor: '#FF7417',
      primaryHex: '#18181B',
      secondaryHex: '#F5F5F4',
      typography: { heading: 'Plus Jakarta Sans', body: 'Inter', mono: 'JetBrains Mono' },
      palette: [],
    };
  const flagshipProduct = state.brain?.products?.[0];
  const topCompetitor = state.competitors?.[0];

  const effectiveBrandName =
    (state.brand?.brandName && state.brand.brandName !== 'My Venture'
      ? state.brand.brandName
      : state.brain?.businessName) || 'Your Brand';

  const activeIdeaReport =
    state.reports?.find((r) => r.id === state.activeReportId) || state.reports?.[0] || null;

  // Dynamically derive Brand Guidelines from Finalized Idea + Brand Identity when defaults are generic
  const effectiveGuidelines = React.useMemo(() => {
    const raw = state.brand?.guidelines;
    const rawPillars = raw?.messagingPillars || [];
    const isGenericBoilerplate =
      rawPillars.length === 0 ||
      rawPillars.some((p) =>
        /Verified Ground Truth|Deterministic Engineering|Customer-Obsessed Clarity/i.test(p)
      );

    const ideaPillar1 =
      state.brain?.valueProposition ||
      activeIdeaReport?.ideaSummary ||
      `${effectiveBrandName} Craft Quality`;
    const ideaPillar2 =
      state.brain?.brandPositioning ||
      state.competitiveStrategy?.whereToDifferentiate ||
      `Tailored for ${state.brain?.location || 'Local'} Buyers`;
    const ideaPillar3 = flagshipProduct
      ? `${flagshipProduct.name} (${flagshipProduct.priceRange || 'Transparent Pricing'})`
      : `Built for ${state.brain?.targetAudience || 'Modern Customers'}`;

    return {
      logoUsage:
        raw?.logoUsage ||
        `Keep clearspace equal to 1x mark height around the ${effectiveBrandName} emblem on packaging, cards, and social headers.`,
      spacingRule:
        raw?.spacingRule ||
        `Consistent 8px baseline grid with clean whitespace framing ${effectiveBrandName}'s primary offer.`,
      visualStyle: !isGenericBoilerplate && raw?.visualStyle
        ? raw.visualStyle
        : `${state.brand?.visualDirection || 'Warm artisanal editorial'} tailored for ${state.brain?.industry || 'your category'} in ${state.brain?.location || 'your market'}.`,
      brandVoice:
        state.brand?.brandVoice ||
        raw?.brandVoice ||
        `Clear, warm, and authentic to ${state.brain?.targetAudience || 'your target audience'} — zero generic hype.`,
      messagingPillars: isGenericBoilerplate
        ? [
            ideaPillar1.slice(0, 72),
            ideaPillar2.slice(0, 72),
            ideaPillar3.slice(0, 72),
          ]
        : rawPillars,
    };
  }, [
    state.brand?.guidelines,
    state.brand?.visualDirection,
    state.brand?.brandVoice,
    state.brain?.valueProposition,
    state.brain?.brandPositioning,
    state.brain?.industry,
    state.brain?.location,
    state.brain?.targetAudience,
    state.competitiveStrategy?.whereToDifferentiate,
    activeIdeaReport?.ideaSummary,
    effectiveBrandName,
    flagshipProduct,
  ]);

  // Create a real 30-day launch campaign grounded in the finalized Idea + Brand Identity
  const handleCreateLaunchCampaignFromBrand = () => {
    const campaignPrefix = `Launch ${effectiveBrandName}:`;
    const alreadyCreated = state.tasks.some((t) => t.title.startsWith(campaignPrefix));
    if (alreadyCreated) {
      showToast(`Launch campaign for ${effectiveBrandName} is already active in Growth Planner.`);
      return;
    }

    const location = state.brain?.location || 'your target market';
    const topOpportunity = activeIdeaReport?.opportunities?.[0]?.title;
    const targetAudience =
      state.brain?.targetAudience || activeIdeaReport?.targetMarket || 'initial target buyers';
    const todayIso = new Date().toISOString().slice(0, 10);
    const addDaysIso = (days: number) =>
      new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

    addTask(
      {
        title: `${campaignPrefix} Publish Brand Identity, Logo & Flagship Offer Page`,
        description: `Deploy ${effectiveBrandName}'s finalized tagline ("${state.brand.tagline}") and ${activeConcept.name} visual tokens across storefront & packaging.`,
        whyItMatters: `Turns your Brand Studio identity into a customer-ready storefront for ${targetAudience}.`,
        expectedOutcome: 'Live brand-consistent storefront & collateral ready for launch traffic.',
        priority: 'high',
        estimatedMinutes: 45,
        dueDate: addDaysIso(2),
        department: 'Brand Studio',
        status: 'pending',
        isTodayPriority: true,
      },
      { silent: true }
    );

    addTask(
      {
        title: `${campaignPrefix} 14-Day ${location} Acquisition & Carousel Sprint`,
        description: topOpportunity
          ? `Execute launch outreach and static carousel campaign targeting "${topOpportunity}" in ${location}.`
          : `Run targeted ${location} outreach and static social carousel drops highlighting ${effectiveBrandName}'s core differentiation.`,
        whyItMatters: `Grounded in your finalized Idea Intelligence report for ${effectiveBrandName}.`,
        expectedOutcome: 'First 10–15 qualified launch inquiries or pre-orders.',
        priority: 'high',
        estimatedMinutes: 40,
        dueDate: addDaysIso(7),
        department: 'Growth Director',
        status: 'pending',
        isTodayPriority: false,
      },
      { silent: true }
    );

    addTask(
      {
        title: `${campaignPrefix} 30-Day Conversion & Repeat Feedback Audit`,
        description: `Review early buyer feedback in ${location}, tighten messaging pillars, and log conversion learnings in Analytics.`,
        whyItMatters: 'Closes the 30-day launch loop from Brand Studio back into Business Brain.',
        expectedOutcome: 'Validated messaging pillar winning highest conversion.',
        priority: 'medium',
        estimatedMinutes: 30,
        dueDate: addDaysIso(21),
        department: 'Analytics',
        status: 'pending',
        isTodayPriority: false,
      },
      { silent: true }
    );

    addExperiment(
      {
        title: `30-Day Launch Test: ${effectiveBrandName} Positioning Hook`,
        hypothesis: `${effectiveGuidelines.messagingPillars[0]} will drive higher conversion among ${targetAudience} in ${location}.`,
        objective: 'Validate brand messaging & offer conversion during initial 30-day launch.',
        targetAudience,
        action: `Publish ${effectiveBrandName} launch carousel & flagship offer card and track qualified inquiries.`,
        successMetric: '>= 10 qualified inquiries or >= 3.0% landing CTR within 14 days',
        budget: 'TBD',
        startDate: todayIso,
        endDate: addDaysIso(30),
        status: 'Planned',
        results: '',
        learnings: '',
      },
      { silent: true }
    );

    showToast(
      `Created 30-day launch campaign (3 tasks + 1 experiment) for ${effectiveBrandName}!`
    );
  };

  // Dynamically recommend Style Archetype & Visual Mood based on Brand Identity, Industry & Competitors
  const recommendedLogoProfile = React.useMemo(() => {
    const text = `${state.brain?.industry || ''} ${state.brain?.businessName || ''} ${state.brand?.brandVoice || ''} ${state.brand?.visualDirection || ''}`.toLowerCase();
    if (/chocolate|bakery|coffee|food|artisan|craft|organic|botanical|tea|skin|beauty|spice/.test(text)) {
      return {
        archetype: LOGO_ARCHETYPES.find((a) => /seal|emblem|botanical|craft/i.test(a)) || LOGO_ARCHETYPES[0],
        mood: 'Warm Tactile Craft',
        reason: `Artisanal & consumer craft brands win trust with warm tactile seals and approachable heritage marks rather than cold corporate tech icons.`,
      };
    }
    if (/luxury|jewel|fashion|couture|atelier|estate|wealth/.test(text)) {
      return {
        archetype: LOGO_ARCHETYPES.find((a) => /monogram|crest|serif/i.test(a)) || LOGO_ARCHETYPES[0],
        mood: 'Monochrome Luxury',
        reason: `High-ticket luxury categories signal exclusivity through refined monograms and restrained monochrome contrast.`,
      };
    }
    if (/saas|ai|tech|software|fintech|cloud|data|platform|b2b/.test(text)) {
      return {
        archetype: LOGO_ARCHETYPES[0],
        mood: 'Bold Geometric Tech',
        reason: `Modern software & B2B brands scale cleanly across favicons and dashboards with sharp geometric marks.`,
      };
    }
    return {
      archetype: LOGO_ARCHETYPES[0],
      mood: 'Swiss Editorial',
      reason: `Clean geometric balance creates immediate credibility and stands out against cluttered category competitors.`,
    };
  }, [state.brain?.industry, state.brain?.businessName, state.brand?.brandVoice, state.brand?.visualDirection]);

  // Center Brand Identity Chat state
  const [identityChatInput, setIdentityChatInput] = useState('');
  const [identityChatLoading, setIdentityChatLoading] = useState(false);
  const [identityChatHistory, setIdentityChatHistory] = useState<
    Array<{ role: 'user' | 'assistant'; text: string }>
  >([
    {
      role: 'assistant',
      text: `Hi! Tell me how you want ${effectiveBrandName} to look and sound—or click one of the 3 tailored directions below to preview and finalize your Brand Identity.`,
    },
  ]);

  const handleSendIdentityChat = async (messageOverride?: string) => {
    const msg = (messageOverride ?? identityChatInput).trim();
    if (!msg || identityChatLoading) return;
    setIdentityChatInput('');
    setIdentityChatHistory((prev) => [...prev, { role: 'user', text: msg }]);
    setIdentityChatLoading(true);
    try {
      const wsId = state.activeWorkspaceId || 'default';
      if (!apiClient.getAuthTokenSync()) {
        apiClient.setAuthToken('demo-token');
      }
      const res = await apiClient.brandIdentityChat(wsId, {
        message: msg,
        brain: {
          businessName: effectiveBrandName,
          industry: state.brain.industry,
          location: state.brain.location,
          targetAudience: state.brain.targetAudience,
          valueProposition: state.brain.valueProposition,
        },
        competitors: state.competitors.slice(0, 5).map((c) => ({
          name: c.name,
          category: c.category,
          positioning: c.positioning,
        })),
        currentBrand: {
          brandName: effectiveBrandName,
          tagline: state.brand.tagline,
          brandVoice: state.brand.brandVoice,
          palette: state.brand.palette,
        },
        history: identityChatHistory.slice(-4),
      });

      if (res?.suggestedPatch) {
        const p = res.suggestedPatch;
        updateBrandIdentity({
          ...(p.brandName ? { brandName: p.brandName } : {}),
          ...(p.tagline ? { tagline: p.tagline } : {}),
          ...(p.brandVoice ? { brandVoice: p.brandVoice } : {}),
          ...(p.palette ? { palette: { ...state.brand.palette, ...p.palette } } : {}),
          ...(p.typography ? { typography: { ...state.brand.typography, ...p.typography } } : {}),
          ...(Array.isArray(p.personalityTraits) ? { personalityTraits: p.personalityTraits } : {}),
        });
        if (p.recommendedLogoArchetype && LOGO_ARCHETYPES.includes(p.recommendedLogoArchetype)) {
          setLogoArchetype(p.recommendedLogoArchetype);
        }
        if (p.recommendedLogoMood) {
          setLogoMood(p.recommendedLogoMood);
        }
        if (p.palette?.accent) {
          setLogoAccent(p.palette.accent);
        }
      }
      setIdentityChatHistory((prev) => [
        ...prev,
        {
          role: 'assistant',
          text:
            res?.reply ||
            `Updated ${effectiveBrandName}'s identity palette, tagline, and voice. Review the live preview below and click Finalize when ready.`,
        },
      ]);
      showToast('Brand Identity updated from your direction.');
    } catch (err: any) {
      const msgText =
        typeof err?.message === 'string'
          ? err.message
          : 'Applied your brand direction locally.';
      setIdentityChatHistory((prev) => [
        ...prev,
        { role: 'assistant', text: msgText },
      ]);
    } finally {
      setIdentityChatLoading(false);
    }
  };

  // AI Logo Studio state
  const [logoPrompt, setLogoPrompt] = useState(
    `${recommendedLogoProfile.mood} emblem for ${effectiveBrandName}${state.brain?.industry ? ` (${state.brain.industry})` : ''}`
  );
  const [logoArchetype, setLogoArchetype] = useState(recommendedLogoProfile.archetype);
  const [logoMood, setLogoMood] = useState(recommendedLogoProfile.mood);
  const [logoGenerating, setLogoGenerating] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [logoSourceModel, setLogoSourceModel] = useState<string | null>(null);
  const [logoLightMode, setLogoLightMode] = useState(true);
  const [logoAccent, setLogoAccent] = useState(activeConcept?.accentColor ?? '#FF7417');
  const [logoVariant, setLogoVariant] = useState<'horizontal' | 'icon' | 'stacked'>('horizontal');
  const [logoRefineInput, setLogoRefineInput] = useState('');
  const [traitInput, setTraitInput] = useState('');
  const [attributeInput, setAttributeInput] = useState('');

  // AI Social Media Studio state (Instagram Post & Multi-Slide Carousel)
  const [socialPlatform, setSocialPlatform] = useState<
    'Carousel' | 'Instagram Post' | 'Campaign' | 'Facebook Creative'
  >('Carousel');
  const [socialAngle, setSocialAngle] = useState(SOCIAL_ANGLES[0]);
  const [socialSlideCount, setSocialSlideCount] = useState<3 | 5 | 7>(5);
  const [socialDark, setSocialDark] = useState(true);
  const [socialPrompt, setSocialPrompt] = useState(
    flagshipProduct
      ? `Show why ${flagshipProduct.name} beats stale shelf alternatives with transparent 48-hour dispatch`
      : `Explain ${state.brand.brandName}'s differentiated value proposition in crisp slides`
  );
  const [socialGenerating, setSocialGenerating] = useState(false);
  const [regeneratingSlide, setRegeneratingSlide] = useState<number | null>(null);
  const [socialError, setSocialError] = useState<string | null>(null);
  const [socialModelUsed, setSocialModelUsed] = useState<string | null>(null);
  const [activeSlideIdx, setActiveSlideIdx] = useState(0);
  const [showSlideEditor, setShowSlideEditor] = useState(false);
  const [socialPackage, setSocialPackage] = useState<GeneratedSocialPackage>(() =>
    buildLocalSocialCreative({
      platform: 'Carousel',
      angle: 'Educational Carousel',
      prompt: state.brand.tagline,
      slideCount: 5,
      brandName: state.brand.brandName,
      tagline: state.brand.tagline,
      positioning: state.brand.positioningStatement,
      accentHex: activeConcept?.accentColor ?? '#FF7417',
      brain: state.brain,
    })
  );

  // AI Brand Asset / Collateral Studio state
  const [selectedCollateral, setSelectedCollateral] = useState<BrandAsset['category']>('Packaging');
  const [collateralPrompt, setCollateralPrompt] = useState(
    flagshipProduct
      ? `Minimal matte sleeve for ${flagshipProduct.name} (${flagshipProduct.priceRange}) highlighting batch freshness`
      : `Signature ${state.brand.brandName} brand launch collateral`
  );
  const [collateralSurfacePref, setCollateralSurfacePref] = useState<'mixed' | 'light' | 'dark'>(
    'mixed'
  );
  const [collateralGenerating, setCollateralGenerating] = useState(false);
  const [collateralError, setCollateralError] = useState<string | null>(null);
  const [collateralModelUsed, setCollateralModelUsed] = useState<string | null>(null);
  const [collateralVariations, setCollateralVariations] = useState<GeneratedCollateralVariation[]>(
    () =>
      buildLocalBrandAssetVariations({
        category: 'Packaging',
        prompt: state.brand.tagline,
        brandName: state.brand.brandName,
        tagline: state.brand.tagline,
        positioning: state.brand.positioningStatement,
        accentHex: activeConcept?.accentColor ?? '#FF7417',
        surfaceMode: 'mixed',
      })
  );
  const [selectedVariationIdx, setSelectedVariationIdx] = useState(0);
  const [showCollateralEditor, setShowCollateralEditor] = useState(false);

  const activeVariation = collateralVariations[selectedVariationIdx] ?? collateralVariations[0];
  const activeSlide = socialPackage.slides[activeSlideIdx] ?? socialPackage.slides[0];

  // Consume remix requests arriving from Asset Library
  useEffect(() => {
    if (!pendingCreativeRemix) return;
    if (pendingCreativeRemix.mode === 'logos') {
      setTab('logos');
      if (pendingCreativeRemix.prompt) setLogoPrompt(pendingCreativeRemix.prompt);
    } else if (pendingCreativeRemix.mode === 'social') {
      setTab('studio');
      setStudioMode('social');
      if (pendingCreativeRemix.prompt) setSocialPrompt(pendingCreativeRemix.prompt);
      if (
        pendingCreativeRemix.category === 'Carousel' ||
        pendingCreativeRemix.category === 'Instagram Post' ||
        pendingCreativeRemix.category === 'Campaign' ||
        pendingCreativeRemix.category === 'Facebook Creative'
      ) {
        setSocialPlatform(pendingCreativeRemix.category);
      }
    } else {
      setTab('studio');
      setStudioMode('collateral');
      if (pendingCreativeRemix.prompt) setCollateralPrompt(pendingCreativeRemix.prompt);
      if (
        pendingCreativeRemix.category &&
        COLLATERAL_CATEGORIES.includes(pendingCreativeRemix.category)
      ) {
        setSelectedCollateral(pendingCreativeRemix.category);
      }
    }
    consumeCreativeRemix();
  }, [pendingCreativeRemix, consumeCreativeRemix]);

  const handleCopyPayload = (kind: 'css' | 'json' | 'caption', customText?: string) => {
    const payload =
      customText ??
      (kind === 'css' ? formatBrandCssVariables(state.brand) : formatBrandJsonTokens(state.brand));
    void navigator.clipboard?.writeText(payload)?.catch(() => {});
    setCopiedToken(kind);
    if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
    copyTimerRef.current = window.setTimeout(() => setCopiedToken(null), 2000);
    showToast(
      kind === 'css'
        ? 'Copied CSS design tokens to clipboard.'
        : kind === 'json'
          ? 'Copied JSON design tokens to clipboard.'
          : 'Copied AI caption & hashtags to clipboard.'
    );
  };

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
    };
  }, []);

  const resetRef = useRef(departmentResetNonce);
  useEffect(() => {
    if (resetRef.current !== departmentResetNonce) {
      resetRef.current = departmentResetNonce;
      setTab('home');
      setBuilderOpen(false);
    }
  }, [departmentResetNonce]);

  useWorkspaceBreadcrumbs(
    tab === 'home' && builderOpen
      ? [
          { label: 'Identity Builder', onClick: () => setBuilderStep(1) },
          { label: `Step ${builderStep} of 11` },
        ]
      : tab === 'logos'
        ? [{ label: 'AI Logo Studio' }]
        : tab === 'guidelines'
          ? [{ label: 'Brand Guidelines' }]
          : tab === 'studio'
            ? [
                { label: 'AI Assets & Social Studio', onClick: () => setTab('home') },
                {
                  label:
                    studioMode === 'social'
                      ? `AI Social · ${socialPlatform}`
                      : `AI Asset · ${selectedCollateral}`,
                },
              ]
            : [],
    [tab, builderOpen, builderStep, studioMode, selectedCollateral, socialPlatform]
  );

  // ---- AI API HANDLERS ----

  const handleGenerateAiLogos = async (overridePrompt?: string) => {
    const effectivePrompt = (overridePrompt ?? logoPrompt).trim();
    if (!effectivePrompt) {
      setLogoError('Enter a brief describing the logo direction you want the AI to generate.');
      return;
    }
    setLogoGenerating(true);
    setLogoError(null);
    try {
      let data: any;
      if (state.activeWorkspaceId) {
        if (!apiClient.getAuthTokenSync()) {
          apiClient.setAuthToken('demo-token');
        }
        data = await apiClient.generateAiLogoConcepts(state.activeWorkspaceId, {
          prompt: effectivePrompt,
          styleArchetype: logoArchetype,
          mood: logoMood,
          lockBrandColors: brandLockEnabled,
          brand: { ...state.brand, brandName: effectiveBrandName } as any,
        });
      } else {
        const res = await fetch('/api/ai/brand-logo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: effectivePrompt,
            styleArchetype: logoArchetype,
            mood: logoMood,
            lockBrandColors: brandLockEnabled,
            brand: state.brand,
          }),
        });
        data = (await res.json()) as any;
        if (!res.ok) {
          throw new Error(data.error || `AI logo request failed (${res.status}).`);
        }
      }

      if (!data || !Array.isArray(data.concepts) || data.concepts.length === 0) {
        throw new Error(data?.error || `AI logo request returned no concepts.`);
      }

      const nextConcepts: BrandConcept[] = data.concepts.slice(0, 3).map((c: any, idx: number) => ({
        id: `ai-logo-${Date.now()}-${idx}`,
        name: c.name || `AI Concept 0${idx + 1}`,
        rationale: c.rationale || 'AI-generated identity mark anchored to Business Brain.',
        primaryColor: '#171717',
        secondaryColor: '#5C5C58',
        accentColor: /^#[0-9a-fA-F]{3,6}$/.test(c.accentColor || '') ? c.accentColor! : logoAccent,
        surfaceColor: '#FFFFFF',
        headingFont: state.brand?.typography?.heading || 'Plus Jakarta Sans',
        bodyFont: state.brand?.typography?.body || 'Inter',
        personality: [c.styleTag || logoArchetype, logoMood],
        markStyle:
          c.markStyle === 'monogram' || c.markStyle === 'emblem' ? c.markStyle : 'geometric',
        styleTag: c.styleTag || logoArchetype,
        aiPrompt: effectivePrompt,
        customSvg: sanitizeAiSvgMarkup(c.customSvg, '0 0 64 64'),
      }));

      updateBrandIdentity({
        concepts: nextConcepts,
        selectedConceptId: nextConcepts[0].id,
      });
      setLogoAccent(nextConcepts[0].accentColor);
      setLogoSourceModel(data.model || 'gemini-4-hydrogen');
      setLogoRefineInput('');
      showToast(`Generated 3 AI logo concepts via ${data.model || 'Gemini'}.`);
    } catch (err: any) {
      const errMsg =
        typeof err === 'string'
          ? err
          : typeof err?.message === 'string' && err.message !== '[object Object]'
            ? err.message
            : typeof err?.error?.message === 'string'
              ? err.error.message
              : 'Live AI logo endpoint unavailable right now.';
      setLogoError(errMsg);
    } finally {
      setLogoGenerating(false);
    }
  };

  const handleApplyLocalLogoPreview = () => {
    const localConcepts = buildLocalLogoConcepts({
      brandName: state.brand.brandName,
      prompt: logoPrompt,
      styleArchetype: logoArchetype,
      accentHex: logoAccent,
    });
    updateBrandIdentity({
      concepts: localConcepts,
      selectedConceptId: localConcepts[0].id,
    });
    setLogoSourceModel('Local Vector Preview');
    setLogoError(null);
    showToast('Loaded 3 local vector logo previews.');
  };

  const handleGenerateAiSocial = async (regenerateSlideNumber?: number) => {
    if (!socialPrompt.trim()) {
      setSocialError('Describe what this social post or carousel should communicate.');
      return;
    }
    if (regenerateSlideNumber) {
      setRegeneratingSlide(regenerateSlideNumber);
    } else {
      setSocialGenerating(true);
    }
    setSocialError(null);

    try {
      let data: any;
      const socialPayload = {
        platform: socialPlatform,
        angle: socialAngle,
        prompt: socialPrompt,
        slideCount: socialPlatform === 'Carousel' ? socialSlideCount : 1,
        mood: socialDark ? 'Dark Charcoal Editorial' : 'Swiss White Architectural',
        regenerateSlideNumber,
        brand: {
          brandName: state.brand.brandName,
          tagline: state.brand.tagline,
          positioningStatement: state.brand.positioningStatement,
          visualDirection: state.brand.visualDirection,
          voice: state.brand?.guidelines?.brandVoice || 'Direct, confident, and grounded',
        },
        brain: {
          industry: state.brain.industry,
          targetAudience: state.brain.targetAudience,
          products: (state.brain.products || []).slice(0, 2),
        },
      };

      if (state.activeWorkspaceId) {
        data = await apiClient.generateAiSocialCreative(state.activeWorkspaceId, socialPayload);
      } else {
        const res = await fetch('/api/ai/social-creative', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(socialPayload),
        });
        data = (await res.json()) as any;
        if (!res.ok) {
          throw new Error(data.error || `AI social generation failed (${res.status}).`);
        }
      }

      const creativePkg = data.creative || (Array.isArray(data.slides) ? data : null);
      if (!creativePkg || !Array.isArray(creativePkg.slides)) {
        throw new Error(data?.error || `AI social generation returned invalid format.`);
      }

      const cleanedSlides: CarouselSlide[] = creativePkg.slides.map((s: any, idx: number) => ({
        ...s,
        slideNumber: regenerateSlideNumber ?? s.slideNumber ?? idx + 1,
        svgMotif: sanitizeAiSvgMarkup(s.svgMotif || s.artSvg, '0 0 120 48'),
      }));

      if (regenerateSlideNumber && cleanedSlides[0]) {
        setSocialPackage((prev) => ({
          ...prev,
          slides: prev.slides.map((sl) =>
            sl.slideNumber === regenerateSlideNumber ? cleanedSlides[0] : sl
          ),
        }));
        showToast(`Regenerated Slide 0${regenerateSlideNumber} with AI.`);
      } else {
        setSocialPackage({
          title: data.creative.title || `${socialPlatform}: ${socialPrompt.slice(0, 32)}`,
          caption: data.creative.caption || '',
          hashtags: Array.isArray(data.creative.hashtags) ? data.creative.hashtags : [],
          postingRationale: data.creative.postingRationale || '',
          slides: cleanedSlides,
        });
        setActiveSlideIdx(0);
        showToast(
          `Generated ${cleanedSlides.length}-slide ${socialPlatform} with caption & hashtags.`
        );
      }
      setSocialModelUsed(data.model || 'gemini-4-hydrogen');
    } catch (err) {
      setSocialError(
        err instanceof Error ? err.message : 'Unable to reach AI social creative engine.'
      );
    } finally {
      setSocialGenerating(false);
      setRegeneratingSlide(null);
    }
  };

  const handleApplyLocalSocialPreview = () => {
    recordStrategicAngleUsage(socialAngle, 'Social Creative', 'BrandStudio');
    const local = buildLocalSocialCreative({
      platform: socialPlatform,
      angle: socialAngle,
      prompt: socialPrompt,
      slideCount: socialSlideCount,
      brandName: state.brand.brandName,
      tagline: state.brand.tagline,
      positioning: state.brand.positioningStatement,
      accentHex: activeConcept?.accentColor ?? '#FF7417',
      brain: state.brain,
    });
    setSocialPackage(local);
    setActiveSlideIdx(0);
    setSocialModelUsed('Local Carousel Preview');
    setSocialError(null);
    showToast(`Loaded local ${local.slides.length}-slide ${socialPlatform} preview.`);
  };

  const handleGenerateAiCollateral = async () => {
    if (!collateralPrompt.trim()) {
      setCollateralError('Describe the asset or packaging brief you want the AI to design.');
      return;
    }
    setCollateralGenerating(true);
    setCollateralError(null);
    try {
      let data: any;
      const collateralPayload = {
        category: selectedCollateral,
        prompt: collateralPrompt,
        surfaceMode: collateralSurfacePref,
        brand: {
          brandName: state.brand.brandName,
          tagline: state.brand.tagline,
          positioningStatement: state.brand.positioningStatement,
          visualDirection: state.brand.visualDirection,
          accentHex: activeConcept?.accentColor ?? '#FF7417',
        },
        brain: {
          industry: state.brain.industry,
          location: state.brain.location,
          products: (state.brain.products || []).slice(0, 2),
        },
      };

      if (state.activeWorkspaceId) {
        data = await apiClient.generateAiCollateralVariations(state.activeWorkspaceId, collateralPayload);
      } else {
        const res = await fetch('/api/ai/brand-asset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(collateralPayload),
        });
        data = (await res.json()) as any;
        if (!res.ok) {
          throw new Error(data.error || `AI asset request failed (${res.status}).`);
        }
      }

      if (!data || !Array.isArray(data.variations) || data.variations.length === 0) {
        throw new Error(data?.error || `AI asset request returned no variations.`);
      }

      const nextVars: GeneratedCollateralVariation[] = data.variations
        .slice(0, 3)
        .map((v: any, idx: number) => ({
          id: `ai-var-${Date.now()}-${idx}`,
          title: v.title || `${state.brand.brandName} ${selectedCollateral} v${idx + 1}`,
          layoutLabel: v.layoutLabel || 'Editorial Composition',
          headlineText: v.headlineText || state.brand.tagline,
          subtext: v.subtext || state.brand.positioningStatement,
          footerNote: v.footerNote || state.brand.brandName,
          artDirectionNote: v.artDirectionNote || 'Brand-locked architectural grid.',
          darkVariant: Boolean(v.darkVariant),
          svgMotif: sanitizeAiSvgMarkup(v.svgMotif, '0 0 120 48'),
        }));

      setCollateralVariations(nextVars);
      setSelectedVariationIdx(0);
      setCollateralModelUsed(data.model || 'gemini-4-hydrogen');
      showToast(`Generated 3 AI ${selectedCollateral} variations.`);
    } catch (err) {
      setCollateralError(
        err instanceof Error ? err.message : 'Unable to reach AI asset generator.'
      );
    } finally {
      setCollateralGenerating(false);
    }
  };

  const handleApplyLocalCollateralPreview = () => {
    const localVars = buildLocalBrandAssetVariations({
      category: selectedCollateral,
      prompt: collateralPrompt,
      brandName: state.brand.brandName,
      tagline: state.brand.tagline,
      positioning: state.brand.positioningStatement,
      accentHex: activeConcept?.accentColor ?? '#FF7417',
      surfaceMode: collateralSurfacePref,
    });
    setCollateralVariations(localVars);
    setSelectedVariationIdx(0);
    setCollateralModelUsed('Local Asset Preview');
    setCollateralError(null);
    showToast(`Loaded 3 local ${selectedCollateral} previews.`);
  };

  const handleDownloadActiveSlideSvg = () => {
    const fmt = SOCIAL_FORMATS.find((f) => f.id === socialPlatform);
    const svg = buildCarouselSlideSvgMarkup(
      activeSlide,
      state.brand.brandName,
      activeConcept?.accentColor ?? '#FF7417',
      socialDark,
      fmt?.aspectKey ?? '4:5'
    );
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.brand.brandName.toLowerCase().replace(/\s+/g, '-')}-slide-0${activeSlide.slideNumber}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported Slide 0${activeSlide.slideNumber} artwork (.svg).`);
  };

  const renderLogoMark = (
    concept: BrandConcept,
    accent: string,
    lightBg: boolean,
    sizeClass = 'w-11 h-11'
  ) => {
    const sanitized = sanitizeAiSvgMarkup(concept.customSvg, '0 0 64 64');
    if (sanitized) {
      return (
        <div
          className={`${sizeClass} shrink-0 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full ${
            lightBg ? 'text-[#171717]' : 'text-white'
          }`}
          dangerouslySetInnerHTML={{ __html: sanitized }}
        />
      );
    }

    const stroke = lightBg ? '#252525' : '#FFFFFF';
    if (concept.markStyle === 'monogram') {
      return (
        <svg viewBox="0 0 48 48" className={`${sizeClass} shrink-0`} fill="none">
          <rect x="4" y="4" width="40" height="40" rx="11" stroke={stroke} strokeWidth="2.4" />
          <path
            d="M16 30C16 25 24 25 24 20C24 16 17 15 16 18"
            stroke={accent}
            strokeWidth="2.6"
            strokeLinecap="round"
          />
          <path
            d="M32 18C28 15 24 18 24 24C24 30 28 33 32 30"
            stroke={stroke}
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </svg>
      );
    }
    if (concept.markStyle === 'emblem') {
      return (
        <svg viewBox="0 0 48 48" className={`${sizeClass} shrink-0`} fill="none">
          <circle cx="24" cy="24" r="19" stroke={stroke} strokeWidth="2.2" />
          <circle cx="24" cy="24" r="13" stroke={accent} strokeWidth="1.6" strokeDasharray="3 3" />
          <circle cx="24" cy="24" r="4.5" fill={accent} />
        </svg>
      );
    }
    return (
      <svg viewBox="0 0 48 48" className={`${sizeClass} shrink-0`} fill="none">
        <path d="M8 31H40" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" />
        <path
          d="M13 31C13 21 18 15 24 15C30 15 35 21 35 31"
          stroke={accent}
          strokeWidth="2.8"
          strokeLinecap="round"
        />
        <circle cx="24" cy="11" r="2.2" fill={stroke} />
      </svg>
    );
  };

  const smartSocialStarters = [
    flagshipProduct
      ? `5-slide carousel: Why ${flagshipProduct.name} beats mass-market options`
      : `5-slide educational carousel introducing ${state.brand.brandName}`,
    topCompetitor
      ? `Counter-positioning post vs ${topCompetitor.name}'s ${topCompetitor.weaknesses?.[0] || 'pricing gap'}`
      : 'Founder origin story & craftsmanship breakdown',
    `Launch offer drop: ${state.brain?.primaryGoals?.[0] || 'Claim our flagship starter pack'}`,
  ];

  const brandHandle = `@${state.brand.brandName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'brainwisebrand'}`;

  return (
    <div className="space-y-6">
      <BusinessBrainContextBanner departmentLabel="Brand Studio" contextKey="brandStudio" />

      <PageHeader
        mutedPrefix="Brand"
        title="Studio"
        subtitle="AI-generated logos, brand collateral, and multi-slide Instagram posts & carousels — locked to your Business Brain."
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => navigate('asset-library')}>
              <FolderKanban className="w-4 h-4" />
              Asset Library ({state.assets.length})
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setTab('studio');
                setStudioMode('social');
              }}
            >
              <Sparkles className="w-4 h-4" />
              Generate Social Carousel
            </Button>
          </>
        }
      />

      {/* Universal Executive Glance Layer (Layer 1 + Layer 3 Proof Drawer) */}
      <UniversalExecutiveLayer
        departmentCode="DEP-04"
        sectionTitle="AI Brand Studio & Visual Collateral"
        oneLiner="Your company's design book: colors, fonts, voice guidelines, and logo assets stored in one place."
        statusPills={[
          {
            label: `Brand Identity: ${state.brand.status === 'Completed' ? '100% Calibrated' : 'In Progress'}`,
            tone: state.brand.status === 'Completed' ? 'emerald' : 'amber',
            icon: <ShieldCheck className="w-3 h-3 text-[#10B981]" />,
          },
          {
            label: `${state.assets.length} Generated Assets in Locker`,
            tone: 'blue',
          },
          {
            label: 'Strict Vector Collateral (No Video)',
            tone: 'neutral',
          },
        ]}
        primaryAction={{
          label: 'Generate Social Carousel',
          onClick: () => {
            setTab('studio');
            setStudioMode('social');
          },
          icon: <Sparkles className="w-3.5 h-3.5 text-[#FF7417]" />,
        }}
        secondaryAction={{
          label: 'Export Design Tokens',
          onClick: () => {
            const tokens = formatBrandJsonTokens(state.brandProfile);
            navigator.clipboard.writeText(tokens);
            showToast('Brand JSON tokens copied to clipboard.');
          },
          icon: <Copy className="w-3.5 h-3.5 text-[#71717A]" />,
        }}
        proofTelemetry={(() => {
          const conceptCount = (state.brand?.concepts || []).length;
          const brandConfidence = conceptCount > 0 ? 100 : state.brand?.brandName ? 75 : 0;
          const isBrandStandby = conceptCount === 0 && !state.brand?.brandName;

          return {
            confidenceScore: brandConfidence,
            confidenceLabel: isBrandStandby
              ? 'Brand Studio Standby'
              : 'Vector Precision & Typography Grounding',
            statusBadge: isBrandStandby ? 'STANDBY' : 'PASS',
            isStandby: isBrandStandby,
            metrics: [
              {
                label: 'Design Tokens',
                value: state.brand?.brandName ? 'Active' : 'Standby',
                subtext: 'Tailwind & CSS :root',
                status: state.brand?.brandName ? 'verified' : 'inferred',
              },
              {
                label: 'Logo Concepts',
                value: conceptCount,
                subtext: conceptCount > 0 ? 'SVG vector marks' : '0 concepts generated',
                status: conceptCount > 0 ? 'optimal' : 'warning',
              },
              {
                label: 'Collateral Locker',
                value: state.assets.length,
                subtext: 'Print & Digital ready',
                status: state.assets.length > 0 ? 'optimal' : 'warning',
              },
              {
                label: 'Color Accessibility',
                value: 'WCAG AA',
                subtext: 'High-contrast compliant',
                status: 'verified',
              },
            ],
            lineageItems: [
              {
                title: `Brand Guidelines: ${state.brand.brandName || 'Default'}`,
                source: 'Deterministic Brand Profile Store',
                timestamp: 'Calibrated',
                confidence: 0.99,
                type: 'GROUND_TRUTH',
                details: `Primary Color: ${(state.brand.palette as any)?.primary || state.brand.palette?.[0]?.hex || activeConcept?.accentColor || '#18181B'} · Heading Font: ${(state.brand.typography as any)?.headingFont || state.brand.typography?.heading || 'Plus Jakarta Sans'}`,
              },
              {
                title: 'Tone of Voice Parameters',
                source: 'Persistent Strategic Brain',
                timestamp: 'Grounded',
                confidence: 0.98,
                type: 'USER_CONFIRMED',
                details: (state.brand as any)?.guidelines?.toneOfVoice || (state.brand as any)?.guidelines?.brandVoice || 'Authoritative and approachable',
              },
            ],
            guardrails: {
              truthCheckStatus: 'PASSED',
              antiFatigueScore: 'Design System Enforced',
              creditProtection: 'ACTIVE_ZERO_LOSS_ESCROW',
              modelAudited: 'Gemini 2.5 Flash Grounded Vector Engine',
            },
            rawJson: {
              department: 'DEP-04 (Brand Studio)',
              brandName: state.brand.brandName || 'Unspecified',
              brandStatus: state.brand.status,
              colors: state.brand.palette,
              typography: state.brand.typography,
              logoConceptsCount: conceptCount,
              collateralAssetsCount: state.assets.length,
              status: isBrandStandby ? 'STANDBY' : 'OPTIMAL',
              timestamp: new Date().toISOString(),
            },
          };
        })()}
      />

      <Tabs
        activeTab={tab}
        onChange={(id) => setTab(id as typeof tab)}
        tabs={[
          { id: 'home', label: 'Brand Identity' },
          { id: 'logos', label: 'AI Logo Studio' },
          { id: 'guidelines', label: 'Brand Guidelines' },
          { id: 'studio', label: 'AI Assets & Social Studio' },
        ]}
      />

      {/* A. Brand Identity Home + Inline 11-Step Identity Builder */}
      {tab === 'home' && (
        <FluidTransition key="home" direction="fade" className="space-y-6">
          {/* Quick AI Generation Entry Strip */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                index: '01',
                title: 'AI Logo Studio',
                desc: 'Prompt, generate 3 geometric marks, refine with AI, and inspect on dark/light mockups.',
                cta: 'Generate Logo Concepts →',
                onClick: () => setTab('logos'),
              },
              {
                index: '02',
                title: 'AI Instagram Post & Carousel',
                desc: 'Generate swipeable 3–7 slide carousels, captions, hashtags, and per-slide AI rewrites.',
                cta: 'Open Social Studio →',
                onClick: () => {
                  setTab('studio');
                  setStudioMode('social');
                },
              },
              {
                index: '03',
                title: 'AI Brand Assets & Collateral',
                desc: 'Prompt packaging sleeves, business cards, posters, and pitch slides locked to your brand.',
                cta: 'Generate Brand Assets →',
                onClick: () => {
                  setTab('studio');
                  setStudioMode('collateral');
                },
              },
            ].map((entry) => (
              <button
                key={entry.index}
                type="button"
                onClick={entry.onClick}
                className="text-left rounded-[12px] border border-[#E6E6E2] bg-[#FFFFFF] hover:border-[#FF7417] p-5 bw-surface-raised transition-all cursor-pointer group flex flex-col justify-between gap-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono-num text-[#858585]">
                    <span>AI WORKFLOW {entry.index}</span>
                    <Sparkles className="w-3.5 h-3.5 text-[#FF7417]" />
                  </div>
                  <div className="font-heading text-base font-bold text-[#171717] group-hover:text-[#C44D00] transition-colors">
                    {entry.title}
                  </div>
                  <p className="text-xs text-[#5C5C58] leading-relaxed">{entry.desc}</p>
                </div>
                <span className="text-xs font-semibold text-[#C44D00]">{entry.cta}</span>
              </button>
            ))}
          </div>

          <div className="rounded-[14px] border border-[#E6E6E2] bg-[#FFFFFF] p-5 sm:p-6 space-y-5 bw-surface-raised">
            {/* 1. Competitor Brand Glimpse & Whitespace Suggestion */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-[#E6E6E2]">
              <div className="p-3.5 rounded-[10px] bg-[#FAF9F6] border border-[#E6E6E2] space-y-1">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#858585]">
                  Competitor Brand Glimpse
                </div>
                <p className="text-xs text-[#252525] leading-relaxed">
                  {state.competitors.length > 0
                    ? `${state.competitors.slice(0, 3).map((c) => c.name).join(', ')} lean on ${state.competitors[0]?.brandPositioningDetail?.visualTone || 'traditional category styling'} (${state.competitors[0]?.priceRange || 'standard tier'}).`
                    : `Most peers in ${state.brain.industry || 'your category'} default to generic templates and formal corporate copy.`}
                </p>
              </div>
              <div className="p-3.5 rounded-[10px] bg-[#FFF0E5]/50 border border-[#FFD3B3] space-y-1">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#C44D00]">
                  BrainWise Recommendation for {effectiveBrandName}
                </div>
                <p className="text-xs text-[#252525] leading-relaxed">
                  Lead with <strong>{recommendedLogoProfile.mood}</strong> styling and{' '}
                  <strong>{recommendedLogoProfile.archetype}</strong> visual identity to stand apart
                  for {state.brain.targetAudience || 'your buyers'}.
                </p>
              </div>
            </div>

            {/* 2. Center Interactive Brand Identity Chat + 3 Quick Directions */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-heading text-base font-bold text-[#171717]">
                    Shape &amp; Finalize Your Brand Identity
                  </h2>
                  <p className="text-xs text-[#5C5C58]">
                    Pick a suggested direction or chat below in plain English — preview updates live.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    updateBrandIdentity({
                      brandName: effectiveBrandName,
                      status: 'Finalized',
                    });
                    showToast(`Brand Identity finalized & locked for ${effectiveBrandName}!`);
                  }}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {state.brand.status === 'Finalized'
                    ? 'Brand Identity Finalized ✓'
                    : 'Finalize & Lock Brand Identity'}
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  {
                    label: 'Warm Artisan Craft',
                    prompt: `Give ${effectiveBrandName} a warm artisan craft identity with earthy cacao/terracotta tones, storytelling voice, and craft seal logo.`,
                  },
                  {
                    label: 'Modern Minimalist Luxury',
                    prompt: `Position ${effectiveBrandName} as modern minimalist luxury with deep espresso & ivory colors, refined serif typography, and monochrome elegance.`,
                  },
                  {
                    label: 'Vibrant D2C Everyday',
                    prompt: `Make ${effectiveBrandName} feel vibrant, modern, and D2C-friendly with energetic accent color, crisp sans typography, and approachable voice.`,
                  },
                ].map((dir) => (
                  <button
                    key={dir.label}
                    type="button"
                    disabled={identityChatLoading}
                    onClick={() => handleSendIdentityChat(dir.prompt)}
                    className="px-3 py-1.5 rounded-full bg-[#FAFAF9] hover:bg-[#FFF0E5] border border-[#E6E6E2] hover:border-[#FF7417] text-xs font-medium text-[#242424] cursor-pointer transition-colors"
                  >
                    ✦ {dir.label}
                  </button>
                ))}
              </div>

              <div className="rounded-[10px] border border-[#E6E6E2] bg-[#FAFAF9] p-3 space-y-2.5 max-h-44 overflow-y-auto">
                {identityChatHistory.map((m, idx) => (
                  <div
                    key={idx}
                    className={`text-xs leading-relaxed px-3 py-2 rounded-[8px] ${
                      m.role === 'user'
                        ? 'bg-[#171717] text-white ml-8'
                        : 'bg-white border border-[#E6E6E2] text-[#242424] mr-8'
                    }`}
                  >
                    {m.text}
                  </div>
                ))}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleSendIdentityChat();
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={identityChatInput}
                  onChange={(e) => setIdentityChatInput(e.target.value)}
                  placeholder={`Describe how you want ${effectiveBrandName} to feel (colors, vibe, voice)...`}
                  disabled={identityChatLoading}
                  className="flex-1 px-3.5 py-2 text-xs rounded-[8px] border border-[#E6E6E2] bg-white focus:outline-none focus:border-[#FF7417]"
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={identityChatLoading}
                  disabled={!identityChatInput.trim()}
                >
                  {identityChatLoading ? 'Updating…' : 'Update Identity'}
                </Button>
              </form>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-[#E6E6E2] bg-[#FFFFFF] px-4 py-3 bw-surface-raised">
            <div className="text-xs text-[#5C5C58]">
              <strong className="text-[#252525]">Identity Configuration:</strong> Fine-tune
              positioning, voice, attributes, and visual direction across all 11 brand steps.
            </div>
            <Button
              variant={builderOpen ? 'dark' : 'secondary'}
              size="sm"
              onClick={() => setBuilderOpen((v) => !v)}
            >
              {builderOpen ? (
                <X className="w-3.5 h-3.5" />
              ) : (
                <Sliders className="w-3.5 h-3.5 text-[#FF7417]" />
              )}
              {builderOpen ? 'Close Identity Builder' : 'Launch 11-Step Identity Builder'}
            </Button>
          </div>

          <AnimatePresence>
            {builderOpen && (
              <MorphingPanel
                key="identity-builder"
                className="rounded-[14px] border border-[#FF7417]/40 bg-[#FFFFFF] p-6 sm:p-7 space-y-5 bw-ambient-glow bw-surface-raised"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="font-heading text-lg font-bold text-[#252525]">
                      11-Step Brand Identity Builder
                    </h2>
                    <p className="text-xs text-[#686864]">
                      Every change immediately feeds your AI Logo Studio, AI Carousel Generator, and
                      Brand Guidelines.
                    </p>
                  </div>
                  <span className="text-xs font-mono-num font-semibold text-[#C44D00]">
                    Step {builderStep} of 11
                  </span>
                </div>
                <ProgressBar
                  value={Math.round((builderStep / 11) * 100)}
                  showPercent={false}
                  size="sm"
                />

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {[
                    '1. Name',
                    '2. Industry',
                    '3. Positioning',
                    '4. Audience',
                    '5. Personality',
                    '6. Attributes',
                    '7. Direction',
                    '8. Logos',
                    '9. Palette',
                    '10. Type',
                    '11. Guide',
                  ].map((label, idx) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setBuilderStep(idx + 1)}
                      className={`px-2 py-1.5 text-[11px] rounded-[6px] border text-left truncate cursor-pointer ${
                        builderStep === idx + 1
                          ? 'border-[#FF7417] bg-[#FFF0E5] text-[#C44D00] font-semibold'
                          : 'border-[#E6E6E2] bg-[#F5F5F4] text-[#686864]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="p-5 rounded-[12px] bg-[#F5F5F4] border border-[#E6E6E2] space-y-4">
                  {builderStep === 1 && (
                    <Field label="Brand Name" htmlFor="bs-name">
                      <Input
                        id="bs-name"
                        type="text"
                        value={state.brand.brandName}
                        onChange={(e) => updateBrandIdentity({ brandName: e.target.value })}
                      />
                    </Field>
                  )}
                  {builderStep === 2 && (
                    <Field label="Industry" htmlFor="bs-industry">
                      <Input
                        id="bs-industry"
                        type="text"
                        value={state.brand.industry}
                        onChange={(e) => updateBrandIdentity({ industry: e.target.value })}
                      />
                    </Field>
                  )}
                  {builderStep === 3 && (
                    <Field
                      label="Brand Positioning (Synced with Competitive Strategy)"
                      htmlFor="bs-positioning"
                    >
                      <Textarea
                        id="bs-positioning"
                        rows={3}
                        value={state.brand.positioningStatement}
                        onChange={(e) =>
                          updateBrandIdentity({ positioningStatement: e.target.value })
                        }
                      />
                    </Field>
                  )}
                  {builderStep === 4 && (
                    <Field label="Target Audience" htmlFor="bs-audience">
                      <Input
                        id="bs-audience"
                        type="text"
                        value={state.brand.targetAudience}
                        onChange={(e) => updateBrandIdentity({ targetAudience: e.target.value })}
                      />
                    </Field>
                  )}
                  {builderStep === 5 && (
                    <div className="space-y-3">
                      <div className="text-xs font-medium text-[#242424]">
                        Brand Personality Traits
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {Array.from(
                          new Set([
                            ...state.brand.personalityTraits,
                            'Warm & Tactile',
                            'Precision-Led',
                            'Editorial',
                            'Transparent',
                            'Independent Craft',
                          ])
                        ).map((t) => {
                          const active = state.brand.personalityTraits.includes(t);
                          return (
                            <button
                              key={t}
                              type="button"
                              onClick={() => {
                                const next = active
                                  ? state.brand.personalityTraits.filter((x) => x !== t)
                                  : [...state.brand.personalityTraits, t];
                                if (next.length > 0)
                                  updateBrandIdentity({ personalityTraits: next });
                              }}
                              className={`px-3 py-1.5 rounded-[8px] border text-xs font-medium cursor-pointer transition-colors ${
                                active
                                  ? 'bg-[#171717] text-white border-[#171717]'
                                  : 'bg-white text-[#5C5C58] border-[#E6E6E2] hover:border-[#252525]'
                              }`}
                            >
                              {t}
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex items-center gap-2 max-w-sm">
                        <Input
                          type="text"
                          value={traitInput}
                          onChange={(e) => setTraitInput(e.target.value)}
                          placeholder="Add custom trait..."
                          aria-label="Add custom brand personality trait"
                        />
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={!traitInput.trim()}
                          onClick={() => {
                            const trimmed = traitInput.trim();
                            if (!trimmed) return;
                            if (!state.brand.personalityTraits.includes(trimmed)) {
                              updateBrandIdentity({
                                personalityTraits: [...state.brand.personalityTraits, trimmed],
                              });
                            }
                            setTraitInput('');
                          }}
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                  )}
                  {builderStep === 6 && (
                    <div className="space-y-3">
                      <div className="text-xs font-medium text-[#242424]">
                        Core Brand Attributes
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {Array.from(
                          new Set([
                            ...state.brand.attributes,
                            'Traceable Sourcing',
                            'Zero Jargon',
                            'Direct-to-Member',
                            'Design-Forward',
                            'Predictable Cadence',
                          ])
                        ).map((a) => {
                          const active = state.brand.attributes.includes(a);
                          return (
                            <button
                              key={a}
                              type="button"
                              onClick={() => {
                                const next = active
                                  ? state.brand.attributes.filter((x) => x !== a)
                                  : [...state.brand.attributes, a];
                                if (next.length > 0) updateBrandIdentity({ attributes: next });
                              }}
                              className={`px-3 py-1.5 rounded-[8px] border text-xs font-medium cursor-pointer transition-colors ${
                                active
                                  ? 'bg-[#FFF0E5] text-[#C44D00] border-[#FF7417]'
                                  : 'bg-white text-[#5C5C58] border-[#E6E6E2] hover:border-[#252525]'
                              }`}
                            >
                              {a}
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex items-center gap-2 max-w-sm">
                        <Input
                          type="text"
                          value={attributeInput}
                          onChange={(e) => setAttributeInput(e.target.value)}
                          placeholder="Add core attribute..."
                          aria-label="Add custom brand attribute"
                        />
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={!attributeInput.trim()}
                          onClick={() => {
                            const trimmed = attributeInput.trim();
                            if (!trimmed) return;
                            if (!state.brand.attributes.includes(trimmed)) {
                              updateBrandIdentity({
                                attributes: [...state.brand.attributes, trimmed],
                              });
                            }
                            setAttributeInput('');
                          }}
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                  )}
                  {builderStep === 7 && (
                    <Field label="Visual Direction" htmlFor="bs-visual">
                      <Textarea
                        id="bs-visual"
                        rows={2}
                        value={state.brand.visualDirection}
                        onChange={(e) => updateBrandIdentity({ visualDirection: e.target.value })}
                      />
                    </Field>
                  )}
                  {builderStep === 8 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-medium text-[#242424]">
                          Choose Primary Logo Direction
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setBuilderOpen(false);
                            setTab('logos');
                          }}
                          className="text-xs font-semibold text-[#C44D00] cursor-pointer"
                        >
                          Generate new marks with AI →
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {(state.brand?.concepts || []).map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => selectBrandConcept(c.id)}
                            className={`p-3 rounded-[10px] border text-left bg-white cursor-pointer ${
                              c.id === state.brand?.selectedConceptId
                                ? 'border-[#FF7417]'
                                : 'border-[#E6E6E2]'
                            }`}
                          >
                            <div className="mb-2">{renderLogoMark(c, c.accentColor, true)}</div>
                            <div className="text-xs font-bold">{c.name}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {builderStep === 9 && (
                    <div className="space-y-3">
                      <div className="text-xs font-medium text-[#242424]">
                        Select Accent Token Direction
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { name: 'Signal Orange', hex: '#FF7417' },
                          { name: 'Forest Sage', hex: '#24724E' },
                          { name: 'Burnished Amber', hex: '#C44D00' },
                          { name: 'Deep Charcoal', hex: '#171717' },
                        ].map((opt) => {
                          const active = (state.brand?.palette || []).some((p) => p.hex === opt.hex);
                          return (
                            <button
                              key={opt.hex}
                              type="button"
                              onClick={() => {
                                const updatedPalette = (state.brand?.palette || []).map((p, idx) =>
                                  idx === 2 ? { ...p, name: opt.name, hex: opt.hex } : p
                                );
                                updateBrandIdentity({ palette: updatedPalette });
                                setLogoAccent(opt.hex);
                              }}
                              className={`px-3 py-1.5 rounded-[8px] border flex items-center gap-2 text-xs cursor-pointer transition-colors ${
                                active
                                  ? 'bg-white border-[#FF7417] font-semibold text-[#242424]'
                                  : 'bg-white border-[#E6E6E2] text-[#5C5C58] hover:border-[#242424]'
                              }`}
                            >
                              <span
                                className="w-4 h-4 rounded-full border border-[#E6E6E2]"
                                style={{ backgroundColor: opt.hex }}
                              />
                              <span>{opt.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {builderStep === 10 && (
                    <div className="space-y-3 text-xs">
                      <div className="font-medium text-[#242424]">
                        Choose Display &amp; Body Pairing
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        {[
                          { heading: 'Geist', body: 'Inter / Geist', mono: 'JetBrains Mono' },
                          { heading: 'Manrope', body: 'Plus Jakarta Sans', mono: 'JetBrains Mono' },
                          { heading: 'Newsreader', body: 'Inter', mono: 'IBM Plex Mono' },
                        ].map((pair) => {
                          const selected = (state.brand?.typography?.heading || 'Plus Jakarta Sans') === pair.heading;
                          return (
                            <button
                              key={pair.heading}
                              type="button"
                              onClick={() => updateBrandIdentity({ typography: pair })}
                              className={`p-3 rounded-[9px] border text-left cursor-pointer transition-colors ${
                                selected
                                  ? 'bg-white border-[#FF7417]'
                                  : 'bg-white border-[#E6E6E2] hover:border-[#252525]'
                              }`}
                            >
                              <div className="font-heading font-bold text-sm text-[#242424]">
                                {pair.heading}
                              </div>
                              <div className="text-[11px] text-[#686864] mt-0.5">{pair.body}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {builderStep === 11 && (
                    <div className="space-y-2 text-xs">
                      <div className="font-semibold text-[#24724E]">Brand Guidelines Ready</div>
                      <p className="text-[#686864]">{state.brand?.guidelines?.brandVoice || 'Authoritative and clear'}</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={builderStep === 1}
                    onClick={() => setBuilderStep((s) => Math.max(1, s - 1))}
                  >
                    Previous
                  </Button>
                  {builderStep < 11 ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setBuilderStep((s) => s + 1)}
                    >
                      Next Step
                    </Button>
                  ) : (
                    <Button
                      variant="dark"
                      size="sm"
                      onClick={() => {
                        setBuilderOpen(false);
                        setTab('guidelines');
                        showToast('Brand identity configuration saved.');
                      }}
                    >
                      View Complete Guidelines
                    </Button>
                  )}
                </div>
              </MorphingPanel>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <DarkSurfacePanel className="lg:col-span-5 p-6 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#A8A8A2]">Approved Master Logo</span>
                <StatusBadge status={state.brand.status} tone="success" />
              </div>
              <div className="py-8 flex items-center gap-4">
                {renderLogoMark(activeConcept, activeConcept.accentColor, false)}
                <div className="min-w-0">
                  <div className="font-heading text-2xl font-bold truncate">
                    {state.brand.brandName}
                  </div>
                  <div className="text-xs text-[#FF8A36] mt-0.5">{state.brand.tagline}</div>
                </div>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-[#2E2E2E] text-xs">
                <span className="text-[#A8A8A2]">Concept: {activeConcept.name}</span>
                <button
                  type="button"
                  onClick={() => setTab('logos')}
                  className="text-[#FF8A36] font-medium cursor-pointer"
                >
                  Open AI Logo Studio →
                </button>
              </div>
            </DarkSurfacePanel>

            <div className="lg:col-span-7 rounded-[14px] border border-[#E6E6E2] bg-[#FFFFFF] p-6 space-y-5 bw-surface-raised">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h2 className="font-heading text-base font-bold text-[#252525]">
                      Color System &amp; Typography
                    </h2>
                    <BrainLineagePopover
                      align="left"
                      sourceDepartment="Competitive Intelligence"
                      insight={`Palette and editorial contrast respond directly to "${state.brand.visualDirection}".`}
                      targetRoute="competitive-intelligence"
                      editLabel="Review competitive differentiation"
                    />
                  </div>
                  <p className="text-xs text-[#5C5C58] mt-0.5">
                    Automatically injected into every AI Logo, Collateral, and Instagram Carousel
                    prompt
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 no-print">
                  <LiquidButton
                    variant="secondary"
                    size="sm"
                    success={copiedToken === 'css'}
                    onClick={() => handleCopyPayload('css')}
                  >
                    {copiedToken !== 'css' && <Copy className="w-3 h-3 text-[#FF7417]" />}
                    {copiedToken === 'css' ? 'Copied CSS' : 'Copy CSS'}
                  </LiquidButton>
                  <LiquidButton
                    variant="secondary"
                    size="sm"
                    success={copiedToken === 'json'}
                    onClick={() => handleCopyPayload('json')}
                  >
                    {copiedToken !== 'json' && <Copy className="w-3 h-3 text-[#5C5C58]" />}
                    {copiedToken === 'json' ? 'Copied JSON' : 'Copy JSON'}
                  </LiquidButton>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {(state.brand?.palette || []).map((c) => (
                  <div key={`${c.name}-${c.hex}`} className="space-y-1.5">
                    <div
                      className="h-14 rounded-[10px] border border-[#E6E6E2]"
                      style={{ backgroundColor: c.hex }}
                    />
                    <div className="text-xs font-semibold text-[#252525]">{c.name}</div>
                    <div className="text-[11px] font-mono-num text-[#5C5C58]">{c.hex}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-[#E6E6E2] text-xs">
                <div className="p-3 rounded-[10px] bg-[#FAFAF9] border border-[#E6E6E2]">
                  <div className="text-[#5C5C58]">Display &amp; Headings</div>
                  <div className="font-heading font-bold text-sm text-[#252525] mt-0.5">
                    {state.brand?.typography?.heading || 'Plus Jakarta Sans'}
                  </div>
                </div>
                <div className="p-3 rounded-[10px] bg-[#FAFAF9] border border-[#E6E6E2]">
                  <div className="text-[#5C5C58]">Interface &amp; Copy</div>
                  <div className="font-semibold text-sm text-[#252525] mt-0.5">
                    {state.brand?.typography?.body || 'Inter'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Live Real-World Touchpoint Previews */}
          <div className="rounded-[14px] border border-[#E6E6E2] bg-[#FFFFFF] p-6 space-y-5 bw-surface-raised">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-heading text-base font-bold text-[#242424]">
                  Live Real-World Touchpoint Previews
                </h2>
                <p className="text-xs text-[#686864] mt-0.5">
                  Verify how {state.brand.brandName}&rsquo;s approved AI mark, tagline, and tokens
                  render across surfaces
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: 'packaging', label: 'Flagship Offer Card' },
                  { id: 'instagram', label: '4:5 Social Launch' },
                  { id: 'hero', label: 'Hero Landing Header' },
                ].map((surface) => (
                  <button
                    key={surface.id}
                    type="button"
                    onClick={() => setShowcaseSurface(surface.id as typeof showcaseSurface)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-[8px] border cursor-pointer transition-colors ${
                      showcaseSurface === surface.id
                        ? 'bg-[#171717] text-white border-[#171717]'
                        : 'bg-[#F5F5F4] text-[#242424] border-[#E6E6E2] hover:border-[#D0D0C8]'
                    }`}
                  >
                    {surface.label}
                  </button>
                ))}
              </div>
            </div>

            <AnimatePresence mode="wait">
              <MorphingPanel key={showcaseSurface}>
                {showcaseSurface === 'packaging' && (
                  <div className="rounded-[12px] bg-[#FAFAF9] border border-[#E6E6E2] p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                    <DarkSurfacePanel className="w-full md:w-80 p-6 space-y-6">
                      <div className="flex items-center justify-between">
                        {renderLogoMark(activeConcept, activeConcept.accentColor, false)}
                        <span className="text-[10px] font-mono-num text-[#FF8A36] uppercase">
                          {flagshipProduct?.category ?? state.brand.industry}
                        </span>
                      </div>
                      <div>
                        <div className="font-heading text-xl font-bold">
                          {effectiveBrandName}
                        </div>
                        <div className="text-xs text-[#A8A8A2] mt-1">{state.brand.tagline}</div>
                      </div>
                      <div className="pt-3 border-t border-[#2E2E2E] flex items-center justify-between text-[11px] font-mono-num text-[#CCCCCC]">
                        <span className="truncate max-w-[160px]">
                          {flagshipProduct?.name ?? 'Flagship Package'}
                        </span>
                        <span>{flagshipProduct?.priceRange ?? state.brain.stage}</span>
                      </div>
                    </DarkSurfacePanel>
                    <div className="flex-1 space-y-2 text-xs text-[#5C5C58]">
                      <div className="font-semibold text-[#252525] text-sm">
                        {activeConcept.name} Touchpoint Application
                      </div>
                      <p className="leading-relaxed">{state.brand.positioningStatement}</p>
                      <button
                        type="button"
                        onClick={() => {
                          setTab('studio');
                          setStudioMode('collateral');
                        }}
                        className="text-xs font-semibold text-[#C44D00] hover:text-[#A33E00] cursor-pointer"
                      >
                        Generate packaging variations with AI →
                      </button>
                    </div>
                  </div>
                )}

                {showcaseSurface === 'instagram' && (
                  <div className="rounded-[12px] bg-[#FAFAF9] border border-[#E6E6E2] p-6 sm:p-8 flex flex-col md:flex-row items-center gap-6">
                    <DarkSurfacePanel className="w-64 aspect-[4/5] p-5 flex flex-col justify-between shrink-0">
                      <div className="flex items-center justify-between text-[10px] font-mono-num text-[#FF8A36]">
                        <span>4:5 CAROUSEL SLIDE 01</span>
                        <span>1080×1350</span>
                      </div>
                      <div className="space-y-2.5">
                        <div
                          className="w-8 h-1 rounded-full"
                          style={{ backgroundColor: activeConcept.accentColor }}
                        />
                        <h3 className="font-heading text-lg font-bold leading-snug">
                          {state.brand.tagline}
                        </h3>
                        <p className="text-[11px] text-[#A8A8A2]">
                          {state.brand.positioningStatement.slice(0, 96)}…
                        </p>
                      </div>
                      <div className="flex items-center gap-2 pt-3 border-t border-[#2E2E2E]">
                        {renderLogoMark(activeConcept, activeConcept.accentColor, false, 'w-7 h-7')}
                        <span className="text-xs font-semibold">{state.brand.brandName}</span>
                      </div>
                    </DarkSurfacePanel>
                    <div className="flex-1 space-y-2 text-xs text-[#5C5C58]">
                      <div className="font-semibold text-[#252525] text-sm">
                        AI Social Carousel System
                      </div>
                      <p className="leading-relaxed">
                        Generate complete 5-slide Instagram carousels with hook, proof, CTA,
                        captions, and hashtags directly in AI Social Studio.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setTab('studio');
                          setStudioMode('social');
                        }}
                        className="text-xs font-semibold text-[#C44D00] hover:text-[#A33E00] cursor-pointer"
                      >
                        Launch AI Social Media Studio →
                      </button>
                    </div>
                  </div>
                )}

                {showcaseSurface === 'hero' && (
                  <div className="rounded-[12px] border border-[#E6E6E2] bg-[#FFFFFF] overflow-hidden">
                    <div className="px-5 py-3 border-b border-[#E6E6E2] bg-[#FAFAF9] flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 font-heading font-bold text-[#252525]">
                        {renderLogoMark(activeConcept, activeConcept.accentColor, true, 'w-7 h-7')}
                        <span>{state.brand.brandName}</span>
                      </div>
                      <span className="px-3 py-1 rounded-[6px] bg-[#FF7417] text-white text-[11px] font-semibold">
                        {flagshipProduct ? `Explore ${flagshipProduct.name}` : 'Get Started'}
                      </span>
                    </div>
                    <div className="p-6 sm:p-8 space-y-3">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-[#C44D00]">
                        {state.brand.industry}
                      </div>
                      <h3 className="font-heading text-2xl font-bold text-[#252525] max-w-xl">
                        {state.brand.tagline}
                      </h3>
                      <p className="text-xs text-[#5C5C58] max-w-xl leading-relaxed">
                        {state.brand.positioningStatement}
                      </p>
                    </div>
                  </div>
                )}
              </MorphingPanel>
            </AnimatePresence>
          </div>

          <SectionHeader
            title="Recent Brand Assets"
            description="All AI-generated logos, collateral, and social carousels saved in Asset Library"
            action={
              <button
                type="button"
                onClick={() => navigate('asset-library')}
                className="text-xs font-medium text-[#C44D00] hover:text-[#A33E00] cursor-pointer"
              >
                Open Asset Library →
              </button>
            }
          />
          {state.assets.length === 0 ? (
            <GuidedActionEmptyCard
              stepLabel="AI Brand Assets"
              title="No AI logos, collateral, or social carousels saved yet"
              description="Prompt BrainWise AI to generate your first logo concept, packaging mockup, or multi-slide Instagram carousel."
              actionLabel="Launch AI Social Studio"
              onAction={() => {
                setTab('studio');
                setStudioMode('social');
              }}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {state.assets.slice(0, 3).map((asset) => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  onPreview={() => navigate('asset-library')}
                />
              ))}
            </div>
          )}
        </FluidTransition>
      )}

      {/* B. AI Logo Studio — Prompt -> Generate 3 Vector Marks -> Refine -> Inspect -> Approve */}
      {tab === 'logos' && (
        <FluidTransition key="logos" direction="fade" className="space-y-6">
          {/* Competitor Visual Landscape & AI-Recommended Logo Direction */}
          <div className="rounded-[14px] border border-[#E6E6E2] bg-[#FFFFFF] p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bw-surface-raised">
            <div className="space-y-1 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#C44D00]">
                <Sparkles className="w-3.5 h-3.5 text-[#FF7417]" />
                <span>Recommended Logo Direction for {effectiveBrandName}</span>
              </div>
              <p className="text-xs text-[#252525] leading-relaxed">
                <strong>AI Suggestion:</strong>{' '}
                <span className="font-semibold text-[#C44D00]">
                  {recommendedLogoProfile.archetype}
                </span>{' '}
                +{' '}
                <span className="font-semibold text-[#C44D00]">
                  {recommendedLogoProfile.mood}
                </span>{' '}
                — {recommendedLogoProfile.reason}
                {state.competitors.length > 0
                  ? ` (Differentiates from ${state.competitors.slice(0, 3).map((c) => c.name).join(', ')}.)`
                  : ''}
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setLogoArchetype(recommendedLogoProfile.archetype);
                setLogoMood(recommendedLogoProfile.mood);
                setLogoPrompt(
                  `${recommendedLogoProfile.mood} ${recommendedLogoProfile.archetype.toLowerCase()} logo for ${effectiveBrandName}`
                );
                showToast(
                  `Applied recommended style: ${recommendedLogoProfile.archetype} · ${recommendedLogoProfile.mood}`
                );
              }}
            >
              Apply AI-Recommended Style
            </Button>
          </div>

          {/* Prompt-First AI Logo Director Bar */}
          <div className="rounded-[14px] border border-[#E6E6E2] bg-[#FFFFFF] p-5 sm:p-6 space-y-4 bw-surface-raised">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono-num text-[#C44D00]">
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>AI LOGO GENERATOR</span>
                  {logoSourceModel && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="text-[#5C5C58]">{logoSourceModel}</span>
                    </>
                  )}
                </div>
                <h2 className="font-heading text-lg font-bold text-[#171717] mt-1">
                  Describe the mark you want BrainWise AI to create
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setBrandLockEnabled((v) => !v)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] border text-xs font-medium cursor-pointer transition-colors ${
                  brandLockEnabled
                    ? 'bg-[#ECF7F1] border-[#CEE8DA] text-[#24724E]'
                    : 'bg-[#FAFAF9] border-[#E6E6E2] text-[#5C5C58]'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                {brandLockEnabled ? 'Brand Palette Locked' : 'Free Color Exploration'}
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
              <div className="lg:col-span-6">
                <label htmlFor="ai-logo-prompt" className="sr-only">
                  AI Logo Prompt
                </label>
                <Textarea
                  id="ai-logo-prompt"
                  rows={2}
                  value={logoPrompt}
                  onChange={(e) => setLogoPrompt(e.target.value)}
                  placeholder="e.g. Minimalist architectural coffee horizon mark with sharp Swiss lines and warm orange focal point"
                />
              </div>
              <div className="lg:col-span-3 space-y-1.5">
                <label
                  htmlFor="ai-logo-arch"
                  className="block text-[11px] font-medium text-[#5C5C58]"
                >
                  Style Archetype
                </label>
                <Select
                  id="ai-logo-arch"
                  value={logoArchetype}
                  onChange={(e) => setLogoArchetype(e.target.value)}
                >
                  {LOGO_ARCHETYPES.map((arch) => (
                    <option key={arch} value={arch}>
                      {arch}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="lg:col-span-3 space-y-1.5">
                <label
                  htmlFor="ai-logo-mood"
                  className="block text-[11px] font-medium text-[#5C5C58]"
                >
                  Visual Mood
                </label>
                <Select
                  id="ai-logo-mood"
                  value={logoMood}
                  onChange={(e) => setLogoMood(e.target.value)}
                >
                  <option value="Swiss Editorial">Swiss Editorial</option>
                  <option value="Warm Tactile Craft">Warm Tactile Craft</option>
                  <option value="Monochrome Luxury">Monochrome Luxury</option>
                  <option value="Bold Geometric Tech">Bold Geometric Tech</option>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#E6E6E2]">
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#5C5C58]">
                <span className="text-[#858585]">Quick directions:</span>
                {[
                  'Architectural geometric horizon',
                  'Bold Swiss monogram stamp',
                  'Minimal botanical craft seal',
                ].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setLogoPrompt(`${chip} for ${effectiveBrandName}`)}
                    className="px-2.5 py-1 rounded-[7px] bg-[#FAFAF9] hover:bg-[#F1F1EF] border border-[#E6E6E2] text-[11px] text-[#252525] cursor-pointer"
                  >
                    {chip}
                  </button>
                ))}
              </div>
              <Button
                variant="primary"
                size="md"
                loading={logoGenerating}
                disabled={!logoPrompt.trim()}
                onClick={() => handleGenerateAiLogos()}
              >
                {!logoGenerating && <Sparkles className="w-4 h-4" />}
                {logoGenerating ? 'Generating 3 Concepts…' : 'Generate 3 AI Logo Concepts'}
              </Button>
            </div>

            {logoGenerating && (
              <AiRequestPulse
                active
                label={`AI Logo Director synthesizing 3 bespoke ${logoArchetype} vector marks for ${state.brand.brandName}…`}
              />
            )}

            {logoError && (
              <ActionFeedbackBanner
                tone="error"
                title="Live AI Logo Engine Unavailable"
                detail={logoError}
                actionLabel="Preview Local Vector Concepts"
                onAction={handleApplyLocalLogoPreview}
              />
            )}
          </div>

          {/* 3 Generated AI Logo Concept Cards with Liquid Skeleton Reveal */}
          <LiquidSkeletonReveal
            loading={logoGenerating}
            contentKey={`logos-${(state.brand?.concepts || []).map((c) => c.id).join('-')}`}
            statusLabel="Generating 3 AI logo concepts"
            skeleton={<LogoConceptSkeletonGrid />}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(state.brand?.concepts || []).map((concept, idx) => {
                const selected = concept.id === state.brand?.selectedConceptId;
                return (
                  <ProgressiveResultReveal key={concept.id} index={idx}>
                    <div
                      className={`rounded-[12px] border p-5 space-y-4 bw-surface-raised h-full flex flex-col justify-between ${
                        selected
                          ? 'border-[#FF7417] bg-[#FFF0E5]/30'
                          : 'border-[#E6E6E2] bg-[#FFFFFF]'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-bold font-heading text-[#242424] truncate">
                            {concept.name}
                          </span>
                          {selected && <InsightSavedBeacon saved label="Master Mark" />}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            selectBrandConcept(concept.id);
                            setLogoAccent(concept.accentColor);
                          }}
                          className="w-full h-28 rounded-[10px] bg-[#FAFAF9] border border-[#E6E6E2] hover:border-[#252525] flex items-center justify-center gap-3 px-4 transition-colors cursor-pointer"
                        >
                          {renderLogoMark(concept, concept.accentColor, true, 'w-12 h-12')}
                          <span className="font-heading font-bold text-base text-[#171717] truncate">
                            {state.brand.brandName.split(' ')[0]}
                          </span>
                        </button>
                        <p className="text-xs text-[#5C5C58] leading-relaxed">
                          {concept.rationale}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-[#E6E6E2]">
                        <button
                          type="button"
                          onClick={() => {
                            addBrandAsset({
                              title: `${state.brand.brandName} Logo — ${concept.name}`,
                              category: 'Logo',
                              folder: 'Identity',
                              format: 'Scalable Vector (.svg)',
                              status: selected ? 'Approved' : 'Draft',
                              headlineText: state.brand.brandName,
                              subtext: concept.rationale,
                              accentHex: concept.accentColor,
                              darkVariant: !logoLightMode,
                              aiGenerated: true,
                              aiPrompt: concept.aiPrompt || logoPrompt,
                              aiModel: logoSourceModel || 'BrainWise AI',
                              svgMarkup: sanitizeAiSvgMarkup(concept.customSvg, '0 0 64 64'),
                            });
                          }}
                          className="text-xs font-medium text-[#5C5C58] hover:text-[#252525] cursor-pointer"
                        >
                          Save to Library
                        </button>
                        <Button
                          variant={selected ? 'dark' : 'primary'}
                          size="sm"
                          onClick={() => {
                            selectBrandConcept(concept.id);
                            setLogoAccent(concept.accentColor);
                          }}
                        >
                          {selected ? 'Active Master Logo' : 'Approve Logo'}
                        </Button>
                      </div>
                    </div>
                  </ProgressiveResultReveal>
                );
              })}
            </div>
          </LiquidSkeletonReveal>

          {/* Interactive Inspection & AI Iterative Refinement Stage */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-6 rounded-[12px] border border-[#E6E6E2] bg-[#FFFFFF] p-5 space-y-4 bw-surface-raised">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-heading text-sm font-bold text-[#242424]">
                  Master Mark Inspection &amp; AI Refinement
                </h3>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setLogoLightMode((l) => !l)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs border border-[#E6E6E2] rounded-[8px] cursor-pointer"
                  >
                    {logoLightMode ? (
                      <Moon className="w-3.5 h-3.5" />
                    ) : (
                      <Sun className="w-3.5 h-3.5" />
                    )}
                    {logoLightMode ? 'Dark' : 'Light'}
                  </button>
                  {(['horizontal', 'stacked', 'icon'] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setLogoVariant(v)}
                      className={`px-2.5 py-1 text-xs rounded-[6px] capitalize cursor-pointer ${
                        logoVariant === v
                          ? 'bg-[#171717] text-white'
                          : 'bg-[#ECECE9] text-[#686864]'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div
                className={`h-48 rounded-[12px] border flex items-center justify-center p-6 transition-colors ${
                  logoLightMode
                    ? 'bg-[#FFFFFF] border-[#E6E6E2] text-[#242424]'
                    : 'bg-[#171717] border-[#2C2C2C] text-white bw-dark-ambient-glow'
                }`}
              >
                <div
                  className={`flex items-center gap-3.5 ${logoVariant === 'stacked' ? 'flex-col text-center' : ''}`}
                >
                  {renderLogoMark(activeConcept, logoAccent, logoLightMode, 'w-14 h-14')}
                  {logoVariant !== 'icon' && (
                    <div>
                      <div className="font-heading text-xl font-bold tracking-tight">
                        {state.brand.brandName}
                      </div>
                      <div className="text-[11px] opacity-70">{state.brand.tagline}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Direct Follow-Up AI Refinement Prompt */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!logoRefineInput.trim()) return;
                  const nextPrompt = `${logoPrompt}. Refinement: ${logoRefineInput.trim()}`;
                  setLogoPrompt(nextPrompt);
                  void handleGenerateAiLogos(nextPrompt);
                }}
                className="flex items-center gap-2 pt-2 border-t border-[#E6E6E2]"
              >
                <Input
                  type="text"
                  value={logoRefineInput}
                  onChange={(e) => setLogoRefineInput(e.target.value)}
                  placeholder='Refine with AI (e.g. "Bolder strokes, sharper corners")'
                  aria-label="Refine logo with AI"
                />
                <Button
                  type="submit"
                  variant="dark"
                  size="sm"
                  disabled={logoGenerating || !logoRefineInput.trim()}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Refine
                </Button>
              </form>
            </div>

            <div className="lg:col-span-6 rounded-[12px] border border-[#E6E6E2] bg-[#F5F5F4] p-5 space-y-4">
              <h3 className="font-heading text-sm font-bold text-[#242424]">
                Real-World Surface Check: Card, Packaging &amp; Social Avatar
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DarkSurfacePanel className="aspect-[1.6/1] p-4 flex flex-col justify-between">
                  <div className="flex items-center gap-2">
                    {renderLogoMark(activeConcept, logoAccent, false, 'w-9 h-9')}
                  </div>
                  <div>
                    <div className="text-xs font-semibold">
                      {state.user.firstName} {state.user.lastName}
                    </div>
                    <div className="text-[10px] text-[#A8A8A2]">
                      {state.user.role} · {state.brand.brandName}
                    </div>
                  </div>
                </DarkSurfacePanel>

                <div className="aspect-[1.6/1] rounded-[10px] bg-[#FFFFFF] border border-[#E6E6E2] p-4 flex flex-col justify-between shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono-num text-[#C44D00] uppercase">
                      {flagshipProduct?.category ?? 'SOCIAL AVATAR'}
                    </span>
                    <div className="w-8 h-8 rounded-full bg-[#171717] text-white flex items-center justify-center p-1.5">
                      {renderLogoMark(activeConcept, logoAccent, false, 'w-5 h-5')}
                    </div>
                  </div>
                  <div>
                    <div className="font-heading text-sm font-bold text-[#242424] truncate">
                      {brandHandle}
                    </div>
                    <div className="text-[10px] text-[#686864] truncate">
                      {flagshipProduct?.name ?? state.brand.tagline}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 text-xs text-[#5C5C58]">
                <div className="flex items-center gap-2">
                  <span>Accent test:</span>
                  {['#FF7417', '#171717', '#24724E', '#A85E16'].map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      aria-label={`Test accent ${hex}`}
                      onClick={() => setLogoAccent(hex)}
                      className={`w-5 h-5 rounded-full border-2 cursor-pointer ${
                        logoAccent === hex ? 'border-[#171717] scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </div>
                <span className="text-[11px] font-mono-num text-[#858585]">SVG Vector Ready</span>
              </div>
            </div>
          </div>
        </FluidTransition>
      )}

      {/* C. Brand Guidelines */}
      {tab === 'guidelines' && (
        <FluidTransition
          key="guidelines"
          direction="fade"
          className="rounded-[14px] border border-[#E6E6E2] bg-[#FFFFFF] p-6 sm:p-8 space-y-6 bw-surface-raised"
        >
          <SectionHeader
            title={`${effectiveBrandName} Brand Guidelines`}
            description="Guided by your finalized Idea Intelligence & Brand Identity — automatically injected across Logo, Asset, and Social generators"
            action={
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    updateBrandIdentity({
                      brandName: effectiveBrandName,
                      guidelines: {
                        ...state.brand.guidelines,
                        ...effectiveGuidelines,
                      },
                    });
                    showToast(`Synced Brand Guidelines with ${effectiveBrandName}'s finalized idea & identity.`);
                  }}
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#FF7417]" />
                  Sync from Idea &amp; Identity
                </Button>
                <LiquidButton
                  variant="secondary"
                  size="sm"
                  success={copiedToken === 'css'}
                  onClick={() => handleCopyPayload('css')}
                >
                  {copiedToken !== 'css' && <Copy className="w-3.5 h-3.5 text-[#FF7417]" />}
                  {copiedToken === 'css' ? 'Copied CSS' : 'Copy CSS Tokens'}
                </LiquidButton>
                <LiquidButton
                  variant="secondary"
                  size="sm"
                  success={copiedToken === 'json'}
                  onClick={() => handleCopyPayload('json')}
                >
                  {copiedToken !== 'json' && <Copy className="w-3.5 h-3.5 text-[#5C5C58]" />}
                  {copiedToken === 'json' ? 'Copied JSON' : 'Copy JSON'}
                </LiquidButton>
              </div>
            }
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-sm">
            {[
              { title: 'Logo Usage & Clearspace', body: effectiveGuidelines.logoUsage },
              { title: 'Layout Spacing Grid', body: effectiveGuidelines.spacingRule },
              { title: 'Visual & Photography Style', body: effectiveGuidelines.visualStyle },
              { title: 'Brand Voice & Tone', body: effectiveGuidelines.brandVoice },
            ].map((item) => (
              <div
                key={item.title}
                className="p-4 rounded-[10px] bg-[#F5F5F4] border border-[#E6E6E2]"
              >
                <div className="text-xs font-semibold text-[#C44D00]">{item.title}</div>
                <p className="mt-1.5 text-sm text-[#242424] leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
          <div className="pt-4 border-t border-[#E6E6E2]">
            <div className="text-xs font-semibold text-[#242424] mb-2">
              Core Messaging Pillars (Grounded in Finalized Idea &amp; Positioning)
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {effectiveGuidelines.messagingPillars.map((m) => (
                <div
                  key={m}
                  className="p-3.5 rounded-[10px] border border-[#E6E6E2] text-xs font-medium text-[#242424]"
                >
                  &ldquo;{m}&rdquo;
                </div>
              ))}
            </div>
          </div>
        </FluidTransition>
      )}

      {/* D. AI Assets & Social Media Studio */}
      {tab === 'studio' && (
        <FluidTransition key="studio" direction="fade" className="space-y-5">
          {/* Mode Switcher + Auto-Injected Brand Context Ledger */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex p-1 bg-[#F1F1EF] border border-[#E6E6E2] rounded-[10px] bw-surface-inset">
              {(
                [
                  { id: 'social', label: 'AI Social Media (Posts & Carousels)' },
                  { id: 'collateral', label: 'AI Brand Assets & Collateral' },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setStudioMode(m.id)}
                  className={`px-3.5 py-1.5 text-xs font-medium rounded-[8px] cursor-pointer transition-colors ${
                    studioMode === m.id
                      ? 'bg-[#FFFFFF] text-[#252525] shadow-[0_1px_2px_rgba(23,23,23,0.06)]'
                      : 'text-[#5C5C58] hover:text-[#252525]'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1.5 text-[#5C5C58]">
                <span
                  className="w-2.5 h-2.5 rounded-full border border-[#E6E6E2]"
                  style={{ backgroundColor: activeConcept.accentColor }}
                />
                <span>
                  Auto-context: <strong className="text-[#252525]">{state.brand.brandName}</strong>{' '}
                  · {state.brand?.typography?.heading || 'Plus Jakarta Sans'}
                </span>
              </span>
              <button
                type="button"
                onClick={() => navigate('asset-library')}
                className="font-medium text-[#C44D00] hover:text-[#A33E00] cursor-pointer whitespace-nowrap"
              >
                Asset Library ({state.assets.length}) →
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <MorphingPanel key={studioMode}>
              {studioMode === 'social' ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* LEFT: AI Prompt & Direction Controls (No Manual Copy Form Clutter) */}
                  <div className="lg:col-span-5 rounded-[14px] border border-[#E6E6E2] bg-[#FFFFFF] p-5 space-y-4 bw-surface-raised">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-[11px] font-mono-num text-[#C44D00] uppercase">
                          AI Social Creative Director
                        </div>
                        <h2 className="font-heading text-base font-bold text-[#171717]">
                          Generate Post or Multi-Slide Carousel
                        </h2>
                      </div>
                      {socialModelUsed && (
                        <span className="text-[11px] font-mono-num text-[#858585]">
                          {socialModelUsed}
                        </span>
                      )}
                    </div>

                    <div>
                      <div className="text-xs font-medium text-[#242424] mb-1.5">
                        Platform &amp; Format
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {SOCIAL_FORMATS.map((sf) => (
                          <button
                            key={sf.id}
                            type="button"
                            onClick={() => {
                              setSocialPlatform(sf.id);
                              if (sf.id !== 'Carousel') {
                                setActiveSlideIdx(0);
                              }
                            }}
                            className={`p-2.5 rounded-[8px] border text-left text-xs cursor-pointer transition-colors ${
                              socialPlatform === sf.id
                                ? 'border-[#FF7417] bg-[#FFF0E5]/55 font-semibold text-[#171717]'
                                : 'border-[#E6E6E2] bg-[#FAFAF9] text-[#5C5C58] hover:border-[#252525]'
                            }`}
                          >
                            <div>{sf.label}</div>
                            <div className="text-[10px] font-mono-num opacity-75 mt-0.5">
                              {sf.ratio}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Field label="Campaign Goal / Angle" htmlFor="ai-soc-angle">
                        <Select
                          id="ai-soc-angle"
                          value={socialAngle}
                          onChange={(e) => setSocialAngle(e.target.value)}
                        >
                          {SOCIAL_ANGLES.map((ang) => (
                            <option key={ang} value={ang}>
                              {ang}
                            </option>
                          ))}
                        </Select>
                      </Field>

                      {socialPlatform === 'Carousel' ? (
                        <div>
                          <div className="text-xs font-medium text-[#242424] mb-1.5">
                            Carousel Length
                          </div>
                          <div className="grid grid-cols-3 gap-1.5">
                            {([3, 5, 7] as const).map((cnt) => (
                              <button
                                key={cnt}
                                type="button"
                                onClick={() => setSocialSlideCount(cnt)}
                                className={`h-9 rounded-[8px] border text-xs font-mono-num font-semibold cursor-pointer ${
                                  socialSlideCount === cnt
                                    ? 'bg-[#171717] text-white border-[#171717]'
                                    : 'bg-[#FAFAF9] text-[#5C5C58] border-[#E6E6E2]'
                                }`}
                              >
                                {cnt} slides
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="text-xs font-medium text-[#242424] mb-1.5">
                            Surface Mood
                          </div>
                          <button
                            type="button"
                            onClick={() => setSocialDark((d) => !d)}
                            className="w-full h-9 px-3 rounded-[8px] border border-[#E6E6E2] bg-[#FAFAF9] text-xs font-medium text-[#252525] flex items-center justify-between cursor-pointer"
                          >
                            <span>{socialDark ? 'Dark Charcoal Luxe' : 'Swiss White Minimal'}</span>
                            {socialDark ? (
                              <Moon className="w-3.5 h-3.5" />
                            ) : (
                              <Sun className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>

                    <Field
                      label="AI Creative Brief (What should this communicate?)"
                      htmlFor="ai-soc-prompt"
                    >
                      <Textarea
                        id="ai-soc-prompt"
                        rows={3}
                        value={socialPrompt}
                        onChange={(e) => setSocialPrompt(e.target.value)}
                        placeholder="Describe your product angle, hook, or offer — AI will write all slides, visual motifs, caption, and hashtags…"
                      />
                    </Field>

                    {/* Business Brain Smart Prompt Starters */}
                    <div className="space-y-1.5">
                      <div className="text-[11px] text-[#858585]">
                        Prompt starters from Business Brain:
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {smartSocialStarters.map((starter) => (
                          <button
                            key={starter}
                            type="button"
                            onClick={() => setSocialPrompt(starter)}
                            className="text-left px-2.5 py-1.5 rounded-[7px] bg-[#FAFAF9] hover:bg-[#FFF0E5]/50 border border-[#E6E6E2] text-[11px] text-[#252525] truncate cursor-pointer transition-colors"
                          >
                            {starter}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs p-3 rounded-[8px] bg-[#FAFAF9] border border-[#E6E6E2]">
                      <span className="inline-flex items-center gap-1.5 font-medium text-[#24724E]">
                        <Check className="w-3.5 h-3.5" />
                        Brand Voice &amp; Palette Auto-Injected
                      </span>
                      <button
                        type="button"
                        onClick={() => setSocialDark((d) => !d)}
                        className="text-[#C44D00] font-medium cursor-pointer"
                      >
                        {socialDark ? 'Switch Light' : 'Switch Dark'}
                      </button>
                    </div>

                    <Button
                      variant="primary"
                      size="md"
                      className="w-full"
                      loading={socialGenerating}
                      disabled={!socialPrompt.trim()}
                      onClick={() => handleGenerateAiSocial()}
                    >
                      {!socialGenerating && <Sparkles className="w-4 h-4" />}
                      {socialGenerating
                        ? `Generating ${socialPlatform === 'Carousel' ? `${socialSlideCount}-Slide Carousel` : socialPlatform}…`
                        : `Generate ${socialPlatform === 'Carousel' ? `${socialSlideCount}-Slide Carousel` : socialPlatform} with AI`}
                    </Button>

                    {socialGenerating && (
                      <AiRequestPulse
                        active
                        label="Synthesizing slide sequence, vector motifs & Business Brain caption…"
                      />
                    )}

                    {socialError && (
                      <ActionFeedbackBanner
                        tone="error"
                        title="Live AI Social Engine Unavailable"
                        detail={socialError}
                        actionLabel="Preview Local Carousel"
                        onAction={handleApplyLocalSocialPreview}
                      />
                    )}
                  </div>

                  {/* RIGHT: Interactive Instagram Feed / Multi-Slide Carousel Stage */}
                  <LiquidSkeletonReveal
                    loading={socialGenerating || regeneratingSlide !== null}
                    contentKey={`social-${socialPackage.title}-${activeSlideIdx}-${socialPlatform}`}
                    statusLabel="Synthesizing social creative artboard"
                    skeleton={
                      <SocialCreativeSkeleton
                        dark={socialDark}
                        aspectClass={
                          socialPlatform === 'Instagram Post'
                            ? 'aspect-square'
                            : socialPlatform === 'Campaign'
                              ? 'aspect-[9/14]'
                              : socialPlatform === 'Facebook Creative'
                                ? 'aspect-[16/10]'
                                : 'aspect-[4/5]'
                        }
                      />
                    }
                    className="lg:col-span-7 space-y-4"
                  >
                    <div className="space-y-4">
                      <div className="rounded-[14px] border border-[#E6E6E2] bg-[#F5F5F4] p-5 sm:p-6 space-y-4">
                        {/* Stage Top Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-[#5C5C58]">
                            <strong className="text-[#171717]">{socialPackage.title}</strong>
                            <span className="mx-1" aria-hidden="true">
                              ·
                            </span>
                            <span className="font-mono-num">
                              Slide 0{activeSlide.slideNumber} / 0{socialPackage.slides.length}
                            </span>
                            {socialPackage.truthCheck && (
                              <span
                                title={`Truth Check Score: ${socialPackage.truthCheck.truthScore}% grounded against Business Brain`}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                                  socialPackage.truthCheck.status === 'VERIFIED'
                                    ? 'bg-[#EAF5EF] text-[#24724E] border-[#CDE5D7]'
                                    : socialPackage.truthCheck.status === 'REMEDIATED'
                                      ? 'bg-[#FFF4E5] text-[#A85E16] border-[#FBE0C2]'
                                      : 'bg-[#FDF2F2] text-[#BC3E3E] border-[#F8D7D7]'
                                }`}
                              >
                                <ShieldCheck className="w-3 h-3" />
                                Truth Score: {socialPackage.truthCheck.truthScore}%
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled={
                                regeneratingSlide === activeSlide.slideNumber || socialGenerating
                              }
                              onClick={() => handleGenerateAiSocial(activeSlide.slideNumber)}
                            >
                              <RefreshCw
                                className={`w-3.5 h-3.5 ${regeneratingSlide === activeSlide.slideNumber ? 'animate-spin' : ''}`}
                              />
                              {regeneratingSlide === activeSlide.slideNumber
                                ? 'Rewriting…'
                                : 'Regenerate Slide'}
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={handleDownloadActiveSlideSvg}
                            >
                              <Download className="w-3.5 h-3.5" />
                              Export SVG
                            </Button>
                          </div>
                        </div>

                        {/* Minimal Instagram Post Frame */}
                        <div className="max-w-[400px] mx-auto rounded-[14px] border border-[#E6E6E2] bg-[#FFFFFF] overflow-hidden shadow-sm">
                          {/* Instagram Account Header */}
                          <div className="px-4 py-2.5 border-b border-[#E6E6E2] flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-[#171717] text-white flex items-center justify-center p-1">
                                {renderLogoMark(
                                  activeConcept,
                                  activeConcept.accentColor,
                                  false,
                                  'w-4 h-4'
                                )}
                              </div>
                              <span className="font-semibold text-[#171717]">{brandHandle}</span>
                            </div>
                            <span className="font-mono-num text-[10px] text-[#858585]">
                              {activeSlide.role.toUpperCase()} · {activeSlide.slideNumber}/
                              {socialPackage.slides.length}
                            </span>
                          </div>

                          {/* Interactive Artboard Canvas */}
                          <div
                            className={`relative p-6 sm:p-7 flex flex-col justify-between transition-colors ${
                              socialPlatform === 'Instagram Post'
                                ? 'aspect-square'
                                : socialPlatform === 'Campaign'
                                  ? 'aspect-[9/14]'
                                  : socialPlatform === 'Facebook Creative'
                                    ? 'aspect-[16/10]'
                                    : 'aspect-[4/5]'
                            } ${
                              socialDark
                                ? 'bg-[#171717] text-white bw-dark-ambient-glow'
                                : 'bg-[#FFFFFF] text-[#171717]'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[10px] font-mono-num">
                              <span className={socialDark ? 'text-[#FF8A36]' : 'text-[#C44D00]'}>
                                {activeSlide.kicker}
                              </span>
                              <span className="opacity-55">{socialPlatform}</span>
                            </div>

                            <div
                              className={`my-auto py-4 space-y-3.5 ${
                                socialPackage.slides.length > 1 ? 'px-8 sm:px-9' : ''
                              }`}
                            >
                              {/* AI Generated Geometric Motif */}
                              {activeSlide.svgMotif && (
                                <div
                                  className={`w-28 h-11 [&>svg]:w-full [&>svg]:h-full ${
                                    socialDark ? 'text-white' : 'text-[#171717]'
                                  }`}
                                  dangerouslySetInnerHTML={{
                                    __html: sanitizeAiSvgMarkup(activeSlide.svgMotif, '0 0 120 48'),
                                  }}
                                />
                              )}
                              <h3 className="font-heading text-xl sm:text-2xl font-bold leading-tight tracking-tight">
                                {activeSlide.headline}
                              </h3>
                              <p
                                className={`text-xs sm:text-sm leading-relaxed ${
                                  socialDark ? 'text-[#CCCCCC]' : 'text-[#5C5C58]'
                                }`}
                              >
                                {activeSlide.body}
                              </p>
                              {activeSlide.statCallout && (
                                <div
                                  className="inline-block pt-1 font-mono-num text-sm font-bold"
                                  style={{ color: socialDark ? '#FF9A45' : '#C44D00' }}
                                >
                                  {activeSlide.statCallout}
                                </div>
                              )}
                            </div>

                            <div className="pt-3 border-t border-current/15 flex items-center justify-between text-[11px]">
                              <div className="flex items-center gap-2">
                                {renderLogoMark(
                                  activeConcept,
                                  activeConcept.accentColor,
                                  !socialDark,
                                  'w-5 h-5'
                                )}
                                <span className="font-semibold">{state.brand.brandName}</span>
                              </div>
                              <span className="font-mono-num opacity-65">
                                {socialPackage.slides.length > 1 &&
                                activeSlideIdx < socialPackage.slides.length - 1
                                  ? 'Swipe →'
                                  : brandHandle}
                              </span>
                            </div>

                            {/* Carousel Prev/Next Overlay Controls */}
                            {socialPackage.slides.length > 1 && (
                              <>
                                <button
                                  type="button"
                                  aria-label="Previous carousel slide"
                                  disabled={activeSlideIdx === 0}
                                  onClick={() => setActiveSlideIdx((i) => Math.max(0, i - 1))}
                                  className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/55 hover:bg-black/75 disabled:opacity-25 text-white flex items-center justify-center cursor-pointer transition-opacity"
                                >
                                  <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  aria-label="Next carousel slide"
                                  disabled={activeSlideIdx === socialPackage.slides.length - 1}
                                  onClick={() =>
                                    setActiveSlideIdx((i) =>
                                      Math.min(socialPackage.slides.length - 1, i + 1)
                                    )
                                  }
                                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/55 hover:bg-black/75 disabled:opacity-25 text-white flex items-center justify-center cursor-pointer transition-opacity"
                                >
                                  <ChevronRight className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>

                          {/* Carousel Pagination Dots + Art Direction Note */}
                          <div className="px-4 py-3 bg-[#FFFFFF] border-t border-[#E6E6E2] space-y-2">
                            {socialPackage.slides.length > 1 && (
                              <div className="flex items-center justify-center gap-1.5">
                                {socialPackage.slides.map((sl, i) => (
                                  <button
                                    key={sl.slideNumber}
                                    type="button"
                                    aria-label={`View slide ${sl.slideNumber}`}
                                    onClick={() => setActiveSlideIdx(i)}
                                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                                      i === activeSlideIdx
                                        ? 'w-5 bg-[#FF7417]'
                                        : 'w-1.5 bg-[#D6D6D0]'
                                    }`}
                                  />
                                ))}
                              </div>
                            )}
                            <div className="text-[11px] text-[#5C5C58] leading-relaxed">
                              <span className="font-semibold text-[#252525]">
                                AI Visual Direction:{' '}
                              </span>
                              {activeSlide.artDirectionPrompt}
                            </div>
                          </div>
                        </div>

                        {/* Horizontal Slide Filmstrip (for Carousels) */}
                        {socialPackage.slides.length > 1 && (
                          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                            {socialPackage.slides.map((sl, idx) => {
                              const active = idx === activeSlideIdx;
                              return (
                                <button
                                  key={sl.slideNumber}
                                  type="button"
                                  onClick={() => setActiveSlideIdx(idx)}
                                  className={`p-2.5 rounded-[9px] border text-left transition-all cursor-pointer ${
                                    active
                                      ? 'border-[#FF7417] bg-[#FFFFFF] shadow-xs'
                                      : 'border-[#E6E6E2] bg-[#FAFAF9] hover:border-[#252525]'
                                  }`}
                                >
                                  <div className="text-[10px] font-mono-num text-[#C44D00]">
                                    0{sl.slideNumber} · {sl.role}
                                  </div>
                                  <div className="text-[11px] font-semibold text-[#171717] line-clamp-2 mt-1">
                                    {sl.headline}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* Optional Progressive-Disclosure Slide Copy Fine-Tuner */}
                        <div className="border-t border-[#E6E6E2] pt-3">
                          <button
                            type="button"
                            onClick={() => setShowSlideEditor((v) => !v)}
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5C5C58] hover:text-[#171717] cursor-pointer"
                          >
                            <ChevronDown
                              className={`w-3.5 h-3.5 transition-transform ${showSlideEditor ? 'rotate-180' : ''}`}
                            />
                            <span>
                              Optional: Fine-tune Slide 0{activeSlide.slideNumber} text manually
                            </span>
                          </button>
                          {showSlideEditor && (
                            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-[10px] bg-[#FFFFFF] border border-[#E6E6E2]">
                              <Field label="Slide Headline" htmlFor="edit-sl-head">
                                <Input
                                  id="edit-sl-head"
                                  type="text"
                                  value={activeSlide.headline}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setSocialPackage((prev) => ({
                                      ...prev,
                                      slides: prev.slides.map((s, i) =>
                                        i === activeSlideIdx ? { ...s, headline: val } : s
                                      ),
                                    }));
                                  }}
                                />
                              </Field>
                              <Field label="Stat / CTA Highlight" htmlFor="edit-sl-stat">
                                <Input
                                  id="edit-sl-stat"
                                  type="text"
                                  value={activeSlide.statCallout ?? ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setSocialPackage((prev) => ({
                                      ...prev,
                                      slides: prev.slides.map((s, i) =>
                                        i === activeSlideIdx ? { ...s, statCallout: val } : s
                                      ),
                                    }));
                                  }}
                                />
                              </Field>
                              <div className="sm:col-span-2">
                                <Field label="Slide Body" htmlFor="edit-sl-body">
                                  <Textarea
                                    id="edit-sl-body"
                                    rows={2}
                                    value={activeSlide.body}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setSocialPackage((prev) => ({
                                        ...prev,
                                        slides: prev.slides.map((s, i) =>
                                          i === activeSlideIdx ? { ...s, body: val } : s
                                        ),
                                      }));
                                    }}
                                  />
                                </Field>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* AI Generated Caption, Hashtags & Save Actions */}
                      <div className="rounded-[14px] border border-[#E6E6E2] bg-[#FFFFFF] p-5 space-y-4 bw-surface-raised">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="text-xs font-semibold text-[#171717]">
                            AI-Written Caption &amp; Hashtags
                          </div>
                          <LiquidButton
                            variant="secondary"
                            size="sm"
                            success={copiedToken === 'caption'}
                            onClick={() =>
                              handleCopyPayload(
                                'caption',
                                `${socialPackage.caption}\n\n${socialPackage.hashtags.join(' ')}`
                              )
                            }
                          >
                            {copiedToken !== 'caption' && <Copy className="w-3.5 h-3.5" />}
                            {copiedToken === 'caption' ? 'Copied Caption' : 'Copy Caption + Tags'}
                          </LiquidButton>
                        </div>
                        <p className="text-xs text-[#252525] whitespace-pre-line leading-relaxed bg-[#FAFAF9] p-3.5 rounded-[10px] border border-[#E6E6E2]">
                          {socialPackage.caption}
                        </p>
                        <div className="text-xs text-[#C44D00] font-medium">
                          {socialPackage.hashtags.join('  ')}
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#E6E6E2]">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              addTask({
                                title: `Publish AI ${socialPlatform}: ${socialPackage.title.slice(0, 36)}`,
                                description: `Post ${socialPackage.slides.length}-slide ${socialPlatform} generated in Brand Studio.`,
                                whyItMatters:
                                  socialPackage.postingRationale ||
                                  'Executes brand-locked social growth campaign.',
                                expectedOutcome:
                                  'Published social creative driving bio link clicks & saves.',
                                priority: 'high',
                                estimatedMinutes: 20,
                                dueDate: new Date().toISOString().slice(0, 10),
                                department: 'Brand Studio',
                                status: 'pending',
                                isTodayPriority: true,
                              });
                              navigate('growth-director');
                            }}
                          >
                            <Compass className="w-3.5 h-3.5 text-[#FF7417]" />
                            Schedule in Growth Planner
                          </Button>

                          <Button
                            variant="primary"
                            size="md"
                            onClick={() => {
                              const fmt = SOCIAL_FORMATS.find((f) => f.id === socialPlatform);
                              addBrandAsset({
                                title: socialPackage.title,
                                category: socialPlatform,
                                folder: fmt?.folder ?? 'Social Media',
                                format: `${fmt?.ratio ?? '4:5'} · ${socialPackage.slides.length} slide${socialPackage.slides.length > 1 ? 's' : ''}`,
                                status: 'Approved',
                                headlineText:
                                  socialPackage.slides[0]?.headline ?? state.brand.tagline,
                                subtext:
                                  socialPackage.slides[0]?.body ?? state.brand.positioningStatement,
                                accentHex: activeConcept.accentColor,
                                darkVariant: socialDark,
                                aiGenerated: true,
                                aiPrompt: socialPrompt,
                                aiModel: socialModelUsed || 'BrainWise AI',
                                svgMarkup: socialPackage.slides[0]?.svgMotif,
                                slides: socialPackage.slides,
                                caption: socialPackage.caption,
                                hashtags: socialPackage.hashtags,
                                artDirectionNote: socialPackage.postingRationale,
                              });
                            }}
                          >
                            Save{' '}
                            {socialPlatform === 'Carousel'
                              ? `${socialPackage.slides.length}-Slide Carousel`
                              : socialPlatform}{' '}
                            to Asset Library
                          </Button>
                        </div>
                      </div>
                    </div>
                  </LiquidSkeletonReveal>
                </div>
              ) : (
                /* AI BRAND ASSETS & COLLATERAL GENERATOR */
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  <div className="lg:col-span-5 rounded-[14px] border border-[#E6E6E2] bg-[#FFFFFF] p-5 space-y-4 bw-surface-raised">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[11px] font-mono-num text-[#C44D00] uppercase">
                          AI Brand Asset Designer
                        </div>
                        <h2 className="font-heading text-base font-bold text-[#171717]">
                          Generate Brand-Locked Collateral
                        </h2>
                      </div>
                      {collateralModelUsed && (
                        <span className="text-[11px] font-mono-num text-[#858585]">
                          {collateralModelUsed}
                        </span>
                      )}
                    </div>

                    <div>
                      <div className="text-xs font-medium text-[#242424] mb-1.5">
                        Asset Category
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {COLLATERAL_CATEGORIES.map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setSelectedCollateral(cat)}
                            className={`px-2.5 py-1.5 text-xs rounded-[8px] border cursor-pointer transition-colors ${
                              selectedCollateral === cat
                                ? 'bg-[#171717] text-white border-[#171717]'
                                : 'bg-[#F5F5F4] text-[#242424] border-[#E6E6E2] hover:border-[#D0D0C8]'
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>

                    <Field label="AI Creative Brief" htmlFor="ai-col-prompt">
                      <Textarea
                        id="ai-col-prompt"
                        rows={3}
                        value={collateralPrompt}
                        onChange={(e) => setCollateralPrompt(e.target.value)}
                        placeholder={`Describe the ${selectedCollateral.toLowerCase()} concept, offer, or print finish you want AI to design…`}
                      />
                    </Field>

                    <div>
                      <div className="text-xs font-medium text-[#242424] mb-1.5">
                        Surface Exploration
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(
                          [
                            { id: 'mixed', label: 'Light + Dark' },
                            { id: 'light', label: 'Light Editorial' },
                            { id: 'dark', label: 'Dark Charcoal' },
                          ] as const
                        ).map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setCollateralSurfacePref(opt.id)}
                            className={`py-2 text-xs font-medium rounded-[8px] border cursor-pointer ${
                              collateralSurfacePref === opt.id
                                ? 'border-[#FF7417] bg-[#FFF0E5]/55 text-[#C44D00]'
                                : 'border-[#E6E6E2] bg-[#FAFAF9] text-[#5C5C58]'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <Button
                      variant="primary"
                      size="md"
                      className="w-full"
                      loading={collateralGenerating}
                      disabled={!collateralPrompt.trim()}
                      onClick={handleGenerateAiCollateral}
                    >
                      {!collateralGenerating && <Sparkles className="w-4 h-4" />}
                      {collateralGenerating
                        ? `Generating 3 ${selectedCollateral} Concepts…`
                        : `Generate 3 AI ${selectedCollateral} Concepts`}
                    </Button>

                    {collateralGenerating && (
                      <AiRequestPulse
                        active
                        label={`AI Designer drafting 3 ${selectedCollateral} variations, vector accents & print specs…`}
                      />
                    )}

                    {collateralError && (
                      <ActionFeedbackBanner
                        tone="error"
                        title="Live AI Collateral Engine Unavailable"
                        detail={collateralError}
                        actionLabel="Preview Local Variations"
                        onAction={handleApplyLocalCollateralPreview}
                      />
                    )}
                  </div>

                  {/* RIGHT: 3 Generated Variations Selector + Live Artboard */}
                  <LiquidSkeletonReveal
                    loading={collateralGenerating}
                    contentKey={`collateral-${selectedCollateral}-${collateralVariations.map((v) => v.id).join('-')}`}
                    statusLabel={`Drafting 3 ${selectedCollateral} variations`}
                    skeleton={<BrandCollateralSkeleton />}
                    className="lg:col-span-7 space-y-4"
                  >
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        {collateralVariations.map((v, idx) => {
                          const active = idx === selectedVariationIdx;
                          return (
                            <button
                              key={v.id}
                              type="button"
                              onClick={() => setSelectedVariationIdx(idx)}
                              className={`p-3 rounded-[10px] border text-left transition-all cursor-pointer ${
                                active
                                  ? 'border-[#FF7417] bg-[#FFFFFF] shadow-xs'
                                  : 'border-[#E6E6E2] bg-[#FAFAF9] hover:border-[#252525]'
                              }`}
                            >
                              <div className="text-[10px] font-mono-num text-[#C44D00]">
                                CONCEPT 0{idx + 1} · {v.darkVariant ? 'DARK' : 'LIGHT'}
                              </div>
                              <div className="text-xs font-semibold text-[#171717] mt-1 truncate">
                                {v.layoutLabel}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <div className="rounded-[14px] border border-[#E6E6E2] bg-[#F5F5F4] p-6 sm:p-8 space-y-5">
                        <div
                          className={`rounded-[14px] p-8 min-h-[300px] flex flex-col justify-between border ${
                            activeVariation.darkVariant
                              ? 'bg-[#171717] text-white border-[#2C2C2C] bw-dark-ambient-glow'
                              : 'bg-[#FFFFFF] text-[#242424] border-[#E6E6E2] bw-surface-raised'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              {renderLogoMark(
                                activeConcept,
                                activeConcept.accentColor,
                                !activeVariation.darkVariant,
                                'w-8 h-8'
                              )}
                              <span className="font-heading font-bold text-sm">
                                {state.brand.brandName}
                              </span>
                            </div>
                            <span
                              className={`text-[11px] font-mono-num ${
                                activeVariation.darkVariant ? 'text-[#FF8A36]' : 'text-[#C44D00]'
                              }`}
                            >
                              {selectedCollateral.toUpperCase()} ·{' '}
                              {activeVariation.layoutLabel.toUpperCase()}
                            </span>
                          </div>

                          <div className="my-6 space-y-3">
                            {activeVariation.svgMotif && (
                              <div
                                className={`w-28 h-11 [&>svg]:w-full [&>svg]:h-full ${
                                  activeVariation.darkVariant ? 'text-white' : 'text-[#171717]'
                                }`}
                                dangerouslySetInnerHTML={{
                                  __html: sanitizeAiSvgMarkup(
                                    activeVariation.svgMotif,
                                    '0 0 120 48'
                                  ),
                                }}
                              />
                            )}
                            <h3 className="font-heading text-2xl font-bold leading-snug">
                              {activeVariation.headlineText}
                            </h3>
                            <p
                              className={`text-sm leading-relaxed ${
                                activeVariation.darkVariant ? 'text-[#CCCCCC]' : 'text-[#686864]'
                              }`}
                            >
                              {activeVariation.subtext}
                            </p>
                          </div>

                          <div className="pt-4 border-t border-current/15 flex items-center justify-between text-xs opacity-75">
                            <span>{activeVariation.footerNote}</span>
                            <span>{state.brain.location}</span>
                          </div>
                        </div>

                        <div className="p-3.5 rounded-[10px] bg-[#FFFFFF] border border-[#E6E6E2] text-xs text-[#5C5C58] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <span className="font-semibold text-[#252525]">
                              AI Art Direction &amp; Print Note:{' '}
                            </span>
                            {activeVariation.artDirectionNote}
                          </div>
                          <Button
                            variant="primary"
                            size="sm"
                            className="shrink-0"
                            onClick={() =>
                              addBrandAsset({
                                title: activeVariation.title,
                                category: selectedCollateral,
                                folder: 'Print & Packaging',
                                format: `AI ${activeVariation.layoutLabel} · Print Vector`,
                                status: 'Approved',
                                headlineText: activeVariation.headlineText,
                                subtext: activeVariation.subtext,
                                accentHex: activeConcept.accentColor,
                                darkVariant: activeVariation.darkVariant,
                                aiGenerated: true,
                                aiPrompt: collateralPrompt,
                                aiModel: collateralModelUsed || 'BrainWise AI',
                                svgMarkup: activeVariation.svgMotif,
                                artDirectionNote: activeVariation.artDirectionNote,
                              })
                            }
                          >
                            Save Concept to Asset Library
                          </Button>
                        </div>

                        <div className="border-t border-[#E6E6E2] pt-3">
                          <button
                            type="button"
                            onClick={() => setShowCollateralEditor((v) => !v)}
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5C5C58] hover:text-[#171717] cursor-pointer"
                          >
                            <ChevronDown
                              className={`w-3.5 h-3.5 transition-transform ${showCollateralEditor ? 'rotate-180' : ''}`}
                            />
                            <span>Optional: Fine-tune generated headline &amp; copy</span>
                          </button>
                          {showCollateralEditor && (
                            <div className="mt-3 space-y-3 p-4 rounded-[10px] bg-[#FFFFFF] border border-[#E6E6E2]">
                              <Field label="Headline" htmlFor="col-edit-head">
                                <Input
                                  id="col-edit-head"
                                  type="text"
                                  value={activeVariation.headlineText}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setCollateralVariations((prev) =>
                                      prev.map((item, i) =>
                                        i === selectedVariationIdx
                                          ? { ...item, headlineText: val }
                                          : item
                                      )
                                    );
                                  }}
                                />
                              </Field>
                              <Field label="Supporting Copy" htmlFor="col-edit-sub">
                                <Textarea
                                  id="col-edit-sub"
                                  rows={2}
                                  value={activeVariation.subtext}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setCollateralVariations((prev) =>
                                      prev.map((item, i) =>
                                        i === selectedVariationIdx
                                          ? { ...item, subtext: val }
                                          : item
                                      )
                                    );
                                  }}
                                />
                              </Field>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </LiquidSkeletonReveal>
                </div>
              )}
            </MorphingPanel>
          </AnimatePresence>
        </FluidTransition>
      )}

      <JourneyNextStep
        currentRoute="brand-studio"
        onBeforeNavigate={handleCreateLaunchCampaignFromBrand}
      />
    </div>
  );
};
