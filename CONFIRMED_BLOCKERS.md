# BRAINWISE — CONFIRMED AUDIT BLOCKERS & REPRODUCTION REPORT
**Phase 00 Baseline Execution**  
**Audit Scope:** P0-01 through P0-09  

---

## 1. Executive Status of Reported P0 Blockers

| Blocker ID | Name | Current Status | Root Cause |
|---|---|---|---|
| **P0-01** | Simulated Cashfree payment provider | **CONFIRMED** | `CashfreeProvider` stores simulated orders in an in-memory `Map` with mock UPI references instead of calling Cashfree API endpoints. |
| **P0-02** | Fabricated analytics telemetry and provenance | **PARTIALLY FIXED** | Full mathematical engine (`MetricRegistry`, `MetricCalculator`) exists, but mock data fallbacks remain in UI hook `useAnalyticsIntelligence.ts`. |
| **P0-03** | Hardcoded `/workspaces/current` in `aiClient.ts` | **CONFIRMED** | `understandIdeaApi`, `sendConversationalResearchApi`, `finalizeIdeaApi` call literal `/api/v1/workspaces/current/...`. |
| **P0-04** | `InMemoryDatabase` production fallback | **CONFIRMED** | `src/server/db/firestore.ts` instantiates `InMemoryDatabase` if GCP credentials are not found or if initialization catches an error. |
| **P0-05** | `extract-document` response contract mismatch | **CONFIRMED** | Route returns `{ extracted, provenance, requiresUserApproval }`, but UI in `BusinessBrainPage.tsx` expects `{ verificationItems }`. |
| **P0-06** | Missing products bulk route | **ALREADY FIXED** | Route `POST /api/v1/workspaces/:workspaceId/business-profile/products/bulk` exists and delegates to `productRepository.bulkCreateProducts`. |
| **P0-07** | Analytics authentication token mismatch | **CONFIRMED** | `useAnalyticsIntelligence.ts` reads `localStorage.getItem('brainwise_token')` while app stores in `sessionStorage.getItem('brainwise_auth_token')`. |
| **P0-08** | Missing `X-Workspace-Id` in AI dossier generation | **CONFIRMED** | `aiClient.ts` does not attach `X-Workspace-Id` header to `postJson('/api/ai/dossier')`. |
| **P0-09** | TypeScript compilation failures | **CONFIRMED** | `npm run typecheck` emits **1,135 TypeScript compilation errors**. |

---

## 2. In-Depth Blocker Analysis & Reproduction Evidence

### P0-01: Simulated Cashfree Payment Provider
- **Severity:** P0 (Financial / Revenue Integrity)
- **Status:** **CONFIRMED**
- **Actual Location:** `src/server/billing/providers/cashfreeProvider.ts#L26-L65`
- **Root Cause:**
  The `CashfreeProvider` class uses an internal in-memory map:
  ```typescript
  private simulatedOrders = new Map<string, { orderId: string; ...; status: PaymentStatus }>();
  ```
  `createCheckoutSession` immediately marks orders as `'successful'` and generates fake UPI provider references (`cf_ref_...`). It never invokes Cashfree PG REST APIs (`https://api.cashfree.com/pg/orders`).
- **Reproduction Evidence:** Direct code inspection in `cashfreeProvider.ts`.
- **Affected User Journey:** Checkout & Credit Purchase (Settings -> Billing -> Purchase Credit Pack).
- **Proposed Fix (Phase 01):**
  Implement real Cashfree PG REST API client with credentials from `serverConfig.cashfreeAppId` and `serverConfig.cashfreeSecretKey`. Maintain mock sandbox mode only under `NODE_ENV === 'test'`.

---

### P0-02: Fabricated Analytics Telemetry and Provenance
- **Severity:** P0 (Auditability & Data Truth)
- **Status:** **PARTIALLY FIXED**
- **Actual Location:** `src/utils/useAnalyticsIntelligence.ts#L48-L53` and `src/server/routes/v1/analyticsRoutes.ts`
- **Root Cause:**
  The backend analytics suite (`src/server/services/analytics/`) has been heavily built out with rigorous statistical engines (`statisticalIntelligenceEngine.ts`, `metricCalculator.ts`). However, in `useAnalyticsIntelligence.ts`, when a fetch fails or when running in client mode, it falls back to silent null/mock data rather than presenting verified backend data or explicit telemetry connection status.
