import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  Brain,
  Check,
  CheckCircle2,
  Circle,
  Compass,
  Lightbulb,
  Palette,
  Rocket,
  Sparkles,
  Swords,
} from 'lucide-react';
import type { BrainWiseState, AppRoute as NavPageId } from '../../types/brainwise';
import { calculateBrainCompleteness } from '../../utils/logic';

interface StageChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

interface JourneyStage {
  id: 'brain' | 'idea' | 'competitive' | 'brand' | 'growth';
  number: number;
  title: string;
  shortTitle: string;
  summary: string;
  pageId: NavPageId;
  ctaLabel: string;
  icon: React.FC<{ className?: string }>;
  checklist: StageChecklistItem[];
  isCompleted: boolean;
  progressPct: number;
  // Coordinates inside viewBox="0 0 1000 180"
  x: number;
  y: number;
  labelPlacement: 'top' | 'bottom';
}

interface FounderJourneyFlowBarProps {
  state: BrainWiseState;
  onNavigate: (page: NavPageId) => void;
}

// Smooth cubic Bezier spline passing through:
// (100, 118) -> (300, 58) -> (500, 120) -> (700, 58) -> (900, 108)
const WAVE_PATH =
  'M 40 96 C 68 112, 82 118, 100 118 C 175 118, 225 58, 300 58 C 375 58, 425 120, 500 120 C 575 120, 625 58, 700 58 C 775 58, 830 108, 900 108 C 930 108, 952 98, 968 90';

// Approximate cumulative path length ratios at each of the 5 nodes
const NODE_PATH_RATIOS = [0.08, 0.30, 0.52, 0.74, 0.94];

