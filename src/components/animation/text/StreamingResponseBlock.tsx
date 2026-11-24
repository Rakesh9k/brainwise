import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { BW_EASE } from '../../motion/LiquidMotion';

export interface StreamingResponseBlockProps {
  content: string;
  isStreaming?: boolean;
  className?: string;
}

export const StreamingResponseBlock: React.FC<StreamingResponseBlockProps> = ({
  content,
  isStreaming = false,
  className = '',
}) => {
  const reduced = useReducedMotion();

  // Simple, robust text renderer that parses bold and newlines without external heavy markdown engines
  const renderFormatted = (text: string) => {
    const paragraphs = text.split('\n\n');

    return paragraphs.map((para, pIdx) => {
      // Lines within paragraph
      const lines = para.split('\n');

      return (
        <p key={pIdx} className="mb-2.5 last:mb-0 leading-relaxed text-[#252525]">
          {lines.map((line, lIdx) => {
            const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('* ');
            const cleanLine = isBullet ? line.trim().substring(2) : line;

            // Split by bold **
            const parts = cleanLine.split(/(\*\*[^*]+\*\*)/g);

            return (
              <span key={lIdx} className={isBullet ? 'block pl-3 relative my-1' : 'block'}>
                {isBullet && (
                  <span
                    aria-hidden="true"
                    className="absolute left-0 top-2 w-1.5 h-1.5 rounded-full bg-[#FF7417]"
                  />
                )}
                {parts.map((pt, ptIdx) => {
                  if (pt.startsWith('**') && pt.endsWith('**')) {
                    return (
                      <strong key={ptIdx} className="font-bold text-[#171717]">
                        {pt.slice(2, -2)}
                      </strong>
                    );
                  }
                  return <span key={ptIdx}>{pt}</span>;
                })}
              </span>
            );
          })}
        </p>
      );
    });
  };

  return (
    <div className={`relative ${className}`}>
      {renderFormatted(content)}

      {/* Understated terminal streaming cursor */}
      {isStreaming && (
        <motion.span
          aria-hidden="true"
          className="inline-block w-2 h-4 ml-1 bg-[#FF7417] rounded-xs align-middle"
          animate={
            reduced
              ? { opacity: 1 }
              : {
                  opacity: [1, 0, 1],
                }
          }
          transition={{
            duration: 0.8,
            repeat: Infinity,
            ease: BW_EASE,
          }}
        />
      )}
    </div>
  );
};
