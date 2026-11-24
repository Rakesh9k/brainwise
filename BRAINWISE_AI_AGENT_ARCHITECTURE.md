# BRAINWISE — MASTER AI AGENT & ORCHESTRATION ARCHITECTURE
## Multi-Agent Systems, Truth Engine & Grounded Business Intelligence
### Master Technical Document 04

---

## 1. Multi-Agent System Overview

BrainWise abandons generic single-prompt chatbots in favor of a **coordinated multi-agent architecture** where specialized department agents collaborate over a shared Business Brain, Evidence Lake, and Event Bus.

```
+-----------------------------------------------------------------------------------------+
|                                CENTRAL ORCHESTRATION AGENT                              |
|                          (Intent Decomposition, Routing, Governance)                     |
+-----------------------------------------------------------------------------------------+
                                             |
       +--------------------+----------------+--------------------+
       |                    |                                     |
       v                    v                                     v
+---------------+  +------------------+                  +------------------+
| IDEA & MARKET |  | COMPETITOR WATCH |                  | FINANCIAL AGENT  |
| SPECIALIST    |  | SPECIALIST       |                  | (Unit Economics, |
| (Score Matrix,|  | (Diff Engine,    |                  |  Sensitivity,    |
|  TAM/SAM/SOM) |  |  SSRF Validator) |                  |  CapEx/OpEx)     |
+---------------+  +------------------+                  +------------------+
       |                    |                                     |
       +--------------------+----------------+--------------------+
                                             |
       +--------------------+----------------+--------------------+
       |                    |                                     |
       v                    v                                     v
+---------------+  +------------------+                  +------------------+
| BRAND STUDIO  |  | GROWTH DIRECTOR  |                  | BUSINESS WATCH   |
| SPECIALIST    |  | SPECIALIST       |                  | SPECIALIST       |
| (1.25 Modular,|  | (ICE Prioritized |                  | (24/7 Anomaly,   |
|  SVG Collateral) |  Roadmap, Closed- |                  |  6-Factor Alert,  |
|  Strict Video |  |  Loop Learning)  |                  |  Weekly Digest)  |
|  Exclusion)   |  |                  |                  |                  |
+---------------+  +------------------+                  +------------------+
                                             |
                                             v
+-----------------------------------------------------------------------------------------+
|                        DETERMINISTIC VERIFICATION & GUARDRAILS                          |
|  1. Truth Engine Check (truthCheck.ts)       --> Rejects unverified prices/claims       |
|  2. Anti-Fatigue Memory (strategicMemory.ts) --> Prevents repetitive marketing angles   |
|  3. Strict Video Exclusion Filter            --> Eliminates video tools/Remotion/FFmpeg |
|  4. Two-Phase Credit Settlement              --> Atomic release on upstream failure     |
+-----------------------------------------------------------------------------------------+
```

---

## 2. Department Specialists & Responsibilities

| Specialist Agent | Responsibility | Core Tools & Services | Primary Guardrail |
|---|---|---|---|
| **Idea & Market Specialist** | Commercial viability scoring & TAM/SAM/SOM sizing | `ideaIntelligenceService`, `marketIntelligenceService`, `evidenceEngineService` | Grounded mathematical formulas (no hallucinated random sizing) |
| **Competitor Watch Specialist** | Continuous landscape diffing & whitespace discovery | `competitiveIntelligenceService`, `ssrfValidator` | Strict SSRF defense blocking loopback and private subnets |
| **Financial Specialist** | Unit economics, breakeven, and strategy simulations | `financialIntelligenceService` | Deterministic recalculation of dependent metrics |
| **Brand Studio Specialist** | Differentiated brand strategy & high-DPI vector collateral | `brandStudioService`, `logic.ts` (SVG Sanitizer) | **STRICT VIDEO EXCLUSION**: Pure vector SVG & static carousels only |
| **Growth Director Specialist** | Operational execution tasks & closed-loop outcome learning | `growthDirectorService`, `learningEngineService` | Anti-vague mandate (concrete action, tools, metrics, criteria) |
| **Business Watch Specialist** | 24/7 anomaly detection, alerts, and weekly briefs | `businessWatchService`, `scheduledIntelligenceService` | Operational reality mandate (alerts require verifiable triggers) |

---

## 3. Core AI Guardrails & Safety Architecture

### 3.1 The Truth Engine (`truthCheck.ts`)
- Every generated output passes through `executeTruthCheck(content, verifiedPrices, forbiddenPhrases)`.
- Rejects unverified price claims (e.g. claiming $99 when ground truth is ₹499).
- Rejects prohibited marketing hyperbole ("guaranteed revenue", "100% risk free", "viral magic").
- **Automatic Credit Refund**: A Truth Check failure instantly rolls back reserved credits in Firestore with zero user penalty.

### 3.2 Anti-Fatigue Memory (`strategicMemory.ts`)
- Tracks frequency of recommended angles, keywords, and hooks across sprints.
- When an angle exceeds the fatigue threshold ($\ge 3$ uses or marked as underperforming), it is placed in `fatiguedThemes` and injected as a negative constraint in future prompt contexts.

### 3.3 Strict Video Exclusion Protocol
- Prompts, tool registries, and agent configurations are permanently stripped of video generation APIs, Remotion templates, and FFmpeg subprocesses.
- Output formats are restricted to: `VECTOR_LOGO`, `BUSINESS_CARD_SVG`, `STATIONERY_LETTERHEAD_SVG`, `POSTER_FLYER_SVG`, `STATIC_CAROUSEL_SVG`, and deterministic text packs.

### 3.4 Prompt Injection Defense & Tool Sandboxing
- Dynamic inputs from scraped competitor websites or customer reviews are sanitised, encapsulated inside untrusted data tags (`<UNTRUSTED_EXTERNAL_CONTENT>`), and stripped of system instruction override sequences.
- Agents operate with principle of least privilege: read-only access to Evidence Lake; write access restricted to dedicated repositories through validated service boundaries.
