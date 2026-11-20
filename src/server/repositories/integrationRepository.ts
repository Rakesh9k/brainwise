/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../db/firestore';
import type { IntegrationEntity, SubscriptionEntity } from '../types/api';

export class IntegrationRepository {
  public async listByWorkspace(workspaceId: string): Promise<IntegrationEntity[]> {
    const snap = await db
      .collection<IntegrationEntity>(`workspaces/${workspaceId}/integrations`)
      .get();
    return snap.docs.map((d) => d.data()).filter((d): d is IntegrationEntity => Boolean(d));
  }

  public async findById(
    workspaceId: string,
    integrationId: string
  ): Promise<IntegrationEntity | null> {
    const snap = await db
      .doc<IntegrationEntity>(`workspaces/${workspaceId}/integrations/${integrationId}`)
      .get();
    return snap.exists && snap.data() ? snap.data()! : null;
  }

  public async upsert(integration: IntegrationEntity): Promise<IntegrationEntity> {
    await db
      .doc<IntegrationEntity>(
        `workspaces/${integration.workspaceId}/integrations/${integration.integrationId}`
      )
      .set(integration, { merge: true });
    return integration;
  }

  public async delete(workspaceId: string, integrationId: string): Promise<void> {
    await db.doc(`workspaces/${workspaceId}/integrations/${integrationId}`).delete();
  }
}

export class SubscriptionRepository {
  public async getSubscription(workspaceId: string): Promise<SubscriptionEntity | null> {
    const snap = await db
      .doc<SubscriptionEntity>(`workspaces/${workspaceId}/subscriptions/rootSubscription`)
      .get();
    return snap.exists && snap.data() ? snap.data()! : null;
  }

  public async upsert(subscription: SubscriptionEntity): Promise<SubscriptionEntity> {
    const now = db.serverTimestamp();
    const entity: SubscriptionEntity = {
      ...subscription,
      updatedAt: now,
    };
    await db
      .doc<SubscriptionEntity>(
        `workspaces/${subscription.workspaceId}/subscriptions/rootSubscription`
      )
      .set(entity, { merge: true });
    return entity;
  }
}

export const integrationRepository = new IntegrationRepository();
export const subscriptionRepository = new SubscriptionRepository();
