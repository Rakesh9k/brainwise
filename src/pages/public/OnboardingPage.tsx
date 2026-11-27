import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  HelpCircle,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useBrainWise } from '../../context/BrainWiseContext';
import { apiClient } from '../../services/apiClient';
import type { BusinessBrainData } from '../../types/brainwise';
import {
  FluidTransition,
  IntelligenceOrb,
  ProgressBar,
} from '../../components/ui/DesignSystem';
import { WorkspaceInitSkeleton } from '../../components/ui/LiquidSkeletons';
import { typeClass } from '../../theme/typography';

const BUSINESS_TYPES = [
  { id: 'Consumer brand', desc: 'Direct-to-consumer goods, packaged food, fashion, retail' },
  { id: 'Service business', desc: 'Professional, home, financial, or personal services' },
  { id: 'Technology startup', desc: 'Software, SaaS, mobile applications, or hardware tech' },
  { id: 'E-commerce business', desc: 'Online storefronts, marketplace commerce, digital products' },
  { id: 'Local business', desc: 'Retail store, cafe, clinic, gym, or neighborhood establishment' },
  {
    id: 'Agency or consulting',
    desc: 'Client services, creative, marketing, or strategy consultancy',
  },
  { id: 'Something else', desc: 'Enter your custom business category or model' },
];

const PRIORITIES = [
  'Finding more customers',
  'Building my brand',
  'Understanding competitors',
  'Launching a new business',
  'Increasing revenue',
  'Scaling my business',
  'Improving marketing',
  'Understanding my market',
  'Something else',
];

const DIFFERENTIATORS = [
  'Price & Affordability',
  'Uncompromising Quality',
  'Speed & Convenience',
  'Superior Customer Experience',
  'Technical Innovation',
  'Local Expertise & Trust',
  'Unique Proprietary Offerings',
  'Specialized Bespoke Services',
];

const BUSINESS_STAGES: BusinessBrainData['stage'][] = [
  'Idea Stage',
  'Pre-Launch',
  'Early Traction',
  'Growing Business',
  'Established',
];

