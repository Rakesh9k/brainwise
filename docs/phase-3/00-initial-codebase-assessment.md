# BRAINWISE — PHASE 3: INITIAL CODEBASE ASSESSMENT

**Document ID:** `BW-PHASE3-00`  
**Date:** November 19, 2026  
**Status:** Completed  
**Author:** Principal Software Engineer & Engineering Architecture Team  

---

## 1. Executive Summary

This assessment establishes the technical and architectural baseline of the BrainWise workspace located at `d:\brainwise pro\brainwise (1)`. The application originated as an approved prototype built and exported from Google AI Studio. The goal of Phase 3 is to transform this prototype into a clean, maintainable, secure, production-oriented engineering foundation while strictly preserving the approved visual design, responsive layout, animations, and user experience.

The baseline audit confirms that the application is built on a modern **Vite 8 + React 19 + TypeScript 7 + Tailwind CSS v4** stack, supported by a server-side Express runtime (`server.ts`) managing privileged Google Gemini AI calls via `@google/genai`. All 74 existing unit tests pass, and the production build compiles cleanly without errors.

---

## 2. Environment & System Identification

| Property | Detected Value | Notes |
| :--- | :--- | :--- |
| **Project Location** | `D:\brainwise pro\brainwise (1)` | Windows local filesystem workspace |
| **Initial Git State** | Unversioned directory (`.git` absent) | No upstream remote was configured |
| **Baseline Git Setup** | Initialized repository with `main` and `develop` | Baseline commit: `chore: preserve original BrainWise AI Studio prototype` |
| **Framework** | Vite 8.3.8 + React 19 SPA | Fast, modern ESM-native bundler |
| **React Version** | `19.0.1` (`react-dom` 19.0.1, `react-is` 19.3.1) | React 19 concurrent features |
| **TypeScript Version** | `7.0.2` (`@types/react` 19.3.0, `@types/node` 22.14.0) | Target: ES2022, moduleResolution: bundler |
| **Package Manager** | npm (`package-lock.json` primary; legacy `bun.lock` present) | Standard npm toolchain |
| **Build System** | Vite 8 (`@vitejs/plugin-react` 6.1.1, `@tailwindcss/vite` 4.3.3) | Bundles CSS and TSX in <500ms |
| **Server Runtime** | Node.js + Express 4.21.2 (`server.ts` executed via `tsx`) | Hybrid dev server / API gateway |
| **Styling Engine** | Tailwind CSS v4 (`@tailwindcss/vite` 4.3.3) + `src/index.css` | Design tokens in `src/design/tokens.ts` |
| **Motion & Animation** | Motion 12.23.24 (`motion/react`) | Custom liquid physics & department transitions |
| **Icons & Visuals** | Lucide React 0.546.0 | Vector SVG icons |
| **Data Visualization** | Recharts 3.11.0 | Accessible SVG charts (e.g., GrowthTrendChart) |
| **AI Integration** | `@google/genai` 2.4.0 (Server-side only in `server.ts`) | Model: `gemini-4-hydrogen` / `gemini-2.5-flash` |
| **Test Infrastructure** | Node.js Test Runner (`node:test` via `tsx --test`), Playwright 1.65.1 | 74 unit tests passing, e2e audit script ready |

---

## 3. Application Architecture & Entry Points

### 3.1 Entry Point Hierarchy
1. **Client HTML:** `index.html` loads Google Fonts (`Inter`, `Cinzel`, `Playfair Display`), viewport metadata, and mounts root element `<div id="root"></div>`.
2. **Client Bootstrap:** `src/main.tsx` renders `<App />` into `#root` with React 19 `createRoot`.
3. **Application Root:** `src/App.tsx` wraps the router in `BrainWiseProvider` and `ContextualActionLedgerProvider`.
4. **Server Entry Point:** `server.ts` mounts Express, JSON body parsing (1MB limit), live AI endpoints, and attaches Vite dev middleware in development or serves `dist/` static files in production.

### 3.2 Routing Architecture
BrainWise uses a deterministic state-driven router defined in `src/App.tsx` and managed via `BrainWiseContext.tsx`:
- **Public Routes (7):**
  - `landing` (`LandingPage.tsx`)
  - `signup`, `verify-email`, `login`, `forgot-password`, `reset-password` (`AuthPages.tsx`)
  - `onboarding` (`OnboardingPage.tsx`)
- **App Routes (13 Departments/Views):**
  - `dashboard` (`DashboardPage.tsx`)
  - `business-brain` (`BusinessBrainPage.tsx`)
  - `idea-intelligence` (`IdeaIntelligencePage.tsx`)
  - `competitive-intelligence` (`CompetitiveIntelligencePage.tsx`)
  - `market-watch` (`MarketWatchPage.tsx`)
  - `brand-studio` (`BrandStudioPage.tsx`)
  - `asset-library` (`AssetLibraryPage.tsx`)
  - `growth-director` (`GrowthDirectorPage.tsx`)
  - `tasks-experiments` (`GrowthDirectorPage.tsx` mode `tasks`)
  - `business-performance` (`AnalyticsReportsPage.tsx` tab `overview`)
  - `reports` (`AnalyticsReportsPage.tsx` tab `reports`)
  - `settings` (`SettingsHelpPages.tsx`)
  - `help-support` (`SettingsHelpPages.tsx`)

