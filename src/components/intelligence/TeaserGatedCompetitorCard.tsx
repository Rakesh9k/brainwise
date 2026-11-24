import React from 'react';
import { ExternalLink, Lock, Sparkles, Zap } from 'lucide-react';
import type { CompetitorProfileData } from '../../types/brainwise';
import { PriorityBadge } from '../ui/DesignSystem';

interface TeaserGatedCompetitorCardProps {
  competitor: CompetitorProfileData;
  isUnlocked?: boolean;
  onSelect: (id: string) => void;
  onUnlockRequest: (competitor: CompetitorProfileData) => void;
}

export const TeaserGatedCompetitorCard: React.FC<TeaserGatedCompetitorCardProps> = ({
  competitor,
  isUnlocked = false,
  onSelect,
  onUnlockRequest,
}) => {
  const isGated = Boolean(competitor.isTeaserGated && !competitor.unlocked && !isUnlocked);

  // Derive 1-5 price level and feature depth scores
  const priceLevel = Math.min(5, Math.max(1, Math.round((competitor.xValueScore / 100) * 5)));
  const featureDepth = Math.min(5, Math.max(1, Math.round((competitor.yDiffScore / 100) * 5)));

  const opportunityText = competitor.weaknesses[0]
    ? `Exploit their gap in ${competitor.weaknesses[0].toLowerCase()} by leading with our transparent outcome guarantee.`
    : 'Focus on specialized onboarding tailored to dissatisfied switchers.';

  return (
    <div className="relative rounded-[16px] border border-[#E6E6E2] bg-[#FFFFFF] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between space-y-4 overflow-hidden">
      {/* Top Header: Identity & Tags */}
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[10px] bg-[#F5F5F4] border border-[#E6E6E2] flex items-center justify-center font-bold text-sm text-[#171717]">
              {competitor.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-[#171717]">{competitor.name}</h4>
                <a
                  href={competitor.website}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#858585] hover:text-[#171717]"
                  title={competitor.website}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
              <span className="text-[11px] text-[#686864]">{competitor.category}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <PriorityBadge priority={competitor.threatLevel} />
          </div>
        </div>

        {/* Meter Bars: Price Level & Feature Depth */}
        <div className="grid grid-cols-2 gap-4 mt-4 pt-3 border-t border-[#EFEFEB] text-xs">
          <div>
            <div className="flex justify-between text-[#858585] text-[11px] mb-1">
              <span>Price Level</span>
              <strong className="text-[#171717] font-mono-num">{priceLevel}/5</strong>
            </div>
            <div className="flex gap-1 h-1.5">
              {[1, 2, 3, 4, 5].map((lvl) => (
                <div
                  key={lvl}
                  className={`flex-1 rounded-full ${
                    lvl <= priceLevel ? 'bg-[#7C3AED]' : 'bg-[#EFEFEB]'
                  }`}
                />
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between text-[#858585] text-[11px] mb-1">
              <span>Feature Depth</span>
              <strong className="text-[#171717] font-mono-num">{featureDepth}/5</strong>
            </div>
            <div className="flex gap-1 h-1.5">
              {[1, 2, 3, 4, 5].map((lvl) => (
                <div
                  key={lvl}
                  className={`flex-1 rounded-full ${
                    lvl <= featureDepth ? 'bg-[#2563EB]' : 'bg-[#EFEFEB]'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Teardown Details Section (Gated with blur if locked) */}
      <div className="relative space-y-3 pt-1 flex-1">
        <div
          className={`space-y-3 transition-all ${isGated ? 'filter blur-[4px] select-none pointer-events-none opacity-40' : ''}`}
        >
          {/* Strengths */}
          <div className="rounded-[10px] bg-[#F4F9F6] border border-[#D1E7DD] p-3 space-y-1.5">
            <span className="text-[10px] font-bold text-[#1E6543] uppercase tracking-wider block">
              STRENGTHS
            </span>
            <ul className="text-xs text-[#2D4A3E] space-y-1 list-disc list-inside">
              {competitor.strengths.slice(0, 2).map((s, idx) => (
                <li key={idx} className="leading-snug">
                  {s}
                </li>
              ))}
            </ul>
          </div>

          {/* Weaknesses */}
          <div className="rounded-[10px] bg-[#FDF5F5] border border-[#F8D7DA] p-3 space-y-1.5">
            <span className="text-[10px] font-bold text-[#BC3E3E] uppercase tracking-wider block">
              WEAKNESSES
            </span>
            <ul className="text-xs text-[#5C2B2D] space-y-1 list-disc list-inside">
              {competitor.weaknesses.slice(0, 2).map((w, idx) => (
                <li key={idx} className="leading-snug">
                  {w}
                </li>
              ))}
            </ul>
          </div>

          {/* Your Opportunity (Wedge) */}
          <div className="rounded-[10px] bg-[#F8F5FF] border border-[#E0D4FC] p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#6D28D9] uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-[#6D28D9]" />
              <span>YOUR OPPORTUNITY</span>
            </div>
            <p className="text-xs text-[#3B1F70] leading-snug font-medium">{opportunityText}</p>
          </div>
        </div>

        {/* Frosted Teaser Gating Overlay */}
        {isGated && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-4 bg-white/40 backdrop-blur-[2px] rounded-[12px] text-center space-y-2.5">
            <div className="p-2 rounded-full bg-[#171717] text-white shadow-md">
              <Lock className="w-4 h-4 text-[#FF7417]" />
            </div>
            <div>
              <h5 className="text-xs font-bold text-[#171717]">Proprietary Teardown Locked</h5>
              <p className="text-[11px] text-[#686864] max-w-xs mt-0.5">
                Inspect customer complaint triggers, pricing ladder, and counter-wedge.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onUnlockRequest(competitor)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[8px] bg-[#171717] hover:bg-[#252525] text-white text-xs font-semibold shadow-sm cursor-pointer transition-colors"
            >
              <Zap className="w-3.5 h-3.5 text-[#FF7417]" />
              <span>Unlock Full Teardown ({competitor.unlockCreditCost || 25} cr)</span>
            </button>
          </div>
        )}
      </div>

      {/* Bottom Bar */}
      <div className="pt-2 border-t border-[#EFEFEB] flex items-center justify-between text-xs text-[#686864]">
        <span className="font-mono-num">{competitor.priceRange}</span>
        <button
          type="button"
          onClick={() => onSelect(competitor.id)}
          className="text-[#171717] hover:text-[#FF7417] font-semibold cursor-pointer"
        >
          {isGated ? 'Overview →' : 'Deep Battlecard →'}
        </button>
      </div>
    </div>
  );
};
