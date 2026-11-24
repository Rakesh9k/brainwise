# BRAINWISE — REMEDIATION DEPENDENCY ORDER
**Phase 00 Baseline Execution**  
**Remediation Sequencing Strategy:** Foundational Infrastructure -> Core Data Contracts -> Route Registrations -> Quality Gates

---

## Remediation Sequence Diagram

```
Step 1: P0-09 (TypeScript & Type System Consolidation)
         │
         ▼
Step 2: P0-04 (Database Production Hardening)
         │
         ▼
Step 3: P0-07 & P0-08 (Auth Token & Workspace Context Unification)
         │
         ▼
Step 4: P0-03 (Eliminate Hardcoded /workspaces/current)
         │
         ▼
Step 5: P0-05 & Missing Route Registrations (Verification & Business Brain Endpoints)
         │
         ▼
Step 6: P0-02 (Analytics Telemetry State Normalization)
         │
         ▼
Step 7: P0-01 (Cashfree PG Real Integration & Config Gate)
         │
         ▼
Step 8: Verification Gate (Typecheck -> Lint -> Test -> Build)
```

---

## 1. Ordered Remediation Phases

### Step 1: TypeScript & Domain Model Consolidation (Addresses P0-09)
- **Objective:** Fix the 1,135 TypeScript compilation errors so the codebase reaches clean compilation.
- **Actions:**
  1. Fix `BrandAsset.folder` in `src/types/brainwise.ts` to include `'Archived' | 'Active'` or reconcile UI folder names.
  2. Export `StandardDepartmentType` in `src/server/types/api.ts`.
  3. Reconcile `CalculatedFinancialMetrics` and `BusinessProfileEntity` properties in `unifiedReportService.ts`.
  4. Fix argument signatures in `BrainWiseContext.tsx` and unused imports.
- **Verification:** `npm run typecheck` passes with 0 errors.

---

### Step 2: Database Persistence Production Hardening (Addresses P0-04)
- **Objective:** Ensure the production runtime never silently loses data via `InMemoryDatabase`.
- **Actions:**
  1. In `src/server/db/firestore.ts`, enforce that when `serverConfig.isProduction === true`, missing GCP credentials or Firestore initialization failures throw a fatal startup error (`FATAL_DATABASE_UNAVAILABLE`).
  2. Keep `InMemoryDatabase` enabled exclusively for `development` and `test` environments.
- **Verification:** Unit tests confirm dev/test uses in-memory DB while production mode without credentials terminates with descriptive error.

---

### Step 3: Auth Token & Workspace Context Unification (Addresses P0-07 & P0-08)
- **Objective:** Fix authentication token reading in analytics and ensure `X-Workspace-Id` header is always propagated.
- **Actions:**
  1. In `src/utils/useAnalyticsIntelligence.ts`, replace `localStorage.getItem('brainwise_token')` with `sessionStorage.getItem('brainwise_auth_token')`.
  2. In `src/utils/aiClient.ts`, accept `workspaceId` and inject `X-Workspace-Id` into `postJson` headers.
- **Verification:** Verified API call logs show proper `Bearer` token and `X-Workspace-Id` header.

---

### Step 4: Eliminate Hardcoded `/workspaces/current` (Addresses P0-03)
- **Objective:** Align client-side idea research endpoints with multi-tenant routing.
- **Actions:**
  1. In `src/utils/aiClient.ts`, update `understandIdeaApi`, `sendConversationalResearchApi`, and `finalizeIdeaApi` to accept `workspaceId: string`.
  2. Update callers in `IdeaIntelligencePage.tsx` and `DashboardPage.tsx` to supply `activeWorkspaceId`.
- **Verification:** Endpoints hit `/api/v1/workspaces/:workspaceId/research/...` with HTTP 200 responses.

---

### Step 5: Document Extraction Contract & Missing Routes (Addresses P0-05 & Phase 1/2 Test Failures)
- **Objective:** Restore broken frontend-backend contracts and resolve the 20 failing test scenarios.
- **Actions:**
  1. Update `POST /api/v1/workspaces/:workspaceId/business-profile/extract-document` to return `verificationItems` in response payload matching `BusinessBrainPage.tsx` expectations.
  2. Add route alias for `/products/import` pointing to `productRepository.bulkCreateProducts`.
  3. Register missing Business Brain endpoints:
     - `POST /business-profile/extract-url` (with SSRF protection checking private IP ranges)
     - `GET /business-profile/verification-queue`
     - `GET /business-profile/missing-info`
     - `POST /business-profile/documents/:docId/reprocess`
     - Knowledge graph and memory endpoints (`/graph/edges`, `/context`, `/memory/*`)
- **Verification:** Re-run `npm test` to confirm all 854 test scenarios pass.

---

### Step 6: Analytics Telemetry State Normalization (Addresses P0-02)
- **Objective:** Eliminate silent mock fallbacks in UI hook and provide clear telemetry states.
- **Actions:**
  1. Update `useAnalyticsIntelligence.ts` to surface connection status (`CONNECTING`, `LIVE`, `UNCONFIGURED`).
  2. Wire `dataHealth.isProductionTelemetryReady` directly to active connector status.
- **Verification:** Analytics dashboard accurately reflects connected vs unconfigured state without silent null masking.

---

### Step 7: Cashfree Payment Gateway Production Integration (Addresses P0-01)
- **Objective:** Replace in-memory mock order map with real Cashfree PG API client.
- **Actions:**
  1. Implement Cashfree API client in `src/server/billing/providers/cashfreeProvider.ts` calling `https://api.cashfree.com/pg/orders` (or sandbox equivalent).
  2. Guard mock order behavior strictly behind `NODE_ENV === 'test'`.
  3. Verify HMAC-SHA256 signature calculation using Cashfree developer specs.
- **Verification:** Payment order creation issues valid Cashfree checkout session URLs with real order IDs.

---

### Step 8: Final Quality Gates & Production Build Verification
- **Objective:** Attain 100% green status across all gates.
- **Actions:**
  1. `npm run typecheck` -> 0 errors.
  2. `npm run lint` -> 0 errors.
  3. `npm test` -> 854/854 passed.
  4. `npm run build` -> clean client and server bundles.
