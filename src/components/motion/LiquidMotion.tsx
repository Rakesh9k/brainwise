import React, { useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Check } from 'lucide-react';

export const BW_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/**
 * AmbientLight
 * Subtle radial orange illumination layer anchored to executive containers without visual noise.
 */
export const AmbientLight: React.FC<{
  corner?: 'top-right' | 'top-left' | 'center';
  intensity?: 'subtle' | 'medium';
  dark?: boolean;
  className?: string;
}> = ({ corner = 'top-right', intensity = 'subtle', dark = false, className = '' }) => {
  const pos =
    corner === 'top-right'
      ? 'ellipse 64% 52% at 92% 6%'
      : corner === 'top-left'
      ? 'ellipse 64% 52% at 8% 6%'
      : 'ellipse 66% 52% at 50% 0%';

  const alpha =
    dark && intensity === 'medium'
      ? 0.22
      : dark
      ? 0.14
      : intensity === 'medium'
      ? 0.12
      : 0.075;

  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 rounded-[inherit] overflow-hidden ${className}`}
      style={{
        background: `radial-gradient(${pos}, rgba(255, 116, 23, ${alpha}) 0%, rgba(255, 154, 69, ${
          alpha * 0.35
        }) 42%, rgba(255, 255, 255, 0) 76%)`,
      }}
    />
  );
};

/**
 * FocusGlow
 * Wraps inputs or interactive blocks with a calm orange ambient halo during keyboard/pointer focus.
 */
export const FocusGlow: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <div
    className={`rounded-[12px] transition-shadow duration-200 focus-within:shadow-[0_0_0_3px_rgba(255,116,23,0.12)] ${className}`}
  >
    {children}
  </div>
);

/**
 * FluidTransition
 * Spatial calm container transition aligned with BrainWise easing and prefers-reduced-motion.
 */
export const FluidTransition: React.FC<{
  children: React.ReactNode;
  direction?: 'up' | 'fade' | 'scale';
  delay?: number;
  className?: string;
}> = ({ children, direction = 'up', delay = 0, className = '' }) => {
  const reduced = useReducedMotion();

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  const initial =
    direction === 'up'
      ? { opacity: 0, y: 8 }
      : direction === 'scale'
      ? { opacity: 0, scale: 0.985 }
      : { opacity: 0 };

  return (
    <motion.div
      initial={initial}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.24, delay, ease: BW_EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/**
 * MorphingPanel
 * Animated surface reveal/exit used in modals, studio tabs, sprint switchers, and drawers.
 */
export const MorphingPanel: React.FC<{
  children: React.ReactNode;
  className?: string;
  role?: string;
  'aria-label'?: string;
}> = ({ children, className = '', role, 'aria-label': ariaLabel }) => {
  const reduced = useReducedMotion();

  return (
    <motion.div
      role={role}
      aria-label={ariaLabel}
      initial={reduced ? false : { opacity: 0, y: 8, scale: 0.988 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduced ? undefined : { opacity: 0, y: 6, scale: 0.99 }}
      transition={{ duration: 0.22, ease: BW_EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/**
 * LiquidButton
 * Primary interactive button with fluid cursor-reactive sheen, subtle tactile elevation,
 * loading spinner, and explicit confirmation state.
 */
export const LiquidButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary' | 'ghost' | 'dark' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
    success?: boolean;
  }
> = ({
  variant = 'secondary',
  size = 'md',
  loading = false,
  success = false,
  className = '',
  type = 'button',
  disabled,
  children,
  onMouseMove,
  ...rest
}) => {
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const reduced = useReducedMotion();

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!reduced && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      btnRef.current.style.setProperty('--bw-mx', `${x}px`);
      btnRef.current.style.setProperty('--bw-my', `${y}px`);
    }
    onMouseMove?.(e);
  };

  const variants = {
    primary:
      'text-white bg-[#FF7417] hover:bg-[#E55F08] border border-transparent shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_2px_6px_rgba(255,116,23,0.22),0_10px_22px_-10px_rgba(255,116,23,0.38)]',
    secondary:
      'text-[#171717] bg-[#FFFFFF] hover:bg-[#FAFAF9] border border-[#E8E8E4] hover:border-[#D6D6D0] bw-ceramic-control',
    ghost:
      'text-[#5C5C58] hover:text-[#171717] hover:bg-[#F1F1EF] border border-transparent',
    dark:
      'text-white bg-[#171717] hover:bg-[#252525] border border-transparent shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_2px_6px_rgba(23,23,23,0.16),0_10px_22px_-12px_rgba(23,23,23,0.34)]',
    danger:
      'text-[#BC3E3E] bg-[#FDF0F0] hover:bg-[#FADEDE] border border-[#F5CECE]',
  };

  const sizes = {
    sm: 'h-8 px-3.5 text-xs rounded-full',
    md: 'h-9 sm:h-10 px-5 text-xs sm:text-sm rounded-full',
    lg: 'h-11 px-6 text-sm rounded-full',
  };

  const glowColor =
    variant === 'primary' || variant === 'dark'
      ? 'rgba(255, 255, 255, 0.22)'
      : 'rgba(255, 116, 23, 0.14)';

  return (
    <button
      ref={btnRef}
      type={type}
      disabled={disabled || loading}
      onMouseMove={handleMouseMove}
      className={`group relative overflow-hidden inline-flex items-center justify-center gap-1.5 font-medium transition-all duration-150 hover:-translate-y-[0.5px] active:scale-[0.985] active:translate-y-0 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-default disabled:hover:translate-y-0 disabled:active:scale-100 focus-ring ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {!reduced && !disabled && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          style={{
            background: `radial-gradient(120px circle at var(--bw-mx, 50%) var(--bw-my, 50%), ${glowColor}, transparent 72%)`,
          }}
        />
      )}
      {!reduced && loading && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-white/25 to-transparent bw-liquid-shimmer"
        />
      )}
      <span className="relative z-10 inline-flex items-center justify-center gap-1.5">
        {loading ? (
          <span
            aria-hidden="true"
            className={`w-2 h-2 rounded-full shrink-0 ${
              variant === 'primary' || variant === 'dark' ? 'bg-white' : 'bg-[#FF7417]'
            } ${reduced ? '' : 'animate-pulse'}`}
          />
        ) : success ? (
          <Check className="w-3.5 h-3.5 shrink-0" />
        ) : null}
        {children}
      </span>
    </button>
  );
};