- **Reproduction Evidence:** `useAnalyticsIntelligence.ts` lines 48–53.
- **Affected User Journey:** Analytics & Reports dashboard.
- **Proposed Fix (Phase 01):**
  Ensure the hook throws typed errors or presents a true empty/unconnected telemetry state rather than silently defaulting or masking errors.

---

### P0-03: Hardcoded `/workspaces/current` Endpoints in `aiClient.ts`
- **Severity:** P0 (Multi-Tenancy & Authorization)
- **Status:** **CONFIRMED**
- **Actual Location:** `src/utils/aiClient.ts#L145-L186`
- **Root Cause:**
  Functions `understandIdeaApi`, `sendConversationalResearchApi`, and `finalizeIdeaApi` use hardcoded literal `/api/v1/workspaces/current/...`:
  ```typescript
  export async function understandIdeaApi(ideaPrompt: string) {
    const res = await postJson('/api/v1/workspaces/current/research/understand-idea', { ideaPrompt });
    ...
  }
  ```
  The Express router in `workspaceRoutes.ts` and `researchRoutes.ts` does not route literal `'current'`; it expects the active `workspaceId` UUID.
- **Reproduction Evidence:** Source code inspection in `src/utils/aiClient.ts`.
- **Affected User Journey:** Idea Intelligence conversational research & blueprint finalization.
- **Proposed Fix (Phase 01):**
  Accept `workspaceId: string` as an explicit parameter in all `aiClient.ts` methods and interpolate `/api/v1/workspaces/${workspaceId}/...`.

---

### P0-04: `InMemoryDatabase` Production Fallback
- **Severity:** P0 (Data Loss & Multi-Instance Failure)
- **Status:** **CONFIRMED**
- **Actual Location:** `src/server/db/firestore.ts#L270-L287`
- **Root Cause:**
  In `createDatabaseService()`:
  ```typescript
  if (hasGcpCreds && serverConfig.isProduction) {
    try {
      return new CloudFirestoreDatabase();
    } catch {
      console.warn('[DB] Falling back to InMemoryDatabase...');
      return new InMemoryDatabase();
    }
  }
  return new InMemoryDatabase();
  ```
  If environment variables are misconfigured in production, the server silently falls back to `InMemoryDatabase`, losing all tenant records on container restart or horizontal scaling.
- **Reproduction Evidence:** `src/server/db/firestore.ts` lines 270–287.
- **Affected User Journey:** All user data persistence across every module.
- **Proposed Fix (Phase 01):**
  In `isProduction`, if Firestore initialization fails or credentials are missing, throw a fatal startup error rather than silently degrading to `InMemoryDatabase`.

---

### P0-05: `extract-document` Response Contract Mismatch
- **Severity:** P0 (Data Ingestion & UX Failure)
- **Status:** **CONFIRMED**
- **Actual Location:** `src/server/routes/v1/businessProfileRoutes.ts#L841` vs `src/pages/app/BusinessBrainPage.tsx#L963`
- **Root Cause:**
  The server responds with:
  ```json
  {
    "success": true,
    "data": {
      "extracted": { ... },
      "provenance": "AI_INFERRED",
      "requiresUserApproval": true
    }
  }
  ```
  However, `BusinessBrainPage.tsx` checks:
  ```typescript
  if (res?.data?.verificationItems && res.data.verificationItems.length > 0) {
    setVerificationQueue((prev) => [...res.data.verificationItems, ...prev]);
  }
  ```
  Because `verificationItems` is undefined in the backend response, extracted document facts are never added to the user's verification queue.
- **Reproduction Evidence:** Comparison of `businessProfileRoutes.ts#L841-L849` and `BusinessBrainPage.tsx#L963`.
- **Affected User Journey:** Business Brain -> Upload Document -> Fact Verification Queue.
- **Proposed Fix (Phase 01):**
  Align the contract so the endpoint returns `verificationItems: VerificationQueueItem[]` derived from the extracted facts.

---

### P0-06: Missing Products Bulk Route
- **Severity:** P0 (Catalogue Ingestion)
- **Status:** **ALREADY FIXED**
- **Actual Location:** `src/server/routes/v1/businessProfileRoutes.ts#L516-L546`
- **Evidence:**
  The route `POST /api/v1/workspaces/:workspaceId/business-profile/products/bulk` is registered and implemented:
  ```typescript
  router.post('/products/bulk', requireWorkspaceRole(['owner', 'admin', 'member']), async (req, res) => {
    const { products } = req.body;
    ...
    const created = await productRepository.bulkCreateProducts(req.workspace!.workspaceId, products);
    ...
  });
  ```
  `apiClient.ts#L665` also provides `bulkCreateProducts(workspaceId, products)`.
