/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateFatiguedThemes,
  buildAntiFatiguePromptDirectives,
  recordStrategicAngle,
  FATIGUE_THRESHOLD,
} from './strategicMemory';
import type { StrategicMemory, StrategicAngleRecord } from '../types/brainwise';

test('calculateFatiguedThemes identifies themes meeting or exceeding fatigue threshold', () => {
  const angles: StrategicAngleRecord[] = [
    {
      id: '1',
      angle: 'Freshly roasted within 48 hours',
      theme: 'Freshness',
      usedIn: 'BrandStudio',
      lastUsedAt: '2026-11-10',
      frequency: 2,
    },
    {
      id: '2',
      angle: '48-hour roast guarantee dispatch',
      theme: 'Freshness',
      usedIn: 'Campaign',
      lastUsedAt: '2026-11-12',
      frequency: 1,
    },
    {
      id: '3',
      angle: 'Artisan ceramic mug pairing',
      theme: 'Merchandise',
      usedIn: 'BrandStudio',
      lastUsedAt: '2026-11-11',
      frequency: 1,
    },
  ];

  const fatigued = calculateFatiguedThemes(angles);
  assert.equal(fatigued.length, 1);
  assert.equal(fatigued[0], 'Freshness');
});

test('buildAntiFatiguePromptDirectives compiles warnings and restrictions', () => {
  const memory: StrategicMemory = {
    usedAngles: [
      {
        id: '1',
        angle: 'Farm to cup direct relationship',
        theme: 'Traceability',
        usedIn: 'BrandStudio',
        lastUsedAt: '2026-11-15',
        frequency: 2,
      },
    ],
    fatiguedThemes: ['Traceability'],
    explicitExclusions: ['Do not claim 100% organic', 'Never mention clearance discounts'],
    lastUpdated: '2026-11-16',
  };

  const directives = buildAntiFatiguePromptDirectives(memory);
  assert.match(directives, /ANTI-FATIGUE WARNING/);
  assert.match(directives, /"Traceability"/);
  assert.match(directives, /FOUNDER-PROHIBITED CLAIMS/);
  assert.match(directives, /Do not claim 100% organic/);
});

test('recordStrategicAngle updates existing angle frequency and flags fatigue', () => {
  let memory: StrategicMemory = {
    usedAngles: [],
    fatiguedThemes: [],
    explicitExclusions: [],
    lastUpdated: '2026-11-10',
  };

  // Add 1
  memory = recordStrategicAngle(memory, 'Brew like a barista', 'Education', 'BrandStudio');
  assert.equal(memory.usedAngles.length, 1);
  assert.equal(memory.usedAngles[0]!.frequency, 1);
  assert.equal(memory.fatiguedThemes.length, 0);

  // Add 2
  memory = recordStrategicAngle(memory, 'Brew like a barista', 'Education', 'BrandStudio');
  assert.equal(memory.usedAngles[0]!.frequency, 2);

  // Add 3 -> hits FATIGUE_THRESHOLD (3)
  memory = recordStrategicAngle(memory, 'Brew like a barista', 'Education', 'BrandStudio');
  assert.equal(memory.usedAngles[0]!.frequency, 3);
  assert.deepEqual(memory.fatiguedThemes, ['Education']);
});
