/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AlertTriangle, Calendar, Globe, Scale } from 'lucide-react';
import type { ContradictionReport } from '../../types/evidence';

interface ContradictionCardProps {
  report: ContradictionReport;
  className?: string;
}

export const ContradictionCard: React.FC<ContradictionCardProps> = ({ report, className = '' }) => {
  if (!report.hasContradiction) return null;

  return (
    <div className={`p-4 rounded-xl border border-[#A85E16]/30 bg-[#FDF4EA]/60 text-[#171717] space-y-3 ${className}`}>
      <div className="flex items-start gap-2.5">
        <div className="p-1.5 rounded-lg bg-[#A85E16]/10 text-[#A85E16] shrink-0 mt-0.5">
          <AlertTriangle className="w-4 h-4" />
        </div>
        <div>
          <h4 className="text-xs font-mono uppercase tracking-wider text-[#A85E16] font-semibold">
            Evidence Discrepancy Detected: {report.topic}
          </h4>
          <p className="text-sm text-[#252525] mt-0.5">
            {report.reconciliationVerdict}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs pt-1 border-t border-[#A85E16]/15">
        {report.dateComparison?.newestDate && (
          <div className="flex items-center gap-1.5 text-[#5C5C58]">
            <Calendar className="w-3.5 h-3.5 text-[#A85E16]" />
            <span>
              Temporal shift: Latest {new Date(report.dateComparison.newestDate).toLocaleDateString()} vs {new Date(report.dateComparison.oldestDate || '').toLocaleDateString()}
            </span>
          </div>
        )}

        {report.geographicDifference && (
          <div className="flex items-center gap-1.5 text-[#5C5C58]">
            <Globe className="w-3.5 h-3.5 text-[#A85E16]" />
            <span>
              Scope difference: {report.geographicDifference.geoA} vs {report.geographicDifference.geoB}
            </span>
          </div>
        )}

        {report.credibilityComparison?.explanation && (
          <div className="flex items-center gap-1.5 text-[#5C5C58] md:col-span-2">
            <Scale className="w-3.5 h-3.5 text-[#A85E16]" />
            <span>{report.credibilityComparison.explanation}</span>
          </div>
        )}
      </div>

      {report.conflictingFindings?.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <span className="text-[11px] font-mono uppercase text-[#858585]">Disputed Claims:</span>
          <div className="space-y-1">
            {report.conflictingFindings.map((f, idx) => (
              <div key={idx} className="flex items-start justify-between text-xs p-2 rounded-lg bg-white/70 border border-[#E6E6E2]">
                <div className="space-y-0.5">
                  <span className="font-medium text-[#171717]">{f.sourceTitle}</span>
                  <p className="text-[#5C5C58] italic line-clamp-1">"{f.quoteOrSummary}"</p>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#F1F1EF] text-[#5C5C58] shrink-0 ml-2">
                  {f.geographicRelevance} • {f.sourceType}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
