/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShieldCheck, CheckCircle2, Calculator, HelpCircle, ExternalLink } from 'lucide-react';
import type { EvidenceClassification } from '../../types/evidence';

interface EvidenceBadgeProps {
  classification: EvidenceClassification;
  confidence?: number;
  sourceTitle?: string;
  sourceUrl?: string;
  onClickInspect?: () => void;
  className?: string;
}

export const EvidenceBadge: React.FC<EvidenceBadgeProps> = ({
  classification,
  confidence,
  sourceTitle,
  sourceUrl,
  onClickInspect,
  className = '',
}) => {
  const getBadgeConfig = () => {
    switch (classification) {
      case 'VERIFIED':
        return {
          label: 'Verified',
          icon: ShieldCheck,
          bgClass: 'bg-[#ECF7F1] text-[#24724E] border-[#24724E]/20',
          dotClass: 'bg-[#24724E]',
        };
      case 'CORROBORATED':
        return {
          label: 'Corroborated',
          icon: CheckCircle2,
          bgClass: 'bg-[#FFF0E5] text-[#C44D00] border-[#FF7417]/20',
          dotClass: 'bg-[#FF7417]',
        };
      case 'ESTIMATED':
        return {
          label: 'Estimated',
          icon: Calculator,
          bgClass: 'bg-[#FDF4EA] text-[#A85E16] border-[#A85E16]/20',
          dotClass: 'bg-[#A85E16]',
        };
      case 'UNVERIFIED':
      default:
        return {
          label: 'Unverified',
          icon: HelpCircle,
          bgClass: 'bg-[#F1F1EF] text-[#5C5C58] border-[#E6E6E2]',
          dotClass: 'bg-[#858585]',
        };
    }
  };

  const { label, icon: Icon, bgClass, dotClass } = getBadgeConfig();
  const formattedConfidence = confidence !== undefined ? `${Math.round(confidence * 100)}%` : null;

  return (
    <div
      onClick={onClickInspect}
      role={onClickInspect ? 'button' : undefined}
      tabIndex={onClickInspect ? 0 : undefined}
      title={sourceTitle ? `Source: ${sourceTitle}` : undefined}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-mono tracking-tight transition-all ${bgClass} ${
        onClickInspect ? 'cursor-pointer hover:shadow-xs hover:brightness-98' : ''
      } ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
      <Icon className="w-3.5 h-3.5" />
      <span className="font-medium">{label}</span>
      {formattedConfidence && (
        <span className="opacity-75 pl-0.5 border-l border-current/20">
          {formattedConfidence}
        </span>
      )}
      {sourceUrl && onClickInspect && (
        <ExternalLink className="w-3 h-3 opacity-60 ml-0.5" />
      )}
    </div>
  );
};
