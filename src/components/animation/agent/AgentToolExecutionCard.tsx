import React, { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  Check,
  ChevronRight,
  AlertCircle,
  Wrench,
  Clock,
  Database,
  Globe,
  ShieldCheck,
} from 'lucide-react';
import { BW_EASE } from '../../motion/LiquidMotion';

export type ToolExecutionStatus = 'executing' | 'success' | 'failed' | 'requires_approval';

export interface AgentToolExecutionProps {
  toolName: string;
  category?: 'database' | 'search' | 'truth' | 'computation' | 'general';
  status: ToolExecutionStatus;
  args?: Record<string, any>;
  result?: any;
  durationMs?: number;
  errorMessage?: string;
  className?: string;
}

const CATEGORY_ICON = {
  database: Database,
  search: Globe,
  truth: ShieldCheck,
  computation: Wrench,
  general: Wrench,
};

export const AgentToolExecutionCard: React.FC<AgentToolExecutionProps> = ({
  toolName,
  category = 'general',
  status,
  args,
  result,
  durationMs,
  errorMessage,
  className = '',
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const reduced = useReducedMotion();
  const Icon = CATEGORY_ICON[category] || Wrench;

  const statusDisplay = {
    executing: {
      label: 'Executing…',
      badge: 'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]',
      icon: Clock,
    },
    success: {
      label: 'Success',
      badge: 'bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]',
      icon: Check,
    },
    failed: {
      label: 'Failed',
      badge: 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]',
      icon: AlertCircle,
    },
    requires_approval: {
      label: 'Pending Approval',
      badge: 'bg-[#FFF7ED] text-[#C2410C] border-[#FFEDD5]',
      icon: AlertCircle,
    },
  }[status];

  const StatusIcon = statusDisplay.icon;

  return (
    <motion.div
      initial={reduced ? undefined : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: BW_EASE }}
      className={`rounded-[10px] border border-[#E6E6E2] bg-[#FFFFFF] overflow-hidden text-xs shadow-xs ${className}`}
    >
      <div className="p-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-6 h-6 rounded-[6px] bg-[#F1F1EF] text-[#252525] flex items-center justify-center shrink-0">
            <Icon className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono font-semibold text-[#171717] truncate">{toolName}</span>
              {durationMs !== undefined && (
                <span className="text-[10px] text-[#858585] font-mono-num">{durationMs}ms</span>
              )}
            </div>
            <p className="text-[11px] text-[#686864] truncate">
              {args ? `${Object.keys(args).length} parameters submitted` : 'Agent system call'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium ${statusDisplay.badge}`}
          >
            <StatusIcon className="w-2.5 h-2.5" />
            <span>{statusDisplay.label}</span>
          </span>

          {(args || result || errorMessage) && (
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="p-1 rounded text-[#858585] hover:text-[#171717] hover:bg-[#F5F5F4] transition-colors cursor-pointer"
              title="Inspect payload"
              aria-expanded={showDetails}
            >
              <motion.div
                animate={reduced ? undefined : { rotate: showDetails ? 90 : 0 }}
                transition={{ duration: 0.16 }}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </motion.div>
            </button>
          )}
        </div>
      </div>

      {/* Expandable inspector payload */}
      <AnimatePresence initial={false}>
        {showDetails && (
          <motion.div
            key="tool-details"
            initial={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={reduced ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
            exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: BW_EASE }}
            className="overflow-hidden border-t border-[#F1F1EF] bg-[#FAFAF9] p-3 space-y-2 text-[11px]"
          >
            {errorMessage && (
              <div className="p-2 rounded-[6px] bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C]">
                <strong>Error:</strong> {errorMessage}
              </div>
            )}

            {args && (
              <div>
                <span className="font-semibold text-[#5C5C58] block mb-1">Inputs:</span>
                <pre className="p-2 rounded-[6px] bg-[#FFFFFF] border border-[#E6E6E2] font-mono-num text-[10px] overflow-x-auto text-[#252525]">
                  {JSON.stringify(args, null, 2)}
                </pre>
              </div>
            )}

            {result && (
              <div>
                <span className="font-semibold text-[#5C5C58] block mb-1">Result:</span>
                <pre className="p-2 rounded-[6px] bg-[#FFFFFF] border border-[#E6E6E2] font-mono-num text-[10px] overflow-x-auto text-[#252525] max-h-40">
                  {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
                </pre>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
