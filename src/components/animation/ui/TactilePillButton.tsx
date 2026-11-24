import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Loader2 } from 'lucide-react';
import { BW_EASE } from '../../motion/LiquidMotion';

export interface TactilePillButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  disabled?: boolean;
  icon?: React.FC<{ className?: string }>;
  className?: string;
  ariaLabel?: string;
}

export const TactilePillButton: React.FC<TactilePillButtonProps> = ({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  icon: Icon,
  className = '',
  ariaLabel,
}) => {
  const reduced = useReducedMotion();

  const variantStyles = {
    primary:
      'bg-[#FF7417] hover:bg-[#E55F08] text-white shadow-[0_4px_14px_-4px_rgba(255,116,23,0.36)] hover:shadow-[0_8px_20px_-6px_rgba(229,95,8,0.42)] border border-transparent',
    secondary: 'bg-[#FFFFFF] hover:bg-[#FAFAF9] text-[#242424] border border-[#E6E6E2] shadow-xs',
    dark: 'bg-[#171717] hover:bg-[#252525] text-white shadow-xs border border-transparent',
  }[variant];

  const sizeStyles = {
    sm: 'h-8 px-3 text-xs gap-1.5',
    md: 'h-10 px-4 text-xs sm:text-sm gap-2',
    lg: 'h-12 px-6 text-sm sm:text-base gap-2.5',
  }[size];

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      aria-label={ariaLabel}
      whileTap={reduced || disabled || isLoading ? undefined : { scale: 0.98 }}
      whileHover={reduced || disabled || isLoading ? undefined : { y: -1 }}
      transition={{ duration: 0.14, ease: BW_EASE }}
      className={`relative inline-flex items-center justify-center font-semibold rounded-full select-none transition-colors cursor-pointer focus-ring disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles} ${sizeStyles} ${className}`}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Processing…</span>
        </>
      ) : (
        <>
          {Icon && <Icon className="w-4 h-4 shrink-0" />}
          <span>{children}</span>
        </>
      )}
    </motion.button>
  );
};
