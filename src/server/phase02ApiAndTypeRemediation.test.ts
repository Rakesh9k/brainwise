/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

process.env.NODE_ENV = 'test';
process.env.TEST_MODE = 'true';

import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import type { Server } from 'node:http';

import { validateWorkspaceId } from '../utils/aiClient';
import { createApiRouter } from './routes';
import { workspaceRepository } from './repositories/workspaceRepository';
import { creditWalletRepository } from './repositories/creditWalletRepository';
import { extractionJobRepository } from './repositories/extractionJobRepository';
import { productRepository } from './repositories/productRepository';
import { agentAuditLogRepository } from './repositories/agentAuditLogRepository';
import { documentRepository } from './repositories/documentRepository';

test('PHASE 02 — BUILD STABILITY, API ROUTING & CONTRACT REPAIR TEST SUITE', async (t) => {
  const wsId = `ws_p02_${Date.now()}`;
  const userId = `user_p02_${Date.now()}`;
  const authHeader = `Bearer test-token-${userId}`;

  // Provision an ephemeral Express test server
  const app = express();
  app.use(express.json());
  app.use('/api', createApiRouter());

  let server: Server;
  let baseUrl = '';

  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (addr && typeof addr === 'object') {
        baseUrl = `http://127.0.0.1:${addr.port}`;
      }
      resolve();
    });
  });

  t.after(() => {
    server.close();
  });

  // =========================================================================
  // SECTION 1: WORKSPACE ID VALIDATION & ROUTING SECURITY
  // =========================================================================
  await t.test('1. Workspace ID Validation Guardrails (aiClient.ts)', () => {
    // Valid workspace strings
    assert.equal(validateWorkspaceId('ws_active_123'), 'ws_active_123');
    assert.equal(validateWorkspaceId('   ws_trimmed_456   '), 'ws_trimmed_456');

    // Invalid workspace values must throw INVALID_WORKSPACE_ID
    assert.throws(() => validateWorkspaceId(''), /INVALID_WORKSPACE_ID/);
    assert.throws(() => validateWorkspaceId('    '), /INVALID_WORKSPACE_ID/);
    assert.throws(() => validateWorkspaceId(null), /INVALID_WORKSPACE_ID/);
    assert.throws(() => validateWorkspaceId(undefined), /INVALID_WORKSPACE_ID/);
    assert.throws(() => validateWorkspaceId('null'), /INVALID_WORKSPACE_ID/);
    assert.throws(() => validateWorkspaceId('undefined'), /INVALID_WORKSPACE_ID/);
    assert.throws(() => validateWorkspaceId('NULL'), /INVALID_WORKSPACE_ID/);
    assert.throws(() => validateWorkspaceId('Undefined'), /INVALID_WORKSPACE_ID/);
  });

  await t.test('2. Workspace-Aware Route Authorization & Multi-Tenant Isolation', async () => {
    // Calling protected workspace route with missing auth must return 401 UNAUTHENTICATED
    const unauthRes = await fetch(`${baseUrl}/api/v1/workspaces/${wsId}/business-profile`);
    assert.equal(unauthRes.status, 401);
    const unauthBody = await unauthRes.json();
    assert.equal(unauthBody.success, false);
    assert.equal(unauthBody.error.code, 'UNAUTHENTICATED');

    // Calling protected workspace route for non-existent workspace must return 404 WORKSPACE_NOT_FOUND
    const notFoundRes = await fetch(`${baseUrl}/api/v1/workspaces/ws_non_existent_${Date.now()}/business-profile`, {
      headers: {
        Authorization: authHeader,
      },
    });
    assert.equal(notFoundRes.status, 404);
    const notFoundBody = await notFoundRes.json();
    assert.equal(notFoundBody.success, false);
    assert.equal(notFoundBody.error.code, 'WORKSPACE_NOT_FOUND');

    // Provision workspace and credit wallet for subsequent tests
    await workspaceRepository.create({
      workspaceId: wsId,
      name: 'Phase 02 Remediation Test Space',
      slug: `p02-test-${Date.now()}`,
      ownerUserId: userId,
      tier: 'pro',
      industry: 'Coffee & Roasting',
      workspaceStatus: 'active',
    });
    await creditWalletRepository.initializeWallet(wsId, 500);

    // Now calling with valid membership succeeds
    const authedRes = await fetch(`${baseUrl}/api/v1/workspaces/${wsId}/business-profile`, {
      headers: {
        Authorization: authHeader,
        'X-Workspace-Id': wsId,
      },
    });
    assert.equal(authedRes.status, 200);
  });

  // =========================================================================
  // SECTION 2: STANDARDIZED DOCUMENT EXTRACTION CONTRACT
  // =========================================================================
  await t.test('3. Document Extraction Canonical Contract & Fact Staging', async () => {
    const rawDocument = `Solstice Craft Roastery & Cafe
Single-Origin Ethiopian Guji: $19.50 - Notes of bergamot, lemon blossom and wildflower honey.
Signature Dark Roast Blend: $15.00 - Rich cocoa, toasted almond and molasses.
Pour-Over Masterclass: $50.00 - Hands-on 90-minute immersion in manual extraction methods.
We serve specialty coffee aficionados and quality-conscious home brewers seeking ethically sourced coffee.`;

    const extractRes = await fetch(
      `${baseUrl}/api/v1/workspaces/${wsId}/business-profile/extract-document`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
          'X-Workspace-Id': wsId,
          'X-Idempotency-Key': `idem_doc_extract_${Date.now()}`,
        },
        body: JSON.stringify({
          documentName: 'Solstice Offerings & Profile.txt',
          documentType: 'TXT',
          documentContent: rawDocument,
        }),
      }
    );

    assert.equal(extractRes.status, 200);
    const extractJson = await extractRes.json();

    // Verify root contract structure
    assert.equal(extractJson.success, true);
    assert.ok(extractJson.data, 'Must return data envelope');

    const data = extractJson.data;
    assert.ok(typeof data.documentId === 'string' && data.documentId.startsWith('doc_'), 'Must include documentId');
    assert.ok(Array.isArray(data.products), 'products must be an array');
    assert.ok(data.products.length >= 2, 'Must extract at least 2 products');
    assert.ok(Array.isArray(data.services), 'services must be an array');
    assert.ok(data.services.length >= 1, 'Must extract at least 1 service');
    assert.ok(typeof data.identity === 'object', 'identity must be an object');
    assert.equal(data.identity.businessName, 'Solstice Craft Roastery & Cafe');

    // Truth Engine Guardrail: candidate verification items must NOT be marked as verified truth
    assert.equal(data.provenance, 'AI_INFERRED');
    assert.equal(data.requiresUserApproval, true);
    assert.ok(Array.isArray(data.verificationItems), 'verificationItems must be returned');
    assert.ok(data.verificationItems.length > 0, 'Must produce candidate verification items');

    for (const item of data.verificationItems) {
      assert.equal(item.status, 'pending', 'Candidate item status must be pending');
      assert.equal(item.provenance, 'AI_INFERRED', 'Candidate item provenance must be AI_INFERRED');
      assert.equal(item.requiresUserApproval, true, 'Candidate items must require user approval');
      assert.equal(item.workspaceId, wsId);
    }

    // Verify verification items were persisted in extractionJobRepository
    const pendingItems = await extractionJobRepository.listVerificationItems(wsId, 'pending');
    assert.ok(pendingItems.length >= data.verificationItems.length, 'Verification items must persist in DB');

    // Verify document record was persisted in documentRepository
    const persistedDoc = await documentRepository.getDocument(wsId, data.documentId);
    assert.ok(persistedDoc, 'Document record must be persisted');
    assert.equal(persistedDoc?.name, 'Solstice Offerings & Profile.txt');
    assert.equal(persistedDoc?.status, 'processed');

    // Verify alias route /documents/extract also works identically
    const aliasRes = await fetch(
      `${baseUrl}/api/v1/workspaces/${wsId}/documents/extract`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
          'X-Workspace-Id': wsId,
          'X-Idempotency-Key': `idem_doc_alias_${Date.now()}`,
        },
        body: JSON.stringify({
          documentName: 'Menu Alias.txt',
          documentType: 'TXT',
          documentContent: rawDocument,
        }),
      }
    );
    assert.equal(aliasRes.status, 200);
    const aliasJson = await aliasRes.json();
    assert.equal(aliasJson.success, true);
    assert.ok(aliasJson.data.documentId.startsWith('doc_'));
  });

  // =========================================================================
  // SECTION 3: PRODUCT BULK IMPORT API
  // =========================================================================
  await t.test('4. Product Bulk Import API — CSV String Ingestion', async () => {
    const csvContent = `name,price,currency,sku,category,description
Cold Brew Bottle 1L,12.50,USD,SKU-CB-01,Bottled,Slow steeped organic cold brew
Cascara Cherry Tea 250g,9.00,USD,SKU-CT-02,Tea,Sun dried high-altitude cascara tea
Filter Papers Pack of 100,6.50,USD,SKU-FP-03,Merchandise,Oxygen bleached cone coffee filters`;

    const csvRes = await fetch(
      `${baseUrl}/api/v1/workspaces/${wsId}/business-profile/products/bulk`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
          'X-Workspace-Id': wsId,
        },
        body: JSON.stringify({
          csv: csvContent,
          atomic: false,
        }),
      }
    );

    assert.ok(csvRes.status === 200 || csvRes.status === 201, 'Expected 200 or 201 status');
    const csvBody = await csvRes.json();
    assert.equal(csvBody.success, true);
    assert.equal(csvBody.data.summary.total, 3);
    assert.equal(csvBody.data.summary.createdCount, 3);
    assert.equal(csvBody.data.summary.rejectedCount, 0);
    assert.equal(csvBody.data.created.length, 3);

    // Verify products exist in database
    const dbProduct = await productRepository.findByNameOrSku(wsId, 'Cold Brew Bottle 1L');
    assert.ok(dbProduct, 'Product must be persisted in database');
    assert.equal(dbProduct?.price, 12.50);
    assert.equal(dbProduct?.sku, 'SKU-CB-01');
  });

  await t.test('5. Product Bulk Import API — JSON Array Ingestion', async () => {
    const jsonRes = await fetch(
      `${baseUrl}/api/v1/workspaces/${wsId}/business-profile/products/bulk`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
          'X-Workspace-Id': wsId,
        },
        body: JSON.stringify({
          products: [
            {
              name: 'Chemex Glass Coffeemaker 6-Cup',
              price: 49.95,
              currency: 'USD',
              sku: 'SKU-CHMX-06',
              category: 'Equipment',
              description: 'Classic borosilicate glass pourover brewer',
            },
            {
              name: 'Hario V60 Plastic Dripper 02',
              price: 11.50,
              currency: 'USD',
              sku: 'SKU-V60-02',
              category: 'Equipment',
              description: 'Spiral rib cone dripper',
            },
          ],
        }),
      }
    );

    assert.ok(jsonRes.status === 200 || jsonRes.status === 201, 'Expected 200 or 201 status');
    const jsonBody = await jsonRes.json();
    assert.equal(jsonBody.success, true);
    assert.equal(jsonBody.data.summary.createdCount, 2);
    assert.equal(jsonBody.data.created.length, 2);

    // Verify products exist in database
    const v60 = await productRepository.findByNameOrSku(wsId, 'Hario V60 Plastic Dripper 02');
    assert.ok(v60);
    assert.equal(v60?.price, 11.50);
  });

  await t.test('6. Product Bulk Import API — Deduplication & Partial Success Reporting', async () => {
    // Attempt to import batch containing:
    // 1. Duplicate by Name (Cold Brew Bottle 1L, already exists)
    // 2. Duplicate by SKU (SKU-CHMX-06, already exists)
    // 3. Intra-batch duplicate
    // 4. Invalid price (negative number)
    // 5. Missing required name
    // 6. Valid new item (AeroPress Original)
    const mixedBatch = [
      { name: 'Cold Brew Bottle 1L', price: 13.00, currency: 'USD', sku: 'SKU-NEW-01' },
      { name: 'Duplicate SKU Item', price: 20.00, currency: 'USD', sku: 'SKU-CHMX-06' },
      { name: 'Intra Duplicate', price: 15.00, currency: 'USD', sku: 'SKU-INTRA-01' },
      { name: 'Intra Duplicate', price: 15.00, currency: 'USD', sku: 'SKU-INTRA-02' },
      { name: 'Invalid Price Item', price: -10.00, currency: 'USD', sku: 'SKU-NEG-01' },
      { price: 25.00, currency: 'USD', sku: 'SKU-NONAME-01' },
      { name: 'AeroPress Original Coffee Maker', price: 39.95, currency: 'USD', sku: 'SKU-AERO-01' },
    ];

    const partialRes = await fetch(
      `${baseUrl}/api/v1/workspaces/${wsId}/business-profile/products/bulk`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
          'X-Workspace-Id': wsId,
        },
        body: JSON.stringify({
          products: mixedBatch,
          atomic: false,
        }),
      }
    );

    assert.ok(partialRes.status === 200 || partialRes.status === 201, 'Expected 200 or 201 status');
    const partialBody = await partialRes.json();
    assert.equal(partialBody.success, true);

    // 2 items should be created: 'Intra Duplicate' (first occurrence) and 'AeroPress Original Coffee Maker'
    assert.equal(partialBody.data.summary.createdCount, 2);
    // 5 items rejected: 1 existing name duplicate, 1 existing SKU duplicate, 1 intra-batch duplicate, 1 negative price, 1 missing name
    assert.equal(partialBody.data.summary.rejectedCount, 5);
    assert.equal(partialBody.data.rejected.length, 5);

    const aero = await productRepository.findByNameOrSku(wsId, 'AeroPress Original Coffee Maker');
    assert.ok(aero, 'Valid item must be created');
    assert.equal(aero?.price, 39.95);
  });

  await t.test('7. Product Bulk Import API — Atomic Mode Abort & Rollback', async () => {
    // In atomic mode (atomic: true), any validation or duplicate failure MUST reject the entire batch
    const atomicBatch = [
      { name: 'Fellow Ode Brew Grinder Gen 2', price: 345.00, currency: 'USD', sku: 'SKU-ODE-02' },
      { name: 'Defective Product Row', price: -50.00, currency: 'USD', sku: 'SKU-BAD-01' },
    ];

    const atomicRes = await fetch(
      `${baseUrl}/api/v1/workspaces/${wsId}/business-profile/products/bulk`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
          'X-Workspace-Id': wsId,
        },
        body: JSON.stringify({
          products: atomicBatch,
          atomic: true,
        }),
      }
    );

    assert.equal(atomicRes.status, 400);
    const atomicBody = await atomicRes.json();
    assert.equal(atomicBody.success, false);
    assert.equal(atomicBody.error.code, 'ATOMIC_IMPORT_FAILED');
    assert.ok(Array.isArray(atomicBody.error.details));
    assert.ok(atomicBody.error.details.length >= 1);

    // Verify Fellow Ode was NOT created because the batch was rejected atomically
    const ode = await productRepository.findByNameOrSku(wsId, 'Fellow Ode Brew Grinder Gen 2');
    assert.equal(ode, null, 'No product should be created when atomic import fails');
  });

  await t.test('8. Immutable Audit Trail Logging for Bulk Operations', async () => {
    // List audit logs for the workspace
    const auditLogs = await agentAuditLogRepository.listLogs(wsId, 20);
    const bulkImportLogs = auditLogs.filter(
      (log) => log.action === 'BULK_IMPORT_PRODUCTS' || log.action === 'products.bulk_import'
    );
    assert.ok(bulkImportLogs.length >= 1, 'Audit log must record bulk product import operations');
    const log = bulkImportLogs[0];
    assert.equal(log.workspaceId, wsId);
    assert.equal(log.actorUserId, userId);
  });
});