/**
 * LiquidSurface
 * Clean editorial container with calibrated depth and optional cursor-reactive ambient illumination.
 */
export const LiquidSurface: React.FC<{
  variant?: 'white' | 'warm' | 'subtle' | 'dark' | 'intelligence';
  interactiveGlow?: boolean;
  backgroundLayer?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}> = ({
  variant = 'white',
  interactiveGlow = false,
  backgroundLayer,
  className = '',
  children,
}) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const reduced = useReducedMotion();

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactiveGlow || reduced || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    ref.current.style.setProperty('--bw-lx', `${e.clientX - rect.left}px`);
    ref.current.style.setProperty('--bw-ly', `${e.clientY - rect.top}px`);
  };

  const styles = {
    white: 'bg-[#FFFFFF] border-[#ECECE8] text-[#252525] bw-surface-raised',
    warm: 'bg-[#FAFAF9] border-[#ECECE8] text-[#252525] bw-surface-raised',
    subtle: 'bg-[#F5F5F3] border-[#ECECE8] text-[#252525]',
    dark: 'bg-[#171717] border-[#262626] text-white bw-dark-ambient-glow',
    intelligence: 'border-[#ECECE8] text-[#252525] bw-intelligence-light',
  };

  const glowRgba =
    variant === 'dark' ? 'rgba(255, 116, 23, 0.14)' : 'rgba(255, 116, 23, 0.08)';

  return (
    <div
      ref={ref}
      onMouseMove={interactiveGlow ? handleMouseMove : undefined}
      className={`group/surface relative rounded-[20px] border transition-colors duration-200 ${styles[variant]} ${className}`}
    >
      {backgroundLayer}
      {interactiveGlow && !reduced && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 group-hover/surface:opacity-100 transition-opacity duration-300"
          style={{
            background: `radial-gradient(280px circle at var(--bw-lx, 50%) var(--bw-ly, 20%), ${glowRgba}, transparent 70%)`,
          }}
        />
      )}
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
};

/**
 * LiquidLoader
 * Refined shimmer skeleton indicator + warm intelligence pulse replacing generic circular spinners.
 */
export const LiquidLoader: React.FC<{
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
}> = ({ label, size = 'md', className = '' }) => {
  const barWidth = size === 'sm' ? 'w-14' : 'w-24';
  const barHeight = size === 'sm' ? 'h-1.5' : 'h-2';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`inline-flex items-center gap-2.5 ${className}`}
    >
      <span className="relative inline-flex w-2.5 h-2.5 items-center justify-center shrink-0" aria-hidden="true">
        <span className="absolute inset-0 rounded-full bg-[#FF7417]/30 bw-orb-halo" />
        <span className="relative w-1.5 h-1.5 rounded-full bg-[#FF7417]" />
      </span>
      <span className="inline-flex items-center gap-1.5" aria-hidden="true">
        <span className={`block ${barWidth} ${barHeight} rounded-full bw-skeleton-wave-accent`} />
        <span className={`block w-8 ${barHeight} rounded-full bw-skeleton-wave`} />
      </span>
      {label && <span className="text-xs font-medium text-[#5C5C58]">{label}</span>}
    </div>
  );
};

