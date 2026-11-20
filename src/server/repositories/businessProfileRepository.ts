/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../db/firestore';
import type { BusinessProfileEntity } from '../types/api';

export class BusinessProfileRepository {
  public async getProfile(workspaceId: string): Promise<BusinessProfileEntity | null> {
    const snap = await db
      .doc<BusinessProfileEntity>(`workspaces/${workspaceId}/businessBrain/rootDoc`)
      .get();
    return snap.exists && snap.data() ? snap.data()! : null;
  }

  public async saveProfile(profile: BusinessProfileEntity): Promise<BusinessProfileEntity> {
    const now = db.serverTimestamp();
    const existing = await this.getProfile(profile.workspaceId);
    const newVersion = (existing?.version || 0) + 1;

    const entity: BusinessProfileEntity = {
      ...profile,
      version: newVersion,
      lastUpdated: now,
    };

    // Save current active rootDoc
    await db
      .doc<BusinessProfileEntity>(`workspaces/${profile.workspaceId}/businessBrain/rootDoc`)
      .set(entity);

    // Save snapshot in version history subcollection
    await db
      .doc<BusinessProfileEntity>(
        `workspaces/${profile.workspaceId}/businessBrainHistory/v${newVersion}`
      )
      .set(entity);

    return entity;
  }

  public async updateFactProvenance(
    workspaceId: string,
    fieldKey: string,
    provenanceItem: BusinessProfileEntity['provenance'][string]
  ): Promise<BusinessProfileEntity> {
    const profile = await this.getProfile(workspaceId);
    if (!profile) throw new Error(`Business Profile not found for workspace: ${workspaceId}`);

    profile.provenance[fieldKey] = {
      ...provenanceItem,
      verifiedAt: db.serverTimestamp(),
    };

    return this.saveProfile(profile);
  }

  public async recordStrategicAngle(
    workspaceId: string,
    angle: string,
    theme: string,
    usedIn: 'BrandStudio' | 'IdeaIntelligence' | 'GrowthDirector' | 'Campaign'
  ): Promise<BusinessProfileEntity> {
    const profile = await this.getProfile(workspaceId);
    if (!profile) throw new Error(`Business Profile not found for workspace: ${workspaceId}`);

    const existingAngle = profile.strategicMemory.usedAngles.find(
      (a) => a.angle.toLowerCase() === angle.toLowerCase()
    );

    const now = db.serverTimestamp();
    if (existingAngle) {
      existingAngle.frequency += 1;
      existingAngle.lastUsedAt = now;
      if (existingAngle.frequency >= 3 && !profile.strategicMemory.fatiguedThemes.includes(theme)) {
        profile.strategicMemory.fatiguedThemes.push(theme);
      }
    } else {
      profile.strategicMemory.usedAngles.push({
        id: `ang_${Math.random().toString(36).substring(2, 9)}`,
        angle,
        theme,
        usedIn,
        lastUsedAt: now,
        frequency: 1,
      });
    }

    profile.strategicMemory.lastUpdated = now;
    return this.saveProfile(profile);
  }

  public async listHistory(workspaceId: string): Promise<BusinessProfileEntity[]> {
    const snap = await db
      .collection<BusinessProfileEntity>(`workspaces/${workspaceId}/businessBrainHistory`)
      .orderBy('version', 'desc')
      .limit(20)
      .get();
    return snap.docs.map((d) => d.data()).filter((d): d is BusinessProfileEntity => Boolean(d));
  }
}

export const businessProfileRepository = new BusinessProfileRepository();
