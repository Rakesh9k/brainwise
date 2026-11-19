# BrainWise — Known Limitations & Prototype Boundaries
**Document ID:** `docs/design-freeze/11-known-limitations.md`  
**Version:** `1.0.0-frozen`  
**Date:** November 19, 2026  
**Auditor:** Product Quality Auditor & Senior Frontend Engineer  
**Status:** APPROVED (Phase G)

---

## 1. Prototype Scope vs Production Engineering

BrainWise v1.0 Design Freeze establishes the complete, validated UI/UX specification, component system, responsive architecture, and interaction states. In accordance with the project charter, the application operates as an interactive, fully validated prototype. 

The following architectural boundaries are formally documented:

### 1.1 Authentication & Session Management
- **Current Implementation**: Simulated authentication stored in browser `localStorage` (`brainwise_prototype_state_v1`). One-click demo login, password reset simulations, and email verification code checking (`482910` succeeds, `000000` demonstrates error state).
- **Production Requirement**: Engineering will integrate production OAuth2/OIDC, session cookies, password hashing (Argon2id/bcrypt), and JWT token refresh mechanisms.

### 1.2 AI Integration & Offline Fallbacks
- **Current Implementation**: Express backend provides `/api/ai/*` endpoints that proxy requests to Gemini (`@google/genai`). If `GEMINI_API_KEY` is not configured or an upstream timeout occurs, the frontend gracefully falls back to deterministic local template generators in `src/utils/logic.ts` (`buildDynamicDossier`, `buildLocalLogoConcepts`, `buildLocalSocialCreative`).
- **Production Requirement**: Engineering will connect production API keys, rate-limiting queues, streaming websockets/SSE, and server-side model telemetry.

### 1.3 State Persistence & Data Storage
- **Current Implementation**: Client-side reactive context (`BrainWiseContext.tsx`) persisted to browser `localStorage`.
- **Production Requirement**: Engineering will replace `localStorage` with a PostgreSQL/AlloyDB database, REST/GraphQL APIs, optimistic UI updates, and WebSocket multi-device synchronization.

### 1.4 Billing & Payment Processing
- **Current Implementation**: Plan upgrades ($49 Starter, $149 Growth, $399 Scale) and add-on purchases operate via simulated modals and instant state updates in the UI.
- **Production Requirement**: Engineering will integrate Stripe Checkout / Customer Portal webhooks and enforce server-side seat/usage quotas.

### 1.5 External Integrations (GitHub, Slack, Stripe, Google Analytics)
- **Current Implementation**: Integration toggles in Settings provide simulated authorization dialogs, webhook URL validation, and status pills.
- **Production Requirement**: Engineering will implement OAuth handshake flows, secure API token encryption, and background data synchronization workers.

---

## 2. Technical Non-Issues & Architectural Clarifications

1. **Vite Dynamic Import Warning**: Vite issues a notice regarding bundle sizes exceeding 500kB (`dist/assets/index-CuGZsqPS.js: 403 kB gzipped`). This is expected in a single-chunk prototype build and will be addressed during production engineering via route-based dynamic `import()` code-splitting.
2. **Deterministic Seed Data**: In offline mode, research dossiers parameterize dynamic TAM/SAM/SOM financial models from the founder's prompt and industry without falling back to generic placeholder coffee data.

---

## 3. Engineering Handoff Assurance
These prototype boundaries were intentionally designed so that **major backend and cloud engineering can begin immediately** without altering the UI components, layout structures, or design token definitions.
