# BRAINWISE — PHASE 3: FRONTEND & BACKEND RESPONSIBILITY SEPARATION

**Document ID:** `BW-PHASE3-08`  
**Date:** November 19, 2026  
**Status:** Approved Architectural Specification  
**Author:** Principal Software Engineer & Senior System Architect  

---

## 1. Executive Directive & Architectural Boundary

One of the most critical requirements of the BrainWise engineering foundation is enforcing an uncompromised boundary between browser-side functionality and privileged server-side operations.

**Core Rule:** The browser client is untrusted. No financial balance, credit decrement, payment validation, proprietary AI prompt, or multi-tenant authorization decision may ever be calculated or finalized by client-side JavaScript.

---

## 2. Responsibility Division Matrix

```
┌──────────────────────────────────────────────┐
│           CLIENT APPLICATION (React 19)      │
│  - UI Rendering & Tactile Micro-Interactions │
│  - Local Form State & Input Validation       │
│  - Navigation Shell & Breadcrumbs            │
│  - Motion Transitions & Skeleton Loaders     │
│  - CSV / JSON Client-side Export             │
│  - Rendering Verified Backend Responses      │
└──────────────────────┬───────────────────────┘
                       │ REST / Callable (Bearer Token)
                       ▼
┌──────────────────────────────────────────────┐
│        PRIVILEGED BACKEND GATEWAY            │
│  - Firebase Auth Token Verification          │
│  - Multi-Tenant Workspace Authorization      │
│  - Two-Phase Credit Reservation & Settlement │
│  - Cashfree / Razorpay Payment Verification  │
│  - Google Gemini AI Prompt Compilation       │
│  - Deterministic Truth Check & Safeguards    │
│  - Secret Management (Gemini, Cashfree keys) │
│  - Audit Logging & Cloud Task Scheduling     │
└──────────────────────────────────────────────┘
```

### 2.1 Detailed Responsibility Breakdown

| Capability | Frontend Client Responsibility | Backend Server Responsibility |
| :--- | :--- | :--- |
| **Authentication** | Renders login/signup UI, captures user credentials, retrieves Firebase ID token, handles token refresh. | Validates token signature with Firebase Admin SDK, extracts `uid` and workspace memberships. |
| **Workspace Authorization** | Stores active `workspaceId` in routing state. | Validates user membership in `workspaces/{workspaceId}/members/{uid}` with Firestore security rules. |
| **AI Generation** | Collects user prompt parameters, dispatches typed request via `apiClient`, renders streaming/completed output. | Injects business brain context, compiles system prompts, executes Gemini API call via `@google/genai`, runs Truth Check. |
| **Truth & Safety Checks** | Displays verified badges or rejection alerts to user. | Executes `executeTruthCheck()`, scans for price hallucinations, triggers automated credit refunds if unverified. |
| **Credits & Billing** | Displays current balance and transaction history in UI. | Performs atomic two-phase reservation (`PENDING`) -> deduction (`SETTLED`) in Firestore transactions (ADR-006). |
| **Payment Orders** | Renders payment plan selectors, triggers payment gateway SDK. | Creates signed payment order with Cashfree, validates webhook signature, grants subscription credits. |
| **Asset Storage** | File input picker, displays generated SVG/PNG assets. | Generates signed GCS upload URLs, enforces file size/MIME type quotas, serves cached collateral. |

---

## 3. Department Service Boundaries

To prepare for Phase 4 modular development without premature microservice complexity, backend logic is partitioned into clean, cohesive service boundaries matching the 14 departments:

1. **Auth & Identity Service:** User signup, email verification, password reset, session verification.
2. **Workspace & Tenant Service:** Multi-tenant workspace provisioning, member roles, tenant isolation.
3. **Business Brain Service:** Canonical fact management, fact provenance (`USER_CONFIRMED` vs `AI_INFERRED`), exclusion rules.
4. **Research & Idea Intelligence Service:** Market sizing calculations, dossier generation, industry synthesis.
5. **Competitive Intelligence Service:** Competitor tracking, perceptual coordinate mapping, complaint clustering.
6. **Market Watch Service:** Market signals, scenario simulation models.
7. **Brand Studio Service:** Brand identity tokens, CSS/JSON export, SVG asset generation.
8. **Growth Director Service:** Sprint task management, strategic memory tracking, anti-fatigue checks.
9. **Analytics & Performance Service:** Revenue metrics aggregation, report compilation, executive summaries.
10. **Credit & Billing Service:** Atomic reservations, quota tracking, Cashfree checkout integration.
11. **Notifications Service:** User alerts, high-impact intelligence feeds.
12. **Asset Library Service:** Vector SVG collateral storage, stationery export.

---

## 4. Frontend API Client Service Layer (`src/services/apiClient.ts`)

Direct `fetch()` calls scattered across UI components are strictly forbidden. All external network interactions pass through `BrainWiseApiClient`:

```typescript
import { apiClient } from '@/services/apiClient';

// Example: Dispatching AI Dossier request through typed client
try {
  const { report, model } = await apiClient.generateDossier({
    ideaSummary: 'Premium cold brew delivery',
    industry: 'Food & Beverage',
    targetMarket: 'Urban professionals',
    geography: 'United States',
    depth: 'comprehensive',
    brain: currentBrainData,
  });
  console.log(`Dossier generated using model ${model}`);
} catch (error) {
  if (error instanceof ApiError) {
    // Standardized HTTP status and error code handling
    handleApiError(error.status, error.code, error.message);
  }
}
```

---

## 5. Phase 4 Integration Hand-Off

During Phase 4, the mock action handlers in `src/context/BrainWiseContext.tsx` will be wired to `apiClient` methods. UI components will not require structural rewrites, preserving the React 19 Design Freeze in full.
