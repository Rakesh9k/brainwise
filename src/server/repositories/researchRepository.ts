/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../db/firestore';
import type { ResearchReportEntity, RecommendationEntity } from '../types/api';

export class ResearchRepository {
  public async listByWorkspace(workspaceId: string): Promise<ResearchReportEntity[]> {
    const snap = await db
      .collection<ResearchReportEntity>(`workspaces/${workspaceId}/researchReports`)
      .orderBy('createdAt', 'desc')
      .get();
    return snap.docs.map((d) => d.data()).filter((d): d is ResearchReportEntity => Boolean(d));
  }

  public async findById(
    workspaceId: string,
    reportId: string
  ): Promise<ResearchReportEntity | null> {
    const snap = await db
      .doc<ResearchReportEntity>(`workspaces/${workspaceId}/researchReports/${reportId}`)
      .get();
    return snap.exists && snap.data() ? snap.data()! : null;
  }

  public async create(report: ResearchReportEntity): Promise<ResearchReportEntity> {
    await db
      .doc<ResearchReportEntity>(
        `workspaces/${report.workspaceId}/researchReports/${report.reportId}`
      )
      .set(report);
    return report;
  }

  public async update(
    workspaceId: string,
    reportId: string,
    patch: Partial<ResearchReportEntity>
  ): Promise<ResearchReportEntity> {
    const now = db.serverTimestamp();
    await db
      .doc<ResearchReportEntity>(`workspaces/${workspaceId}/researchReports/${reportId}`)
      .update({
        ...patch,
        updatedAt: now,
      });
    const updated = await this.findById(workspaceId, reportId);
    if (!updated) throw new Error(`Research report '${reportId}' not found`);
    return updated;
  }
}

export class RecommendationRepository {
  public async listByWorkspace(workspaceId: string): Promise<RecommendationEntity[]> {
    const snap = await db
      .collection<RecommendationEntity>(`workspaces/${workspaceId}/recommendations`)
      .orderBy('createdAt', 'desc')
      .get();
    return snap.docs.map((d) => d.data()).filter((d): d is RecommendationEntity => Boolean(d));
  }

  public async findById(
    workspaceId: string,
    recommendationId: string
  ): Promise<RecommendationEntity | null> {
    const snap = await db
      .doc<RecommendationEntity>(`workspaces/${workspaceId}/recommendations/${recommendationId}`)
      .get();
    return snap.exists && snap.data() ? snap.data()! : null;
  }

  public async create(rec: RecommendationEntity): Promise<RecommendationEntity> {
    await db
      .doc<RecommendationEntity>(
        `workspaces/${rec.workspaceId}/recommendations/${rec.recommendationId}`
      )
      .set(rec);
    return rec;
  }

  public async updateStatus(
    workspaceId: string,
    recommendationId: string,
    status: 'accepted' | 'rejected'
  ): Promise<RecommendationEntity> {
    const now = db.serverTimestamp();
    await db
      .doc<RecommendationEntity>(`workspaces/${workspaceId}/recommendations/${recommendationId}`)
      .update({
        status,
        updatedAt: now,
      });
    const updated = await this.findById(workspaceId, recommendationId);
    if (!updated) throw new Error(`Recommendation '${recommendationId}' not found`);
    return updated;
  }
}

export const researchRepository = new ResearchRepository();
export const recommendationRepository = new RecommendationRepository();
