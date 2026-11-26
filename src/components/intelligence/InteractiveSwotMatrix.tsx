import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, AlertTriangle, Sparkles, TrendingUp, ChevronRight, Zap } from 'lucide-react';
import type { SwotAnalysisReport, SwotItem } from '../../types/brainwise';
import { typeClass } from '../../theme/typography';

interface InteractiveSwotMatrixProps {
  swot: SwotAnalysisReport;
}

export const InteractiveSwotMatrix: React.FC<InteractiveSwotMatrixProps> = ({ swot }) => {
  const [activeCategory, setActiveCategory] = useState<'all' | 'strength' | 'weakness' | 'opportunity' | 'threat'>('all');
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedItemId((prev) => (prev === id ? null : id));
  };

  const sections: {
    key: 'strength' | 'weakness' | 'opportunity' | 'threat';
    title: string;
    items: SwotItem[];
    tone: {
      border: string;
      bg: string;
      badge: string;
      accent: string;
      headerBg: string;
    };
    icon: React.ReactNode;
  }[] = [
    {
      key: 'strength',
      title: 'Strengths (Internal Advantage)',
      items: swot.strengths || [],
      tone: {
        border: 'border-[#CDE5D7]',
        bg: 'bg-[#F4FAF6]',
        badge: 'bg-[#ECF7F1] text-[#1E6543] border-[#CDE5D7]',
        accent: '#1E6543',
        headerBg: 'bg-[#E3F2E9]',
      },
      icon: <ShieldCheck className="w-4 h-4 text-[#1E6543]" />,
    },
    {
      key: 'weakness',
      title: 'Weaknesses (Internal Gaps)',
      items: swot.weaknesses || [],
      tone: {
        border: 'border-[#FED7AA]',
        bg: 'bg-[#FFF9F5]',
        badge: 'bg-[#FFF3EB] text-[#C44D00] border-[#FED7AA]',
        accent: '#C44D00',
        headerBg: 'bg-[#FFE8D6]',
      },
      icon: <AlertTriangle className="w-4 h-4 text-[#C44D00]" />,
    },
    {
      key: 'opportunity',
      title: 'Opportunities (External Tailwinds)',
      items: swot.opportunities || [],
      tone: {
        border: 'border-[#C7D2FE]',
        bg: 'bg-[#F8FAFF]',
        badge: 'bg-[#EEF2FF] text-[#4338CA] border-[#C7D2FE]',
        accent: '#4338CA',
        headerBg: 'bg-[#E0E7FF]',
      },
      icon: <Sparkles className="w-4 h-4 text-[#4338CA]" />,
    },
    {
      key: 'threat',
      title: 'Threats (External Headwinds)',
      items: swot.threats || [],
      tone: {
        border: 'border-[#FECACA]',
        bg: 'bg-[#FFF8F8]',
        badge: 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]',
        accent: '#B91C1C',
        headerBg: 'bg-[#FEE2E2]',
      },
      icon: <TrendingUp className="w-4 h-4 text-[#B91C1C]" />,
    },
  ];

  const visibleSections = activeCategory === 'all'
    ? sections
    : sections.filter((s) => s.key === activeCategory);

  return (
    <div className="rounded-[16px] border border-[#E6E6E2] bg-[#FFFFFF] p-5 sm:p-7 shadow-[0_2px_8px_rgba(0,0,0,0.03)] space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E6E6E2]">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-[#171717] text-white">
              STRATEGIC AUDIT
            </span>
            <span className="text-xs text-[#686864] font-medium">Interactive Matrix</span>
          </div>
          <h3 className={`${typeClass.h3} font-bold text-[#171717] mt-1`}>
            SWOT Analysis &amp; Action Plays
          </h3>
          <p className="text-xs text-[#686864]">
            Internal capabilities versus external market forces. Tap any card to reveal the AI strategic countermeasure.
          </p>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-1.5 p-1 bg-[#F5F5F4] rounded-[10px] border border-[#E6E6E2] overflow-x-auto scrollbar-none">
          {(['all', 'strength', 'weakness', 'opportunity', 'threat'] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1 text-xs font-semibold rounded-[7px] capitalize transition-all cursor-pointer whitespace-nowrap ${
                activeCategory === cat
                  ? 'bg-[#171717] text-white shadow-xs'
                  : 'text-[#686864] hover:text-[#171717]'
              }`}
            >
              {cat === 'all' ? 'All (2×2)' : `${cat}s`}
            </button>
          ))}
        </div>
      </div>

      {/* 2x2 Grid of Quadrants */}
      <div className={`grid gap-5 ${activeCategory === 'all' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
        {visibleSections.map((section) => (
          <div
            key={section.key}
            className={`rounded-[14px] border ${section.tone.border} ${section.tone.bg} overflow-hidden shadow-2xs transition-all`}
          >
            {/* Quadrant Header */}
            <div className={`px-4 py-3 flex items-center justify-between border-b ${section.tone.border} ${section.tone.headerBg}`}>
              <div className="flex items-center gap-2">
                {section.icon}
                <span className="text-xs font-bold uppercase tracking-wider text-[#171717]">
                  {section.title}
                </span>
              </div>
              <span className={`text-[10px] font-mono-num font-bold px-2 py-0.5 rounded-full border ${section.tone.badge}`}>
                {section.items.length} points
              </span>
            </div>

            {/* Items List */}
            <div className="p-3 sm:p-4 space-y-2.5">
              {section.items.map((item) => {
                const isExpanded = expandedItemId === item.id;
                return (
                  <motion.div
                    key={item.id}
                    layout
                    onClick={() => toggleExpand(item.id)}
                    className="p-3 rounded-[10px] bg-white border border-[#E6E6E2] shadow-xs cursor-pointer hover:border-[#CCCCCC] transition-colors space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-[#171717] leading-snug">
                          {item.statement}
                        </div>
                        <div className="text-[11px] text-[#686864] leading-relaxed">
                          {item.detail}
                        </div>
                      </div>
                      <ChevronRight
                        className={`w-4 h-4 text-[#8A8A85] shrink-0 transition-transform ${
                          isExpanded ? 'rotate-90' : ''
                        }`}
                      />
                    </div>

                    {/* Expandable Strategic Countermeasure / Execution Action */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="pt-2 border-t border-[#F0F0ED]"
                        >
                          <div className="p-2.5 rounded-[8px] bg-[#FAF9F8] border border-[#EBEBE8] space-y-1">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#FF7417]">
                              <Zap className="w-3 h-3 text-[#FF7417]" />
                              <span>AI Tactical Play</span>
                            </div>
                            <p className="text-xs text-[#2A2A28] font-medium leading-relaxed">
                              {item.counterAction || 'Ground pricing and verified proof points in all marketing touchpoints to reinforce this advantage.'}
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
