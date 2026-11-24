/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import type { MetricCalculationResult } from '../server/services/analytics/metricTypes';
import type { ConnectorHealthEntity } from '../server/services/analytics/dataIngestionTypes';
import { apiClient } from '../services/apiClient';

export interface AnalyticsOverviewData {
  workspaceId: string;
  businessName: string;
  reportingPeriod: { startDate: string; endDate: string };
  metrics: MetricCalculationResult[];
  dataHealth: {
    overallScorePercent: number;
    activeConnectorsCount: number;
    connectors: ConnectorHealthEntity[];
    isProductionTelemetryReady: boolean;
  };
  activeExperimentsCount: number;
}

export function useAnalyticsIntelligence(workspaceId?: string, enabled: boolean = true) {
  const [data, setData] = useState<AnalyticsOverviewData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = useCallback(async () => {
    if (!workspaceId || workspaceId === 'default' || workspaceId === 'ws_vishesh_growth' || !enabled) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const overview = await apiClient.getAnalyticsOverview(workspaceId);
      setData(overview);
    } catch (err: any) {
      setError(err?.message || 'Failed to load analytics overview');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, enabled]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const askAssistant = async (question: string) => {
    if (!workspaceId || workspaceId === 'default' || workspaceId === 'ws_vishesh_growth') return null;
    return apiClient.askAnalyticsAssistant(workspaceId, question);
  };

  return { data, loading, error, refetch: fetchOverview, askAssistant };
}
