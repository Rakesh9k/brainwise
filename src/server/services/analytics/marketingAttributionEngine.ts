/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MetricCalculator } from './metricCalculator';

export type AttributionModelType =
  | 'FIRST_TOUCH'
  | 'LAST_TOUCH'
  | 'LINEAR'
  | 'TIME_DECAY'
  | 'POSITION_BASED_U_SHAPED';

export interface TouchpointEvent {
  touchpointId: string;
  customerId: string;
  channel: string;
  campaign?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  timestamp: string;
}

export interface CustomerConversionJourney {
  conversionId: string;
  customerId: string;
  conversionTimestamp: string;
  revenueAmount: number;
  currency: string;
  touchpoints: TouchpointEvent[];
}

export interface ChannelAttributionResult {
  channel: string;
  model: AttributionModelType;
  attributedConversions: number;
  assistedConversions: number;
  attributedRevenue: number;
  currency: string;
  spend?: number;
  cac?: number | null;
  roas?: number | null;
  roiPercent?: number | null;
}

export interface AttributionOverview {
  model: AttributionModelType;
  totalConversions: number;
  totalAttributedRevenue: number;
  totalUnattributedRevenue: number;
  currency: string;
  channelBreakdown: ChannelAttributionResult[];
}

export class MarketingAttributionEngine {
  /**
   * Distributes conversion revenue and credit across journey touchpoints based on selected model
   */
  public evaluateAttribution(params: {
    journeys: CustomerConversionJourney[];
    channelSpend?: Record<string, number>;
    model?: AttributionModelType;
    currency?: string;
  }): AttributionOverview {
    const { journeys, channelSpend = {}, model = 'POSITION_BASED_U_SHAPED', currency = 'USD' } = params;

    const channelMap = new Map<
      string,
      {
        attributedConversions: number;
        assistedConversions: number;
        attributedRevenue: number;
      }
    >();

    const getOrCreate = (channel: string) => {
      const existing = channelMap.get(channel);
      if (existing) return existing;
      const created = { attributedConversions: 0, assistedConversions: 0, attributedRevenue: 0 };
      channelMap.set(channel, created);
      return created;
    };

    let totalAttributedRev = 0;
    let totalUnattributedRev = 0;
    let totalConversions = 0;

    for (const j of journeys) {
      totalConversions++;
      const sortedTouchpoints = [...j.touchpoints].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      if (sortedTouchpoints.length === 0) {
        totalUnattributedRev += j.revenueAmount;
        const unattributed = getOrCreate('UNATTRIBUTED');
        unattributed.attributedConversions += 1;
        unattributed.attributedRevenue += j.revenueAmount;
        continue;
      }

      totalAttributedRev += j.revenueAmount;
      const N = sortedTouchpoints.length;

      // Mark assisted conversions for all touchpoints except the last one
      const assistChannels = new Set<string>();
      for (let i = 0; i < N - 1; i++) {
        assistChannels.add(sortedTouchpoints[i].channel);
      }
      for (const ch of assistChannels) {
        getOrCreate(ch).assistedConversions += 1;
      }

      // Compute weight vector based on model
      const weights: number[] = new Array(N).fill(0);

      switch (model) {
        case 'FIRST_TOUCH':
          weights[0] = 1.0;
          break;

        case 'LAST_TOUCH':
          weights[N - 1] = 1.0;
          break;

        case 'LINEAR':
          for (let i = 0; i < N; i++) {
            weights[i] = 1.0 / N;
          }
          break;

        case 'TIME_DECAY': {
          // Half-life of 7 days (7 * 24 * 3600 * 1000 ms)
          const convTime = new Date(j.conversionTimestamp).getTime();
          const halfLifeMs = 7 * 24 * 60 * 60 * 1000;
          let weightSum = 0;
          const rawWeights: number[] = [];

          for (let i = 0; i < N; i++) {
            const touchTime = new Date(sortedTouchpoints[i].timestamp).getTime();
            const deltaMs = Math.max(0, convTime - touchTime);
            const w = Math.pow(2, -deltaMs / halfLifeMs);
            rawWeights.push(w);
            weightSum += w;
          }

          for (let i = 0; i < N; i++) {
            weights[i] = weightSum > 0 ? rawWeights[i] / weightSum : 1.0 / N;
          }
          break;
        }

        case 'POSITION_BASED_U_SHAPED':
        default: {
          if (N === 1) {
            weights[0] = 1.0;
          } else if (N === 2) {
            weights[0] = 0.5;
            weights[1] = 0.5;
          } else {
            weights[0] = 0.4;
            weights[N - 1] = 0.4;
            const middleWeight = 0.2 / (N - 2);
            for (let i = 1; i < N - 1; i++) {
              weights[i] = middleWeight;
            }
          }
          break;
        }
      }

      // Apply weights to channels
      for (let i = 0; i < N; i++) {
        const tp = sortedTouchpoints[i];
        const w = weights[i];
        const data = getOrCreate(tp.channel);
        data.attributedConversions += w;
        data.attributedRevenue += w * j.revenueAmount;
      }
    }

    const channelBreakdown: ChannelAttributionResult[] = [];

    for (const [channel, data] of channelMap.entries()) {
      const spend = channelSpend[channel] || 0;
      const roundedConversions = MetricCalculator.round(data.attributedConversions, 2);
      const roundedRevenue = MetricCalculator.round(data.attributedRevenue, 2);

      let cac: number | null = null;
      let roas: number | null = null;
      let roi: number | null = null;

      if (spend > 0) {
        cac = MetricCalculator.safeRatio(spend, roundedConversions);
        roas = MetricCalculator.safeRatio(roundedRevenue, spend);
        roi = MetricCalculator.safeRatio(roundedRevenue - spend, spend, 100);
      }

      channelBreakdown.push({
        channel,
        model,
        attributedConversions: roundedConversions,
        assistedConversions: data.assistedConversions,
        attributedRevenue: roundedRevenue,
        currency,
        spend: spend > 0 ? spend : undefined,
        cac: cac !== null ? MetricCalculator.round(cac, 2) : null,
        roas: roas !== null ? MetricCalculator.round(roas, 2) : null,
        roiPercent: roi !== null ? MetricCalculator.round(roi, 1) : null,
      });
    }

    return {
      model,
      totalConversions,
      totalAttributedRevenue: MetricCalculator.round(totalAttributedRev, 2),
      totalUnattributedRevenue: MetricCalculator.round(totalUnattributedRev, 2),
      currency,
      channelBreakdown: channelBreakdown.sort((a, b) => b.attributedRevenue - a.attributedRevenue),
    };
  }
}

export const marketingAttributionEngine = new MarketingAttributionEngine();