/**
 * FluidProgress
 * Precision progress bar with optional subtle fluid highlight sweep.
 */
export const FluidProgress: React.FC<{
  value: number;
  label?: string;
  showPercent?: boolean;
  size?: 'sm' | 'md';
  activeShimmer?: boolean;
  dark?: boolean;
  tone?: 'accent' | 'neutral';
}> = ({
  value,
  label,
  showPercent = true,
  size = 'md',
  activeShimmer = false,
  dark = false,
  tone = 'accent',
}) => {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const reduced = useReducedMotion();

  const fillClass =
    tone === 'neutral'
      ? dark
        ? 'bg-white'
        : 'bg-[#171717]'
      : 'bg-gradient-to-r from-[#FF7417] via-[#FF9A45] to-[#FF7417]';

  return (
    <div className="w-full">
      {(label || showPercent) && (
        <div className="flex items-center justify-between text-xs mb-1.5">
          {label && (
            <span className={dark ? 'text-[#A8A8A2]' : 'text-[#5C5C58]'}>{label}</span>
          )}
          {showPercent && (
            <span
              className={`font-mono-num font-medium tabular-nums ${
                dark ? 'text-white' : 'text-[#171717]'
              }`}
            >
              {clamped}%
            </span>
          )}
        </div>
      )}
      <div
        className={`relative w-full rounded-full overflow-hidden ${
          dark ? 'bg-[#252525]' : 'bg-[#EFEFEB] bw-surface-inset'
        } ${size === 'sm' ? 'h-1.5' : 'h-2'}`}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`relative h-full ${fillClass} rounded-full transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden`}
          style={{ width: `${clamped}%` }}
        >
          {activeShimmer && !reduced && clamped > 0 && clamped < 100 && (
            <span
              aria-hidden="true"
              className="absolute inset-y-0 w-16 bg-gradient-to-r from-transparent via-white/40 to-transparent bw-liquid-shimmer"
            />
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * AnimatedMetric
 * Clean numeric interpolation with tabular-nums, zero jitter, instant under reduced-motion.
 */
export const AnimatedMetric: React.FC<{
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}> = ({ value, prefix = '', suffix = '', decimals = 0, className = '' }) => {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState<number>(value);
  const prevRef = useRef<number>(value);

  useEffect(() => {
    if (reduced) {
      setDisplay(value);
      prevRef.current = value;
      return;
    }

    const from = prevRef.current;
    const to = value;
    if (from === to) return;

    let rafId = 0;
    const start = performance.now();
    const duration = 420;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + (to - from) * eased);
      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        setDisplay(to);
        prevRef.current = to;
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      prevRef.current = to;
    };
  }, [value, reduced]);

  const formatted =
    decimals > 0 ? display.toFixed(decimals) : Math.round(display).toLocaleString();

  return (
    <span className={`tabular-nums ${className}`}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
};

/**
 * SuccessTransition
 * Subtle check-reveal confirmation motif for completed steps, sprints, and save feedback.
 */
export const SuccessTransition: React.FC<{
  label?: string;
  compact?: boolean;
  className?: string;
}> = ({ label, compact = false, className = '' }) => {
  const reduced = useReducedMotion();

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.24, ease: BW_EASE }}
      className={`inline-flex items-center gap-2 ${className}`}
    >
      <span
        className={`relative inline-flex items-center justify-center rounded-full bg-[#ECF7F1] border border-[#CEE8DA] text-[#24724E] shrink-0 ${
          compact ? 'w-5 h-5' : 'w-7 h-7'
        }`}
      >
        <motion.svg
          viewBox="0 0 16 16"
          className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'}
          fill="none"
          aria-hidden="true"
        >
          <motion.path
            d="M3.2 8.4L6.4 11.4L12.8 4.8"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={reduced ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.3, ease: BW_EASE }}
          />
        </motion.svg>
      </span>
      {label && <span className="text-xs font-medium text-[#24724E]">{label}</span>}
    </motion.div>
  );
};

/**
 * InteractiveNode
 * Precision coordinate / constellation node with tactile hover highlight and subtle active sonar ring.
 */