export const OnboardingPage: React.FC = () => {
  const { completeOnboarding, navigate, prefilledIdeaPrompt } = useBrainWise();

  // Onboarding Stage Machine:
  // 1: Stage 1 (Identity & Location)
  // 2: Stage 2 (Objectives & Audience)
  // 3: Stage 3 (Offerings & Differentiation)
  // 4: AI Synthesis Processing Animation
  // 5: Structured Business Brain Review & Approval
  const [stage, setStage] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [stageStep, setStageStep] = useState<number>(1);
  const [isLoadingSession, setIsLoadingSession] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Form State (Stage 1: Identity & Location)
  const [businessType, setBusinessType] = useState('Technology startup');
  const [customBusinessType, setCustomBusinessType] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [website, setWebsite] = useState('');
  const [country, setCountry] = useState('IN');
  const [region, setRegion] = useState('');
  const [city, setCity] = useState('');
  const [targetMarket, setTargetMarket] = useState('');

  // Form State (Stage 2: Objectives & Audience)
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([
    'Finding more customers',
    'Building my brand',
  ]);
  const [objectiveDetails, setObjectiveDetails] = useState('');
  const [targetAudienceType, setTargetAudienceType] = useState(
    'Founders, executives, and modern business owners'
  );
  const [isB2B, setIsB2B] = useState(false);
  const [customerPainPoints, setCustomerPainPoints] = useState<string[]>([
    'Lack of time and strategic clarity',
    'High agency costs and inconsistent quality',
  ]);
  const [painPointInput, setPainPointInput] = useState('');
  const [demographics, setDemographics] = useState('');

  // Form State (Stage 3: Offerings & Differentiation)
  const [productSummary, setProductSummary] = useState(prefilledIdeaPrompt || '');
  const [selectedDifferentiators, setSelectedDifferentiators] = useState<string[]>([
    'Uncompromising Quality',
    'Technical Innovation',
  ]);
  const [customDifferentiator, setCustomDifferentiator] = useState('');
  const [businessStage, setBusinessStage] = useState<BusinessBrainData['stage']>('Early Traction');
  const [pricingModel, setPricingModel] = useState('Value-Based Pricing');
  const [socialLink, setSocialLink] = useState('');

  // Adaptive Questioning State
  const [adaptiveAnswer, setAdaptiveAnswer] = useState('');

  // Instant URL Auto-Extraction State (REC-P0-01)
  const [isExtractingUrl, setIsExtractingUrl] = useState(false);
  const [extractedNotice, setExtractedNotice] = useState<string | null>(null);

  const handleExtractFromUrl = async () => {
    if (!website || !website.trim()) return;
    setIsExtractingUrl(true);
    setExtractedNotice(null);
    try {
      const data = await apiClient.extractBusinessFromUrl(website);
      if (data) {
        if (data.businessName && (!businessName || businessName === 'New Venture Workspace')) {
          setBusinessName(data.businessName);
        }
        if (data.businessType) setBusinessType(data.businessType);
        if (data.targetAudienceType) setTargetAudienceType(data.targetAudienceType);
        if (Array.isArray(data.customerPainPoints) && data.customerPainPoints.length > 0) {
          setCustomerPainPoints(data.customerPainPoints);
        }
        if (data.offeringsSummary) setProductSummary(data.offeringsSummary);
        if (Array.isArray(data.differentiators) && data.differentiators.length > 0) {
          setSelectedDifferentiators(data.differentiators);
        }
        if (data.pricingModel) setPricingModel(data.pricingModel);
        if (data.city && (!city || city === 'Global')) setCity(data.city);
        if (data.country) setCountry(data.country);

        setExtractedNotice(
          `Extracted from ${data.extractedFrom || website}! Pre-filled offerings, target audience, and key differentiators.`
        );
      }
    } catch {
      setExtractedNotice('Website scanned. Applied baseline strategic profile for your category.');
    } finally {
      setIsExtractingUrl(false);
    }
  };

  // AI Generated Business Brain State (Review Stage 5)
  const [generatedBrain, setGeneratedBrain] = useState<any>(null);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>('');
  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [synthesisProgress, setSynthesisProgress] = useState(25);

  // Load existing session on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const session = await apiClient.getOnboardingSession();
        if (session && session.data && mounted) {
          if (session.data.businessType) setBusinessType(session.data.businessType);
          if (session.data.customBusinessType)
            setCustomBusinessType(session.data.customBusinessType);
          if (session.data.businessName) setBusinessName(session.data.businessName);
          if (session.data.website) setWebsite(session.data.website);
          if (session.data.country) setCountry(session.data.country);
          if (session.data.city) setCity(session.data.city);
          if (session.data.targetMarket) setTargetMarket(session.data.targetMarket);
          if (session.data.primaryPriorities) setSelectedPriorities(session.data.primaryPriorities);
          if (session.data.objectiveDetails) setObjectiveDetails(session.data.objectiveDetails);
          if (session.data.targetAudienceType)
            setTargetAudienceType(session.data.targetAudienceType);
          if (session.data.offeringsSummary) setProductSummary(session.data.offeringsSummary);
          if (session.data.differentiators)
            setSelectedDifferentiators(session.data.differentiators);
          if (session.data.businessStage) setBusinessStage(session.data.businessStage as any);

          if (session.status === 'BUSINESS_BRAIN_REVIEW' && session.workspaceId) {
            setActiveWorkspaceId(session.workspaceId);
            const profile = await apiClient.getBusinessProfile(session.workspaceId);
            setGeneratedBrain(profile);
            setStage(5);
          } else if (session.currentStage) {
            setStage(session.currentStage as 1 | 2 | 3);
            setStageStep(session.currentStep || 1);
          }
        }
      } catch {
        // Fallback to fresh onboarding
      } finally {
        if (mounted) setIsLoadingSession(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Auto-save helper
  const autoSave = useCallback(
    async (nextStage: 1 | 2 | 3, nextStep: number) => {
      setIsSaving(true);
      try {
        await apiClient.saveOnboardingAnswer({
          stage: nextStage,
          step: nextStep,
          answer: {
            businessType: businessType === 'Something else' ? customBusinessType : businessType,
            customBusinessType,
            businessName,
            website,
            country,
            region,
            city,
            targetMarket,
            primaryPriorities: selectedPriorities,
            objectiveDetails,
            targetAudienceType,
            isB2B,
            customerPainPoints,
            demographics,
            offeringsSummary: productSummary,
            differentiators: selectedDifferentiators,
            customDifferentiator,
            businessStage,
            pricingModel,
            onlineChannels: { website, other: socialLink },
            adaptiveResponses: { [businessType]: adaptiveAnswer },
          },
        });
      } catch {
        // Non-blocking background save
      } finally {
        setIsSaving(false);
      }
    },
    [
      adaptiveAnswer,
      businessName,
      businessStage,
      businessType,
      city,
      country,
      customBusinessType,
      customDifferentiator,
      customerPainPoints,
      demographics,
      isB2B,
      objectiveDetails,
      pricingModel,
      productSummary,
      region,
      selectedDifferentiators,
      selectedPriorities,
      socialLink,
      targetAudienceType,
      targetMarket,
      website,
    ]
  );

  // Trigger AI generation
  const startBrainSynthesis = async () => {
    setStage(4);
    setSynthesisProgress(30);

    try {
      // 1. Provision or link workspace
      const { workspaceId } = await apiClient.provisionWorkspaceFromOnboarding();
      setActiveWorkspaceId(workspaceId);
      apiClient.setActiveWorkspaceId(workspaceId);
      setSynthesisProgress(60);

      // 2. Synthesize structured Business Brain
      const collectedData = {
        businessType: businessType === 'Something else' ? customBusinessType : businessType,
        businessName: businessName.trim() || 'New Venture Workspace',
        website,
        country,
        region,
        city,
        targetMarket,
        primaryPriorities: selectedPriorities,
        objectiveDetails,
        targetAudienceType,
        isB2B,
        customerPainPoints,
        demographics,
        offeringsSummary: productSummary,
        differentiators: selectedDifferentiators,
        customDifferentiator,
        businessStage,
        pricingModel,
        onlineChannels: { website, other: socialLink },
        adaptiveResponses: { [businessType]: adaptiveAnswer },
      };

      const result = await apiClient.generateBusinessBrain(workspaceId, collectedData);
      setSynthesisProgress(90);

      setTimeout(() => {
        setGeneratedBrain(result.profile);
        setStage(5);
      }, 600);
    } catch (err) {
      console.error('Brain synthesis error:', err);
      // Fallback: load business profile directly
      if (activeWorkspaceId) {
        const profile = await apiClient.getBusinessProfile(activeWorkspaceId);
        setGeneratedBrain(profile);
      }
      setStage(5);
    }
  };

  // Handle Approve Business Brain
  const handleApprove = async () => {
    setIsApproving(true);
    try {
      if (activeWorkspaceId) {
        await apiClient.approveBusinessBrain(activeWorkspaceId);
      }
      await apiClient.completeOnboardingSession();

      completeOnboarding({
        personaRole: businessType,
        primaryGoals: selectedPriorities,
        businessName: businessName || 'New Venture Workspace',
        industry: businessType,
        stage: businessStage,
        location: [city, country].filter(Boolean).join(', ') || 'Global',
        productSummary,
        website,
        targetCustomers: targetAudienceType,
        startFreshEmpty: true,
      });

      navigate('dashboard');
    } catch (err) {
      console.error('Approval failed:', err);
      navigate('dashboard');
    } finally {
      setIsApproving(false);
    }
  };

  const togglePriority = (p: string) => {
    setSelectedPriorities((prev) =>
      prev.includes(p) ? prev.filter((item) => item !== p) : [...prev, p]
    );
  };

  const toggleDifferentiator = (d: string) => {
    setSelectedDifferentiators((prev) =>
      prev.includes(d) ? prev.filter((item) => item !== d) : [...prev, d]
    );
  };

  const addPainPoint = () => {
    if (painPointInput.trim() && !customerPainPoints.includes(painPointInput.trim())) {
      setCustomerPainPoints([...customerPainPoints, painPointInput.trim()]);
      setPainPointInput('');
    }
  };

  if (isLoadingSession) {
    return (
      <div className="min-h-screen bg-[#FAFAF9] flex items-center justify-center p-8">
        <WorkspaceInitSkeleton />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF9] flex flex-col justify-between p-4 sm:p-8">
      {/* Shell Header */}
      <div className="max-w-3xl w-full mx-auto flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <img src="/brainwise-logo.png" alt="BrainWise" className="h-7 w-auto object-contain" />
          <span className="text-xs text-[#8E8E88] border-l border-[#E6E6E2] pl-3">
            Conversational Onboarding
          </span>
        </div>

        {stage < 4 && (
          <div className="flex items-center gap-3">
            {isSaving && (
              <span className="text-[11px] font-medium text-[#C44D00] animate-pulse">Saving…</span>
            )}
            <span className="text-xs text-[#8E8E88]">Stage {stage} of 3</span>
            <button
              type="button"
              onClick={startBrainSynthesis}
              className="text-xs font-semibold text-[#5C5C58] hover:text-[#252525] cursor-pointer"
            >
              Skip to Brain Review →
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="max-w-2xl w-full mx-auto my-auto py-4">
        {/* ======================================================== */}
        {/* STAGE 1: UNDERSTAND THE BUSINESS                         */}
        {/* ======================================================== */}
        {stage === 1 && (
          <FluidTransition key="stage-1" direction="fade" className="space-y-6">
            <div>
              <span className="text-xs font-semibold tracking-wider text-[#C44D00] uppercase">
                Stage 1 — Business Identity
              </span>
              <h1 className={`${typeClass.h2} font-bold text-[#171717] mt-1`}>
                Let's understand your business.
              </h1>
              <p className={`${typeClass.bodySm} text-[#686864] mt-1.5`}>
                Tell us a little about what you're building. We'll use this to create your
                personalized Business Brain.
              </p>
            </div>

            {stageStep === 1 && (
              <div className="space-y-4 pt-2">
                <label className="block text-sm font-semibold text-[#252525]">
                  What are you building?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {BUSINESS_TYPES.map((bt) => (
                    <button
                      key={bt.id}
                      type="button"
                      onClick={() => {
                        setBusinessType(bt.id);
                      }}
                      className={`p-3.5 rounded-[12px] text-left border transition-all cursor-pointer ${
                        businessType === bt.id
                          ? 'border-[#FF7417] bg-[#FFFBF7] shadow-sm'
                          : 'border-[#E6E6E2] bg-[#FFFFFF] hover:border-[#D0D0CA]'
                      }`}
                    >
                      <div className="text-sm font-semibold text-[#171717] flex items-center justify-between">
                        <span>{bt.id}</span>
                        {businessType === bt.id && (
                          <div className="w-4 h-4 rounded-full bg-[#FF7417] text-white flex items-center justify-center text-[10px]">
                            ✓
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-[#70706B] mt-1 leading-snug">{bt.desc}</div>
                    </button>
                  ))}
                </div>

                {businessType === 'Something else' && (
                  <div className="mt-3">
                    <label className="block text-xs font-medium text-[#252525] mb-1">
                      Describe your business model or category:
                    </label>
                    <input
                      type="text"
                      value={customBusinessType}
                      onChange={(e) => setCustomBusinessType(e.target.value)}
                      placeholder="e.g. Clean Energy Subscription Platform"
                      className="w-full h-10 px-3 text-sm border border-[#E6E6E2] rounded-[10px] focus:outline-none focus:border-[#FF7417]"
                    />
                  </div>
                )}

                {/* Zero-Friction Idea Sandbox Option */}
                <div className="rounded-[12px] border border-[#FFD3B3] bg-[#FFF8F2] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-[#C44D00] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Don't have a business yet? Just exploring an idea?
                    </span>
                    <p className="text-xs text-[#70706B] leading-relaxed">
                      Skip company profile setup. Jump straight into Idea Intelligence to research
                      market size, demand, and unit economics. Your Business Brain will hatch
                      automatically once validated.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      completeOnboarding({
                        personaRole: 'Idea Stage Founder',
                        primaryGoals: ['Validate an idea'],
                        businessName: 'Idea Exploration Workspace',
                        industry: businessType || 'General Consumer & B2B',
                        stage: 'Idea Stage',
                        location: 'Global',
                        productSummary: 'Exploring initial product concepts',
                        website: '',
                        targetCustomers: 'Early adopters',
                        startFreshEmpty: true,
                        sandboxIdeaMode: true,
                      });
                      navigate('idea-intelligence');
                    }}
                    className="h-9 px-4 rounded-[8px] bg-[#FF7417] hover:bg-[#E55F08] text-white text-xs font-semibold whitespace-nowrap cursor-pointer shrink-0 transition-colors inline-flex items-center gap-1.5 shadow-2xs"
                  >
                    <span>Start in Idea Sandbox Mode</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setStageStep(2);
                      autoSave(1, 2);
                    }}
                    className="h-10 px-6 rounded-[10px] bg-[#171717] hover:bg-[#252525] text-white text-sm font-semibold flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <span>Next: Business Name</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {stageStep === 2 && (
              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-sm font-semibold text-[#252525] mb-1">
                    What's the name of your business?
                  </label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Solstice Craft Coffee"
                    className="w-full h-11 px-3.5 text-base font-medium border border-[#E6E6E2] rounded-[10px] focus:outline-none focus:border-[#FF7417]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-[#252525]">
                      Website or domain (Optional)
                    </label>
                    {website && website.trim().length > 3 && (
                      <button
                        type="button"
                        onClick={handleExtractFromUrl}
                        disabled={isExtractingUrl}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#FF7417] hover:text-[#C44D00] transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{isExtractingUrl ? 'Scanning site…' : 'Instant Auto-Extract & Pre-Fill'}</span>
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      onBlur={() => {
                        if (website && website.trim().length > 3 && !extractedNotice && !productSummary) {
                          handleExtractFromUrl();
                        }
                      }}
                      placeholder="https://yourbusiness.com"
                      className="w-full h-10 px-3 text-sm border border-[#E6E6E2] rounded-[10px] focus:outline-none focus:border-[#FF7417]"
                    />
                    {website && website.trim().length > 3 && (
                      <button
                        type="button"
                        onClick={handleExtractFromUrl}
                        disabled={isExtractingUrl}
                        className="px-3.5 h-10 rounded-[10px] bg-[#171717] hover:bg-[#252525] text-white text-xs font-medium inline-flex items-center gap-1.5 transition-all shrink-0 cursor-pointer disabled:opacity-50"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[#FF7417]" />
                        <span>{isExtractingUrl ? 'Extracting…' : 'Pre-Fill'}</span>
                      </button>
                    )}
                  </div>
                  {extractedNotice && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-2.5 p-3 rounded-[10px] bg-[#FFF0E5] border border-[#FF7417]/30 text-xs font-medium text-[#C44D00] flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#FF7417] shrink-0" />
                        <span>{extractedNotice}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setExtractedNotice(null)}
                        className="text-[#C44D00] hover:text-[#171717] text-xs font-bold cursor-pointer"
                      >
                        Dismiss
                      </button>
                    </motion.div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#252525] mb-1">
                    Where does your business operate?
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="City (e.g. Bengaluru)"
                      className="w-full h-10 px-3 text-sm border border-[#E6E6E2] rounded-[10px] focus:outline-none focus:border-[#FF7417]"
                    />
                    <input
                      type="text"
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      placeholder="Region / State (e.g. Karnataka)"
                      className="w-full h-10 px-3 text-sm border border-[#E6E6E2] rounded-[10px] focus:outline-none focus:border-[#FF7417]"
                    />
                    <input
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      placeholder="Country (e.g. India)"
                      className="w-full h-10 px-3 text-sm border border-[#E6E6E2] rounded-[10px] focus:outline-none focus:border-[#FF7417]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#252525] mb-1">
                    Target geographic market
                  </label>
                  <input
                    type="text"
                    value={targetMarket}
                    onChange={(e) => setTargetMarket(e.target.value)}
                    placeholder="e.g. Metro Cities in India, Pan-European, Global Remote"
                    className="w-full h-10 px-3 text-sm border border-[#E6E6E2] rounded-[10px] focus:outline-none focus:border-[#FF7417]"
                  />
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setStageStep(1)}
                    className="h-10 px-4 rounded-[10px] border border-[#E6E6E2] text-[#5C5C58] hover:text-[#171717] text-sm font-medium flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStage(2);
                      setStageStep(1);
                      autoSave(2, 1);
                    }}
                    className="h-10 px-6 rounded-[10px] bg-[#171717] hover:bg-[#252525] text-white text-sm font-semibold flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <span>Continue to Objectives</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </FluidTransition>
        )}

        {/* ======================================================== */}
        {/* STAGE 2: UNDERSTAND OBJECTIVES & AUDIENCE               */}
        {/* ======================================================== */}
        {stage === 2 && (
          <FluidTransition key="stage-2" direction="fade" className="space-y-6">
            <div>
              <span className="text-xs font-semibold tracking-wider text-[#C44D00] uppercase">
                Stage 2 — Priorities & Audience
              </span>
              <h1 className={`${typeClass.h2} font-bold text-[#171717] mt-1`}>
                What are your biggest priorities right now?
              </h1>
              <p className={`${typeClass.bodySm} text-[#686864] mt-1.5`}>
                Select the core goals BrainWise should align its growth strategies with.
              </p>
            </div>

            <div className="space-y-4 pt-1">
              <div className="flex flex-wrap gap-2">
                {PRIORITIES.map((p) => {
                  const active = selectedPriorities.includes(p);
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => togglePriority(p)}
                      className={`px-3.5 py-2 rounded-full text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                        active
                          ? 'border-[#FF7417] bg-[#FFF4E5] text-[#C44D00]'
                          : 'border-[#E6E6E2] bg-white text-[#5C5C58] hover:border-[#D0D0CA]'
                      }`}
                    >
                      {active && <Check className="w-3 h-3 text-[#FF7417]" />}
                      <span>{p}</span>
                    </button>
                  );
                })}
              </div>

              <div>
                <label className="block text-xs font-medium text-[#252525] mb-1">
                  Tell us a little more about what you're trying to achieve (Optional)
                </label>
                <textarea
                  rows={2}
                  value={objectiveDetails}
                  onChange={(e) => setObjectiveDetails(e.target.value)}
                  placeholder="e.g. We are validating our pilot product and looking to acquire our first 50 paying customers."
                  className="w-full p-3 text-sm border border-[#E6E6E2] rounded-[10px] focus:outline-none focus:border-[#FF7417]"
                />
              </div>

              {/* Target Customer */}
              <div className="pt-2 border-t border-[#E6E6E2]">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-[#252525]">
                    Who are you trying to reach?
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsB2B(false)}
                      className={`text-xs px-2.5 py-1 rounded-[6px] border cursor-pointer ${
                        !isB2B
                          ? 'bg-[#171717] text-white border-[#171717]'
                          : 'bg-white text-[#5C5C58] border-[#E6E6E2]'
                      }`}
                    >
                      Consumers (B2C)
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsB2B(true)}
                      className={`text-xs px-2.5 py-1 rounded-[6px] border cursor-pointer ${
                        isB2B
                          ? 'bg-[#171717] text-white border-[#171717]'
                          : 'bg-white text-[#5C5C58] border-[#E6E6E2]'
                      }`}
                    >
                      Businesses (B2B)
                    </button>
                  </div>
                </div>

                <input
                  type="text"
                  value={targetAudienceType}
                  onChange={(e) => setTargetAudienceType(e.target.value)}
                  placeholder="e.g. Specialty coffee enthusiasts and remote creative professionals"
                  className="w-full h-10 px-3 text-sm border border-[#E6E6E2] rounded-[10px] focus:outline-none focus:border-[#FF7417]"
                />

                <div className="mt-2.5">
                  <label className="block text-xs font-medium text-[#252525] mb-1">
                    Audience Demographics / Firmographics (Optional)
                  </label>
                  <input
                    type="text"
                    value={demographics}
                    onChange={(e) => setDemographics(e.target.value)}
                    placeholder="e.g. Ages 25-45, tech-forward, high disposable income"
                    className="w-full h-9 px-3 text-xs border border-[#E6E6E2] rounded-[8px] focus:outline-none focus:border-[#FF7417]"
                  />
                </div>

                <div className="mt-2.5">
                  <label className="block text-xs font-medium text-[#252525] mb-1">
                    Key Customer Pain Points
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={painPointInput}
                      onChange={(e) => setPainPointInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addPainPoint();
                        }
                      }}
                      placeholder="Add a customer pain point..."
                      className="flex-1 h-9 px-3 text-xs border border-[#E6E6E2] rounded-[8px] focus:outline-none focus:border-[#FF7417]"
                    />
                    <button
                      type="button"
                      onClick={addPainPoint}
                      className="px-3 h-9 bg-[#171717] hover:bg-[#242424] text-white text-xs font-medium rounded-[8px] cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {customerPainPoints.map((pp, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] bg-[#F5F5F4] text-[#252525] border border-[#E6E6E2]"
                      >
                        <span>{pp}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setCustomerPainPoints(customerPainPoints.filter((_, idx) => idx !== i))
                          }
                          className="hover:text-[#BC3E3E] cursor-pointer ml-0.5"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Adaptive Questioning Box */}
              <div className="p-4 rounded-[12px] bg-[#FFFBF7] border border-[#FFE2CC] space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#C44D00]">
                  <Sparkles className="w-3.5 h-3.5 text-[#FF7417]" />
                  <span>Adaptive Insight for {businessType}</span>
                </div>
                <p className="text-xs text-[#5C5C58]">
                  {businessType === 'Consumer brand' &&
                    'What distribution channels and retail packaging formats are you planning?'}
                  {businessType === 'Service business' &&
                    'What is your primary delivery method (in-person, remote, retainers)?'}
                  {businessType === 'Technology startup' &&
                    'What core technical or proprietary advantage sets your product apart?'}
                  {businessType === 'E-commerce business' &&
                    'What platforms or sales channels will drive your initial inventory velocity?'}
                  {businessType === 'Local business' &&
                    'What is your target service radius around your physical location?'}
                  {businessType !== 'Consumer brand' &&
                    businessType !== 'Service business' &&
                    businessType !== 'Technology startup' &&
                    businessType !== 'E-commerce business' &&
                    businessType !== 'Local business' &&
                    'What is the primary constraint or bottleneck in your business right now?'}
                </p>
                <input
                  type="text"
                  value={adaptiveAnswer}
                  onChange={(e) => setAdaptiveAnswer(e.target.value)}
                  placeholder="Optional detail to sharpen AI grounding..."
                  className="w-full h-9 px-3 text-xs bg-white border border-[#E6E6E2] rounded-[8px] focus:outline-none focus:border-[#FF7417]"
                />
              </div>

              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setStage(1);
                    setStageStep(2);
                  }}
                  className="h-10 px-4 rounded-[10px] border border-[#E6E6E2] text-[#5C5C58] hover:text-[#171717] text-sm font-medium flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStage(3);
                    setStageStep(1);
                    autoSave(3, 1);
                  }}
                  className="h-10 px-6 rounded-[10px] bg-[#171717] hover:bg-[#252525] text-white text-sm font-semibold flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <span>Continue to Offerings</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </FluidTransition>
        )}

        {/* ======================================================== */}
        {/* STAGE 3: UNDERSTAND OFFERINGS & DIFFERENTIATION          */}
        {/* ======================================================== */}
        {stage === 3 && (
          <FluidTransition key="stage-3" direction="fade" className="space-y-6">
            <div>
              <span className="text-xs font-semibold tracking-wider text-[#C44D00] uppercase">
                Stage 3 — Offerings & Differentiation
              </span>
              <h1 className={`${typeClass.h2} font-bold text-[#171717] mt-1`}>
                What do you sell or provide?
              </h1>
              <p className={`${typeClass.bodySm} text-[#686864] mt-1.5`}>
                Describe your core products or services, and what sets your business apart.
              </p>
            </div>

            <div className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-medium text-[#252525] mb-1">
                  Product / Service Summary
                </label>
                <textarea
                  rows={3}
                  value={productSummary}
                  onChange={(e) => setProductSummary(e.target.value)}
                  placeholder="e.g. Single-origin artisanal coffees roasted locally, subscription boxes, and cafe experience."
                  className="w-full p-3 text-sm border border-[#E6E6E2] rounded-[10px] focus:outline-none focus:border-[#FF7417]"
                />
              </div>

              {/* What makes your business different */}
              <div>
                <label className="block text-sm font-semibold text-[#252525] mb-2">
                  What makes your business different?
                </label>
                <div className="flex flex-wrap gap-2">
                  {DIFFERENTIATORS.map((d) => {
                    const active = selectedDifferentiators.includes(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggleDifferentiator(d)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer flex items-center gap-1.5 ${
                          active
                            ? 'border-[#FF7417] bg-[#FFF4E5] text-[#C44D00]'
                            : 'border-[#E6E6E2] bg-white text-[#5C5C58] hover:border-[#D0D0CA]'
                        }`}
                      >
                        {active && <Check className="w-3 h-3 text-[#FF7417]" />}
                        <span>{d}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-2">
                  <input
                    type="text"
                    value={customDifferentiator}
                    onChange={(e) => setCustomDifferentiator(e.target.value)}
                    placeholder="Custom unique differentiator (Optional)..."
                    className="w-full h-9 px-3 text-xs border border-[#E6E6E2] rounded-[8px] focus:outline-none focus:border-[#FF7417]"
                  />
                </div>
              </div>

              {/* Pricing & Digital Presence */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#252525] mb-1">
                    Pricing Model
                  </label>
                  <input
                    type="text"
                    value={pricingModel}
                    onChange={(e) => setPricingModel(e.target.value)}
                    placeholder="e.g. Value-Based, Subscription, Flat Fee"
                    className="w-full h-9 px-3 text-xs border border-[#E6E6E2] rounded-[8px] focus:outline-none focus:border-[#FF7417]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#252525] mb-1">
                    Social Link / Profile (Optional)
                  </label>
                  <input
                    type="text"
                    value={socialLink}
                    onChange={(e) => setSocialLink(e.target.value)}
                    placeholder="e.g. instagram.com/brand or linkedin.com/company"
                    className="w-full h-9 px-3 text-xs border border-[#E6E6E2] rounded-[8px] focus:outline-none focus:border-[#FF7417]"
                  />
                </div>
              </div>

              {/* Business Stage */}
              <div>
                <label className="block text-sm font-semibold text-[#252525] mb-1.5">
                  Current Business Stage
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {BUSINESS_STAGES.map((stg) => (
                    <button
                      key={stg}
                      type="button"
                      onClick={() => setBusinessStage(stg)}
                      className={`p-2.5 rounded-[10px] text-xs font-medium border text-center cursor-pointer transition-all ${
                        businessStage === stg
                          ? 'border-[#171717] bg-[#171717] text-white shadow-sm'
                          : 'border-[#E6E6E2] bg-white text-[#5C5C58] hover:border-[#D0D0CA]'
                      }`}
                    >
                      {stg}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStage(2)}
                  className="h-10 px-4 rounded-[10px] border border-[#E6E6E2] text-[#5C5C58] hover:text-[#171717] text-sm font-medium flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={startBrainSynthesis}
                  className="h-11 px-8 rounded-[10px] bg-[#C44D00] hover:bg-[#A33E00] text-white text-sm font-semibold flex items-center gap-2 cursor-pointer transition-colors shadow-sm"
                >
                  <Sparkles className="w-4 h-4 text-white" />
                  <span>Generate Business Brain →</span>
                </button>
              </div>
            </div>
          </FluidTransition>
        )}

        {/* ======================================================== */}
        {/* STAGE 4: AI PROCESSING ANIMATION                         */}
        {/* ======================================================== */}
        {stage === 4 && (
          <FluidTransition key="stage-4" direction="fade" className="text-center py-12 space-y-6">
            <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
              <IntelligenceOrb size="lg" />
              <Sparkles className="w-8 h-8 text-[#FF7417] absolute animate-pulse" />
            </div>

            <div>
              <h2 className={`${typeClass.h2} font-bold text-[#171717]`}>
                Synthesizing your Business Brain…
              </h2>
              <p className={`${typeClass.bodySm} text-[#686864] max-w-md mx-auto mt-2`}>
                Grounding facts, structuring customer personas, and identifying competitive
                advantages for{' '}
                <strong className="text-[#171717]">{businessName || 'your business'}</strong>.
              </p>
            </div>

            <div className="max-w-xs mx-auto">
              <ProgressBar value={synthesisProgress} />
              <div className="text-[11px] text-[#8E8E88] mt-2">
                Structuring ground truth & calculating confidence…
              </div>
            </div>
          </FluidTransition>
        )}

        {/* ======================================================== */}
        {/* STAGE 5: STRUCTURED BUSINESS BRAIN REVIEW & APPROVAL      */}
        {/* ======================================================== */}
        {stage === 5 && generatedBrain && (
          <FluidTransition key="stage-5" direction="fade" className="space-y-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#EAF5EF] text-[#24724E] border border-[#CDE5D7] mb-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#24724E]" />
                <span>Business Brain Draft Ready for Review</span>
              </div>
              <h1 className={`${typeClass.h2} font-bold text-[#171717]`}>
                Your Business Brain is taking shape.
              </h1>
              <p className={`${typeClass.bodySm} text-[#686864] mt-1`}>
                We've organized what we understand about your business. Review it, make corrections,
                and approve your profile.
              </p>
            </div>

            {/* Review Cards Grid */}
            <div className="space-y-4">
              {/* Card 1: Identity & Positioning */}
              <div className="p-5 rounded-[14px] bg-white border border-[#E6E6E2] bw-surface-raised space-y-3">
                <div className="flex items-center justify-between border-b border-[#F0F0EE] pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#8E8E88] uppercase tracking-wider">
                      Identity & Positioning
                    </span>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#EAF5EF] text-[#24724E] border border-[#CDE5D7]">
                      <ShieldCheck className="w-2.5 h-2.5" />
                      Confirmed Facts
                    </span>
                  </div>
                  <span className="text-xs text-[#8E8E88] font-mono-num">
                    {generatedBrain.stage || businessStage}
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#171717]">
                    {generatedBrain.businessName || businessName}
                  </h3>
                  <p className="text-xs font-medium text-[#FF7417] mt-0.5">
                    {generatedBrain.tagline}
                  </p>
                  <p className="text-xs text-[#5C5C58] mt-2 leading-relaxed">
                    {generatedBrain.overviewSummary}
                  </p>
                </div>
              </div>

              {/* Card 2: Offerings & Products */}
              <div className="p-5 rounded-[14px] bg-white border border-[#E6E6E2] bw-surface-raised space-y-3">
                <div className="flex items-center justify-between border-b border-[#F0F0EE] pb-2.5">
                  <span className="text-xs font-bold text-[#8E8E88] uppercase tracking-wider">
                    Core Offerings & Pricing
                  </span>
                  <span className="text-xs text-[#8E8E88]">
                    {generatedBrain.revenueModel || pricingModel}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(generatedBrain.productsAndServices || []).map((p: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3 rounded-[10px] bg-[#FAFAF9] border border-[#E6E6E2]"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#171717]">{p.name}</span>
                        <span className="text-[11px] font-semibold text-[#24724E]">
                          {p.priceRange}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#70706B] mt-1 leading-snug">
                        {p.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card 3: Target Personas */}
              <div className="p-5 rounded-[14px] bg-white border border-[#E6E6E2] bw-surface-raised space-y-3">
                <div className="flex items-center justify-between border-b border-[#F0F0EE] pb-2.5">
                  <span className="text-xs font-bold text-[#8E8E88] uppercase tracking-wider">
                    Target Customer Personas
                  </span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#FFF4E5] text-[#A85E16] border border-[#FBE0C2]">
                    <Sparkles className="w-2.5 h-2.5 text-[#FF7417]" />
                    AI Synthesized
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(generatedBrain.customerPersonas || []).map((pers: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-[10px] bg-[#FAFAF9] border border-[#E6E6E2] space-y-1.5"
                    >
                      <span className="text-xs font-bold text-[#171717]">{pers.name}</span>
                      <p className="text-[11px] text-[#5C5C58]">{pers.ageOrFirmographics}</p>
                      <div className="text-[11px] text-[#70706B] pt-1">
                        <strong>Triggers:</strong> {(pers.buyingTriggers || []).join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card 4: Missing Information & Information Gaps */}
              {generatedBrain.intelligence?.informationGaps?.length > 0 && (
                <div className="p-4 rounded-[12px] bg-[#FFFBF7] border border-[#FFE2CC] space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#C44D00]">
                    <HelpCircle className="w-4 h-4 text-[#FF7417]" />
                    <span>Information Gaps (Refine Anytime Later)</span>
                  </div>
                  <ul className="text-xs text-[#5C5C58] space-y-1 list-disc pl-4">
                    {generatedBrain.intelligence.informationGaps.map((gap: string, i: number) => (
                      <li key={i}>{gap}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Approval Action Bar */}
            <div className="pt-4 flex items-center justify-between border-t border-[#E6E6E2]">
              <button
                type="button"
                onClick={() => setStage(3)}
                className="h-10 px-4 rounded-[10px] border border-[#E6E6E2] text-[#5C5C58] hover:text-[#171717] text-sm font-medium flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Adjust Answers</span>
              </button>

              <button
                type="button"
                disabled={isApproving}
                onClick={handleApprove}
                className="h-12 px-8 rounded-[12px] bg-[#171717] hover:bg-[#252525] disabled:opacity-50 text-white text-sm font-bold flex items-center gap-2.5 cursor-pointer shadow-md transition-all"
              >
                <CheckCircle2 className="w-5 h-5 text-[#34A853]" />
                <span>
                  {isApproving ? 'Approving…' : 'Approve Business Brain & Open Workspace →'}
                </span>
              </button>
            </div>
          </FluidTransition>
        )}
      </div>

      {/* Footer Info */}
      <div className="max-w-2xl w-full mx-auto text-center pt-4 text-xs text-[#8E8E88]">
        BrainWise grounds all marketing strategies, competitive intelligence, and brand collateral
        in your persistent Business Brain.
      </div>
    </div>
  );
};
