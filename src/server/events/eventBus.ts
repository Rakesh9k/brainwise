/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'node:crypto';
import { db } from '../db/firestore';

export type DepartmentEventType =
  | 'BUSINESS_PROFILE_UPDATED'
  | 'BUSINESS_POSITIONING_UPDATED'
  | 'PRODUCT_CREATED'
  | 'PRODUCT_UPDATED'
  | 'PRODUCT_DELETED'
  | 'TARGET_AUDIENCE_UPDATED'
  | 'BRAND_IDENTITY_APPROVED'
  | 'COMPETITOR_DISCOVERED'
  | 'COMPETITOR_CHANGED'
  | 'MARKET_ALERT_CREATED'
  | 'IDEA_VALIDATION_COMPLETED'
  | 'RECOMMENDATION_CREATED'
  | 'TASK_CREATED'
  | 'TASK_COMPLETED'
  | 'EXPERIMENT_STARTED'
  | 'EXPERIMENT_COMPLETED'
  | 'EXPERIMENT_ANALYSIS_COMPLETED'
  | 'REPORT_GENERATED'
  | 'RESEARCH_FINDING_DISCOVERED'
  | 'MARKETING_CAMPAIGN_COMPLETED'
  | 'ANALYTICS_INSIGHT_DETECTED'
  | 'SALES_OBJECTION_RECORDED'
  | 'CREATIVE_ASSET_APPROVED'
  | 'BRAND_LOGO_GENERATED'
  | 'ASSET_CREATED'
  | 'ASSET_UPDATED'
  | 'ASSET_APPROVED'
  | 'ASSET_ARCHIVED'
  | 'ASSET_RESTORED'
  | 'ASSET_VERSION_CREATED'
  | 'ASSET_ANALYZED'
  | 'BRAND_IDENTITY_UPDATED'
  | 'CAMPAIGN_PUBLISHED'
  | 'ASSET_PERFORMANCE_UPDATED'
  | 'DEPARTMENT_TASK_UPDATED'
  | 'DEPARTMENT_COORDINATION_EVENT'
  | 'DEPARTMENT_REGROUNDING_ALERT';

export interface DepartmentEvent<TMetadata = Record<string, unknown>> {
  eventId: string;
  businessId: string; // workspaceId
  workspaceId: string;
  userId: string;
  eventType: DepartmentEventType;
  resourceId: string;
  resourceVersion?: number | string;
  timestamp: string;
  metadata?: TMetadata;
}

export type EventHandler = (event: DepartmentEvent) => Promise<void> | void;

export class DepartmentEventBus {
  private handlers: Map<DepartmentEventType, Set<EventHandler>> = new Map();
  private wildcardHandlers: Set<EventHandler> = new Set();

  public subscribe(eventType: DepartmentEventType, handler: EventHandler): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);

    return () => {
      this.handlers.get(eventType)?.delete(handler);
    };
  }

  public subscribeAll(handler: EventHandler): () => void {
    this.wildcardHandlers.add(handler);
    return () => {
      this.wildcardHandlers.delete(handler);
    };
  }

  public async emit(params: {
    workspaceId: string;
    userId: string;
    eventType: DepartmentEventType;
    resourceId: string;
    resourceVersion?: number | string;
    metadata?: Record<string, unknown>;
  }): Promise<DepartmentEvent> {
    const { workspaceId, userId, eventType, resourceId, resourceVersion, metadata } = params;
    const eventId = `evt_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const timestamp = new Date().toISOString();

    const event: DepartmentEvent = {
      eventId,
      businessId: workspaceId,
      workspaceId,
      userId,
      eventType,
      resourceId,
      resourceVersion,
      timestamp,
      metadata,
    };

    // 1. Persist event for cross-department audit trail & traceability
    try {
      await db
        .collection<DepartmentEvent>(`workspaces/${workspaceId}/departmentEvents`)
        .doc(eventId)
        .set(event);
    } catch (err) {
      console.warn(`[EVENT_BUS] Failed to persist event ${eventId}:`, err);
    }

    // 2. Dispatch to registered typed listeners
    const specificHandlers = this.handlers.get(eventType);
    if (specificHandlers) {
      for (const handler of specificHandlers) {
        try {
          await handler(event);
        } catch (handlerErr) {
          console.error(`[EVENT_BUS] Error executing handler for ${eventType}:`, handlerErr);
        }
      }
    }

    // 3. Dispatch to wildcard listeners
    for (const handler of this.wildcardHandlers) {
      try {
        await handler(event);
      } catch (wildcardErr) {
        console.error(`[EVENT_BUS] Error in wildcard event handler:`, wildcardErr);
      }
    }

    return event;
  }

  public async getRecentEvents(
    workspaceId: string,
    limit = 50,
    eventType?: DepartmentEventType
  ): Promise<DepartmentEvent[]> {
    let query = db
      .collection<DepartmentEvent>(`workspaces/${workspaceId}/departmentEvents`)
      .orderBy('timestamp', 'desc')
      .limit(limit);

    if (eventType) {
      query = query.where('eventType', '==', eventType);
    }

    const snap = await query.get();
    return snap.docs.map((d) => d.data()).filter(Boolean) as DepartmentEvent[];
  }

  public resetForTesting(): void {
    this.handlers.clear();
    this.wildcardHandlers.clear();
  }
}

export const departmentEventBus = new DepartmentEventBus();
