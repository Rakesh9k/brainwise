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
// -----------------------------------------------------------------------------

interface StoredDoc {
  id: string;
  path: string;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

class InMemoryDatabase implements IDatabaseService {
  private store: Map<string, StoredDoc> = new Map();
  private txQueue: Promise<void> = Promise.resolve();

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

    for (const [key, value] of this.store.entries()) {
      if (key.startsWith(prefix)) {
        const sub = key.slice(prefix.length);
        if (!sub.includes('/')) {
          results.push(value);
        }
      }
    }
    return results;
  }

  public async runTransaction<R>(
    updateFunction: (transaction: DbTransaction) => Promise<R>
  ): Promise<R> {
    let releaseLock: () => void;
    const lockAcquired = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });
    const previousQueue = this.txQueue;
    this.txQueue = previousQueue.then(() => lockAcquired);

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
        const val = doc.data[filter.field];
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

class CloudFirestoreDatabase implements IDatabaseService {
  private firestore: Firestore;

  constructor() {
    if (!getApps().length) {
      initializeApp({
        projectId: serverConfig.firebaseProjectId,
      });
    }
    this.firestore = getFirestore();
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
    // No-op on real Cloud Firestore
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
    return this.firestore.runTransaction(async (fsTx) => {
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
  }

  private wrapDocRef<T>(ref: any): DbDocumentRef<T> {
    return {
      id: ref.id,
      path: ref.path,
      get: async () => {
        const snap = await ref.get();
        return {
          id: snap.id,
          exists: snap.exists,
          data: () => snap.data() as T | undefined,
        };
      },
      set: async (data, options) => {
        await ref.set(data as DocumentData, options || {});
      },
      update: async (data) => {
        await ref.update(data as DocumentData);
      },
      delete: async () => {
        await ref.delete();
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
        const added = await col.add(data as DocumentData);
        return this.wrapDocRef<T>(added);
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
        const snap = await col.get();
        return {
          docs: snap.docs.map((d: any) => ({
            id: d.id,
            exists: d.exists,
            data: () => d.data() as T,
          })),
          empty: snap.empty,
          size: snap.size,
        };
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
        const snap = await q.get();
        return {
          docs: snap.docs.map((d: any) => ({
            id: d.id,
            exists: d.exists,
            data: () => d.data() as T,
          })),
          empty: snap.empty,
          size: snap.size,
        };
      },
    };
  }
}

/**
 * Determine and instantiate database singleton
 */
function createDatabaseService(): IDatabaseService {
  const hasGcpCreds = Boolean(
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    process.env.FIRESTORE_EMULATOR_HOST ||
    process.env.K_SERVICE
  );

  if (hasGcpCreds && serverConfig.isProduction) {
    try {
      return new CloudFirestoreDatabase();
    } catch {
      console.warn('[DB] Falling back to InMemoryDatabase due to initialization warning.');
      return new InMemoryDatabase();
    }
  }

  return new InMemoryDatabase();
}

export const db = createDatabaseService();
