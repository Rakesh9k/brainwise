/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../db/firestore';
import type { CampaignExperimentResultEntity } from '../types/api';

export class CampaignPerformanceRepository {
  public async create(
    experiment: CampaignExperimentResultEntity
  ): Promise<CampaignExperimentResultEntity> {
    await db
      .doc<CampaignExperimentResultEntity>(
        `workspaces/${experiment.workspaceId}/campaignPerformance/${experiment.experimentId}`
      )
      .set(experiment);
    return experiment;
  }

  public async findById(
    workspaceId: string,
    experimentId: string
  ): Promise<CampaignExperimentResultEntity | null> {
    const snap = await db
      .doc<CampaignExperimentResultEntity>(
        `workspaces/${workspaceId}/campaignPerformance/${experimentId}`
      )
      .get();
    return snap.exists && snap.data() ? snap.data()! : null;
  }

  public async listByWorkspace(
    workspaceId: string,
    filter?: { channel?: string; outcome?: string }
  ): Promise<CampaignExperimentResultEntity[]> {
    const coll = db.collection<CampaignExperimentResultEntity>(
      `workspaces/${workspaceId}/campaignPerformance`
    );
    const snap = await coll.orderBy('executionDate', 'desc').get();
    let experiments: CampaignExperimentResultEntity[] = snap.docs
      .map((d) => d.data())
      .filter((d): d is CampaignExperimentResultEntity => Boolean(d));

    if (filter?.channel) {
      experiments = experiments.filter(
        (e) => e.channel.toLowerCase() === filter.channel!.toLowerCase()
      );
    }
    if (filter?.outcome) {
      experiments = experiments.filter(
        (e) => e.outcome?.toUpperCase() === filter.outcome!.toUpperCase()
      );
    }

    return experiments;
  }

  public async findByIdempotencyKey(
    workspaceId: string,
    idempotencyKey: string
  ): Promise<CampaignExperimentResultEntity | null> {
    const coll = db.collection<CampaignExperimentResultEntity>(
      `workspaces/${workspaceId}/campaignPerformance`
    );
    const snap = await coll.where('idempotencyKey', '==', idempotencyKey).get();
    if (snap.empty || !snap.docs[0]?.data()) return null;
    return snap.docs[0].data()!;
  }

  public async update(
    experiment: CampaignExperimentResultEntity
  ): Promise<CampaignExperimentResultEntity> {
    await db
      .doc<CampaignExperimentResultEntity>(
        `workspaces/${experiment.workspaceId}/campaignPerformance/${experiment.experimentId}`
      )
      .set(experiment, { merge: true });
    return experiment;
  }
}

export const campaignPerformanceRepository = new CampaignPerformanceRepository();
