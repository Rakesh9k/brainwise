/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  HelpCircle,
  TrendingUp,
  Clock,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import type { StructuredAiOutput, ClaimClassification } from '../../server/ai/types';

interface StructuredAiFindingsProps {
  output: StructuredAiOutput;
  onApprove?: (requestId: string) => Promise<void>;
  onRetry?: (requestId: string) => Promise<void>;
  className?: string;
}

export const StructuredAiFindings: React.FC<StructuredAiFindingsProps> = ({
  output,
  onApprove,
  onRetry,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<'claims' | 'recommendations' | 'sources'>('claims');
  const [isApproving, setIsApproving] = useState(false);

  const {
    requestId,
    status,
    department,
    workflow,
    summary,
    claims = [],
    recommendations = [],
    sources = [],
    confidence,
    validation,
    metadata,
  } = output;

  const handleApprove = async () => {
    if (!onApprove) return;
    setIsApproving(true);
    try {
      await onApprove(requestId);
    } finally {
      setIsApproving(false);
    }
  };

  const getClassificationBadge = (classification: ClaimClassification) => {
    switch (classification) {
      case 'BUSINESS_FACT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0]">
            <ShieldCheck className="w-2.5 h-2.5" />
            Business Fact
          </span>
        );
      case 'VERIFIED_FACT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE]">
            <CheckCircle2 className="w-2.5 h-2.5" />
            Verified Fact
          </span>
        );
      case 'ESTIMATE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A]">
            <TrendingUp className="w-2.5 h-2.5" />
            Estimate
          </span>
        );
      case 'ASSUMPTION':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]">
            <AlertTriangle className="w-2.5 h-2.5" />
            Assumption
          </span>
        );
      case 'RECOMMENDATION':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#FAF5FF] text-[#6B21A8] border border-[#E9D5FF]">
            <Sparkles className="w-2.5 h-2.5" />
            Recommendation
          </span>
        );
      case 'AI_ANALYSIS':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#F4F4F5] text-[#3F3F46] border border-[#E4E4E7]">
            <HelpCircle className="w-2.5 h-2.5" />
            AI Analysis
          </span>
        );
    }
  };

  return (
    <div
      className={`bw-trace-card bg-white border border-[#E6E6E2] rounded-[16px] overflow-hidden ${className}`}
    >
      {/* Human Approval Gate Alert Banner */}
      {status === 'PENDING_APPROVAL' && (
        <div className="bg-[#FFF7ED] border-b border-[#FED7AA] p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-[#C2410C] shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-[#9A3412]">
                Human Authorization Gate Required
              </div>
              <p className="text-[12px] text-[#C2410C] mt-0.5">
                This workflow proposes a high-risk operational action. Review the details below and
                confirm execution.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleApprove}
            disabled={isApproving}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold text-white bg-[#EA580C] hover:bg-[#C2410C] transition-colors cursor-pointer shrink-0 disabled:opacity-60"
          >
            {isApproving ? 'Authorizing...' : 'Authorize Action'}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="p-5 sm:p-6 border-b border-[#EFEFEB] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[#858585]">
              {department.replace(/_/g, ' ')}
            </span>
            <span className="text-[#D6D6D0]">·</span>
            <span className="text-xs font-medium text-[#171717]">{workflow}</span>
          </div>

          <div className="flex items-center gap-2">
            {validation && (
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  validation.status === 'PASSED'
                    ? 'bg-[#F0FDF4] text-[#166534]'
                    : validation.status === 'WARNINGS'
                      ? 'bg-[#FFFBEB] text-[#92400E]'
                      : 'bg-[#FEF2F2] text-[#991B1B]'
                }`}
              >
                Validation: {validation.status}
              </span>
            )}
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                confidence?.level === 'HIGH'
                  ? 'bg-[#F0FDF4] text-[#166534]'
                  : 'bg-[#FFFBEB] text-[#92400E]'
              }`}
            >
              Confidence: {confidence?.level || 'MEDIUM'}
            </span>
            {metadata?.creditsDeducted !== undefined && (
              <span className="text-[11px] font-mono-num text-[#858585]">
                {metadata.creditsDeducted} Credits
              </span>
            )}
            {onRetry && (
              <button
                type="button"
                onClick={() => onRetry(requestId)}
                className="px-2 py-0.5 rounded-full text-[10px] font-medium text-[#5C5C58] hover:text-[#171717] bg-[#F4F4F5] hover:bg-[#E4E4E7] transition-colors cursor-pointer"
              >
                Retry
              </button>
            )}
          </div>
        </div>

        <p className="text-sm font-medium text-[#171717] leading-relaxed">{summary}</p>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 pt-2 border-t border-[#F4F4F5]">
          <button
            type="button"
            onClick={() => setActiveTab('claims')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'claims'
                ? 'bg-[#171717] text-white'
                : 'text-[#5C5C58] hover:text-[#171717] hover:bg-[#F4F4F5]'
            }`}
          >
            Evidence & Claims ({claims.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('recommendations')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'recommendations'
                ? 'bg-[#171717] text-white'
                : 'text-[#5C5C58] hover:text-[#171717] hover:bg-[#F4F4F5]'
            }`}
          >
            Recommendations ({recommendations.length})
          </button>
          {sources.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('sources')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'sources'
                  ? 'bg-[#171717] text-white'
                  : 'text-[#5C5C58] hover:text-[#171717] hover:bg-[#F4F4F5]'
              }`}
            >
              Sources ({sources.length})
            </button>
          )}
        </div>
      </div>

      {/* Tab 1: Claims & Provenance */}
      {activeTab === 'claims' && (
        <div className="p-5 sm:p-6 divide-y divide-[#F4F4F5]">
          {claims.length === 0 ? (
            <p className="text-xs text-[#858585] py-2">No individual claims extracted.</p>
          ) : (
            claims.map((claim) => (
              <div key={claim.id} className="py-3.5 first:pt-0 last:pb-0 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {getClassificationBadge(claim.classification)}
                    {claim.verificationStatus && (
                      <span className="text-[10px] font-medium text-[#858585]">
                        Status: {claim.verificationStatus}
                      </span>
                    )}
                  </div>
                  {claim.confidenceScore !== undefined && (
                    <span className="text-[10px] font-mono-num text-[#858585]">
                      {Math.round(claim.confidenceScore * 100)}% score
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#252525] leading-relaxed">{claim.claim}</p>
                {claim.notes && <p className="text-[11px] text-[#858585] italic">{claim.notes}</p>}
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 2: Recommendations */}
      {activeTab === 'recommendations' && (
        <div className="p-5 sm:p-6 space-y-4">
          {recommendations.length === 0 ? (
            <p className="text-xs text-[#858585]">No strategic recommendations generated.</p>
          ) : (
            recommendations.map((rec) => (
              <div
                key={rec.id}
                className="p-4 rounded-[12px] bg-[#FBFBFA] border border-[#EFEFEB] space-y-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[#171717]">{rec.recommendation}</span>
                  <div className="flex items-center gap-1.5 text-[11px] font-mono-num text-[#858585]">
                    <span>Effort: {rec.estimatedEffort}</span>
                    <span>·</span>
                    <span>Cost: {rec.estimatedCost}</span>
                  </div>
                </div>

                <p className="text-xs text-[#5C5C58]">{rec.whyItMatters}</p>

                <div className="pt-1 border-t border-[#EFEFEB] grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-[#858585]">Expected Outcome: </span>
                    <span className="text-[#171717]">{rec.expectedOutcome}</span>
                  </div>
                  <div>
                    <span className="text-[#858585]">Measurement: </span>
                    <span className="text-[#171717]">{rec.measurementCriteria}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 3: Sources */}
      {activeTab === 'sources' && (
        <div className="p-5 sm:p-6 space-y-3">
          {sources.map((source) => (
            <div
              key={source.sourceId}
              className="p-3.5 rounded-[12px] bg-[#FAFAFA] border border-[#EFEFEB] space-y-1.5"
            >
              <div className="flex items-center justify-between gap-2">
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-[#171717] hover:text-[#FF7417] inline-flex items-center gap-1 transition-colors"
                >
                  {source.title}
                  <ExternalLink className="w-3 h-3 text-[#858585]" />
                </a>
                <span className="text-[10px] font-mono-num text-[#858585]">{source.domain}</span>
              </div>
              <p className="text-[11px] text-[#5C5C58] line-clamp-2">{source.evidenceExcerpt}</p>
              <div className="text-[10px] text-[#858585] flex items-center gap-2">
                <span>Retrieved: {source.retrievedAt.slice(0, 10)}</span>
                <span>·</span>
                <span>Type: {source.sourceType}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer Metadata */}
      <div className="px-5 sm:px-6 py-3 bg-[#F9F9F8] border-t border-[#EFEFEB] flex flex-wrap items-center justify-between gap-2 text-[10px] text-[#858585]">
        <div className="flex items-center gap-2">
          <span>Model: {metadata?.model || 'deterministic-engine'}</span>
          <span>·</span>
          <span>Prompt: {metadata?.promptVersion || 'v1'}</span>
          <span>·</span>
          <span>Context: {metadata?.contextVersion || 'v1'}</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>{metadata?.executionDurationMs || 0}ms execution</span>
        </div>
      </div>
    </div>
  );
};
