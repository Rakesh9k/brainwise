/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../db/firestore';
import type { AgentAuditLogEntity } from '../types/api';

export class AgentAuditLogRepository {
  public async recordLog(log: AgentAuditLogEntity): Promise<AgentAuditLogEntity> {
    await db
      .collection<AgentAuditLogEntity>(`workspaces/${log.workspaceId}/agentAuditLogs`)
      .doc(log.logId)
      .set(log);
    return log;
  }

  public async listLogs(workspaceId: string, limit: number = 50): Promise<AgentAuditLogEntity[]> {
    const snap = await db
      .collection<AgentAuditLogEntity>(`workspaces/${workspaceId}/agentAuditLogs`)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();
    return snap.docs.map((d) => d.data()).filter(Boolean) as AgentAuditLogEntity[];
  }
}

export const agentAuditLogRepository = new AgentAuditLogRepository();
