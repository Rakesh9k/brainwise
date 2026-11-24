import React, { useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { BW_EASE } from '../../motion/LiquidMotion';

export interface StrategicInsightCardProps {
  children: React.ReactNode;
  spotlightColor?: string;
  className?: string;
  onClick?: () => void;
}

export const StrategicInsightCard: React.FC<StrategicInsightCardProps> = ({
  children,
  spotlightColor = 'rgba(255, 116, 23, 0.08)',
  className = '',
  onClick,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const reduced = useReducedMotion();

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reduced || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setCoords({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      whileHover={reduced || !onClick ? undefined : { y: -2 }}
      transition={{ duration: 0.18, ease: BW_EASE }}
      className={`group relative overflow-hidden rounded-[16px] border border-[#E6E6E2] bg-[#FFFFFF] transition-all shadow-xs ${
        onClick ? 'cursor-pointer hover:border-[#D6D6D0] hover:shadow-md' : ''
      } ${className}`}
    >
      {/* Dynamic ambient spotlight */}
      {!reduced && isHovered && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-px rounded-[16px] transition-opacity duration-300"
          style={{
            background: `radial-gradient(400px circle at ${coords.x}px ${coords.y}px, ${spotlightColor}, transparent 70%)`,
          }}
        />
      )}

      {/* Internal Content */}
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
};
