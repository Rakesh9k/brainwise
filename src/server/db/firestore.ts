/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getApps, initializeApp } from 'firebase-admin/app';
import {
  getFirestore,
  type Firestore,
  type DocumentData,
  type WhereFilterOp,
} from 'firebase-admin/firestore';
import { serverConfig } from '../config/index';
import { dbLogger } from './dbLogger';

/**
 * Universal Database Interface
 * Abstracts Cloud Firestore and In-Memory local persistence with identical APIs
 */

export interface DbDocumentSnapshot<T = Record<string, unknown>> {
  id: string;
  exists: boolean;
  data(): T | undefined;
}

export interface DbQuerySnapshot<T = Record<string, unknown>> {
  docs: DbDocumentSnapshot<T>[];
  empty: boolean;
  size: number;
}

export interface DbTransaction {
  get<T = Record<string, unknown>>(ref: DbDocumentRef<T>): Promise<DbDocumentSnapshot<T>>;
  set<T = Record<string, unknown>>(
    ref: DbDocumentRef<T>,
    data: Partial<T>,
    options?: { merge?: boolean }
  ): DbTransaction;
  update<T = Record<string, unknown>>(ref: DbDocumentRef<T>, data: Partial<T>): DbTransaction;
  delete<T = Record<string, unknown>>(ref: DbDocumentRef<T>): DbTransaction;
}

export interface DbDocumentRef<T = Record<string, unknown>> {
  id: string;
  path: string;
  get(): Promise<DbDocumentSnapshot<T>>;
  set(data: Partial<T>, options?: { merge?: boolean }): Promise<void>;
  update(data: Partial<T>): Promise<void>;
  delete(): Promise<void>;
  collection<SubT = Record<string, unknown>>(subPath: string): DbCollectionRef<SubT>;
}

export interface DbQuery<T = Record<string, unknown>> {
  where(
    field: string,
    op: '==' | '!=' | '<' | '<=' | '>' | '>=' | 'array-contains',
    value: unknown
  ): DbQuery<T>;
  orderBy(field: string, direction?: 'asc' | 'desc'): DbQuery<T>;
  limit(n: number): DbQuery<T>;
  offset(n: number): DbQuery<T>;
  get(): Promise<DbQuerySnapshot<T>>;
}

export interface DbCollectionRef<T = Record<string, unknown>> extends DbQuery<T> {
  id: string;
  path: string;
  doc(id?: string): DbDocumentRef<T>;
  add(data: T): Promise<DbDocumentRef<T>>;
}

export interface IDatabaseService {
  readonly isPersistent: boolean;
  readonly providerName: string;
  collection<T = Record<string, unknown>>(path: string): DbCollectionRef<T>;
  doc<T = Record<string, unknown>>(path: string): DbDocumentRef<T>;
  runTransaction<R>(updateFunction: (transaction: DbTransaction) => Promise<R>): Promise<R>;
  serverTimestamp(): string;
  resetForTesting(): void;
  exportBackup(): Record<string, any>;
  restoreBackup(backup: Record<string, any>): void;
}

// -----------------------------------------------------------------------------
// In-Memory Database Implementation (Deterministic, Testable, Zero-Dependency)
// Strictly prohibited from running in production.
// -----------------------------------------------------------------------------

