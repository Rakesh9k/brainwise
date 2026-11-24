/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface GrowthMetricSnapshot {
  timestamp: string;
  monthlyVisitors: number;
  signupsOrLeads: number;
  payingCustomers: number;
  conversionRatePercent: number;
  monthlyRevenue: number;
  blendedCac: number;
  retentionRate90Day: number;
  sampleSize: number;
  isStatisticallySignificant: boolean;
  dataFreshnessHours: number;
  dataCompletenessScorePercent: number;
  missingFields: string[];
  source: 'GA4_GSC_INGESTED' | 'STRIPE_INGESTED' | 'PAYMENT_GATEWAY' | 'MANUAL_LOGGED' | 'MODELED_BASELINE';
  confidence: number;
}

export interface MetricAnomalyAlert {
  alertId: string;
  workspaceId: string;
  metricName: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  changeDescription: string;
  likelyCause: string;
  recommendedAction: string;
  detectedAt: string;
  isStatisticallySignificant?: boolean;
  sampleSizeNotice?: string;
}

export class GrowthAnalyticsEngine {
  /**
   * Ingests or computes latest growth telemetry and detects anomalies
   */
  public evaluateGrowthMetrics(params: {
    workspaceId: string;
    currentMetrics: Partial<GrowthMetricSnapshot>;
    previousMetrics?: Partial<GrowthMetricSnapshot>;
  }): {
    snapshot: GrowthMetricSnapshot;
    alerts: MetricAnomalyAlert[];
  } {
    const { workspaceId, currentMetrics, previousMetrics } = params;
    const now = new Date().toISOString();

    // Calculate data completeness
    const coreFields: Array<keyof GrowthMetricSnapshot> = [
      'monthlyVisitors',
      'signupsOrLeads',
      'payingCustomers',
      'conversionRatePercent',
      'monthlyRevenue',
      'blendedCac',
    ];
    const missingFields: string[] = [];
    let populatedCount = 0;

    for (const f of coreFields) {
      if (currentMetrics[f] !== undefined && currentMetrics[f] !== null && currentMetrics[f] !== 0) {
        populatedCount++;
      } else {
        missingFields.push(f);
      }
    }

    const dataCompletenessScorePercent = Math.round((populatedCount / coreFields.length) * 100);
    const sampleSize = currentMetrics.sampleSize || currentMetrics.monthlyVisitors || currentMetrics.signupsOrLeads || 0;
    const isStatisticallySignificant = sampleSize >= 30;
    const dataFreshnessHours = currentMetrics.dataFreshnessHours || 0;

    const snapshot: GrowthMetricSnapshot = {
      timestamp: now,
      monthlyVisitors: currentMetrics.monthlyVisitors || 0,
      signupsOrLeads: currentMetrics.signupsOrLeads || 0,
      payingCustomers: currentMetrics.payingCustomers || 0,
      conversionRatePercent: currentMetrics.conversionRatePercent || (
        currentMetrics.monthlyVisitors && currentMetrics.signupsOrLeads
          ? Math.round((currentMetrics.signupsOrLeads / currentMetrics.monthlyVisitors) * 1000) / 10
          : 0
      ),
      monthlyRevenue: currentMetrics.monthlyRevenue || 0,
      blendedCac: currentMetrics.blendedCac || 0,
      retentionRate90Day: currentMetrics.retentionRate90Day || 0,
      sampleSize,
      isStatisticallySignificant,
      dataFreshnessHours,
      dataCompletenessScorePercent,
      missingFields,
      source: currentMetrics.source || 'MODELED_BASELINE',
      confidence: currentMetrics.confidence || (isStatisticallySignificant ? 0.9 : 0.65),
    };

    const alerts: MetricAnomalyAlert[] = [];

    // Anomaly 1: Traffic or visitor decline > 20%
    if (
      previousMetrics?.monthlyVisitors &&
      snapshot.monthlyVisitors > 0 &&
      snapshot.monthlyVisitors < previousMetrics.monthlyVisitors * 0.8
    ) {
      const dropPercent = Math.round(
        ((previousMetrics.monthlyVisitors - snapshot.monthlyVisitors) / previousMetrics.monthlyVisitors) * 100
      );
      alerts.push({
        alertId: `alt_${Date.now()}_traffic_drop`,
        workspaceId,
        metricName: 'Monthly Visitors',
        severity: isStatisticallySignificant ? 'WARNING' : 'INFO',
        changeDescription: `Monthly traffic dropped by ${dropPercent}% (from ${previousMetrics.monthlyVisitors} to ${snapshot.monthlyVisitors}).`,
        likelyCause: 'Algorithm update on organic search channels or seasonal demand dip.',
        recommendedAction: 'Deploy a multi-slide static carousel on LinkedIn and distribute to community partners.',
        detectedAt: now,
        isStatisticallySignificant,
        sampleSizeNotice: isStatisticallySignificant
          ? undefined
          : `Sample size (${sampleSize}) is below threshold (N>=30); anomaly may reflect short-term noise.`,
      });
    }

    // Anomaly 2: Rising CAC > 25%
    if (
      previousMetrics?.blendedCac &&
      snapshot.blendedCac > previousMetrics.blendedCac * 1.25
    ) {
      const spikePercent = Math.round(
        ((snapshot.blendedCac - previousMetrics.blendedCac) / previousMetrics.blendedCac) * 100
      );
      alerts.push({
        alertId: `alt_${Date.now()}_cac_spike`,
        workspaceId,
        metricName: 'Blended CAC',
        severity: isStatisticallySignificant ? 'CRITICAL' : 'WARNING',
        changeDescription: `Blended Customer Acquisition Cost rose by ${spikePercent}% (from ${previousMetrics.blendedCac} to ${snapshot.blendedCac}).`,
        likelyCause: 'Audience fatigue or increased bid competition on primary acquisition channel.',
        recommendedAction: 'Pause underperforming ads and pivot to founder outbound wedge.',
        detectedAt: now,
        isStatisticallySignificant,
        sampleSizeNotice: isStatisticallySignificant
          ? undefined
          : `Sample size (${sampleSize}) is below threshold (N>=30); low volume may reflect noise.`,
      });
    }

    // Anomaly 3: Conversion rate drop
    if (
      previousMetrics?.conversionRatePercent &&
      snapshot.conversionRatePercent < previousMetrics.conversionRatePercent * 0.75
    ) {
      alerts.push({
        alertId: `alt_${Date.now()}_conv_drop`,
        workspaceId,
        metricName: 'Conversion Rate',
        severity: isStatisticallySignificant ? 'CRITICAL' : 'WARNING',
        changeDescription: `Funnel conversion rate dropped from ${previousMetrics.conversionRatePercent}% to ${snapshot.conversionRatePercent}%.`,
        likelyCause: 'Checkout friction, recent copy changes, or unverified pricing changes.',
        recommendedAction: 'Run a 14-day CRO test restoring Evidence Badges and transparent pricing proof.',
        detectedAt: now,
        isStatisticallySignificant,
      });
    }

    // Anomaly 4: Stale telemetry data
    if (dataFreshnessHours > 72) {
      alerts.push({
        alertId: `alt_${Date.now()}_stale_data`,
        workspaceId,
        metricName: 'Telemetry Freshness',
        severity: 'INFO',
        changeDescription: `Growth telemetry has not been synchronized in ${dataFreshnessHours} hours.`,
        likelyCause: 'External data connector sync paused or no manual entries logged this week.',
        recommendedAction: 'Run an on-demand metrics synchronization cycle or update manual logs.',
        detectedAt: now,
        isStatisticallySignificant: true,
      });
    }

    return { snapshot, alerts };
  }
}

export const growthAnalyticsEngine = new GrowthAnalyticsEngine();
