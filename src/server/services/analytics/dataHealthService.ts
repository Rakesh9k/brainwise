/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../../db/firestore';
import { MetricCalculator } from './metricCalculator';
import type { ConnectorHealthEntity, ConnectorSyncStatus } from './dataIngestionTypes';

export class DataHealthService {
  /**
   * Retrieves or initializes connector health status for a workspace
   */
  public async getConnectorHealth(
    workspaceId: string,
    provider: ConnectorHealthEntity['provider']
  ): Promise<ConnectorHealthEntity> {
    const docRef = db.doc<ConnectorHealthEntity>(
      `workspaces/${workspaceId}/connectorHealth/${provider}`
    );
    const snap = await docRef.get();
    if (snap.exists && snap.data()) {
      return snap.data()!;
    }

    // Default unconfigured/disconnected state
    const initial: ConnectorHealthEntity = {
      connectorId: `conn_${provider.toLowerCase()}`,
      workspaceId,
      provider,
      status: 'DISCONNECTED',
      authValid: false,
      lastSuccessfulSyncAt: null,
      lastAttemptedSyncAt: null,
      dataFreshnessHours: null,
      recordsReceived: 0,
      recordsProcessed: 0,
      recordsRejected: 0,
      recordsDuplicated: 0,
      missingFieldsDetected: [],
      historicalCoverageStart: null,
      historicalCoverageEnd: null,
      unresolvedErrors: [],
    };

    await docRef.set(initial);
    return initial;
  }

  /**
   * Updates health metrics after a sync run
   */
  public async recordSyncResult(params: {
    workspaceId: string;
    provider: ConnectorHealthEntity['provider'];
    status: ConnectorSyncStatus;
    authValid: boolean;
    recordsReceived: number;
    recordsProcessed: number;
    recordsRejected: number;
    recordsDuplicated: number;
    missingFields?: string[];
    coverageWindow?: { start: string; end: string };
    error?: { code: string; message: string };
  }): Promise<ConnectorHealthEntity> {
    const {
      workspaceId,
      provider,
      status,
      authValid,
      recordsReceived,
      recordsProcessed,
      recordsRejected,
      recordsDuplicated,
      missingFields = [],
      coverageWindow,
      error,
    } = params;

    const current = await this.getConnectorHealth(workspaceId, provider);
    const now = new Date().toISOString();

    const unresolved = [...current.unresolvedErrors];
    if (error) {
      unresolved.push({
        code: error.code,
        message: error.message,
        timestamp: now,
        retryCount: 1,
      });
    }

    let freshnessHours: number | null = null;
    let lastSuccess = current.lastSuccessfulSyncAt;

    if (status === 'SYNCHRONIZED' && error === undefined) {
      lastSuccess = now;
      freshnessHours = 0;
    } else if (lastSuccess) {
      freshnessHours = MetricCalculator.round(
        (Date.now() - new Date(lastSuccess).getTime()) / (1000 * 60 * 60),
        1
      );
    }

    // Guardrail: Never label an incomplete connector as fully healthy
    let certifiedStatus = status;
    if (recordsRejected > 0 && certifiedStatus === 'SYNCHRONIZED') {
      certifiedStatus = 'PARTIALLY_SYNCHRONIZED';
    }
    if (!authValid && certifiedStatus !== 'DISCONNECTED') {
      certifiedStatus = 'PERMISSION_EXPIRED';
    }

    const updated: ConnectorHealthEntity = {
      ...current,
      status: certifiedStatus,
      authValid,
      lastAttemptedSyncAt: now,
      lastSuccessfulSyncAt: lastSuccess,
      dataFreshnessHours: freshnessHours,
      recordsReceived: current.recordsReceived + recordsReceived,
      recordsProcessed: current.recordsProcessed + recordsProcessed,
      recordsRejected: current.recordsRejected + recordsRejected,
      recordsDuplicated: current.recordsDuplicated + recordsDuplicated,
      missingFieldsDetected: Array.from(new Set([...current.missingFieldsDetected, ...missingFields])),
      historicalCoverageStart: coverageWindow?.start || current.historicalCoverageStart,
      historicalCoverageEnd: coverageWindow?.end || current.historicalCoverageEnd,
      unresolvedErrors: unresolved.slice(-10), // keep latest 10
    };

    await db.doc<ConnectorHealthEntity>(`workspaces/${workspaceId}/connectorHealth/${provider}`).set(updated);
    return updated;
  }

  /**
   * Evaluates overall data readiness score across all active connectors for a workspace
   */
  public async getWorkspaceDataHealthOverview(workspaceId: string): Promise<{
    overallScorePercent: number;
    activeConnectorsCount: number;
    connectors: ConnectorHealthEntity[];
    isProductionTelemetryReady: boolean;
  }> {
    const providers: ConnectorHealthEntity['provider'][] = [
      'STRIPE',
      'SHOPIFY',
      'GA4',
      'GOOGLE_ADS',
      'META_ADS',
    ];

    const connectors = await Promise.all(
      providers.map((p) => this.getConnectorHealth(workspaceId, p))
    );

    const connectedList = connectors.filter(
      (c) => c.status === 'SYNCHRONIZED' || c.status === 'PARTIALLY_SYNCHRONIZED'
    );

    let score = 0;
    if (connectedList.length > 0) {
      const syncd = connectedList.filter((c) => c.status === 'SYNCHRONIZED').length;
      score = Math.round((syncd / providers.length) * 100);
    }

    return {
      overallScorePercent: score,
      activeConnectorsCount: connectedList.length,
      connectors,
      isProductionTelemetryReady: connectedList.length > 0 && score >= 40,
    };
  }
}

export const dataHealthService = new DataHealthService();