export const InteractiveNode: React.FC<{
  x: number;
  y: number;
  label: string;
  sublabel?: string;
  active?: boolean;
  accent?: boolean;
  dark?: boolean;
  onClick?: () => void;
  onPointerDown?: (e: React.PointerEvent<HTMLButtonElement>) => void;
  className?: string;
}> = ({
  x,
  y,
  label,
  sublabel,
  active = false,
  accent = false,
  dark = false,
  onClick,
  onPointerDown,
  className = '',
}) => {
  const reduced = useReducedMotion();

  return (
    <button
      type="button"
      onClick={onClick}
      onPointerDown={onPointerDown}
      style={{ left: `${x}%`, top: `${y}%` }}
      className={`group/node absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center rounded-full focus-ring ${dark ? 'focus-ring-dark' : ''} cursor-pointer ${className}`}
    >
      <span className="relative flex items-center justify-center">
        {(active || accent) && !reduced && (
          <span
            aria-hidden="true"
            className="absolute -inset-2 rounded-full bg-[#FF7417]/20 bw-orb-halo"
          />
        )}
        <span
          className={`relative rounded-full border-2 transition-transform duration-150 group-hover/node:scale-125 ${
            accent
              ? 'w-4 h-4 bg-[#FF7417] border-[#FFFFFF] shadow-[0_0_14px_rgba(255,116,23,0.55)]'
              : active
              ? 'w-3.5 h-3.5 bg-[#FF9A45] border-[#FFFFFF] shadow-[0_0_10px_rgba(255,116,23,0.4)]'
              : dark
              ? 'w-3 h-3 bg-[#A8A8A2] border-[#171717] group-hover/node:bg-[#FF7417]'
              : 'w-3 h-3 bg-[#252525] border-[#FFFFFF] shadow-xs group-hover/node:bg-[#FF7417]'
          }`}
        />
      </span>
      <span
        className={`mt-1.5 px-2 py-0.5 rounded-[6px] text-[10px] font-medium whitespace-nowrap transition-colors border ${
          accent
            ? 'bg-[#171717] text-white border-[#171717] shadow-sm'
            : active
            ? 'bg-[#FFF0E5] text-[#C44D00] border-[#FFD3B3]'
            : dark
            ? 'bg-[#252525]/90 text-[#E6E6E2] border-[#383838]'
            : 'bg-[#FFFFFF]/95 text-[#252525] border-[#E6E6E2] shadow-xs group-hover/node:border-[#FF7417]'
        }`}
      >
        {label}
        {sublabel ? ` · ${sublabel}` : ''}
      </span>
    </button>
  );
};

/**
 * NeuralNetworkAnimation
 * Abstract intelligence network visualization using graphite/white nodes, fine topographic lines,
 * and subtle central orange illumination. Runs on a lightweight Canvas + ResizeObserver with zero
 * 60Hz React state churn and clean reduced-motion fallback.
 */
export const NeuralNetworkAnimation: React.FC<{
  mode?: 'calm' | 'synthesizing' | 'convergence';
  dark?: boolean;
  height?: number;
  className?: string;
  label?: string;
}> = ({
  mode = 'calm',
  dark = false,
  height = 200,
  className = '',
  label = 'Business Brain neural synthesis canvas',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const reduced = useReducedMotion();
  const modeRef = useRef(mode);
  modeRef.current = mode;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const nodes = Array.from({ length: 22 }, (_, idx) => {
      const angle = (idx / 22) * Math.PI * 2;
      const radiusFactor = 0.18 + ((idx * 37) % 60) / 100;
      return {
        angle,
        speed: (idx % 2 === 0 ? 1 : -1) * (0.002 + ((idx % 5) * 0.0007)),
        radiusFactor,
        size: idx % 5 === 0 ? 2.6 : 1.7,
        isOrange: idx === 0 || idx === 7 || idx === 14,
      };
    });

    let width = 320;
    let rafId = 0;
    let frame = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0) return;
      width = rect.width;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const ro = new ResizeObserver(() => resize());
    ro.observe(canvas);

    const drawFrame = () => {
      const activeMode = modeRef.current;
      const speedMult = activeMode === 'synthesizing' ? 2.4 : activeMode === 'convergence' ? 1.5 : 0.75;
      const cx = width / 2;
      const cy = height / 2;
      const maxR = Math.min(width * 0.44, height * 0.44);

      ctx.clearRect(0, 0, width, height);

      // Subtle concentric intelligence guide rings
      ctx.save();
      [0.38, 0.68, 0.96].forEach((r) => {
        ctx.beginPath();
        ctx.arc(cx, cy, maxR * r, 0, Math.PI * 2);
        ctx.strokeStyle = dark ? 'rgba(255,255,255,0.06)' : 'rgba(37,37,37,0.06)';
        ctx.lineWidth = 1;
        ctx.stroke();
      });
      ctx.restore();

      const coords = nodes.map((n, i) => {
        const theta = n.angle + frame * n.speed * speedMult;
        const radialWobble =
          activeMode === 'convergence'
            ? 0.76 + Math.sin(frame * 0.02 + i) * 0.08
            : 1 + Math.sin(frame * 0.014 + i) * 0.08;
        const r = maxR * n.radiusFactor * radialWobble;
        return {
          x: cx + Math.cos(theta) * r * 1.45,
          y: cy + Math.sin(theta) * r,
          size: n.size,
          isOrange: n.isOrange,
        };
      });

      // Interconnecting edges
      for (let i = 0; i < coords.length; i++) {
        const a = coords[i];
        // Connect to center core when close or synthesizing
        const distCenter = Math.hypot(a.x - cx, a.y - cy);
        if (distCenter < maxR * 0.92) {
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(a.x, a.y);
          ctx.strokeStyle = a.isOrange
            ? 'rgba(255, 116, 23, 0.28)'
            : dark
            ? 'rgba(255, 255, 255, 0.09)'
            : 'rgba(37, 37, 37, 0.09)';
          ctx.lineWidth = a.isOrange ? 1.15 : 0.8;
          ctx.stroke();
        }

        for (let j = i + 1; j < coords.length; j++) {
          const b = coords[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < 84) {
            const alpha = (1 - d / 84) * (activeMode === 'synthesizing' ? 0.22 : 0.14);
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle =
              a.isOrange || b.isOrange
                ? `rgba(255, 116, 23, ${alpha * 1.45})`
                : dark
                ? `rgba(255, 255, 255, ${alpha})`
                : `rgba(37, 37, 37, ${alpha})`;
            ctx.lineWidth = 0.85;
            ctx.stroke();
          }
        }
      }

      // Outer nodes
      coords.forEach((pt) => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fillStyle = pt.isOrange
          ? '#FF9A45'
          : dark
          ? 'rgba(255,255,255,0.68)'
          : 'rgba(37,37,37,0.62)';
        ctx.fill();
      });

      // Central illuminated Business Brain core
      const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, 26);
      glow.addColorStop(0, 'rgba(255, 116, 23, 0.42)');
      glow.addColorStop(0.55, 'rgba(255, 154, 69, 0.12)');
      glow.addColorStop(1, 'rgba(255, 116, 23, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, 26, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx, cy, 4.8, 0, Math.PI * 2);
      ctx.fillStyle = '#FF7417';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = dark ? '#171717' : '#FFFFFF';
      ctx.stroke();
    };

    drawFrame();

    if (!reduced) {
      const loop = () => {
        if (!document.hidden) {
          frame += 1;
          drawFrame();
        }
        rafId = requestAnimationFrame(loop);
      };
      rafId = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, [dark, height, reduced]);

  const canvasId = useId();

  return (
    <div
      className={`relative w-full overflow-hidden rounded-[12px] ${className}`}
      style={{ height }}
      data-testid="neural-network-canvas"
    >
      <canvas
        id={canvasId}
        ref={canvasRef}
        role="img"
        aria-label={label}
        className="w-full h-full block"
      />
    </div>
  );
};

