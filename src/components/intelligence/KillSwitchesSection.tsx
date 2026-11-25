import React from 'react';
import {
  AlertOctagon,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  FlaskConical,
  Plus,
  ShieldAlert,
} from 'lucide-react';
import type { KillSwitchAssumption } from '../../types/brainwise';
import { typeClass } from '../../theme/typography';

interface KillSwitchesSectionProps {
  assumptions: KillSwitchAssumption[];
  onPromoteToExperiment?: (assumption: KillSwitchAssumption) => void;
  onUpdateStatus?: (id: string, status: 'pending' | 'tested_pass' | 'tested_killed') => void;
  isPromoted?: (assumption: KillSwitchAssumption) => boolean;
  onViewInGrowthPlanner?: () => void;
  title?: string;
  subtitle?: string;
  showPromoteAction?: boolean;
}

export const KillSwitchesSection: React.FC<KillSwitchesSectionProps> = ({
  assumptions,
  onPromoteToExperiment,
  onUpdateStatus,
  isPromoted,
  onViewInGrowthPlanner,
  title = 'Test Before You Build — Critical Assumptions',
  subtitle = 'Each assumption has a concrete test, a deadline, a quantifiable success threshold, and an explicit stop-if trigger.',
  showPromoteAction = true,
}) => {
  if (!assumptions || assumptions.length === 0) {
    return null;
  }

  return (
    <div className="rounded-[16px] border border-[#E6E6E2] bg-[#FFFFFF] p-5 sm:p-7 shadow-[0_2px_8px_rgba(0,0,0,0.03)] space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E6E6E2]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-[#FF7417]" />
            <span className="text-[11px] font-bold text-[#FF7417] uppercase tracking-wider">
              VALIDATION MATRIX
            </span>
          </div>
          <h3 className={`${typeClass.h4} font-bold text-[#171717]`}>{title}</h3>
          <p className={`${typeClass.bodySm} text-[#686864] max-w-2xl`}>{subtitle}</p>
        </div>

        <div className="flex items-center gap-2 text-xs font-medium text-[#686864] bg-[#FAFAF9] px-3 py-1.5 rounded-full border border-[#E6E6E2] shrink-0">
          <ShieldAlert className="w-3.5 h-3.5 text-[#C44D00]" />
          <span>Falsifiable Kill Switches</span>
        </div>
      </div>

      <div className="space-y-4">
        {assumptions.map((item, idx) => {
          const riskColor =
            item.riskLevel === 'HIGH RISK'
              ? 'text-[#BC3E3E] bg-[#FDF2F2] border-[#FECACA]'
              : item.riskLevel === 'MEDIUM RISK'
                ? 'text-[#C44D00] bg-[#FFF3EB] border-[#FED7AA]'
                : 'text-[#2563EB] bg-[#EFF6FF] border-[#BFDBFE]';

          return (
            <div
              key={item.id || `assumption-${idx}`}
              className="rounded-[14px] border border-[#E6E6E2] bg-[#FAFAF9] p-5 space-y-4 hover:border-[#D0D0CA] transition-colors"
            >
              {/* Top row: Risk Level + Assumption text */}
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-[6px] border text-[10px] font-bold tracking-wider uppercase ${riskColor}`}
                    >
                      {item.riskLevel}
                    </span>
                    <span className="text-xs text-[#858585] font-mono-num">
                      Assumption 0{idx + 1}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-[#171717] leading-snug">
                    {item.assumption}
                  </h4>
                </div>

                {/* Status or Promote Button */}
                <div className="flex items-center gap-2 shrink-0">
                  {onUpdateStatus && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateStatus(
                            item.id,
                            item.status === 'tested_pass' ? 'pending' : 'tested_pass'
                          )
                        }
                        className={`px-2.5 py-1 rounded-[6px] border text-[11px] font-medium transition-colors cursor-pointer ${
                          item.status === 'tested_pass'
                            ? 'bg-[#1E6543] text-white border-[#1E6543]'
                            : 'bg-white text-[#1E6543] border-[#CDE5D7] hover:bg-[#ECF7F1]'
                        }`}
                        title="Mark as validated with passing numbers"
                      >
                        ✓ Passed
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateStatus(
                            item.id,
                            item.status === 'tested_killed' ? 'pending' : 'tested_killed'
                          )
                        }
                        className={`px-2.5 py-1 rounded-[6px] border text-[11px] font-medium transition-colors cursor-pointer ${
                          item.status === 'tested_killed'
                            ? 'bg-[#BC3E3E] text-white border-[#BC3E3E]'
                            : 'bg-white text-[#BC3E3E] border-[#FECACA] hover:bg-[#FDF2F2]'
                        }`}
                        title="Trigger stop-if condition and halt branch"
                      >
                        ✕ Stop-If
                      </button>
                    </div>
                  )}

                  {showPromoteAction &&
                    onPromoteToExperiment &&
                    (isPromoted?.(item) ? (
                      <div className="inline-flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[8px] bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] text-xs font-semibold">
                          <Check className="w-3.5 h-3.5 text-[#10B981]" />
                          <span>Added to Growth Planner</span>
                        </span>
                        {onViewInGrowthPlanner && (
                          <button
                            type="button"
                            onClick={onViewInGrowthPlanner}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[8px] bg-white border border-[#E6E6E2] hover:bg-[#F5F5F4] text-[#171717] text-xs font-semibold cursor-pointer transition-colors"
                          >
                            <span>View</span>
                            <ArrowRight className="w-3 h-3 text-[#FF7417]" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onPromoteToExperiment(item)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[8px] bg-[#171717] hover:bg-[#252525] text-white text-xs font-semibold cursor-pointer transition-colors"
                      >
                        <Plus className="w-3 h-3 text-[#FF7417]" />
                        <span>Promote to Growth Planner</span>
                      </button>
                    ))}
                </div>
              </div>

              {/* Middle row: How to test + Timeline */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs pt-1">
                <div className="md:col-span-9 bg-white p-3 rounded-[10px] border border-[#ECECE8] space-y-1">
                  <span className="text-[10px] font-bold text-[#858585] uppercase tracking-wider block">
                    HOW TO TEST
                  </span>
                  <p className="text-[#252525] font-medium">{item.howToTest}</p>
                </div>
                <div className="md:col-span-3 bg-white p-3 rounded-[10px] border border-[#ECECE8] space-y-1">
                  <span className="text-[10px] font-bold text-[#858585] uppercase tracking-wider block flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#FF7417]" />
                    TIMELINE
                  </span>
                  <p className="text-[#171717] font-semibold">{item.timeline}</p>
                </div>
              </div>

              {/* Bottom row: Success Signal (Green) vs. Stop If (Red) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                {/* Success Signal */}
                <div className="rounded-[10px] border border-[#CDE5D7] bg-[#ECF7F1]/60 p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#1E6543] uppercase tracking-wider">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#1E6543]" />
                    <span>SUCCESS SIGNAL (CONTINUE)</span>
                  </div>
                  <p className="text-[#1E6543] font-medium">{item.successSignal}</p>
                </div>

                {/* Stop If Condition */}
                <div className="rounded-[10px] border border-[#FECACA] bg-[#FDF2F2]/60 p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#BC3E3E] uppercase tracking-wider">
                    <AlertOctagon className="w-3.5 h-3.5 text-[#BC3E3E]" />
                    <span>STOP IF (KILL SWITCH)</span>
                  </div>
                  <p className="text-[#BC3E3E] font-medium">{item.stopIfCondition}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
