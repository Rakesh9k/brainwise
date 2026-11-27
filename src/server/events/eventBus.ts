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
  idempotencyKey?: string;
  timestamp: string;
  metadata?: TMetadata;
}

export type EventHandler = (event: DepartmentEvent) => Promise<void> | void;

export class DepartmentEventBus {
  private handlers: Map<DepartmentEventType, Set<EventHandler>> = new Map();
  private wildcardHandlers: Set<EventHandler> = new Set();
  private processedEvents: Map<string, { event: DepartmentEvent; expiresAt: number }> = new Map();
  private activeDispatchDepth = 0;
  private readonly MAX_DISPATCH_DEPTH = 5;
  private readonly IDEMPOTENCY_TTL_MS = 5000; // 5 seconds window for duplicate event suppression

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
    businessId?: string;
    userId: string;
    eventType: DepartmentEventType;
    resourceId: string;
    resourceVersion?: number | string;
    idempotencyKey?: string;
    metadata?: Record<string, unknown>;
  }): Promise<DepartmentEvent> {
    const { workspaceId, businessId, userId, eventType, resourceId, resourceVersion, idempotencyKey, metadata } = params;

    // 1. Idempotency Check
    const nowMs = Date.now();
    const resolvedIdemKey = idempotencyKey || `${workspaceId}::${eventType}::${resourceId}::${resourceVersion || ''}`;
    const cached = this.processedEvents.get(resolvedIdemKey);
    if (cached && nowMs < cached.expiresAt) {
      return cached.event;
    }

    // 2. Cascade Loop Guard
    if (this.activeDispatchDepth >= this.MAX_DISPATCH_DEPTH) {
      console.warn(`[EVENT_BUS] Max dispatch depth reached (${this.activeDispatchDepth}). Suppressing circular event trigger for ${eventType} on ${resourceId}.`);
      const suppressedEvent: DepartmentEvent = {
        eventId: `evt_suppressed_${nowMs}`,
        businessId: businessId || workspaceId,
        workspaceId,
        userId,
        eventType,
        resourceId,
        resourceVersion,
        idempotencyKey: resolvedIdemKey,
        timestamp: new Date().toISOString(),
        metadata,
      };
      return suppressedEvent;
    }

    const eventId = `evt_${nowMs}_${crypto.randomBytes(4).toString('hex')}`;
    const timestamp = new Date().toISOString();

    const event: DepartmentEvent = {
      eventId,
      businessId: businessId || workspaceId,
      workspaceId,
      userId,
      eventType,
      resourceId,
      resourceVersion,
      idempotencyKey: resolvedIdemKey,
      timestamp,
      metadata,
    };

    // Store in idempotency cache
    this.processedEvents.set(resolvedIdemKey, { event, expiresAt: nowMs + this.IDEMPOTENCY_TTL_MS });

    // Clean up expired entries if cache grows
    if (this.processedEvents.size > 200) {
      for (const [key, val] of this.processedEvents.entries()) {
        if (nowMs >= val.expiresAt) {
          this.processedEvents.delete(key);
        }
      }
    }

    // 3. Persist event for cross-department audit trail & traceability
    try {
      await db
        .collection<DepartmentEvent>(`workspaces/${workspaceId}/departmentEvents`)
        .doc(eventId)
        .set(event);
    } catch (err) {
      console.warn(`[EVENT_BUS] Failed to persist event ${eventId}:`, err);
    }

    // 4. Dispatch to registered typed listeners with depth tracking
    this.activeDispatchDepth++;
    try {
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

      // 5. Dispatch to wildcard listeners
      for (const handler of this.wildcardHandlers) {
        try {
          await handler(event);
        } catch (wildcardErr) {
          console.error(`[EVENT_BUS] Error in wildcard event handler:`, wildcardErr);
        }
      }
    } finally {
      this.activeDispatchDepth--;
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
    this.processedEvents.clear();
    this.activeDispatchDepth = 0;
  }
}

export const departmentEventBus = new DepartmentEventBus();
