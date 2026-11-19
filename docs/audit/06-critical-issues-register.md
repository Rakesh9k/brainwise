# BRAINWISE — MASTER INDEPENDENT AUDIT
# MASTER ISSUE & RISK REGISTER

**Document ID:** `docs/audit/06-critical-issues-register.md`  
**Audit Date:** November 19, 2026  
**Auditor:** Application Security Lead, Principal Software Engineer, Enterprise QA Architect  
**Target Workspace:** `d:\brainwise pro\brainwise (1)`  
**Audit Status:** Active & Prioritized  

---

## 1. Issue Classification & Severity Matrix

Every issue discovered during the independent audit has been classified according to ISO/IEC 25010 and standard risk management protocols:

| Severity | Count | Blocking Phase 4? | Resolution Timeline |
| :--- | :---: | :---: | :--- |
| **Critical** | 0 | No | Zero critical defects found. |
| **High** | 1 | **Yes (Pre-flight)** | Must be resolved before live AI testing. |
| **Medium** | 4 | Conditional | 1 pre-flight (Git remote); 3 during Phase 4 implementation. |
| **Low** | 3 | No | Backlog / Phase 4 documentation updates. |
| **Total** | **8** | — | — |

---

## 2. Comprehensive Issue Records

### Finding AUD-FIND-001: Hardcoded Fictitious AI Model Identifier in Server Gateway
- **Finding ID:** `AUD-FIND-001`
- **Phase:** Phase 3 (Codebase Preparation & Environment)
- **Requirement:** Server must dynamically resolve the sanctioned Gemini model from environment variables (`process.env.GEMINI_MODEL`) to support configurable deployments.
- **Audit Result:** **FAIL**
- **Evidence:** `server.ts` line 18 contains `const GEMINI_MODEL = 'gemini-4-hydrogen';` instead of resolving from `process.env`.
- **Exact File Path:** `d:\brainwise pro\brainwise (1)\server.ts#L18`
- **Relevant Component / Configuration:** `server.ts` (Gemini API Gateway, lines 18, 150, 200, 545, 600)
- **Test Performed:** Static code inspection and search for `GEMINI_MODEL` usages across backend files.
- **Test Result:** Line 18 hardcodes `'gemini-4-hydrogen'`. This is a fictitious/placeholder model string from earlier prototypes. If live Gemini API calls are triggered via `@google/genai`, upstream Google servers will reject the request with `404 Not Found` or `INVALID_ARGUMENT`.
- **Risk:** High. Live AI calls will fail immediately when an actual `GEMINI_API_KEY` is provided.
- **Recommended Corrective Action:** Update `server.ts` line 18 to:
  ```typescript
  const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';
  ```
- **Phase 4 Blocking Status:** **BLOCKING PRE-FLIGHT FIX** (Required before Phase 4 AI testing).

---

### Finding AUD-FIND-002: Local Git Repository Lacks Configured Remote Origin
- **Finding ID:** `AUD-FIND-002`
- **Phase:** Phase 3 (Git & Version Control)
- **Requirement:** Repository should have a configured, accessible GitHub remote origin with branch protection policies.
- **Audit Result:** **PARTIAL**
- **Evidence:** Running `git remote -v` outputs an empty string. No remote origin is configured.
- **Exact File Path:** `d:\brainwise pro\brainwise (1)\.git\config`
- **Relevant Configuration:** Local Git repository configuration.
- **Test Performed:** `git remote -v`, `git branch -a`.
- **Test Result:** Local repository exists with clean `main` and `develop` branches, but has not been pushed to a remote GitHub repository.
- **Risk:** Medium. Absence of remote synchronization prevents GitHub Actions CI workflow (`.github/workflows/ci.yml`) from running on pull requests, and leaves code vulnerable to local disk failure.
- **Justification & Status:** Documented in `docs/phase-3/01-git-and-version-control.md` (Section 8) as awaiting repository owner creation of the private GitHub repository (`Rakesh9k/brainwise`).
- **Recommended Corrective Action:** Repository owner creates private repository on GitHub and runs:
  ```bash
  git remote add origin https://github.com/Rakesh9k/brainwise.git
  git push -u origin main
  git push -u origin develop
  ```
- **Phase 4 Blocking Status:** **BLOCKING PRE-FLIGHT ACTION** (Owner confirmation required).

---