/**
 * DepartmentTransition
 * Calm spatial crossfade for switching between BrainWise departments without layout jitter.
 */
export const DepartmentTransition: React.FC<{
  routeKey: string;
  children: React.ReactNode;
}> = ({ routeKey, children }) => {
  const reduced = useReducedMotion();

  if (reduced) {
    return <div key={routeKey}>{children}</div>;
  }

  return (
    <motion.div
      key={routeKey}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.18, ease: BW_EASE }}
    >
      {children}
    </motion.div>
  );
};

/**
 * AiRequestPulse
 * Restrained orange light propagation band rendered during active AI request submission & processing.
 */
export const AiRequestPulse: React.FC<{
  active: boolean;
  label?: string;
  className?: string;
}> = ({ active, label = 'Synthesizing from Business Brain…', className = '' }) => {
  const reduced = useReducedMotion();
  if (!active) return null;

  return (
    <motion.div
      role="status"
      aria-live="polite"
      initial={reduced ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduced ? undefined : { opacity: 0 }}
      transition={{ duration: 0.2, ease: BW_EASE }}
      className={`relative overflow-hidden rounded-[16px] border border-[#FFD3B3] bg-[#FFF0E5]/65 px-5 py-3.5 flex items-center justify-between gap-3 ${className}`}
    >
      {!reduced && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 w-32 bg-gradient-to-r from-transparent via-[#FF7417]/20 to-transparent bw-liquid-shimmer"
        />
      )}
      <div className="relative z-10 flex items-center gap-2.5 text-xs font-medium text-[#C44D00]">
        <span className="relative inline-flex w-2.5 h-2.5 items-center justify-center shrink-0" aria-hidden="true">
          {!reduced && <span className="absolute inset-0 rounded-full bg-[#FF7417]/35 bw-orb-halo" />}
          <span className="relative w-2 h-2 rounded-full bg-[#FF7417]" />
        </span>
        <span>{label}</span>
      </div>
      <span className="relative z-10 font-mono-num text-[11px] text-[#858585]">AI Pipeline</span>
    </motion.div>
  );
};

/**
 * LiquidSkeletonBlock
 * Architectural alabaster/obsidian shimmer bone for shape-accurate loading states.
 */
