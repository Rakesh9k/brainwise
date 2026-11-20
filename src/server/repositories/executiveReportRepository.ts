/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../db/firestore';
import type { ExecutiveReportEntity } from '../types/api';

export class ExecutiveReportRepository {
  public async create(report: ExecutiveReportEntity): Promise<ExecutiveReportEntity> {
    await db
      .collection<ExecutiveReportEntity>(`workspaces/${report.workspaceId}/executiveReports`)
      .doc(report.reportId)
      .set(report);
    return report;
  }

  public async get(workspaceId: string, reportId: string): Promise<ExecutiveReportEntity | null> {
    const snap = await db
      .collection<ExecutiveReportEntity>(`workspaces/${workspaceId}/executiveReports`)
      .doc(reportId)
      .get();
    return snap.exists ? (snap.data() as ExecutiveReportEntity) : null;
  }

  public async listByWorkspace(
    workspaceId: string,
    reportType?: ExecutiveReportEntity['reportType']
  ): Promise<ExecutiveReportEntity[]> {
    let query = db
      .collection<ExecutiveReportEntity>(`workspaces/${workspaceId}/executiveReports`)
      .orderBy('createdAt', 'desc');

    if (reportType) {
      query = query.where('reportType', '==', reportType);
    }

    const snap = await query.get();
    return snap.docs.map((d) => d.data()).filter(Boolean) as ExecutiveReportEntity[];
  }
}

export const executiveReportRepository = new ExecutiveReportRepository();
