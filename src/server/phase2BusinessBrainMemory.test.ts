/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { businessBrainService } from './services/businessBrainService';
import { sharedBusinessContextService } from './services/sharedBusinessContextService';
import { memoryService } from './services/memoryService';
import { businessBrainVersionRepository } from './repositories/businessBrainVersionRepository';

describe('PHASE 2 — MASTER CENTRAL BUSINESS BRAIN SUITE', () => {
  const workspaceA = `ws_bb_phase2_test_a_${Date.now()}`;
  const workspaceB = `ws_bb_phase2_test_b_${Date.now()}`;

  // ---------------------------------------------------------------------------
  // 1. Business Profile Initialization & Versioning
  // ---------------------------------------------------------------------------
  it('1. Initializes business profile with default grounding facts and version 1', async () => {
    const profile = await businessBrainService.getProfile(workspaceA);
    assert.ok(profile);
    assert.equal(profile.workspaceId, workspaceA);
    assert.equal(profile.version, 1);
    assert.equal(profile.approvalStatus, 'DRAFT');
  });

  // ---------------------------------------------------------------------------
  // 2. Memory Update System & Conflict Prevention
  // ---------------------------------------------------------------------------
  it('2. Creates new ground truth attribute with USER_CONFIRMED provenance', async () => {
    const updateResult = await businessBrainService.processMemoryUpdate({
      workspaceId: workspaceA,
      fieldOrCategory: 'businessProfile',
      key: 'valueProposition',
      newValue: 'AI-powered Business Intelligence for high-growth SMEs in India.',
      sourceTitle: 'Founder Direct Onboarding Input',
      sourceType: 'USER_INPUT',
      provenance: 'USER_CONFIRMED',
      rationale: 'Founder stated core value proposition.',
      userId: 'user_founder_1',
    });

    assert.equal(updateResult.action, 'UPDATED_EXISTING');
    assert.equal(updateResult.version, 2);
    assert.equal(updateResult.conflictDetected, false);
    assert.equal(updateResult.currentValue, 'AI-powered Business Intelligence for high-growth SMEs in India.');

    // Verify profile reflects updated value and provenance
    const updated = await businessBrainService.getProfile(workspaceA);
    assert.equal(updated.valueProposition, 'AI-powered Business Intelligence for high-growth SMEs in India.');
    assert.equal(updated.provenance?.valueProposition?.source, 'USER_CONFIRMED');
  });

  it('3. Prevents silent overwrite when AI_INFERRED proposal conflicts with USER_CONFIRMED fact', async () => {
    // Attempt to propose conflicting valueProposition via AI
    const conflictResult = await businessBrainService.processMemoryUpdate({
      workspaceId: workspaceA,
      fieldOrCategory: 'businessProfile',
      key: 'valueProposition',
      newValue: 'Automated video social marketing tool.', // Conflicting & violates video directive
      sourceTitle: 'Web Scraper Inferred Hypothesis',
      sourceType: 'AI_SCRAPER',
      provenance: 'AI_INFERRED',
      rationale: 'AI found an old marketing page snippet.',
      confidence: 0.65,
    });

    assert.equal(conflictResult.action, 'FLAGGED_CONFLICT');
    assert.equal(conflictResult.conflictDetected, true);
    assert.match(conflictResult.conflictDetails!, /cannot silently override the user-confirmed fact/);
    
    // Crucial: The ground truth MUST remain the user-confirmed value!
    const profile = await businessBrainService.getProfile(workspaceA);
    assert.equal(profile.valueProposition, 'AI-powered Business Intelligence for high-growth SMEs in India.');
    assert.equal(profile.version, 2); // Version must NOT increment on rejected overwrite
  });

  it('4. Ignores identical duplicate updates without redundant version bumps', async () => {
    const duplicateResult = await businessBrainService.processMemoryUpdate({
      workspaceId: workspaceA,
      fieldOrCategory: 'businessProfile',
      key: 'valueProposition',
      newValue: 'AI-powered Business Intelligence for high-growth SMEs in India.',
      sourceTitle: 'Founder Input Repeat',
      provenance: 'USER_CONFIRMED',
    });

    assert.equal(duplicateResult.action, 'IGNORED_DUPLICATE');
    assert.equal(duplicateResult.version, 2);
  });

  it('5. Maintains historical snapshot versions in businessBrainVersionRepository', async () => {
    const versions = await businessBrainVersionRepository.listVersions(workspaceA);
    assert.ok(versions.length >= 1);
    assert.equal(versions[0].versionNumber, 2);
    assert.ok(versions[0].changeSummary.includes('Memory update'));
  });

  // ---------------------------------------------------------------------------
  // 3. Shared Context Assembly & Token Budgeting
  // ---------------------------------------------------------------------------
  it('6. Assembles unified business context within token budget with knowledge citations', async () => {
    const context = await sharedBusinessContextService.getBusinessContext({
      workspaceId: workspaceA,
      taskType: 'GROWTH',
      tokenBudget: 2500,
      bypassCache: true,
    });

    assert.ok(context);
    assert.equal(context.workspaceId, workspaceA);
    assert.equal(context.taskType, 'GROWTH');
    assert.ok(context.tokenCount <= context.tokenBudget);
    assert.ok(context.citations.length >= 1);
    assert.equal(context.freshness, 'FRESH');
  });

  it('7. Caches context and returns CACHED status within TTL window', async () => {
    const cachedContext = await sharedBusinessContextService.getBusinessContext({
      workspaceId: workspaceA,
      taskType: 'GROWTH',
      bypassCache: false,
    });

    assert.equal(cachedContext.freshness, 'CACHED');
  });

  // ---------------------------------------------------------------------------
  // 4. Memory Systems: Episodic & Strategic
  // ---------------------------------------------------------------------------
  it('8. Records episodic campaign learnings and supersedes strategic items', async () => {
    // Record Episodic Learning
    const episode = await memoryService.recordEpisode({
      workspaceId: workspaceA,
      department: 'GROWTH',
      activityType: 'CAMPAIGN_LAUNCH',
      title: 'LinkedIn InMail B2B Campaign',
      summary: 'Targeted 500 SaaS founders with ROI messaging.',
      learnings: ['Direct ROI calculator link yielded 3.8x higher response than generic demo invite.'],
      userAttribution: 'Growth Lead',
    });

    assert.ok(episode.episodeId.startsWith('ep_'));
    assert.equal(episode.learnings.length, 1);

    // Record Strategic Item
    const stratItem = await memoryService.recordStrategicItem({
      workspaceId: workspaceA,
      type: 'PRICING_STRATEGY',
      title: 'Initial Flat Pricing Tier',
      description: 'Flat ₹999/mo for all features.',
    });

    assert.equal(stratItem.status, 'active');

    // Supersede with usage-based strategy
    const superseded = await memoryService.supersedeStrategicItem(workspaceA, stratItem.itemId, {
      type: 'PRICING_STRATEGY',
      title: 'Two-Tier Credit Pricing Strategy',
      description: '₹499 Starter + ₹1,499 Growth Pro with credit consumption tiers.',
      rationale: 'Customer willingness-to-pay research favors tiered usage.',
    });

    assert.equal(superseded.oldItem.status, 'superseded');
    assert.equal(superseded.newItem.status, 'active');
  });

  // ---------------------------------------------------------------------------
  // 5. Multi-Tenant Isolation Gate
  // ---------------------------------------------------------------------------
  it('9. Enforces strict multi-tenant boundary between workspaces in Business Brain', async () => {
    const profileB = await businessBrainService.getProfile(workspaceB);
    assert.equal(profileB.workspaceId, workspaceB);
    assert.notEqual(profileB.valueProposition, 'AI-powered Business Intelligence for high-growth SMEs in India.');
  });
});
