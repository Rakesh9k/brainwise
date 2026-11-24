/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { dbLogger } from './dbLogger';
import type { IDatabaseService } from './firestore';

export interface MigrationStep {
  version: number;
  description: string;
  up: (db: IDatabaseService) => Promise<void>;
}

export class MigrationManager {
  private static MIGRATION_COLLECTION = 'system_schema_migrations';

  public static async getAppliedVersions(db: IDatabaseService): Promise<number[]> {
    try {
      const snap = await db.collection(this.MIGRATION_COLLECTION).get();
      return snap.docs.map((d) => (d.data() as { version: number }).version).sort((a, b) => a - b);
    } catch {
      return [];
    }
  }

  public static async applyMigrations(db: IDatabaseService, migrations: MigrationStep[]): Promise<void> {
    const applied = new Set(await this.getAppliedVersions(db));

    for (const step of migrations) {
      if (applied.has(step.version)) {
        continue;
      }

      dbLogger.info(`Applying schema migration v${step.version}: ${step.description}`, {
        operation: 'SCHEMA_MIGRATION',
      });

      const startTime = performance.now();
      try {
        await step.up(db);
        const durationMs = performance.now() - startTime;

        await db.doc(`${this.MIGRATION_COLLECTION}/v${step.version}`).set({
          version: step.version,
          description: step.description,
          appliedAt: db.serverTimestamp(),
          durationMs: Math.round(durationMs),
        });

        dbLogger.info(`Schema migration v${step.version} successfully applied`, {
          operation: 'SCHEMA_MIGRATION',
          durationMs: Math.round(durationMs),
        });
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        dbLogger.error(`Schema migration v${step.version} failed: ${errorMsg}`, {
          operation: 'SCHEMA_MIGRATION',
          error: errorMsg,
        });
        throw new Error(`Migration v${step.version} failed: ${errorMsg}`, { cause: err });
      }
    }
  }
}

/**
 * Baseline Versioned Migrations
 */
export const SYSTEM_MIGRATIONS: MigrationStep[] = [
  {
    version: 1,
    description: 'Ensure system metadata and root collections are initialized',
    up: async (database: IDatabaseService) => {
      const initRef = database.doc('system_metadata/runtime_info');
      await initRef.set(
        {
          engine: 'BrainWise Unified Architecture',
          initializedAt: database.serverTimestamp(),
          strictVideoExclusionCertified: true,
        },
        { merge: true }
      );
    },
  },
];
