import React, { useEffect, useRef, useState } from 'react';
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
} from 'motion/react';
import { ArrowRight, Brain, Check, Menu, Minus, Plus, Sparkles, X } from 'lucide-react';
import { useBrainWise } from '../../context/BrainWiseContext';
import { BrandLogoMark } from '../../components/ui/DesignSystem';
import { NeuralConstellationSignature } from '../../components/motion/LiquidMotion';
import {
  AnimatedCounter,
  KineticMarquee,
  MagneticButton,
  ResilientMedia,
  SelfDrawingSvg,
} from '../../components/motion/MotionPrimitives';
import {
  InteractiveDeviceMockup,
  type ShowcaseStepId,
} from '../../components/landing/InteractiveDeviceMockup';
import { JournalSection } from '../../components/landing/JournalSection';
import { typeClass } from '../../theme/typography';

interface WorkflowStep {
  id: ShowcaseStepId;
  num: string;
  title: string;
  role: string;
  summary: string;
  outcome: string;
  paths: string[];
  fillPath: string;
}

const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    id: '01',
    num: '01',
    title: 'Validate & Size With Evidence',
    role: 'Idea Intelligence',
    summary:
      'Transform a raw business concept into a structured 15-section market dossier—separating verified category references from editable TAM/SAM/SOM range bands.',
    outcome: 'Feeds validated customer pain points into Business Brain',
    paths: [
      'M9 18h6',
      'M10 22h4',
      'M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14',
    ],
    fillPath:
      'M12 2a6 6 0 0 0-6 6c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14h6.18c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8a6 6 0 0 0-6-6Z',
  },
  {
    id: '02',
    num: '02',
    title: 'Discover Rivals & Claim White Space',
    role: 'Competitive Intelligence',
    summary:
      'Dissect competitor pricing ladders, review complaints, and channel playbooks on a live positioning map to isolate where your offer wins cleanly.',
    outcome: 'Shapes creative direction inside Brand Studio',
    paths: ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', 'M9 12l2 2 4-4'],
    fillPath: 'M12 2L4 5v7c0 6 8 10 8 10s8-4 8-10V5l-8-3z',
  },
  {
    id: '03',
    num: '03',
    title: 'Build Cohesive Brand & Collateral',
    role: 'Brand Studio',
    summary:
      'Lock your visual direction, primary wordmark, typography, and surface tokens once—then export packaging sleeves, launch cards, and social carousels.',
    outcome: 'Deploys approved creative into Growth Planner',
    paths: [
      'M12 2a10 10 0 1 0 10 10c0-1.1-.9-2-2-2h-2.5a1.5 1.5 0 0 1 0-3H19a3 3 0 0 0 3-3',
      'M7.5 10.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
      'M12 7.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
    ],
    fillPath: 'M12 2a10 10 0 1 0 10 10c0-1.1-.9-2-2-2h-2.5a1.5 1.5 0 0 1 0-3H19',
  },
  {
    id: '04',
    num: '04',
    title: 'Execute Weekly & Watch the Market',
    role: 'Growth Planner & Market Watch',
    summary:
      'Turn strategic insights into a 30-day execution cadence with prioritized daily tasks, structured experiments, and live Market Watch competitor triggers.',
    outcome: 'Converts competitor shifts into measurable experiments',
    paths: [
      'M12 2v4',
      'M12 18v4',
      'M4.93 4.93l2.83 2.83',
      'M16.24 16.24l2.83 2.83',
      'M2 12h4',
      'M18 12h4',
      'M12 12m-4 0a4 4 0 1 0 8 0 4 4 0 1 0-8 0',
    ],
    fillPath: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z',
  },
];

const IMPACT_METRICS = [
  {
    value: 15,
    suffix: '',
    label: 'Section Market Dossiers',
    context: 'Verified references separated cleanly from modelled sizing bands',
  },
  {
    value: 1,
    suffix: '',
    label: 'Shared Business Brain',
    context: 'Persistent venture memory read automatically by every module',
  },
  {
    value: 7,
    suffix: '',
    label: 'Guided Research Steps',
    context: 'Structured concept-to-dossier intake with live TAM assumptions',
  },
  {
    value: 30,
    suffix: 'd',
    label: 'Execution Sprint Cadence',
    context: 'Prioritized daily queue synced with Market Watch counter-tests',
  },
];

const DEPARTMENT_FLOW_CHAIN = [
  {
    num: '01',
    dept: 'Business Brain',
    reads: 'Venture stage, product offers & personas',
    emits: 'Unified workspace memory synced everywhere',
  },
  {
    num: '02',
    dept: 'Idea Intelligence',
    reads: 'Raw concept & target geography',
    emits: '15-section dossier & editable sizing bands',
  },
  {
    num: '03',
    dept: 'Competitive Intel',
    reads: 'Customer pain points & price ladders',
    emits: 'Positioning map & battlecard wedges',
  },
  {
    num: '04',
    dept: 'Brand Studio',
    reads: 'Differentiation angle & audience voice',
    emits: 'Identity tokens, wordmark & launch collateral',
  },
  {
    num: '05',
    dept: 'Growth Planner',
    reads: 'Goals, rival alerts & approved assets',
    emits: 'Daily priority sprint & structured tests',
  },
];

