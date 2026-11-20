/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { storageService } from './services/storageService';

test('Storage Subsystem: Signed upload and download URL generation with security constraints', async () => {
  const wsId = 'ws_store_test_01';

  // 1. Valid SVG upload request
  const uploadResult = await storageService.generateSignedUploadUrl({
    workspaceId: wsId,
    folder: 'brand',
    fileName: 'logo_concept.svg',
    mimeType: 'image/svg+xml',
    fileSizeBytes: 45000,
  });

  assert.ok(uploadResult.uploadUrl);
  assert.ok(uploadResult.storagePath.startsWith(`workspaces/${wsId}/brand/`));
  assert.ok(uploadResult.expiresAt);

  // 2. Reject unsupported MIME type (e.g., executable or video)
  await assert.rejects(async () => {
    await storageService.generateSignedUploadUrl({
      workspaceId: wsId,
      folder: 'brand',
      fileName: 'malicious.exe',
      mimeType: 'application/x-msdownload',
    });
  }, /INVALID_MIME_TYPE/);

  // 3. Reject video MIME type (Strict video exclusion)
  await assert.rejects(async () => {
    await storageService.generateSignedUploadUrl({
      workspaceId: wsId,
      folder: 'content',
      fileName: 'promo.mp4',
      mimeType: 'video/mp4',
    });
  }, /INVALID_MIME_TYPE/);

  // 4. Reject oversized file (> 10MB)
  await assert.rejects(async () => {
    await storageService.generateSignedUploadUrl({
      workspaceId: wsId,
      folder: 'documents',
      fileName: 'massive_deck.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 15 * 1024 * 1024, // 15MB
    });
  }, /FILE_TOO_LARGE/);

  // 5. Valid signed download URL
  const downloadResult = await storageService.generateSignedDownloadUrl({
    workspaceId: wsId,
    storagePath: uploadResult.storagePath,
  });

  assert.ok(downloadResult.downloadUrl);
  assert.ok(downloadResult.expiresAt);
});
