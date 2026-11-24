/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { growthRadarRepository } from '../repositories/growthRadarRepository';
import { growthRadarDetectionEngine } from './growthRadarDetectionEngine';
import { businessProfileRepository } from '../repositories/businessProfileRepository';
import { productRepository } from '../repositories/productRepository';
import { goalRepository, competitorRepository } from '../repositories/goalRepository';
import { audienceSegmentRepository } from '../repositories/audienceSegmentRepository';
import { documentRepository } from '../repositories/documentRepository';
import { campaignPerformanceRepository } from '../repositories/campaignPerformanceRepository';
import { businessMetricRepository } from '../repositories/businessMetricRepository';
import { departmentCoordinationService } from './departmentCoordinationService';
import { departmentEventBus } from '../events/eventBus';
import type {
  GrowthRadarOpportunity,
  GrowthRadarSummary,
  GrowthOpportunityCategory,
  RadarLifecycleState,
  OpportunityScoreWeights,
  StandardDepartmentTaskEntity,
  WorkspaceRole,
} from '../types/api';

export class GrowthRadarService {
  constructor() {
    this.initEventSubscriptions();
  }

  /**
   * Subscribes to business events to trigger background radar evaluation
   */
  public initEventSubscriptions(): void {
    const triggerEvents = [
      'BUSINESS_PROFILE_UPDATED',
      'PRODUCT_CREATED',
      'PRODUCT_DELETED',
      'COMPETITOR_CHANGED',
      'EXPERIMENT_COMPLETED',
      'SALES_OBJECTION_RECORDED',
    ] as const;

    for (const evtName of triggerEvents) {
      departmentEventBus.subscribe(evtName, async (evt) => {
        try {
          await this.analyzeWorkspace(evt.workspaceId, {
            triggerSource: evtName,
          });
        } catch (err) {
          console.warn(`[GROWTH_RADAR] Background evaluation failed for ${evtName}:`, err);
        }
      });
    }
  }

