# BrainWise Phase 4 Remaining Issues & Technical Debt Register

## 1. Overview
This register catalogs all non-blocking observations, future optimizations, and recommended Phase 5 priorities identified during Phase 4 development. **Zero blocking issues remain for Phase 4.**

---

## 2. Technical Debt & Non-Blocking Observations

| ID | Category | Component | Description | Severity | Target Phase |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **ISSUE-01** | Client Optimization | Vite Bundler | Production JS chunk size exceeds 500 kB (`dist/assets/index-*.js` ~1.49 MB) due to comprehensive inline SVG assets and department icons. | Low | Phase 5 (Route Code-Splitting via `React.lazy`) |
| **ISSUE-02** | Background Tasks | `backgroundJobService.ts` | The in-memory async background task runner currently polls internal timers in dev/test; for production enterprise scale, integration with native Google Cloud Tasks HTTP targets is recommended. | Low | Phase 5 (Infrastructure & Monitoring) |
| **ISSUE-03** | AI Prompt Cache | `aiOrchestrationService.ts` | Repeated Business Brain grounding payloads can benefit from Gemini 1.5/2.5 Context Caching once token sizes exceed 32k tokens. | Low | Phase 5 (Cost Optimization) |
| **ISSUE-04** | Rate Limiter Store | `rateLimit.ts` | Currently uses an in-memory sliding window cache per Cloud Run container. For multi-container cluster deployments, a distributed Redis/Valkey cache (Cloud Memorystore) can provide cluster-wide synchronization. | Low | Phase 5 (Production Hardening) |

---

## 3. Strict Scope Compliance Checklist
- [x] **No Video Generation:** Verified 100% video-free across all schemas, APIs, jobs, and storage rules.
- [x] **No Client-Side Direct AI/DB Writes:** All AI calls and Firestore writes route through the backend server.
- [x] **Design Freeze Intact:** React 19 UI component structure, layouts, and CSS variables preserved without regressions.
- [x] **No Unhandled Errors:** All API endpoints return standardized RFC-compliant JSON error envelopes.
