/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getClientConfig, validateServerConfig } from './env';

test('getClientConfig returns default values safely without window', () => {
  const config = getClientConfig();
  assert.ok(config);
  assert.equal(typeof config.appUrl, 'string');
  assert.equal(typeof config.isProduction, 'boolean');
  assert.equal(typeof config.isDevelopment, 'boolean');
});

test('validateServerConfig returns server config in Node runtime', () => {
  const config = validateServerConfig();
  assert.ok(config);
  assert.equal(typeof config.port, 'number');
  assert.ok('geminiApiKey' in config);
});
