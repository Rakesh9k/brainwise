/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { proactiveInsightRepository } from '../repositories/proactiveInsightRepository';
import { departmentCoordinationService } from './departmentCoordinationService';
import { departmentPermissionService } from './departmentPermissionService';
import type {
  ProactiveInsightEntity,
  RecommendationActionPayload,
  WorkspaceRole,
} from '../types/api';

export class RecommendationLifecycleService {
  /**
   * Applies one of the 7 recommendation lifecycle actions:
   * ACCEPT, REJECT, EDIT, DEFER, ASSIGN, EXECUTE, MARK_COMPLETE
   */
  public async handleAction(params: {
    workspaceId: string;
    insightId: string;
    payload: RecommendationActionPayload;
    userRole: WorkspaceRole;
  }): Promise<ProactiveInsightEntity> {
    const { workspaceId, insightId, payload, userRole } = params;

    const insight = await proactiveInsightRepository.findById(workspaceId, insightId);
    if (!insight) {
      const err = new Error(`NOT_FOUND: Proactive insight '${insightId}' not found.`);
      (err as any).statusCode = 404;
      throw err;
    }

    const now = new Date().toISOString();

    switch (payload.action) {
      case 'ACCEPT': {
        return await proactiveInsightRepository.update(workspaceId, insightId, {
          status: 'CONVERTED_TO_RECOMMENDATION',
        });
      }

      case 'REJECT': {
        return await proactiveInsightRepository.update(workspaceId, insightId, {
          status: 'DISMISSED',
          dismissalMetadata: {
            dismissedAt: now,
            dismissedBy: payload.actorId,
            reason: payload.rejectionReason || payload.userFeedback || 'Rejected by user',
            suppressUntilMaterialChange: true,
          },
        });
      }

      case 'EDIT': {
        const edits = payload.editedFields || {};
        return await proactiveInsightRepository.update(workspaceId, insightId, {
          title: (edits.title as string) || insight.title,
          description: (edits.description as string) || insight.description,
          suggestedAction: (edits.suggestedAction as string) || insight.suggestedAction,
          priority: (edits.priority as any) || insight.priority,
        });
      }

      case 'DEFER': {
        const deferredUntil =
          payload.deferredUntil || new Date(Date.now() + 7 * 86400000).toISOString();
        return await proactiveInsightRepository.update(workspaceId, insightId, {
          status: 'DISMISSED',
          expirationDate: deferredUntil,
          dismissalMetadata: {
            dismissedAt: now,
            dismissedBy: payload.actorId,
            reason: `Deferred until ${deferredUntil}`,
            suppressUntilMaterialChange: false,
          },
        });
      }

      case 'ASSIGN': {
        return await proactiveInsightRepository.update(workspaceId, insightId, {
          relevantDepartment: (payload.assignedTo as any) || insight.relevantDepartment,
        });
      }

      case 'EXECUTE': {
        // Enforce role permission: Consequential execution requires owner/admin
        if (!departmentPermissionService.canApprove(userRole)) {
          const err = new Error(
            `FORBIDDEN: User with role '${userRole}' cannot execute proactive recommendations.`
          );
          (err as any).statusCode = 403;
          throw err;
        }

        // Enqueue standard task in department
        await departmentCoordinationService.submitTask({
          workspaceId,
          department: insight.relevantDepartment,
          objective: insight.title || insight.suggestedAction || 'Execute Recommendation',
          inputContext: {
            insightId: insight.insightId,
            triggerType: insight.triggerType,
            suggestedAction: insight.suggestedAction,
          },
          requestedAction: 'EXECUTE_RECOMMENDATION',
          priority: insight.priority,
          userRole,
          userId: payload.actorId,
        });

        return await proactiveInsightRepository.update(workspaceId, insightId, {
          status: 'CONVERTED_TO_RECOMMENDATION',
        });
      }

      case 'MARK_COMPLETE': {
        return await proactiveInsightRepository.update(workspaceId, insightId, {
          status: 'DISMISSED',
          dismissalMetadata: {
            dismissedAt: now,
            dismissedBy: payload.actorId,
            reason: 'Recommendation completed',
            suppressUntilMaterialChange: true,
          },
        });
      }

      default:
        throw new Error(`INVALID_ACTION: Action '${payload.action}' is not supported.`);
    }
  }
}

export const recommendationLifecycleService = new RecommendationLifecycleService();
