import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateLedgerPosition,
  formatCardDataAsJson,
  formatCardDataAsCsv,
  buildContextualLedgerAriaProps,
} from './contextualLedgerUtils';

test('calculateLedgerPosition clamps within viewport when clicked near top-left', () => {
  const pos = calculateLedgerPosition(5, 5, 280, 300, 1000, 800, 12);
  assert.equal(pos.x, 12);
  assert.equal(pos.y, 12);
});

test('calculateLedgerPosition flips inward when clicked near bottom-right edge', () => {
  const pos = calculateLedgerPosition(950, 750, 280, 300, 1000, 800, 12);
  // Should flip to the left and up from cursor
  assert.ok(pos.x <= 1000 - 280 - 12);
  assert.ok(pos.y <= 800 - 300 - 12);
  assert.ok(pos.x >= 12);
  assert.ok(pos.y >= 12);
});

test('calculateLedgerPosition keeps exact coordinates when ample space is available', () => {
  const pos = calculateLedgerPosition(300, 200, 280, 300, 1000, 800, 12);
  assert.equal(pos.x, 300);
  assert.equal(pos.y, 200);
});

test('formatCardDataAsJson serializes metadata, engine version, and payload', () => {
  const jsonStr = formatCardDataAsJson('Performance Pulse', { metric: 42 });
  const parsed = JSON.parse(jsonStr);
  assert.equal(parsed.widgetTitle, 'Performance Pulse');
  assert.equal(parsed._engine, 'BrainWise Command Platform');
  assert.equal(parsed.data.metric, 42);
  assert.ok(parsed.exportedAt);
});

test('formatCardDataAsCsv formats array of objects into RFC-compliant CSV rows', () => {
  const items = [
    { label: 'W1', value: 12 },
    { label: 'W2', value: 16 },
  ];
  const csv = formatCardDataAsCsv('Growth Curve', items);
  const lines = csv.split('\n');
  assert.equal(lines[0], 'label,value');
  assert.equal(lines[1], '"W1","12"');
  assert.equal(lines[2], '"W2","16"');
});

test('formatCardDataAsCsv handles key-value object correctly', () => {
  const obj = { title: 'Dossier A', count: 5 };
  const csv = formatCardDataAsCsv('Summary', obj);
  assert.match(csv, /"title","Dossier A"/);
  assert.match(csv, /"count","5"/);
});

test('buildContextualLedgerAriaProps sets role=menu and accessible title label', () => {
  const aria = buildContextualLedgerAriaProps('Today’s Priorities');
  assert.equal(aria.role, 'menu');
  assert.equal(aria['aria-orientation'], 'vertical');
  assert.equal(aria['aria-label'], 'Contextual actions for Today’s Priorities');
});
