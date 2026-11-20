/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../db/firestore';

export interface IntegrationAuditEvent {
  eventId: string;
  workspaceId: string;
  actorId: string;
  integrationId: string;
  action: string;
  category: 'A_READ_ONLY' | 'B_INTERNAL' | 'C_EXTERNAL_WRITE';
  resourceAffected?: string;
  authorizationBasis: string;
  approvalStatus: 'NOT_REQUIRED' | 'APPROVED' | 'REJECTED' | 'PENDING';
  approvedBy?: string;
  timestamp: string;
  result: 'SUCCESS' | 'FAILURE' | 'BLOCKED';
  errorDetails?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Integration Security & Audit Trail Service
 * Maintains an immutable log of all integration lifecycle, data ingestion, and write operations.
 */
export class IntegrationAuditService {
  public async logEvent(
    event: Omit<IntegrationAuditEvent, 'eventId' | 'timestamp'>
  ): Promise<IntegrationAuditEvent> {
    const eventId = `audit_int_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const timestamp = new Date().toISOString();

    const fullEvent: IntegrationAuditEvent = {
      ...event,
      eventId,
      timestamp,
    };

    // Filter out any sensitive accidental fields
    if (fullEvent.metadata) {
      delete fullEvent.metadata.accessToken;
      delete fullEvent.metadata.refreshToken;
      delete fullEvent.metadata.apiKey;
      delete fullEvent.metadata.clientSecret;
    }

    await db
      .doc<IntegrationAuditEvent>(`workspaces/${event.workspaceId}/integration_audit/${eventId}`)
      .set(fullEvent);

    return fullEvent;
  }

  public async listEvents(workspaceId: string, limit = 50): Promise<IntegrationAuditEvent[]> {
    const snap = await db
      .collection<IntegrationAuditEvent>(`workspaces/${workspaceId}/integration_audit`)
      .limit(limit)
      .get();

    const events = snap.docs
      .map((d) => d.data())
      .filter((d): d is IntegrationAuditEvent => Boolean(d));
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return events;
  }
}

export const integrationAuditService = new IntegrationAuditService();
