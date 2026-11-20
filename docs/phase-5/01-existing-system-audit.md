# BrainWise Phase 5 — Existing Codebase Audit & Technical Implementation Plan

## 1. Audit Methodology & Scope
A comprehensive inspection of the BrainWise repository (`d:\brainwise pro\brainwise (1)`) was conducted to evaluate existing capabilities across Authentication, Conversational Onboarding, Business Brain generation, Database schemas, API endpoints, State management, and Automated testing.

---

## 2. Technical Classification Matrix

| Component / Layer | Existing File Location | Status | Current Reality & Gaps | Action Plan for Phase 5 |
| :--- | :--- | :--- | :--- | :--- |
| **Authentication UI** | `src/pages/public/AuthPages.tsx` | **PARTIALLY IMPLEMENTED** | UI supports `signup`, `verify-email`, `login`, `forgot-password`, `reset-password`. However, form submission uses `window.setTimeout` mock simulations (`loginDemo`), and email verification tests a mock 6-digit code (`000000` test). | Connect to real backend auth API endpoints (`/api/v1/auth/*`), real password hashing/verification, real verification tokens, password reset handling, and session persistence. |
| **Backend Auth API** | `src/server/routes/v1/authRoutes.ts` | **PARTIALLY IMPLEMENTED** | Has `authenticateToken` middleware and `/me`, `/switch-workspace`. Lacks public auth endpoints: `/register`, `/login`, `/verify-email`, `/resend-verification`, `/forgot-password`, `/reset-password`, `/delete-account`. | Implement complete auth controller with real token generation, secure session management, and cascading account deletion. |
| **User Data Model** | `src/server/repositories/userRepository.ts`, `src/server/types/api.ts` | **PARTIALLY IMPLEMENTED** | `UserEntity` has basic fields (`uid`, `email`, `displayName`, `preferences`, `activeWorkspaceId`). Lacks explicit `onboardingStatus` state machine tracking and email verification lifecycle timestamps. | Extend `UserEntity` with `onboardingStatus` (`NOT_STARTED` to `COMPLETED`), `emailVerified`, `passwordHash` (for password auth), and verification tokens. |
| **Onboarding UI** | `src/pages/public/OnboardingPage.tsx` | **PARTIALLY IMPLEMENTED** | Has a 5-step wizard with role/goals/business details/competitors and a progress animation. Lacks conversational 3-stage dialogue, adaptive follow-ups by business type (consumer vs service vs tech vs local), auto-save per answer, and review/approval screen. | Upgrade onboarding experience into an intelligent, conversational 3-stage dialogue with adaptive branching, real-time autosave to backend session, and seamless resume capability. |
| **Onboarding State Machine** | None | **NOT IMPLEMENTED** | No backend session entity or repository tracking onboarding progress across browser sessions. | Implement `OnboardingSessionEntity`, `onboardingRepository`, and `/api/v1/onboarding/*` endpoints (`/session`, `/save-answer`, `/resume`, `/complete`). |
| **Business Brain Schema** | `src/types/brainwise.ts`, `src/server/types/api.ts` | **PARTIALLY IMPLEMENTED** | Core schema exists with offerings, audience, positioning, provenance, and strategic memory. | Formalize canonical Phase 5 schema (`identity`, `location`, `offerings`, `audience`, `positioning`, `objectives`, `digitalPresence`, `businessModel`, `intelligence`, `metadata`) with Zod validation. |
| **AI Business Brain Pipeline** | `src/server/services/aiOrchestrationService.ts`, `businessBrainService.ts` | **PARTIALLY IMPLEMENTED** | AI orchestration exists for content generation. Lacks structured onboarding extraction pipeline, confidence scoring, assumption tagging, and missing information gap detection. | Implement `generateBusinessBrainFromOnboarding()` in `businessBrainService.ts` using Gemini with schema enforcement, fact provenance tagging, and gap analysis. |
| **Business Brain Review & Approval** | `src/pages/app/BusinessBrainPage.tsx` | **PARTIALLY IMPLEMENTED** | View/edit tabs exist on dashboard, but no pre-approval review interface between onboarding and dashboard. | Implement conversational review screen ("Your Business Brain is taking shape"), section editing, fact verification, and "Approve Business Brain" transition. |
| **Version History & Regeneration** | `src/server/repositories/businessProfileRepository.ts` | **PARTIALLY IMPLEMENTED** | Has basic history array. Lacks dedicated version entity (`business_brain_versions`), conflict detection during regeneration, and version restoration endpoint. | Implement `businessBrainVersionRepository`, `/regenerate`, `/versions`, and `/versions/:versionId/restore`. |
| **Account Deletion** | None | **NOT IMPLEMENTED** | No account deletion flow or cascading resource cleanup. | Implement `DELETE /api/v1/auth/account` with complete cascade across user profile, workspaces, memberships, brains, assets, and audit logs. |
| **Automated Tests** | `src/server/*.test.ts` (13 tests), `src/**/*.test.ts` (92 tests) | **COMPLETE FOR PHASE 4** | 92 existing tests pass. Phase 5 test suite needs to be written for Auth, Conversational Onboarding, Brain Generation, Approval, Versioning, and Deletion. | Implement comprehensive test suites in `src/server/phase5_*.test.ts`. |

---

## 3. Subphase Execution Plan
- **PHASE 5B:** Real Authentication Infrastructure & Account Management.
- **PHASE 5C:** User State Machine, Onboarding Session Engine & Protected Routing.
- **PHASE 5D & 5E:** Conversational Onboarding Engine with Adaptive Branching & Auto-Save.
- **PHASE 5F:** AI Business Brain Generation Pipeline with Provenance & Gap Analysis.
- **PHASE 5G:** Business Brain Review, Editing, and Approval Interface.
- **PHASE 5H:** Business Brain Management, Living Profiles & Version History.
- **PHASE 5I:** Multi-Tenant Isolation & Cascading Account Deletion.
- **PHASE 5J:** Comprehensive Automated Testing, Verification Pipeline & Documentation.
