import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateLedgerPosition,
  formatCardDataAsJson,
  formatCardDataAsCsv,
  generateExecutiveBriefingPdfHtml,
  generateExecutiveSlideDeckHtml,
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

test('generateExecutiveBriefingPdfHtml produces print-ready executive memo with branding', () => {
  const html = generateExecutiveBriefingPdfHtml(
    'Performance & Execution Pulse',
    'Live sprint velocity',
    {
      completionRate: 100,
      timeframe: '30d',
      series: [
        { label: 'W1', value: 0, detail: 'Baseline' },
        { label: 'Now', value: 100, detail: '1/1 tasks complete' },
      ],
    },
    'Chocolatier Studio'
  );
  assert.ok(html.includes('Chocolatier Studio'));
  assert.ok(html.includes('Performance & Execution Pulse'));
  assert.ok(html.includes('Sprint Velocity'));
  assert.ok(html.includes('100%'));
  assert.ok(html.includes('@media print'));
  assert.ok(html.includes('Save as PDF / Print'));
});

test('generateExecutiveSlideDeckHtml produces 16:9 presentation deck with controls', () => {
  const deck = generateExecutiveSlideDeckHtml(
    'Performance & Execution Pulse',
    'Executive Review',
    {
      completionRate: 100,
      series: [{ label: 'W1', value: 0 }, { label: 'Now', value: 100 }],
    },
    'Chocolatier Studio'
  );
  assert.ok(deck.includes('Chocolatier Studio'));
  assert.ok(deck.includes('aspect-ratio: 16 / 9'));
  assert.ok(deck.includes('slide-1'));
  assert.ok(deck.includes('slide-4'));
  assert.ok(deck.includes('toggleFullscreen'));
  assert.ok(deck.includes('Export PDF Deck'));
});

