/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../db/firestore';
import type { BusinessDocumentEntity } from '../types/api';

export class DocumentRepository {
  public async createDocument(doc: BusinessDocumentEntity): Promise<BusinessDocumentEntity> {
    await db
      .collection<BusinessDocumentEntity>(`workspaces/${doc.workspaceId}/documents`)
      .doc(doc.documentId)
      .set(doc);
    return doc;
  }

  public async getDocument(
    workspaceId: string,
    documentId: string
  ): Promise<BusinessDocumentEntity | null> {
    const snap = await db
      .collection<BusinessDocumentEntity>(`workspaces/${workspaceId}/documents`)
      .doc(documentId)
      .get();
    return snap.exists && snap.data() ? (snap.data() as BusinessDocumentEntity) : null;
  }

  public async listDocuments(
    workspaceId: string,
    filter?: { status?: BusinessDocumentEntity['status']; type?: BusinessDocumentEntity['type'] }
  ): Promise<BusinessDocumentEntity[]> {
    let query = db
      .collection<BusinessDocumentEntity>(`workspaces/${workspaceId}/documents`)
      .orderBy('uploadedAt', 'desc');

    if (filter?.status) {
      query = query.where('status', '==', filter.status);
    }
    if (filter?.type) {
      query = query.where('type', '==', filter.type);
    }

    const snap = await query.get();
    return snap.docs.map((d) => d.data()).filter(Boolean) as BusinessDocumentEntity[];
  }

  public async updateDocument(
    workspaceId: string,
    documentId: string,
    patch: Partial<BusinessDocumentEntity>
  ): Promise<BusinessDocumentEntity> {
    const ref = db
      .collection<BusinessDocumentEntity>(`workspaces/${workspaceId}/documents`)
      .doc(documentId);
    const existing = await ref.get();
    if (!existing.exists) {
      throw new Error(`Document '${documentId}' not found in workspace '${workspaceId}'`);
    }

    const updated: BusinessDocumentEntity = {
      ...(existing.data() as BusinessDocumentEntity),
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    await ref.set(updated, { merge: true });
    return updated;
  }

  public async deleteDocument(workspaceId: string, documentId: string): Promise<void> {
    await db
      .collection<BusinessDocumentEntity>(`workspaces/${workspaceId}/documents`)
      .doc(documentId)
      .delete();
  }
}

export const documentRepository = new DocumentRepository();
