/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { auditLogRepository } from '../repositories/auditLogRepository';
import type { AuditLogEntity } from '../types/api';

export class AuditService {
  public async log(params: {
    workspaceId?: string;
    actorUserId: string;
    action: string;
    resourceType: string;
    resourceId: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
  }): Promise<AuditLogEntity> {
    return await auditLogRepository.logEvent(params);
  }

  public async logSecurityEvent(params: {
    workspaceId?: string;
    userId: string;
    action: string;
    resource: string;
    details?: Record<string, unknown>;
  }): Promise<AuditLogEntity> {
    return await auditLogRepository.logEvent({
      workspaceId: params.workspaceId || 'system',
      actorUserId: params.userId,
      action: params.action,
      resourceType: params.resource.split('/')[0] || 'system',
      resourceId: params.resource,
      metadata: params.details,
    });
  }

  public async getWorkspaceAuditTrail(workspaceId: string): Promise<AuditLogEntity[]> {
    return await auditLogRepository.listByWorkspace(workspaceId);
  }
}

export const auditService = new AuditService();
