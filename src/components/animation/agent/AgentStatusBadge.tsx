import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { BW_EASE } from '../../motion/LiquidMotion';

export type AgentOperationalState =
  'idle' | 'thinking' | 'executing_tool' | 'truth_verified' | 'blocked_or_error';

export interface AgentStatusBadgeProps {
  state: AgentOperationalState;
  label?: string;
  showDotOnly?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

const STATE_CONFIG: Record<
  AgentOperationalState,
  {
    defaultLabel: string;
    dotColor: string;
    pingColor: string;
    textColor: string;
    bgColor: string;
    borderColor: string;
  }
> = {
  idle: {
    defaultLabel: 'Agent Idle',
    dotColor: 'bg-[#858585]',
    pingColor: 'bg-[#858585]/40',
    textColor: 'text-[#686864]',
    bgColor: 'bg-[#FAFAF9]',
    borderColor: 'border-[#E6E6E2]',
  },
  thinking: {
    defaultLabel: 'Synthesizing Brief',
    dotColor: 'bg-[#FF7417]',
    pingColor: 'bg-[#FF7417]/50',
    textColor: 'text-[#C44D00]',
    bgColor: 'bg-[#FFF7F0]',
    borderColor: 'border-[#FFD0B3]',
  },
  executing_tool: {
    defaultLabel: 'Executing Tool',
    dotColor: 'bg-[#2563EB]',
    pingColor: 'bg-[#2563EB]/40',
    textColor: 'text-[#1D4ED8]',
    bgColor: 'bg-[#EFF6FF]',
    borderColor: 'border-[#BFDBFE]',
  },
  truth_verified: {
    defaultLabel: 'Truth Grounded',
    dotColor: 'bg-[#16A34A]',
    pingColor: 'bg-[#16A34A]/40',
    textColor: 'text-[#15803D]',
    bgColor: 'bg-[#F0FDF4]',
    borderColor: 'border-[#BBF7D0]',
  },
  blocked_or_error: {
    defaultLabel: 'Attention Required',
    dotColor: 'bg-[#DC2626]',
    pingColor: 'bg-[#DC2626]/40',
    textColor: 'text-[#B91C1C]',
    bgColor: 'bg-[#FEF2F2]',
    borderColor: 'border-[#FECACA]',
  },
};

export const AgentStatusBadge: React.FC<AgentStatusBadgeProps> = ({
  state,
  label,
  showDotOnly = false,
  size = 'md',
  className = '',
}) => {
  const reduced = useReducedMotion();
  const config = STATE_CONFIG[state] || STATE_CONFIG.idle;
  const isPulsing = (state === 'thinking' || state === 'executing_tool') && !reduced;

  const dotSize = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2';
  const textPadding = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  if (showDotOnly) {
    return (
      <span
        className={`relative inline-flex items-center justify-center ${dotSize} ${className}`}
        title={label || config.defaultLabel}
        aria-label={label || config.defaultLabel}
      >
        {isPulsing && (
          <motion.span
            className={`absolute inline-flex h-full w-full rounded-full ${config.pingColor}`}
            animate={{
              scale: [1, 2],
              opacity: [0.75, 0],
            }}
            transition={{
              duration: 1.4,
              repeat: Infinity,
              ease: BW_EASE,
            }}
          />
        )}
        <span className={`relative inline-flex rounded-full ${dotSize} ${config.dotColor}`} />
      </span>
    );
  }

  return (
    <motion.span
      initial={reduced ? undefined : { opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.18, ease: BW_EASE }}
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${config.bgColor} ${config.borderColor} ${config.textColor} ${textPadding} ${className}`}
    >
      <span className={`relative inline-flex items-center justify-center ${dotSize}`}>
        {isPulsing && (
          <motion.span
            className={`absolute inline-flex h-full w-full rounded-full ${config.pingColor}`}
            animate={{
              scale: [1, 1.9],
              opacity: [0.75, 0],
            }}
            transition={{
              duration: 1.4,
              repeat: Infinity,
              ease: BW_EASE,
            }}
          />
        )}
        <span className={`relative inline-flex rounded-full ${dotSize} ${config.dotColor}`} />
      </span>
      <span>{label || config.defaultLabel}</span>
    </motion.span>
  );
};
