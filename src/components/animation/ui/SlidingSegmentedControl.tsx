import React, { useId } from 'react';
import { motion, useReducedMotion } from 'motion/react';

export interface TabOption<T extends string = string> {
  id: T;
  label: string;
  badge?: string | number;
  icon?: React.FC<{ className?: string }>;
}

export interface SlidingSegmentedControlProps<T extends string = string> {
  options: TabOption<T>[];
  activeId: T;
  onChange: (id: T) => void;
  size?: 'sm' | 'md';
  variant?: 'light' | 'dark';
  className?: string;
  layoutId?: string;
}

export function SlidingSegmentedControl<T extends string = string>({
  options,
  activeId,
  onChange,
  size = 'md',
  variant = 'light',
  className = '',
  layoutId,
}: SlidingSegmentedControlProps<T>) {
  const generatedId = useId();
  const activeLayoutId = layoutId || `sliding-pill-${generatedId}`;
  const reduced = useReducedMotion();

  const isDark = variant === 'dark';
  const height = size === 'sm' ? 'h-7 text-xs px-2.5' : 'h-9 text-xs sm:text-sm px-3.5';

  const containerBg = isDark ? 'bg-[#1C1C1C] border-[#2E2E2E]' : 'bg-[#EFEFEB] border-[#E6E6E2]';
  const activePillBg = isDark
    ? 'bg-[#2E2E2E] border-[#3E3E3E]'
    : 'bg-[#FFFFFF] border-[#E6E6E2]/80';
  const selectedText = isDark ? 'text-white' : 'text-[#171717]';
  const unselectedText = isDark
    ? 'text-[#A8A8A2] hover:text-white'
    : 'text-[#686864] hover:text-[#252525]';

  return (
    <div
      role="tablist"
      className={`inline-flex items-center p-1 rounded-[10px] border select-none ${containerBg} ${className}`}
    >
      {options.map((opt) => {
        const isSelected = activeId === opt.id;
        const Icon = opt.icon;

        return (
          <button
            key={opt.id}
            role="tab"
            aria-selected={isSelected}
            onClick={() => onChange(opt.id)}
            className={`relative ${height} rounded-[7px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[#FF7417] z-10 ${
              isSelected ? selectedText : unselectedText
            }`}
          >
            {isSelected && (
              <motion.div
                layoutId={reduced ? undefined : activeLayoutId}
                transition={{
                  type: 'spring',
                  stiffness: 450,
                  damping: 32,
                  mass: 0.8,
                }}
                className={`absolute inset-0 rounded-[7px] shadow-xs -z-10 border ${activePillBg}`}
              />
            )}

            {Icon && (
              <Icon
                className={`w-3.5 h-3.5 ${
                  isSelected ? 'text-[#FF7417]' : isDark ? 'text-[#A8A8A2]' : 'text-[#858585]'
                } transition-colors`}
              />
            )}

            <span className="truncate">{opt.label}</span>

            {opt.badge !== undefined && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded font-mono-num ${
                  isSelected
                    ? 'bg-[#FFF0E5] text-[#FF7417]'
                    : isDark
                      ? 'bg-[#2A2A2A] text-[#A8A8A2]'
                      : 'bg-[#E6E6E2] text-[#858585]'
                }`}
              >
                {opt.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
