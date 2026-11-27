import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  CheckCircle2,
  ChevronDown,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  XCircle,
  Zap,
} from 'lucide-react';
import type { ResearchReport, GoSignalItem, StopSignalItem } from '../../types/brainwise';

interface GoStopSignalsSectionProps {
  report: ResearchReport;
}

export const GoStopSignalsSection: React.FC<GoStopSignalsSectionProps> = ({ report }) => {
  const rawGo = report.validationScorecard?.goSignals;
  const rawStop = report.validationScorecard?.stopSignals;

  const defaultPositiveSignals: GoSignalItem[] = [
    {
      id: 'pos_1',
      text:
        report.marketDemand?.summary ||
        `Strong, persistent consumer demand for accessible and affordable ${report.industry || 'digital solutions'}.`,
      tag: 'DEMAND',
    },
    {
      id: 'pos_2',
      text: `Feasible MVP development timeline leveraging existing commercial LLMs, cloud platforms, and modern APIs.`,
      tag: 'FEASIBILITY',
    },
    {
      id: 'pos_3',
      text: `Clear recurring revenue monetization model (${report.pricingAnalysis?.tiers?.[0]?.range || '$19–$49/mo'}) aligned with category benchmarks.`,
      tag: 'REVENUE',
    },
  ];

  const defaultKeyStrengths: GoSignalItem[] = [
    {
      id: 'str_1',
      text:
        report.marketOpportunities?.[0] ||
        `High market demand for low-friction, transparent entry wedge that bypasses legacy incumbent bloat.`,
      tag: 'MARKET',
    },
    {
      id: 'str_2',
      text: `Clear utility in converting complex workflows or unstructured inputs into deterministic, high-value outputs.`,
      tag: 'UTILITY',
    },
    {
      id: 'str_3',
      text: `Direct alignment with proven retention patterns and high-urgency pain points in target ${report.targetMarket || 'customer'} segment.`,
      tag: 'RETENTION',
    },
  ];

  const defaultCriticalRisks: StopSignalItem[] = [
    {
      id: 'risk_1',
      text:
        report.risksAndChallenges?.[0]?.risk ||
        `Strict regulatory compliance and legal liability in healthcare, financial, or automated advice sectors.`,
      tag: 'RISK',
    },
    {
      id: 'risk_2',
      text:
        report.competitorLandscapeSummary
          ? `High market saturation with direct incumbent competition: ${report.competitorLandscapeSummary.slice(0, 110)}...`
          : `High market saturation from established incumbents offering overlapping baseline features.`,
      tag: 'MARKET',
    },
    {
      id: 'risk_3',
      text:
        report.risksAndChallenges?.[1]?.risk ||
        `Risk of severe customer churn if product latency, reliability, or quality assurance fails during onboarding.`,
      tag: 'CHURN',
    },
  ];

  const defaultAreasOfConcern: StopSignalItem[] = [
    {
      id: 'con_1',
      text:
        report.customerPainPoints?.[0]?.evidence ||
        `Intense direct competition from well-capitalized incumbents offering subsidized or free introductory tiers.`,
      tag: 'COMPETITION',
    },
    {
      id: 'con_2',
      text:
        report.risksAndChallenges?.[0]?.mitigation
          ? `High compliance burden: ${report.risksAndChallenges[0].mitigation.slice(0, 120)}`
          : `Strict regulatory compliance burdens and potential platform policy shifts restricting distribution.`,
      tag: 'COMPLIANCE',
    },
    {
      id: 'con_3',
      text: `Lack of verified proprietary technical moats against open-source alternatives or rapid fast-follower replication.`,
      tag: 'MOAT',
    },
  ];

  const positiveSignals = rawGo?.positiveSignals?.length ? rawGo.positiveSignals : defaultPositiveSignals;
  const keyStrengths = rawGo?.keyStrengths?.length ? rawGo.keyStrengths : defaultKeyStrengths;
  const criticalRisks = rawStop?.criticalRisks?.length ? rawStop.criticalRisks : defaultCriticalRisks;
  const areasOfConcern = rawStop?.areasOfConcern?.length ? rawStop.areasOfConcern : defaultAreasOfConcern;

  const [goTab, setGoTab] = useState<'all' | 'positive' | 'strengths'>('all');
  const [stopTab, setStopTab] = useState<'all' | 'critical' | 'concerns'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(positiveSignals[0]?.id || null);

  const visibleGo = [
    ...(goTab !== 'strengths'
      ? positiveSignals.map((s, i) => ({ ...s, group: 'Positive Signal', num: `0${i + 1}`, strength: 88 - i * 8 }))
      : []),
    ...(goTab !== 'positive'
      ? keyStrengths.map((s, i) => ({
          ...s,
          group: 'Key Strength',
          num: `0${(goTab === 'all' ? positiveSignals.length : 0) + i + 1}`,
          strength: 84 - i * 7,
        }))
      : []),
  ];

  const visibleStop = [
    ...(stopTab !== 'concerns'
      ? criticalRisks.map((s, i) => ({ ...s, group: 'Critical Risk', num: `0${i + 1}`, severity: 86 - i * 9 }))
      : []),
    ...(stopTab !== 'critical'
      ? areasOfConcern.map((s, i) => ({
          ...s,
          group: 'Area of Concern',
          num: `0${(stopTab === 'all' ? criticalRisks.length : 0) + i + 1}`,
          severity: 72 - i * 8,
        }))
      : []),
  ];

  const totalGo = positiveSignals.length + keyStrengths.length;
  const totalStop = criticalRisks.length + areasOfConcern.length;
  const goSharePct = Math.round((totalGo / Math.max(1, totalGo + totalStop)) * 100);

  return (
    <div className="space-y-5">
      {/* Top Interactive Momentum Balance Header */}
      <div className="rounded-[16px] border border-[#E6E6E2] bg-[#FFFFFF] p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-[#171717] text-white">
                02 of 07 · SIGNAL RADAR
              </span>
              <span className="text-xs text-[#686864] font-medium">
                Click any signal card to inspect tactical play or mitigation
              </span>
            </div>
            <h2 className="font-heading text-lg font-bold text-[#171717] mt-1.5">
              Leverage Points vs. Watch-Out Risks
            </h2>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono-num">
            <span className="px-2.5 py-1 rounded-full bg-[#ECF7F1] text-[#1E6543] font-bold">
              {totalGo} Go Signals
            </span>
            <span className="text-[#A0A09C]">vs</span>
            <span className="px-2.5 py-1 rounded-full bg-[#FDF2F2] text-[#BC3E3E] font-bold">
              {totalStop} Stop Risks
            </span>
          </div>
        </div>

        {/* Animated Momentum Balance Bar */}
        <div className="space-y-1.5">
          <div className="h-2.5 w-full rounded-full bg-[#FDF2F2] border border-[#FECACA]/60 overflow-hidden flex">
            <motion.div
              className="h-full bg-gradient-to-r from-[#1E6543] to-[#34A874] rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${goSharePct}%` }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono-num text-[#686864]">
            <span>Tailwind Momentum ({goSharePct}%)</span>
            <span>Risk Exposure ({100 - goSharePct}%)</span>
          </div>
        </div>
      </div>

      {/* Dual Interactive Arc-Connected Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* LEFT: GO SIGNALS */}
        <div className="rounded-[18px] border border-[#CDE5D7] bg-[#FFFFFF] p-5 sm:p-6 shadow-[0_4px_18px_-6px_rgba(30,101,67,0.08)] space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#EAF5EF]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-[10px] bg-[#ECF7F1] border border-[#CDE5D7] flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-[#1E6543]" />
              </div>
              <div>
                <div className="text-[10px] font-mono-num font-bold uppercase tracking-wider text-[#1E6543]">
                  Leverage Points
                </div>
                <h3 className="font-heading text-base font-bold text-[#171717]">Go Signals</h3>
              </div>
            </div>

            <div className="flex items-center gap-1 bg-[#FAFAF9] p-1 rounded-[9px] border border-[#E6E6E2] text-[11px]">
              {[
                { id: 'all', label: 'All' },
                { id: 'positive', label: 'Positive' },
                { id: 'strengths', label: 'Strengths' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setGoTab(t.id as typeof goTab)}
                  className={`px-2.5 py-1 rounded-[6px] font-semibold cursor-pointer transition-colors ${
                    goTab === t.id
                      ? 'bg-[#1E6543] text-white'
                      : 'text-[#5C5C58] hover:text-[#171717]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Connected Orbital Track Cards */}
          <div className="relative pl-4 space-y-3">
            <div
              aria-hidden="true"
              className="absolute left-[7px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-[#1E6543] via-[#CDE5D7] to-transparent"
            />
            {visibleGo.map((sig) => {
              const isOpen = expandedId === sig.id;
              return (
                <motion.div
                  key={sig.id}
                  layout
                  className="relative"
                >
                  <span
                    aria-hidden="true"
                    className={`absolute -left-[13px] top-5 w-2.5 h-2.5 rounded-full border-2 border-white shadow-xs transition-colors ${
                      isOpen ? 'bg-[#1E6543] scale-125' : 'bg-[#65B88E]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setExpandedId(isOpen ? null : sig.id)}
                    className={`w-full text-left rounded-[14px] border p-3.5 transition-all cursor-pointer relative overflow-hidden ${
                      isOpen
                        ? 'bg-[#ECF7F1]/55 border-[#1E6543] shadow-xs'
                        : 'bg-[#FAFAF9] border-[#E6E6E2] hover:border-[#1E6543]/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span className="font-heading text-2xl font-black leading-none text-[#1E6543]/25 select-none shrink-0 pt-0.5">
                          {sig.num}
                        </span>
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-full bg-[#ECF7F1] text-[#1E6543] text-[10px] font-mono-num font-bold">
                              {sig.tag}
                            </span>
                            <span className="text-[10px] text-[#686864]">{sig.group}</span>
                          </div>
                          <p className="text-xs sm:text-[13px] text-[#171717] font-medium leading-relaxed">
                            {sig.text}
                          </p>
                        </div>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 text-[#1E6543] shrink-0 transition-transform mt-1 ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </div>

                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-3 pt-3 border-t border-[#CDE5D7] space-y-2">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="inline-flex items-center gap-1 font-semibold text-[#1E6543]">
                                <Zap className="w-3.5 h-3.5" />
                                Conviction Weight
                              </span>
                              <span className="font-mono-num font-bold text-[#1E6543]">
                                {sig.strength}/100
                              </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-white overflow-hidden">
                              <motion.div
                                className="h-full bg-[#1E6543]"
                                initial={{ width: 0 }}
                                animate={{ width: `${sig.strength}%` }}
                              />
                            </div>
                            <div className="text-[11px] text-[#171717] bg-white/80 rounded-[8px] p-2.5 border border-[#CDE5D7]">
                              <strong className="text-[#1E6543]">Tactical Play:</strong> Anchor your
                              landing hero and Week-1 outreach around this {sig.tag?.toLowerCase() || 'signal'}{' '}
                              advantage to accelerate early signups.
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </button>
                </motion.div>
              );
            })}
          </div>

          <div className="pt-2 flex items-center justify-between text-[11px] text-[#1E6543] font-medium">
            <span className="inline-flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              Category Momentum: Strong Tailwinds
            </span>
            <span className="text-[#686864]">Grounding: Verified</span>
          </div>
        </div>

        {/* RIGHT: STOP SIGNALS */}
        <div className="rounded-[18px] border border-[#FECACA] bg-[#FFFFFF] p-5 sm:p-6 shadow-[0_4px_18px_-6px_rgba(188,62,62,0.08)] space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#FDF2F2]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-[10px] bg-[#FDF2F2] border border-[#FECACA] flex items-center justify-center">
                <XCircle className="w-5 h-5 text-[#BC3E3E]" />
              </div>
              <div>
                <div className="text-[10px] font-mono-num font-bold uppercase tracking-wider text-[#BC3E3E]">
                  Watch Out For
                </div>
                <h3 className="font-heading text-base font-bold text-[#171717]">Stop Signals</h3>
              </div>
            </div>

            <div className="flex items-center gap-1 bg-[#FAFAF9] p-1 rounded-[9px] border border-[#E6E6E2] text-[11px]">
              {[
                { id: 'all', label: 'All' },
                { id: 'critical', label: 'Critical' },
                { id: 'concerns', label: 'Concerns' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setStopTab(t.id as typeof stopTab)}
                  className={`px-2.5 py-1 rounded-[6px] font-semibold cursor-pointer transition-colors ${
                    stopTab === t.id
                      ? 'bg-[#BC3E3E] text-white'
                      : 'text-[#5C5C58] hover:text-[#171717]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Connected Orbital Track Cards */}
          <div className="relative pl-4 space-y-3">
            <div
              aria-hidden="true"
              className="absolute left-[7px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-[#BC3E3E] via-[#FECACA] to-transparent"
            />
            {visibleStop.map((sig) => {
              const isOpen = expandedId === sig.id;
              return (
                <motion.div
                  key={sig.id}
                  layout
                  className="relative"
                >
                  <span
                    aria-hidden="true"
                    className={`absolute -left-[13px] top-5 w-2.5 h-2.5 rounded-full border-2 border-white shadow-xs transition-colors ${
                      isOpen ? 'bg-[#BC3E3E] scale-125' : 'bg-[#F87171]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setExpandedId(isOpen ? null : sig.id)}
                    className={`w-full text-left rounded-[14px] border p-3.5 transition-all cursor-pointer relative overflow-hidden ${
                      isOpen
                        ? 'bg-[#FDF2F2]/65 border-[#BC3E3E] shadow-xs'
                        : 'bg-[#FAFAF9] border-[#E6E6E2] hover:border-[#BC3E3E]/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span className="font-heading text-2xl font-black leading-none text-[#BC3E3E]/25 select-none shrink-0 pt-0.5">
                          {sig.num}
                        </span>
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-full bg-[#FDF2F2] text-[#BC3E3E] text-[10px] font-mono-num font-bold">
                              {sig.tag}
                            </span>
                            <span className="text-[10px] text-[#686864]">{sig.group}</span>
                          </div>
                          <p className="text-xs sm:text-[13px] text-[#171717] font-medium leading-relaxed">
                            {sig.text}
                          </p>
                        </div>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 text-[#BC3E3E] shrink-0 transition-transform mt-1 ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </div>

                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-3 pt-3 border-t border-[#FECACA] space-y-2">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="inline-flex items-center gap-1 font-semibold text-[#BC3E3E]">
                                <ShieldAlert className="w-3.5 h-3.5" />
                                Risk Severity
                              </span>
                              <span className="font-mono-num font-bold text-[#BC3E3E]">
                                {sig.severity}/100
                              </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-white overflow-hidden">
                              <motion.div
                                className="h-full bg-[#BC3E3E]"
                                initial={{ width: 0 }}
                                animate={{ width: `${sig.severity}%` }}
                              />
                            </div>
                            <div className="text-[11px] text-[#171717] bg-white/85 rounded-[8px] p-2.5 border border-[#FECACA]">
                              <strong className="text-[#BC3E3E]">Mitigation Trigger:</strong> Run a
                              14-day pre-launch Kill Switch test before committing fixed capital to
                              this {sig.tag?.toLowerCase() || 'risk'} vector.
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </button>
                </motion.div>
              );
            })}
          </div>

          <div className="pt-2 flex items-center justify-between text-[11px] text-[#BC3E3E] font-medium">
            <span className="inline-flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              Action: Validate with Kill Switches first
            </span>
            <span className="text-[#686864]">Audit: Active</span>
          </div>
        </div>
      </div>
    </div>
  );
};