export const LiquidSkeletonBlock: React.FC<{
  tone?: 'light' | 'accent' | 'dark';
  radius?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
  style?: React.CSSProperties;
}> = ({ tone = 'light', radius = 'md', className = '', style }) => {
  const toneClass =
    tone === 'dark'
      ? 'bw-skeleton-wave-dark'
      : tone === 'accent'
      ? 'bw-skeleton-wave-accent'
      : 'bw-skeleton-wave';

  const radiusClass =
    radius === 'full'
      ? 'rounded-full'
      : radius === 'xl'
      ? 'rounded-[22px]'
      : radius === 'lg'
      ? 'rounded-[16px]'
      : radius === 'sm'
      ? 'rounded-[8px]'
      : 'rounded-[12px]';

  return <div aria-hidden="true" className={`${toneClass} ${radiusClass} ${className}`} style={style} />;
};

/**
 * LiquidSkeletonReveal
 * Smoothly morphs from a shape-matched skeleton surface into fetched content using
 * BrainWise's liquid easing curve and subtle blur-dissolve settle.
 */
export const LiquidSkeletonReveal: React.FC<{
  loading: boolean;
  skeleton: React.ReactNode;
  children: React.ReactNode;
  contentKey?: string;
  statusLabel?: string;
  className?: string;
}> = ({
  loading,
  skeleton,
  children,
  contentKey = 'content',
  statusLabel = 'Loading workspace content',
  className = '',
}) => {
  const reduced = useReducedMotion();

  if (reduced) {
    return (
      <div className={className} aria-busy={loading}>
        {loading ? (
          <div role="status" aria-live="polite" aria-label={statusLabel}>
            {skeleton}
          </div>
        ) : (
          children
        )}
      </div>
    );
  }

  return (
    <div className={className} aria-busy={loading}>
      <AnimatePresence mode="wait" initial={false}>
        {loading ? (
          <motion.div
            key="bw-skeleton-state"
            role="status"
            aria-live="polite"
            aria-label={statusLabel}
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.18, ease: BW_EASE } }}
            exit={{ opacity: 0, scale: 0.995, transition: { duration: 0.14, ease: BW_EASE } }}
          >
            {skeleton}
          </motion.div>
        ) : (
          <motion.div
            key={`bw-content-${contentKey}`}
            initial={{ opacity: 0, y: 8, scale: 0.995, filter: 'blur(3px)' }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              filter: 'blur(0px)',
              transition: { duration: 0.32, ease: BW_EASE },
            }}
            exit={{ opacity: 0, y: -2, transition: { duration: 0.12, ease: BW_EASE } }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/**
 * ProgressiveResultReveal
 * Staggered reveal for generated insights, dossier blocks, and recommendations.
 */
export const ProgressiveResultReveal: React.FC<{
  index?: number;
  children: React.ReactNode;
  className?: string;
}> = ({ index = 0, children, className = '' }) => {
  const reduced = useReducedMotion();
  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, delay: Math.min(index * 0.055, 0.35), ease: BW_EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/**
 * InsightSavedBeacon
 * Tactile orange confirmation motif when saving an insight, report, or strategy to Business Brain.
 */
export const InsightSavedBeacon: React.FC<{
  saved: boolean;
  label?: string;
  className?: string;
}> = ({ saved, label, className = '' }) => {
  const reduced = useReducedMotion();
  return (
    <motion.span
      animate={reduced ? undefined : saved ? { scale: [1, 1.05, 1] } : { scale: 1 }}
      transition={{ duration: 0.24, ease: BW_EASE }}
      className={`inline-flex items-center gap-1.5 text-xs font-medium ${
        saved ? 'text-[#24724E]' : 'text-[#5C5C58]'
      } ${className}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full transition-colors ${
          saved ? 'bg-[#24724E]' : 'bg-[#D6D6D0]'
        }`}
      />
      {label && <span>{label}</span>}
    </motion.span>
  );
};

/**
 * RecommendationActionSurface
 * Micro-deformation container for executing or dismissing an AI recommendation with restrained orange light.
 */
export const RecommendationActionSurface: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => {
  const reduced = useReducedMotion();

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduced ? undefined : { opacity: 0, x: 10 }}
      whileHover={reduced ? undefined : { y: -1 }}
      transition={{ duration: 0.18, ease: BW_EASE }}
      className={`relative transition-colors ${className}`}
    >
      {children}
    </motion.div>
  );
};

/**
 * TaskCompleteRowTransition
 * Smooth inline state feedback row when completing or reopening growth sprint tasks.
 */