  /**
   * Performs end-to-end opportunity analysis across all business dimensions
   */
  public async analyzeWorkspace(
    workspaceId: string,
    options: {
      customWeights?: Partial<OpportunityScoreWeights>;
      now?: Date | string;
      triggerSource?: string;
    } = {}
  ): Promise<GrowthRadarSummary> {
    const now = typeof options.now === 'string' ? new Date(options.now) : options.now || new Date();
    const nowIso = now.toISOString();

    // 1. Expire stale opportunities
    await growthRadarRepository.expireStaleOpportunities(workspaceId, now);

    // 2. Fetch all real business context
    const [
      profile,
      products,
      services,
      goals,
      competitors,
      audienceSegments,
      documents,
      experiments,
      metrics,
      existingOpps,
    ] = await Promise.all([
      businessProfileRepository.getProfile(workspaceId),
      productRepository.listProducts(workspaceId),
      productRepository.listServices(workspaceId),
      goalRepository.listByWorkspace(workspaceId),
      competitorRepository.listByWorkspace(workspaceId),
      audienceSegmentRepository.listByWorkspace(workspaceId),
      documentRepository.listDocuments(workspaceId),
      campaignPerformanceRepository.listByWorkspace(workspaceId),
      businessMetricRepository.listByWorkspace(workspaceId),
      growthRadarRepository.listByWorkspace(workspaceId),
    ]);

    // 3. Run detection engine
    const newlyDetected = growthRadarDetectionEngine.detectOpportunities({
      workspaceId,
      profile: profile || ({} as any),
      products,
      services,
      goals,
      competitors,
      audienceSegments,
      documents,
      experiments,
      metrics,
      weights: options.customWeights,
      now,
    });

    const existingByFingerprint = new Map<string, GrowthRadarOpportunity>();
    const existingByType = new Map<string, GrowthRadarOpportunity[]>();
    for (const opp of existingOpps) {
      existingByFingerprint.set(opp.evidenceFingerprint, opp);
      const list = existingByType.get(opp.type) || [];
      list.push(opp);
      existingByType.set(opp.type, list);
    }

    const savedOpportunities: GrowthRadarOpportunity[] = [];
    let highPriorityOrRiskDetected = false;

    for (const detected of newlyDetected) {
      const existing = existingByFingerprint.get(detected.evidenceFingerprint);

      if (existing) {
        // Opportunity already exists with IDENTICAL evidence fingerprint:
        if (existing.lifecycleState === 'REJECTED') {
          // Anti-fatigue guardrail: Do NOT re-surface without new evidence!
          continue;
        }

        if (existing.lifecycleState === 'DEFERRED') {
          if (existing.deferredUntil && existing.deferredUntil <= nowIso) {
            // Deferment expired: Re-open to READY!
            const reopened = await growthRadarRepository.update(
              workspaceId,
              existing.opportunityId,
              {
                lifecycleState: 'READY',
                deferredUntil: undefined,
                lifecycleHistory: [
                  ...existing.lifecycleHistory,
                  {
                    state: 'READY',
                    timestamp: nowIso,
                    note: 'Deferred period elapsed; opportunity reopened for action.',
                  },
                ],
              }
            );
            savedOpportunities.push(reopened);
          } else {
            // Still deferred
            continue;
          }
        } else if (existing.lifecycleState === 'EXPIRED') {
          // Re-activate with refreshed expiration
          const reactivated = await growthRadarRepository.update(
            workspaceId,
            existing.opportunityId,
            {
              lifecycleState: 'READY',
              expirationDate: detected.expirationDate,
              opportunityScore: detected.opportunityScore,
              factorContributions: detected.factorContributions,
              confidence: detected.confidence,
              confidenceBand: detected.confidenceBand,
              supportingEvidence: detected.supportingEvidence,
              rediscoveredCount: existing.rediscoveredCount + 1,
              lifecycleHistory: [
                ...existing.lifecycleHistory,
                {
                  state: 'READY',
                  timestamp: nowIso,
                  note: 'Opportunity rediscovered with active relevance.',
                },
              ],
            }
          );
          savedOpportunities.push(reactivated);
        } else {
          // Active opportunity: refresh scores and contributions
          const updated = await growthRadarRepository.update(workspaceId, existing.opportunityId, {
            opportunityScore: detected.opportunityScore,
            factorContributions: detected.factorContributions,
            confidence: detected.confidence,
            confidenceBand: detected.confidenceBand,
            supportingEvidence: detected.supportingEvidence,
            updatedAt: nowIso,
          });
          savedOpportunities.push(updated);
        }
      } else {
        // Check if an existing opportunity of the same type was previously rejected or active
        const sameTypeOpps = existingByType.get(detected.type) || [];
        const matchingRejected = sameTypeOpps.find((o) => o.lifecycleState === 'REJECTED');

        if (matchingRejected) {
          // Material evidence change: Rediscover previously rejected opportunity!
          const reopened = await growthRadarRepository.update(
            workspaceId,
            matchingRejected.opportunityId,
            {
              title: detected.title,
              description: detected.description,
              potentialImpact: detected.potentialImpact,
              opportunityScore: detected.opportunityScore,
              factorContributions: detected.factorContributions,
              confidence: detected.confidence,
              confidenceBand: detected.confidenceBand,
              supportingEvidence: detected.supportingEvidence,
              evidenceFingerprint: detected.evidenceFingerprint,
              lifecycleState: 'READY',
              rejectionReason: undefined,
              rediscoveredCount: matchingRejected.rediscoveredCount + 1,
              lifecycleHistory: [
                ...matchingRejected.lifecycleHistory,
                {
                  state: 'READY',
                  timestamp: nowIso,
                  note: 'Rediscovered: underlying business evidence or metrics shifted materially.',
                },
              ],
            }
          );
          savedOpportunities.push(reopened);
          if (reopened.opportunityScore >= 75 || reopened.isRisk) {
            highPriorityOrRiskDetected = true;
          }
        } else {
          // Truly brand new opportunity: create!
          const created = await growthRadarRepository.create(detected);
          savedOpportunities.push(created);
          if (created.opportunityScore >= 75 || created.isRisk) {
            highPriorityOrRiskDetected = true;
          }
        }
      }
    }

    // 4. Emit notification if high priority opportunity or operational risk detected
    if (highPriorityOrRiskDetected) {
      await departmentEventBus.emit({
        workspaceId,
        userId: 'system',
        eventType: 'DEPARTMENT_COORDINATION_EVENT',
        resourceId: `growth_radar_${Date.now()}`,
        metadata: {
          action: 'HIGH_PRIORITY_GROWTH_OPPORTUNITY_DETECTED',
          summary:
            'Growth Radar detected high-priority opportunities or operational risks requiring review.',
          timestamp: nowIso,
        },
      });
    }

    return this.getRadarSummary(workspaceId);
  }

