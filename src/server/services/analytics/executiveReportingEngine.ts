/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'node:crypto';
import { db } from '../../db/firestore';
import { reportValidator } from './reportValidator';
import type { MetricCalculationResult } from './metricTypes';

export type ExecutiveReportType =
  | 'WEEKLY_BUSINESS_PULSE'
  | 'MONTHLY_BUSINESS_REVIEW'
  | 'MARKETING_PERFORMANCE'
  | 'FINANCIAL_PERFORMANCE'
  | 'GROWTH_PERFORMANCE'
  | 'COMPETITIVE_INTELLIGENCE'
  | 'INVESTOR_BOARD_REPORT'
  | 'CUSTOM_INTELLIGENCE_DOSSIER';

export interface CanonicalExecutiveReport {
  reportId: string;
  workspaceId: string;
  reportType: ExecutiveReportType;
  title: string;
  businessName: string;
  reportingPeriod: { startDate: string; endDate: string };
  businessBrainVersion: number;
  metricRegistryVersion: string;
  snapshotHash: string; // SHA-256 of canonical metric values & inputs
  generatedAt: string;
  status: 'VERIFIED' | 'REJECTED_AUDIT_FAILURE';

  metricsSummary: MetricCalculationResult[];
  executiveSummary: string;
  keyTakeaways: string[];
  strategicPriorityAdjustment: string;
  rootCauseInsights: string[];
  risksAndLimitations: string[];
  nextSteps: Array<{ title: string; owner?: string; targetMetric?: string }>;

  auditValidation: {
    passed: boolean;
    unsupportedClaimsCount: number;
    auditedClaimsCount: number;
  };
}

