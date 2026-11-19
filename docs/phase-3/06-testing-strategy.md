# BRAINWISE — PHASE 3: TESTING STRATEGY & TEST HARNESS

**Document ID:** `BW-PHASE3-06`  
**Date:** November 19, 2026  
**Status:** Approved Standard  
**Author:** QA Automation Engineer & Senior Architect  

---

## 1. Testing Philosophy & Test Pyramid

BrainWise employs a pragmatic, risk-weighted testing strategy. Rather than writing brittle tests that assert ephemeral implementation details, the test harness focuses on:
1. **Core Business & Truth Rules:** Mathematical market calculations, pricing extraction, Truth Check guardrails, anti-fatigue memory.
2. **Design System & Modular Token Invariants:** Exact 1.25 typography ratio preservation, monotonic radii, dialog accessibility props.
3. **API & Boundary Contracts:** Typed request/response mapping, error status mapping, and authentication header attachment.
4. **End-to-End Responsive Invariants:** Viewport responsiveness, absence of horizontal page overflow, and zero uncaught console exceptions across 7 screen sizes.

```
            ▲
           / \     Playwright E2E Multi-Viewport (tests/e2e-audit.ts)
          /   \    7 Viewports: 375px to 1920px, Screenshot Audit
         /-----\
        /       \  Integration & Service Tests (src/services/apiClient.test.ts)
       /         \ Typed contracts, Auth token attachment, Timeout handling
      /-----------\
     /             \ Unit Tests (src/**/*.test.ts) — 79 Automated Tests
    /               \ TruthCheck, StrategicMemory, Logic, Tokens, Typography
   /─────────────────\
```

---

## 2. Unit Testing Harness (`node:test` + `tsx`)

### 2.1 Test Runner Justification
BrainWise utilizes the high-performance **Node.js native test runner (`node:test`)** executed through `tsx` (`npx tsx --test src/**/*.test.ts`).
- **Zero Config Overhead:** Native to Node.js 22 LTS with zero compilation lag or memory bloat.
- **Speed:** All 79 unit tests execute in **< 300 milliseconds**.
- **Standard Assertions:** Uses `node:assert/strict` for strict value equality, regex matching, and deep comparison.

### 2.2 Active Test Suite Inventory (79 Passing Tests)

| Test Suite Path | Test Count | Key Invariants Tested |
| :--- | :---: | :--- |
| `src/utils/truthCheck.test.ts` | 4 | Price regex extraction, grounding in Brain, hallucination remediation, exclusion rule credit safeguards. |
| `src/utils/strategicMemory.test.ts` | 3 | Fatigue threshold calculation, anti-fatigue prompt compilation, angle usage registration. |
| `src/utils/logic.test.ts` | 18 | TAM/SAM/SOM market sizing, search filtering, workflow steps, SVG sanitization, local asset generators. |
| `src/services/apiClient.test.ts` | 3 | Default options initialization, `ApiError` code/status mapping, Bearer token header attachment. |
| `src/config/env.test.ts` | 2 | Client config fallbacks, server config validation in Node runtime. |
| `src/design/tokens.test.ts` | 6 | Spacing scale (4px to 80px), monotonic radii, layout limits, focus ring variable generation. |
| `src/theme/typography.test.ts` | 4 | Exact 1.25 modular scale step progression, semantic token mapping, CSS variable generation. |
| `src/components/ui/dialogUtils.test.ts` | 4 | Width scales, centered vs command-top placement, ARIA labeling, scroll lock counter. |
| `src/components/ui/emptyStateUtils.test.ts` | 4 | Preset variants, overline resolution, size class scaling, surface tone styling. |
| `src/components/ui/growthTrendUtils.test.ts` | 8 | Metric formatting (currency/percent), delta computing, tick values, 7d/30d/90d/YTD ranges, curve modes. |
| `src/components/ui/premiumSkeletonUtils.test.ts` | 4 | Modular line metrics, 16px modular spacing, wave shimmer classes, editorial width staggering. |
| `src/components/ui/skeletonUtils.test.ts` | 4 | Wave classes, radius resolution, unit normalization, staggered width derivation. |
| `src/components/ui/topoGridUtils.test.ts` | 3 | Tone classes, className generation, style generation with opacity and mask. |
| `src/components/ui/traceCardUtils.test.ts` | 4 | Tactile lift classes, dark variant support, noLift option, CSS trace animation class verification. |
| `src/components/ui/contextualLedgerUtils.test.ts` | 8 | Viewport edge clamping, JSON/CSV formatting, ARIA menu role attributes. |

---

## 3. End-to-End Responsive Audit (`tests/e2e-audit.ts`)

### 3.1 Playwright Multi-Device Matrix
The automated E2E script executes Playwright across 7 canonical viewports:
1. **Desktop Large (1920×1080):** High-resolution agency displays.
2. **Desktop Standard (1440×900):** MacBook Pro / 14-inch standard.
3. **Laptop (1366×768):** Common Windows laptop resolution.
4. **Tablet Landscape (1024×768):** iPad Air landscape orientation.
5. **Tablet Portrait (768×1024):** iPad standard portrait.
6. **Mobile Standard (390×844):** iPhone 14/15/16 baseline.
7. **Mobile Compact (375×812):** iPhone SE / smaller mobile screens.

### 3.2 Automated Invariant Checks in E2E
- **Zero Horizontal Overflow:** `scrollWidth <= clientWidth + 1px` across every page and viewport.
- **Zero Console Errors:** Asserts that `console.error` is not invoked during page rendering or department navigation.
- **Screenshot Archival:** Captures full-page screenshots to `docs/design-freeze/screenshots/` for visual regression comparison.

---

## 4. Test Execution Commands

```bash
# Execute complete unit test suite
npm test

# Run tests in interactive watch mode during development
npm run test:watch

# Execute Playwright E2E audit across all 7 viewports
npm run test:e2e

# Execute master quality gate (Typecheck + Lint + Format + Unit Tests + Build)
npm run validate
```