const MARQUEE_PHRASES = [
  'Shared Business Brain',
  '15-Section Market Dossiers',
  'Competitive White-Space Mapping',
  'Brand & Collateral Studio',
  '30-Day Growth Roadmap',
  'Market Watch Signal Engine',
];

const FAQS = [
  {
    q: 'How is BrainWise different from a standalone AI chat or prompt tool?',
    a: 'Standalone chats forget context between threads. BrainWise anchors every department inside a shared Business Brain—so your market research informs your competitor positioning, your positioning shapes your Brand Studio guidelines, and your brand assets flow straight into your 30-day Growth Planner tasks.',
  },
  {
    q: 'Can I use BrainWise before I have an established company or revenue?',
    a: 'Yes. Aspiring founders start with Idea Intelligence to test viability and sizing ranges, discover competitors, and run pre-launch validation experiments before committing capital.',
  },
  {
    q: 'Does BrainWise invent market size numbers or business metrics?',
    a: 'No. Every research report explicitly distinguishes verified market references from modelled estimates, exposes editable sizing assumptions, and marks prototype analytics clearly.',
  },
  {
    q: 'Can I explore the full workspace before creating an account?',
    a: 'Yes. Click "Explore Live Demo" to step straight into a populated demonstration workspace for Solstice Craft Coffee, or complete the 3-step onboarding with your own business idea.',
  },
];

