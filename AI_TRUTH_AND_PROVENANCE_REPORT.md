# BRAINWISE — AI TRUTH, RESEARCH QUALITY & PROVENANCE INTEGRITY REPORT (PHASE 04)

> **Document Status:** Complete & Verified  
> **Phase:** 04 — AI Truth, Research Quality & Provenance Integrity  
> **Target Workspace:** `d:\brainwise pro\brainwise (1)`  
> **Authors:** Principal AI Architect, Staff Research Engineer, Data Integrity Specialist  
> **Date:** November 23, 2026  

---

## Executive Summary

Phase 04 has established absolute data provenance, honest capability reporting, and transparent confidence scoring across the BrainWise AI intelligence stack. All historical synthetic fallback paths—such as fixed US Census Bureau / Statista data injected into Indian consumer products, synthetic competitor websites (`example-incumbent.com`), default 5% market shares, arbitrary `1.0` confidence scores, and ungrounded `verified_live` labels—have been completely excised.

BrainWise now enforces a strict 7-tier Evidence Classification Taxonomy, honest degradation states when external search providers are unconfigured (`PROVIDER_UNAVAILABLE`), explicit separation of AI hypotheses from empirical citations, and a hardened Truth Check engine that stops ungrounded marketing claims and refunds reserved credits automatically.

---

## 1. Audit & Remediation of Historical Synthetic Data Patterns

| Module / Component | Previous Synthetic Pattern | Remediated Production Behavior |
| :--- | :--- | :--- |
| **Research Engine (`researchEngine.ts`)** | `generateDeterministicSources` returned fixed Statista / US Census Bureau URLs (`census.gov/economic-indicators`) with hardcoded 12–16% CAGR and labeled them `SUPPORTED`, even for Indian food and beverage brands (e.g., Solstice Craft Coffee). | **Honest `PROVIDER_UNAVAILABLE` State**: When search providers (Tavily) are unconfigured or fail, zero fake sources are returned. The system issues an explicit capability degradation notice (`missingCapability: 'EXTERNAL_WEB_SEARCH'`) and generates separated, explicitly tagged AI hypotheses (`isHypothesis: true`, `evidenceClassification: 'INFERRED'`). |
| **Competitor Discovery Engine (`competitorDiscoveryEngine.ts`)** | General fallback generated synthetic competitors (`${context.category} Market Leader` at `https://example-incumbent.com` and `https://example-challenger.com`) with arbitrary `0.90` confidence. | **Zero Synthetic Domains**: Curated domain knowledge graphs are searched first. If unmapped and live AI search is unconfigured, the engine returns an honest empty list `[]` without inventing URLs or fake competitor personas. |
| **Competitor Routes (`competitorRoutes.ts`)** | Defaulted `marketShare: marketShare \|\| '5%'` when unspecified by the user or crawler. | **Authentic Metric Ingestion**: `marketShare` preserves provided values or assigns `'UNKNOWN'`. Default 5% fabrication eliminated. |
| **Idea Intelligence Dossier (`ideaIntelligenceService.ts`)** | `marketOverview` hardcoded `factType: 'verified'` and static NielsenIQ / FSSAI citations even without live research retrieval. | **Dynamic Truth Verification**: If external search is unconfigured, factType is labeled `'estimated'`, sources are marked `'AI Strategic Hypothesis'`, and emerging players are tagged `'UNVERIFIED'`. |
| **Truth Check Engine (`truthCheck.ts`)** | Only checked price hallucinations and explicit exclusion strings; lacked detection for superlatives, fake ratings, or competitor disparagement. | **7-Layer Guardrail**: Added detection for unsubstantiated superlatives (`SUPERLATIVE_UNVERIFIED`), fabricated customer reviews (`FABRICATED_TESTIMONIAL`), competitor disparagement (`UNSUPPORTED_COMPETITOR_CLAIM`), and uncited macro stats (`UNCITED_STATISTIC`). |
| **Confidence Scoring (`truthCheck.ts`)** | Arbitrary `confidence: 1.0` or fixed 90% applied indiscriminately. | **Explainable Multi-Factor Scoring**: Numeric score omitted (`null`) when evidence is unavailable/unverified. Calculated scores are clamped to max 0.95 (never 1.0) based on Quality (35%), Corroboration (25%), Freshness (25%), and Geographic Alignment (15%). |

---

## 2. Master Evidence Classification Taxonomy

BrainWise establishes seven canonical evidence classifications across all domain repositories, AI pipelines, and frontend displays (`src/server/types/evidence.ts` and `src/types/brainwise.ts`):

```
                                  EVIDENCE CLASSIFICATIONS
                                              │
              ┌───────────────────────────────┴───────────────────────────────┐
              ▼                                                               ▼
        EMPIRICAL EVIDENCE                                             REASONING & ESTIMATION
    ┌───────────────────────┐                                      ┌────────────────────────┐
    │ 1. VERIFIED           │ Supported by authoritative source    │ 4. INFERRED            │ Deductive AI reasoning
    │ 2. OBSERVED           │ Single-source real observation       │ 5. ESTIMATED           │ Disclosed model estimate
    │ 3. USER_PROVIDED      │ Confirmed by business founder        │ 6. UNVERIFIED          │ Unsubstantiated assertion
    └───────────────────────┘                                      │ 7. UNAVAILABLE         │ Evidence absent/offline
                                                                   └────────────────────────┘
```

