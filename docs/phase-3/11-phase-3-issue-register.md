# BRAINWISE — PHASE 3: MASTER ISSUE REGISTER

**Document ID:** `BW-PHASE3-11`  
**Date:** November 19, 2026  
**Status:** Completed & Audited  
**Author:** Code Quality Auditor & Principal Engineer  

---

## 1. Issue Tracking Summary

During the Phase 3 Codebase Audit and Engineering Foundation setup, 13 engineering issues were cataloged, classified by severity, and addressed according to strict change management rules.

| Severity | Total | Resolved in Phase 3 | Scheduled for Phase 4 |
| :--- | :---: | :---: | :---: |
| **Critical** | 0 | 0 | 0 |
| **High** | 6 | 5 | 1 |
| **Medium** | 5 | 4 | 1 |
| **Low** | 2 | 2 | 0 |
| **Total** | **13** | **11** | **2** |

---

## 2. Detailed Issue Records

### Issue BW-P3-001
- **Severity:** High
- **File / Area:** Root Workspace (`.git`)
- **Description:** Prototype was exported from Google AI Studio as an unversioned directory without an active Git repository.
- **Impact:** Inability to track changes, establish branches, or maintain production/development histories.
- **Remediation:** Initialized Git repository with `main` baseline commit (`chore: preserve original BrainWise AI Studio prototype`) and established permanent `develop` branch.
- **Status:** **RESOLVED**
- **Verification:** `git status` and `git branch -a` verify `main` and `develop` active.

---

### Issue BW-P3-002
- **Severity:** Medium
- **File / Area:** `src/components/ui/`, `src/pages/app/`, `src/utils/`
- **Description:** 8 unused identifier imports flagged by TypeScript strict unused checks (`--noUnusedLocals`).
- **Impact:** Code bloat and potential confusion regarding component dependencies.
- **Remediation:** Removed unused identifiers:
  - `ContextualActionLedger.tsx`: `FileText`, `typeClass`
  - `DesignSystem.tsx`: `CheckCircle2`, `Clock`
  - `AnalyticsReportsPage.tsx`: `BarChart3`
  - `BrandStudioPage.tsx`: `Layers`
  - `CompetitiveIntelligencePage.tsx`: `CompetitorProfileData`
  - `strategicMemory.test.ts`: `FATIGUE_THRESHOLD`
- **Status:** **RESOLVED**
- **Verification:** `npx tsc --noEmit` compiles with 0 warnings.

---

### Issue BW-P3-003
- **Severity:** Low
- **File / Area:** `package.json` (`typescript`)
- **Description:** Pre-release / canary version `"typescript": "^7.0.2"` caused upstream incompatibility with `typescript-eslint`.
- **Impact:** ESLint flat config crashed on startup due to unsupported TS API.
- **Remediation:** Pinned `typescript` to stable `~5.8.2`, which is fully supported by React 19, Vite 8, and typescript-eslint.
- **Status:** **RESOLVED**
- **Verification:** ESLint and TypeScript compiler both execute without error.

---

### Issue BW-P3-004
- **Severity:** Medium
- **File / Area:** `src/utils/logic.ts` (lines 709–710)
- **Description:** Variables `trajectoryLabel` and `trajectoryTone` were initialized with default string values that were unconditionally overwritten by all branches of an exhaustive `if/else` block.
- **Impact:** Flagged as `no-useless-assignment` by ESLint.
- **Remediation:** Declared variables with explicit types without redundant initial assignments.
- **Status:** **RESOLVED**
- **Verification:** ESLint passes with 0 errors.

---

### Issue BW-P3-005
- **Severity:** Low
- **File / Area:** `vite.config.ts` (lines 22, 33)
- **Description:** Usage of `__dirname` triggered Vite 8 config deprecation warning regarding native config loading.
- **Impact:** Warning logged on every build execution.
- **Remediation:** Replaced `__dirname` with `import.meta.dirname ?? path.resolve('.')`.
- **Status:** **RESOLVED**
- **Verification:** `npm run build` executes without warnings.

---

