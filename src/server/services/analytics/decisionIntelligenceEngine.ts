/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'node:crypto';
import { db } from '../../db/firestore';
import { MetricCalculator } from './metricCalculator';

export type DecisionOutcomeClassification =
  | 'SUCCESSFUL'
  | 'PARTIALLY_SUCCESSFUL'
  | 'UNSUCCESSFUL'
  | 'INCONCLUSIVE'
  | 'NOT_MEASURED';

export interface StrategicDecisionRecord {
  decisionId: string;
  workspaceId: string;
  problemStatement: string;
  hypothesis: string;
  recommendedAction: string;
  supportingMetricIds: string[];
  evidenceReferences: string[];
  expectedImpact: string;
  confidenceClassification: 'HIGH' | 'MEDIUM' | 'LOW';
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  responsibleDepartment: string;
  ownerId?: string;
  baselineMetricValue: number;
  targetMetricValue: number;
  reviewDate: string; // ISO date
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'IN_EXECUTION' | 'REVIEW_DUE' | 'CONCLUDED';
  createdAt: string;

  evaluation?: {
    evaluatedAt: string;
    actualMetricValue: number;
    varianceValue: number;
    variancePercentage: number;
    financialImpactEstimated: number;
    hypothesisValidated: boolean;
    outcomeClassification: DecisionOutcomeClassification;
    postMortemNotes: string;
  };
}

export class DecisionIntelligenceEngine {
  /**
   * Registers a strategic decision linked to measurable baseline, target, and review date
   */
  public async createDecision(params: {
    workspaceId: string;
    problemStatement: string;
    hypothesis: string;
    recommendedAction: string;
    supportingMetricIds: string[];
    evidenceReferences?: string[];
    expectedImpact: string;
    priority?: StrategicDecisionRecord['priority'];
    responsibleDepartment?: string;
    ownerId?: string;
    baselineMetricValue: number;
    targetMetricValue: number;
    reviewDate: string;
  }): Promise<StrategicDecisionRecord> {
    const {
      workspaceId,
      problemStatement,
      hypothesis,
      recommendedAction,
      supportingMetricIds,
      evidenceReferences = [],
      expectedImpact,
      priority = 'HIGH',
      responsibleDepartment = 'GROWTH',
      ownerId,
      baselineMetricValue,
      targetMetricValue,
      reviewDate,
    } = params;

    const decisionId = `dec_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const now = new Date().toISOString();

    const record: StrategicDecisionRecord = {
      decisionId,
      workspaceId,
      problemStatement,
      hypothesis,
      recommendedAction,
      supportingMetricIds,
      evidenceReferences,
      expectedImpact,
      confidenceClassification: 'HIGH',
      priority,
      responsibleDepartment,
      ownerId,
      baselineMetricValue,
      targetMetricValue,
      reviewDate,
      status: 'APPROVED',
      createdAt: now,
    };

    await db.doc<StrategicDecisionRecord>(`workspaces/${workspaceId}/strategicDecisions/${decisionId}`).set(record);
    return record;
  }

  /**
   * Evaluates post-implementation outcome against expected target and updates feedback loop
   */
  public async evaluateOutcome(params: {
    workspaceId: string;
    decisionId: string;
    actualMetricValue: number;
    postMortemNotes?: string;
  }): Promise<StrategicDecisionRecord> {
    const { workspaceId, decisionId, actualMetricValue, postMortemNotes = '' } = params;
    const docRef = db.doc<StrategicDecisionRecord>(
      `workspaces/${workspaceId}/strategicDecisions/${decisionId}`
    );
    const snap = await docRef.get();
    if (!snap.exists || !snap.data()) {
      throw new Error(`NOT_FOUND: Decision record ${decisionId} does not exist.`);
    }

    const decision = snap.data()!;
    const now = new Date().toISOString();

    const targetDelta = decision.targetMetricValue - decision.baselineMetricValue;
    const actualDelta = actualMetricValue - decision.baselineMetricValue;
    const varianceVal = MetricCalculator.round(actualMetricValue - decision.targetMetricValue, 2);
    const variancePct = targetDelta !== 0 ? MetricCalculator.round((actualDelta / targetDelta) * 100, 1) : 0;

    let outcome: DecisionOutcomeClassification;
    const validated = actualDelta > 0 && actualMetricValue >= decision.targetMetricValue * 0.9;

    if (actualMetricValue >= decision.targetMetricValue) {
      outcome = 'SUCCESSFUL';
    } else if (actualDelta > 0 && actualMetricValue >= decision.baselineMetricValue) {
      outcome = 'PARTIALLY_SUCCESSFUL';
    } else {
      outcome = 'UNSUCCESSFUL';
    }

    const updated: StrategicDecisionRecord = {
      ...decision,
      status: 'CONCLUDED',
      evaluation: {
        evaluatedAt: now,
        actualMetricValue,
        varianceValue: varianceVal,
        variancePercentage: variancePct,
        financialImpactEstimated: actualDelta,
        hypothesisValidated: validated,
        outcomeClassification: outcome,
        postMortemNotes,
      },
    };

    await docRef.set(updated);
    return updated;
  }

  /**
   * Lists strategic decisions for a workspace
   */
  public async listDecisions(workspaceId: string): Promise<StrategicDecisionRecord[]> {
    const snap = await db
      .collection<StrategicDecisionRecord>(`workspaces/${workspaceId}/strategicDecisions`)
      .orderBy('createdAt', 'desc')
      .get();
    return snap.docs.map((d) => d.data()!).filter(Boolean);
  }
}

export const decisionIntelligenceEngine = new DecisionIntelligenceEngine();