### Classification Specifications

1. **`VERIFIED`**:
   - *Definition:* Directly corroborated by an authoritative, accessible external source (e.g. government registry, statutory filing, audited industry census) or confirmed by the business owner in the persistent Business Brain.
   - *Confidence Score:* 0.85 – 0.95.
2. **`OBSERVED`**:
   - *Definition:* Retrieved from a single real external source (e.g. competitor website, news publication, marketplace listing) but not cross-validated across multiple independent domains.
   - *Confidence Score:* 0.65 – 0.84.
3. **`USER_PROVIDED`**:
   - *Definition:* Explicitly supplied by the authenticated business owner via Business Brain onboarding, document extraction verification, or manual form entry.
   - *Confidence Score:* 0.90 – 0.95 (Authoritative inside tenant boundary).
4. **`INFERRED`**:
   - *Definition:* Deductively synthesized by LLM reasoning from verified or observed facts. Must be explicitly tagged with `isHypothesis: true`.
   - *Confidence Score:* 0.40 – 0.70.
5. **`ESTIMATED`**:
   - *Definition:* Calculated using a transparent, disclosed quantitative model (e.g. TAM/SAM/SOM formulas based on population and category penetration).
   - *Confidence Score:* 0.50 – 0.75.
6. **`UNVERIFIED`**:
   - *Definition:* A claim or data point that has not been corroborated by external evidence or user confirmation.
   - *Confidence Score:* `null` (Omitted to avoid false precision).
7. **`UNAVAILABLE`**:
   - *Definition:* The required primary evidence could not be retrieved due to provider outage, missing API keys, or network disconnect.
   - *Confidence Score:* `null` (Omitted).

---

## 3. Grounded Provenance Architecture

Every externally retrieved claim or research data point persists with a complete provenance trace (`ProvenanceRecord`):

```typescript
export interface ProvenanceRecord {
  sourceName: string;
  sourceUrl?: string;
  sourceIdentifier?: string;
  retrievedAt: string;
  sourceDate?: string;
  workspaceId: string;
  evidenceType: EvidenceClassification;
  verificationStatus: 'SUPPORTED' | 'CONTRADICTED' | 'UNSUPPORTED' | 'STALE' | 'PENDING';
  confidenceMethodology?: string;
  confidenceScore?: number; // 0.0 - 0.95; omitted when unverified
  supportingExcerpt?: string;
}
```

### Anti-Hallucination Guardrails
- **Geographic Scope Binding:** External evidence retrieved for an inquiry must match or encompass the user's business geography (`geographicScope`). If an inquiry targets Bangalore or India, the engine will never present US Census statistics as evidence.
- **Fingerprinting & Deduplication:** Every evidence record generates a deterministic fingerprint (`generateFingerprint(workspaceId, capability, url)`) to prevent evidence flooding and circular citation loops.
- **Zero Fabricated URLs:** The system is strictly forbidden from constructing placeholder URLs (`https://example.com`, `example-incumbent.com`). If a URL is unavailable, `sourceUrl` is empty (`""`) and the source is attributed to `"Curated Knowledge Graph Archetype"`.

---

## 4. Hardened Truth Check & Safeguard Engine

The Deterministic Truth Check Engine (`src/utils/truthCheck.ts`) acts as an immutable post-generation firewall. If an LLM hallucinates prices or makes prohibited marketing claims, the generation is rejected and credits are automatically refunded:

```
[ LLM Generation Output ]
           │
           ▼
[ executeTruthCheck() ]
    ├── 1. Price Grounding ───────────────► Auto-remediates unapproved price tags
    ├── 2. Explicit Exclusions ───────────► Fails on literal & semantic euphemisms
    ├── 3. Superlatives Check ────────────► Rejects "#1 in the world", "100% guaranteed"
    ├── 4. Testimonials Check ────────────► Rejects "loved by 10,000 5-star customers"
    ├── 5. Competitor Disparagement ──────► Rejects "unlike [X] which uses stale beans"
    ├── 6. Macro Statistics Check ────────► Rejects uncited "$50B market" assertions
    └── 7. Truth Score Computation
           │
           ├── Truth Score < 70% ─────────► [ REJECTED ] ──► Auto-Refund Reserved Credits
           └── All Clear ────────────────► [ VERIFIED ] ──► Settle Credits (ADR-006)
```

---

## 5. Adversarial Verification Test Suite

