import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { CheckCircle2, ShieldCheck, Sparkles, UserCheck } from 'lucide-react';
import { BW_EASE } from '../../motion/LiquidMotion';

export type TruthStatus = 'USER_CONFIRMED' | 'AI_INFERRED' | 'TRUTH_CHECKED' | 'GROUNDED';

export interface DecryptedTruthTagProps {
  status: TruthStatus;
  customLabel?: string;
  className?: string;
}

const CHARACTERS = 'ABCDEF0123456789!@#$';

const STATUS_MAP: Record<
  TruthStatus,
  { label: string; icon: React.FC<{ className?: string }>; style: string }
> = {
  USER_CONFIRMED: {
    label: 'User Confirmed',
    icon: UserCheck,
    style: 'bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]',
  },
  AI_INFERRED: {
    label: 'AI Inferred',
    icon: Sparkles,
    style: 'bg-[#FFF7ED] text-[#C2410C] border-[#FFEDD5]',
  },
  TRUTH_CHECKED: {
    label: 'Truth Checked',
    icon: ShieldCheck,
    style: 'bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]',
  },
  GROUNDED: {
    label: 'Brain Grounded',
    icon: CheckCircle2,
    style: 'bg-[#FAFAF9] text-[#252525] border-[#E6E6E2]',
  },
};

export const DecryptedTruthTag: React.FC<DecryptedTruthTagProps> = ({
  status,
  customLabel,
  className = '',
}) => {
  const reduced = useReducedMotion();
  const config = STATUS_MAP[status] || STATUS_MAP.GROUNDED;
  const targetText = customLabel || config.label;
  const [displayText, setDisplayText] = useState(targetText);
  const Icon = config.icon;

  useEffect(() => {
    if (reduced) {
      setDisplayText(targetText);
      return;
    }

    let iteration = 0;
    const maxIterations = 5;
    const interval = setInterval(() => {
      iteration++;
      if (iteration >= maxIterations) {
        setDisplayText(targetText);
        clearInterval(interval);
      } else {
        setDisplayText(
          targetText
            .split('')
            .map((char, index) => {
              if (index < Math.floor((iteration / maxIterations) * targetText.length)) {
                return char;
              }
              if (char === ' ') return ' ';
              return CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
            })
            .join('')
        );
      }
    }, 30);

    return () => clearInterval(interval);
  }, [targetText, reduced]);

  return (
    <motion.span
      initial={reduced ? undefined : { opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.16, ease: BW_EASE }}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-medium font-mono-num ${config.style} ${className}`}
    >
      <Icon className="w-3 h-3 shrink-0" />
      <span>{displayText}</span>
    </motion.span>
  );
};
