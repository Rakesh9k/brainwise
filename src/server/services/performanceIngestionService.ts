/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'node:crypto';
import { businessMetricRepository } from '../repositories/businessMetricRepository';
import { campaignPerformanceRepository } from '../repositories/campaignPerformanceRepository';
import { goalRepository } from '../repositories/goalRepository';
import { memoryService } from './memoryService';
import { sharedBusinessContextService } from './sharedBusinessContextService';
import type {
  BusinessMetricEventEntity,
  BusinessMetricType,
  CampaignExperimentResultEntity,
  MetricAttributionModel,
} from '../types/api';

export class PerformanceIngestionService {
  /**
   * Computes deterministic idempotency key for metric events
   */
  private generateMetricIdempotencyKey(
    workspaceId: string,
    source: string,
    metricType: string,
    metricName: string,
    timestamp: string
  ): string {
    const raw = `${workspaceId}:${source}:${metricType}:${metricName}:${timestamp}`;
    return `met_idem_${crypto.createHash('sha256').update(raw).digest('hex').substring(0, 24)}`;
  }

  /**
   * Ingests a granular business metric event with attribution checking and deduplication
   */
  public async ingestMetricEvent(params: {
    workspaceId: string;
    source: string;
    metricType: BusinessMetricType;
    metricName: string;
    value: number;
    currency?: string;
    definition: string;
    channel?: string;
    campaignId?: string;
    attributionModel?: MetricAttributionModel;
    isAttributed?: boolean;
    sampleSize?: number;
    measurementPeriod: { startDate: string; endDate: string };
    timestamp?: string;
    idempotencyKey?: string;
    confidence?: number;
  }): Promise<{ metric: BusinessMetricEventEntity; isDuplicate: boolean }> {
    const {
      workspaceId,
      source,
      metricType,
      metricName,
      value,
      currency,
      definition,
      channel,
      campaignId,
      attributionModel = 'UNATTRIBUTED',
      isAttributed = attributionModel !== 'UNATTRIBUTED',
      sampleSize,
      measurementPeriod,
      timestamp = new Date().toISOString(),
      confidence = 0.95,
    } = params;

    // Strict validation: do not confuse revenue with vanity metrics
    if (metricType === 'REVENUE' && !currency) {
      throw new Error(`VALIDATION_ERROR: Metric type REVENUE requires a specified currency.`);
    }

    // Deduplication check
    const key =
      params.idempotencyKey ||
      this.generateMetricIdempotencyKey(workspaceId, source, metricType, metricName, timestamp);

    const existing = await businessMetricRepository.findByIdempotencyKey(workspaceId, key);
    if (existing) {
      return { metric: existing, isDuplicate: true };
    }

    const metricId = `metric_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const now = new Date().toISOString();

    const entity: BusinessMetricEventEntity = {
      metricId,
      workspaceId,
      source,
      metricType,
      metricName,
      value,
      currency,
      definition,
      channel,
      campaignId,
      attributionModel,
      isAttributed,
      sampleSize,
      measurementPeriod,
      timestamp,
      idempotencyKey: key,
      confidence,
      createdAt: now,
    };

    const saved = await businessMetricRepository.create(entity);
    return { metric: saved, isDuplicate: false };
  }

  /**
   * Ingests a completed campaign or marketing experiment, evaluates sample size, computes conversion metrics,
   * updates goal progress, and stores lessons learned into Episodic Memory.
   */
  public async ingestCampaignExperiment(params: {
    workspaceId: string;
    campaignName: string;
    objective: string;
    hypothesis: string;
    targetAudience: string;
    strategy?: string;
    channel: string;
    contentReference?: string;
    budget: number;
    cost: number;
    currency?: string;
    startDate?: string;
    endDate?: string;
    executionDate?: string;
    successCriteria?: string;
    baselineMetrics?: Record<string, number>;
    dataSources?: string[];
    idempotencyKey?: string;
    results: {
      views?: number;
      clicks?: number;
      leads?: number;
      conversions?: number;
      revenue?: number;
    };
    targetConversions?: number;
    connectedGoalId?: string;
  }): Promise<CampaignExperimentResultEntity> {
    const {
      workspaceId,
      campaignName,
      objective,
      hypothesis,
      targetAudience,
      strategy = 'DIRECT_RESPONSE',
      channel,
      contentReference,
      budget,
      cost,
      currency = 'USD',
      startDate,
      endDate,
      executionDate = new Date().toISOString(),
      successCriteria = 'Positive ROI & acceptable unit economics',
      baselineMetrics = {},
      dataSources = ['Manual / API Ingestion'],
      idempotencyKey,
      results,
      targetConversions = 10,
      connectedGoalId,
    } = params;

    // Deduplication check if idempotencyKey provided
    if (idempotencyKey) {
      const existing = await campaignPerformanceRepository.findByIdempotencyKey(
        workspaceId,
        idempotencyKey
      );
      if (existing) {
        return existing;
      }
    }

    // 1. Calculate Standard Conversion Metrics
    const views = results.views || 0;
    const clicks = results.clicks || 0;
    const leads = results.leads || 0;
    const conversions = results.conversions || 0;
    const revenue = results.revenue || 0;

    const ctr = views > 0 ? Number(((clicks / views) * 100).toFixed(2)) : undefined;
    const cvr = clicks > 0 ? Number(((conversions / clicks) * 100).toFixed(2)) : undefined;
    const cpa = conversions > 0 ? Number((cost / conversions).toFixed(2)) : undefined;
    const roas = cost > 0 && revenue > 0 ? Number((revenue / cost).toFixed(2)) : undefined;

    // 2. Sample Size & Attribution Adequacy Check
    const sampleSizeAdequate = clicks >= 30 && (conversions >= 5 || views >= 500);
    let attributionConfidence: CampaignExperimentResultEntity['attributionConfidence'] = 'HIGH';
    if (!sampleSizeAdequate) {
      attributionConfidence = 'LOW';
    }

    // 3. Evaluate Outcome against Objectives
    let outcome: CampaignExperimentResultEntity['outcome'] = 'MIXED';
    if (!sampleSizeAdequate) {
      outcome = 'INCONCLUSIVE';
    } else if (conversions >= targetConversions && (roas === undefined || roas >= 1.0)) {
      outcome = 'SUCCESS';
    } else if (
      conversions < targetConversions * 0.5 ||
      (roas !== undefined && roas < 0.6) ||
      (cpa && cpa > budget / 2)
    ) {
      outcome = 'FAILURE';
    }

    // 4. Generate Grounded Lessons Learned
    const lessonsLearned: string[] = [];
    if (outcome === 'SUCCESS') {
      lessonsLearned.push(
        `Audience '${targetAudience}' on channel '${channel}' exceeded target conversions with ${conversions} conversions (CTR: ${ctr || 'N/A'}%, CVR: ${cvr || 'N/A'}%).`
      );
    } else if (outcome === 'FAILURE') {
      lessonsLearned.push(
        `Campaign fell short of target (${conversions}/${targetConversions} conversions). High CPA ($${cpa || 'N/A'}) suggests messaging mismatch or channel saturation.`
      );
    } else if (outcome === 'INCONCLUSIVE') {
      lessonsLearned.push(
        `Sample size insufficient (${clicks} clicks, ${conversions} conversions) to draw definitive statistical conclusions. Treat findings as preliminary hypotheses.`
      );
    } else {
      lessonsLearned.push(
        `Mixed performance: moderate conversion rate (${cvr || 'N/A'}%) but unit economics require optimization.`
      );
    }

    const experimentId = `exp_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const now = new Date().toISOString();

    const experimentEntity: CampaignExperimentResultEntity = {
      experimentId,
      workspaceId,
      campaignName,
      name: campaignName,
      objective,
      businessObjective: objective,
      hypothesis,
      targetAudience,
      strategy,
      channel,
      contentReference,
      budget,
      cost,
      spend: cost,
      currency,
      startDate: startDate || executionDate,
      endDate: endDate || executionDate,
      executionDate,
      successCriteria,
      baselineMetrics,
      dataSources,
      idempotencyKey,
      results: { views, clicks, leads, conversions, revenue },
      actualOutcomes: { views, clicks, leads, conversions, revenue, ctr, cvr, cpa, roas },
      conversionMetrics: { ctr, cvr, cpa, roas },
      ctr,
      cpa,
      conversions,
      outcome,
      finalAssessment: outcome as 'SUCCESS' | 'FAILURE' | 'INCONCLUSIVE' | 'MIXED',
      lessonsLearned,
      attributionConfidence,
      confidenceScore: attributionConfidence === 'HIGH' ? 0.95 : 0.45,
      sampleSizeAdequate,
      connectedGoalId,
      createdAt: now,
      updatedAt: now,
    };

    const saved = await campaignPerformanceRepository.create(experimentEntity);

    // 5. Update Connected Business Goal If Specified
    if (connectedGoalId) {
      const goal = await goalRepository.findById(workspaceId, connectedGoalId);
      if (goal) {
        const addedProgress = conversions || revenue || 1;
        const newProgress = Math.min(goal.targetValue, goal.currentValue + addedProgress);
        const newStatus = newProgress >= goal.targetValue ? 'achieved' : 'on_track';
        await goalRepository.update(workspaceId, connectedGoalId, {
          currentValue: newProgress,
          status: newStatus,
        });
      }
    }

    // 6. Record Episode in Episodic Memory for Continuous Learning
    await memoryService.recordEpisode({
      workspaceId,
      department: 'MARKETING',
      activityType:
        outcome === 'SUCCESS'
          ? 'experiment_success'
          : outcome === 'FAILURE'
            ? 'experiment_failure'
            : 'campaign_run',
      title: `Campaign Outcome: ${campaignName}`,
      summary: `${outcome.toUpperCase()} on ${channel}: ${conversions} conversions, $${cost} spend.`,
      learnings: lessonsLearned,
      outcomes: { outcome, cost, conversions, revenue, cpa: cpa || 0, roas: roas || 0 },
      tags: [channel, outcome],
    });

    // Invalidate cached context across departments
    sharedBusinessContextService.invalidateCache(workspaceId);

    return saved;
  }
}

export const performanceIngestionService = new PerformanceIngestionService();