export const LandingPage: React.FC = () => {
  const { navigate, loginDemo, launchWorkspaceWithIdea } = useBrainWise();
  const reduced = useReducedMotion();
  const [activeStep, setActiveStep] = useState<ShowcaseStepId>('01');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [sandboxIdea, setSandboxIdea] = useState('');
  const [caseStudyMode, setCaseStudyMode] = useState<'after' | 'before'>('after');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const showcaseGridRef = useRef<HTMLDivElement | null>(null);
  const manualOverrideUntilRef = useRef(0);

  const { scrollYProgress: showcaseProgress } = useScroll({
    target: showcaseGridRef,
    offset: ['start 0.65', 'end 0.45'],
  });

  useMotionValueEvent(showcaseProgress, 'change', (latest) => {
    if (typeof window === 'undefined' || window.innerWidth < 1024) return;
    if (Date.now() < manualOverrideUntilRef.current) return;
    const nextStep: ShowcaseStepId =
      latest < 0.25 ? '01' : latest < 0.5 ? '02' : latest < 0.75 ? '03' : '04';
    setActiveStep((curr) => (curr === nextStep ? curr : nextStep));
  });

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileMenuOpen]);

  const handleSelectStage = (stepId: ShowcaseStepId, holdMs = 1800) => {
    manualOverrideUntilRef.current = Date.now() + holdMs;
    setActiveStep(stepId);
  };

  const handleOpenDemo = () => {
    loginDemo('Vishesh', 'vishesh.kakar@gmail.com');
  };

  const handleRunIdeaSandbox = (e: React.FormEvent) => {
    e.preventDefault();
    launchWorkspaceWithIdea(sandboxIdea || 'Boutique Pilates Studio in Austin');
  };

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#242424] overflow-x-hidden w-full">
      {/* Strict 3-Zone Frosted Top Bar */}
      <header
        data-frosted-nav="landing-header"
        className="sticky top-0 z-40 bw-frosted-nav border-b border-[#E6E6E2]/75"
      >
        <div className="max-w-[1240px] mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-4 sm:gap-8">
          <a
            href="#top"
            className="flex items-center gap-2.5 font-heading text-lg font-bold tracking-tight text-[#171717] whitespace-nowrap shrink-0"
          >
            <BrandLogoMark size={28} />
            <span>BrainWise</span>
          </a>

          <nav
            aria-label="Primary navigation"
            className="hidden lg:flex items-center gap-7 text-sm font-medium text-[#686864]"
          >
            {[
              { href: '#capabilities', label: 'Capabilities' },
              { href: '#departments', label: 'Departments' },
              { href: '#journal', label: 'Journal' },
              { href: '#pricing', label: 'Pricing' },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="relative py-1 hover:text-[#171717] transition-colors whitespace-nowrap shrink-0 after:content-[''] after:absolute after:left-0 after:bottom-0 after:h-[1.5px] after:w-full after:scale-x-0 hover:after:scale-x-100 after:origin-left after:bg-[#FF7417] after:transition-transform after:duration-200"
              >
                {item.label}
              </a>
            ))}
            <button
              type="button"
              onClick={() => navigate('login')}
              className="hover:text-[#171717] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Sign in
            </button>
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={mobileMenuOpen}
              className="lg:hidden p-2 rounded-full border border-[#ECECE8] text-[#171717] hover:bg-[#FAFAF9] cursor-pointer"
            >
              <Menu className="w-4 h-4" />
            </button>
            <MagneticButton
              variant="dark"
              onClick={() => navigate('signup')}
              className="px-5 py-2 text-xs sm:text-sm rounded-full"
            >
              <span>Get Started</span>
            </MagneticButton>
          </div>
        </div>
      </header>

      {/* Slide-Over Mobile & Tablet Navigation Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 z-50 lg:hidden flex justify-end"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-[#171717]/30 backdrop-blur-xs"
            />
            <motion.nav
              data-frosted-nav="landing-mobile"
              initial={reduced ? false : { x: '100%' }}
              animate={{ x: 0 }}
              exit={reduced ? undefined : { x: '100%' }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 w-72 max-w-[85vw] bw-frosted-nav-elevated h-full border-l border-[#E6E6E2]/80 p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-[#E6E6E2]">
                  <div className="flex items-center gap-2 font-heading font-bold text-base">
                    <BrandLogoMark size={24} />
                    <span>BrainWise</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    aria-label="Close navigation menu"
                    className="p-1.5 rounded-[8px] text-[#686864] hover:bg-[#ECECE9] cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-5 flex flex-col gap-1">
                  {[
                    { href: '#capabilities', label: 'Capabilities' },
                    { href: '#departments', label: 'Departments & Proof' },
                    { href: '#journal', label: 'Founder Journal' },
                    { href: '#about', label: 'About BrainWise' },
                    { href: '#pricing', label: 'Pricing Plans' },
                    { href: '#faq', label: 'FAQ' },
                  ].map((item) => (
                    <a
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="px-3 py-2.5 rounded-[8px] text-sm font-medium text-[#242424] hover:bg-[#F5F5F4]"
                    >
                      {item.label}
                    </a>
                  ))}
                </div>
              </div>

              <div className="space-y-2.5 pt-4 border-t border-[#E6E6E2]">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate('login');
                  }}
                  className="w-full py-2.5 text-sm font-medium text-[#242424] bg-[#F5F5F4] border border-[#E6E6E2] rounded-[10px] cursor-pointer"
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate('signup');
                  }}
                  className="w-full py-2.5 text-sm font-semibold text-white bg-[#FF7417] hover:bg-[#E55F08] rounded-[10px] cursor-pointer"
                >
                  Start Free Workspace
                </button>
              </div>
            </motion.nav>
          </div>
        )}
      </AnimatePresence>

      {/* Swiss Editorial Hero Composition + Delicate Concentric Arc Field */}
      <section
        id="top"
        className="relative overflow-hidden pt-16 sm:pt-20 pb-20 sm:pb-28 bg-[#FFFFFF]"
      >
        {/* Ultra-Subtle Sculptural Concentric Arc Sweep */}
        <svg
          aria-hidden="true"
          viewBox="0 0 1440 720"
          fill="none"
          className="pointer-events-none absolute inset-0 w-full h-full object-cover opacity-80"
        >
          <path
            d="M -120 420 Q 480 80, 1540 520"
            stroke="#171717"
            strokeOpacity="0.04"
            strokeWidth="44"
          />
          <path
            d="M -120 510 Q 520 180, 1540 610"
            stroke="#171717"
            strokeOpacity="0.03"
            strokeWidth="28"
          />
          <path
            d="M -80 340 Q 460 30, 1500 440"
            stroke="#FF7417"
            strokeOpacity="0.055"
            strokeWidth="1.5"
          />
        </svg>

        {/* Restrained Warm Ambient Illumination */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-28 left-1/3 w-[760px] h-[420px] rounded-full opacity-55 blur-3xl"
          style={{
            background:
              'radial-gradient(ellipse at 50% 45%, rgba(255, 116, 23, 0.075) 0%, rgba(255, 240, 229, 0.3) 45%, rgba(255, 255, 255, 0) 75%)',
          }}
        />

        <div className="relative z-10 max-w-[1240px] mx-auto px-5 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
            {/* High-Contrast Two-Tone Editorial Typography */}
            <div className="lg:col-span-6 flex flex-col justify-center">
              <p className={`${typeClass.overline} text-[#858585] mb-5`}>
                BUSINESS INTELLIGENCE &amp; GROWTH OPERATING SYSTEM
              </p>

              <h1 className={`${typeClass.display} text-[#171717] text-balance`}>
                Strategy that speaks{' '}
                <span className="italic font-semibold text-[#969690]">volumes</span> with clarity
                <span
                  aria-hidden="true"
                  className="inline-block w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 bg-[#FF7417] ml-1.5 align-baseline"
                />
              </h1>

              <p className={`mt-6 ${typeClass.lead} text-[#5C5C58] max-w-xl`}>
                One connected workspace anchored by your Business Brain. Size markets with honest
                range bands, map competitor white space, lock cohesive brand rules, and execute
                daily growth priorities.
              </p>

              {/* Sleek Pill Concept Validation Bar */}
              <form
                onSubmit={handleRunIdeaSandbox}
                className="mt-8 p-1.5 rounded-full border border-[#E8E8E4] bg-[#FAFAF9] bw-tactile-pill flex flex-col sm:flex-row sm:items-center gap-2 max-w-xl"
              >
                <div className="flex items-center gap-2.5 flex-1 px-3.5">
                  <Sparkles className="w-4 h-4 text-[#FF7417] shrink-0" />
                  <input
                    type="text"
                    value={sandboxIdea}
                    onChange={(e) => setSandboxIdea(e.target.value)}
                    placeholder="Test a concept (e.g. Boutique Pilates Studio in Austin)"
                    aria-label="Try your own business idea"
                    className="w-full h-9 bg-transparent text-sm text-[#242424] placeholder:text-[#858585] focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-1.5 px-5 h-9 rounded-full bg-[#171717] hover:bg-[#242424] text-white text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                >
                  <span>Run Dossier</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#FF8A36]" />
                </button>
              </form>

              <div className="mt-6 flex flex-wrap items-center gap-3.5">
                <MagneticButton variant="primary" onClick={() => navigate('signup')}>
                  <span>Start Free Workspace</span>
                  <ArrowRight className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-0.5" />
                </MagneticButton>

                <MagneticButton variant="secondary" onClick={handleOpenDemo}>
                  <span>Explore Live Demo</span>
                </MagneticButton>
              </div>

              {/* Unboxed Zero-Pill Capability Index */}
              <div className="mt-8 pt-6 border-t border-[#EFEFEB] flex flex-wrap lg:flex-nowrap items-center gap-x-3 gap-y-1.5 text-[11px] sm:text-xs text-[#858585] lg:whitespace-nowrap">
                <span>01 Shared Business Brain</span>
                <span aria-hidden="true">·</span>
                <span>02 Linked Strategy Workflows</span>
                <span aria-hidden="true">·</span>
                <span>03 Interactive Sample Workspace</span>
              </div>
            </div>

            {/* Signature Architectural Node Constellation Sculpture */}
            <div className="lg:col-span-6">
              <NeuralConstellationSignature onExploreDemo={handleOpenDemo} />
            </div>
          </div>
        </div>
      </section>

      {/* GPU Kinetic Statement Ticker */}
      <KineticMarquee items={MARQUEE_PHRASES} />

      {/* Product Architecture Specs + Interactive Scrollytelling Feature Breakdown & Device Showcase */}
      <section id="capabilities" className="py-24 sm:py-28 bg-[#FFFFFF] border-b border-[#EFEFEB]">
        <div className="max-w-[1240px] mx-auto px-5 sm:px-8">
          {/* Spacious Monochrome Bento Architecture Ledger */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-20">
            {IMPACT_METRICS.map((metric) => (
              <div
                key={metric.label}
                className="rounded-[24px] border border-[#ECECE8] bg-[#FAFAF9] p-6 sm:p-8 flex flex-col justify-between min-h-[188px]"
              >
                <div className={`${typeClass.metricLg} text-[#171717]`}>
                  <AnimatedCounter
                    value={metric.value}
                    suffix={metric.suffix}
                    className="text-[#171717]"
                  />
                </div>
                <div className="mt-6">
                  <div className={`${typeClass.body} font-semibold text-[#171717]`}>
                    {metric.label}
                  </div>
                  <p className={`mt-1 ${typeClass.bodySm} text-[#686864]`}>{metric.context}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="max-w-2xl mb-14">
            <p className={`${typeClass.overline} text-[#C44D00]`}>Interactive Operating Flow</p>
            <h2 className={`mt-2.5 ${typeClass.h1} text-[#171717] text-balance`}>
              Select any stage to inspect the{' '}
              <span className="italic font-semibold text-[#858585]">live workspace</span> in motion.
            </h2>
          </div>

          {/* 2-Column Interactive Scrollytelling Feature Breakdown + Sticky Device Mockup */}
          <div
            ref={showcaseGridRef}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start"
          >
            {/* Numbered Self-Drawing Interactive Step Cards */}
            <div className="lg:col-span-5 space-y-4">
              {WORKFLOW_STEPS.map((step) => {
                const active = activeStep === step.id;
                return (
                  <button
                    key={step.id}
                    type="button"
                    onMouseEnter={() => handleSelectStage(step.id, 1200)}
                    onFocus={() => handleSelectStage(step.id, 2000)}
                    onClick={() => handleSelectStage(step.id, 3000)}
                    aria-pressed={active}
                    className={`bw-trace-card w-full text-left p-6 rounded-[20px] border transition-all cursor-pointer ${
                      active
                        ? 'bg-[#FFFFFF] border-[#FF7417]/70 shadow-[0_16px_40px_-18px_rgba(255,116,23,0.18)]'
                        : 'bg-[#FAFAF9] border-[#EFEFEB] hover:bg-[#FFFFFF]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <span
                          className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                            active
                              ? 'bg-[#FFF0E5] text-[#FF7417]'
                              : 'bg-white border border-[#ECECE8] text-[#171717] bw-tactile-pill'
                          }`}
                        >
                          <SelfDrawingSvg
                            paths={step.paths}
                            fillPath={step.fillPath}
                            active={active}
                          />
                        </span>
                        <div>
                          <div className={`${typeClass.monoMeta} text-[#858585]`}>
                            {step.num}. {step.role}
                          </div>
                          <h3 className={`${typeClass.h4} font-bold text-[#171717] mt-0.5`}>
                            {step.title}
                          </h3>
                        </div>
                      </div>

                      <span
                        className={`${typeClass.monoMeta} font-semibold ${
                          active ? 'text-[#C44D00]' : 'text-[#A8A8A2]'
                        }`}
                      >
                        {step.num}
                      </span>
                    </div>

                    <p className={`mt-3.5 ${typeClass.bodySm} text-[#5C5C58]`}>{step.summary}</p>
                    <div
                      className={`mt-4 pt-3 border-t border-[#EFEFEB] ${typeClass.bodySm} font-medium text-[#252525]`}
                    >
                      {step.outcome}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Central Floating Dual-Device Interactive Showcase */}
            <div className="lg:col-span-7 lg:sticky lg:top-24">
              <InteractiveDeviceMockup
                activeStep={activeStep}
                onSelectStep={(id) => handleSelectStage(id, 3000)}
                onOpenLiveDemo={handleOpenDemo}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Connected Department Architecture & Honest Sample Scenario Walkthrough */}
      <section id="departments" className="py-24 sm:py-28 bg-[#FAFAF9] border-b border-[#EFEFEB]">
        <div className="max-w-[1240px] mx-auto px-5 sm:px-8 space-y-14">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="max-w-2xl">
              <p className={`${typeClass.overline} text-[#C44D00]`}>
                CONNECTED DEPARTMENT ARCHITECTURE
              </p>
              <h2 className={`mt-2.5 ${typeClass.h1} text-[#171717] text-balance`}>
                Every module passes structured memory forward—so execution never drifts from
                strategy.
              </h2>
            </div>
            <button
              type="button"
              onClick={handleOpenDemo}
              className="text-sm font-semibold text-[#171717] hover:text-[#C44D00] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Inspect live Solstice sample workspace →
            </button>
          </div>

          {/* Curved Connecting Path + 5-Stage Architectural Flow Ledger */}
          <div className="relative">
            <svg
              aria-hidden="true"
              viewBox="0 0 1200 36"
              fill="none"
              className="hidden lg:block w-full h-9 mb-2"
            >
              <path
                d="M 60 28 C 260 4, 420 34, 600 18 C 780 2, 940 32, 1140 12"
                stroke="#FF7417"
                strokeOpacity="0.45"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
              {[60, 330, 600, 870, 1140].map((cx, i) => (
                <circle
                  key={cx}
                  cx={cx}
                  cy={[28, 16, 18, 22, 12][i]}
                  r={i === 0 ? 4.5 : 3}
                  fill={i === 0 ? '#FF7417' : '#FFFFFF'}
                  stroke="#FF7417"
                  strokeWidth="1.5"
                />
              ))}
            </svg>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 rounded-[24px] border border-[#ECECE8] bg-[#FFFFFF] bw-surface-raised divide-y lg:divide-y-0 lg:divide-x divide-[#F1F1EF] overflow-hidden">
              {DEPARTMENT_FLOW_CHAIN.map((item) => (
                <div key={item.num} className="p-6 flex flex-col justify-between gap-5">
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-mono-num text-[#858585]">
                      <span>STAGE {item.num}</span>
                      {item.num === '01' && (
                        <span className="text-[#FF7417] font-semibold">CORE</span>
                      )}
                    </div>
                    <h3 className="mt-2 font-heading text-base font-bold text-[#171717]">
                      {item.dept}
                    </h3>
                  </div>
                  <div className="space-y-3 text-xs pt-4 border-t border-[#F1F1EF]">
                    <div>
                      <span className="block text-[10px] uppercase tracking-wider text-[#858585]">
                        Reads
                      </span>
                      <span className="text-[#252525] leading-relaxed block mt-1">
                        {item.reads}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase tracking-wider text-[#C44D00]">
                        Outputs
                      </span>
                      <span className="text-[#5C5C58] leading-relaxed block mt-1">
                        {item.emits}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Dark Obsidian Business Brain Anchor */}
            <div className="lg:col-span-5 bw-dark-ambient-glow rounded-[24px] border border-[#262626] p-8 text-white flex flex-col justify-between min-h-[300px]">
              <div>
                <div className="w-11 h-11 rounded-full bg-white/[0.07] border border-white/[0.1] text-[#FF8A36] flex items-center justify-center mb-6">
                  <Brain className="w-5 h-5" />
                </div>
                <div className={`${typeClass.overline} text-[#9A9A94]`}>
                  CENTRAL KNOWLEDGE LAYER
                </div>
                <h3 className={`mt-2 ${typeClass.h3} font-bold text-white`}>Business Brain</h3>
                <p className={`mt-3 ${typeClass.bodySm} text-[#C8C8C2]`}>
                  Products, buyer personas, pricing guardrails, strategic decisions, and positioning
                  briefs live in one structured record—eliminating repetitive re-prompting across
                  tools.
                </p>
              </div>
              <div className="mt-7 pt-5 border-t border-white/[0.08] flex items-center justify-between text-xs">
                <span className="text-[#FF8A36] font-medium">Shared across 5 active modules</span>
                <button
                  type="button"
                  onClick={handleOpenDemo}
                  className="text-white hover:text-[#FF8A36] transition-colors cursor-pointer"
                >
                  Open Brain →
                </button>
              </div>
            </div>

            {/* Honest Sample Scenario Comparison (No Invented Quotes or Claims) */}
            <div className="lg:col-span-7 bw-trace-card rounded-[24px] border border-[#ECECE8] bg-[#FFFFFF] bw-surface-raised overflow-hidden grid grid-cols-1 sm:grid-cols-12">
              <div className="sm:col-span-7 p-8 flex flex-col justify-between">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-[#858585]">Sample · Solstice Craft Coffee</span>
                    <div className="inline-flex p-0.5 rounded-full bg-[#F1F1EF]">
                      {(['before', 'after'] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setCaseStudyMode(mode)}
                          aria-pressed={caseStudyMode === mode}
                          className={`px-3 py-1 text-[11px] font-medium rounded-full transition-colors cursor-pointer ${
                            caseStudyMode === mode
                              ? 'bg-[#FFFFFF] text-[#171717] shadow-xs'
                              : 'text-[#686864] hover:text-[#171717]'
                          }`}
                        >
                          {mode === 'before' ? 'Fragmented Stack' : 'Inside BrainWise'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {caseStudyMode === 'before' ? (
                    <>
                      <h3 className={`mt-4 ${typeClass.h4} font-bold text-[#171717]`}>
                        Disconnected tabs, unlinked market sizing, and inconsistent campaign briefs.
                      </h3>
                      <p className={`mt-3 ${typeClass.bodySm} text-[#5C5C58]`}>
                        Market estimates sat in spreadsheets, competitor pricing moved unnoticed,
                        and launch copy had to re-explain core product differentiators every time.
                      </p>
                      <div className="mt-5 grid grid-cols-2 gap-4 pt-4 border-t border-[#F1F1EF] text-xs">
                        <div>
                          <div className="text-[#858585]">Context Storage</div>
                          <div className="font-mono-num font-semibold text-[#171717] mt-1">
                            Isolated docs
                          </div>
                        </div>
                        <div>
                          <div className="text-[#858585]">Rival Signals</div>
                          <div className="font-mono-num font-semibold text-[#BC3E3E] mt-1">
                            Manual checks
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <h3 className={`mt-4 ${typeClass.h4} font-bold text-[#171717]`}>
                        One coherent chain from validation dossier to brand kit and daily sprint.
                      </h3>
                      <p className={`mt-3 ${typeClass.bodySm} text-[#5C5C58]`}>
                        Competitive pricing gaps feed straight into Brand Studio copy and turn into
                        prioritized tasks inside Growth Planner inside the same demonstration
                        workspace.
                      </p>
                      <div className="mt-5 grid grid-cols-2 gap-4 pt-4 border-t border-[#F1F1EF] text-xs">
                        <div>
                          <div className="text-[#C44D00]">Sample Artifacts</div>
                          <div className="font-mono-num font-semibold text-[#171717] mt-1">
                            2 dossiers · 6 assets
                          </div>
                        </div>
                        <div>
                          <div className="text-[#24724E]">Context Status</div>
                          <div className="font-mono-num font-semibold text-[#171717] mt-1">
                            Synced Business Brain
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <div className="mt-6 pt-4 border-t border-[#F1F1EF] flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-[#858585]">Included via Explore Live Demo</span>
                  <button
                    type="button"
                    onClick={handleOpenDemo}
                    className="font-semibold text-[#C44D00] hover:text-[#171717] cursor-pointer"
                  >
                    Launch Demo →
                  </button>
                </div>
              </div>
              <div className="sm:col-span-5 min-h-[220px] bg-[#ECECE9]">
                <ResilientMedia
                  src="/src/assets/images/journal_brand_craft_1794898437857.jpg"
                  alt="Solstice Craft Coffee matte charcoal and alabaster packaging boxes"
                  fallbackLabel="Solstice Sample Collateral"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

          {/* Minimalist Audience Scope Line (No Cliché 3-Column Card Triad) */}
          <div className="pt-6 border-t border-[#E6E6E2] grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
            {[
              {
                who: 'Aspiring Founders',
                what: 'Run structured 7-step validation and adjust TAM/SAM/SOM assumptions before committing capital.',
              },
              {
                who: 'Early-Stage Teams',
                what: 'Convert competitor review weaknesses into defensible positioning, brand kits, and testable funnels.',
              },
              {
                who: 'Operating Businesses',
                what: 'Monitor rival price and product changes and launch rapid counter-experiments inside weekly sprints.',
              },
            ].map((row) => (
              <div key={row.who} className="space-y-1">
                <div className="font-heading text-sm font-bold text-[#171717]">{row.who}</div>
                <p className="text-[#5C5C58] leading-relaxed">{row.what}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dynamic Journal & Interactive Playbook Section */}
      <JournalSection onLaunchWorkspace={handleOpenDemo} />

      {/* About BrainWise — Architecture & Philosophy */}
      <section id="about" className="py-24 sm:py-28 bg-[#FFFFFF] border-b border-[#EFEFEB]">
        <div className="max-w-[1240px] mx-auto px-5 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-5">
              <p className={`${typeClass.overline} text-[#C44D00]`}>ABOUT BRAINWISE</p>
              <h2 className={`mt-2.5 ${typeClass.h1} text-[#171717] text-balance`}>
                Strategy and execution belong in the{' '}
                <span className="italic font-semibold text-[#858585]">same memory</span>.
              </h2>
              <p className={`mt-4 ${typeClass.body} text-[#5C5C58]`}>
                Founders lose momentum switching between isolated spreadsheets, ad-hoc AI chats,
                static brand PDFs, and disconnected task trackers. BrainWise unifies intelligence,
                AI creative direction, and weekly growth execution into one calm operating system.
              </p>
            </div>
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-5">
              {[
                {
                  num: '01',
                  title: 'Shared Business Brain',
                  body: 'Every product offer, buyer persona, pricing guardrail, and strategic decision is stored once and inherited automatically by research, brand studio, and growth tasks.',
                },
                {
                  num: '02',
                  title: 'Evidence Over Invention',
                  body: 'Market dossiers explicitly distinguish verified category references from editable sizing assumptions—no fabricated customer claims or opaque black-box scores.',
                },
                {
                  num: '03',
                  title: 'AI-Native Creative Execution',
                  body: 'Logos, collateral, and multi-slide Instagram carousels are generated from natural-language creative briefs grounded directly in your locked brand identity.',
                },
                {
                  num: '04',
                  title: 'Calm Editorial Restraint',
                  body: 'Pure alabaster canvas, deep charcoal typography, and restrained orange illumination keep attention locked on the single highest-leverage decision next.',
                },
              ].map((pillar) => (
                <div
                  key={pillar.num}
                  className="rounded-[22px] border border-[#ECECE8] bg-[#FAFAF9] p-6 sm:p-7 space-y-2.5"
                >
                  <div className={`${typeClass.overline} text-[#C44D00]`}>
                    PRINCIPLE {pillar.num}
                  </div>
                  <h3 className={`${typeClass.h4} font-bold text-[#171717]`}>{pillar.title}</h3>
                  <p className={`${typeClass.bodySm} text-[#5C5C58]`}>{pillar.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Transparent Pricing Preview */}
      <section id="pricing" className="py-24 sm:py-28 bg-[#FAFAF9] border-b border-[#EFEFEB]">
        <div className="max-w-[1240px] mx-auto px-5 sm:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 max-w-5xl mx-auto">
            <div>
              <p className={`${typeClass.overline} text-[#C44D00]`}>Transparent Plans</p>
              <h2 className={`mt-2.5 ${typeClass.h1} text-[#171717]`}>
                Built for solo founders and{' '}
                <span className="italic font-semibold text-[#858585]">scaling teams</span>.
              </h2>
            </div>

            {/* Sleek Pill Pricing Billing Toggle */}
            <div className="inline-flex p-1 bg-[#EFEFEB] rounded-full self-start">
              {(['monthly', 'annual'] as const).map((cycle) => {
                const active = billingCycle === cycle;
                return (
                  <button
                    key={cycle}
                    type="button"
                    onClick={() => setBillingCycle(cycle)}
                    className={`px-4 py-1.5 text-xs font-medium rounded-full capitalize transition-colors whitespace-nowrap cursor-pointer ${
                      active
                        ? 'bg-[#FFFFFF] text-[#171717] shadow-xs'
                        : 'text-[#686864] hover:text-[#171717]'
                    }`}
                  >
                    {cycle === 'annual' ? 'Annual (Save 20%)' : 'Monthly'}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                name: 'Starter',
                audience: 'For solo founders & early idea validation',
                monthly: 2763,
                annual: 2210,
                featured: false,
                features: [
                  '800 credits refreshed monthly',
                  '1 Business Brain workspace',
                  '10 Idea Intelligence dossiers / mo',
                  '5 tracked competitors in Market Watch',
                  '50 Brand Studio assets & SVG collateral',
                  '3 active external platform integrations',
                ],
              },
              {
                name: 'Professional',
                audience: 'Hero tier for scaling brands & product teams',
                monthly: 6999,
                annual: 5599,
                featured: true,
                features: [
                  '3,000 credits refreshed monthly',
                  '3 Business Brain workspaces (5 team seats)',
                  'Unlimited Idea & Market Intelligence',
                  '20 tracked competitors & teardowns',
                  '250 Brand Studio assets & carousels',
                  'All 9 external integrations & automations',
                  'Priority Gemini 2.5 Flash / Pro reasoning',
                  'White-label executive PDF exports & daily briefs',
                ],
              },
              {
                name: 'Business Enterprise',
                audience: 'For multi-brand operators & high-velocity teams',
                monthly: 16499,
                annual: 13199,
                featured: false,
                features: [
                  '10,000 credits refreshed monthly',
                  '10 Business Brain workspaces (20 team seats)',
                  'Unlimited dossiers & market scans',
                  '100 actively tracked competitors',
                  '1,000 Brand Studio assets & marketing collateral',
                  'Unlimited automations & custom triggers',
                  'Dedicated priority model throughput & VIP support',
                ],
              },
            ].map((plan) => {
              const price = billingCycle === 'annual' ? plan.annual : plan.monthly;
              return (
                <motion.div
                  key={plan.name}
                  whileHover={reduced ? undefined : { y: -3 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  className={`rounded-[24px] p-7 border flex flex-col justify-between ${
                    plan.featured
                      ? 'bg-[#171717] text-white border-[#262626] bw-dark-ambient-glow'
                      : 'bg-[#FFFFFF] text-[#242424] border-[#ECECE8] bw-surface-raised'
                  }`}
                >
                  <div>
                    <div
                      className={`text-xs font-medium ${
                        plan.featured ? 'text-[#FF8A36]' : 'text-[#C44D00]'
                      }`}
                    >
                      {plan.audience}
                    </div>
                    <h3 className={`mt-1.5 ${typeClass.h4} font-bold`}>{plan.name}</h3>
                    <div className="mt-5 flex items-baseline gap-1">
                      <span className={`${typeClass.displaySm} tabular-nums`}>
                        ₹{price.toLocaleString()}
                      </span>
                      <span
                        className={`${typeClass.monoMeta} ${
                          plan.featured ? 'text-[#A8A8A2]' : 'text-[#858585]'
                        }`}
                      >
                        / month
                      </span>
                    </div>
                    <ul className="mt-7 space-y-3 text-sm">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2.5">
                          <Check
                            className={`w-4 h-4 shrink-0 mt-0.5 ${
                              plan.featured ? 'text-[#FF8A36]' : 'text-[#FF7417]'
                            }`}
                          />
                          <span className={plan.featured ? 'text-[#E5E5E0]' : 'text-[#242424]'}>
                            {f}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('signup')}
                    className={`mt-8 w-full py-2.5 text-sm font-semibold rounded-full transition-colors cursor-pointer ${
                      plan.featured
                        ? 'bg-[#FF7417] hover:bg-[#E55F08] text-white shadow-[0_6px_20px_-6px_rgba(255,116,23,0.42)]'
                        : 'bg-[#FAFAF9] hover:bg-[#F1F1EF] text-[#171717] border border-[#E8E8E4]'
                    }`}
                  >
                    Start 14-day Trial
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Editorial 2-Column Split FAQ */}
      <section id="faq" className="py-24 sm:py-28 border-b border-[#EFEFEB] bg-[#FFFFFF]">
        <div className="max-w-[1240px] mx-auto px-5 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
            <div className="lg:col-span-4 space-y-3">
              <h2 className={`${typeClass.h1} text-[#171717]`}>
                Frequently <span className="text-[#858585] font-semibold">asked</span>
                <br />
                questions
              </h2>
              <p className={`${typeClass.bodySm} text-[#5C5C58] max-w-xs`}>
                Clear answers about the shared Business Brain, evidence standards, and exploring the
                workspace.
              </p>
            </div>

            <div className="lg:col-span-8 space-y-3">
              {FAQS.map((item, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div
                    key={item.q}
                    className={`rounded-[20px] border transition-colors ${
                      isOpen
                        ? 'border-[#ECECE8] bg-[#FFFFFF] bw-surface-raised'
                        : 'border-[#F1F1EF] bg-[#FAFAF9] hover:bg-[#FFFFFF]'
                    }`}
                  >
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className={`w-full px-6 py-5 flex items-center gap-4 text-left ${typeClass.body} font-semibold text-[#171717] cursor-pointer`}
                    >
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                          isOpen
                            ? 'bg-[#FFF0E5] text-[#FF7417]'
                            : 'bg-[#FFFFFF] border border-[#ECECE8] text-[#858585]'
                        }`}
                      >
                        {isOpen ? (
                          <Minus className="w-3.5 h-3.5" />
                        ) : (
                          <Plus className="w-3.5 h-3.5" />
                        )}
                      </span>
                      <span className="flex-1">{item.q}</span>
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={reduced ? false : { opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={reduced ? undefined : { opacity: 0, height: 0 }}
                          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                          className="overflow-hidden"
                        >
                          <p className={`px-6 pb-6 pl-16 ${typeClass.bodySm} text-[#5C5C58]`}>
                            {item.a}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Quiet Footer */}
      <footer className="py-12 bg-[#FFFFFF]">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <BrandLogoMark size={24} />
            <span className="font-heading text-sm font-bold text-[#242424]">BrainWise</span>
            <span className="text-xs text-[#686864]">
              · AI Business Intelligence &amp; Growth Partner
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-xs text-[#686864]">
            <a href="#about" className="hover:text-[#242424]">
              About
            </a>
            <a href="#pricing" className="hover:text-[#242424]">
              Pricing
            </a>
            <a href="#faq" className="hover:text-[#242424]">
              FAQ
            </a>
            <button
              type="button"
              onClick={() => navigate('login')}
              className="hover:text-[#242424] cursor-pointer"
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => navigate('signup')}
              className="hover:text-[#242424] cursor-pointer"
            >
              Create account
            </button>
            <button
              type="button"
              onClick={handleOpenDemo}
              className="hover:text-[#242424] cursor-pointer"
            >
              Interactive Demo
            </button>
            <span>© 2026 BrainWise</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
