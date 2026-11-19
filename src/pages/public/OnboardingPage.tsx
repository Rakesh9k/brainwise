import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Plus, Sparkles, X } from 'lucide-react';
import { useBrainWise } from '../../context/BrainWiseContext';
import type { BusinessBrainData } from '../../types/brainwise';
import {
  BrandLogoMark,
  FluidProgress,
  FluidTransition,
  IntelligenceOrb,
  IntelligenceSurface,
  NeuralNetworkAnimation,
  ProgressBar,
} from '../../components/ui/DesignSystem';
import { WorkspaceInitSkeleton } from '../../components/ui/LiquidSkeletons';
import { typeClass } from '../../theme/typography';

const ROLES = [
  { id: 'Aspiring founder', desc: 'Exploring or validating an early business concept' },
  { id: 'Startup founder', desc: 'Building a new venture and seeking product-market fit' },
  { id: 'Small business owner', desc: 'Running an active local, service, or D2C business' },
  { id: 'Established business', desc: 'Expanding product lines or defending market position' },
  { id: 'Marketing professional', desc: 'Driving competitive positioning, brand, and campaigns' },
];

const GOALS = [
  'Validate a business idea',
  'Research a market',
  'Build a brand',
  'Understand competitors',
  'Grow an existing business',
];

const STAGES: BusinessBrainData['stage'][] = [
  'Idea Stage',
  'Pre-Launch',
  'Early Traction',
  'Growing Business',
  'Established',
];

const SUGGESTED_COMPETITORS = [
  'Roastery House',
  'Blue Tokai Coffee',
  'Third Wave Coffee',
  'Subko Craft Roasters',
];

