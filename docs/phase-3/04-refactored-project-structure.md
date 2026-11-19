# BRAINWISE — PHASE 3: REFACTORED PROJECT STRUCTURE

**Document ID:** `BW-PHASE3-04`  
**Date:** November 19, 2026  
**Status:** Approved Architectural Specification  
**Author:** Senior Frontend & Backend Architect  

---

## 1. Architectural Principles & Guidelines

The BrainWise engineering foundation maintains a clean separation of concerns between client presentation, state management, shared design-system components, and privileged server-side orchestration.

### Core Directives:
1. **Design Freeze Compliance:** No React 19 UI component markup, CSS class, typography step, or motion transition may be arbitrarily rewritten, restyled, or deleted.
2. **Framework Alignment:** Built as a modern ESM **Vite 8 + React 19 SPA** paired with a Node.js/Express server runtime for privileged backend operations (`server.ts`).
3. **Modular Department Boundary:** The 14 BrainWise departments are structured as modular domain views consuming shared design-system components and typed API clients.
4. **Strict Security Boundary:** Server-side operations (Gemini AI prompts, credit deductions, payment orders, auth validation) are strictly isolated behind `/api/*` endpoints.

---

## 2. Target Directory Hierarchy

```
brainwise/
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md               # Standardized bug reporting template
│   │   └── feature_request.md          # Architecture-aligned feature proposal template
│   ├── workflows/
│   │   └── ci.yml                      # GitHub Actions: Lint, Format, Typecheck, Test, Build
│   └── pull_request_template.md        # Comprehensive PR quality checklist
├── docs/
│   ├── design-freeze/                  # Permanent Design Freeze specifications & screenshots
│   ├── phase-2/                        # Phase 2 Master PRD, Architecture, and API contracts
│   └── phase-3/                        # Phase 3 Codebase Audit & Engineering Foundation docs
├── public/
│   ├── assets/aistudio/                # Curated high-resolution brand and UI assets
│   └── favicon.ico                     # Application icon
├── src/
│   ├── assets/
│   │   └── images/                     # Curated editorial photography (Hero, Journal)
│   ├── components/
│   │   ├── landing/                    # Public landing page presentation components
│   │   │   ├── InteractiveDeviceMockup.tsx
│   │   │   └── JournalSection.tsx
│   │   ├── motion/                     # Liquid animation primitives & transitions
│   │   │   ├── LiquidMotion.tsx
│   │   │   └── MotionPrimitives.tsx
│   │   ├── shell/                      # Application navigation shell
│   │   │   ├── ApplicationShell.tsx
│   │   │   ├── Breadcrumbs.tsx
│   │   │   ├── Header.tsx
│   │   │   └── Sidebar.tsx
│   │   └── ui/                         # Canonical Shared Design-System Components
│   │       ├── CompetitorModal.tsx
│   │       ├── ContextualActionLedger.tsx
│   │       ├── DataTable.tsx
│   │       ├── DepartmentCards.tsx
│   │       ├── DesignSystem.tsx
│   │       ├── Dialog.tsx
│   │       ├── EmptyState.tsx
│   │       ├── GrowthTrendChart.tsx
│   │       ├── LiquidSkeletons.tsx
│   │       ├── Overlay.tsx
│   │       ├── PremiumSkeleton.tsx
│   │       ├── Skeleton.tsx
│   │       └── TopoGridOverlay.tsx
│   ├── config/
│   │   └── env.ts                      # Runtime environment variable validation
│   ├── context/
│   │   └── BrainWiseContext.tsx        # Prototype state provider (Phase 4 store baseline)
│   ├── data/
│   │   └── mockData.ts                 # Isolated prototype fixture state (Solstice Coffee)
│   ├── design/
│   │   ├── tokens.ts                   # Master design tokens (color, radii, spacing, z-index)
│   │   └── tokens.test.ts
│   ├── pages/
│   │   ├── app/                        # 10 Application Department Page Views
│   │   │   ├── AnalyticsReportsPage.tsx
│   │   │   ├── AssetLibraryPage.tsx
│   │   │   ├── BrandStudioPage.tsx
│   │   │   ├── BusinessBrainPage.tsx
│   │   │   ├── CompetitiveIntelligencePage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── GrowthDirectorPage.tsx
│   │   │   ├── IdeaIntelligencePage.tsx
│   │   │   ├── MarketWatchPage.tsx
│   │   │   └── SettingsHelpPages.tsx
│   │   └── public/                     # Public Application Views
│   │       ├── AuthPages.tsx           # Login, Signup, Forgot/Reset Password, Verify Email
│   │       ├── LandingPage.tsx         # Approved high-conversion landing page
│   │       └── OnboardingPage.tsx      # Multi-step business onboarding wizard
│   ├── services/
│   │   └── apiClient.ts                # Typed API client boundary for backend REST endpoints
│   ├── theme/
│   │   ├── typography.ts               # 1.25 modular scale typography engine
│   │   └── typography.test.ts
│   ├── types/
│   │   └── brainwise.ts                # Master TypeScript domain & UI state definitions
│   ├── utils/
│   │   ├── aiClient.ts                 # AI endpoint dispatch adapter
│   │   ├── logic.ts                    # Pure business logic and calculation utilities
│   │   ├── logic.test.ts
│   │   ├── strategicMemory.ts          # Anti-fatigue campaign memory engine
│   │   ├── strategicMemory.test.ts
│   │   ├── truthCheck.ts               # Deterministic Truth Engine and price check
│   │   └── truthCheck.test.ts
│   ├── App.tsx                         # Master application router & provider layout
│   ├── index.css                       # Global Tailwind CSS directives & tactile utilities
│   └── main.tsx                        # Client React 19 root bootstrap
├── tests/
│   └── e2e-audit.ts                    # Playwright multi-viewport responsive audit runner
├── .env.example                        # Documented environment variable template
├── .gitignore                          # Strict git exclusion rules
├── .prettierignore                     # Prettier exclusion rules
├── .prettierrc                         # Prettier formatting standard configuration
├── eslint.config.js                    # ESLint 9 Flat Config (TypeScript + React)
├── package.json                        # Project manifests & standardized npm scripts
├── server.ts                           # Express server gateway & Gemini API orchestration
├── tsconfig.json                       # Strict TypeScript compiler options
└── vite.config.ts                      # Vite 8 build & dev server configuration
```

