/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { X, ExternalLink, Globe, Calendar, Award, Database, Tag } from 'lucide-react';
import { EvidenceBadge } from './EvidenceBadge';
import type { EvidenceFinding } from '../../types/evidence';

interface SourceInspectorDrawerProps {
  finding: EvidenceFinding | null;
  isOpen: boolean;
  onClose: () => void;
}

export const SourceInspectorDrawer: React.FC<SourceInspectorDrawerProps> = ({
  finding,
  isOpen,
  onClose,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !finding) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#171717]/40 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col z-10 border-l border-[#E6E6E2] transform transition-transform duration-300">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#E6E6E2] flex items-center justify-between bg-[#FAFAF9]">
          <div className="space-y-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#FF7417] font-semibold">
              Evidence Engine • Source Inspection
            </span>
            <h3 className="text-base font-semibold text-[#171717] line-clamp-1">
              {finding.sourceTitle}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[#5C5C58] hover:text-[#171717] hover:bg-[#F1F1EF] transition-colors"
            aria-label="Close inspector"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Classification & Confidence Header Card */}
          <div className="p-4 rounded-xl bg-[#FAFAF9] border border-[#E6E6E2] flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-[#5C5C58]">Classification Tier</span>
              <div>
                <EvidenceBadge
                  classification={finding.classification}
                  confidence={finding.evidenceConfidence}
                />
              </div>
            </div>
            <div className="text-right space-y-1">
              <span className="text-xs text-[#5C5C58]">Source Type</span>
              <span className="block text-xs font-mono font-medium text-[#171717] px-2 py-0.5 rounded-md bg-white border border-[#E6E6E2]">
                {finding.sourceType}
              </span>
            </div>
          </div>

          {/* Primary Evidence Excerpt */}
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase tracking-wider text-[#858585] font-semibold">
              Extracted Evidence Excerpt
            </label>
            <blockquote className="p-4 rounded-xl bg-[#FAFAF9] border-l-3 border-[#FF7417] text-sm text-[#252525] italic leading-relaxed">
              "{finding.quoteOrSummary}"
            </blockquote>
          </div>

          {/* Key Metrics if Extracted */}
          {finding.extractedMetrics && Object.keys(finding.extractedMetrics).length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase tracking-wider text-[#858585] font-semibold">
                Captured Data Points
              </label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(finding.extractedMetrics).map(([k, v]) => (
                  <div key={k} className="p-2.5 rounded-lg border border-[#E6E6E2] bg-white">
                    <span className="block text-[11px] font-mono text-[#858585] uppercase">{k}</span>
                    <span className="block text-sm font-semibold text-[#171717] mt-0.5">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metadata Grid */}
          <div className="space-y-3 pt-2 border-t border-[#E6E6E2]">
            <h4 className="text-xs font-mono uppercase tracking-wider text-[#858585] font-semibold">
              Provenance Attributes
            </h4>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-[#F1F1EF]">
                <span className="flex items-center gap-2 text-[#5C5C58]">
                  <Globe className="w-4 h-4 text-[#858585]" /> Geographic Scope
                </span>
                <span className="font-mono font-medium text-[#171717]">{finding.geographicRelevance}</span>
              </div>

              {finding.publicationDate && (
                <div className="flex items-center justify-between py-1.5 border-b border-[#F1F1EF]">
                  <span className="flex items-center gap-2 text-[#5C5C58]">
                    <Calendar className="w-4 h-4 text-[#858585]" /> Published Date
                  </span>
                  <span className="font-mono text-[#171717]">
                    {new Date(finding.publicationDate).toLocaleDateString()}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between py-1.5 border-b border-[#F1F1EF]">
                <span className="flex items-center gap-2 text-[#5C5C58]">
                  <Database className="w-4 h-4 text-[#858585]" /> Retrieved At
                </span>
                <span className="font-mono text-[#171717]">
                  {new Date(finding.retrievalDate).toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-[#F1F1EF]">
                <span className="flex items-center gap-2 text-[#5C5C58]">
                  <Tag className="w-4 h-4 text-[#858585]" /> Department Target
                </span>
                <span className="font-mono text-[#FF7417] font-medium">{finding.relatedDepartment}</span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-[#F1F1EF]">
                <span className="flex items-center gap-2 text-[#5C5C58]">
                  <Award className="w-4 h-4 text-[#858585]" /> Finding ID
                </span>
                <span className="font-mono text-[11px] text-[#858585] truncate max-w-[180px]">
                  {finding.findingId}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#E6E6E2] bg-[#FAFAF9]">
          <a
            href={finding.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#171717] hover:bg-[#252525] text-white text-xs font-medium transition-colors"
          >
            Open Primary Source URL <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