export const TaskCompleteRowTransition: React.FC<{
  completed: boolean;
  children: React.ReactNode;
  className?: string;
}> = ({ completed, children, className = '' }) => {
  const reduced = useReducedMotion();

  return (
    <motion.div
      animate={reduced ? undefined : { opacity: completed ? 0.72 : 1 }}
      transition={{ duration: 0.2, ease: BW_EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/**
 * ActionFeedbackBanner
 * Explicit inline feedback surface for loading, success, or error recovery without intrusive popups.
 */
export const ActionFeedbackBanner: React.FC<{
  tone: 'success' | 'error' | 'processing';
  title: string;
  detail?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}> = ({ tone, title, detail, actionLabel, onAction, className = '' }) => {
  const reduced = useReducedMotion();
  const toneStyles =
    tone === 'success'
      ? 'border-[#CEE8DA] bg-[#ECF7F1]/75 text-[#24724E]'
      : tone === 'error'
      ? 'border-[#F5CECE] bg-[#FDF0F0] text-[#BC3E3E]'
      : 'border-[#FFD3B3] bg-[#FFF0E5]/70 text-[#C44D00]';

  return (
    <motion.div
      role={tone === 'error' ? 'alert' : 'status'}
      initial={reduced ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: BW_EASE }}
      className={`rounded-[16px] border px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs ${toneStyles} ${className}`}
    >
      <div className="min-w-0">
        <span className="font-semibold">{title}</span>
        {detail && <span className="ml-2 opacity-85">{detail}</span>}
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="font-semibold underline underline-offset-4 hover:opacity-80 shrink-0 cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </motion.div>
  );
};

export interface ConstellationNodeData {
  id: string;
  index: string;
  label: string;
  role: string;
  receives: string;
  emits: string;
  x: number;
  y: number;
  radius: number;
  isCore?: boolean;
}

const CONSTELLATION_NODES: ConstellationNodeData[] = [
  {
    id: 'brain',
    index: '00',
    label: 'Business Brain',
    role: 'Central Memory Core',
    receives: 'Approved dossiers, strategy decisions & brand rules',
    emits: 'Unified company context to all 5 workflows',
    x: 50,
    y: 50,
    radius: 22,
    isCore: true,
  },
  {
    id: 'idea',
    index: '01',
    label: 'Idea Intelligence',
    role: 'Validation & Sizing',
    receives: 'Business Brain industry, stage & customer profile',
    emits: '15-section dossier & TAM/SAM/SOM assumptions',
    x: 20,
    y: 23,
    radius: 13,
  },
  {
    id: 'competitive',
    index: '02',
    label: 'Competitive Intel',
    role: 'Rivals & White Space',
    receives: 'Validated customer pain points & price tiers',
    emits: 'Positioning map coordinates & battlecards',
    x: 80,
    y: 24,
    radius: 14,
  },
  {
    id: 'brand',
    index: '03',
    label: 'Brand Studio',
    role: 'Identity & Assets',
    receives: 'Differentiation wedge & target customer tone',
    emits: 'Wordmark, surface tokens & campaign collateral',
    x: 82,
    y: 74,
    radius: 13,
  },
  {
    id: 'planner',
    index: '04',
    label: 'Growth Planner',
    role: 'Goals & Weekly Sprint',
    receives: 'Validated experiments, brand kits & team capacity',
    emits: 'Prioritized daily tasks & 30/60/90 roadmap',
    x: 50,
    y: 86,
    radius: 11,
  },
  {
    id: 'watch',
    index: '05',
    label: 'Market Watch',
    role: 'Signal Triggers',
    receives: 'Tracked rivals & monitoring cadence rules',
    emits: 'Counter-test experiments & strategic alerts',
    x: 18,
    y: 72,
    radius: 12,
  },
];

const CONSTELLATION_EDGES: [string, string][] = [
  ['brain', 'idea'],
  ['brain', 'competitive'],
  ['brain', 'brand'],
  ['brain', 'planner'],
  ['brain', 'watch'],
  ['idea', 'competitive'],
  ['competitive', 'brand'],
  ['brand', 'planner'],
  ['watch', 'planner'],
  ['watch', 'competitive'],
];

/**
 * NeuralConstellationSignature
 * Tactile Swiss-editorial node-and-hairline sculpture honoring architectural minimalism:
 * matte charcoal 3D-shaded nodes connected by razor-thin lines around one orange Business Brain anchor.
 */
export const NeuralConstellationSignature: React.FC<{
  className?: string;
  onExploreDemo?: () => void;
}> = ({ className = '', onExploreDemo }) => {
  const reduced = useReducedMotion();
  const [selectedId, setSelectedId] = useState<string>('brain');
  const activeNode =
    CONSTELLATION_NODES.find((n) => n.id === selectedId) ?? CONSTELLATION_NODES[0];

  const isEdgeHighlighted = (a: string, b: string) => a === selectedId || b === selectedId;

  return (
    <div
      className={`relative rounded-[24px] border border-[#ECECE8] bg-[#FFFFFF] bw-surface-elevated p-6 sm:p-7 flex flex-col justify-between overflow-hidden ${className}`}
    >
      <div className="flex items-center justify-between gap-2 pb-4 border-b border-[#F1F1EF]">
        <span className="text-[11px] font-mono-num text-[#858585] tracking-wide">
          SYSTEM MAP · {activeNode.index}
        </span>
        <span className="text-[11px] text-[#858585]">Select any node</span>
      </div>

      {/* Sculptural Node Graph Stage */}
      <div className="relative w-full h-[270px] sm:h-[300px] my-3 select-none">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full pointer-events-none"
          aria-hidden="true"
        >
          {/* Delicate Concentric Architectural Orbits */}
          <circle
            cx="50"
            cy="50"
            r="22"
            fill="none"
            stroke="#EFEFEB"
            strokeWidth="0.35"
          />
          <circle
            cx="50"
            cy="50"
            r="36"
            fill="none"
            stroke="#E8E8E4"
            strokeWidth="0.35"
            strokeDasharray="1.2 1.6"
          />
          <circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke="#F3F3F0"
            strokeWidth="0.3"
          />

          {CONSTELLATION_EDGES.map(([fromId, toId]) => {
            const from = CONSTELLATION_NODES.find((n) => n.id === fromId)!;
            const to = CONSTELLATION_NODES.find((n) => n.id === toId)!;
            const hot = isEdgeHighlighted(fromId, toId);
            return (
              <line
                key={`${fromId}-${toId}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={hot ? '#FF7417' : '#252525'}
                strokeOpacity={hot ? 0.78 : 0.14}
                strokeWidth={hot ? 0.55 : 0.3}
              />
            );
          })}
        </svg>

        {/* Sculptural Matte Charcoal / Orange Nodes */}
        {CONSTELLATION_NODES.map((node) => {
          const isSelected = node.id === selectedId;
          const sizePx = node.isCore ? 44 : Math.round(node.radius * 2);
          return (
            <button
              key={node.id}
              type="button"
              onClick={() => setSelectedId(node.id)}
              onMouseEnter={() => setSelectedId(node.id)}
              aria-pressed={isSelected}
              aria-label={`Inspect ${node.label} node`}
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
              className="group absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center rounded-full focus-ring cursor-pointer"
            >
              <motion.span
                animate={
                  reduced
                    ? undefined
                    : isSelected
                    ? { scale: 1.08 }
                    : { scale: 1 }
                }
                transition={{ duration: 0.2, ease: BW_EASE }}
                style={{
                  width: sizePx,
                  height: sizePx,
                  background: node.isCore
                    ? 'radial-gradient(circle at 34% 30%, #FF9A45 0%, #FF7417 55%, #C44D00 100%)'
                    : 'radial-gradient(circle at 34% 30%, #444440 0%, #1C1C1A 60%, #10100F 100%)',
                  boxShadow: isSelected
                    ? node.isCore
                      ? '0 12px 28px rgba(255, 116, 23, 0.34), 0 0 0 5px rgba(255, 116, 23, 0.12)'
                      : '0 12px 24px rgba(23, 23, 23, 0.2), 0 0 0 3px rgba(255, 116, 23, 0.28)'
                    : '0 8px 18px rgba(23, 23, 23, 0.14)',
                }}
                className="rounded-full flex items-center justify-center transition-shadow"
              >
                <span className="font-mono-num text-[9px] font-semibold text-white/85">
                  {node.index}
                </span>
              </motion.span>
              <span
                className={`mt-1.5 text-[11px] font-medium whitespace-nowrap transition-colors px-2 py-0.5 rounded-full ${
                  isSelected
                    ? 'bg-[#FAFAF9] text-[#171717] border border-[#E8E8E4] shadow-xs font-semibold'
                    : 'text-[#686864] group-hover:text-[#171717]'
                }`}
              >
                {node.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Unboxed Clean Selected Node Readout */}
      <div className="pt-4 border-t border-[#F1F1EF] space-y-3 text-xs">
        <div className="flex items-center justify-between gap-2">
          <div className="font-heading text-sm font-semibold text-[#171717]">
            {activeNode.index}. {activeNode.label}
          </div>
          <span className="font-mono-num text-[11px] text-[#C44D00]">{activeNode.role}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div>
            <span className="block text-[10px] uppercase tracking-wider text-[#858585]">Reads from system</span>
            <span className="text-xs text-[#252525] leading-relaxed block mt-1">
              {activeNode.receives}
            </span>
          </div>
          <div>
            <span className="block text-[10px] uppercase tracking-wider text-[#C44D00]">Feeds downstream</span>
            <span className="text-xs text-[#252525] leading-relaxed block mt-1">
              {activeNode.emits}
            </span>
          </div>
        </div>
        {onExploreDemo && (
          <div className="pt-1 flex justify-end">
            <button
              type="button"
              onClick={onExploreDemo}
              className="text-xs font-medium text-[#5C5C58] hover:text-[#C44D00] transition-colors cursor-pointer"
            >
              Inspect live workspace →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

