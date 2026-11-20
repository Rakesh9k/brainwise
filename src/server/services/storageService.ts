/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'node:crypto';
import { Storage } from '@google-cloud/storage';
import { serverConfig } from '../config/index';

const ALLOWED_MIME_TYPES = [
  'image/svg+xml',
  'image/png',
  'image/jpeg',
  'application/pdf',
  'application/json',
  'text/plain',
];

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export interface SignedUploadUrlResult {
  uploadUrl: string;
  storagePath: string;
  expiresAt: string;
  maxSizeBytes: number;
  allowedMimeTypes: string[];
}

export interface SignedDownloadUrlResult {
  downloadUrl: string;
  expiresAt: string;
}

export class StorageService {
  private storage: Storage | null = null;
  private bucketName: string;

  constructor() {
    this.bucketName = serverConfig.gcsBucketName;
    if (
      serverConfig.isProduction &&
      (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.K_SERVICE)
    ) {
      try {
        this.storage = new Storage({
          projectId: serverConfig.firebaseProjectId,
        });
      } catch {
        console.warn(
          '[STORAGE] Failed to initialize Google Cloud Storage client, using signed URL generator.'
        );
      }
    }
  }

  public validateFileParameters(mimeType: string, fileSizeBytes?: number): void {
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new Error(
        `INVALID_MIME_TYPE: File type '${mimeType}' is not supported. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`
      );
    }
    if (fileSizeBytes && fileSizeBytes > MAX_FILE_SIZE_BYTES) {
      throw new Error(
        `FILE_TOO_LARGE: File size of ${Math.round(fileSizeBytes / 1024)}KB exceeds maximum allowable limit of 10MB.`
      );
    }
  }

  public async generateSignedUploadUrl(params: {
    workspaceId: string;
    folder: 'documents' | 'brand' | 'content' | 'reports' | 'invoices';
    fileName: string;
    mimeType: string;
    fileSizeBytes?: number;
  }): Promise<SignedUploadUrlResult> {
    const { workspaceId, folder, fileName, mimeType, fileSizeBytes } = params;
    this.validateFileParameters(mimeType, fileSizeBytes);

    // Sanitize file name
    const sanitizedBase = fileName
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, '_')
      .slice(0, 80);
    const uniqueSuffix = crypto.randomBytes(4).toString('hex');
    const storagePath = `workspaces/${workspaceId}/${folder}/${Date.now()}_${uniqueSuffix}_${sanitizedBase}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes

    if (this.storage) {
      try {
        const bucket = this.storage.bucket(this.bucketName);
        const file = bucket.file(storagePath);
        const [uploadUrl] = await file.getSignedUrl({
          version: 'v4',
          action: 'write',
          expires: Date.now() + 15 * 60 * 1000,
          contentType: mimeType,
        });

        return {
          uploadUrl,
          storagePath,
          expiresAt,
          maxSizeBytes: MAX_FILE_SIZE_BYTES,
          allowedMimeTypes: ALLOWED_MIME_TYPES,
        };
      } catch (err) {
        console.warn('[STORAGE] GCS getSignedUrl failed, falling back to local signed URL:', err);
      }
    }

    // Local / Dev / Staging HMAC signed URL
    const signature = crypto
      .createHmac('sha256', process.env.STORAGE_SECRET || 'brainwise_dev_storage_secret')
      .update(`${storagePath}:${mimeType}:${expiresAt}`)
      .digest('hex');

    const uploadUrl = `/api/v1/workspaces/${workspaceId}/assets/direct-upload?path=${encodeURIComponent(
      storagePath
    )}&expires=${encodeURIComponent(expiresAt)}&sig=${signature}`;

    return {
      uploadUrl,
      storagePath,
      expiresAt,
      maxSizeBytes: MAX_FILE_SIZE_BYTES,
      allowedMimeTypes: ALLOWED_MIME_TYPES,
    };
  }

  public async generateSignedDownloadUrl(params: {
    workspaceId: string;
    storagePath: string;
  }): Promise<SignedDownloadUrlResult> {
    const { workspaceId, storagePath } = params;

    // Strict multi-tenant verification: path must start with workspaces/{workspaceId}/
    const expectedPrefix = `workspaces/${workspaceId}/`;
    if (!storagePath.startsWith(expectedPrefix)) {
      throw new Error(
        `CROSS_TENANT_ACCESS_DENIED: Asset path '${storagePath}' does not belong to workspace '${workspaceId}'.`
      );
    }

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    if (this.storage) {
      try {
        const bucket = this.storage.bucket(this.bucketName);
        const file = bucket.file(storagePath);
        const [downloadUrl] = await file.getSignedUrl({
          version: 'v4',
          action: 'read',
          expires: Date.now() + 15 * 60 * 1000,
        });
        return { downloadUrl, expiresAt };
      } catch (err) {
        console.warn('[STORAGE] GCS getSignedUrl for read failed, falling back:', err);
      }
    }

    const signature = crypto
      .createHmac('sha256', process.env.STORAGE_SECRET || 'brainwise_dev_storage_secret')
      .update(`${storagePath}:read:${expiresAt}`)
      .digest('hex');

    const downloadUrl = `/api/v1/workspaces/${workspaceId}/assets/stream?path=${encodeURIComponent(
      storagePath
    )}&expires=${encodeURIComponent(expiresAt)}&sig=${signature}`;

    return { downloadUrl, expiresAt };
  }
}

export const storageService = new StorageService();
