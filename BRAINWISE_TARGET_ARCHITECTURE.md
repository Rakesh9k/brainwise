# BRAINWISE — MASTER TARGET ARCHITECTURE SPECIFICATION
## AI Business Intelligence & Growth Operating System
### Master Technical Document 02

---

## 1. System Vision & Core Objective

**BrainWise** is an interconnected **AI Business Intelligence & Growth Operating System** built for commercial founders, SMEs, and growth operators. Rather than functioning as a transient prompt wrapper or an isolated report generator, BrainWise continuously understands the business, monitors its competitive landscape, verifies factual evidence, projects unit economics, and guides day-to-day execution.

### Non-Negotiable Product Directives
1. **Strict Video Exclusion**: Zero AI video generation, video editing, Remotion scripts, FFmpeg rendering, or video credit tiers. All visual collateral is strictly SVG vector assets, multi-frame static carousels, and high-DPI PDFs.
2. **Founder Primacy Rule**: User-confirmed facts are sacred ground truth. AI-inferred proposals can never silently overwrite user-confirmed facts.
3. **Truth Engine Guardrail**: All generated copy passes through `truthCheck.ts` (`executeTruthCheck()`). Any unverified pricing claims or forbidden claims trigger generation rejection and automatic credit refund.
4. **Anti-Fatigue Guardrail**: All strategic angles register with `strategicMemory.ts` to prevent repetitive marketing angles.
5. **Two-Phase Credit Reservation Protocol (ADR-006)**: Atomic credit reservations in Firestore before LLM generation; settles on success, auto-refunds on upstream failure.
6. **DPDPA 2023 Compliance**: Strict regional data residency in `asia-south1` (Mumbai).

---

## 2. High-Level System Architecture

```
+-----------------------------------------------------------------------------------------+
|                                    CLIENT TIER                                          |
|  React 19 SPA (Vite, TailwindCSS, Motion/React, Lucide Icons, 1.25 Modular Typography)  |
|  Strict Design Freeze v1.0 • Client State Synced via Typed BrainWiseApiClient           |
+-----------------------------------------------------------------------------------------+
                                             |
                                  HTTPS / REST / JSON
                                             v
+-----------------------------------------------------------------------------------------+
|                                   BACKEND RUNTIME                                       |
|  Express.js API (Node.js 24 ESM, TypeScript) • Port 3000                                |
|  Authentication (Firebase Auth / Bearer JWT) • Multi-Tenant RBAC Middleware             |
|  SSRF Defense (ssrfValidator.ts) • Rate Limiting • Two-Phase Billing Engine             |
+-----------------------------------------------------------------------------------------+
       |                           |                           |                    |
       v                           v                           v                    v
+---------------+         +-----------------+         +----------------+    +---------------+
| EVIDENCE LAKE |         | BUSINESS BRAIN  |         | INTELLIGENCE   |    | ORCHESTRATOR  |
| 4-Tier Provenance       | Unified Context |         | DEPARTMENTS    |    | Multi-Agent   |
| Contradiction |         | Snapshot History|         | 7 Connected    |    | Event Bus     |
| Knowledge Graph         | Memory Engine   |         | Intelligence   |    | Cloud Tasks   |
+---------------+         +-----------------+         +----------------+    +---------------+
                                             |
                                             v
+-----------------------------------------------------------------------------------------+
|                                   DATA STORAGE TIER                                     |
|  Google Cloud Firestore (Native Mode, asia-south1 Mumbai)                               |
|  - Multi-tenant tenant paths: workspaces/{workspaceId}/...                              |
|  - Atomic Transactions & Read/Write Batches                                             |
|  - Versioned Historical Snapshots                                                       |
+-----------------------------------------------------------------------------------------+
```

---

## 3. Seven Connected Intelligence Departments

### Department 1 — Idea Intelligence
- **Purpose**: Evaluates commercial opportunity viability before capital commitment.
- **Key Modules**: 7-score linear composite matrix, executive verdict (`GO`, `CAUTION`, `NO_GO`), problem severity analyzer, willingness-to-pay assessment, and critical assumptions tracker.
- **Service**: `ideaIntelligenceService.ts`

### Department 2 — Market Intelligence
- **Purpose**: Estimates addressable market sizing and regional demand dynamics.
- **Key Modules**: Dual Top-Down and Bottom-Up TAM/SAM/SOM models, stated assumptions, Indian MSME Section 44AD presumptive tax notes, and UPI payment infrastructure tailwinds.
- **Service**: `marketIntelligenceService.ts`

### Department 3 — Competitive Intelligence & Competitor Watch
- **Purpose**: Analyzes competitive landscape and monitors competitor shifts 24/7.
- **Key Modules**: 14-dimension competitor profiles, 2D Euclidean positioning matrix & whitespace detection, and operational Competitor Watch generating 6-factor actionable alerts.
- **Service**: `competitiveIntelligenceService.ts`

### Department 4 — Financial Intelligence & Strategy Simulator
- **Purpose**: Models economic feasibility, unit economics, and capital runway.
- **Key Modules**: Deterministic unit economics (LTV, CAC, LTV:CAC, break-even accounts, payback months), interactive Strategy Simulator comparing decisions (e.g. ₹499 vs ₹799) with 3-tier sensitivity bands, CapEx/OpEx startup costs, and RFC-compliant CSV exports.
- **Service**: `financialIntelligenceService.ts`

### Department 5 — Brand Studio & Deterministic Collateral
- **Purpose**: Converts intelligence into differentiated brand identity and marketing collateral.
- **Key Modules**: Competitor whitespace-aligned brand positioning, 1.25 modular typography ladder ($16 \times 1.25^n$), anti-fatigue angle memory, and pure sanitized SVG vector collateral (`VECTOR_LOGO`, `BUSINESS_CARD_SVG`, `STATIONERY_LETTERHEAD_SVG`, `POSTER_FLYER_SVG`, `STATIC_CAROUSEL_SVG`). Strict zero video.
- **Service**: `brandStudioService.ts`

### Department 6 — Growth Director & Execution Management
- **Purpose**: Converts strategy into operational roadmaps and closed-loop outcome learning.
- **Key Modules**: Anti-vague execution task generator with deterministic ICE scores (Impact $\times$ Confidence $\times$ Ease), multi-horizon planning (Immediate 7-Day, Short-Term 30-Day, Medium-Term 90-Day), and outcome learning feeding real results back into Business Brain.
- **Service**: `growthDirectorService.ts`

### Department 7 — Business Watch & Continuous Monitoring
- **Purpose**: 24/7 autonomous surveillance over competitor shifts, regulatory changes, and goal velocity.
- **Key Modules**: Operational surveillance cycle, strict 6-factor actionable alert structure (What, When, Evidence, Why it matters, Potential impact, Recommended response), weekly business digest, and SSRF-safe crawling.
- **Service**: `businessWatchService.ts`

---

## 4. Multi-Tenant Isolation & Security Boundary

1. **Path-Based Workspace Isolation**:
   - All collections strictly live under `workspaces/{workspaceId}/...`.
   - Workspace membership is enforced at middleware level (`requireWorkspaceMember`, `requireWorkspaceRole`).
2. **SSRF Defense Protocol**:
   - Every external URL crawled passes through `validateSafeExternalUrl()` (`ssrfValidator.ts`).
   - Private subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), loopback (`127.0.0.1`), cloud metadata (`169.254.169.254`), and non-HTTP protocols are blocked.
3. **Data Residency**:
   - In accordance with the Indian Digital Personal Data Protection Act (DPDPA 2023), all workspace collections and backup snapshots reside in Google Cloud `asia-south1` (Mumbai).
