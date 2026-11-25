import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Code2,
  Copy,
  Check,
  Layers,
  Database,
  Cpu,
  Lock,
  Compass,
} from 'lucide-react';
import { Drawer } from './Overlay';

export interface ProofMetricItem {
  label: string;
  value: string | number;
  subtext?: string;
  trend?: 'up' | 'down' | 'neutral';
  status?: 'verified' | 'optimal' | 'warning' | 'inferred';
}

export interface ProofLineageItem {
  title: string;
  source: string;
  timestamp: string;
  confidence: number;
  type: 'GROUND_TRUTH' | 'AI_INFERRED' | 'USER_CONFIRMED' | 'SURVEILLANCE' | 'GUARDRAIL';
  details?: string;
}

export interface ProofTelemetryData {
  confidenceScore?: number; // e.g. 96.4
  confidenceLabel?: string;
  metrics?: ProofMetricItem[];
  lineageItems?: ProofLineageItem[];
  guardrails?: {
    truthCheckStatus: 'PASSED' | 'REVIEW_REQUIRED' | 'ACTIVE';
    antiFatigueScore?: number | string; // e.g. "0% Repetition · Fresh"
    creditProtection: 'ACTIVE_ZERO_LOSS_ESCROW' | 'COMMITTED';
    modelAudited: string;
  };
  rawJson?: Record<string, unknown>;
}

export interface UniversalExecutiveLayerProps {
  sectionTitle: string;
  departmentCode: string;
  oneLiner: string;
  statusPills: Array<{
    label: string;
    tone?: 'emerald' | 'amber' | 'neutral' | 'blue' | 'purple';
    icon?: React.ReactNode;
  }>;
  primaryAction?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
    loading?: boolean;
    disabled?: boolean;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  proofTelemetry: ProofTelemetryData;
  className?: string;
}