export const FounderJourneyFlowBar: React.FC<FounderJourneyFlowBarProps> = ({
  state,
  onNavigate,
}) => {
  const brainComp = useMemo(() => calculateBrainCompleteness(state.brain), [state.brain]);

  const stages: JourneyStage[] = useMemo(() => {
    const hasBrainCore = Boolean(
      state.brain?.businessName &&
        state.brain.businessName !== 'My Venture' &&
        state.brain?.targetAudience
    );
    const hasFlagshipProduct = (state.brain?.products?.length || 0) > 0;
    const brainEnough = brainComp.percentage >= 60;

    const hasReport = (state.reports?.length || 0) > 0;
    const hasReportInsights = Boolean(
      state.reports?.[0]?.ideaSummary || (state.reports?.[0] as any)?.opportunities?.length
    );

    const hasCompetitors = (state.competitors?.length || 0) >= 2;
    const hasMoat = Boolean(
      state.competitiveStrategy?.whereToDifferentiate ||
        (state.competitiveStrategy as any)?.defensibleMoat
    );

    const hasBrandIdentity = Boolean(
      state.brand?.brandName &&
        state.brand.brandName !== 'My Venture' &&
        state.brand?.tagline
    );
    const hasLogoConcepts = (state.brand?.concepts?.length || 0) > 0;
    const hasAssets = (state.assets?.length || 0) > 0;

    const hasGrowthTasks = (state.tasks?.length || 0) >= 3;
    const hasExperiment = (state.experiments?.length || 0) > 0;
    const hasCompletedTask = (state.tasks || []).some((t) => t.status === 'completed');

    const rawStages: Omit<JourneyStage, 'isCompleted' | 'progressPct'>[] = [
      {
        id: 'brain',
        number: 1,
        title: 'Business Brain',
        shortTitle: 'Business Brain',
        summary: 'Anchor your business model, target audience, and flagship offer as ground truth.',
        pageId: 'business-brain',
        ctaLabel: 'Open Business Brain',
        icon: Brain,
        x: 100,
        y: 118,
        labelPlacement: 'top',
        checklist: [
          { id: 'b1', label: 'Set business name & target audience', done: hasBrainCore },
          { id: 'b2', label: 'Add at least 1 product or service', done: hasFlagshipProduct },
          { id: 'b3', label: 'Reach 60%+ Brain completeness', done: brainEnough },
        ],
      },
      {
        id: 'idea',
        number: 2,
        title: 'Idea Validation',
        shortTitle: 'Idea Validation',
        summary: 'Validate demand, unit economics, and market openings with Idea Intelligence.',
        pageId: 'idea-intelligence',
        ctaLabel: 'Open Idea Intelligence',
        icon: Lightbulb,
        x: 300,
        y: 58,
        labelPlacement: 'bottom',
        checklist: [
          { id: 'i1', label: 'Generate an Idea Intelligence thesis', done: hasReport },
          {
            id: 'i2',
            label: 'Review market sizing & core opportunities',
            done: hasReportInsights,
          },
        ],
      },
      {
        id: 'competitive',
        number: 3,
        title: 'Competitive Edge',
        shortTitle: 'Competitive Edge',
        summary: 'Map competitor weaknesses and lock your defensible differentiation moat.',
        pageId: 'competitive-intelligence',
        ctaLabel: 'Open Competitive Intel',
        icon: Swords,
        x: 500,
        y: 120,
        labelPlacement: 'top',
        checklist: [
          { id: 'c1', label: 'Analyze at least 2 competitors', done: hasCompetitors },
          { id: 'c2', label: 'Define your differentiation & moat', done: hasMoat },
        ],
      },
      {
        id: 'brand',
        number: 4,
        title: 'Brand & Assets',
        shortTitle: 'Brand & Assets',
        summary: 'Finalize your identity, generate AI vector logos, and build launch creatives.',
        pageId: 'brand-studio',
        ctaLabel: 'Open Brand Studio',
        icon: Palette,
        x: 700,
        y: 58,
        labelPlacement: 'bottom',
        checklist: [
          { id: 'br1', label: 'Shape brand identity, voice & palette', done: hasBrandIdentity },
          { id: 'br2', label: 'Generate AI logo concepts', done: hasLogoConcepts },
          { id: 'br3', label: 'Save at least 1 brand or social asset', done: hasAssets },
        ],
      },
      {
        id: 'growth',
        number: 5,
        title: 'Launch & Growth',
        shortTitle: 'Launch & Growth',
        summary: 'Execute your 30-day launch sprint, run experiments, and track real traction.',
        pageId: 'growth-director',
        ctaLabel: 'Open Growth Planner',
        icon: Rocket,
        x: 900,
        y: 108,
        labelPlacement: 'top',
        checklist: [
          { id: 'g1', label: 'Create a 30-day launch plan (3+ tasks)', done: hasGrowthTasks },
          { id: 'g2', label: 'Launch at least 1 growth experiment', done: hasExperiment },
          { id: 'g3', label: 'Complete your first sprint task', done: hasCompletedTask },
        ],
      },
    ];

    return rawStages.map((st) => {
      const doneCount = st.checklist.filter((c) => c.done).length;
      const total = st.checklist.length;
      const progressPct = Math.round((doneCount / total) * 100);
      return {
        ...st,
        isCompleted: doneCount === total,
        progressPct,
      };
    });
  }, [
    state.brain,
    state.reports,
    state.competitors,
    state.competitiveStrategy,
    state.brand,
    state.assets,
    state.tasks,
    state.experiments,
    brainComp.percentage,
  ]);

  const currentStageIndex = useMemo(() => {
    const firstIncomplete = stages.findIndex((s) => !s.isCompleted);
    return firstIncomplete === -1 ? stages.length - 1 : firstIncomplete;
  }, [stages]);

  const currentStage = stages[currentStageIndex];
  const [selectedStageId, setSelectedStageId] = useState<JourneyStage['id']>(currentStage.id);

  // Keep selected stage synced if currentStage advances automatically
  useEffect(() => {
    setSelectedStageId(currentStage.id);
  }, [currentStage.id]);

  const activeStage = stages.find((s) => s.id === selectedStageId) ?? currentStage;
  const activeStageIndex = stages.findIndex((s) => s.id === activeStage.id);

  const completedStagesCount = stages.filter((s) => s.isCompleted).length;
  const overallProgressPct = Math.round(
    (stages.reduce((acc, s) => acc + s.progressPct, 0) / (stages.length * 100)) * 100
  );

  // Path progress stops right at the current active stage node
  const pathProgressRatio =
    completedStagesCount === stages.length ? 1 : NODE_PATH_RATIOS[currentStageIndex] ?? 0.1;

  return (
    <section
      aria-label="Founder Journey Flow Bar"
      className="rounded-[20px] border border-[#E6E6E2] bg-[#FFFFFF] p-5 sm:p-7 shadow-[0_2px_16px_-4px_rgba(23,23,23,0.05)] overflow-hidden"
    >
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#F0F0EC]">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FFF0E5] text-[#C44D00] text-[11px] font-mono-num font-semibold uppercase tracking-wide">
              <Compass className="w-3 h-3" />
              Founder Flow · Stage 0{currentStage.number} of 0{stages.length}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FAFAF9] border border-[#E6E6E2] text-[11px] font-mono-num font-medium text-[#5C5C58]">
              {overallProgressPct}% Journey Complete
            </span>
          </div>
          <h2 className="font-heading text-lg sm:text-xl font-bold text-[#171717] tracking-tight">
            {completedStagesCount === stages.length
              ? 'All 5 Founder Stages Unlocked — Keep Scaling'
              : `Currently at Stage ${currentStage.number}: ${currentStage.title}`}
          </h2>
        </div>

        <button
          type="button"
          onClick={() => onNavigate(currentStage.pageId)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-[#FF7417] hover:bg-[#E5620A] text-white text-xs font-semibold shadow-[0_6px_18px_-4px_rgba(255,116,23,0.45)] transition-all cursor-pointer shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>
            {completedStagesCount === stages.length
              ? 'Open Growth Planner'
              : `Complete Stage ${currentStage.number}`}
          </span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* DESKTOP / TABLET: Animated Flowing Curved Spline Process Bar (Inspired by Reference) */}
      <div className="hidden md:block relative pt-6 pb-4">
        <div className="relative w-full h-[220px]">
          {/* Flowing Wave SVG */}
          <svg
            viewBox="0 0 1000 180"
            preserveAspectRatio="none"
            className="w-full h-full overflow-visible"
            aria-hidden="true"
          >
            <defs>
              <filter id="bw-wave-glow" x="-10%" y="-20%" width="120%" height="150%">
                <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#FF7417" floodOpacity="0.22" />
              </filter>
              <linearGradient id="bw-wave-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#FF8A36" />
                <stop offset="100%" stopColor="#FF7417" />
              </linearGradient>
            </defs>

            {/* Muted Upcoming Track */}
            <path
              d={WAVE_PATH}
              fill="none"
              stroke="#E6E6E2"
              strokeWidth="3.5"
              strokeLinecap="round"
            />

            {/* Animated Progress Curve */}
            <motion.path
              d={WAVE_PATH}
              fill="none"
              stroke="url(#bw-wave-grad)"
              strokeWidth="4"
              strokeLinecap="round"
              filter="url(#bw-wave-glow)"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: pathProgressRatio }}
              transition={{ duration: 1.15, ease: [0.22, 1, 0.36, 1] }}
            />
          </svg>

          {/* Interactive Floating Milestone Nodes + Labels + Watermark Numbers */}
          {stages.map((stage, idx) => {
            const Icon = stage.icon;
            const isCurrent = idx === currentStageIndex && !stage.isCompleted;
            const isSelected = stage.id === activeStage.id;
            const leftPct = `${(stage.x / 1000) * 100}%`;
            const topPct = `${(stage.y / 180) * 100}%`;

            return (
              <div
                key={stage.id}
                style={{ left: leftPct, top: topPct }}
                className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
              >
                {/* Watermark Stage Number */}
                <span
                  aria-hidden="true"
                  className={`pointer-events-none select-none absolute left-1/2 -translate-x-1/2 font-heading text-[52px] font-extrabold leading-none transition-colors ${
                    isSelected ? 'text-[#FFE8D6]' : 'text-[#F2F2EE]'
                  } ${stage.labelPlacement === 'top' ? '-top-[74px]' : 'top-[32px]'}`}
                >
                  {stage.number}
                </span>

                {/* Current Stage Floating Pill */}
                {isCurrent && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`absolute left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded-full bg-[#171717] text-white text-[9px] font-mono-num uppercase tracking-wider shadow-sm ${
                      stage.labelPlacement === 'top' ? 'top-[34px]' : '-top-[36px]'
                    }`}
                  >
                    You are here
                  </motion.div>
                )}

                {/* Pulsing Halo on Current Stage */}
                {isCurrent && (
                  <span className="absolute inset-0 -m-1.5 rounded-[16px] bg-[#FF7417]/25 animate-ping pointer-events-none" />
                )}

                {/* Elevated Milestone Node Button */}
                <motion.button
                  type="button"
                  onClick={() => setSelectedStageId(stage.id)}
                  whileHover={{ scale: 1.09, y: -2 }}
                  whileTap={{ scale: 0.96 }}
                  aria-label={`Stage ${stage.number}: ${stage.title}`}
                  aria-pressed={isSelected}
                  className={`relative w-12 h-12 rounded-[14px] flex items-center justify-center border transition-all cursor-pointer shadow-[0_8px_20px_-6px_rgba(23,23,23,0.16)] ${
                    stage.isCompleted
                      ? 'bg-[#FFF5EE] border-[#FF7417] text-[#C44D00]'
                      : isCurrent
                        ? 'bg-[#FF7417] border-[#FF7417] text-white'
                        : isSelected
                          ? 'bg-[#FFFFFF] border-[#171717] text-[#171717]'
                          : 'bg-[#FFFFFF] border-[#E6E6E2] text-[#71717A] hover:border-[#252525]'
                  } ${isSelected ? 'ring-4 ring-[#FF7417]/15' : ''}`}
                >
                  {stage.isCompleted ? (
                    <Check className="w-5 h-5 stroke-[2.5]" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </motion.button>

                {/* Stage Title + Micro-status */}
                <button
                  type="button"
                  onClick={() => setSelectedStageId(stage.id)}
                  className={`absolute left-1/2 -translate-x-1/2 w-[150px] text-center cursor-pointer group ${
                    stage.labelPlacement === 'top' ? '-top-[62px]' : 'top-[38px]'
                  }`}
                >
                  <div
                    className={`text-xs font-semibold leading-tight transition-colors ${
                      isSelected
                        ? 'text-[#171717]'
                        : 'text-[#5C5C58] group-hover:text-[#171717]'
                    }`}
                  >
                    {stage.shortTitle}
                  </div>
                  <div className="text-[10px] font-mono-num text-[#858585] mt-0.5">
                    {stage.isCompleted ? 'Completed' : `${stage.progressPct}% done`}
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* MOBILE: Compact Interactive Stepper Pills */}
      <div className="grid grid-cols-5 gap-1.5 py-4 md:hidden">
        {stages.map((stage, idx) => {
          const isCurrent = idx === currentStageIndex && !stage.isCompleted;
          const isSelected = stage.id === activeStage.id;
          return (
            <button
              key={stage.id}
              type="button"
              onClick={() => setSelectedStageId(stage.id)}
              className={`p-2 rounded-[10px] border text-center transition-all cursor-pointer ${
                isSelected
                  ? 'border-[#FF7417] bg-[#FFF0E5]/70 text-[#171717]'
                  : stage.isCompleted
                    ? 'border-[#CDE5D7] bg-[#EAF5EF]/60 text-[#24724E]'
                    : 'border-[#E6E6E2] bg-[#FAFAF9] text-[#5C5C58]'
              }`}
            >
              <div className="text-[10px] font-mono-num font-bold">
                {stage.isCompleted ? '✓' : isCurrent ? `● ${stage.number}` : `0${stage.number}`}
              </div>
              <div className="text-[10px] font-medium truncate mt-0.5">{stage.shortTitle}</div>
            </button>
          );
        })}
      </div>

      {/* INTERACTIVE STAGE INSPECTOR: What You Need to Do to Complete Selected Stage */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeStage.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.22 }}
          className="mt-2 rounded-[14px] border border-[#E6E6E2] bg-[#FAFAF9] p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 items-center"
        >
          <div className="lg:col-span-5 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-mono-num font-semibold text-[#C44D00] uppercase">
                Stage 0{activeStage.number} Details
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  activeStage.isCompleted
                    ? 'bg-[#EAF5EF] text-[#24724E]'
                    : activeStageIndex === currentStageIndex
                      ? 'bg-[#FFF0E5] text-[#C44D00]'
                      : 'bg-[#FFFFFF] text-[#5C5C58] border border-[#E6E6E2]'
                }`}
              >
                {activeStage.isCompleted
                  ? 'Completed'
                  : activeStageIndex === currentStageIndex
                    ? 'Current Focus'
                    : 'Upcoming Stage'}
              </span>
            </div>
            <h3 className="font-heading text-base font-bold text-[#171717]">
              {activeStage.title}
            </h3>
            <p className="text-xs text-[#5C5C58] leading-relaxed">{activeStage.summary}</p>
            <div className="pt-1 flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-[#E6E6E2] overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-[#FF7417]"
                  initial={{ width: 0 }}
                  animate={{ width: `${activeStage.progressPct}%` }}
                  transition={{ duration: 0.45, ease: 'easeOut' }}
                />
              </div>
              <span className="text-[11px] font-mono-num font-semibold text-[#252525]">
                {activeStage.progressPct}%
              </span>
            </div>
          </div>

          <div className="lg:col-span-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t lg:border-t-0 lg:border-l border-[#E6E6E2] pt-4 lg:pt-0 lg:pl-5">
            <div className="space-y-2 flex-1">
              <div className="text-[11px] font-semibold text-[#242424] uppercase tracking-wide">
                What you need to do to complete this stage
              </div>
              <ul className="space-y-1.5">
                {activeStage.checklist.map((item) => (
                  <li key={item.id} className="flex items-center gap-2 text-xs">
                    {item.done ? (
                      <CheckCircle2 className="w-4 h-4 text-[#24724E] shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-[#FF7417] shrink-0" />
                    )}
                    <span className={item.done ? 'text-[#5C5C58] line-through' : 'text-[#171717] font-medium'}>
                      {item.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              type="button"
              onClick={() => onNavigate(activeStage.pageId)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-[10px] bg-[#171717] hover:bg-[#2E2E2E] text-white text-xs font-semibold transition-colors cursor-pointer shrink-0"
            >
              <span>{activeStage.ctaLabel}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </section>
  );
};

interface FreshWorkspaceLaunchpadProps {
  businessName?: string;
  onValidateIdea: () => void;
  onOpenBrain: () => void;
}

export const FreshWorkspaceLaunchpad: React.FC<FreshWorkspaceLaunchpadProps> = ({
  businessName,
  onValidateIdea,
  onOpenBrain,
}) => {
  const displayTitle =
    businessName && businessName !== 'My Venture' ? businessName : 'your venture';

  return (
    <motion.section
      aria-label="Start Your Founder Journey"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-[24px] border border-[#E6E6E2] bg-[#FFFFFF] p-7 sm:p-12 text-center shadow-[0_6px_30px_-10px_rgba(23,23,23,0.06)] relative overflow-hidden"
    >
      {/* Subtle centric radial glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 w-[520px] h-[220px] bg-gradient-to-b from-[#FFF0E5]/70 to-transparent rounded-full blur-2xl"
      />

      <div className="relative z-10 max-w-2xl mx-auto space-y-6">
        {/* Minimalistic Animated Graphical SVG Representation */}
        <div className="mx-auto w-full max-w-[380px] h-[110px] flex items-center justify-center">
          <svg viewBox="0 0 380 110" className="w-full h-full overflow-visible" aria-hidden="true">
            <defs>
              <linearGradient id="bw-fresh-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#FF7417" />
                <stop offset="100%" stopColor="#FFB07A" />
              </linearGradient>
            </defs>
            {/* Dashed architectural orbit */}
            <path
              d="M 45 72 Q 190 12 335 72"
              fill="none"
              stroke="#E6E6E2"
              strokeWidth="2.5"
              strokeDasharray="5 5"
            />
            <motion.path
              d="M 45 72 Q 190 12 335 72"
              fill="none"
              stroke="url(#bw-fresh-grad)"
              strokeWidth="3"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
            />
            {/* Node 1: Idea (Active Pulse) */}
            <g transform="translate(45, 72)">
              <circle r="20" fill="#FFF0E5" />
              <circle r="13" fill="#FF7417" />
              <circle r="4" fill="#FFFFFF" />
            </g>
            {/* Node 2: Market */}
            <g transform="translate(142, 40)">
              <rect x="-13" y="-13" width="26" height="26" rx="8" fill="#FFFFFF" stroke="#E6E6E2" strokeWidth="1.8" />
              <circle r="4" fill="#171717" />
            </g>
            {/* Node 3: Brand */}
            <g transform="translate(238, 40)">
              <rect x="-13" y="-13" width="26" height="26" rx="8" fill="#FFFFFF" stroke="#E6E6E2" strokeWidth="1.8" />
              <circle r="4" fill="#71717A" />
            </g>
            {/* Node 4: Launch */}
            <g transform="translate(335, 72)">
              <rect x="-13" y="-13" width="26" height="26" rx="8" fill="#FFFFFF" stroke="#E6E6E2" strokeWidth="1.8" />
              <circle r="4" fill="#A1A1AA" />
            </g>
          </svg>
        </div>

        <div className="space-y-2.5">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF0E5] text-[#C44D00] text-[11px] font-mono-num font-semibold uppercase tracking-wide">
            <Sparkles className="w-3.5 h-3.5" />
            Workspace Ready · Start Here
          </span>
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-[#171717] tracking-tight">
            Validate your idea to launch {displayTitle}
          </h2>
          <p className="text-sm text-[#5C5C58] max-w-lg mx-auto leading-relaxed">
            You haven&apos;t generated any market intelligence or assets yet. Start by validating
            your core idea — BrainWise will map competitors, shape your brand, and build your
            30-day launch plan.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          <button
            type="button"
            onClick={onValidateIdea}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#FF7417] hover:bg-[#E5620A] text-white text-sm font-semibold shadow-[0_10px_24px_-6px_rgba(255,116,23,0.5)] transition-all cursor-pointer"
          >
            <Lightbulb className="w-4 h-4" />
            <span>Validate Your Idea</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onOpenBrain}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[#FAFAF9] hover:bg-[#F0F0EC] border border-[#E6E6E2] text-[#171717] text-sm font-medium transition-colors cursor-pointer"
          >
            <Brain className="w-4 h-4 text-[#5C5C58]" />
            <span>Set Up Business Brain</span>
          </button>
        </div>
      </div>
    </motion.section>
  );
};
