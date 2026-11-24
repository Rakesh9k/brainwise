/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { Storage } from '@google-cloud/storage';
import { serverConfig } from '../config/index';

const ALLOWED_MIME_TYPES = [
  'image/svg+xml',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/json',
  'text/plain',
  'text/csv',
  'text/markdown',
  'text/html',
  'font/woff2',
  'font/woff',
  'font/ttf',
  'font/otf',
  'application/font-woff',
  'application/vnd.ms-fontobject',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint',
];

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB default
const LOCAL_STORAGE_DIR = path.resolve(process.cwd(), '.brainwise_local_storage');

export type StorageFolder =
  | 'documents'
  | 'brand'
  | 'content'
  | 'reports'
  | 'invoices'
  | 'originals'
  | 'derivatives'
  | 'thumbnails'
  | 'previews'
  | 'versions'
  | 'temp';

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

export interface FileSignatureVerificationResult {
  valid: boolean;
  detectedType?: string;
  reason?: string;
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

    // Ensure local storage dir exists for dev/fallback
    try {
      if (!fs.existsSync(LOCAL_STORAGE_DIR)) {
        fs.mkdirSync(LOCAL_STORAGE_DIR, { recursive: true });
      }
    } catch {
      // Ignore directory creation in restricted environments
    }
  }

  public validateFileParameters(mimeType: string, fileSizeBytes?: number): void {
    // Strict Video Exclusion
    if (mimeType.toLowerCase().startsWith('video/')) {
      throw new Error(
        `INVALID_MIME_TYPE: Video files (${mimeType}) are strictly prohibited by BrainWise Product Architecture.`
      );
    }

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

  /**
   * Cryptographic magic-bytes verification ensuring file payload matches declared MIME type
   */
  public verifyFileSignature(buffer: Buffer, declaredMimeType: string): FileSignatureVerificationResult {
    if (!buffer || buffer.length === 0) {
      return { valid: false, reason: 'Empty file buffer' };
    }

    // Strict video exclusion check
    if (declaredMimeType.startsWith('video/')) {
      return { valid: false, reason: 'STRICT VIDEO EXCLUSION: Video files permanently forbidden' };
    }

    const headerHex = buffer.slice(0, 16).toString('hex').toUpperCase();

    // 1. PNG check: 89 50 4E 47 0D 0A 1A 0A
    if (declaredMimeType === 'image/png') {
      const isPng = headerHex.startsWith('89504E470D0A1A0A');
      return {
        valid: isPng,
        detectedType: isPng ? 'image/png' : 'unknown',
        reason: isPng ? undefined : 'Byte signature does not match PNG format',
      };
    }

    // 2. JPEG check: FF D8 FF
    if (declaredMimeType === 'image/jpeg' || declaredMimeType === 'image/jpg') {
      const isJpeg = headerHex.startsWith('FFD8FF');
      return {
        valid: isJpeg,
        detectedType: isJpeg ? 'image/jpeg' : 'unknown',
        reason: isJpeg ? undefined : 'Byte signature does not match JPEG format',
      };
    }

    // 3. PDF check: 25 50 44 46 (%PDF)
    if (declaredMimeType === 'application/pdf') {
      const isPdf = buffer.slice(0, 5).toString('ascii').startsWith('%PDF-');
      return {
        valid: isPdf,
        detectedType: isPdf ? 'application/pdf' : 'unknown',
        reason: isPdf ? undefined : 'Byte signature does not match PDF format',
      };
    }

    // 4. WebP check: 52 49 46 46 ... 57 45 42 50 (RIFF....WEBP)
    if (declaredMimeType === 'image/webp') {
      const isRiff = buffer.slice(0, 4).toString('ascii') === 'RIFF';
      const isWebp = buffer.slice(8, 12).toString('ascii') === 'WEBP';
      return {
        valid: isRiff && isWebp,
        detectedType: isRiff && isWebp ? 'image/webp' : 'unknown',
        reason: isRiff && isWebp ? undefined : 'Byte signature does not match WebP format',
      };
    }

    // 5. SVG check: Text containing <svg
    if (declaredMimeType === 'image/svg+xml') {
      const text = buffer.slice(0, 2048).toString('utf8').trim().toLowerCase();
      const hasSvg = text.includes('<svg') || (text.includes('<?xml') && text.includes('<svg'));
      const hasScript = text.includes('<script') || text.includes('javascript:');
      if (hasScript) {
        return { valid: false, reason: 'Security violation: SVG contains executable script tags' };
      }
      return {
        valid: hasSvg,
        detectedType: hasSvg ? 'image/svg+xml' : 'unknown',
        reason: hasSvg ? undefined : 'SVG content does not contain a valid <svg> root element',
      };
    }

    // 6. JSON check: Starts with { or [
    if (declaredMimeType === 'application/json') {
      const text = buffer.slice(0, 100).toString('utf8').trim();
      const isJson = text.startsWith('{') || text.startsWith('[');
      return {
        valid: isJson,
        detectedType: isJson ? 'application/json' : 'unknown',
        reason: isJson ? undefined : 'Content does not start with JSON object or array character',
      };
    }

    // 7. General text check
    if (declaredMimeType.startsWith('text/')) {
      return { valid: true, detectedType: declaredMimeType };
    }

    return { valid: true, detectedType: declaredMimeType };
  }

  /**
   * Computes deterministic SHA-256 checksum of binary payload for integrity and duplicate detection
   */
  public computeChecksumSha256(buffer: Buffer | string): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  public async generateSignedUploadUrl(params: {
    workspaceId: string;
    folder: StorageFolder;
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
    const signature = this.generateSignature(`${storagePath}:${mimeType}:${expiresAt}`);

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

  public async uploadFile(params: {
    workspaceId: string;
    buffer: Buffer;
    originalFilename?: string;
    fileName?: string;
    mimeType: string;
    folder: StorageFolder;
  }): Promise<{ storagePath: string; publicUrl?: string; downloadUrl?: string }> {
    const { workspaceId, buffer, mimeType, folder } = params;
    const fileName = params.originalFilename || params.fileName || `file_${Date.now()}`;
    const sanitizedBase = fileName
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, '_')
      .slice(0, 80);
    const uniqueSuffix = crypto.randomBytes(4).toString('hex');
    const storagePath = `workspaces/${workspaceId}/${folder}/${Date.now()}_${uniqueSuffix}_${sanitizedBase}`;

    if (this.storage) {
      try {
        const bucket = this.storage.bucket(this.bucketName);
        const file = bucket.file(storagePath);
        await file.save(buffer, {
          contentType: mimeType,
          resumable: false,
        });
        const download = await this.generateSignedDownloadUrl({ workspaceId, storagePath });
        return { storagePath, downloadUrl: download.downloadUrl, publicUrl: download.downloadUrl };
      } catch (err) {
        console.warn('[STORAGE] GCS file save failed, falling back to local file storage:', err);
      }
    }

    await this.saveLocalFile(storagePath, buffer);
    const download = await this.generateSignedDownloadUrl({ workspaceId, storagePath });
    return { storagePath, downloadUrl: download.downloadUrl, publicUrl: download.downloadUrl };
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

    const signature = this.generateSignature(`${storagePath}:read:${expiresAt}`);

    const downloadUrl = `/api/v1/workspaces/${workspaceId}/assets/stream?path=${encodeURIComponent(
      storagePath
    )}&expires=${encodeURIComponent(expiresAt)}&sig=${signature}`;

    return { downloadUrl, expiresAt };
  }

  // ===========================================================================
  // LOCAL STORAGE FALLBACK (DEV & TESTING)
  // ===========================================================================

  public generateSignature(payload: string): string {
    const secret = process.env.STORAGE_SECRET || 'brainwise_dev_storage_secret';
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  public verifySignature(payload: string, signature: string): boolean {
    const expected = this.generateSignature(payload);
    try {
      return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
    } catch {
      return false;
    }
  }

  public async saveLocalFile(storagePath: string, buffer: Buffer): Promise<void> {
    const safePath = path.join(LOCAL_STORAGE_DIR, storagePath.replace(/\//g, path.sep));
    const dir = path.dirname(safePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    await fs.promises.writeFile(safePath, buffer);
  }

  public async readLocalFile(storagePath: string): Promise<Buffer | null> {
    const safePath = path.join(LOCAL_STORAGE_DIR, storagePath.replace(/\//g, path.sep));
    if (!fs.existsSync(safePath)) {
      return null;
    }
    return fs.promises.readFile(safePath);
  }

  public async deleteLocalFile(storagePath: string): Promise<boolean> {
    const safePath = path.join(LOCAL_STORAGE_DIR, storagePath.replace(/\//g, path.sep));
    if (fs.existsSync(safePath)) {
      await fs.promises.unlink(safePath);
      return true;
    }
    return false;
  }

  public async cleanupTemporaryFiles(workspaceId?: string, olderThanMs = 24 * 60 * 60 * 1000): Promise<number> {
    let cleaned = 0;
    const now = Date.now();
    const tempDir = workspaceId
      ? path.join(LOCAL_STORAGE_DIR, 'workspaces', workspaceId, 'temp')
      : LOCAL_STORAGE_DIR;

    if (!fs.existsSync(tempDir)) return 0;

    const traverse = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          traverse(full);
        } else if (entry.isFile() && (full.includes(`${path.sep}temp${path.sep}`) || full.includes('/temp/'))) {
          const stats = fs.statSync(full);
          if (now - stats.mtimeMs > olderThanMs) {
            fs.unlinkSync(full);
            cleaned++;
          }
        }
      }
    };

    try {
      traverse(tempDir);
    } catch {
      // Ignore directory traversal errors
    }

    return cleaned;
  }
}

export const storageService = new StorageService();
