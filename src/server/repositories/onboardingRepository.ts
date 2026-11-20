/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../db/firestore';
import type { OnboardingSessionEntity } from '../types/api';

export class OnboardingRepository {
  private collection = 'onboarding_sessions';

  public async findByUserId(userId: string): Promise<OnboardingSessionEntity | null> {
    const snap = await db
      .collection<OnboardingSessionEntity>(this.collection)
      .where('userId', '==', userId)
      .limit(1)
      .get();
    return snap.empty ? null : (snap.docs[0].data() ?? null);
  }

  public async saveSession(session: OnboardingSessionEntity): Promise<OnboardingSessionEntity> {
    const now = db.serverTimestamp();
    const entity: OnboardingSessionEntity = {
      ...session,
      updatedAt: now,
    };
    await db
      .doc<OnboardingSessionEntity>(`${this.collection}/${session.sessionId}`)
      .set(entity, { merge: true });
    return entity;
  }

  public async deleteByUserId(userId: string): Promise<void> {
    const snap = await db
      .collection<OnboardingSessionEntity>(this.collection)
      .where('userId', '==', userId)
      .get();
    for (const doc of snap.docs) {
      await db.doc(`${this.collection}/${doc.id}`).delete();
    }
  }
}

export const onboardingRepository = new OnboardingRepository();