interface StoredDoc {
  id: string;
  path: string;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export class InMemoryDatabase implements IDatabaseService {
  public readonly isPersistent = false;
  public readonly providerName = 'in-memory-adapter';
  private store: Map<string, StoredDoc> = new Map();
  private txQueue: Promise<void> = Promise.resolve();

  constructor() {
    if (serverConfig.isProduction) {
      const fatalMsg =
        '[FATAL DATA INTEGRITY VIOLATION] Attempted to instantiate InMemoryDatabase in production environment. Immediate termination enforced.';
      dbLogger.error(fatalMsg, { operation: 'DATABASE_INITIALIZATION' });
      throw new Error(fatalMsg);
    }
  }

  public resetForTesting(): void {
    this.store.clear();
    this.txQueue = Promise.resolve();
  }

  public exportBackup(): Record<string, any> {
    const backup: Record<string, any> = {};
    for (const [k, v] of this.store.entries()) {
      backup[k] = JSON.parse(JSON.stringify(v));
    }
    return backup;
  }

  public restoreBackup(backup: Record<string, any>): void {
    this.store.clear();
    for (const [k, v] of Object.entries(backup)) {
      this.store.set(k, JSON.parse(JSON.stringify(v)));
    }
  }

  public serverTimestamp(): string {
    return new Date().toISOString();
  }

  private normalizePath(path: string): string {
    return path.replace(/^\/+|\/+$/g, '');
  }

  public collection<T = Record<string, unknown>>(path: string): DbCollectionRef<T> {
    const normPath = this.normalizePath(path);
    return new InMemoryCollectionRef<T>(this, normPath);
  }

  public doc<T = Record<string, unknown>>(path: string): DbDocumentRef<T> {
    const normPath = this.normalizePath(path);
    const parts = normPath.split('/');
    const docId = parts[parts.length - 1];
    return new InMemoryDocumentRef<T>(this, normPath, docId);
  }

  public getRawDoc(path: string): StoredDoc | undefined {
    const norm = this.normalizePath(path);
    return this.store.get(norm);
  }

  public setRawDoc(path: string, doc: StoredDoc): void {
    const norm = this.normalizePath(path);
    this.store.set(norm, doc);
  }

  public deleteRawDoc(path: string): void {
    const norm = this.normalizePath(path);
    this.store.delete(norm);
  }

  public getAllInCollection(colPath: string): StoredDoc[] {
    const norm = this.normalizePath(colPath);
    const results: StoredDoc[] = [];
    const prefix = `${norm}/`;

    for (const [key, doc] of this.store.entries()) {
      if (key.startsWith(prefix)) {
        const sub = key.slice(prefix.length);
        if (!sub.includes('/')) {
          results.push(doc);
        }
      }
    }
    return results;
  }

  public async runTransaction<R>(
    updateFunction: (transaction: DbTransaction) => Promise<R>
  ): Promise<R> {
    let releaseLock: () => void;
    const currentLock = new Promise<void>((res) => {
      releaseLock = res;
    });
    const previousQueue = this.txQueue;
    this.txQueue = previousQueue.then(() => currentLock);

    await previousQueue;

    // Clone current store snapshot for atomic rollback
    const snapshot = new Map<string, StoredDoc>();
    for (const [k, v] of this.store.entries()) {
      snapshot.set(k, { ...v, data: JSON.parse(JSON.stringify(v.data)) });
    }

    const tx: DbTransaction = {
      get: async <T>(ref: DbDocumentRef<T>): Promise<DbDocumentSnapshot<T>> => {
        return ref.get();
      },
      set: <T>(
        ref: DbDocumentRef<T>,
        data: Partial<T>,
        options?: { merge?: boolean }
      ): DbTransaction => {
        ref.set(data, options);
        return tx;
      },
      update: <T>(ref: DbDocumentRef<T>, data: Partial<T>): DbTransaction => {
        ref.update(data);
        return tx;
      },
      delete: <T>(ref: DbDocumentRef<T>): DbTransaction => {
        ref.delete();
        return tx;
      },
    };

    try {
      return await updateFunction(tx);
    } catch (err) {
      // Rollback on failure
      this.store = snapshot;
      throw err;
    } finally {
      releaseLock!();
    }
  }
}

class InMemoryDocumentRef<T = Record<string, unknown>> implements DbDocumentRef<T> {
  constructor(
    private db: InMemoryDatabase,
    public path: string,
    public id: string
  ) {}

  public async get(): Promise<DbDocumentSnapshot<T>> {
    const stored = this.db.getRawDoc(this.path);
    if (!stored) {
      return {
        id: this.id,
        exists: false,
        data: () => undefined,
      };
    }
    return {
      id: this.id,
      exists: true,
      data: () => JSON.parse(JSON.stringify(stored.data)) as T,
    };
  }

  public async set(data: Partial<T>, options?: { merge?: boolean }): Promise<void> {
    const existing = this.db.getRawDoc(this.path);
    const now = new Date().toISOString();
    const finalData = options?.merge && existing ? { ...existing.data, ...data } : { ...data };

    this.db.setRawDoc(this.path, {
      id: this.id,
      path: this.path,
      data: finalData as Record<string, unknown>,
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now,
    });
  }