  /**
   * Retrieves aggregated summary across all radar dimensions
   */
  public async getRadarSummary(workspaceId: string): Promise<GrowthRadarSummary> {
    const all = await growthRadarRepository.listByWorkspace(workspaceId);

    const activeOpps = all.filter(
      (o) =>
        o.lifecycleState !== 'REJECTED' &&
        o.lifecycleState !== 'EXPIRED' &&
        o.lifecycleState !== 'DEFERRED'
    );

    const highestPriorityOpportunities = activeOpps
      .filter((o) => o.opportunityScore >= 70 && !o.isRisk)
      .sort((a, b) => b.opportunityScore - a.opportunityScore);

    const emergingOpportunities = activeOpps
      .filter((o) => o.lifecycleState === 'READY' || o.lifecycleState === 'DETECTED')
      .slice(0, 5);

    const businessRisks = all
      .filter((o) => o.isRisk || o.category === 'OPERATIONAL_RISK')
      .sort((a, b) => b.opportunityScore - a.opportunityScore);

    const growthBottlenecks = all.filter((o) => o.isBottleneck);

    const byDepartment: Record<string, GrowthRadarOpportunity[]> = {};
    for (const opp of activeOpps) {
      const dept = opp.relevantDepartment || 'GROWTH_DIRECTOR';
      if (!byDepartment[dept]) byDepartment[dept] = [];
      byDepartment[dept].push(opp);
    }

    const byCategory: Record<GrowthOpportunityCategory, number> = {
      REVENUE: all.filter((o) => o.category === 'REVENUE').length,
      MARKETING: all.filter((o) => o.category === 'MARKETING').length,
      CUSTOMER: all.filter((o) => o.category === 'CUSTOMER').length,
      OPERATIONAL_RISK: all.filter((o) => o.category === 'OPERATIONAL_RISK').length,
    };

    return {
      workspaceId,
      totalOpportunities: all.length,
      readyCount: all.filter((o) => o.lifecycleState === 'READY').length,
      highPriorityCount: highestPriorityOpportunities.length,
      risksCount: businessRisks.length,
      bottlenecksCount: growthBottlenecks.length,
      highestPriorityOpportunities,
      emergingOpportunities,
      businessRisks,
      growthBottlenecks,
      byDepartment,
      byCategory,
      lastAnalyzedAt: new Date().toISOString(),
    };
  }