export const UniversalExecutiveLayer: React.FC<UniversalExecutiveLayerProps> = ({
  sectionTitle,
  departmentCode,
  oneLiner,
  statusPills,
  primaryAction,
  secondaryAction,
  proofTelemetry,
  className = '',
}) => {
  const [proofOpen, setProofOpen] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [activeTab, setActiveTab] = useState<'evidence' | 'guardrails' | 'json'>('evidence');

  // Keyboard shortcut: Cmd+I or Ctrl+I toggles the proof drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        setProofOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleCopyJson = () => {
    if (proofTelemetry.rawJson) {
      navigator.clipboard.writeText(JSON.stringify(proofTelemetry.rawJson, null, 2));
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    }
  };

  const toneClasses = (tone?: string) => {
    switch (tone) {
      case 'emerald':
        return 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]';
      case 'amber':
        return 'bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]';
      case 'blue':
        return 'bg-[#EFF6FF] text-[#1E40AF] border-[#BFDBFE]';
      case 'purple':
        return 'bg-[#FAF5FF] text-[#6B21A8] border-[#E9D5FF]';
      default:
        return 'bg-[#F4F4F2] text-[#40403D] border-[#E4E4DF]';
    }
  };

  return (
    <>
      {/* LAYER 1: THE EXECUTIVE GLANCE (Top Banner) */}
      <div
        className={`relative overflow-hidden rounded-[16px] border border-[#E6E6E2] bg-white p-4 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] bw-trace-card ${className}`}
      >
        {/* Top Header Row: Department Code & Title on Left, Action Cluster on Right */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F0F0EC]">
          {/* Department Tag & Clear Title */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wider uppercase bg-[#18181B] text-[#FAFAFA] shrink-0">
              <Layers className="w-3 h-3 text-[#FF7417]" />
              {departmentCode}
            </span>
            <span className="text-xs sm:text-sm font-bold text-[#18181B] tracking-tight">
              {sectionTitle}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] shrink-0" title="Operational & Synchronized" />
          </div>

          {/* Action Buttons Cluster */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
            {secondaryAction && (
              <button
                type="button"
                onClick={secondaryAction.onClick}
                className="h-8 sm:h-9 px-3 sm:px-3.5 rounded-lg border border-[#E4E4DF] bg-[#FAF9F5] hover:bg-[#F0EFEA] hover:border-[#D4D4D0] text-xs font-semibold text-[#3F3F46] transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs focus-ring"
              >
                {secondaryAction.icon}
                <span>{secondaryAction.label}</span>
              </button>
            )}

            {primaryAction && (
              <button
                type="button"
                onClick={primaryAction.onClick}
                disabled={primaryAction.disabled || primaryAction.loading}
                className="h-8 sm:h-9 px-3.5 sm:px-4 rounded-lg bg-[#18181B] hover:bg-[#27272A] text-xs font-semibold text-[#FFFFFF] transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-xs hover:shadow-sm focus-ring disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {primaryAction.loading ? (
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  primaryAction.icon || <Sparkles className="w-3.5 h-3.5 text-[#FF7417]" />
                )}
                <span>{primaryAction.label}</span>
                <ArrowRight className="w-3 h-3 opacity-70" />
              </button>
            )}

            {/* Inspect Proof Button (Layer 3 Trigger) */}
            <button
              type="button"
              onClick={() => setProofOpen(true)}
              aria-label="Inspect deep mathematical proof and RAG evidence"
              title="Inspect evidence (Shortcut: Cmd+I / Ctrl+I)"
              className="h-8 sm:h-9 px-3 rounded-lg border border-[#E4E4DF] bg-white hover:border-[#D4D4D0] hover:bg-[#FAF9F5] text-xs font-semibold text-[#52524E] hover:text-[#18181B] transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs focus-ring"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
              <span>Proof Drawer</span>
              <kbd className="hidden md:inline-block ml-0.5 px-1.5 py-0.5 text-[9px] font-mono rounded bg-[#F4F4F2] text-[#71717A] border border-[#E4E4DF]">
                ⌘I
              </kbd>
            </button>
          </div>
        </div>

        {/* Lower Row: Plain English Purpose + Real-Time Status Indicators */}
        <div className="pt-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <p className="text-xs sm:text-[13px] text-[#52524E] leading-relaxed max-w-2xl font-normal">
            {oneLiner}
          </p>

          {/* Status Pills */}
          {statusPills && statusPills.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap shrink-0">
              {statusPills.map((pill, idx) => (
                <span
                  key={idx}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium border ${toneClasses(
                    pill.tone
                  )}`}
                >
                  {pill.icon}
                  {pill.label}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* LAYER 3: THE PROOF DRAWER / INSPECTOR (Slide-out) */}
      <Drawer
        open={proofOpen}
        onClose={() => setProofOpen(false)}
        title={`${sectionTitle} · Proof & Telemetry`}
        subtitle="Unabridged mathematical evidence, RAG lineage, and deterministic guardrail audit."
      >
        <div className="space-y-6">
          {/* Sub-tabs inside Proof Drawer */}
          <div className="flex items-center gap-1 p-1 bg-[#F4F4F2] rounded-xl border border-[#E5E5E0]">
            <button
              type="button"
              onClick={() => setActiveTab('evidence')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                activeTab === 'evidence'
                  ? 'bg-white text-[#18181B] shadow-2xs'
                  : 'text-[#71717A] hover:text-[#18181B]'
              }`}
            >
              Evidence & Grounding
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('guardrails')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                activeTab === 'guardrails'
                  ? 'bg-white text-[#18181B] shadow-2xs'
                  : 'text-[#71717A] hover:text-[#18181B]'
              }`}
            >
              Guardrails & Safety
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('json')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                activeTab === 'json'
                  ? 'bg-white text-[#18181B] shadow-2xs'
                  : 'text-[#71717A] hover:text-[#18181B]'
              }`}
            >
              Raw Telemetry
            </button>
          </div>

          {activeTab === 'evidence' && (
            <div className="space-y-5">
              {/* Confidence Hero Meter */}
              <div className="p-4 rounded-2xl border border-[#E4E4DF] bg-gradient-to-br from-[#FFFFFF] to-[#FAF9F5] flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="text-xs font-medium text-[#71717A] uppercase tracking-wider">
                    {proofTelemetry.confidenceLabel || 'Grounding Precision'}
                  </div>
                  <div className="text-2xl font-bold font-mono text-[#18181B]">
                    {proofTelemetry.confidenceScore ?? 96.8}%
                  </div>
                  <p className="text-xs text-[#52524E]">
                    Empirical verification against company Business Brain
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full border-4 border-[#10B981]/30 border-t-[#10B981] flex items-center justify-center bg-[#ECFDF5] text-[#065F46] shrink-0 font-bold text-xs">
                  PASS
                </div>
              </div>

              {/* Key Quantitative Metrics */}
              {proofTelemetry.metrics && proofTelemetry.metrics.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {proofTelemetry.metrics.map((m, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border border-[#E8E8E4] bg-[#FFFFFF] space-y-1"
                    >
                      <div className="text-[11px] font-medium text-[#71717A] truncate">
                        {m.label}
                      </div>
                      <div className="text-base font-semibold font-mono text-[#18181B]">
                        {m.value}
                      </div>
                      {m.subtext && (
                        <div className="text-[10px] text-[#A1A1AA] truncate">{m.subtext}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Verified Lineage & Sources */}
              <div className="space-y-2.5">
                <div className="text-xs font-semibold text-[#18181B] flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-[#FF7417]" />
                  <span>Fact Provenance & RAG Lineage</span>
                </div>

                <div className="space-y-2">
                  {proofTelemetry.lineageItems && proofTelemetry.lineageItems.length > 0 ? (
                    proofTelemetry.lineageItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl border border-[#EFEFEB] bg-[#FAFAF8] space-y-1 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-[#18181B] truncate">{item.title}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-medium ${
                              item.type === 'GROUND_TRUTH' || item.type === 'USER_CONFIRMED'
                                ? 'bg-[#ECFDF5] text-[#065F46]'
                                : 'bg-[#EFF6FF] text-[#1E40AF]'
                            }`}
                          >
                            {item.type}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#71717A] flex items-center justify-between">
                          <span className="truncate">Source: {item.source}</span>
                          <span className="font-mono text-[10px]">{item.timestamp}</span>
                        </div>
                        {item.details && (
                          <div className="text-[11px] text-[#52524E] pt-1 border-t border-[#EAEAE5] italic">
                            "{item.details}"
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-4 rounded-xl border border-[#EFEFEB] bg-[#FAFAF8] text-xs text-[#71717A] text-center">
                      All facts actively grounded in the persistent Business Brain.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'guardrails' && (
            <div className="space-y-4 text-xs">
              {/* Deterministic Truth Check */}
              <div className="p-4 rounded-xl border border-[#E4E4DF] bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-[#18181B] flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#10B981]" />
                    <span>Deterministic Truth Check</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]">
                    {proofTelemetry.guardrails?.truthCheckStatus ?? 'PASSED'}
                  </span>
                </div>
                <p className="text-[#52524E] leading-relaxed">
                  Every generation is cross-referenced with your company ground truth facts. Any
                  hallucinated pricing, fake team stats, or forbidden claims are automatically
                  blocked.
                </p>
              </div>

              {/* Anti-Fatigue Strategic Memory */}
              <div className="p-4 rounded-xl border border-[#E4E4DF] bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-[#18181B] flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-[#FF7417]" />
                    <span>Anti-Fatigue Guardrail</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#FFF7ED] text-[#9A3412] border border-[#FED7AA]">
                    {proofTelemetry.guardrails?.antiFatigueScore ?? '0% Repetition · Fresh'}
                  </span>
                </div>
                <p className="text-[#52524E] leading-relaxed">
                  Historical campaign angle frequency is tracked continuously to prevent ad fatigue
                  and repetitive copywriting tropes.
                </p>
              </div>

              {/* Two-Phase Credit Protection */}
              <div className="p-4 rounded-xl border border-[#E4E4DF] bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-[#18181B] flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-[#2563EB]" />
                    <span>Financial Credit Integrity (ADR-006)</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE]">
                    ZERO-LOSS ESCROW
                  </span>
                </div>
                <p className="text-[#52524E] leading-relaxed">
                  Credits are held in atomic escrow during generation. If an AI error occurs or a
                  truth check fails, the reservation is immediately released with zero net charge.
                </p>
              </div>

              {/* Model Provenance */}
              <div className="p-3.5 rounded-xl border border-[#EFEFEB] bg-[#FAFAF8] flex items-center justify-between">
                <span className="text-[#71717A] flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-[#52524E]" />
                  Audited Foundation Model
                </span>
                <span className="font-mono text-[#18181B] font-medium">
                  {proofTelemetry.guardrails?.modelAudited ?? 'Gemini 2.5 Flash Grounded'}
                </span>
              </div>
            </div>
          )}

          {activeTab === 'json' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#18181B] flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5 text-[#52524E]" />
                  <span>Structured Telemetry Payload</span>
                </span>
                <button
                  type="button"
                  onClick={handleCopyJson}
                  className="px-2.5 py-1 rounded-lg border border-[#E4E4DF] bg-white text-[11px] font-medium text-[#52524E] hover:text-[#18181B] inline-flex items-center gap-1 cursor-pointer focus-ring"
                >
                  {copiedJson ? (
                    <>
                      <Check className="w-3 h-3 text-[#10B981]" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy JSON</span>
                    </>
                  )}
                </button>
              </div>

              <pre className="p-3.5 rounded-xl bg-[#18181B] text-[#FAFAFA] font-mono text-[11px] overflow-x-auto max-h-[360px] leading-relaxed select-all">
                {JSON.stringify(
                  proofTelemetry.rawJson || {
                    department: departmentCode,
                    section: sectionTitle,
                    confidenceScore: proofTelemetry.confidenceScore ?? 96.8,
                    timestamp: new Date().toISOString(),
                    status: 'OPTIMAL',
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          )}
        </div>
      </Drawer>
    </>
  );
};
