import React, { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ChevronDown, Cpu, Sparkles, CheckCircle2 } from 'lucide-react';
import { BW_EASE } from '../../motion/LiquidMotion';

export interface ReasoningStep {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'completed' | 'skipped';
  detail?: string;
}

export interface AgentReasoningDrawerProps {
  reasoningText?: string;
  steps?: ReasoningStep[];
  modelTierName?: string;
  isStreaming?: boolean;
  defaultExpanded?: boolean;
  className?: string;
}

export const AgentReasoningDrawer: React.FC<AgentReasoningDrawerProps> = ({
  reasoningText,
  steps,
  modelTierName = 'Executive Strategist',
  isStreaming = false,
  defaultExpanded = false,
  className = '',
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded || isStreaming);
  const reduced = useReducedMotion();

  // If there are no steps or reasoning text, do not render a fake block
  if (!reasoningText && (!steps || steps.length === 0)) {
    return null;
  }

  return (
    <div
      className={`rounded-[12px] border border-[#E6E6E2] bg-[#FAFAF9] overflow-hidden text-xs transition-colors ${className}`}
    >
      {/* Header bar / trigger */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3.5 py-2.5 flex items-center justify-between gap-2 text-left hover:bg-[#F5F5F4] transition-colors cursor-pointer"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-5 h-5 rounded-[6px] bg-[#FFF0E5] text-[#FF7417] flex items-center justify-center shrink-0">
            {isStreaming ? (
              <Sparkles className="w-3 h-3 animate-pulse" />
            ) : (
              <Cpu className="w-3 h-3" />
            )}
          </div>
          <span className="font-semibold text-[#171717] truncate">
            {isStreaming ? 'Synthesizing Strategic Reasoning…' : 'Executive Reasoning & Proof Path'}
          </span>
          <span className="text-[10px] text-[#858585] font-mono-num px-1.5 py-0.5 rounded bg-[#EFEFEB] shrink-0">
            {modelTierName}
          </span>
        </div>

        <motion.div
          animate={reduced ? undefined : { rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2, ease: BW_EASE }}
          className="text-[#858585] shrink-0"
        >
          <ChevronDown className="w-4 h-4" />
        </motion.div>
      </button>

      {/* Collapsible Content */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="reasoning-body"
            initial={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={reduced ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
            exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: BW_EASE }}
            className="overflow-hidden"
          >
            <div className="px-3.5 pb-3 pt-1 border-t border-[#EFEFEB] space-y-2 text-[#5C5C58]">
              {/* Optional discrete steps */}
              {steps && steps.length > 0 && (
                <ul className="space-y-1.5 font-mono-num text-[11px] pt-1">
                  {steps.map((st) => (
                    <li key={st.id} className="flex items-start gap-2">
                      {st.status === 'completed' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A] shrink-0 mt-0.5" />
                      ) : st.status === 'running' ? (
                        <span className="w-3.5 h-3.5 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#FF7417] animate-ping" />
                        </span>
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#D6D6D0] shrink-0 mt-1.5 mx-1" />
                      )}
                      <div className="min-w-0 flex-1">
                        <span
                          className={
                            st.status === 'completed'
                              ? 'text-[#252525] font-medium'
                              : st.status === 'running'
                                ? 'text-[#FF7417] font-medium'
                                : 'text-[#858585]'
                          }
                        >
                          {st.label}
                        </span>
                        {st.detail && (
                          <p className="text-[10px] text-[#858585] truncate font-sans">
                            {st.detail}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {/* Freeform reasoning prose */}
              {reasoningText && (
                <div className="rounded-[8px] bg-[#FFFFFF] border border-[#E6E6E2] p-2.5 font-mono-num text-[11px] leading-relaxed text-[#252525] whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {reasoningText}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