  /**
   * Transitions an opportunity through the Radar Intelligence Lifecycle
   */
  public async transitionOpportunity(params: {
    workspaceId: string;
    opportunityId: string;
    action:
      | 'EVALUATE'
      | 'ACCEPT'
      | 'REJECT'
      | 'DEFER'
      | 'ASSIGN'
      | 'START_PROGRESS'
      | 'COMPLETE'
      | 'EVALUATE_OUTCOME';
    actorId?: string;
    rejectionReason?: string;
    deferredUntil?: string;
    assignedToUserId?: string;
    note?: string;
  }): Promise<GrowthRadarOpportunity> {
    const {
      workspaceId,
      opportunityId,
      action,
      actorId = 'user',
      rejectionReason,
      deferredUntil,
      assignedToUserId,
      note,
    } = params;

    const opp = await growthRadarRepository.findById(workspaceId, opportunityId);
    if (!opp) {
      throw new Error(`NOT_FOUND: GrowthRadarOpportunity '${opportunityId}' not found.`);
    }

    const nowIso = new Date().toISOString();
    let nextState: RadarLifecycleState;
    const patch: Partial<GrowthRadarOpportunity> = {};

    switch (action) {
      case 'EVALUATE':
        nextState = 'EVALUATING';
        break;
      case 'ACCEPT':
        nextState = 'ACCEPTED';
        break;
      case 'REJECT':
        nextState = 'REJECTED';
        patch.rejectionReason = rejectionReason || 'User rejected opportunity';
        break;
      case 'DEFER':
        nextState = 'DEFERRED';
        patch.deferredUntil = deferredUntil || new Date(Date.now() + 14 * 86400000).toISOString();
        break;
      case 'ASSIGN':
        nextState = 'ASSIGNED';
        patch.assignedToUserId = assignedToUserId || actorId;
        break;
      case 'START_PROGRESS':
        nextState = 'IN_PROGRESS';
        break;
      case 'COMPLETE':
        nextState = 'COMPLETED';
        break;
      case 'EVALUATE_OUTCOME':
        nextState = 'EVALUATED';
        break;
      default:
        throw new Error(`INVALID_ACTION: Action '${action}' is not supported.`);
    }

    patch.lifecycleState = nextState;
    patch.lifecycleHistory = [
      ...opp.lifecycleHistory,
      {
        state: nextState,
        timestamp: nowIso,
        actorId,
        note: note || `Transitioned via action ${action}`,
      },
    ];

    return await growthRadarRepository.update(workspaceId, opportunityId, patch);
  }

  /**
   * Converts a Growth Radar Opportunity into a concrete department task
   */
  public async convertOpportunityToTask(params: {
    workspaceId: string;
    opportunityId: string;
    userRole?: WorkspaceRole;
    userId?: string;
  }): Promise<{ opportunity: GrowthRadarOpportunity; task: StandardDepartmentTaskEntity }> {
    const { workspaceId, opportunityId, userRole = 'owner', userId = 'system' } = params;

    const opp = await growthRadarRepository.findById(workspaceId, opportunityId);
    if (!opp) {
      throw new Error(`NOT_FOUND: GrowthRadarOpportunity '${opportunityId}' not found.`);
    }

    // Submit task via Department Coordination Service
    const { task } = await departmentCoordinationService.submitTask({
      workspaceId,
      department: opp.relevantDepartment,
      objective: opp.title,
      inputContext: {
        opportunityId: opp.opportunityId,
        category: opp.category,
        type: opp.type,
        recommendedAction: opp.recommendedAction,
        potentialImpact: opp.potentialImpact,
        dependencies: opp.dependencies,
      },
      requestedAction: 'EXECUTE_GROWTH_OPPORTUNITY',
      priority: opp.opportunityScore >= 80 ? 'HIGH' : 'MEDIUM',
      userRole,
      userId,
    });

    // Update opportunity lifecycle state to IN_PROGRESS and link task ID
    const updatedOpp = await growthRadarRepository.update(workspaceId, opportunityId, {
      lifecycleState: 'IN_PROGRESS',
      assignedDepartmentTaskId: task.taskId,
      lifecycleHistory: [
        ...opp.lifecycleHistory,
        {
          state: 'IN_PROGRESS',
          timestamp: new Date().toISOString(),
          actorId: userId,
          note: `Converted into department task '${task.taskId}' in department '${opp.relevantDepartment}'.`,
        },
      ],
    });

    return { opportunity: updatedOpp, task };
  }
}

export const growthRadarService = new GrowthRadarService();
