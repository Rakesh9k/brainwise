import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertTriangle,
  ArrowRight,
  Brain,
  CheckCircle2,
  DollarSign,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import type { ResearchReport } from '../../types/brainwise';
import { typeClass } from '../../theme/typography';
import { StatusBadge } from '../ui/DesignSystem';
import { TactilePillButton } from '../animation';

interface ValidationVerdictScorecardProps {
  report: ResearchReport;
  onCommitToBrain: () => void;
  onPromoteKillSwitches?: () => void;
  isCommitted?: boolean;
  isDormantBrain?: boolean;
}

type PillarKey = 'good' | 'bad' | 'angle' | 'catch' | 'pay';

interface VerdictPillar {
  key: PillarKey;
  num: string;
  label: string;
  shortLabel: string;
  color: string;
  bgTint: string;
  borderTint: string;
  icon: React.FC<{ className?: string }>;
  content: string;
  subline: string;
}

export const ValidationVerdictScorecard: React.FC<ValidationVerdictScorecardProps> = ({
  report,
  onCommitToBrain,
  onPromoteKillSwitches,
  isCommitted = false,
  isDormantBrain = false,
}) => {
  const scorecard = report.validationScorecard || {
    viabilityScore: report.depth === 'Deep Market Dossier' ? 78 : 72,
    verdictLabel:
      report.viabilitySignal === 'Strong Fit'
        ? 'Strong Fit — launch with tasting flight wedge'
        : 'Promising — build only after the first critical test passes',
    summaryContext: report.ideaSummary,
    goodNews: report.marketDemand.summary,
    badNews:
      report.risksAndChallenges[0]?.risk || 'Category saturation from established incumbents.',
    strategicWedge:
      report.marketOpportunities[0] ||
      'Lead with a transparent, low-friction starter wedge that bypasses incumbent strength.',
    theCatch:
      report.risksAndChallenges[0]?.mitigation ||
      'High churn liability if delivery quality lags or onboarding friction exceeds 2 minutes.',
    willingnessToPay: {
      viable: true,
      estimatedPriceRange: report.pricingAnalysis.tiers[0]?.range || '$19 – $49/mo',
      targetBuyer: report.targetMarket,
      paymentModel: 'Self-serve / Credit-backed monthly',
    },
    bottomLine:
      report.finalRecommendation.verdict ||
      'This business competes against generic incumbents. It succeeds by winning customer trust with transparent pricing and disciplined unit economics.',
  };

  const score = scorecard.viabilityScore;
  const scoreColor = score >= 75 ? '#1E6543' : score >= 60 ? '#FF7417' : '#BC3E3E';
  const verdictTone =
    score >= 75 ? 'emerald' : score >= 60 ? 'amber' : 'red';

  const pillars: VerdictPillar[] = [
    {
      key: 'good',
      num: '01',
      label: 'Good News (Tailwinds)',
      shortLabel: 'Good News',
      color: '#1E6543',
      bgTint: 'bg-[#ECF7F1]',
      borderTint: 'border-[#CDE5D7]',
      icon: CheckCircle2,
      content: scorecard.goodNews,
      subline: 'Demand & launch velocity indicator',
    },
    {
      key: 'angle',
      num: '02',
      label: 'Your Strategic Angle',
      shortLabel: 'Your Angle',
      color: '#FF7417',
      bgTint: 'bg-[#FFF3EB]',
      borderTint: 'border-[#FED7AA]',
      icon: Target,
      content: scorecard.strategicWedge,
      subline: 'Differentiation wedge against incumbents',
    },
    {
      key: 'bad',
      num: '03',
      label: 'Bad News (Headwinds)',
      shortLabel: 'Bad News',
      color: '#BC3E3E',
      bgTint: 'bg-[#FDF2F2]',
      borderTint: 'border-[#FECACA]',
      icon: AlertTriangle,
      content: scorecard.badNews,
      subline: 'Market friction & incumbent pressure',
    },
    {
      key: 'catch',
      num: '04',
      label: 'The Catch (Critical Risk)',
      shortLabel: 'The Catch',
      color: '#C44D00',
      bgTint: 'bg-[#FFF8F3]',
      borderTint: 'border-[#FDE2CE]',
      icon: ShieldAlert,
      content: scorecard.theCatch,
      subline: 'Primary failure mode to test first',
    },
    {
      key: 'pay',
      num: '05',
      label: 'Will Anyone Pay?',
      shortLabel: 'Monetization',
      color: '#2563EB',
      bgTint: 'bg-[#EFF6FF]',
      borderTint: 'border-[#BFDBFE]',
      icon: DollarSign,
      content: `${scorecard.willingnessToPay.estimatedPriceRange} · ${scorecard.willingnessToPay.paymentModel}`,
      subline: `Target: ${scorecard.willingnessToPay.targetBuyer}`,
    },
  ];

  const [activeKey, setActiveKey] = useState<PillarKey>('angle');
  const activePillar = pillars.find((p) => p.key === activeKey) || pillars[0];
  const ActiveIcon = activePillar.icon;

  // Radial gauge circumference for r=64 -> ~402
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const scoreOffset = circumference - (Math.min(100, Math.max(0, score)) / 100) * circumference;

  // Orbital coordinates for 5 nodes along an arc on the right side of the ring (viewBox 0 0 380 260)
  const orbitalPositions = [
    { x: 228, y: 26 },
    { x: 274, y: 74 },
    { x: 292, y: 130 },
    { x: 274, y: 186 },
    { x: 228, y: 234 },
  ];

  return (
    <div className="rounded-[20px] border border-[#E6E6E2] bg-[#FFFFFF] p-5 sm:p-8 shadow-[0_4px_20px_-6px_rgba(23,23,23,0.05)] space-y-6 overflow-hidden">
      {/* Header Badge & Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#EFEFEB]">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-[#171717] text-white">
              01 of 07 · VERDICT
            </span>
            <StatusBadge status={report.viabilitySignal} tone={verdictTone} />
          </div>
          <h2 className={`${typeClass.h3} font-bold text-[#171717]`}>
            Validation Summary &amp; Decision
          </h2>
          <p className={`${typeClass.bodySm} text-[#686864] max-w-2xl`}>
            Click any orbital node around your viability score to inspect demand, wedge, risks, and willingness to pay.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <TactilePillButton
            onClick={onCommitToBrain}
            disabled={isCommitted}
            variant={isCommitted ? 'secondary' : 'primary'}
            size="md"
            icon={Brain}
          >
            <span>
              {isCommitted
                ? isDormantBrain
                  ? 'Business Brain Hatched ✓'
                  : 'Saved to Business Brain'
                : isDormantBrain
                  ? 'Graduate Idea & Hatch Brain'
                  : 'Commit to Business Brain'}
            </span>
          </TactilePillButton>
        </div>
      </div>

      {/* ORBITAL VERDICT HUB: Left Radial Gauge + Orbital Arc | Right Interactive Spotlight */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* LEFT: Animated Radial Gauge + Orbital Nodes */}
        <div className="lg:col-span-6 rounded-[18px] border border-[#ECECE8] bg-[#FAFAF9] p-4 sm:p-6 relative">
          <div className="relative w-full max-w-[400px] mx-auto h-[260px]">
            <svg viewBox="0 0 380 260" className="w-full h-full overflow-visible" aria-hidden="true">
              {/* Outer orbital guide arc */}
              <path
                d="M 190 16 A 114 114 0 0 1 190 244"
                fill="none"
                stroke="#E6E6E2"
                strokeWidth="2"
                strokeDasharray="4 4"
              />
              {/* Animated connector arc */}
              <motion.path
                d="M 190 16 A 114 114 0 0 1 190 244"
                fill="none"
                stroke="#FF7417"
                strokeOpacity="0.35"
                strokeWidth="2.5"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
              />

              {/* Radial lines from score center (112, 130) to active orbital node */}
              {orbitalPositions.map((pos, idx) => {
                const isSel = pillars[idx].key === activeKey;
                return (
                  <line
                    key={pillars[idx].key}
                    x1="112"
                    y1="130"
                    x2={pos.x}
                    y2={pos.y}
                    stroke={isSel ? pillars[idx].color : '#E6E6E2'}
                    strokeWidth={isSel ? 2 : 1}
                    strokeDasharray={isSel ? undefined : '3 3'}
                    opacity={isSel ? 0.65 : 0.45}
                  />
                );
              })}

              {/* Center Score Ring Track */}
              <circle
                cx="112"
                cy="130"
                r={radius}
                fill="#FFFFFF"
                stroke="#EFEFEB"
                strokeWidth="12"
              />
              {/* Animated Score Arc */}
              <motion.circle
                cx="112"
                cy="130"
                r={radius}
                fill="none"
                stroke={scoreColor}
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: scoreOffset }}
                transition={{ duration: 1.15, ease: [0.22, 1, 0.36, 1] }}
                transform="rotate(-90 112 130)"
              />
            </svg>

            {/* Center Score Typography Overlay */}
            <div
              style={{ left: '29.5%', top: '50%' }}
              className="absolute -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none"
            >
              <div className="text-[10px] font-mono-num uppercase tracking-wider text-[#858585]">
                Viability
              </div>
              <div className="font-heading text-4xl font-extrabold text-[#171717] leading-none mt-0.5">
                {score}
              </div>
              <div className="text-[10px] font-mono-num text-[#686864] mt-0.5">/ 100</div>
            </div>

            {/* 5 Interactive Orbital Nodes */}
            {pillars.map((pillar, idx) => {
              const pos = orbitalPositions[idx];
              const isSelected = pillar.key === activeKey;
              return (
                <motion.button
                  key={pillar.key}
                  type="button"
                  onClick={() => setActiveKey(pillar.key)}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    left: `${(pos.x / 380) * 100}%`,
                    top: `${(pos.y / 260) * 100}%`,
                  }}
                  aria-label={`Inspect ${pillar.label}`}
                  className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 cursor-pointer group"
                >
                  <span
                    style={{
                      backgroundColor: isSelected ? pillar.color : '#FFFFFF',
                      borderColor: isSelected ? pillar.color : '#D6D6D0',
                      color: isSelected ? '#FFFFFF' : '#171717',
                    }}
                    className={`w-9 h-9 rounded-full border-2 flex items-center justify-center text-xs font-mono-num font-bold shadow-sm transition-all ${
                      isSelected ? 'ring-4 ring-[#FF7417]/15 scale-105' : 'group-hover:border-[#171717]'
                    }`}
                  >
                    {pillar.num}
                  </span>
                  <span
                    className={`hidden sm:inline-block text-xs font-semibold whitespace-nowrap transition-colors ${
                      isSelected ? 'text-[#171717]' : 'text-[#686864] group-hover:text-[#171717]'
                    }`}
                  >
                    {pillar.shortLabel}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* RIGHT: Verdict Headline + Interactive Animated Pillar Spotlight */}
        <div className="lg:col-span-6 flex flex-col justify-between space-y-4">
          {/* Should You Build It? Headline */}
          <div className="rounded-[14px] border border-[#E6E6E2] bg-[#FFFFFF] p-4 sm:p-5 space-y-1.5">
            <div className="text-[11px] font-mono-num uppercase tracking-wider text-[#C44D00] font-semibold">
              Should You Build It?
            </div>
            <h3 className="font-heading text-lg sm:text-xl font-bold text-[#171717] leading-snug">
              {scorecard.verdictLabel}
            </h3>
            <p className="text-xs text-[#5C5C58] leading-relaxed">{scorecard.summaryContext}</p>
          </div>

          {/* Animated Active Pillar Spotlight */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activePillar.key}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.22 }}
              className={`rounded-[16px] border p-5 space-y-3 ${activePillar.bgTint} ${activePillar.borderTint}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    style={{ backgroundColor: activePillar.color }}
                    className="w-7 h-7 rounded-[8px] text-white flex items-center justify-center"
                  >
                    <ActiveIcon className="w-4 h-4" />
                  </span>
                  <div>
                    <div
                      style={{ color: activePillar.color }}
                      className="text-xs font-bold uppercase tracking-wide"
                    >
                      {activePillar.num} · {activePillar.label}
                    </div>
                    <div className="text-[11px] text-[#5C5C58]">{activePillar.subline}</div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-white/80 text-[10px] font-mono-num font-semibold text-[#171717]">
                  Active Node
                </span>
              </div>

              <p className="text-sm text-[#171717] font-medium leading-relaxed">
                {activePillar.content}
              </p>

              {activePillar.key === 'catch' && onPromoteKillSwitches && (
                <button
                  type="button"
                  onClick={onPromoteKillSwitches}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#C44D00] hover:underline cursor-pointer pt-1"
                >
                  <span>Inspect Kill Switches</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Compact Monetization & Buyer Strip */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="rounded-[10px] border border-[#E6E6E2] bg-[#FAFAF9] p-3">
              <div className="text-[10px] text-[#858585] uppercase font-medium">Will Pay?</div>
              <div className="text-xs font-bold text-[#1E6543] mt-0.5">
                {scorecard.willingnessToPay.viable ? 'YES · Verified' : 'Needs Proof'}
              </div>
            </div>
            <div className="rounded-[10px] border border-[#E6E6E2] bg-[#FAFAF9] p-3">
              <div className="text-[10px] text-[#858585] uppercase font-medium">Price Band</div>
              <div className="text-xs font-bold text-[#171717] font-mono-num mt-0.5 truncate">
                {scorecard.willingnessToPay.estimatedPriceRange}
              </div>
            </div>
            <div className="rounded-[10px] border border-[#E6E6E2] bg-[#FAFAF9] p-3">
              <div className="text-[10px] text-[#858585] uppercase font-medium">Model</div>
              <div className="text-xs font-semibold text-[#171717] mt-0.5 truncate">
                {scorecard.willingnessToPay.paymentModel}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5-PILLAR ARCHITECTURAL SELECTOR STRIP (Half-masked bold numerals inspired by reference) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-2">
        {pillars.map((pillar) => {
          const isSelected = pillar.key === activeKey;
          return (
            <button
              key={pillar.key}
              type="button"
              onClick={() => setActiveKey(pillar.key)}
              className={`relative overflow-hidden rounded-[12px] border p-3 text-left transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[#FFFFFF] border-[#171717] shadow-sm'
                  : 'bg-[#FAFAF9] border-[#E6E6E2] hover:border-[#252525]'
              }`}
            >
              <div
                style={{ color: isSelected ? pillar.color : '#D6D6D0' }}
                className="font-heading text-2xl font-black leading-none tracking-tighter select-none"
              >
                {pillar.num}
              </div>
              <div className="text-xs font-bold text-[#171717] mt-1.5">{pillar.shortLabel}</div>
              <div className="text-[11px] text-[#686864] line-clamp-2 mt-0.5">{pillar.content}</div>
            </button>
          );
        })}
      </div>

      {/* THE BOTTOM LINE */}
      <div className="rounded-[14px] bg-[#171717] text-white p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] font-mono-num font-bold uppercase tracking-wider text-[#FF7417]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>The Bottom Line</span>
          </div>
          <p className="text-xs sm:text-sm text-[#E6E6E2] leading-relaxed">{scorecard.bottomLine}</p>
        </div>
        {onPromoteKillSwitches && (
          <button
            type="button"
            onClick={onPromoteKillSwitches}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors cursor-pointer shrink-0"
          >
            <TrendingUp className="w-3.5 h-3.5 text-[#FF7417]" />
            <span>Kill Switches</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
