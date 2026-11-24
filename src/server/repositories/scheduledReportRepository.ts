/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../db/firestore';
import type { ScheduledIntelligenceReportEntity } from '../types/api';

export class ScheduledReportRepository {
  public async create(
    report: ScheduledIntelligenceReportEntity
  ): Promise<ScheduledIntelligenceReportEntity> {
    await db
      .doc<ScheduledIntelligenceReportEntity>(
        `workspaces/${report.workspaceId}/scheduledReports/${report.reportId}`
      )
      .set(report);
    return report;
  }

  public async findById(
    workspaceId: string,
    reportId: string
  ): Promise<ScheduledIntelligenceReportEntity | null> {
    const snap = await db
      .doc<ScheduledIntelligenceReportEntity>(
        `workspaces/${workspaceId}/scheduledReports/${reportId}`
      )
      .get();
    return snap.exists && snap.data() ? snap.data()! : null;
  }

  public async listByWorkspace(
    workspaceId: string,
    filter?: { frequency?: string; reportType?: string }
  ): Promise<ScheduledIntelligenceReportEntity[]> {
    const coll = db.collection<ScheduledIntelligenceReportEntity>(
      `workspaces/${workspaceId}/scheduledReports`
    );
    const snap = await coll.orderBy('generatedAt', 'desc').get();
    let reports: ScheduledIntelligenceReportEntity[] = snap.docs
      .map((d) => d.data())
      .filter((d): d is ScheduledIntelligenceReportEntity => Boolean(d));

    if (filter?.frequency) {
      reports = reports.filter(
        (r) => r.frequency.toUpperCase() === filter.frequency!.toUpperCase()
      );
    }
    if (filter?.reportType) {
      reports = reports.filter(
        (r) => r.reportType.toUpperCase() === filter.reportType!.toUpperCase()
      );
    }

    return reports;
  }
}

export const scheduledReportRepository = new ScheduledReportRepository();
