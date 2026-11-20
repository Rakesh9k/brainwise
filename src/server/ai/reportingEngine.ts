/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { researchRepository } from '../repositories/researchRepository';
import type { ResearchReportEntity } from '../types/api';
import type { StructuredAiOutput } from './types';

export class ReportingEngine {
  /**
   * Transforms validated AI output into a standardized, persistent business intelligence report entity.
   */
  public async compileAndPersistReport(params: {
    workspaceId: string;
    userId: string;
    output: StructuredAiOutput;
    titleOverride?: string;
  }): Promise<ResearchReportEntity> {
    const { workspaceId, userId, output, titleOverride } = params;

    const reportId = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const now = new Date().toISOString();

    const title =
      titleOverride ||
      (output.result.title as string) ||
      `${output.department.replace(/_/g, ' ')} Intelligence Report`;

    const subtitle =
      (output.result.subtitle as string) ||
      `Workflow: ${output.workflow} · Synthesized for ${workspaceId}`;

    const report: ResearchReportEntity = {
      reportId,
      workspaceId,
      title,
      subtitle,
      reportType:
        output.department === 'IDEA_INTELLIGENCE'
          ? 'TAM_SAM_SOM'
          : output.department === 'COMPETITOR_INTELLIGENCE'
            ? 'COMPETITIVE_TEARDOWN'
            : 'MARKET_SCAN',
      depth: 'Full Dossier',
      executiveSummary: output.summary,
      tamValue: (output.result.tamValue as string) || undefined,
      samValue: (output.result.samValue as string) || undefined,
      somValue: (output.result.somValue as string) || undefined,
      tamBillion: (output.result.tamBillion as number) || undefined,
      samSharePct: (output.result.samSharePct as number) || undefined,
      somSharePct: (output.result.somSharePct as number) || undefined,
      cagr: (output.result.cagr as string) || undefined,
      growthDrivers: output.findings.slice(0, 5),
      isSavedToBrain: true,
      status: 'completed',
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    };

    await researchRepository.create(report);
    return report;
  }
}

export const reportingEngine = new ReportingEngine();
