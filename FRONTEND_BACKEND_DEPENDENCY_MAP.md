# BRAINWISE — FRONTEND-BACKEND DEPENDENCY MAP & WIRING AUDIT
**Phase 00 Baseline Execution**

---

## 1. End-to-End Architectural Layer Flow

```
[React 19 View / Page]
         │
         ▼
[React Context / Hook] (e.g. BrainWiseContext, useAnalyticsIntelligence)
         │
         ▼
[API Client Layer] (src/services/apiClient.ts, src/utils/aiClient.ts)
         │  (HTTP / JSON with Authorization: Bearer & X-Workspace-Id)
         ▼
[Express Server Router] (server.ts -> src/server/routes/index.ts)
         │
         ▼
[Middleware Chain] (authenticateToken -> requireWorkspaceMember -> requireWorkspaceRole)
         │
         ▼
[Domain Service Layer] (e.g. businessBrainService, creditService, ideaIntelligenceService)
         │
         ▼
[Repository Layer] (e.g. productRepository, brandAssetRepository, taskRepository)
         │
         ▼
[Database / Storage Layer] (Firestore / InMemoryDatabase / Cloud Storage)
```

---

## 2. Module-by-Module Component Dependency Mapping

### 1. Home Dashboard (`DashboardPage.tsx`)
- **Hook/Context:** `useBrainWise()` from `src/context/BrainWiseContext.tsx`
- **Sub-components:** `DepartmentCards.tsx`, `StrategistChatDrawer.tsx`, `TacticalFeed.tsx`
- **API Client:** `apiClient.ts` (`getWorkspace`, `getAiRequests`), `aiClient.ts` (`fetchAiHealth`)
- **Backend Route:** `GET /api/health`, `GET /api/v1/workspaces/:id`
- **Service/Repo:** `workspaceRepository.ts`, `serverConfig`
- **Identified Issues:**
  - `StrategistChatDrawer` uses local mock streaming when `activeWorkspaceId` is missing instead of gating on workspace creation.

### 2. Business Brain (`BusinessBrainPage.tsx`)
- **Hook/Context:** `useBrainWise()`
- **API Client:** `apiClient.ts` (`getBusinessProfile`, `updateBusinessProfile`, `confirmFact`, `extractDocument`, `bulkCreateProducts`)
- **Backend Route:** `/api/v1/workspaces/:workspaceId/business-profile/*`
- **Middleware:** `authenticateToken`, `requireWorkspaceMember`, `requireWorkspaceRole`
- **Service/Repo:** `businessBrainService.ts`, `productRepository.ts`, `audienceSegmentRepository.ts`
- **Database:** `workspaces/{id}/businessProfile`, `products`, `audienceSegments`
- **Identified Issues:**
  - `extractDocument` contract mismatch (P0-05): Frontend checks `res.data.verificationItems`, backend returns `res.data.extracted`.
  - Missing `/products/import` alias called by `phase1BusinessBrain.test.ts`.

### 3. Idea Intelligence (`IdeaIntelligencePage.tsx`)
- **Hook/Context:** `useBrainWise()`
- **API Client:** `aiClient.ts` (`generateAiDossier`, `understandIdeaApi`, `sendConversationalResearchApi`, `finalizeIdeaApi`)
- **Backend Route:**
  - `/api/ai/dossier` & `/api/v1/workspaces/:id/ai/dossier`
  - `/api/v1/workspaces/current/research/understand-idea` (BROKEN: P0-03)
- **Middleware:** `authenticateToken`, `requireWorkspaceMember`
- **Service/Repo:** `ideaIntelligenceService.ts`, `researchEngine.ts`, `creditService.ts`
- **Identified Issues:**
  - Missing `X-Workspace-Id` in `generateAiDossier` (P0-08).
  - Hardcoded `/workspaces/current/` in `aiClient.ts` methods causes 404 in production backend (P0-03).

### 4. Competitive Intelligence (`CompetitiveIntelligencePage.tsx`)
- **Hook/Context:** `useBrainWise()`
- **API Client:** `apiClient.ts` (`getCompetitors`, `addCompetitor`, `discoverCompetitors`)
- **Backend Route:** `/api/v1/workspaces/:workspaceId/competitors/*`
- **Service/Repo:** `competitorDiscoveryEngine.ts`, `competitorRepository.ts`
- **Database:** `workspaces/{id}/competitors`
- **Identified Issues:**
  - Synchronous mock fallbacks trigger when backend API takes longer than default timeout.