  public async update(data: Partial<T>): Promise<void> {
    const existing = this.db.getRawDoc(this.path);
    if (!existing) {
      throw new Error(`Document not found for update at path: ${this.path}`);
    }
    const now = new Date().toISOString();
    this.db.setRawDoc(this.path, {
      ...existing,
      data: { ...existing.data, ...data },
      updatedAt: now,
    });
  }

  public async delete(): Promise<void> {
    this.db.deleteRawDoc(this.path);
  }

  public collection<SubT = Record<string, unknown>>(subPath: string): DbCollectionRef<SubT> {
    return new InMemoryCollectionRef<SubT>(this.db, `${this.path}/${subPath}`);
  }
}

class InMemoryCollectionRef<T = Record<string, unknown>> implements DbCollectionRef<T> {
  public id: string;
  private filters: Array<{ field: string; op: string; value: unknown }> = [];
  private order?: { field: string; direction: 'asc' | 'desc' };
  private limitCount?: number;
  private offsetCount?: number;

  constructor(
    private db: InMemoryDatabase,
    public path: string
  ) {
    const parts = path.split('/');
    this.id = parts[parts.length - 1];
  }

  public doc(id?: string): DbDocumentRef<T> {
    const finalId = id || Math.random().toString(36).substring(2, 12);
    return new InMemoryDocumentRef<T>(this.db, `${this.path}/${finalId}`, finalId);
  }

  public async add(data: T): Promise<DbDocumentRef<T>> {
    const id = Math.random().toString(36).substring(2, 12);
    const ref = this.doc(id);
    await ref.set(data);
    return ref;
  }

  public where(
    field: string,
    op: '==' | '!=' | '<' | '<=' | '>' | '>=' | 'array-contains',
    value: unknown
  ): DbQuery<T> {
    const query = new InMemoryCollectionRef<T>(this.db, this.path);
    query.filters = [...this.filters, { field, op, value }];
    query.order = this.order;
    query.limitCount = this.limitCount;
    query.offsetCount = this.offsetCount;
    return query;
  }

  public orderBy(field: string, direction: 'asc' | 'desc' = 'asc'): DbQuery<T> {
    const query = new InMemoryCollectionRef<T>(this.db, this.path);
    query.filters = [...this.filters];
    query.order = { field, direction };
    query.limitCount = this.limitCount;
    query.offsetCount = this.offsetCount;
    return query;
  }

  public limit(n: number): DbQuery<T> {
    const query = new InMemoryCollectionRef<T>(this.db, this.path);
    query.filters = [...this.filters];
    query.order = this.order;
    query.limitCount = n;
    query.offsetCount = this.offsetCount;
    return query;
  }

  public offset(n: number): DbQuery<T> {
    const query = new InMemoryCollectionRef<T>(this.db, this.path);
    query.filters = [...this.filters];
    query.order = this.order;
    query.limitCount = this.limitCount;
    query.offsetCount = n;
    return query;
  }

  public async get(): Promise<DbQuerySnapshot<T>> {
    let docs = this.db.getAllInCollection(this.path);

    // Apply where filters
    for (const filter of this.filters) {
      docs = docs.filter((doc) => {
        const val = filter.field.includes('.')
          ? filter.field.split('.').reduce((acc: any, part: string) => (acc ? acc[part] : undefined), doc.data)
          : doc.data[filter.field];
        if (filter.op === '==') return val === filter.value;
        if (filter.op === '!=') return val !== filter.value;
        if (filter.op === '<') return Number(val) < Number(filter.value);
        if (filter.op === '<=') return Number(val) <= Number(filter.value);
        if (filter.op === '>') return Number(val) > Number(filter.value);
        if (filter.op === '>=') return Number(val) >= Number(filter.value);
        if (filter.op === 'array-contains') {
          return Array.isArray(val) && val.includes(filter.value);
        }
        return true;
      });
    }

    // Apply ordering
    if (this.order) {
      const { field, direction } = this.order;
      docs.sort((a, b) => {
        const va = a.data[field];
        const vb = b.data[field];
        if (va === vb) return 0;
        if (va === undefined || va === null) return 1;
        if (vb === undefined || vb === null) return -1;
        const comp = va > vb ? 1 : -1;
        return direction === 'desc' ? -comp : comp;
      });
    }

    // Apply offset
    if (this.offsetCount && this.offsetCount > 0) {
      docs = docs.slice(this.offsetCount);
    }

    // Apply limit
    if (this.limitCount && this.limitCount > 0) {
      docs = docs.slice(0, this.limitCount);
    }

    const mappedDocs: DbDocumentSnapshot<T>[] = docs.map((d) => ({
      id: d.id,
      exists: true,
      data: () => JSON.parse(JSON.stringify(d.data)) as T,
    }));

    return {
      docs: mappedDocs,
      empty: mappedDocs.length === 0,
      size: mappedDocs.length,
    };
  }
}

// -----------------------------------------------------------------------------
// Live Cloud Firestore Adapter (Firebase Admin SDK)
// -----------------------------------------------------------------------------

export class CloudFirestoreDatabase implements IDatabaseService {
  public readonly isPersistent = true;
  public readonly providerName = 'google-cloud-firestore';
  private firestore: Firestore;

