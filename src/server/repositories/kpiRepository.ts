/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../db/firestore';
import type { KpiDefinitionEntity, KpiObservationEntity } from '../types/api';

export class KpiRepository {
  // DEFINITIONS
  public async createDefinition(def: KpiDefinitionEntity): Promise<KpiDefinitionEntity> {
    await db
      .collection<KpiDefinitionEntity>(`workspaces/${def.workspaceId}/kpis`)
      .doc(def.kpiId)
      .set(def);
    return def;
  }

  public async getDefinition(
    workspaceId: string,
    kpiId: string
  ): Promise<KpiDefinitionEntity | null> {
    const snap = await db
      .collection<KpiDefinitionEntity>(`workspaces/${workspaceId}/kpis`)
      .doc(kpiId)
      .get();
    return snap.exists ? (snap.data() as KpiDefinitionEntity) : null;
  }

  public async listDefinitions(workspaceId: string): Promise<KpiDefinitionEntity[]> {
    const snap = await db
      .collection<KpiDefinitionEntity>(`workspaces/${workspaceId}/kpis`)
      .orderBy('createdAt', 'desc')
      .get();
    return snap.docs.map((d) => d.data()).filter(Boolean) as KpiDefinitionEntity[];
  }

  public async updateDefinition(
    workspaceId: string,
    kpiId: string,
    patch: Partial<KpiDefinitionEntity>
  ): Promise<KpiDefinitionEntity> {
    const ref = db.collection<KpiDefinitionEntity>(`workspaces/${workspaceId}/kpis`).doc(kpiId);
    const existing = await ref.get();
    if (!existing.exists) {
      throw new Error(`KPI definition '${kpiId}' not found in workspace '${workspaceId}'`);
    }

    const updated: KpiDefinitionEntity = {
      ...(existing.data() as KpiDefinitionEntity),
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    await ref.set(updated, { merge: true });
    return updated;
  }

  public async deleteDefinition(workspaceId: string, kpiId: string): Promise<void> {
    await db.collection<KpiDefinitionEntity>(`workspaces/${workspaceId}/kpis`).doc(kpiId).delete();
  }

  // OBSERVATIONS (TIME-SERIES)
  public async recordObservation(obs: KpiObservationEntity): Promise<KpiObservationEntity> {
    await db
      .collection<KpiObservationEntity>(`workspaces/${obs.workspaceId}/kpiObservations`)
      .doc(obs.observationId)
      .set(obs);

    // Update current value on parent definition
    const def = await this.getDefinition(obs.workspaceId, obs.kpiId);
    if (def) {
      await this.updateDefinition(obs.workspaceId, obs.kpiId, {
        currentValue: obs.value,
        status: obs.value >= def.targetValue ? 'achieved' : 'on_track',
      });
    }

    return obs;
  }

  public async listObservations(
    workspaceId: string,
    kpiId: string,
    limit = 60
  ): Promise<KpiObservationEntity[]> {
    const snap = await db
      .collection<KpiObservationEntity>(`workspaces/${workspaceId}/kpiObservations`)
      .where('kpiId', '==', kpiId)
      .orderBy('recordedAt', 'desc')
      .limit(limit)
      .get();
    return snap.docs.map((d) => d.data()).filter(Boolean) as KpiObservationEntity[];
  }
}

export const kpiRepository = new KpiRepository();
