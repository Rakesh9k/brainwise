import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Brain,
  CheckCircle2,
  DollarSign,
  ShieldAlert,
  Sparkles,
  Target,
} from 'lucide-react';
import type { ResearchReport } from '../../types/brainwise';
import { typeClass } from '../../theme/typography';
import { StatusBadge } from '../ui/DesignSystem';
import { StrategicInsightCard, TactilePillButton } from '../animation';

interface ValidationVerdictScorecardProps {
  report: ResearchReport;
  onCommitToBrain: () => void;
  onPromoteKillSwitches?: () => void;
  isCommitted?: boolean;
  isDormantBrain?: boolean;
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
  const scoreTone =
    score >= 75 ? 'text-[#1E6543]' : score >= 60 ? 'text-[#C44D00]' : 'text-[#BC3E3E]';
  const scoreBg =
    score >= 75
      ? 'bg-[#ECF7F1] border-[#CDE5D7]'
      : score >= 60
        ? 'bg-[#FFF3EB] border-[#FED7AA]'
        : 'bg-[#FDF2F2] border-[#FECACA]';

  return (
    <div className="rounded-[16px] border border-[#E6E6E2] bg-[#FFFFFF] p-5 sm:p-7 shadow-[0_2px_8px_rgba(0,0,0,0.03)] space-y-6">
      {/* Header Badge & Verdict */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#E6E6E2]">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-[#171717] text-white">
              01 of 07 · VERDICT
            </span>
            <span className="text-xs text-[#686864] font-medium">Idea Validation Dossier</span>
          </div>
          <h2 className={`${typeClass.h3} font-bold text-[#171717]`}>
            Validation Summary &amp; Decision
          </h2>
          <p className={`${typeClass.bodySm} text-[#686864] max-w-2xl`}>
            The decision first: should you build it, what could go wrong, and what to do this week.
          </p>
        </div>

        {/* Action Button: Commit to Business Brain */}
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
                  ? 'Business Brain Hatched & Active ✓'
                  : 'Saved to Business Brain'
                : isDormantBrain
                  ? 'Graduate Idea & Hatch Business Brain 🚀'
                  : 'Commit to Business Brain'}
            </span>
          </TactilePillButton>
        </div>
      </div>

      {/* Main Verdict Card with Circular Score */}
      <StrategicInsightCard
        spotlightColor="rgba(255, 116, 23, 0.08)"
        className="border-[#E6E6E2] bg-[#FAFAF9] p-5 sm:p-6"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            {/* Circular Score Badge */}
            <div
              className={`w-16 h-16 rounded-full border-2 flex flex-col items-center justify-center shrink-0 ${scoreBg}`}
            >
              <span className={`text-2xl font-black font-mono-num leading-none ${scoreTone}`}>
                {score}
              </span>
              <span className="text-[10px] font-semibold text-[#686864] uppercase tracking-wider mt-0.5">
                Score
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-bold text-[#686864] uppercase tracking-wider">
                SHOULD YOU BUILD IT?
              </span>
              <h3 className={`${typeClass.h4} font-bold text-[#171717]`}>
                {scorecard.verdictLabel}
              </h3>
              <p className={`${typeClass.bodySm} text-[#5C5C58] max-w-2xl`}>
                {scorecard.summaryContext}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <StatusBadge
              status={report.viabilitySignal}
              tone={
                report.viabilitySignal === 'Strong Fit'
                  ? 'success'
                  : report.viabilitySignal === 'Promising with Niche Focus'
                    ? 'accent'
                    : 'neutral'
              }
            />
          </div>
        </div>
      </StrategicInsightCard>

      {/* 3 Pillars Grid: Good News / Bad News / Your Angle */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Good News */}
        <div className="rounded-[12px] border border-[#D1E7DD] bg-[#F4F9F6] p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-[#1E6543] uppercase tracking-wider">
            <CheckCircle2 className="w-4 h-4 text-[#1E6543]" />
            <span>GOOD NEWS</span>
          </div>
          <p className="text-xs text-[#2D4A3E] leading-relaxed">{scorecard.goodNews}</p>
        </div>

        {/* Bad News */}
        <div className="rounded-[12px] border border-[#F8D7DA] bg-[#FDF5F5] p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-[#BC3E3E] uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4 text-[#BC3E3E]" />
            <span>BAD NEWS</span>
          </div>
          <p className="text-xs text-[#5C2B2D] leading-relaxed">{scorecard.badNews}</p>
        </div>

        {/* Your Angle (Wedge) */}
        <div className="rounded-[12px] border border-[#E0D4FC] bg-[#F8F5FF] p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-[#6D28D9] uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-[#6D28D9]" />
            <span>YOUR ANGLE</span>
          </div>
          <p className="text-xs text-[#3B1F70] leading-relaxed">{scorecard.strategicWedge}</p>
        </div>
      </div>

      {/* Secondary Row: The Catch + Will Anyone Pay? */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* The Catch */}
        <div className="md:col-span-7 rounded-[12px] border border-[#FED7AA] bg-[#FFFBF7] p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-[#C44D00] uppercase tracking-wider">
            <ShieldAlert className="w-4 h-4 text-[#C44D00]" />
            <span>THE CATCH (CRITICAL RISK)</span>
          </div>
          <p className="text-xs text-[#7C2D12] leading-relaxed">{scorecard.theCatch}</p>
        </div>

        {/* Will Anyone Pay? */}
        <div className="md:col-span-5 rounded-[12px] border border-[#E6E6E2] bg-[#FAFAF9] p-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-bold text-[#171717] uppercase tracking-wider">
            <div className="flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-[#FF7417]" />
              <span>WILL ANYONE PAY?</span>
            </div>
            <span className="text-[#1E6543] font-bold">YES</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[#858585] block text-[11px]">Price Range</span>
              <strong className="text-[#171717] font-semibold">
                {scorecard.willingnessToPay.estimatedPriceRange}
              </strong>
            </div>
            <div>
              <span className="text-[#858585] block text-[11px]">Payment Mode</span>
              <strong className="text-[#171717] font-semibold">
                {scorecard.willingnessToPay.paymentModel}
              </strong>
            </div>
          </div>
          <div className="pt-1 text-[11px] text-[#686864] border-t border-[#E6E6E2]">
            Target:{' '}
            <strong className="text-[#252525]">{scorecard.willingnessToPay.targetBuyer}</strong>
          </div>
        </div>
      </div>

      {/* The Bottom Line */}
      <div className="rounded-[10px] border-l-4 border-l-[#171717] bg-[#F5F5F4] p-3.5 text-xs text-[#242424] space-y-1">
        <span className="text-[10px] font-bold text-[#686864] uppercase tracking-wider block">
          THE BOTTOM LINE
        </span>
        <p className="leading-relaxed">{scorecard.bottomLine}</p>
      </div>

      {/* Quick Footnote Actions */}
      {onPromoteKillSwitches && (
        <div className="pt-2 flex items-center justify-between text-xs text-[#686864]">
          <span className="flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-[#FF7417]" />
            <span>
              Next recommended action: Run the critical assumption kill switches before investing.
            </span>
          </span>
          <button
            type="button"
            onClick={onPromoteKillSwitches}
            className="inline-flex items-center gap-1 text-[#FF7417] hover:text-[#C44D00] font-semibold cursor-pointer"
          >
            <span>Inspect Kill Switches</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
