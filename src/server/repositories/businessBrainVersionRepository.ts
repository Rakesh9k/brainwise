/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../db/firestore';
import type { BusinessBrainVersionEntity } from '../types/api';

export class BusinessBrainVersionRepository {
  private collection = 'business_brain_versions';

  public async createVersion(
    version: BusinessBrainVersionEntity
  ): Promise<BusinessBrainVersionEntity> {
    const path = `workspaces/${version.workspaceId}/${this.collection}/${version.versionId}`;
    await db.doc<BusinessBrainVersionEntity>(path).set(version);
    return version;
  }

  public async listVersions(workspaceId: string): Promise<BusinessBrainVersionEntity[]> {
    const snap = await db
      .collection<BusinessBrainVersionEntity>(`workspaces/${workspaceId}/${this.collection}`)
      .orderBy('versionNumber', 'desc')
      .get();
    return snap.docs.map((doc) => doc.data()!);
  }

  public async findById(
    workspaceId: string,
    versionId: string
  ): Promise<BusinessBrainVersionEntity | null> {
    const path = `workspaces/${workspaceId}/${this.collection}/${versionId}`;
    const snap = await db.doc<BusinessBrainVersionEntity>(path).get();
    return snap.exists && snap.data() ? snap.data()! : null;
  }
}

export const businessBrainVersionRepository = new BusinessBrainVersionRepository();