### Finding AUD-FIND-003: ESLint Static Analysis Produces 7 Code Quality Warnings
- **Finding ID:** `AUD-FIND-003`
- **Phase:** Phase 3 (Code Quality & Development Standards)
- **Requirement:** Codebase should pass static analysis with 0 errors and 0 warnings to maintain strict type safety and predictable React hook lifecycle execution.
- **Audit Result:** **PARTIAL**
- **Evidence:** Executing `npm run lint` yields:
  ```
  ✖ 7 problems (0 errors, 7 warnings)
  ```
- **Exact File Paths:**
  1. `src/components/ui/ContextualActionLedger.tsx` (137:36): Unexpected `any` (`@typescript-eslint/no-explicit-any`).
  2. `src/components/ui/Overlay.tsx` (376:6): Missing dependencies `'navigate'` and `'setGlobalSearchOpen'` (`react-hooks/exhaustive-deps`).
  3. `src/context/BrainWiseContext.tsx` (262:9): `'navigate'` function changes on every render (`react-hooks/exhaustive-deps`).
  4. `src/context/BrainWiseContext.tsx` (1221:5): Missing callback dependencies in `useMemo` (`react-hooks/exhaustive-deps`).
  5. `src/pages/app/IdeaIntelligencePage.tsx` (161:6, 218:6): Missing dependencies in `useEffect` (`react-hooks/exhaustive-deps`).
  6. `src/pages/public/OnboardingPage.tsx` (88:6): Missing dependencies in `useEffect` (`react-hooks/exhaustive-deps`).
- **Test Performed:** `npm run lint` (`eslint src/ server.ts`).
- **Test Result:** 0 errors, 7 warnings logged.
- **Risk:** Low-to-Medium. Unmemoized callbacks could trigger unnecessary re-renders; `any` type bypasses TypeScript compiler safeguards.
- **Recommended Corrective Action:**
  1. Replace `any` in `ContextualActionLedger.tsx` with `Record<string, unknown>`.
  2. Wrap `navigate` in `useCallback` in `BrainWiseContext.tsx` or add missing dependencies to the dependency arrays.
- **Phase 4 Blocking Status:** **NON-BLOCKING** (Clean up during Phase 4 pre-flight).

---

### Finding AUD-FIND-004: Diagram 1 Annotation Drift (Next.js vs Vite SPA)
- **Finding ID:** `AUD-FIND-004`
- **Phase:** Phase 2 (Architecture Consistency)
- **Requirement:** System architecture diagrams must align exactly with Architecture Decision Records (ADRs) and physical implementation.
- **Audit Result:** **FAIL (Documentation Drift)**
- **Evidence:** `docs/phase-2/12-system-architecture-diagrams.md` (Diagram 1, line 24) labels the frontend client as `Browser[Next.js 16 / React 19 Frontend App]`.
- **Exact File Path:** `docs/phase-2/12-system-architecture-diagrams.md#L24` and `docs/phase-2/diagrams/01-overall-architecture.mmd#L24`.
- **Test Performed:** Grep search for `Next.js` and comparison against ADR-010.
- **Test Result:** ADR-010 explicitly approved Option 3: **Strict Client-Side Design Freeze using React 19 + Vite 8 SPA**. Diagram 1 retains legacy text from discarded Option 1.
- **Risk:** Low. Creates minor confusion for onboarding developers regarding the build toolchain.
- **Recommended Corrective Action:** Update Diagram 1 text to `Browser[React 19 / Vite 8 SPA Shell]`.
- **Phase 4 Blocking Status:** **NON-BLOCKING** (Documentation correction).

---

### Finding AUD-FIND-005: Monolithic Client JavaScript Bundle Chunk Size
- **Finding ID:** `AUD-FIND-005`
- **Phase:** Phase 3 (Build & Performance)
- **Requirement:** Production JavaScript chunks should be split logically to avoid large monolithic assets that degrade mobile time-to-interactive (TTI).
- **Audit Result:** **PARTIAL**
- **Evidence:** `npm run build` logs:
  ```
  dist/assets/index-B5vuAULO.js  1,484.99 kB │ gzip: 407.77 kB
  (!) Some chunks are larger than 500 kB after minification.
  ```