### 5. Brand Studio (`BrandStudioPage.tsx`)
- **Hook/Context:** `useBrainWise()`
- **API Client:** `apiClient.ts` (`getAssets`, `generateAsset`)
- **Backend Route:** `/api/v1/workspaces/:workspaceId/assets/*`
- **Service/Repo:** `brandStudioService.ts`, `logoDesignEngine.ts`, `vectorGlyphEngine.ts`
- **Database:** `workspaces/{id}/brandAssets`
- **Identified Issues:**
  - `BrandAsset.folder` type mismatch in TypeScript: `'Archived'` is present in client UI but excluded from `BrandAsset` union type.

### 6. Asset Library (`AssetLibraryPage.tsx`)
- **Hook/Context:** `useBrainWise()`
- **API Client:** `apiClient.ts` (`getAssets`, `deleteAsset`, `downloadAsset`)
- **Backend Route:** `/api/v1/workspaces/:workspaceId/assets/*`
- **Service/Repo:** `brandAssetRepository.ts`, `storageService.ts`
- **Database:** GCS bucket or `.brainwise_local_storage/`
- **Identified Issues:**
  - Unused Lucide icons imported causing ESLint warnings and typecheck noise.

### 7. Growth Planner / Director (`GrowthDirectorPage.tsx`)
- **Hook/Context:** `useBrainWise()`
- **API Client:** `apiClient.ts` (`getGoals`, `getTasks`, `getExperiments`)
- **Backend Route:** `/api/v1/workspaces/:workspaceId/(goals|tasks|experiments)`
- **Service/Repo:** `goalRepository.ts`, `taskRepository.ts`, `experimentRepository.ts`
- **Database:** `workspaces/{id}/(goals|tasks|experiments)`
- **Identified Issues:**
  - Cleanly wired; minor type discrepancies in `GrowthExperimentEntity`.

### 8. Analytics & Reports (`AnalyticsReportsPage.tsx`)
- **Hook/Context:** `useAnalyticsIntelligence(workspaceId)` from `src/utils/useAnalyticsIntelligence.ts`
- **API Client:** Direct inline `fetch()` inside hook
- **Backend Route:** `/api/v1/workspaces/:workspaceId/analytics/overview`
- **Service/Repo:** `analyticsRoutes.ts`, `metricCalculator.ts`, `executiveReportingEngine.ts`
- **Identified Issues:**
  - Token key mismatch (P0-07): Hook uses `localStorage.getItem('brainwise_token')` instead of `sessionStorage.getItem('brainwise_auth_token')`.
  - Silent swallow of network errors leading to empty UI rather than informative retry banners.

### 9. Help & Support (`SettingsHelpPages.tsx`)
- **Hook/Context:** `useBrainWise()`
- **API Client:** Static content & feedback simulation
- **Backend Route:** None required for static guides.

### 10. Settings & Billing (`SettingsHelpPages.tsx`)
- **Hook/Context:** `useBrainWise()`
- **API Client:** `apiClient.ts` (`getBillingBalance`, `createCheckoutSession`, `verifyPayment`)
- **Backend Route:** `/api/v1/workspaces/:workspaceId/billing/*`
- **Service/Repo:** `billingManager.ts`, `cashfreeProvider.ts`, `creditService.ts`
- **Database:** `workspaces/{id}/billingLedger`
- **Identified Issues:**
  - Cashfree provider runs in-memory simulation (P0-01).

---

## 3. Cross-Cutting Architectural Disconnects Summary

| Category | Finding | Impact | Proposed Remediation |
|---|---|---|---|
| **Auth Token Inconsistency** | `sessionStorage('brainwise_auth_token')` vs `localStorage('brainwise_token')` | Analytics requests fail with 401 in production | Standardize token key across context and hooks |
| **Workspace Context** | `/workspaces/current/` literal route in `aiClient.ts` | 404 on idea analysis and blueprint generation | Pass explicit `activeWorkspaceId` into all API calls |
| **Document Verification** | Response envelope mismatch between backend and React state | Uploaded document facts not populated into approval queue | Align backend payload to return `verificationItems` |
| **Database Persistence** | Silent fallback to `InMemoryDatabase` | Total data loss on container restart in production | Enforce fatal exception in production if Firestore is unavailable |