  constructor() {
    try {
      if (!getApps().length) {
        initializeApp({
          projectId: serverConfig.firebaseProjectId,
        });
      }
      this.firestore = getFirestore();
      dbLogger.info('CloudFirestoreDatabase initialized successfully', {
        operation: 'DATABASE_INITIALIZATION',
        details: { projectId: serverConfig.firebaseProjectId },
      });
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : String(err);
      dbLogger.error(`CloudFirestore initialization failed: ${errMessage}`, {
        operation: 'DATABASE_INITIALIZATION',
        error: errMessage,
      });
      throw err;
    }
  }

  public collection<T = Record<string, unknown>>(path: string): DbCollectionRef<T> {
    const colRef = this.firestore.collection(path);
    return this.wrapCollectionRef<T>(colRef);
  }

  public doc<T = Record<string, unknown>>(path: string): DbDocumentRef<T> {
    const docRef = this.firestore.doc(path);
    return this.wrapDocRef<T>(docRef);
  }

  public serverTimestamp(): string {
    return new Date().toISOString();
  }

  public resetForTesting(): void {
    // Prohibited on real Cloud Firestore
  }

  public exportBackup(): Record<string, any> {
    return {
      timestamp: new Date().toISOString(),
      type: 'cloud_firestore_managed',
      projectId: serverConfig.firebaseProjectId,
    };
  }

  public restoreBackup(_backup: Record<string, any>): void {
    // Managed GCP Firestore export/import through gcloud firestore import
  }

  public async runTransaction<R>(
    updateFunction: (transaction: DbTransaction) => Promise<R>
  ): Promise<R> {
    const startTime = performance.now();
    try {
      const result = await this.firestore.runTransaction(async (fsTx) => {
        const tx: DbTransaction = {
          get: async <T>(ref: DbDocumentRef<T>): Promise<DbDocumentSnapshot<T>> => {
            const docSnap = await fsTx.get(this.firestore.doc(ref.path));
            return {
              id: docSnap.id,
              exists: docSnap.exists,
              data: () => docSnap.data() as T | undefined,
            };
          },
          set: <T>(
            ref: DbDocumentRef<T>,
            data: Partial<T>,
            options?: { merge?: boolean }
          ): DbTransaction => {
            fsTx.set(this.firestore.doc(ref.path), data as DocumentData, options || {});
            return tx;
          },
          update: <T>(ref: DbDocumentRef<T>, data: Partial<T>): DbTransaction => {
            fsTx.update(this.firestore.doc(ref.path), data as DocumentData);
            return tx;
          },
          delete: <T>(ref: DbDocumentRef<T>): DbTransaction => {
            fsTx.delete(this.firestore.doc(ref.path));
            return tx;
          },
        };
        return await updateFunction(tx);
      });

      const durationMs = performance.now() - startTime;
      dbLogger.recordLatency('TRANSACTION', 'multi-document-transaction', durationMs);
      return result;
    } catch (err: unknown) {
      const durationMs = performance.now() - startTime;
      const errorMsg = err instanceof Error ? err.message : String(err);
      dbLogger.error(`Transaction aborted: ${errorMsg}`, {
        operation: 'TRANSACTION_ROLLBACK',
        durationMs: Math.round(durationMs),
        error: errorMsg,
      });
      throw err;
    }
  }

