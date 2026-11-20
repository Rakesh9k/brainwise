/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { db } from './db/firestore';
import { businessBrainService } from './services/businessBrainService';
import { workspaceService } from './services/workspaceService';

test('Business Brain: Persistent knowledge foundation and fact provenance', async () => {
  db.resetForTesting();

  const { workspace } = await workspaceService.createWorkspace({
    ownerUserId: 'founder_01',
    workspaceName: 'Aura Skincare Lab',
    industry: 'Cosmetics & Wellness',
  });

  const wsId = workspace.workspaceId;

  // 1. Initial Profile
  const initial = await businessBrainService.getProfile(wsId);
  assert.equal(initial.businessName, 'Aura Skincare Lab');
  assert.equal(initial.version, 1);

  // 2. Update with products, pricing, and positioning
  const updated = await businessBrainService.updateProfile(wsId, {
    tagline: 'Bio-fermented skincare formulated for humid climates.',
    valueProposition: 'Clinically proven barrier repair with zero greasy residue.',
    productsAndServices: [
      {
        id: 'p1',
        name: 'Ceramide Mist',
        category: 'Skincare',
        priceRange: '$24 – $32',
        description: 'Lightweight hydrating barrier mist',
        marginEstimate: '74%',
      },
    ],
  });

  assert.equal(updated.version, 2);
  assert.equal(updated.productsAndServices?.length, 1);

  // 3. Confirm Fact Provenance
  const confirmed = await businessBrainService.confirmFact(
    wsId,
    'valueProposition',
    'Dr. Sarah (Founder)'
  );
  assert.equal(confirmed.provenance['valueProposition'].source, 'USER_CONFIRMED');
  assert.equal(confirmed.provenance['valueProposition'].confidence, 1.0);
  assert.equal(confirmed.provenance['valueProposition'].lastConfirmedBy, 'Dr. Sarah (Founder)');

  // 4. Strategic Memory: Add Exclusion Rules
  const withExclusion = await businessBrainService.addExclusionRule(
    wsId,
    'Never promise cure for chronic eczema without clinical trial citation'
  );
  assert.equal(withExclusion.strategicMemory.explicitExclusions.length, 1);

  // 5. Version History Retrieval
  const history = await businessBrainService.getHistory(wsId);
  assert.ok(history.length >= 2);
  assert.equal(history[0].version > history[history.length - 1].version, true);
});
