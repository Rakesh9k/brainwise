import React, { useEffect, useRef, useState } from 'react';
import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'motion/react';

/* ── Liquid Ambient SVG Background Mesh ────────────────────────────────── */
export const LiquidAmbientCanvas: React.FC<{ className?: string }> = ({ className = '' }) => {
  const reduced = useReducedMotion();

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      {/* Top warm ambient radial field */}
      <div
        className="absolute -top-32 left-1/2 -translate-x-1/2 w-[1100px] h-[540px] rounded-full opacity-75 blur-3xl bw-liquid-blob"
        style={{
          background:
            'radial-gradient(ellipse at 50% 45%, rgba(255, 116, 23, 0.14) 0%, rgba(255, 240, 229, 0.55) 45%, rgba(255, 255, 255, 0) 75%)',
        }}
      />

      {/* Secondary organic warm stone field */}
      <div
        className="absolute top-36 -right-40 w-[560px] h-[560px] rounded-full opacity-70 blur-3xl bw-liquid-blob"
        style={{
          animationDelay: '-6s',
          background:
            'radial-gradient(circle at 50% 50%, rgba(236, 236, 233, 0.95) 0%, rgba(255, 116, 23, 0.07) 52%, rgba(255, 255, 255, 0) 76%)',
        }}
      />

      {/* Organic morphing geometric contour lines */}
      <svg
        viewBox="0 0 1440 640"
        className="w-full h-full opacity-[0.34]"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        <motion.path
          d="M-80 340 C 220 180, 520 480, 860 280 C 1140 120, 1320 260, 1520 180"
          stroke="#FF7417"
          strokeOpacity="0.22"
          strokeWidth="1.25"
          animate={
            reduced
              ? undefined
              : {
                  d: [
                    'M-80 340 C 220 180, 520 480, 860 280 C 1140 120, 1320 260, 1520 180',
                    'M-80 280 C 260 410, 540 190, 880 330 C 1160 440, 1310 190, 1520 250',
                    'M-80 340 C 220 180, 520 480, 860 280 C 1140 120, 1320 260, 1520 180',
                  ],
                }
          }
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.path
          d="M-60 420 C 310 510, 620 240, 940 390 C 1200 500, 1340 340, 1520 390"
          stroke="#242424"
          strokeOpacity="0.07"
          strokeWidth="1"
          animate={
            reduced
              ? undefined
              : {
                  d: [
                    'M-60 420 C 310 510, 620 240, 940 390 C 1200 500, 1340 340, 1520 390',
                    'M-60 460 C 280 320, 650 470, 970 310 C 1220 190, 1360 400, 1520 330',
                    'M-60 420 C 310 510, 620 240, 940 390 C 1200 500, 1340 340, 1520 390',
                  ],
                }
          }
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
        />
      </svg>
    </div>
  );
};

/* ── Kinetic Expressive Display Headline ───────────────────────────────── */
export const KineticHeadline: React.FC<{
  lines: { text: string; accent?: boolean }[];
  className?: string;
}> = ({ lines, className = '' }) => {
  const reduced = useReducedMotion();
  const containerRef = useRef<HTMLHeadingElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  });
  const shiftLineA = useTransform(scrollYProgress, [0, 1], [0, -18]);
  const shiftLineB = useTransform(scrollYProgress, [0, 1], [0, 22]);

  return (
    <h1
      ref={containerRef}
      className={`font-heading font-extrabold tracking-[-0.035em] leading-[1.02] text-[#242424] text-balance ${className}`}
      style={{ fontSize: 'clamp(2.5rem, 5.2vw, 4.5rem)' }}
    >
      {lines.map((line, lineIdx) => {
        const words = line.text.split(' ');
        const xMotion = lineIdx % 2 === 0 ? shiftLineA : shiftLineB;
        return (
          <motion.span
            key={line.text}
            style={reduced ? undefined : { x: xMotion }}
            className="block"
          >
            {words.map((word, wordIdx) => (
              <motion.span
                key={`${lineIdx}-${wordIdx}-${word}`}
                initial={reduced ? false : { opacity: 0.72, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.36,
                  delay: (lineIdx * 3 + wordIdx) * 0.04,
                  ease: [0.16, 1, 0.3, 1],
                }}
                whileHover={
                  reduced
                    ? undefined
                    : {
                        y: -2,
                        transition: { duration: 0.16, ease: [0.16, 1, 0.3, 1] },
                      }
                }
                className={`inline-block mr-[0.24em] last:mr-0 transition-colors duration-150 ${
                  line.accent ? 'text-[#FF7417]' : 'hover:text-[#FF7417]'
                }`}
              >
                {word}
              </motion.span>
            ))}
          </motion.span>
        );
      })}
    </h1>
  );
};