  private wrapDocRef<T>(ref: any): DbDocumentRef<T> {
    return {
      id: ref.id,
      path: ref.path,
      get: async () => {
        const startTime = performance.now();
        try {
          const snap = await ref.get();
          const durationMs = performance.now() - startTime;
          dbLogger.recordLatency('DOCUMENT_GET', ref.path, durationMs);
          return {
            id: snap.id,
            exists: snap.exists,
            data: () => snap.data() as T | undefined,
          };
        } catch (err: unknown) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          dbLogger.error(`Document get failed at ${ref.path}: ${errorMsg}`, {
            operation: 'DOCUMENT_GET',
            path: ref.path,
            error: errorMsg,
          });
          throw err;
        }
      },
      set: async (data, options) => {
        const startTime = performance.now();
        try {
          await ref.set(data as DocumentData, options || {});
          const durationMs = performance.now() - startTime;
          dbLogger.recordLatency('DOCUMENT_SET', ref.path, durationMs);
        } catch (err: unknown) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          dbLogger.error(`Document set failed at ${ref.path}: ${errorMsg}`, {
            operation: 'DOCUMENT_SET',
            path: ref.path,
            error: errorMsg,
          });
          throw err;
        }
      },
      update: async (data) => {
        const startTime = performance.now();
        try {
          await ref.update(data as DocumentData);
          const durationMs = performance.now() - startTime;
          dbLogger.recordLatency('DOCUMENT_UPDATE', ref.path, durationMs);
        } catch (err: unknown) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          dbLogger.error(`Document update failed at ${ref.path}: ${errorMsg}`, {
            operation: 'DOCUMENT_UPDATE',
            path: ref.path,
            error: errorMsg,
          });
          throw err;
        }
      },
      delete: async () => {
        const startTime = performance.now();
        try {
          await ref.delete();
          const durationMs = performance.now() - startTime;
          dbLogger.recordLatency('DOCUMENT_DELETE', ref.path, durationMs);
        } catch (err: unknown) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          dbLogger.error(`Document delete failed at ${ref.path}: ${errorMsg}`, {
            operation: 'DOCUMENT_DELETE',
            path: ref.path,
            error: errorMsg,
          });
          throw err;
        }
      },
      collection: <SubT>(subPath: string) => this.wrapCollectionRef<SubT>(ref.collection(subPath)),
    };
  }

  private wrapCollectionRef<T>(col: any): DbCollectionRef<T> {
    return {
      id: col.id,
      path: col.path,
      doc: (id?: string) => this.wrapDocRef<T>(id ? col.doc(id) : col.doc()),
      add: async (data: T) => {
        const startTime = performance.now();
        try {
          const added = await col.add(data as DocumentData);
          const durationMs = performance.now() - startTime;
          dbLogger.recordLatency('COLLECTION_ADD', col.path, durationMs);
          return this.wrapDocRef<T>(added);
        } catch (err: unknown) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          dbLogger.error(`Collection add failed at ${col.path}: ${errorMsg}`, {
            operation: 'COLLECTION_ADD',
            path: col.path,
            error: errorMsg,
          });
          throw err;
        }
      },
      where: (field, op, value) => {
        const query = col.where(field, op as WhereFilterOp, value);
        return this.wrapQuery<T>(query);
      },
      orderBy: (field, direction = 'asc') => {
        const query = col.orderBy(field, direction);
        return this.wrapQuery<T>(query);
      },
      limit: (n) => {
        const query = col.limit(n);
        return this.wrapQuery<T>(query);
      },
      offset: (n) => {
        const query = col.offset(n);
        return this.wrapQuery<T>(query);
      },
      get: async () => {
        const startTime = performance.now();
        try {
          const snap = await col.get();
          const durationMs = performance.now() - startTime;
          dbLogger.recordLatency('COLLECTION_GET', col.path, durationMs);
          return {
            docs: snap.docs.map((d: any) => ({
              id: d.id,
              exists: d.exists,
              data: () => d.data() as T,
            })),
            empty: snap.empty,
            size: snap.size,
          };
        } catch (err: unknown) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          dbLogger.error(`Collection query failed at ${col.path}: ${errorMsg}`, {
            operation: 'COLLECTION_GET',
            path: col.path,
            error: errorMsg,
          });
          throw err;
        }
      },
    };
  }

  private wrapQuery<T>(q: any): DbQuery<T> {
    return {
      where: (field, op, value) => this.wrapQuery<T>(q.where(field, op as WhereFilterOp, value)),
      orderBy: (field, direction = 'asc') => this.wrapQuery<T>(q.orderBy(field, direction)),
      limit: (n) => this.wrapQuery<T>(q.limit(n)),
      offset: (n) => this.wrapQuery<T>(q.offset(n)),
      get: async () => {
        const startTime = performance.now();
        try {
          const snap = await q.get();
          const durationMs = performance.now() - startTime;
          dbLogger.recordLatency('QUERY_GET', 'collection-query', durationMs);
          return {
            docs: snap.docs.map((d: any) => ({
              id: d.id,
              exists: d.exists,
              data: () => d.data() as T,
            })),
            empty: snap.empty,
            size: snap.size,
          };
        } catch (err: unknown) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          dbLogger.error(`Query get failed: ${errorMsg}`, {
            operation: 'QUERY_GET',
            error: errorMsg,
          });
          throw err;
        }
      },
    };
  }
}

