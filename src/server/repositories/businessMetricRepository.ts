/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../db/firestore';
import type { BusinessMetricEventEntity } from '../types/api';

export class BusinessMetricRepository {
  public async create(metric: BusinessMetricEventEntity): Promise<BusinessMetricEventEntity> {
    await db
      .doc<BusinessMetricEventEntity>(
        `workspaces/${metric.workspaceId}/businessMetrics/${metric.metricId}`
      )
      .set(metric);
    return metric;
  }

  public async findById(
    workspaceId: string,
    metricId: string
  ): Promise<BusinessMetricEventEntity | null> {
    const snap = await db
      .doc<BusinessMetricEventEntity>(`workspaces/${workspaceId}/businessMetrics/${metricId}`)
      .get();
    return snap.exists && snap.data() ? snap.data()! : null;
  }

  public async findByIdempotencyKey(
    workspaceId: string,
    idempotencyKey: string
  ): Promise<BusinessMetricEventEntity | null> {
    const snap = await db
      .collection<BusinessMetricEventEntity>(`workspaces/${workspaceId}/businessMetrics`)
      .where('idempotencyKey', '==', idempotencyKey)
      .limit(1)
      .get();
    if (snap.empty || !snap.docs[0].exists) return null;
    return snap.docs[0].data() || null;
  }

  public async listByWorkspace(
    workspaceId: string,
    filter?: { metricType?: string; channel?: string; startDate?: string; endDate?: string }
  ): Promise<BusinessMetricEventEntity[]> {
    const coll = db.collection<BusinessMetricEventEntity>(
      `workspaces/${workspaceId}/businessMetrics`
    );
    const snap = await coll.orderBy('timestamp', 'desc').get();
    let metrics: BusinessMetricEventEntity[] = snap.docs
      .map((d) => d.data())
      .filter((d): d is BusinessMetricEventEntity => Boolean(d));

    if (filter?.metricType) {
      metrics = metrics.filter(
        (m) => m.metricType.toUpperCase() === filter.metricType!.toUpperCase()
      );
    }
    if (filter?.channel) {
      metrics = metrics.filter((m) => m.channel?.toLowerCase() === filter.channel!.toLowerCase());
    }
    if (filter?.startDate) {
      metrics = metrics.filter((m) => m.timestamp >= filter.startDate!);
    }
    if (filter?.endDate) {
      metrics = metrics.filter((m) => m.timestamp <= filter.endDate!);
    }

    return metrics;
  }
}

export const businessMetricRepository = new BusinessMetricRepository();
