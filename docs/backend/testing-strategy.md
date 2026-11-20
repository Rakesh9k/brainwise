# BrainWise Testing Strategy & Quality Assurance Architecture

## 1. Multi-Tier Testing Pyramid
BrainWise implements a comprehensive automated testing suite guaranteeing that every PR, build, and deployment satisfies rigorous functional, architectural, and security invariants.

```
       / \
      / E2E \       End-to-End API Integration Tests (apiIntegration.test.ts)
     /-------\
    / Security\     Multi-Tenant Workspace Isolation & Storage Rejections
   /-----------\
  / Integration \   Firestore Transaction Rollbacks, Two-Phase Credit Protocol
 /---------------\
/   Unit Tests    \ Typography, Design Tokens, Truth Check, Anti-Fatigue, Helpers
-------------------
```

---

## 2. Test Suite Breakdown

### 2.1 Backend Server Test Suites (`src/server/*.test.ts`)
1. **`auth.test.ts`:**
   - 401 unauthenticated request rejection.
   - Malformed/empty bearer token rejection.
   - Dev/test token authentication and profile hydration.
2. **`workspaceIsolation.test.ts`:**
   - Strict cross-workspace boundary enforcement.
   - 403 Forbidden on foreign workspace business profiles, tasks, assets, and storage prefixes.
3. **`database.test.ts`:**
   - Collection and subcollection CRUD.
   - Query filters, inequality clauses, limits.
   - Atomic transaction commit on success and rollback on simulated failure.
4. **`businessBrain.test.ts`:**
   - Persistent business model hydration.
   - Fact provenance status (`USER_CONFIRMED`).
   - Anti-fatigue theme tracking and explicit exclusion enforcement.
5. **`credits.test.ts`:**
   - Two-Phase Reservation Protocol (hold -> commit).
   - Insufficient balance rejection.
   - Automatic refund and hold release on simulated failure.
6. **`storage.test.ts`:**
   - Signed upload and download URL generation.
   - Workspace prefix enforcement.
   - Size limit validation.
   - **Absolute rejection of video MIME types**.
7. **`aiJobs.test.ts`:**
   - Asynchronous job state transitions (`QUEUED` -> `RUNNING` -> `COMPLETED`).
   - Status polling and cancellation with credit refund.
8. **`apiIntegration.test.ts`:**
   - End-to-end workspace lifecycle, goal creation, competitor tracking, credit provisioning, and legacy prototype state migration.

### 2.2 Frontend Client Test Suites (`src/components/`, `src/theme/`, `src/utils/`)
- 79 unit tests covering:
  - Contextual ledger and dialog positioning/accessibility.
  - Empty state and liquid skeleton rendering.
  - Growth trend chart math and metric formatting.
  - Design tokens, spacing, typography modular scale ratios.
  - Truth check price hallucination detection and brand exclusion safeguards.
  - Strategic memory angle frequency and theme fatigue calculations.

---

## 3. Continuous Integration Verification Pipeline
The command `npm run validate` executes the entire verification pipeline sequentially:
```bash
npm run typecheck && npm run lint && npm run format:check && npm test && npm run build
```
- **Typecheck:** `tsc --noEmit` verifies strict TypeScript type correctness.
- **Lint:** ESLint enforces coding standards and prohibits dangerous patterns.
- **Format:** Prettier verifies code formatting style consistency.
- **Test:** Native Node.js test runner (`tsx --test`) executes all 92 tests.
- **Build:** Vite compiles client bundle into `dist/` with tree shaking and minification.
