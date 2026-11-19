/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { executeTruthCheck, extractNumericPrices } from './truthCheck';
import { INITIAL_BRAINWISE_STATE } from '../data/mockData';

test('extractNumericPrices properly extracts prices from strings', () => {
  const prices = extractNumericPrices('Our tier is $18 – $26 / month or ₹1499');
  assert.deepEqual(prices, [18, 26, 1499]);
});

test('executeTruthCheck passes on factual copy grounded in brain', () => {
  const brain = INITIAL_BRAINWISE_STATE.brain;
  const verifiedCopy =
    'Experience Solstice Craft Coffee with our Roast-to-Order Origin Subscription for $18 – $26 / month, delivered fresh to your door.';

  const result = executeTruthCheck(verifiedCopy, brain);
  assert.equal(result.isValid, true);
  assert.equal(result.truthScore, 100);
  assert.equal(result.violations.length, 0);
  assert.equal(result.status, 'VERIFIED');
});

test('executeTruthCheck catches price hallucination and applies remediation', () => {
  const brain = INITIAL_BRAINWISE_STATE.brain;
  // Product pricing in mock data is $18 - $26 / month, but copy says $5
  const hallucinatedCopy =
    'Get premium specialty coffee delivered to your home for just $5 today!';

  const result = executeTruthCheck(hallucinatedCopy, brain);
  assert.equal(result.violations.some((v) => v.type === 'PRICE_HALLUCINATION'), true);
  assert.ok(result.remediatedContent);
  assert.match(result.remediatedContent, /\$18/);
});

test('executeTruthCheck catches explicit exclusion breaches and triggers safeguard', () => {
  const brain = INITIAL_BRAINWISE_STATE.brain;
  // Exclusions in mock data: 'Never state 100% organic without official estate certification'
  const violatingCopy =
    'Try our 100% organic beans with a guaranteed 10x ROI on your daily productivity!';

  const result = executeTruthCheck(violatingCopy, brain);
  assert.equal(result.violations.some((v) => v.type === 'EXCLUSION_BREACH'), true);
  assert.equal(result.violations.some((v) => v.type === 'FABRICATED_CLAIM'), true);
  assert.equal(result.refundTriggered, true);
  assert.equal(result.status, 'REJECTED');
  assert.ok(result.refundReason?.includes('Credit safeguard triggered'));
});