- **Note on Related Test Failure:**
  `phase1BusinessBrain.test.ts` attempted to call `/products/import` (a separate alias endpoint), which is missing, whereas `/products/bulk` is present.

---

### P0-07: Analytics Authentication Token Mismatch
- **Severity:** P0 (Unauthorized API Requests)
- **Status:** **CONFIRMED**
- **Actual Location:** `src/utils/useAnalyticsIntelligence.ts#L36`
- **Root Cause:**
  `useAnalyticsIntelligence.ts` retrieves the token using:
  ```typescript
  const token = localStorage.getItem('brainwise_token') || 'demo_token';
  ```
  However, `BrainWiseContext.tsx` stores the authenticated session token in `sessionStorage` under `'brainwise_auth_token'`:
  ```typescript
  sessionStorage.setItem('brainwise_auth_token', session.idToken);
  ```
  Consequently, real logged-in users send `'Bearer demo_token'` to analytics endpoints, causing 401/403 or fallback failures in authenticated production.
- **Reproduction Evidence:** Cross-file search across `src/context/BrainWiseContext.tsx` and `src/utils/useAnalyticsIntelligence.ts`.
- **Affected User Journey:** Analytics & Reports viewing and AI Assistant interaction.
- **Proposed Fix (Phase 01):**
  Standardize on `sessionStorage.getItem('brainwise_auth_token')` or read the authenticated token directly from `useBrainWise()` context.

---

### P0-08: Missing `X-Workspace-Id` in AI Dossier Generation
- **Severity:** P0 (Multi-Tenant Workspace Context)
- **Status:** **CONFIRMED**
- **Actual Location:** `src/utils/aiClient.ts#L22` & `L57`
- **Root Cause:**
  `postJson` in `aiClient.ts` only sets `'Authorization': Bearer <token>` and `'Content-Type': 'application/json'`. It does NOT attach `X-Workspace-Id`.
  In `server/routes/v1/aiRoutes.ts`, `requireWorkspaceMember` checks:
  ```typescript
  const workspaceId = req.params.workspaceId || req.headers['x-workspace-id'] || req.body?.workspaceId;
  ```
  When calling `/api/ai/dossier` via the top-level route alias (where `:workspaceId` is not in the URL path), the server rejects requests without `X-Workspace-Id` or fails to associate the dossier with the active workspace.
- **Reproduction Evidence:** `src/utils/aiClient.ts` lines 20–35.
- **Affected User Journey:** Idea Intelligence -> Generate Validation Dossier.
- **Proposed Fix (Phase 01):**
  Pass active `workspaceId` into `generateAiDossier`, attach `X-Workspace-Id: <workspaceId>` header, and call `/api/v1/workspaces/${workspaceId}/ai/dossier`.

---

### P0-09: TypeScript Compilation Failures
- **Severity:** P0 (Build Integrity & Type Safety)
- **Status:** **CONFIRMED**
- **Actual Location:** Global (`tsc --noEmit`)
- **Root Cause:**
  Running `npm run typecheck` produces **1,135 TypeScript compilation errors**.
  Key categories of errors:
  1. `src/context/BrainWiseContext.tsx`: `BrandAsset.folder` union type mismatch (`'Archived'` not assignable to `'Identity' | 'Print & Packaging' | 'Social Media' | 'Campaigns'`).
  2. `src/server/services/unifiedReportService.ts`: Missing properties on `BusinessProfileEntity` and `CalculatedFinancialMetrics`.
  3. `src/types/growthRadar.ts`: `StandardDepartmentType` missing from `src/server/types/api`.
  4. Unused declared imports across numerous server test files and utilities (`TS6133`, `TS6196`).
- **Reproduction Evidence:** Exact command execution `npm run typecheck` exited with code `1`.
- **Affected User Journey:** Developer workflow, CI/CD pipeline, and type safety guarantees.
- **Proposed Fix (Phase 01):**
  Clean up type unions in `src/types/brainwise.ts`, export missing types in `src/server/types/api.ts`, fix interface definitions in `unifiedReportService.ts`, and eliminate unused imports.