---

## 3. Module Responsibilities & Boundaries

### 3.1 Design System (`src/components/ui/`)
- Every component in `src/components/ui/` is pure, reusable, and decoupled from direct domain business logic.
- Props interfaces are strictly typed, with support for loading states (`LiquidSkeletons`, `PremiumSkeleton`), empty states (`EmptyState`), modal workflows (`Dialog`), and data tables (`DataTable`).

### 3.2 Navigation Shell (`src/components/shell/`)
- Contains the layout scaffolding: collapsible desktop sidebar, responsive mobile drawer, sticky header with global search modal trigger (`⌘K`), and breadcrumb navigation.
- Maintains zero business logic; routes and user profile data are passed via props or context hooks.

### 3.3 Domain Department Pages (`src/pages/app/`)
- Each department corresponds directly to the PRD specifications in `docs/phase-2/02-complete-product-requirements.md`.
- Pages compose shared UI components, handle user interactions, and interface with state and API client services.

### 3.4 Services Layer (`src/services/apiClient.ts`)
- Serves as the single point of entry for all network requests.
- Maps typed TypeScript request bodies to REST/Callable endpoints matching `docs/phase-2/07-api-contracts.md`.
- Handles JSON serialization, HTTP status mapping, error normalization, and authorization header injection.

### 3.5 Server Runtime (`server.ts`)
- Hosts the privileged backend gateway:
  - Validates incoming parameters.
  - Injects Gemini API keys strictly from server environment variables.
  - Enforces request timeouts (18s limit).
  - Executes server-side Truth Checks before returning generated copy.
  - Serves compiled static assets in production or proxies to Vite in development.
