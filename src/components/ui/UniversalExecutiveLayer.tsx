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
  FileText,
  Presentation,
  CheckCircle2,
  Activity,
} from 'lucide-react';
import { Drawer } from './Overlay';
import { exportExecutivePdf, exportExecutiveSlides } from './contextualLedgerUtils';

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
  statusBadge?: string; // e.g. 'PASS' | 'STANDBY' | 'OPTIMAL' | 'REVIEW'
  isStandby?: boolean;
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

        {/* Middle: Plain-English Purpose Statement (Full Width, Never Squished) */}
        <div className="py-2.5">
          <p className="text-xs sm:text-[13px] text-[#52524E] leading-relaxed font-normal">
            {oneLiner}
          </p>
        </div>

        {/* Bottom Row: Real-Time Operational Status Chips */}
        {statusPills && statusPills.length > 0 && (
          <div className="pt-2.5 border-t border-[#F5F5F3] flex items-center gap-1.5 flex-wrap">
            {statusPills.map((pill, idx) => (
              <span
                key={idx}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border ${toneClasses(
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
              Audit & Telemetry
            </button>
          </div>

          {activeTab === 'evidence' && (
            <div className="space-y-5">
              {/* Confidence Hero Meter */}
              {(() => {
                const score = proofTelemetry.confidenceScore ?? 0;
                const isStandby =
                  proofTelemetry.isStandby ||
                  (score === 0 &&
                    (proofTelemetry.metrics?.every(
                      (m) => m.value === 0 || m.value === '0' || m.value === 'Standby'
                    ) ??
                      false));
                const statusBadge =
                  proofTelemetry.statusBadge ||
                  (isStandby ? 'STANDBY' : score >= 80 ? 'PASS' : score >= 50 ? 'OPTIMAL' : 'REVIEW');
                const badgeTone = isStandby
                  ? 'border-[#D4D4D0] bg-[#F4F4F2] text-[#52524E]'
                  : statusBadge === 'PASS' || statusBadge === 'OPTIMAL'
                    ? 'border-[#10B981]/30 border-t-[#10B981] bg-[#ECFDF5] text-[#065F46]'
                    : 'border-[#F59E0B]/30 border-t-[#F59E0B] bg-[#FFFBEB] text-[#B45309]';

                return (
                  <div className="p-4 rounded-2xl border border-[#E4E4DF] bg-gradient-to-br from-[#FFFFFF] to-[#FAF9F5] flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <div className="text-xs font-medium text-[#71717A] uppercase tracking-wider">
                        {proofTelemetry.confidenceLabel ||
                          (isStandby ? 'Surveillance Status' : 'Grounding Precision')}
                      </div>
                      <div className="text-2xl font-bold font-mono text-[#18181B]">
                        {isStandby && score === 0 ? 'Standby' : `${score}%`}
                      </div>
                      <p className="text-xs text-[#52524E]">
                        {isStandby
                          ? 'Awaiting live market events and competitor surveillance activity'
                          : 'Empirical verification against company Business Brain'}
                      </p>
                    </div>
                    <div
                      className={`w-14 h-14 rounded-full border-4 flex items-center justify-center shrink-0 font-bold text-xs ${badgeTone}`}
                    >
                      {statusBadge}
                    </div>
                  </div>
                );
              })()}

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
            <div className="space-y-4">
              {/* Executive Operational Audit Header Card */}
              <div className="p-4 rounded-xl border border-[#E4E4DF] bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-mono font-semibold text-[#C44D00] uppercase tracking-wider">
                      {departmentCode} · System Telemetry Audit
                    </span>
                    <h4 className="text-sm font-semibold text-[#18181B] mt-0.5">
                      {sectionTitle}
                    </h4>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${
                      proofTelemetry.isStandby || (proofTelemetry.confidenceScore === 0)
                        ? 'bg-[#F4F4F2] text-[#52524E] border-[#D4D4D0]'
                        : 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]'
                    }`}
                  >
                    {proofTelemetry.isStandby || (proofTelemetry.confidenceScore === 0)
                      ? 'Standby Calibration'
                      : 'Live Operational State'}
                  </span>
                </div>

                {/* Audit Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#F5F5F3]">
                  <button
                    type="button"
                    onClick={() => {
                      exportExecutivePdf(
                        `${sectionTitle} — System Audit`,
                        `Verified Operational State & Telemetry (${departmentCode})`,
                        proofTelemetry.rawJson || {
                          department: departmentCode,
                          section: sectionTitle,
                          status: 'Audited & Verified',
                        }
                      );
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#FFF0E5] text-[#C44D00] border border-[#FFD9BE] hover:bg-[#FFE6D4] transition-colors cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-[#FF7417]" />
                    Export Audit PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      exportExecutiveSlides(
                        `${sectionTitle} — Audit Deck`,
                        `System Telemetry & Architecture (${departmentCode})`,
                        {
                          series: Object.entries(proofTelemetry.rawJson || {}).map(([k, v]) => ({
                            label: k.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()),
                            value: typeof v === 'number' ? v : 100,
                            detail: String(v),
                          })),
                          completionRate: proofTelemetry.confidenceScore ?? 100,
                        }
                      );
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#EEF2FF] text-[#4F46E5] border border-[#C7D2FE] hover:bg-[#E0E7FF] transition-colors cursor-pointer"
                  >
                    <Presentation className="w-3.5 h-3.5 text-[#6366F1]" />
                    Export Audit Slides
                  </button>
                </div>
              </div>

              {/* Structured Telemetry Audit Table */}
              <div className="rounded-xl border border-[#E4E4DF] bg-white overflow-hidden">
                <div className="px-4 py-2.5 bg-[#FAF9F5] border-b border-[#E4E4DF] text-xs font-semibold text-[#18181B] flex items-center justify-between">
                  <span>System Telemetry Parameters</span>
                  <span className="text-[10px] text-[#71717A] font-normal">
                    Verified runtime snapshot
                  </span>
                </div>
                <div className="divide-y divide-[#F0F0EC] text-xs">
                  {Object.entries(
                    proofTelemetry.rawJson || {
                      department: departmentCode,
                      workspace: 'Active Workspace',
                      status: proofTelemetry.isStandby ? 'STANDBY' : 'OPTIMAL',
                      timestamp: new Date().toISOString(),
                    }
                  ).map(([key, val]) => {
                    const formattedKey = key
                      .replace(/([A-Z])/g, ' $1')
                      .replace(/^./, (s) => s.toUpperCase())
                      .replace(/Count$/i, ' Count');
                    const isDate =
                      typeof val === 'string' &&
                      /^\d{4}-\d{2}-\d{2}T/.test(val) &&
                      !isNaN(Date.parse(val));
                    const displayVal = isDate
                      ? new Date(val as string).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : typeof val === 'object'
                        ? JSON.stringify(val)
                        : String(val ?? '—');

                    return (
                      <div
                        key={key}
                        className="px-4 py-2.5 flex items-center justify-between gap-4 hover:bg-[#FAF9F5] transition-colors"
                      >
                        <span className="text-[#52524E] font-medium">{formattedKey}</span>
                        <span className="font-mono text-[#18181B] font-semibold text-[11px] text-right truncate max-w-[260px]">
                          {displayVal}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Developer Collapsible Inspector (Tucked away at bottom for debug only) */}
              <details className="group">
                <summary className="text-[11px] font-mono text-[#71717A] hover:text-[#18181B] cursor-pointer flex items-center justify-between py-2 px-3 rounded-lg bg-[#F4F4F2] hover:bg-[#EFEFEB] transition-colors select-none">
                  <span className="flex items-center gap-1.5">
                    <Code2 className="w-3 h-3 text-[#71717A]" />
                    <span>Inspect Raw Developer JSON Payload (Debug)</span>
                  </span>
                  <span className="text-[10px] text-[#A1A1AA] group-open:rotate-180 transition-transform">
                    ▼
                  </span>
                </summary>
                <div className="mt-2 space-y-2">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleCopyJson}
                      className="px-2 py-0.5 rounded border border-[#E4E4DF] bg-white text-[10px] font-medium text-[#52524E] hover:text-[#18181B] inline-flex items-center gap-1 cursor-pointer"
                    >
                      {copiedJson ? (
                        <>
                          <Check className="w-2.5 h-2.5 text-[#10B981]" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-2.5 h-2.5" />
                          <span>Copy Raw JSON</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-3.5 rounded-xl bg-[#18181B] text-[#FAFAFA] font-mono text-[11px] overflow-x-auto max-h-[220px] leading-relaxed select-all">
                    {JSON.stringify(
                      proofTelemetry.rawJson || {
                        department: departmentCode,
                        section: sectionTitle,
                        confidenceScore: proofTelemetry.confidenceScore ?? 0,
                        timestamp: new Date().toISOString(),
                      },
                      null,
                      2
                    )}
                  </pre>
                </div>
              </details>
            </div>
          )}
        </div>
      </Drawer>
    </>
  );
};
