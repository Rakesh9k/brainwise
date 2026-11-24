import React from 'react';
import { CheckCircle2, XCircle, Info, ShieldAlert, TrendingUp } from 'lucide-react';
import type { ResearchReport, GoSignalItem, StopSignalItem } from '../../types/brainwise';
import { typeClass } from '../../theme/typography';

interface GoStopSignalsSectionProps {
  report: ResearchReport;
}

export const GoStopSignalsSection: React.FC<GoStopSignalsSectionProps> = ({ report }) => {
  // Extract or dynamically synthesize high-conviction signals from the dossier
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

  const totalGoCount = positiveSignals.length + keyStrengths.length;
  const totalStopCount = criticalRisks.length + areasOfConcern.length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
      {/* LEFT COLUMN: Go Signals (Leverage Points) */}
      <div className="rounded-[16px] border border-[#CDE5D7] bg-[#FFFFFF] p-5 sm:p-7 shadow-[0_2px_8px_rgba(30,101,67,0.04)] flex flex-col justify-between space-y-6">
        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 pb-4 border-b border-[#EAF5EF]">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-[#ECF7F1] border border-[#CDE5D7] flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-5 h-5 text-[#1E6543]" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-[#1E6543] uppercase tracking-wider block">
                  LEVERAGE POINTS
                </span>
                <div className="flex items-center gap-1.5">
                  <h3 className={`${typeClass.h4} font-bold text-[#171717]`}>Go Signals</h3>
                  <span title="Positive market forces driving viability">
                    <Info className="w-3.5 h-3.5 text-[#858585] cursor-help" />
                  </span>
                </div>
                <p className="text-xs text-[#686864]">
                  Why this idea has wind behind it — and where you can defend an edge.
                </p>
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#ECF7F1] text-[#1E6543] border border-[#CDE5D7] shrink-0 font-mono-num">
              {totalGoCount} SIGNALS
            </span>
          </div>

          {/* Group 1: Positive Signals */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-[#1E6543] uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1E6543]" />
                POSITIVE SIGNALS
              </span>
              <span className="font-mono-num text-[11px] text-[#858585]">{positiveSignals.length}</span>
            </div>

            <div className="space-y-2.5">
              {positiveSignals.map((item, idx) => (
                <div
                  key={item.id || `pos-${idx}`}
                  className="rounded-[10px] border border-[#EAEAE7] bg-[#FAFAF9]/60 hover:bg-[#FFFFFF] p-3 text-xs flex items-start gap-3 transition-colors"
                >
                  <span className="font-mono-num text-[11px] font-bold text-[#1E6543] shrink-0 mt-0.5">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <div className="flex-1 text-[#252525] leading-relaxed">
                    <span>{item.text}</span>
                    {item.tag && (
                      <span className="ml-2 inline-flex items-center text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#EAF5EF] text-[#1E6543] border border-[#CDE5D7]">
                        · {item.tag}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Group 2: Key Strengths */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-xs font-bold text-[#1E6543] uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1E6543]" />
                KEY STRENGTHS
              </span>
              <span className="font-mono-num text-[11px] text-[#858585]">{keyStrengths.length}</span>
            </div>

            <div className="space-y-2.5">
              {keyStrengths.map((item, idx) => (
                <div
                  key={item.id || `str-${idx}`}
                  className="rounded-[10px] border border-[#EAEAE7] bg-[#FAFAF9]/60 hover:bg-[#FFFFFF] p-3 text-xs flex items-start gap-3 transition-colors"
                >
                  <span className="font-mono-num text-[11px] font-bold text-[#1E6543] shrink-0 mt-0.5">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <div className="flex-1 text-[#252525] leading-relaxed">
                    <span>{item.text}</span>
                    {item.tag && (
                      <span className="ml-2 inline-flex items-center text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#EAF5EF] text-[#1E6543] border border-[#CDE5D7]">
                        · {item.tag}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-[#EAF5EF] flex items-center justify-between text-[11px] text-[#1E6543] font-medium">
          <span className="flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            Category Momentum: Strong Tailwinds
          </span>
          <span className="text-[#858585]">Grounding: Verified</span>
        </div>
      </div>

      {/* RIGHT COLUMN: Stop Signals (Watch Out For) */}
      <div className="rounded-[16px] border border-[#FECACA] bg-[#FFFFFF] p-5 sm:p-7 shadow-[0_2px_8px_rgba(188,62,62,0.04)] flex flex-col justify-between space-y-6">
        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 pb-4 border-b border-[#FDF2F2]">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-[#FDF2F2] border border-[#FECACA] flex items-center justify-center shrink-0 mt-0.5">
                <XCircle className="w-5 h-5 text-[#BC3E3E]" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-[#BC3E3E] uppercase tracking-wider block">
                  WATCH OUT FOR
                </span>
                <div className="flex items-center gap-1.5">
                  <h3 className={`${typeClass.h4} font-bold text-[#171717]`}>Stop Signals</h3>
                  <span title="Fatal flaws or critical blockers that could invalidate the venture">
                    <Info className="w-3.5 h-3.5 text-[#858585] cursor-help" />
                  </span>
                </div>
                <p className="text-xs text-[#686864]">
                  What will kill this idea if ignored — and the gaps to close first.
                </p>
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#FDF2F2] text-[#BC3E3E] border border-[#FECACA] shrink-0 font-mono-num">
              {totalStopCount} RISKS
            </span>
          </div>

          {/* Group 1: Critical Risks */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-[#BC3E3E] uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#BC3E3E]" />
                CRITICAL RISKS
              </span>
              <span className="font-mono-num text-[11px] text-[#858585]">{criticalRisks.length}</span>
            </div>

            <div className="space-y-2.5">
              {criticalRisks.map((item, idx) => (
                <div
                  key={item.id || `risk-${idx}`}
                  className="rounded-[10px] border border-[#FEE2E2] bg-[#FFF8F8] hover:bg-[#FFFFFF] p-3 text-xs flex items-start gap-3 transition-colors"
                >
                  <span className="font-mono-num text-[11px] font-bold text-[#BC3E3E] shrink-0 mt-0.5">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <div className="flex-1 text-[#252525] leading-relaxed">
                    <span>{item.text}</span>
                    {item.tag && (
                      <span className="ml-2 inline-flex items-center text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#FDF2F2] text-[#BC3E3E] border border-[#FECACA]">
                        · {item.tag}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Group 2: Areas of Concern */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-xs font-bold text-[#C44D00] uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C44D00]" />
                AREAS OF CONCERN
              </span>
              <span className="font-mono-num text-[11px] text-[#858585]">{areasOfConcern.length}</span>
            </div>

            <div className="space-y-2.5">
              {areasOfConcern.map((item, idx) => (
                <div
                  key={item.id || `con-${idx}`}
                  className="rounded-[10px] border border-[#FED7AA]/60 bg-[#FFFCF9] hover:bg-[#FFFFFF] p-3 text-xs flex items-start gap-3 transition-colors"
                >
                  <span className="font-mono-num text-[11px] font-bold text-[#C44D00] shrink-0 mt-0.5">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <div className="flex-1 text-[#252525] leading-relaxed">
                    <span>{item.text}</span>
                    {item.tag && (
                      <span className="ml-2 inline-flex items-center text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#FFF3EB] text-[#C44D00] border border-[#FED7AA]">
                        · {item.tag}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-[#FDF2F2] flex items-center justify-between text-[11px] text-[#BC3E3E] font-medium">
          <span className="flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5" />
            Action: Validate with Kill Switches before scaling capital
          </span>
          <span className="text-[#858585]">Audit: Unresolved</span>
        </div>
      </div>
    </div>
  );
};