The test suite in [`src/server/ai/phase04AiTruthAndProvenance.test.ts`](file:///d:/brainwise%20pro/brainwise%20(1)/src/server/ai/phase04AiTruthAndProvenance.test.ts) adversarially verifies all Phase 04 objectives:

```bash
$ npx tsx --test src/server/ai/phase04AiTruthAndProvenance.test.ts
✔ PHASE 04 - 1. Research Engine: Missing search provider returns honest PROVIDER_UNAVAILABLE state (0.74ms)
✔ PHASE 04 - 2. Research Engine: Indian consumer inquiry does not receive US Census Bureau statistics (0.12ms)
✔ PHASE 04 - 3. Competitor Discovery Engine: Returns empty list for unknown category without inventing example-incumbent.com (0.24ms)
✔ PHASE 04 - 4. Truth Check: Flags unsubstantiated marketing superlatives and absolute guarantees (2.27ms)
✔ PHASE 04 - 5. Truth Check: Flags fabricated customer testimonials and review counts (0.79ms)
✔ PHASE 04 - 6. Truth Check: Flags unsupported competitor claims and disparagement (0.18ms)
✔ PHASE 04 - 7. Truth Check: Flags uncited macro market size claims (0.28ms)
✔ PHASE 04 - 8. Transparent Confidence Scoring: Never outputs 1.0 and omits numeric score when evidence is unavailable (0.24ms)
✔ PHASE 04 - 9. Evidence Classification Taxonomy: Supports all 7 distinct evidence classes with strict semantics (0.12ms)

ℹ tests 9 | suites 0 | pass 9 | fail 0 | cancelled 0 | skipped 0 | todo 0
```

### Regression Verification Suite
All preceding phases remain completely green:
- **Phase 01 (Database Persistence):** 10/10 tests passed (`src/server/phase01DatabasePersistence.test.ts`).
- **Phase 03 (Auth & State Sync):** 6/6 tests passed (`src/services/phase03AuthAndStateSync.test.ts`).
- **Truth Check Core:** 6/6 tests passed (`src/utils/truthCheck.test.ts`).

---

## 6. Summary of Remediated Files

1. [`src/server/types/evidence.ts`](file:///d:/brainwise%20pro/brainwise%20(1)/src/server/types/evidence.ts) — Defined canonical `EvidenceClassification`, `ProvenanceRecord`, and multi-factor evidence types.
2. [`src/types/brainwise.ts`](file:///d:/brainwise%20pro/brainwise%20(1)/src/types/brainwise.ts) — Added `EvidenceClassification`, updated `FactProvenanceItem`, added new `TruthViolationType`s (`SUPERLATIVE_UNVERIFIED`, `FABRICATED_TESTIMONIAL`, `UNSUPPORTED_COMPETITOR_CLAIM`, `UNCITED_STATISTIC`).
3. [`src/server/ai/types.ts`](file:///d:/brainwise%20pro/brainwise%20(1)/src/server/ai/types.ts) — Enriched `AiSource` with `evidenceClassification`, `geographicScope`, and `isHypothesis`.
4. [`src/server/ai/researchEngine.ts`](file:///d:/brainwise%20pro/brainwise%20(1)/src/server/ai/researchEngine.ts) — Removed fake Statista/Census fallback, added honest `PROVIDER_UNAVAILABLE` capability package and explicit AI hypotheses.
5. [`src/server/services/competitorDiscoveryEngine.ts`](file:///d:/brainwise%20pro/brainwise%20(1)/src/server/services/competitorDiscoveryEngine.ts) — Eliminated `example-incumbent.com` / `example-challenger.com` synthetic competitor generation.
6. [`src/server/routes/v1/competitorRoutes.ts`](file:///d:/brainwise%20pro/brainwise%20(1)/src/server/routes/v1/competitorRoutes.ts) — Replaced default `5%` market share with authenticated input or `'UNKNOWN'`.
7. [`src/server/services/ideaIntelligenceService.ts`](file:///d:/brainwise%20pro/brainwise%20(1)/src/server/services/ideaIntelligenceService.ts) — Dynamically classified facts as `observed` or `estimated`, tagged player verification accurately, and disclosed TAM/SAM/SOM methodology.
8. [`src/utils/truthCheck.ts`](file:///d:/brainwise%20pro/brainwise%20(1)/src/utils/truthCheck.ts) — Implemented checks 4–7 and `calculateTransparentConfidence` (max 0.95 cap, numerical score omitted for unverified facts).
9. [`src/server/ai/phase04AiTruthAndProvenance.test.ts`](file:///d:/brainwise%20pro/brainwise%20(1)/src/server/ai/phase04AiTruthAndProvenance.test.ts) — Comprehensive 9-test adversarial test suite covering all Phase 04 objectives.

---

## 7. Sign-Off & Architectural Directives Compliance
- **Strict Video Exclusion:** Adhered to 100%. No video generation, FFmpeg pipelines, or video credits exist.
- **Client Design Freeze:** Adhered to 100%. All React 19 UI component layouts and stylings were preserved without modification.
- **Deterministic Truth & Financial Integrity:** Verified through automated tests. Unverified claims reject generation and refund reserved credits automatically.
