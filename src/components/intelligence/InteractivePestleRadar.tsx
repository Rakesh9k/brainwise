import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Globe2, AlertCircle, CheckCircle2, ChevronRight, Scale, Leaf, Cpu, Landmark, TrendingUp } from 'lucide-react';
import type { PestleReport, PestleFactorItem } from '../../types/brainwise';
import { typeClass } from '../../theme/typography';

interface InteractivePestleRadarProps {
  pestle: PestleReport;
}

export const InteractivePestleRadar: React.FC<InteractivePestleRadarProps> = ({ pestle }) => {
  const [selectedFactorId, setSelectedFactorId] = useState<string>(pestle.factors[0]?.id || 'pestle-p');

  const getCategoryIcon = (category: PestleFactorItem['category']) => {
    switch (category) {
      case 'Political':
        return <Landmark className="w-3.5 h-3.5" />;
      case 'Economic':
        return <TrendingUp className="w-3.5 h-3.5" />;
      case 'Social':
        return <Globe2 className="w-3.5 h-3.5" />;
      case 'Technological':
        return <Cpu className="w-3.5 h-3.5" />;
      case 'Legal':
        return <Scale className="w-3.5 h-3.5" />;
      case 'Environmental':
        return <Leaf className="w-3.5 h-3.5" />;
    }
  };

  const getImpactTone = (impact: PestleFactorItem['impact']) => {
    switch (impact) {
      case 'Favorable':
        return { text: 'text-[#1E6543]', bg: 'bg-[#ECF7F1]', border: 'border-[#CDE5D7]', dot: 'bg-[#1E6543]' };
      case 'Neutral':
        return { text: 'text-[#5C5C58]', bg: 'bg-[#F4F4F2]', border: 'border-[#E2E2DE]', dot: 'bg-[#8A8A85]' };
      case 'Caution':
        return { text: 'text-[#C44D00]', bg: 'bg-[#FFF3EB]', border: 'border-[#FED7AA]', dot: 'bg-[#FF7417]' };
      case 'Threat':
        return { text: 'text-[#B91C1C]', bg: 'bg-[#FEF2F2]', border: 'border-[#FECACA]', dot: 'bg-[#B91C1C]' };
    }
  };

  const activeFactor = pestle.factors.find((f) => f.id === selectedFactorId) || pestle.factors[0];

  return (
    <div className="rounded-[16px] border border-[#E6E6E2] bg-[#FFFFFF] p-5 sm:p-7 shadow-[0_2px_8px_rgba(0,0,0,0.03)] space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E6E6E2]">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-[#171717] text-white">
              MACRO RADAR
            </span>
            <span className="text-xs text-[#686864] font-medium">Interactive Signal Scan</span>
          </div>
          <h3 className={`${typeClass.h3} font-bold text-[#171717] mt-1`}>
            PESTLE Macro-Environment Scan
          </h3>
          <p className="text-xs text-[#686864]">
            External political, economic, legal, and environmental tailwinds and watchouts. Tap any signal to inspect.
          </p>
        </div>
      </div>

      {/* 6 Horizontal Signal Pills Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {pestle.factors.map((factor) => {
          const isSelected = selectedFactorId === factor.id;
          const tone = getImpactTone(factor.impact);
          const Icon = getCategoryIcon(factor.category);

          return (
            <button
              key={factor.id}
              type="button"
              onClick={() => setSelectedFactorId(factor.id)}
              className={`p-3 rounded-[12px] border text-left transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between gap-2 ${
                isSelected
                  ? 'border-[#171717] bg-[#FAF9F8] shadow-sm ring-1 ring-[#171717]'
                  : 'border-[#E6E6E2] bg-white hover:bg-[#FAF9F8]'
              }`}
            >
              <div className="flex items-center justify-between gap-1 w-full">
                <span className="text-xs text-[#171717] font-bold flex items-center gap-1.5">
                  {Icon}
                  <span>{factor.category}</span>
                </span>
                <span className={`w-2 h-2 rounded-full ${tone.dot}`} />
              </div>

              <div className="flex items-center justify-between text-[11px] font-semibold">
                <span className={`px-1.5 py-0.2 rounded-md ${tone.bg} ${tone.text} border ${tone.border}`}>
                  {factor.impact}
                </span>
                <ChevronRight className={`w-3.5 h-3.5 text-[#8A8A85] transition-transform ${isSelected ? 'rotate-90' : ''}`} />
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Factor Deep-Dive Card */}
      {activeFactor && (
        <motion.div
          key={activeFactor.id}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="p-4 sm:p-5 rounded-[12px] bg-[#FAF9F8] border border-[#E6E6E2] space-y-3"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#ECECE9]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#FF7417]">
                {activeFactor.category} Signal
              </span>
              <span className="text-sm font-bold text-[#171717]">
                {activeFactor.title}
              </span>
            </div>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-full border self-start sm:self-auto ${
                getImpactTone(activeFactor.impact).bg
              } ${getImpactTone(activeFactor.impact).text} ${getImpactTone(activeFactor.impact).border}`}
            >
              {activeFactor.impact} Factor
            </span>
          </div>

          <p className="text-xs text-[#52524E] leading-relaxed">
            {activeFactor.summary}
          </p>

          {/* Strategic Action Required */}
          <div className="p-3 rounded-[9px] bg-white border border-[#E6E6E2] space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#171717]">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#1E6543]" />
              <span>Recommended Operational Response</span>
            </div>
            <p className="text-xs text-[#171717] font-medium leading-relaxed">
              {activeFactor.strategicAction}
            </p>
          </div>
        </motion.div>
      )}

      {/* Key Watchouts Summary */}
      {pestle.keyWatchouts?.length > 0 && (
        <div className="p-3.5 rounded-[10px] bg-[#FFFBF8] border border-[#FED7AA] space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#C44D00]">
            <AlertCircle className="w-3.5 h-3.5 text-[#C44D00]" />
            <span>Macro Watchouts Before Launch:</span>
          </div>
          <ul className="text-xs text-[#52524E] space-y-1 pl-4 list-disc">
            {pestle.keyWatchouts.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