/**
 * Determine and instantiate database singleton
 * Strictly enforces production safety:
 * 1. In PRODUCTION:
 *    - Persistent database credentials (GOOGLE_APPLICATION_CREDENTIALS, FIRESTORE_EMULATOR_HOST, K_SERVICE) are MANDATORY.
 *    - Initialization failure STOPS application startup (throws fatal Error).
 *    - NEVER falls back to InMemoryDatabase.
 * 2. In TEST:
 *    - Permits explicitly isolated InMemoryDatabase.
 * 3. In LOCAL DEVELOPMENT:
 *    - Allows InMemoryDatabase or Firestore Emulator.
 *    - Emits a clear development-only operational banner.
 *    - Prohibits inferring local development when NODE_ENV === 'production'.
 */
export function createDatabaseService(overrideEnv?: {
  nodeEnv?: 'development' | 'production' | 'test';
  forceInMemoryForTest?: boolean;
}): IDatabaseService {
  const isProduction =
    (overrideEnv?.nodeEnv || serverConfig.nodeEnv) === 'production';
  const isTest =
    (overrideEnv?.nodeEnv || serverConfig.nodeEnv) === 'test' || Boolean(overrideEnv?.forceInMemoryForTest);

  const hasGcpCreds = Boolean(
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    process.env.FIRESTORE_EMULATOR_HOST ||
    process.env.K_SERVICE
  );

  if (isProduction) {
    if (!hasGcpCreds) {
      const errorMsg =
        '[FATAL CONFIGURATION ERROR] BrainWise is running in PRODUCTION mode without Google Cloud Firestore credentials (GOOGLE_APPLICATION_CREDENTIALS or K_SERVICE). Ephemeral in-memory fallback is strictly blocked. Application startup halted.';
      dbLogger.error(errorMsg, { operation: 'DATABASE_INITIALIZATION' });
      throw new Error(errorMsg);
    }

    try {
      return new CloudFirestoreDatabase();
    } catch (err: unknown) {
      const errorMsg = `[FATAL STARTUP FAILURE] Cloud Firestore initialization failed in production: ${
        err instanceof Error ? err.message : String(err)
      }. Application startup halted.`;
      dbLogger.error(errorMsg, { operation: 'DATABASE_INITIALIZATION' });
      throw new Error(errorMsg, { cause: err });
    }
  }

  if (isTest) {
    return new InMemoryDatabase();
  }

  // Local Development
  if (hasGcpCreds && process.env.USE_FIRESTORE_DEV === 'true') {
    dbLogger.info('[DEV] Using Cloud Firestore adapter for local development', {
      operation: 'DATABASE_INITIALIZATION',
    });
    return new CloudFirestoreDatabase();
  }

  console.warn(
    '================================================================================\n' +
    '[BRAINWISE DEV NOTICE] Running with isolated local In-Memory Database adapter.\n' +
    'Data will NOT persist across server restarts.\n' +
    'Set USE_FIRESTORE_DEV=true and configure GCP credentials for local persistent testing.\n' +
    '================================================================================'
  );
  dbLogger.info('[DEV] Local in-memory database initialized for development session', {
    operation: 'DATABASE_INITIALIZATION',
  });
  return new InMemoryDatabase();
}

export const db = createDatabaseService();
