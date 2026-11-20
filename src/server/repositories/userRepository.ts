/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../db/firestore';
import type { UserEntity } from '../types/api';

export class UserRepository {
  private collection = 'users';

  public async findById(uid: string): Promise<UserEntity | null> {
    const snap = await db.doc<UserEntity>(`${this.collection}/${uid}`).get();
    return snap.exists && snap.data() ? snap.data()! : null;
  }

  public async findByEmail(email: string): Promise<UserEntity | null> {
    const snap = await db
      .collection<UserEntity>(this.collection)
      .where('email', '==', email.toLowerCase().trim())
      .limit(1)
      .get();
    return snap.empty ? null : (snap.docs[0].data() ?? null);
  }

  public async upsert(user: UserEntity): Promise<UserEntity> {
    const now = db.serverTimestamp();
    const existing = await this.findById(user.uid);
    const entity: UserEntity = {
      ...user,
      email: user.email.toLowerCase().trim(),
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now,
    };
    await db.doc<UserEntity>(`${this.collection}/${user.uid}`).set(entity, { merge: true });
    return entity;
  }

  public async updatePreferences(uid: string, prefs: Record<string, unknown>): Promise<void> {
    await db.doc(`${this.collection}/${uid}`).set(
      {
        preferences: prefs,
        updatedAt: db.serverTimestamp(),
      },
      { merge: true }
    );
  }

  public async setActiveWorkspace(uid: string, workspaceId: string): Promise<void> {
    await db.doc(`${this.collection}/${uid}`).set(
      {
        activeWorkspaceId: workspaceId,
        updatedAt: db.serverTimestamp(),
      },
      { merge: true }
    );
  }

  public async setOnboardingStatus(
    uid: string,
    status: import('../types/api').OnboardingStatus
  ): Promise<void> {
    await db.doc(`${this.collection}/${uid}`).set(
      {
        onboardingStatus: status,
        updatedAt: db.serverTimestamp(),
      },
      { merge: true }
    );
  }

  public async setEmailVerified(uid: string, verified: boolean): Promise<void> {
    await db.doc(`${this.collection}/${uid}`).set(
      {
        emailVerified: verified,
        emailVerificationToken: null,
        emailVerificationTokenExpiresAt: null,
        updatedAt: db.serverTimestamp(),
      },
      { merge: true }
    );
  }

  public async findByVerificationToken(token: string): Promise<UserEntity | null> {
    const snap = await db
      .collection<UserEntity>(this.collection)
      .where('emailVerificationToken', '==', token)
      .limit(1)
      .get();
    return snap.empty ? null : (snap.docs[0].data() ?? null);
  }

  public async findByPasswordResetToken(token: string): Promise<UserEntity | null> {
    const snap = await db
      .collection<UserEntity>(this.collection)
      .where('passwordResetToken', '==', token)
      .limit(1)
      .get();
    return snap.empty ? null : (snap.docs[0].data() ?? null);
  }

  public async delete(uid: string): Promise<void> {
    await db.doc(`${this.collection}/${uid}`).delete();
  }
}

export const userRepository = new UserRepository();
