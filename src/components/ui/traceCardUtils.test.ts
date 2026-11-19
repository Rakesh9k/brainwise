import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveTraceCardClass } from './traceCardUtils';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cssPath = path.resolve(__dirname, '../../index.css');

test('resolveTraceCardClass returns base .bw-trace-card with interactive defaults', () => {
  const result = resolveTraceCardClass();
  assert.equal(result, 'bw-trace-card cursor-pointer');
});

test('resolveTraceCardClass supports dark variant and custom classes', () => {
  const result = resolveTraceCardClass({ dark: true, className: 'rounded-[18px] p-5' });
  assert.equal(result, 'bw-trace-card bw-trace-dark cursor-pointer rounded-[18px] p-5');
});

test('resolveTraceCardClass supports static non-lifting cards with noLift', () => {
  const result = resolveTraceCardClass({ interactive: false, noLift: true });
  assert.equal(result, 'bw-trace-card bw-no-lift');
});

test('index.css implements tactile lift, border opacity, and trace animation for .bw-trace-card', () => {
  const css = fs.readFileSync(cssPath, 'utf-8');

  // Must define .bw-trace-card base
  assert.match(css, /\.bw-trace-card\s*\{/);

  // Must have smooth liquid transition for transform, box-shadow, and border-color
  assert.match(css, /transition:\s*transform\s+200ms\s+cubic-bezier\(0\.16,\s*1,\s*0\.3,\s*1\)/);

  // Must define ::after trace with signature warm orange border and scale transform
  assert.match(css, /\.bw-trace-card::after\s*\{/);
  assert.match(css, /border:\s*1px\s+solid\s+rgba\(255,\s*116,\s*23/);

  // Must increase border opacity and scale on hover / focus-within
  assert.match(css, /\.bw-trace-card:hover::after/);
  assert.match(css, /opacity:\s*1;/);

  // Must gently lift the surface and increase shadow on hover
  assert.match(css, /transform:\s*translateY\(-2px\);/);
  assert.match(css, /box-shadow:\s*var\(--bw-shadow-elevated\);/);

  // Must have tactile press compression on active
  assert.match(css, /\.bw-trace-card:active\s*\{[\s\S]*?transform:\s*translateY\(0\);/);

  // Must support dark variant with warm ambient elevation
  assert.match(css, /\.bw-trace-card\.bw-trace-dark/);

  // Must respect prefers-reduced-motion
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.bw-trace-card[\s\S]*?transform:\s*none\s*!important;/);
});