Transitions between app routes are animated via `DepartmentTransition` (`src/components/motion/LiquidMotion.tsx`).

---

## 4. Component & Design System Architecture

### 4.1 Directory Structure Breakdown
```
src/
├── assets/images/              # Curated marketing photography
├── components/
│   ├── landing/                # Interactive device mockups & journal sections
│   ├── motion/                 # Liquid physics, department transitions, motion primitives
│   ├── shell/                  # ApplicationShell, Sidebar, Header, Breadcrumbs
│   └── ui/                     # Shared UI components (DataTable, Dialog, EmptyState,
│                               # GrowthTrendChart, PremiumSkeleton, TopoGrid, etc.)
├── context/
│   └── BrainWiseContext.tsx    # Monolithic state container & action handlers
├── data/
│   └── mockData.ts             # Initial state fixtures and demo data (Solstice Coffee)
├── design/
│   └── tokens.ts               # Color, spacing, radius, z-index, and frosted glass tokens
├── pages/
│   ├── app/                    # 10 application department page views
│   └── public/                 # Landing, Auth, and Onboarding page views
├── theme/
│   └── typography.ts           # 1.25 modular scale typography engine
├── types/
│   └── brainwise.ts            # Master TypeScript interfaces and state models
└── utils/
    ├── aiClient.ts             # Client-side API dispatch layer to server endpoints
    ├── logic.ts                # Pure business logic and domain calculation utilities
    ├── strategicMemory.ts      # Anti-fatigue campaign angle tracking engine
    └── truthCheck.ts           # Deterministic Truth Engine and price safeguard checks
```

---

## 5. Baseline Build, Lint, and Test Results

### 5.1 TypeScript Compilation (`npm run lint` / `tsc --noEmit`)
- **Status:** **PASS** (0 errors)
- **Time:** ~1.4 seconds
- **Strictness:** Compiles cleanly with zero type errors.

### 5.2 Production Build (`npm run build` / `vite build`)
- **Status:** **PASS** (0 errors)
- **Time:** 455 ms
- **Output:**
  - `dist/index.html` (1.46 kB, gzip 0.63 kB)
  - `dist/assets/index-CZhOTT4u.css` (88.54 kB, gzip 16.42 kB)
  - `dist/assets/index-CQM3LxwC.js` (1,484.97 kB, gzip 407.75 kB)
- **Asset Copy Plugin:** Verified that `copy-unbundled-src-assets` correctly mirrors `src/assets` to `dist/src/assets`.

### 5.3 Automated Unit Tests (`npx tsx --test`)
- **Status:** **PASS** (74 of 74 tests passing)
- **Time:** 276 ms
- **Coverage Areas:**
  - `truthCheck.test.ts` (4 tests) — Price extraction, grounding, hallucination remediation, exclusion rules.
  - `strategicMemory.test.ts` (3 tests) — Fatigue detection, angle registration, prompt directives.
  - `logic.test.ts` (18 tests) — Market sizing, search filtering, scenario modeling, SVG sanitization.
  - `tokens.test.ts` & `typography.test.ts` (10 tests) — 1.25 modular ratio, CSS variable generation.
  - Component Utilities (39 tests) — Dialog, EmptyState, GrowthTrend, Skeleton, TopoGrid, TraceCard.

---

## 6. Baseline Security and Secrets Analysis

1. **Exposed Credentials in Source:** None found. `Select-String` scan across all source files for Google API keys (`AIza...`) returned 0 matches.
2. **Environment Variable Configuration:** `.env.example` provides placeholders for `GEMINI_API_KEY` and `APP_URL`.
3. **Privileged API Isolation:** Live Gemini AI API calls are strictly handled server-side in `server.ts`. Client components invoke `/api/ai/*` via `fetch()`, preventing browser exposure of API keys.
4. **Vulnerabilities to Address in Phase 3:**
   - Absence of formal ESLint and Prettier configurations.
   - Client state in `BrainWiseContext.tsx` stores demo state in `localStorage` without a clear separation between mock data, cached view state, and authoritative backend models.
   - Missing environment variable validation schema on startup.
   - No automated GitHub Actions CI pipeline configured.

---

## 7. Immediate Phase 3 Action Plan

1. **Preserve & Version Control:** Established local git repository with `main` and `develop` branches.
2. **Codebase Audit:** Comprehensive audit of code structure, component responsibilities, dead code, dependencies, routing, demo data, and browser storage.
3. **Development Standards:** Implement ESLint (flat config), Prettier (`.prettierrc`), strict TypeScript checks, and standardized npm scripts.
4. **Frontend/Backend Separation:** Formalize API client abstractions, isolate mock data, and define boundaries matching Phase 2 contracts.
5. **CI/CD Quality Gates:** Create GitHub Actions workflow for pull request linting, formatting, type checking, unit tests, and production build verification.
6. **Documentation Deliverables:** Author all Phase 3 documentation (`BW-PHASE3-00` through `BW-PHASE3-12`).