export const OnboardingPage: React.FC = () => {
  const { completeOnboarding, navigate, prefilledIdeaPrompt } = useBrainWise();
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [role, setRole] = useState('Startup founder');
  const [goals, setGoals] = useState<string[]>(['Validate a business idea', 'Build a brand']);
  const [businessName, setBusinessName] = useState('');
  const [industry, setIndustry] = useState('');
  const [stage, setStage] = useState<BusinessBrainData['stage']>('Early Traction');
  const [location, setLocation] = useState('');
  const [productSummary, setProductSummary] = useState(prefilledIdeaPrompt);
  const [website, setWebsite] = useState('');
  const [targetCustomers, setTargetCustomers] = useState('');
  const [competitorInput, setCompetitorInput] = useState('');
  const [competitors, setCompetitors] = useState<string[]>([]);
  const [startFreshEmpty, setStartFreshEmpty] = useState(false);
  const [initProgress, setInitProgress] = useState(18);

  useEffect(() => {
    if (step !== 5) return;
    const timers = [
      window.setTimeout(() => setInitProgress(52), 400),
      window.setTimeout(() => setInitProgress(84), 850),
      window.setTimeout(() => {
        setInitProgress(100);
        completeOnboarding({
          personaRole: role,
          primaryGoals: goals,
          businessName,
          industry,
          stage,
          location,
          productSummary,
          website,
          targetCustomers,
          initialCompetitors: competitors,
          startFreshEmpty,
        });
      }, 1350),
    ];
    return () => timers.forEach(clearTimeout);
  }, [step]);

  const toggleGoal = (g: string) => {
    setGoals((prev) =>
      prev.includes(g) ? prev.filter((item) => item !== g) : [...prev, g]
    );
  };

  const addCompetitorTag = (raw: string) => {
    const clean = raw.trim();
    if (!clean) return;
    if (!competitors.some((c) => c.toLowerCase() === clean.toLowerCase())) {
      setCompetitors((prev) => [...prev, clean]);
    }
    setCompetitorInput('');
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9] flex flex-col p-4 sm:p-8">
      <div className="max-w-2xl w-full mx-auto flex items-center justify-between mb-8">
        <div className="flex items-center gap-2.5">
          <BrandLogoMark size={26} />
          <span className="font-heading text-base font-bold text-[#252525]">BrainWise</span>
        </div>
        {step < 5 && (
          <button
            type="button"
            onClick={() =>
              completeOnboarding({
                personaRole: role,
                primaryGoals: goals,
                businessName: '',
                industry: '',
                stage,
                location: '',
                productSummary: '',
                website: '',
                targetCustomers: '',
              })
            }
            className="text-xs font-medium text-[#5C5C58] hover:text-[#252525] cursor-pointer"
          >
            Skip to Demo Dashboard →
          </button>
        )}
      </div>

      <div
        className={`max-w-2xl w-full mx-auto rounded-[16px] overflow-hidden ${
          step === 5
            ? 'bg-transparent'
            : 'bg-[#FFFFFF] border border-[#E6E6E2] p-6 sm:p-10 bw-surface-raised'
        }`}
      >
        {step < 5 && (
          <div className="mb-8">
            <div className="flex items-center justify-between text-xs text-[#5C5C58] mb-2">
              <span>Business Brain Initialization</span>
              <span className="font-mono-num">Step {step} of 4</span>
            </div>
            <ProgressBar value={(step / 4) * 100} showPercent={false} size="sm" />
          </div>
        )}

        {step === 1 && (
          <FluidTransition key="ob-step-1" direction="up" className="space-y-6">
            <div>
              <h1 className={`${typeClass.h3} font-bold text-[#171717]`}>
                What best describes you right now?
              </h1>
              <p className={`${typeClass.bodySm} text-[#686864] mt-1`}>
                BrainWise adapts research depth and growth recommendations to your stage.
              </p>
            </div>

            <div className="space-y-2.5">
              {ROLES.map((r) => {
                const selected = role === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRole(r.id)}
                    className={`w-full text-left p-4 rounded-[12px] border flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                      selected
                        ? 'border-[#FF7417] bg-[#FFF0E5]/55'
                        : 'border-[#E6E6E2] hover:bg-[#F5F5F4]'
                    }`}
                  >
                    <div>
                      <div className="text-sm font-semibold text-[#242424]">{r.id}</div>
                      <div className="text-xs text-[#686864] mt-0.5">{r.desc}</div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                        selected ? 'border-[#FF7417] bg-[#FF7417] text-white' : 'border-[#D0D0C8]'
                      }`}
                    >
                      {selected && <Check className="w-3 h-3" />}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => navigate('landing')}
                className="inline-flex items-center gap-1.5 text-sm text-[#686864] hover:text-[#242424] cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#FF7417] hover:bg-[#E55F08] rounded-[10px] shadow-[0_1px_2px_rgba(255,116,23,0.28)] cursor-pointer transition-colors"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </FluidTransition>
        )}

        {step === 2 && (
          <FluidTransition key="ob-step-2" direction="up" className="space-y-6">
            <div>
              <h1 className={`${typeClass.h3} font-bold text-[#171717]`}>
                What do you want to achieve first?
              </h1>
              <p className={`${typeClass.bodySm} text-[#686864] mt-1`}>
                Select one or more priorities. We will highlight your fastest path forward.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {GOALS.map((g) => {
                const selected = goals.includes(g);
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => toggleGoal(g)}
                    className={`p-4 rounded-[12px] border text-left flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                      selected
                        ? 'border-[#FF7417] bg-[#FFF0E5]/55'
                        : 'border-[#E6E6E2] hover:bg-[#F5F5F4]'
                    }`}
                  >
                    <span className="text-sm font-medium text-[#242424]">{g}</span>
                    <span
                      className={`w-5 h-5 rounded-[6px] border flex items-center justify-center shrink-0 ${
                        selected ? 'bg-[#FF7417] border-[#FF7417] text-white' : 'border-[#D0D0C8]'
                      }`}
                    >
                      {selected && <Check className="w-3.5 h-3.5" />}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-1.5 text-sm text-[#686864] hover:text-[#242424] cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                type="button"
                disabled={goals.length === 0}
                onClick={() => setStep(3)}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#FF7417] hover:bg-[#E55F08] disabled:bg-[#E6E6E2] disabled:text-[#858585] disabled:cursor-not-allowed rounded-[10px] shadow-[0_1px_2px_rgba(255,116,23,0.28)] cursor-pointer transition-colors"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </FluidTransition>
        )}

        {step === 3 && (
          <FluidTransition key="ob-step-3" direction="up" className="space-y-5">
            <div>
              <h1 className={`${typeClass.h3} font-bold text-[#171717]`}>
                Tell us about your business &amp; industry
              </h1>
              <p className={`${typeClass.bodySm} text-[#686864] mt-1`}>
                Leave fields blank if you want to explore with our pre-loaded Solstice Craft Coffee workspace.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="ob-name" className="block text-xs font-medium text-[#242424] mb-1">
                  Business or Proposed Name
                </label>
                <input
                  id="ob-name"
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Solstice Craft Coffee"
                  className="w-full h-10 px-3 text-sm border border-[#E6E6E2] rounded-[10px] focus:outline-none focus:border-[#FF7417] focus:ring-3 focus:ring-[#FF7417]/12 transition-all"
                />
              </div>

              <div>
                <label htmlFor="ob-industry" className="block text-xs font-medium text-[#242424] mb-1">
                  Industry
                </label>
                <input
                  id="ob-industry"
                  type="text"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="e.g. Specialty Coffee / B2B SaaS"
                  className="w-full h-10 px-3 text-sm border border-[#E6E6E2] rounded-[10px] focus:outline-none focus:border-[#FF7417] focus:ring-3 focus:ring-[#FF7417]/12 transition-all"
                />
              </div>

              <div>
                <label htmlFor="ob-stage" className="block text-xs font-medium text-[#242424] mb-1">
                  Business Stage
                </label>
                <select
                  id="ob-stage"
                  value={stage}
                  onChange={(e) => setStage(e.target.value as BusinessBrainData['stage'])}
                  className="w-full h-10 px-3 text-sm border border-[#E6E6E2] rounded-[10px] bg-white focus:outline-none focus:border-[#FF7417] focus:ring-3 focus:ring-[#FF7417]/12 transition-all"
                >
                  {STAGES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="ob-location" className="block text-xs font-medium text-[#242424] mb-1">
                  Location / Geography (Optional)
                </label>
                <input
                  id="ob-location"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Bengaluru, India"
                  className="w-full h-10 px-3 text-sm border border-[#E6E6E2] rounded-[10px] focus:outline-none focus:border-[#FF7417] focus:ring-3 focus:ring-[#FF7417]/12 transition-all"
                />
              </div>
            </div>

            <div>
              <label htmlFor="ob-products" className="block text-xs font-medium text-[#242424] mb-1">
                Products or Services (Optional)
              </label>
              <input
                id="ob-products"
                type="text"
                value={productSummary}
                onChange={(e) => setProductSummary(e.target.value)}
                placeholder="e.g. Freshly roasted single-origin coffee subscriptions & tasting kits"
                className="w-full h-10 px-3 text-sm border border-[#E6E6E2] rounded-[10px] focus:outline-none focus:border-[#FF7417] focus:ring-3 focus:ring-[#FF7417]/12 transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="ob-customers" className="block text-xs font-medium text-[#242424] mb-1">
                  Target Customers (Optional)
                </label>
                <input
                  id="ob-customers"
                  type="text"
                  value={targetCustomers}
                  onChange={(e) => setTargetCustomers(e.target.value)}
                  placeholder="e.g. Remote professionals & creative studios"
                  className="w-full h-10 px-3 text-sm border border-[#E6E6E2] rounded-[10px] focus:outline-none focus:border-[#FF7417] focus:ring-3 focus:ring-[#FF7417]/12 transition-all"
                />
              </div>

              <div>
                <label htmlFor="ob-website" className="block text-xs font-medium text-[#242424] mb-1">
                  Website (Optional)
                </label>
                <input
                  id="ob-website"
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://"
                  className="w-full h-10 px-3 text-sm border border-[#E6E6E2] rounded-[10px] focus:outline-none focus:border-[#FF7417] focus:ring-3 focus:ring-[#FF7417]/12 transition-all"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#E6E6E2]">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-1.5 text-sm text-[#686864] hover:text-[#242424] cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(4)}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#FF7417] hover:bg-[#E55F08] rounded-[10px] shadow-[0_1px_2px_rgba(255,116,23,0.28)] cursor-pointer transition-colors"
              >
                Continue to Competitors
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </FluidTransition>
        )}

        {step === 4 && (
          <FluidTransition key="ob-step-4" direction="up" className="space-y-5">
            <div>
              <h1 className={`${typeClass.h3} font-bold text-[#171717]`}>
                Who are your closest competitors?
              </h1>
              <p className={`${typeClass.bodySm} text-[#686864] mt-1`}>
                Seed Competitive Intelligence &amp; Market Watch now so BrainWise maps your differentiation immediately.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="ob-comp-input"
                type="text"
                value={competitorInput}
                onChange={(e) => setCompetitorInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCompetitorTag(competitorInput);
                  }
                }}
                placeholder="Type a competitor name or URL (e.g. Blue Tokai)"
                aria-label="Add competitor name"
                className="flex-1 h-10 px-3 text-sm border border-[#E6E6E2] rounded-[10px] focus:outline-none focus:border-[#FF7417] focus:ring-3 focus:ring-[#FF7417]/12 transition-all"
              />
              <button
                type="button"
                disabled={!competitorInput.trim()}
                onClick={() => addCompetitorTag(competitorInput)}
                className="inline-flex items-center gap-1.5 h-10 px-4 text-xs font-semibold rounded-[10px] bg-[#171717] text-white hover:bg-[#252525] disabled:bg-[#E6E6E2] disabled:text-[#858585] disabled:cursor-not-allowed cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>

            <div className="space-y-2">
              <div className="text-[11px] font-medium text-[#858585]">
                Quick-add category examples:
              </div>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_COMPETITORS.map((sug) => {
                  const active = competitors.includes(sug);
                  return (
                    <button
                      key={sug}
                      type="button"
                      onClick={() =>
                        active
                          ? setCompetitors((prev) => prev.filter((c) => c !== sug))
                          : addCompetitorTag(sug)
                      }
                      className={`px-3 py-1.5 text-xs rounded-[8px] border transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#FFF0E5] border-[#FF7417] text-[#C44D00] font-semibold'
                          : 'bg-[#FAFAF9] border-[#E6E6E2] text-[#5C5C58] hover:border-[#252525]'
                      }`}
                    >
                      {active ? '✓ ' : '+ '}
                      {sug}
                    </button>
                  );
                })}
              </div>
            </div>

            {competitors.length > 0 && (
              <div className="p-3.5 rounded-[10px] border border-[#E6E6E2] bg-[#FFFFFF] space-y-2">
                <div className="text-xs font-semibold text-[#252525]">
                  Selected to Monitor ({competitors.length})
                </div>
                <div className="flex flex-wrap gap-2">
                  {competitors.map((comp) => (
                    <span
                      key={comp}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-[#F5F5F4] border border-[#E6E6E2] rounded-[7px] text-[#252525]"
                    >
                      <span>{comp}</span>
                      <button
                        type="button"
                        onClick={() => setCompetitors((prev) => prev.filter((c) => c !== comp))}
                        aria-label={`Remove ${comp}`}
                        className="text-[#858585] hover:text-[#BC3E3E] cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="p-3.5 rounded-[10px] bg-[#F5F5F4] border border-[#E6E6E2]">
              <label className="flex items-start gap-2.5 text-xs text-[#242424] cursor-pointer">
                <input
                  type="checkbox"
                  checked={startFreshEmpty}
                  onChange={(e) => setStartFreshEmpty(e.target.checked)}
                  className="mt-0.5 accent-[#FF7417]"
                />
                <span>
                  <strong className="font-semibold">Start clean guided workspace (without Solstice demo fixtures)</strong>
                  <span className="block text-[#686864] mt-0.5">
                    Initializes empty departments (plus any competitors added above) with step-by-step recommended next actions.
                  </span>
                </span>
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#E6E6E2]">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="inline-flex items-center gap-1.5 text-sm text-[#686864] hover:text-[#242424] cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setStep(5)}
                  className="px-4 py-2.5 text-sm font-medium text-[#686864] hover:text-[#242424] cursor-pointer"
                >
                  Skip competitors
                </button>
                <button
                  type="button"
                  onClick={() => setStep(5)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#FF7417] hover:bg-[#E55F08] rounded-[10px] shadow-[0_1px_2px_rgba(255,116,23,0.28)] cursor-pointer transition-colors"
                >
                  <Sparkles className="w-4 h-4" />
                  Initialize Business Brain
                </button>
              </div>
            </div>
          </FluidTransition>
        )}

        {step === 5 && (
          <FluidTransition key="ob-step-5" direction="fade">
            <IntelligenceSurface variant="dark" className="p-6 sm:p-8 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <IntelligenceOrb size="md" state="thinking" />
                  <div>
                    <h2 className={`${typeClass.h4} font-bold text-white`}>
                      Initializing your Business Brain
                    </h2>
                    <p className={`${typeClass.bodySm} text-[#A8A8A2]`}>
                      Synchronizing context across Intelligence, Brand Studio, and Growth Planner...
                    </p>
                  </div>
                </div>
                <span className="font-mono-num text-xs font-semibold text-[#FF9A45]">
                  {initProgress}%
                </span>
              </div>

              <div className="rounded-[12px] border border-[#252525] bg-[#141414] overflow-hidden">
                <NeuralNetworkAnimation
                  mode="convergence"
                  dark
                  height={180}
                  label={`Connecting ${businessName || 'your business'} context nodes`}
                />
              </div>

              <WorkspaceInitSkeleton />

              <FluidProgress
                value={initProgress}
                label="Connecting core business intelligence departments"
                activeShimmer
                dark
              />
            </IntelligenceSurface>
          </FluidTransition>
        )}
      </div>
    </div>
  );
};