/* ── Magnetic Cursor-Attracted Button ──────────────────────────────────── */
export const MagneticButton: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'dark';
  type?: 'button' | 'submit';
  className?: string;
  ariaLabel?: string;
}> = ({
  children,
  onClick,
  variant = 'primary',
  type = 'button',
  className = '',
  ariaLabel,
}) => {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLButtonElement>(null);
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, { stiffness: 360, damping: 24, mass: 0.4 });
  const y = useSpring(rawY, { stiffness: 360, damping: 24, mass: 0.4 });

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (reduced || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const relX = e.clientX - rect.left - rect.width / 2;
    const relY = e.clientY - rect.top - rect.height / 2;
    rawX.set(Math.max(-8, Math.min(8, relX * 0.16)));
    rawY.set(Math.max(-6, Math.min(6, relY * 0.2)));
  };

  const handleMouseLeave = () => {
    rawX.set(0);
    rawY.set(0);
  };

  const styles =
    variant === 'primary'
      ? 'bg-[#FF7417] hover:bg-[#E55F08] text-white shadow-[0_6px_20px_-6px_rgba(255,116,23,0.42)] hover:shadow-[0_12px_28px_-8px_rgba(229,95,8,0.48)]'
      : variant === 'dark'
      ? 'bg-[#171717] hover:bg-[#242424] text-white shadow-[0_6px_20px_-8px_rgba(23,23,23,0.35)]'
      : 'bg-[#FFFFFF] hover:bg-[#FAFAF9] text-[#242424] border border-[#E8E8E4] bw-tactile-pill';

  return (
    <motion.button
      ref={ref}
      type={type}
      aria-label={ariaLabel}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={reduced ? undefined : { x, y }}
      whileTap={reduced ? undefined : { scale: 0.97 }}
      className={`group relative overflow-hidden inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold rounded-full transition-colors duration-150 whitespace-nowrap shrink-0 focus-ring cursor-pointer ${styles} ${className}`}
    >
      {children}
    </motion.button>
  );
};

/* ── Self-Drawing SVG Icon (draws into filled state on scroll) ─────────── */
export const SelfDrawingSvg: React.FC<{
  paths: string[];
  fillPath?: string;
  active?: boolean;
  className?: string;
}> = ({ paths, fillPath, active = false, className = 'w-5 h-5' }) => {
  const reduced = useReducedMotion();
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.35 });

  return (
    <svg
      ref={ref}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {fillPath && (
        <motion.path
          d={fillPath}
          fill="#FF7417"
          initial={{ opacity: active ? 0.24 : 0.1 }}
          animate={{ opacity: active ? 0.28 : inView ? 0.14 : 0.08 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      )}
      {paths.map((d, i) => (
        <motion.path
          key={d}
          d={d}
          stroke="currentColor"
          strokeWidth={1.85}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={reduced ? false : { pathLength: 0.2, opacity: 0.6 }}
          animate={
            reduced || inView
              ? { pathLength: 1, opacity: 1 }
              : { pathLength: 0.2, opacity: 0.6 }
          }
          transition={{
            duration: 0.7,
            delay: i * 0.08,
            ease: [0.16, 1, 0.3, 1],
          }}
        />
      ))}
    </svg>
  );
};

/* ── Viewport-Triggered Live Metric Counter ────────────────────────────── */
export const AnimatedCounter: React.FC<{
  value: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}> = ({ value, prefix = '', suffix = '', className = '' }) => {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.35 });
  const [display, setDisplay] = useState(reduced ? value : value);

  useEffect(() => {
    if (reduced || !inView) {
      setDisplay(value);
      return;
    }
    const controls = animate(0, value, {
      duration: 0.95,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => setDisplay(Math.round(latest)),
    });
    return () => controls.stop();
  }, [inView, value, reduced]);

  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
};

/* ── 3D Perspective Pointer-Tilt Device Frame ──────────────────────────── */
export const TiltDeviceFrame: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const rotateX = useSpring(0, { stiffness: 220, damping: 26 });
  const rotateY = useSpring(0, { stiffness: 220, damping: 26 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reduced || !ref.current || window.innerWidth < 1024) return;
    const rect = ref.current.getBoundingClientRect();
    const normX = (e.clientX - rect.left) / rect.width - 0.5;
    const normY = (e.clientY - rect.top) / rect.height - 0.5;
    rotateX.set(-normY * 4.5);
    rotateY.set(normX * 5.5);
  };

  const handleMouseLeave = () => {
    rotateX.set(0);
    rotateY.set(0);
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ perspective: 1300 }}
      className={className}
    >
      <motion.div
        style={
          reduced
            ? undefined
            : {
                rotateX,
                rotateY,
                transformStyle: 'preserve-3d',
              }
        }
      >
        {children}
      </motion.div>
    </div>
  );
};

/* ── Infinite GPU Kinetic Statement Marquee ────────────────────────────── */
export const KineticMarquee: React.FC<{
  items: string[];
  className?: string;
}> = ({ items, className = '' }) => {
  return (
    <div
      className={`overflow-hidden border-y border-[#EFEFEB] bg-[#FAFAF9] py-4 select-none ${className}`}
    >
      <div className="bw-marquee-track">
        {[0, 1].map((dupIdx) => (
          <div
            key={dupIdx}
            aria-hidden={dupIdx === 1}
            className="flex items-center gap-8 pr-8 shrink-0"
          >
            {items.map((item) => (
              <span
                key={`${dupIdx}-${item}`}
                className="inline-flex items-center gap-8 font-heading text-xs sm:text-sm font-semibold tracking-tight text-[#686864] whitespace-nowrap"
              >
                <span>{item}</span>
                <span className="text-[#FF7417]" aria-hidden="true">
                  /
                </span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

/* ── Zero-Broken-Image Resilient Wrapper ───────────────────────────────── */
export const ResilientMedia: React.FC<{
  src: string;
  alt: string;
  fallbackLabel: string;
  lazy?: boolean;
  className?: string;
}> = ({ src, alt, fallbackLabel, lazy = true, className = '' }) => {
  const [errored, setErrored] = useState(false);

  if (errored) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#F5F5F4] via-[#FFF0E5]/60 to-[#ECECE9] text-[#686864] p-6 text-center ${className}`}
      >
        <div className="w-8 h-8 rounded-[8px] border border-[#E6E6E2] bg-white flex items-center justify-center mb-2">
          <span className="w-2.5 h-2.5 rounded-xs bg-[#FF7417]" />
        </div>
        <span className="text-xs font-medium text-[#242424]">{fallbackLabel}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      loading={lazy ? 'lazy' : 'eager'}
      onError={() => setErrored(true)}
      className={className}
    />
  );
};
