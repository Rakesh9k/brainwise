# BRAINWISE — MASTER TESTING STRATEGY & VERIFICATION MATRIX
## Comprehensive Automated Verification Across All 10 Transformation Phases
### Master Technical Document 09

---

## 1. Testing Philosophy & Verification Pyramid

BrainWise employs an automated, deterministic test strategy. Machine learning and LLM outputs are never tested with arbitrary string matching or non-deterministic mocks; instead, all mathematical models, guardrails, security boundaries, and multi-tenant isolation constraints are verified using concrete assertion suites executed via Node.js native test runner (`node:test`).

```
              / \
             /   \
            / E2E \       --> Browser persona journeys & concurrency stress tests
           /-------\
          /  Integ  \     --> Phase 1-9 Service suites (Evidence, Brain, Depts 1-7)
         /-----------\
        /  Unit Math  \   --> Deterministic ICE scoring, TAM/SAM/SOM, Unit Economics
       /---------------\
      / Security & OWASP\ --> SSRF validation, Truth Check, Anti-Fatigue, Multi-Tenant
     /-------------------\
```

---

## 2. Automated Test Suite Directory & Mapping

| Suite File | Scope & Capabilities Verified | Passing Tests |
|---|---|---|
| `phase1EvidenceEngine.test.ts` | 4-tier source classification (`VERIFIED`, `CORROBORATED`, `ESTIMATED`, `UNVERIFIED`), numerical & geographic contradiction engine, Knowledge Graph edges, multi-tenant boundaries. | 8 / 8 |
| `phase2BusinessBrainMemory.test.ts` | Founder Primacy Rule (AI cannot overwrite ground truth), duplicate suppression, immutable version snapshots, episodic memory, token budgeting. | 9 / 9 |
| `phase3IdeaMarketIntelligence.test.ts` | 7-score linear composite, GO/CAUTION/NO_GO verdict, dual top-down & bottom-up TAM/SAM/SOM sizing, India MSME Section 44AD & UPI dynamics. | 5 / 5 |
| `phase4CompetitiveIntelligence.test.ts` | 14-dimension profiles, 2D Euclidean whitespace matrix, Competitor Watch delta detection, SSRF defense on competitor URLs. | 6 / 6 |
| `phase5FinancialIntelligence.test.ts` | Unit economics (LTV, CAC, LTV:CAC, breakeven, payback), Strategy Simulator comparing decisions (₹499 vs ₹799), 3-tier sensitivity bands, CapEx/OpEx startup costs, RFC CSV export. | 5 / 5 |
| `phase6BrandStudio.test.ts` | Whitespace-aligned brand positioning, 1.25 modular typography ladder ($16 \times 1.25^n$), anti-fatigue memory, pure sanitized SVG collateral, strict zero video. | 6 / 6 |
| `phase7GrowthDirector.test.ts` | Anti-vague execution task generator, deterministic ICE scores ($I \times C \times E$), multi-horizon roadmaps (7/30/90 days), closed-loop outcome learning. | 7 / 7 |
| `phase8BusinessWatch.test.ts` | 24/7 operational surveillance cycle, strict 6-factor actionable alert structure, weekly business digest, alert resolution lifecycle. | 6 / 6 |
| `phase9UnifiedReport.test.ts` | 7-section interconnected executive dossier, calculation transparency cards, primary statutory citations, print HTML and CSV exports. | 6 / 6 |
| `phase10ProductionReadiness.test.ts` | End-to-end production readiness, OWASP SSRF defense, DPDPA 2023 data residency, secret isolation, strict video exclusion regression sweep. | 8 / 8 |

---

## 3. Core Guardrail Verification Protocols

### 3.1 Strict Video Exclusion Audit
- **Rule**: Zero AI video generation, video editing, Remotion scripts, FFmpeg pipelines, or video credits.
- **Verification**: In every phase test suite, outputs are serialized and scanned for forbidden strings (`video`, `remotion`, `ffmpeg`, `.mp4`). Collateral types must strictly be `SVG`, `CAROUSEL`, or `COLLATERAL`.

### 3.2 The Truth Check Protocol (`truthCheck.test.ts`)
- **Rule**: LLM outputs must never hallucinate prices or make ungrounded promises.
- **Verification**: Tests inject hallucinated prices (e.g. claiming $99 when ground truth is ₹499) and assert `executeTruthCheck` throws `TruthViolationError` with category `PRICE_HALLUCINATION`.

### 3.3 SSRF Defense Protocol (`ssrfValidator.ts`)
- **Rule**: Crawlers must reject loopback, internal IPs, and cloud metadata.
- **Verification**: Tests execute `validateSafeExternalUrl` against `http://127.0.0.1`, `http://169.254.169.254/latest/meta-data`, and private subnets (`10.0.0.1`), asserting rejection with `isSafe: false`.

### 3.4 Multi-Tenant Boundary Verification
- **Rule**: Workspaces cannot access or modify resources belonging to other workspaces.
- **Verification**: In every suite, an entity created under `workspaceA` is queried or updated using `workspaceB`, asserting that operations return `null` or reject with `not found`.