### Issue BW-P3-006
- **Severity:** High
- **File / Area:** Root Configuration (`eslint.config.js`, `.prettierrc`, `.prettierignore`)
- **Description:** Complete absence of standardized linting and formatting configuration files in the project root.
- **Impact:** Risk of inconsistent code styles, formatting churn in PRs, and untracked code defects.
- **Remediation:** Created ESLint 9 flat configuration (`eslint.config.js`) and standard `.prettierrc` / `.prettierignore`.
- **Status:** **RESOLVED**
- **Verification:** `npm run lint` and `npm run format:check` pass cleanly.

---

### Issue BW-P3-007
- **Severity:** High
- **File / Area:** `package.json` (`scripts`)
- **Description:** `scripts` contained only minimal defaults (`dev`, `build`, `start`, `preview`, `clean`, `lint`).
- **Impact:** Incomplete developer workflows and absence of test/formatting scripts.
- **Remediation:** Added `typecheck`, `lint:fix`, `format`, `format:check`, `test`, `test:watch`, `test:e2e`, and `validate`.
- **Status:** **RESOLVED**
- **Verification:** `npm run validate` runs all quality gates in sequence and exits 0.

---

### Issue BW-P3-008
- **Severity:** Low
- **File / Area:** `src/utils/truthCheck.ts` (line 32)
- **Description:** Unnecessary escape character `\$` inside regex character class `[\$₹€£]`.
- **Impact:** Flagged as `no-useless-escape` by ESLint.
- **Remediation:** Updated character class to `[$₹€£]`.
- **Status:** **RESOLVED**
- **Verification:** All 4 truthCheck unit tests pass; ESLint passes.

---

### Issue BW-P3-009
- **Severity:** High
- **File / Area:** `src/config/env.ts`, `src/config/env.test.ts`
- **Description:** Lack of runtime environment validation and safe separation between client and server configuration.
- **Impact:** Risk of runtime crashes due to missing variables or inadvertent secret exposure on client.
- **Remediation:** Implemented `getClientConfig()` and `validateServerConfig()` with unit tests.
- **Status:** **RESOLVED**
- **Verification:** `src/config/env.test.ts` passes.

---

### Issue BW-P3-010
- **Severity:** High
- **File / Area:** `src/services/apiClient.ts`, `src/services/apiClient.test.ts`
- **Description:** Direct API invocations lacked a centralized, typed client with timeout handling and auth token injection.
- **Impact:** Risk of fragmented network error handling and inconsistent header injection.
- **Remediation:** Created `BrainWiseApiClient` singleton with typed endpoints matching Phase 2 contracts.
- **Status:** **RESOLVED**
- **Verification:** `src/services/apiClient.test.ts` passes.

---

### Issue BW-P3-011
- **Severity:** Medium
- **File / Area:** `.github/workflows/ci.yml`, `.github/`
- **Description:** Absence of automated CI quality pipeline and GitHub issue/PR templates.
- **Impact:** Inability to automatically enforce quality gates on pull requests.
- **Remediation:** Created `ci.yml` workflow, PR template, and bug/feature issue templates.
- **Status:** **RESOLVED**
- **Verification:** Workflow configured with Node 22, npm cache, audit, lint, format, test, and build.

---

### Issue BW-P3-012
- **Severity:** High
- **File / Area:** `src/context/BrainWiseContext.tsx`
- **Description:** Monolithic 1,229-line state container persisting prototype data (Solstice Coffee) in `localStorage` under key `brainwise_prototype_state_v1`.
- **Impact:** Client state can be tampered with in browser tools; all domain updates trigger global context re-renders.
- **Remediation:** Scheduled for Phase 4: decompose into modular domain hooks and connect authoritative state to Firestore multi-tenant collections.
- **Status:** **SCHEDULED_PHASE4** (Documented in `BW-PHASE3-08`)
- **Verification:** Architectural plan established in Phase 2 & Phase 3 docs.

---

### Issue BW-P3-013
- **Severity:** Medium
- **File / Area:** `dist/assets/index-*.js`
- **Description:** Single uncompressed JavaScript bundle is `1,484.99 kB` (407.77 kB gzipped) due to monolithic chunking of Recharts, Motion, and Lucide.
- **Impact:** Slower initial page load on slow mobile connections.
- **Remediation:** Scheduled for Phase 4: implement `React.lazy()` dynamic code splitting for department routes.
- **Status:** **SCHEDULED_PHASE4** (Documented in `BW-PHASE3-10`)
- **Verification:** Documented with code example in `BW-PHASE3-10`.
