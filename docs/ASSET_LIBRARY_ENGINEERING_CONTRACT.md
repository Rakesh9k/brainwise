# BRAINWISE ASSETLIBRARY — MANDATORY ENGINEERING EXECUTION CONTRACT

> **Status:** RATIFIED & PERMANENTLY ENFORCED  
> **Scope:** Brand Asset Operating System (AssetLibrary), BrandStudio, Print & Packaging, and adjacent AI subsystems  
> **Target Workspace:** `d:\brainwise pro\brainwise (1)`

---

## The 20 Mandatory Execution Directives

For every AssetLibrary development phase and enhancement, the engineering team and AI assistants must strictly follow this 20-step protocol:

1. **Inspect Before Modifying:** Always inspect the existing implementation and contracts in the codebase before writing or editing code.
2. **Phase-Specific Gap Report:** Produce a concise gap analysis comparing current functionality against requirements.
3. **Identify Reusable Assets:** Reuse existing services (`brandAssetRepository`, `businessBrainService`, `brandGuardianService`, `printPackagingService`, `storageService`), API schemas, and Firestore collections.
4. **Repository-Grounded Plan:** Formulate an implementation plan based on actual repository findings, never on assumptions.
5. **Complete Implementation:** Implement all approved functionality completely without leaving placeholder stubs.
6. **End-to-End Connectivity:** Connect frontend UI, backend Express routes, Firestore database collections, and storage layers.
7. **Zero Hardcoded Sample Data in Production:** Never use hardcoded mock data as production functionality.
8. **Zero Mocked AI in Production Paths:** Use live AI orchestration or deterministic heuristics; never mock AI in live user flows.
9. **Zero Non-Functional UI:** Never leave disabled, non-functional, or "coming soon" buttons in production interfaces.
10. **Preserve Existing Data & State:** Ensure backward compatibility and zero data loss across migrations.
11. **Comprehensive UI States:** Implement appropriate loading skeletons, error banners, empty states, and success toasts.
12. **Multi-Tenant Isolation & RBAC:** Enforce `workspaceId` tenant barriers and 5-tier RBAC (`guest`, `viewer`, `member`, `admin`, `owner`).
13. **Automated Test Coverage:** Accompany all features with unit, integration, and end-to-end regression tests in `src/server/*.test.ts`.
14. **Build & Type Checking Verification:** Verify `npm run build` (Vite client and Esbuild server) compiles with 0 errors.
15. **Regression Elimination:** Immediately detect and fix any regressions in existing test suites.
16. **Change Documentation:** Document all modified files, API contracts, schemas, and external dependencies.
17. **Transparent Status Reporting:** Report precisely what is implemented, what is partially implemented, and what remains.
18. **Empirical Evidence:** Provide verifiable test logs, durations, and output evidence rather than unverified assertions.
19. **No Silently Skipped Requirements:** Address edge cases, error modes, and difficult constraints head-on.
20. **Phase Acceptance Gate:** Never advance to subsequent development phases until all acceptance criteria of the current phase are satisfied.

---

## Blockers & External Dependencies Protocol

If an external API, credential, permission, or infrastructure dependency prevents full implementation:
1. Document the exact blocker, endpoint, and required credential in the audit report.
2. Complete all independent local, database, and business logic paths safely.
3. Provide automated fallback handlers (e.g. local filesystem fallback for GCS, deterministic rule engines when API keys are unmounted).
4. Never claim success without live or automated verification.

---

## Universal Definition of DONE

> **A feature is complete ONLY when its user interface, backend logic, persistence, authorization, error handling, and relevant automated tests work together seamlessly with zero regressions.**
