/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { aiQualityEvaluationEngine } from './ai/aiQualityEvaluationEngine';

describe('PHASE 7: AI QUALITY & EVALUATION PIPELINE SUITE', () => {
  const wsId = `ws_ai_eval_${Date.now()}`;

  const sampleContext = {
    businessName: 'Solstice Craft Coffee Roasters',
    location: 'Bangalore, India',
    valueProposition: 'Direct-trade estate Arabica roasted fresh within 48 hours of dispatch.',
    productsAndServices: [
      { name: 'Monsoon Malabar Single Estate Blend (250g)', price: 450 },
      { name: '3-Roast Discovery Flight (3x100g)', price: 850 },
    ],
    brandIdentity: {
      brandName: 'Solstice Coffee Roasters',
      wordsToUse: ['Single-Estate', 'Farm-to-Cup', 'Roast-to-Order'],
      wordsToAvoid: ['Instant', 'Commercial Grade', 'Cheap'],
      approvedClaims: ['100% Single-Estate Arabica', 'Roasted within 48 hours of shipping'],
      restrictedClaims: ['Certified organic without estate documentation'],
    },
    marketingRestrictions: ['Never claim certified organic without estate certificates'],
    explicitExclusions: ['Never sell instant coffee', 'Never offer 50% discount clearances'],
  };

  it('1. Evaluates high-quality grounded AI generation across all 6 dimensions with EXCELLENT rating', () => {
    const userPrompt = 'Generate a consultative outreach email to high-intent home brewers.';
    const highQualityOutput = `
      Subject: Freshly roasted Single-Estate Arabica delivered to your door

      Hi Coffee Lover,

      Tired of stale supermarket beans with no roast dates? At Solstice Craft Coffee Roasters, every batch of our 100% Single-Estate Arabica is Roasted within 48 hours of shipping.

      Try our Monsoon Malabar Single Estate Blend (250g) at ₹450 or our 3-Roast Discovery Flight at ₹850.

      Next Steps:
      - Sprint 1: Place your order for batch roasting this Thursday.
      - Expected Impact: Elevate your daily extraction ritual immediately.
    `;

    const report = aiQualityEvaluationEngine.evaluateAiOutput({
      workspaceId: wsId,
      userPrompt,
      aiOutput: highQualityOutput,
      context: sampleContext,
      latencyMs: 720,
    });

    assert.equal(report.workspaceId, wsId);
    assert.ok(report.compositeScore >= 85, `Expected score >= 85, got ${report.compositeScore}`);
    assert.ok(['EXCELLENT', 'ACCEPTABLE'].includes(report.qualityGateStatus));
    assert.equal(report.isProductionReady, true);
    assert.equal(report.criticalViolations.length, 0);

    // Verify all 6 dimensions
    assert.ok(report.metrics.groundedness.passed);
    assert.ok(report.metrics.complianceGuardrails.passed);
    assert.ok(report.metrics.relevance.passed);
    assert.ok(report.metrics.brandVoiceAdherence.passed);
    assert.ok(report.metrics.completeness.passed);
    assert.ok(report.metrics.latencyEfficiency.passed);
  });

  it('2. Enforces Strict Video Exclusion: rejects output proposing video reels or video pipelines', () => {
    const prompt = 'Create a promotional plan for our coffee brand.';
    const videoOutput = `
      Here is your marketing campaign:
      We will produce a 30-second TikTok video reel featuring an animated espresso extraction using FFmpeg video generation scripts and YouTube Shorts.
    `;

    const report = aiQualityEvaluationEngine.evaluateAiOutput({
      workspaceId: wsId,
      userPrompt: prompt,
      aiOutput: videoOutput,
      context: sampleContext,
    });

    assert.equal(report.qualityGateStatus, 'REJECTED');
    assert.equal(report.isProductionReady, false);
    assert.ok(report.criticalViolations.some((v) => v.toLowerCase().includes('video')));
    assert.equal(report.metrics.complianceGuardrails.passed, false);
  });

  it('3. Enforces TruthCheck: flags unverified macro market statistics and unauthorized pricing', () => {
    const prompt = 'Pitch our business to investors.';
    const hallucinatoryOutput = `
      Solstice Coffee Roasters captures a $50 billion market opportunity in Bangalore by offering cheap coffee for ₹99.
    `;

    const report = aiQualityEvaluationEngine.evaluateAiOutput({
      workspaceId: wsId,
      userPrompt: prompt,
      aiOutput: hallucinatoryOutput,
      context: sampleContext,
    });

    assert.equal(report.qualityGateStatus, 'REJECTED');
    assert.equal(report.isProductionReady, false);
    assert.ok(report.metrics.groundedness.passed === false);
    assert.ok(report.criticalViolations.length > 0);
  });

  it('4. Enforces Brand Voice Adherence: penalizes usage of forbidden words (wordsToAvoid)', () => {
    const prompt = 'Write a description for our product.';
    const forbiddenWordOutput = `
      We offer cheap coffee that beats any commercial grade supermarket instant coffee on price.
    `;

    const report = aiQualityEvaluationEngine.evaluateAiOutput({
      workspaceId: wsId,
      userPrompt: prompt,
      aiOutput: forbiddenWordOutput,
      context: sampleContext,
    });

    assert.ok(report.metrics.brandVoiceAdherence.score < 60);
    assert.equal(report.metrics.brandVoiceAdherence.passed, false);
    assert.ok(
      report.metrics.brandVoiceAdherence.violations!.some(
        (v) => v.toLowerCase().includes('cheap') || v.toLowerCase().includes('commercial grade')
      )
    );
  });

  it('5. Executes full automated regression suite across golden and adversarial test cases', () => {
    const suiteResult = aiQualityEvaluationEngine.runRegressionSuite(wsId, (tc) => {
      if (tc.category === 'ADVERSARIAL_VIDEO') {
        // Correct behavior: Agent blocks video and recommends static carousel instead
        return {
          output: 'BrainWise adheres to Strict Video Exclusion. We recommend a 5-frame static carousel detailing harvest elevation and roast dates.',
          latencyMs: 650,
        };
      }

      if (tc.category === 'DISCOUNT_VIOLATION') {
        return {
          output: 'Founder exclusions prohibit 50% discount clearances. We instead offer an introductory Discovery Tasting Flight at ₹850 to protect brand positioning.',
          latencyMs: 700,
        };
      }

      return {
        output: '3-step consultative outreach sequence: Step 1 (Day 1) Email introducing single-estate Arabica roasted within 48 hours of dispatch at ₹450 per bag. Step 2 (Day 4) Follow-up sharing brewing guides. Step 3 (Day 7) 100g sample flight invitation.',
        latencyMs: 800,
      };
    });

    assert.equal(suiteResult.totalTests, 4);
    assert.ok(suiteResult.passedTests >= 3);
    assert.ok(suiteResult.averageScore >= 80);
    assert.equal(suiteResult.passedQualityGate, true);
  });
});
