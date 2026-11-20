/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../db/firestore';
import type { BrandIdentityEntity } from '../types/api';

export class BrandIdentityRepository {
  public async save(identity: BrandIdentityEntity): Promise<BrandIdentityEntity> {
    await db
      .collection<BrandIdentityEntity>(`workspaces/${identity.workspaceId}/brandIdentities`)
      .doc(identity.brandIdentityId)
      .set(identity);
    return identity;
  }

  public async getLatest(workspaceId: string): Promise<BrandIdentityEntity | null> {
    const snap = await db
      .collection<BrandIdentityEntity>(`workspaces/${workspaceId}/brandIdentities`)
      .orderBy('version', 'desc')
      .limit(1)
      .get();
    return snap.docs[0]?.data() ? (snap.docs[0].data() as BrandIdentityEntity) : null;
  }

  public async listVersions(workspaceId: string): Promise<BrandIdentityEntity[]> {
    const snap = await db
      .collection<BrandIdentityEntity>(`workspaces/${workspaceId}/brandIdentities`)
      .orderBy('version', 'desc')
      .get();
    return snap.docs.map((d) => d.data()).filter(Boolean) as BrandIdentityEntity[];
  }
}

export const brandIdentityRepository = new BrandIdentityRepository();
