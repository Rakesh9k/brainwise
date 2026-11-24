# BRAINWISE PHASE 1: BUSINESS KNOWLEDGE FOUNDATION
## Developer & Maintainer Guide

---

## 1. Architecture & Directory Blueprint

Phase 1 code is organized across clean, decoupled layers following the repository pattern:

```
src/
├── types/
│   ├── brainwise.ts                 # Frontend & shared business types (6 domains, BrandProfileData, etc.)
│   └── brain.ts                     # Core BusinessBrainData contract
│
├── server/
│   ├── types/
│   │   └── api.ts                   # Backend database entities & API request/response contracts
│   │
│   ├── repositories/
│   │   ├── businessProfileRepository.ts      # Profile, SWOT, operating hours, facts
│   │   ├── productRepository.ts              # Products & services, deduplication, catalogue import
│   │   ├── documentRepository.ts             # Uploaded business collateral metadata
│   │   ├── extractionJobRepository.ts        # Ingestion jobs & verification queue
│   │   ├── brandIdentityRepository.ts        # Brand palette, typography, voice, claims
│   │   └── businessBrainVersionRepository.ts # Immutable chronological version snapshots
│   │
│   ├── services/
│   │   ├── documentExtractionService.ts      # Gemini multimodal OCR & specialized deterministic parsers
│   │   ├── businessBrainService.ts           # Verification queue, fact elevation, gap analysis
│   │   ├── storageService.ts                 # GCS pre-signed URLs, tenant validation, MIME check
│   │   └── creditService.ts                  # Two-Phase Credit Reservation Protocol
│   │
│   ├── routes/v1/
│   │   └── businessProfileRoutes.ts          # Express router exposing all Phase 1 REST endpoints
│   │
│   ├── utils/
│   │   ├── ssrfValidator.ts                  # Private CIDR & cloud metadata blocking
│   │   └── truthCheck.ts                     # Deterministic Truth Check & price grounding
│   │
│   └── phase1BusinessBrain.test.ts           # 14-scenario automated acceptance test suite
│
├── services/
│   └── apiClient.ts                 # Typed frontend HTTP client for all Business Brain routes
│
└── pages/app/
    └── BusinessBrainPage.tsx        # React 19 UI: 8 tabs, constellation, modals, fact elevation
```

---

## 2. Core Workflows Explained

### 2.1 Ingesting a Document (Menu, Price List, Collateral)
1. User selects a file in `BusinessBrainPage.tsx`.
2. Frontend requests a signed GCS upload URL via `apiClient.getUploadUrl()`.
3. File is uploaded directly to GCS at `workspaces/{workspaceId}/documents/{timestamp}-{file}`.
4. Frontend calls `apiClient.extractDocument({ documentId, storagePath, fileName, mimeType })`.
5. Backend:
   - Reserves 3 credits via `creditService.reserveCredits()`.
   - Passes document to `documentExtractionService.processDocument()`.
   - Runs multimodal Gemini 2.5 Flash prompt or specialized deterministic parser (CSV, Menu, Salon, Text).
   - Identifies products/services, performs duplicate detection against existing catalog.
   - Enqueues facts with $<100\%$ confidence into `verificationQueue`.
   - Settles credits with `creditService.settleCredits()`.
   - Returns structured extraction data, job ID, and follow-up gap questions.

### 2.2 Ingesting a Website URL
1. User provides a website URL (e.g. `https://apexroasters.com`).
2. Backend validates URL via `validateSafeExternalUrl()`:
   - Rejects loopbacks, private CIDRs (`10.0.0.0/8`, `192.168.0.0/16`), and metadata servers (`169.254.169.254`).
3. If safe, fetches HTML with an 8-second timeout, strips HTML boilerplate, and extracts business identity, offerings, audience, and brand cues.
4. Generates verification queue items for user confirmation.

### 2.3 Approving Facts in the Verification Queue
1. Unconfirmed facts from documents/URLs sit in `workspaces/{workspaceId}/verificationQueue` with status `pending`.
2. Founder reviews item in the "Verification Queue" tab in `BusinessBrainPage.tsx`.
3. Founder can:
   - **Approve:** `apiClient.verifyQueueItem(itemId, { action: 'approve' })`.
   - **Edit & Approve:** `apiClient.verifyQueueItem(itemId, { action: 'edit', editedValue: { ... } })`.
   - **Reject:** `apiClient.verifyQueueItem(itemId, { action: 'reject' })`.
4. Approved/edited facts are merged directly into the active Business Brain with provenance tag `USER_CONFIRMED`.

---

## 3. How to Extend the Business Knowledge Foundation

### Adding a New Field to a Domain
1. **Update Types:**
   - In `src/server/types/api.ts`: Add field to target entity (e.g., `packagingType?: string` on `ProductEntity`).
   - In `src/types/brainwise.ts`: Mirror the type definition for frontend typing.
2. **Update Extraction Schemas:**
   - In `src/server/services/documentExtractionService.ts`: Add the field to the extraction prompt and deterministic fallback parsers.
3. **Update Repository & Service:**
   - If field requires custom indexing or deduplication, update `src/server/repositories/productRepository.ts` or `businessProfileRepository.ts`.
4. **Update Frontend UI:**
   - In `src/pages/app/BusinessBrainPage.tsx`: Add input field to the corresponding modal (e.g. `Add Offering Modal`).
5. **Add Automated Test:**
   - In `src/server/phase1BusinessBrain.test.ts`: Assert that the new field is extracted, verified, and saved cleanly.

---

## 4. Verification & Testing Commands

| Command | Purpose | Expected Result |
| :--- | :--- | :--- |
| `npx tsx --test src/server/phase1BusinessBrain.test.ts` | Runs Phase 1 Acceptance Suite | **15/15 tests pass (0 failures)** |
| `npm test` | Runs all 209 tests across all 14 departments | **209/209 tests pass (0 failures)** |
| `npm run typecheck` | Validates TypeScript compilation (`tsc --noEmit`) | **0 errors** |
| `npx eslint src/server/services/documentExtractionService.ts --quiet` | Verifies linter compliance | **0 errors** |
| `npm run build` | Builds Vite frontend bundle and esbuild backend bundle | **dist/ produced cleanly** |