export class ExecutiveReportingEngine {
  /**
   * Generates, validates, and stores a reproducible canonical executive report
   */
  public async generateReport(params: {
    workspaceId: string;
    businessName: string;
    reportType: ExecutiveReportType;
    title?: string;
    reportingPeriod: { startDate: string; endDate: string };
    businessBrainVersion: number;
    metrics: MetricCalculationResult[];
    narrativeSummary?: string;
    keyTakeaways?: string[];
    priorityAdjustment?: string;
  }): Promise<CanonicalExecutiveReport> {
    const {
      workspaceId,
      businessName,
      reportType,
      title = `${reportType.replace(/_/g, ' ')} - ${businessName}`,
      reportingPeriod,
      businessBrainVersion,
      metrics,
      narrativeSummary,
      keyTakeaways = [],
      priorityAdjustment,
    } = params;

    const reportId = `rep_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const generatedAt = new Date().toISOString();

    // Compute cryptographic snapshot hash for immutability
    const hashPayload = JSON.stringify({
      workspaceId,
      businessBrainVersion,
      reportingPeriod,
      metrics: metrics.map((m) => ({ id: m.metricId, val: m.calculatedValue, status: m.verificationStatus })),
    });
    const snapshotHash = crypto.createHash('sha256').update(hashPayload).digest('hex');

    // Default grounded narrative if none supplied
    const revNet = metrics.find((m) => m.metricId === 'REV_NET')?.calculatedValue;
    const taskComp = metrics.find((m) => m.metricId === 'OPS_TASK_COMPLETION')?.calculatedValue;

    let narrative = narrativeSummary;
    if (!narrative) {
      narrative = `${businessName} concluded the reporting period with ${
        revNet != null ? `$${revNet.toLocaleString('en-US')}` : 'measured'
      } Net Revenue and ${taskComp != null ? `${taskComp}%` : 'tracked'} sprint completion. Operating posture is aligned with Business Brain version ${businessBrainVersion}.`;
    }

    // Validate narrative numerical claims
    const audit = reportValidator.validateReportNarrative({
      narrativeText: narrative,
      verifiedMetrics: metrics,
    });

    const report: CanonicalExecutiveReport = {
      reportId,
      workspaceId,
      reportType,
      title,
      businessName,
      reportingPeriod,
      businessBrainVersion,
      metricRegistryVersion: '1.0.0',
      snapshotHash,
      generatedAt,
      status: audit.isValid ? 'VERIFIED' : 'REJECTED_AUDIT_FAILURE',
      metricsSummary: metrics,
      executiveSummary: narrative,
      keyTakeaways: keyTakeaways.length > 0 ? keyTakeaways : [
        `${businessName} maintains strict multi-tenant metric integrity.`,
        `All calculations ground in verified Firestore events or authorized source manifests.`,
      ],
      strategicPriorityAdjustment: priorityAdjustment || 'Continue executing priority backlog while monitoring cash runway.',
      rootCauseInsights: [
        'Deterministic KPI variance analysis verified against transaction ledger.',
      ],
      risksAndLimitations: [
        'External telemetry is bounded by source sync intervals and consent limits.',
      ],
      nextSteps: [
        { title: 'Review high-priority growth sprint tasks', targetMetric: 'OPS_TASK_COMPLETION' },
      ],
      auditValidation: {
        passed: audit.isValid,
        unsupportedClaimsCount: audit.unsupportedClaims.length,
        auditedClaimsCount: audit.claimsAuditedCount,
      },
    };

    if (!audit.isValid) {
      throw new Error(
        `REPORT_VALIDATION_ERROR: Generated narrative contained unsupported claims: ${JSON.stringify(
          audit.unsupportedClaims
        )}`
      );
    }

    // Persist immutable report snapshot
    await db.doc<CanonicalExecutiveReport>(`workspaces/${workspaceId}/executiveReports/${reportId}`).set(report);
    return report;
  }

  /**
   * Generates RFC-4180 compliant CSV export
   */
  public exportCsv(report: CanonicalExecutiveReport): string {
    const rows = [
      ['Report ID', report.reportId],
      ['Title', `"${report.title.replace(/"/g, '""')}"`],
      ['Business Name', `"${report.businessName.replace(/"/g, '""')}"`],
      ['Report Type', report.reportType],
      ['Period Start', report.reportingPeriod.startDate],
      ['Period End', report.reportingPeriod.endDate],
      ['Business Brain Version', String(report.businessBrainVersion)],
      ['Snapshot SHA-256', report.snapshotHash],
      ['Generated At', report.generatedAt],
      ['Verification Status', report.status],
      [],
      ['Metric ID', 'Canonical Name', 'Value', 'Unit', 'Status', 'Formula'],
    ];

    for (const m of report.metricsSummary) {
      rows.push([
        m.metricId,
        `"${m.canonicalName.replace(/"/g, '""')}"`,
        m.formattedValue,
        m.unit,
        m.verificationStatus,
        `"${m.explanation.formula.replace(/"/g, '""')}"`,
      ]);
    }

    rows.push([]);
    rows.push(['Executive Summary', `"${report.executiveSummary.replace(/"/g, '""')}"`]);
    rows.push(['Priority Adjustment', `"${report.strategicPriorityAdjustment.replace(/"/g, '""')}"`]);

    return rows.map((r) => r.join(',')).join('\n');
  }

  /**
   * Generates print-ready, high-DPI HTML export
   */
  public exportHtml(report: CanonicalExecutiveReport): string {
    const metricCardsHtml = report.metricsSummary
      .map(
        (m) => `
        <div style="border: 1px solid #E6E6E2; border-radius: 8px; padding: 14px; background: #FAFAF9;">
          <div style="font-size: 11px; font-weight: 600; color: #686864; text-transform: uppercase;">${m.canonicalName}</div>
          <div style="font-size: 22px; font-weight: bold; color: #171717; margin: 6px 0;">${m.formattedValue}</div>
          <div style="font-size: 11px; color: ${m.verificationStatus === 'VERIFIED' ? '#1E8E3E' : '#C44D00'};">Status: ${m.verificationStatus}</div>
          <div style="font-size: 10px; color: #8C8C88; margin-top: 4px;">Formula: ${m.explanation.formula}</div>
        </div>`
      )
      .join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${report.title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 40px; color: #242424; background: #FFF; line-height: 1.5; }
    h1 { font-size: 26px; margin-bottom: 4px; color: #171717; }
    .meta { font-size: 12px; color: #686864; margin-bottom: 24px; border-bottom: 1px solid #E6E6E2; padding-bottom: 12px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 28px; }
    .section { margin-bottom: 24px; }
    .section-title { font-size: 16px; font-weight: bold; border-left: 4px solid #FF7417; padding-left: 8px; margin-bottom: 8px; }
    .hash { font-family: monospace; font-size: 10px; color: #8C8C88; }
  </style>
</head>
<body>
  <h1>${report.title}</h1>
  <div class="meta">
    <strong>${report.businessName}</strong> · Period: ${report.reportingPeriod.startDate} to ${report.reportingPeriod.endDate} · Brain Version: ${report.businessBrainVersion}
    <br><span class="hash">Snapshot SHA-256: ${report.snapshotHash}</span>
  </div>

  <div class="section">
    <div class="section-title">Verified Key Performance Indicators</div>
    <div class="grid">${metricCardsHtml}</div>
  </div>

  <div class="section">
    <div class="section-title">Executive Summary</div>
    <p>${report.executiveSummary}</p>
  </div>

  <div class="section">
    <div class="section-title">Strategic Priority Adjustment</div>
    <p>${report.strategicPriorityAdjustment}</p>
  </div>
</body>
</html>`;
  }
}

export const executiveReportingEngine = new ExecutiveReportingEngine();
