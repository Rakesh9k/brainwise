/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../db/firestore';
import type { WorkspaceMemberEntity } from '../types/api';

export class MemberRepository {
  private rootCollection = 'workspaceMembers';

  public async findMember(
    workspaceId: string,
    userId: string
  ): Promise<WorkspaceMemberEntity | null> {
    const snap = await db
      .collection<WorkspaceMemberEntity>(this.rootCollection)
      .where('workspaceId', '==', workspaceId)
      .where('userId', '==', userId)
      .limit(1)
      .get();
    return snap.empty ? null : (snap.docs[0].data() ?? null);
  }

  public async listByWorkspace(workspaceId: string): Promise<WorkspaceMemberEntity[]> {
    const snap = await db
      .collection<WorkspaceMemberEntity>(this.rootCollection)
      .where('workspaceId', '==', workspaceId)
      .get();
    return snap.docs.map((d) => d.data()).filter((d): d is WorkspaceMemberEntity => Boolean(d));
  }

  public async listByUser(userId: string): Promise<WorkspaceMemberEntity[]> {
    const snap = await db
      .collection<WorkspaceMemberEntity>(this.rootCollection)
      .where('userId', '==', userId)
      .get();
    return snap.docs.map((d) => d.data()).filter((d): d is WorkspaceMemberEntity => Boolean(d));
  }

  public async addMember(
    member: Omit<WorkspaceMemberEntity, 'createdAt' | 'updatedAt'>
  ): Promise<WorkspaceMemberEntity> {
    const now = db.serverTimestamp();
    const entity: WorkspaceMemberEntity = {
      ...member,
      createdAt: now,
      updatedAt: now,
    };
    await db
      .doc<WorkspaceMemberEntity>(`${this.rootCollection}/${member.membershipId}`)
      .set(entity);
    // Also mirror to subcollection for dual-lookup convenience
    await db
      .doc<WorkspaceMemberEntity>(`workspaces/${member.workspaceId}/members/${member.userId}`)
      .set(entity);
    return entity;
  }

  public async updateRole(
    workspaceId: string,
    userId: string,
    role: WorkspaceMemberEntity['role']
  ): Promise<void> {
    const now = db.serverTimestamp();
    const existing = await this.findMember(workspaceId, userId);
    if (!existing) throw new Error('Membership record not found');

    await db.doc(`${this.rootCollection}/${existing.membershipId}`).update({
      role,
      updatedAt: now,
    });
    await db.doc(`workspaces/${workspaceId}/members/${userId}`).update({
      role,
      updatedAt: now,
    });
  }

  public async removeMember(workspaceId: string, userId: string): Promise<void> {
    const existing = await this.findMember(workspaceId, userId);
    if (existing) {
      await db.doc(`${this.rootCollection}/${existing.membershipId}`).delete();
    }
    await db.doc(`workspaces/${workspaceId}/members/${userId}`).delete();
  }

  public async removeUserMemberships(userId: string): Promise<void> {
    const memberships = await this.listByUser(userId);
    for (const m of memberships) {
      await this.removeMember(m.workspaceId, m.userId);
    }
  }
}

export const memberRepository = new MemberRepository();