- **Exact File Path:** `vite.config.ts`, `src/App.tsx`
- **Test Performed:** `npm run build` (`vite build`).
- **Test Result:** Single uncompressed JavaScript bundle of 1.48 MB is generated.
- **Risk:** Medium. Increases initial network download time on slow 3G/4G connections.
- **Recommended Corrective Action:** In Phase 4, convert department route imports in `src/App.tsx` to `React.lazy()` dynamic imports, and configure `build.rolldownOptions.output.codeSplitting` in `vite.config.ts`.
- **Phase 4 Blocking Status:** **NON-BLOCKING** (Scheduled for Phase 4 performance optimization).

---

### Finding AUD-FIND-006: Client UI Pages Bound to Mock State in LocalStorage
- **Finding ID:** `AUD-FIND-006`
- **Phase:** Phase 3 (Frontend/Backend Separation)
- **Requirement:** Authoritative state (Business Brain, credits, subscriptions, workspaces) must be managed by the backend in Cloud Firestore rather than client `localStorage`.
- **Audit Result:** **PARTIAL (Planned Architectural Staging)**
- **Evidence:** `src/context/BrainWiseContext.tsx` (lines 152, 215) reads and writes state to `localStorage.getItem('brainwise_state_v1')`.
- **Exact File Path:** `src/context/BrainWiseContext.tsx`
- **Test Performed:** Code inspection of data mutation hooks in `BrainWiseContext.tsx`.
- **Test Result:** UI interactions currently mutate local React state seeded from `src/data/mockData.ts`.
- **Risk:** Low during Phase 3; unacceptable for production. User can manipulate balances via browser DevTools.
- **Justification & Status:** ADR-010 and `docs/phase-3/08-frontend-backend-boundaries.md` deliberately preserved client UI state in React 19 to maintain the Design Freeze, establishing that the replacement of mock state with typed API client hooks will take place during Phase 4.
- **Recommended Corrective Action:** During Phase 4, systematically replace `BrainWiseContext` mock handlers with custom React Query / SWR hooks calling `BrainWiseApiClient`.
- **Phase 4 Blocking Status:** **NON-BLOCKING** (Core purpose of Phase 4).

---

### Finding AUD-FIND-007: API Route Path Prefix Inconsistency (`/api/v1` vs `/api/`)
- **Finding ID:** `AUD-FIND-007`
- **Phase:** Phase 2 vs Phase 3 (API Contracts)
- **Requirement:** API contracts and local development proxy/server must use unified, versioned routing paths.
- **Audit Result:** **PARTIAL**
- **Evidence:** `docs/phase-2/07-api-contracts.md` specifies all endpoints with `/api/v1/...` prefix, while `server.ts` mounts endpoints directly under `/api/...` (e.g., `/api/ai/dossier`).
- **Exact File Path:** `server.ts` lines 146–850 vs `docs/phase-2/07-api-contracts.md`.
- **Test Performed:** Endpoint route comparison between `server.ts` and `07-api-contracts.md`.
- **Test Result:** Path mismatch between prototype Express gateway and Phase 2 specification.
- **Risk:** Medium. Frontend client requests targeting `/api/v1` will return `404 Not Found` if hitting local development `server.ts` without an alias or rewrite.
- **Recommended Corrective Action:** Update `server.ts` or Express router to mount endpoints under `/api/v1/...` to match the canonical specification.
- **Phase 4 Blocking Status:** **NON-BLOCKING** (Implement during Phase 4 backend build).

---

### Finding AUD-FIND-008: Super-Admin Portal (`/admin`) Missing Dedicated React Route
- **Finding ID:** `AUD-FIND-008`
- **Phase:** Phase 1 vs Phase 2 (Scope Coverage)
- **Requirement:** Department 14 specifies an internal Super-Admin Portal (`FEAT-ADM-001`) for platform operators.
- **Audit Result:** **PARTIAL**
- **Evidence:** `src/App.tsx` defines 19 routes for end-users, but does not include a route controller for `/admin`.
- **Exact File Path:** `src/App.tsx`
- **Test Performed:** Route search in `src/App.tsx`.
- **Test Result:** Route `/admin` is absent from client router.
- **Risk:** Low. Internal super-admin capabilities can be delivered via Cloud Console or a separate back-office bundle.
- **Recommended Corrective Action:** Implement dedicated internal admin view `/admin` under super-admin custom claims authentication during Phase 4.
- **Phase 4 Blocking Status:** **NON-BLOCKING**.
