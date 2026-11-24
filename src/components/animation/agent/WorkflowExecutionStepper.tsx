import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Check, AlertCircle, CircleDot } from 'lucide-react';
import { BW_EASE } from '../../motion/LiquidMotion';

export interface WorkflowStep {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

export interface WorkflowExecutionStepperProps {
  steps: WorkflowStep[];
  className?: string;
}

export const WorkflowExecutionStepper: React.FC<WorkflowExecutionStepperProps> = ({
  steps,
  className = '',
}) => {
  const reduced = useReducedMotion();

  return (
    <div
      className={`p-4 rounded-[14px] border border-[#E6E6E2] bg-[#FAFAF9] text-xs space-y-4 ${className}`}
    >
      <div className="flex items-center justify-between pb-2 border-b border-[#EFEFEB]">
        <div className="flex items-center gap-2">
          <CircleDot className="w-4 h-4 text-[#FF7417]" />
          <span className="font-bold text-[#171717]">Orchestrated Pipeline Execution</span>
        </div>
        <span className="text-[11px] font-mono-num text-[#858585]">
          {steps.filter((s) => s.status === 'completed').length} of {steps.length} completed
        </span>
      </div>

      <div className="relative pl-6 space-y-5">
        {/* Continuous track connecting line */}
        <div
          aria-hidden="true"
          className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-[#E6E6E2]"
        />

        {steps.map((st, idx) => {
          const isDone = st.status === 'completed';
          const isRunning = st.status === 'running';
          const isFailed = st.status === 'failed';

          return (
            <div key={st.id} className="relative flex items-start gap-3">
              {/* Step indicator node */}
              <div className="absolute -left-6 top-0.5">
                {isDone ? (
                  <motion.div
                    initial={reduced ? undefined : { scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.2, ease: BW_EASE }}
                    className="w-5 h-5 rounded-full bg-[#16A34A] text-white flex items-center justify-center shadow-xs"
                  >
                    <Check className="w-3 h-3 stroke-[3]" />
                  </motion.div>
                ) : isRunning ? (
                  <div className="relative w-5 h-5 flex items-center justify-center">
                    {!reduced && (
                      <motion.div
                        className="absolute inset-0 rounded-full bg-[#FF7417]/30"
                        animate={{ scale: [1, 1.8], opacity: [0.8, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: BW_EASE }}
                      />
                    )}
                    <div className="w-4 h-4 rounded-full bg-[#FF7417] text-white flex items-center justify-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    </div>
                  </div>
                ) : isFailed ? (
                  <div className="w-5 h-5 rounded-full bg-[#DC2626] text-white flex items-center justify-center">
                    <AlertCircle className="w-3 h-3 stroke-[3]" />
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full bg-[#FFFFFF] border-2 border-[#D6D6D0] text-[#858585] flex items-center justify-center text-[10px] font-mono-num font-semibold">
                    {idx + 1}
                  </div>
                )}
              </div>

              {/* Step content */}
              <div className="min-w-0 flex-1 pl-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`font-semibold ${
                      isRunning
                        ? 'text-[#FF7417]'
                        : isDone
                          ? 'text-[#171717]'
                          : isFailed
                            ? 'text-[#DC2626]'
                            : 'text-[#858585]'
                    }`}
                  >
                    {st.title}
                  </span>
                  {isRunning && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#FFF0E5] text-[#FF7417] font-medium font-mono-num">
                      In Flight
                    </span>
                  )}
                </div>
                {st.description && (
                  <p className="text-[11px] text-[#5C5C58] mt-0.5 leading-relaxed">
                    {st.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
