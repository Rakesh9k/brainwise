# BrainWise — Project Architecture & Audit Report
**Document ID:** `docs/design-freeze/01-project-audit.md`  
**Version:** `1.0.0-frozen`  
**Audit Date:** November 19, 2026  
**Auditor Roles:** Principal Product Designer, Senior UI/UX Architect, Design Systems Engineer, Senior Frontend Engineer, Product Quality Auditor  
**Status:** COMPLETE (Phase A)

---

## 1. Executive Summary

A comprehensive, ground-up audit of the existing BrainWise codebase was conducted across all source files, routing paths, design tokens, components, page controllers, context stores, utility modules, and test suites. 

BrainWise is a client-side React 19 single-page application built on Vite 8, Tailwind CSS v4, Motion (formerly Framer Motion) v12, Lucide React icons, and Recharts. The backend is an Express server running in Node/TSX with optional Gemini API endpoints for generative dossiers, brand copy, and social carousels, backed by client-side deterministic fallback engines.

The application preserves a **premium, sophisticated, minimalistic business-intelligence identity**:
- Warm off-white and pure white ceramic surfaces.
- Deep charcoal (`#171717`) for navigational and strategic anchor surfaces.
- Controlled signal orange (`#FF7417`) for accents, focus indicators, and intelligence beacons.
- Strict 1.25 Major Third modular typography scale rooted at 16px.
- Subtle liquid motion, topographic grid overlays, and tactile ceramic elevation.

---

## 2. Project Architecture & Dependency Analysis

### 2.1 Core Technology Stack
| Layer | Technology | Version | Verification Finding |
|---|---|---|---|
| **Runtime / Build** | Vite + TypeScript | Vite 8.3.0, TS 7.0.2 | PASS: Fast production builds (`371ms`) and zero type errors on `tsc --noEmit`. |
| **Framework** | React + React DOM | 19.0.1 | PASS: Concurrent rendering, pure state management. |
| **Styling** | Tailwind CSS + CSS Custom Properties | @tailwindcss/vite 4.3.3 | PASS: Strict CSS variables define design tokens in `src/index.css`. |
| **Animation** | Motion (`motion/react`) | 12.23.24 | PASS: Physics-based cubic-bezier easing (`0.16, 1, 0.3, 1`) with prefers-reduced-motion safety. |
| **Icons** | Lucide React | 0.546.0 | PASS: Scalable SVG iconography. |
| **Charts** | Recharts | 3.11.0 | PASS: Used in `GrowthTrendChart.tsx` and `AnalyticsReportsPage.tsx`. |
| **Server** | Express + TSX | 4.21.2 | PASS: Dual-mode development server and static production file server. |
| **AI Integration** | Google Gen AI SDK | 2.4.0 | PASS: Server-proxied Gemini integration with complete offline fallback in `src/utils/logic.ts`. |

### 2.2 Directory Structure
```
d:\brainwise pro\brainwise (1)
├── docs/
│   └── design-freeze/               # Complete design freeze specifications (v1.0)
├── public/
│   └── assets/aistudio/             # Stored photography and mock imagery
├── src/
│   ├── assets/images/               # Curated editorial journal photography
│   ├── components/
│   │   ├── landing/                 # Marketing device mockups & journal sections
│   │   ├── motion/                  # Liquid motion primitives & transitions
│   │   ├── shell/                   # ApplicationShell, Header, Sidebar, Breadcrumbs
│   │   └── ui/                      # 14 Reusable UI primitives, dialogs, charts, tables
│   ├── context/
│   │   └── BrainWiseContext.tsx     # Centralized application state & navigation router
│   ├── data/
│   │   └── mockData.ts              # Canonical initial business, competitor & report mock data
│   ├── design/
│   │   ├── tokens.ts                # TypeScript design token single source of truth
│   │   └── tokens.test.ts           # Token verification tests
│   ├── pages/
│   │   ├── app/                     # 10 Workspace app department pages
│   │   └── public/                  # LandingPage, AuthPages, OnboardingPage
│   ├── theme/
│   │   ├── typography.ts            # Strict 1.25 modular scale typography engine
│   │   └── typography.test.ts       # Modular scale regression assertions
│   ├── types/
│   │   └── brainwise.ts             # Strict domain TypeScript contracts
│   └── utils/
│       ├── aiClient.ts              # Resilient AI fetcher with timeout & fallback
│       ├── logic.ts                 # Pure business logic, formatting, and offline generators
│       └── logic.test.ts            # Unit tests covering algorithmic logic
├── package.json
├── server.ts
├── tsconfig.json
└── vite.config.ts
```

---

## 3. Screen Inventory

| Route (`AppRoute` / `AnyRoute`) | Screen / Component | Group | Purpose | Verified Status |
|---|---|---|---|---|
| `/` | `LandingPage.tsx` | Public Marketing | Public homepage, hero, interactive device mockup, department showcase, journal, pricing, FAQ | **PASS** |
| `login` | `AuthPages.tsx (mode='login')` | Authentication | Sign in with email/password, demo one-click shortcut, error recovery | **PASS** |
| `signup` | `AuthPages.tsx (mode='signup')` | Authentication | Account registration, validation, redirect to email verification | **PASS** |
| `verify-email` | `AuthPages.tsx (mode='verify-email')` | Authentication | 6-digit code verification, resend cooldown timer, invalid code feedback | **PASS** |
| `forgot-password` | `AuthPages.tsx (mode='forgot-password')` | Authentication | Password reset request with validation and success banner | **PASS** |
| `reset-password` | `AuthPages.tsx (mode='reset-password')` | Authentication | New password input, matching validation, return to sign in | **PASS** |
| `onboarding` | `OnboardingPage.tsx` | Public Onboarding | 5-step interactive founder wizard: role, business profile, offer, competitors, initialization | **PASS** |
| `dashboard` | `DashboardPage.tsx` | Core Workspace | Executive command center, health gauges, growth chart, quick actions, recommended founder sprints | **PASS** |
| `business-brain` | `BusinessBrainPage.tsx` | Core Workspace | Single source of company truth: business identity, offerings, target customers, strategic notes | **PASS** |
| `idea-intelligence` | `IdeaIntelligencePage.tsx` | Intelligence | 7-step idea generation workflow, 15-section research dossier, editable TAM/SAM/SOM, local fallback | **PASS** |
| `competitive-intelligence` | `CompetitiveIntelligencePage.tsx` | Intelligence | Competitor dossiers, interactive positioning map, feature matrix, strategic gaps, competitive strategy | **PASS** |
| `market-watch` | `MarketWatchPage.tsx` | Intelligence | Competitor surveillance, 4-tier alert feed, watchlist frequency, scheduled executive reports | **PARTIAL** (Ambiguity identified: aliased in sidebar vs embedded in competitive intelligence. Resolved in Phase C) |
| `brand-studio` | `BrandStudioPage.tsx` | Brand & Assets | Logo concept generator, color palette tokens, typography ladder, brand voice, social creative, deck preview | **PASS** |
| `asset-library` | `AssetLibraryPage.tsx` | Brand & Assets | Searchable asset repository, category filters, preview drawer, rename, archive, mock upload | **PASS** |
| `growth-director` | `GrowthDirectorPage.tsx (mode='director')` | Execution | Growth Planner, daily focus checklist, 30/60/90 roadmap, goal progress, AI recommendations | **PASS** |
| `tasks-experiments` | `GrowthDirectorPage.tsx (mode='tasks')` | Execution | Experiments ledger, hypothesis validation, convert signals to growth tests | **PASS** |
| `business-performance` | `AnalyticsReportsPage.tsx (tab='overview')` | Measure | MRR trends, milestone flags, marketing conversion funnel, retention cohorts | **PASS** |
| `reports` | `AnalyticsReportsPage.tsx (tab='reports')` | Measure | Executive report viewer, downloadable CSV/JSON exports, print-optimized formatting | **PASS** |
| `settings` | `SettingsHelpPages.tsx (SettingsPage)` | Configuration | 7 settings tabs: Profile, Business, Team, Integrations, Billing, Notifications, AI preferences | **PASS** |
| `help-support` | `SettingsHelpPages.tsx (HelpSupportPage)` | Support | Guided knowledgebase, platform diagnostics, documentation links | **PASS** |

---

## 4. Component Inventory & Architecture

### 4.1 Shell & Navigation Components
- `ApplicationShell.tsx`: Standard shell with responsive header, collapsible desktop sidebar, mobile drawer, contextual action ledger, and breadcrumb bar.
- `Sidebar.tsx`: Charcoal navigation column with department groupings, active indicator animation (`layoutId`), collapse toggle, and mobile responsive drawer.
- `Header.tsx`: Frosted glass surface (`bw-frosted-nav`), global search shortcut (`⌘K`), notification center trigger, and user profile avatar.
- `Breadcrumbs.tsx`: Dynamic hierarchy tracker linking nested sub-screens back to parent departments.

### 4.2 Reusable UI Library (`src/components/ui/`)
1. `Button` (`DesignSystem.tsx`): Primary (`bw-orange`), Secondary (`white/ceramic`), Ghost, Dark, Outline variants with loading spinners.
2. `Input`, `Select`, `Textarea` (`DesignSystem.tsx`): Ceramic recessed controls with `focus-ring` focus outlines.
3. `MetricCard` (`DesignSystem.tsx`): Large numeric display with trend deltas, sparkline integration, and contextual ledger trigger.
4. `StatusBadge` & `PriorityBadge` (`DesignSystem.tsx`): Semantic indicators for status and priority.
5. `Tabs` (`DesignSystem.tsx`): Accessible pill-style and line-style tab bars with animated active indicator.
6. `Dialog` & `DialogHeader`, `DialogBody`, `DialogFooter` (`Dialog.tsx`): Accessible modal portal with backdrop blur, focus trapping, ESC key listener, and scroll locking.
7. `Drawer` (`Overlay.tsx`): Side-sliding panel for notifications and detail views.
8. `ConfirmationDialog` (`Overlay.tsx`): Standardized prompt for destructive/irreversible actions.
9. `EmptyState` (`EmptyState.tsx`): Standardized zero-data states with contextual illustration, explanatory copy, and primary action.
10. `ErrorState` (`DesignSystem.tsx`): Feedback banner with retry callback.
11. `LoadingState` (`DesignSystem.tsx`): Wave skeletons and loading spinners.
12. `LiquidSkeletons` (`LiquidSkeletons.tsx`): Specialized department skeleton loaders (`AnalyticsSkeleton`, `WorkspaceInitSkeleton`).
13. `GrowthTrendChart` (`GrowthTrendChart.tsx`): Recharts wrapper with custom tooltips, milestone flags, and curve mode selection.
14. `DataTable` (`DataTable.tsx`): Sortable, paginated data grid with accessible column headers.
15. `TopoGridOverlay` (`TopoGridOverlay.tsx`): Subtle topographic coordinate mesh overlay for intelligence surfaces.
16. `ContextualActionLedger` (`ContextualActionLedger.tsx`): Popover menu for card-level actions (Copy JSON, Export CSV, Pin, Expand).

---

## 5. Design Token Inventory & Drift Analysis

### 5.1 Canonical Color Tokens (`src/design/tokens.ts` & `src/index.css`)
- **Primary Canvas**: `#FFFFFF` (`--bw-bg-primary`)
- **Secondary Canvas**: `#FAFAF9` (`--bw-bg-secondary`)
- **Subtle Surface**: `#F1F1EF` (`--bw-bg-subtle`)
- **Primary Text**: `#252525` (`--bw-text-primary`)
- **Body Muted Text**: `#5C5C58` (`--bw-text-body-muted`)
- **Muted Text / Secondary**: `#858585` (`--bw-text-muted`)
- **Border Default**: `#E6E6E2` (`--bw-border`)
- **Border Strong**: `#D6D6D0` (`--bw-border-strong`)
- **Charcoal Deep**: `#171717` (`--bw-dark`)
- **Charcoal Secondary**: `#252525` (`--bw-dark-secondary`)
- **Primary Orange**: `#FF7417` (`--bw-orange`)
- **Orange Warm Accent**: `#FF9A45` (`--bw-orange-warm`)
- **Orange Hover**: `#E55F08` (`--bw-orange-hover`)
- **Orange Accessible Text**: `#C44D00` (`--bw-orange-text`)
- **Orange Subtle Background**: `#FFF0E5` (`--bw-orange-light`)
- **Success / Emerald**: `#24724E` / `#ECF7F1`
- **Warning / Amber**: `#A85E16` / `#FDF4EA`
- **Error / Crimson**: `#BC3E3E` / `#FDF0F0`

### 5.2 Spacing & Radii Token Findings
| Property | `src/design/tokens.ts` | `src/index.css` | Audit Finding | Correction Needed |
|---|---|---|---|---|
| **Radii Scale** | `sm: 6px, md: 10px, lg: 14px, xl: 18px` | `sm: 8px, md: 12px, lg: 20px, xl: 24px` | **PARTIAL**: Discrepancy between TS tokens and CSS variables. | Unify to canonical scale: 4px (`xs`), 8px (`sm`), 12px (`md`), 16px (`lg`), 20px (`xl`), 24px (`xxl`), 9999px (`full`). |
| **Spacing Scale** | 4, 8, 12, 16, 24, 32px | `--bw-space-1` (4px) to `--bw-space-8` (32px) | **PARTIAL**: Missing large spacing tokens (40, 48, 64, 80px) mandated by design specifications. | Add `--bw-space-10` (40px), `--bw-space-12` (48px), `--bw-space-16` (64px), `--bw-space-20` (80px) to both TS and CSS. |

---

## 6. Animation & Motion Inventory

| Primitive / Class | Role | Easing / Duration | Reduced-Motion Compliant |
|---|---|---|---|
| `DepartmentTransition` | Cross-fade + 6px vertical settle on workspace route navigation | `cubic-bezier(0.16, 1, 0.3, 1)` / 220ms | PASS: Disabled when `prefers-reduced-motion: reduce`. |
| `bw-liquid-shimmer` | Horizontal light sweep across skeleton elements | `cubic-bezier(0.22, 1, 0.36, 1)` / 2.4s | PASS: Keyframe turned off in media query. |
| `bw-skeleton-sweep` | Progressive highlight wave across loading cards | `cubic-bezier(0.16, 1, 0.3, 1)` / 1.85s | PASS: Reset to static tone on reduced motion. |
| `bw-orb-halo` | Restrained pulse for active intelligence generation | `cubic-bezier(0.16, 1, 0.3, 1)` / 2.8s | PASS: Disabled on reduced motion. |
| `bw-trace-card` | Tactile border illumination & lift on hover/focus | `cubic-bezier(0.16, 1, 0.3, 1)` / 200ms | PASS: Lift transformed to none on reduced motion. |
| `KineticMarquee` | Infinite brand ticker on marketing page | Linear 34s | PASS: Pauses on hover, stopped on reduced motion. |

---

## 7. Audit Findings & Issues Requiring Attention

### 7.1 Issue A: Market Watch Implementation Ambiguity (CRITICAL ARCHITECTURAL ISSUE)
- **Finding**: In `App.tsx`, route `'market-watch'` returned `<CompetitiveIntelligencePage initialTab="watch" />`, embedding `MarketWatchPage` as an inner tab of Competitive Intelligence. However, `MarketWatchPage.tsx` was originally implemented as an independent 600-line department with its own PageHeader, 4-tab workflow, and metrics. Furthermore, in `Sidebar.tsx`, `market-watch` was treated merely as an alias for `competitive-intelligence`.
- **Impact**: Double-nested tab bars, confusing breadcrumbs, and ambiguous route states when switching tabs.
- **Resolution Plan (Phase C)**: Promote Market Watch to an authoritative first-class route under Intelligence in `App.tsx` and `Sidebar.tsx`. In `CompetitiveIntelligencePage`, provide an explicit cross-link and navigation to Market Watch without duplicating the entire sub-page hierarchy.

### 7.2 Issue B: Token Drift in Spacing and Radii (SYSTEM INTEGRITY ISSUE)
- **Finding**: `src/design/tokens.ts` and `src/index.css` had slight divergences in radii (6/10/14/18px in TS vs 8/12/20/24px in CSS) and lacked large baseline spacing steps (40px, 48px, 64px, 80px).
- **Resolution Plan (Phase B)**: Standardize `tokens.ts` and `index.css` with exact matching tokens and expand `tokens.test.ts` to assert zero drift.

### 7.3 Issue C: Form Error Association & Accessible Labels (A11Y ISSUE)
- **Finding**: Several standalone inputs in settings and brand studio lacked explicit `aria-describedby` associations with their inline validation error strings.
- **Resolution Plan (Phase E)**: Associate error strings with input fields via `aria-invalid` and `aria-describedby`.

### 7.4 Existing Test Inventory
- 11 test suites executing under Node test runner (`node:test` via `tsx --test`).
- **64 tests passed, 0 failures, 0 skipped**.
- Covers: Contextual action ledger, dialog utilities, empty state resolution, growth trend calculation, skeleton rendering, topographic grid masking, trace card mechanics, focus ring tokens, frosted glass tokens, modular typography ratios, and core business logic (market sizing, search filtering, scenario modeling).

---

## 8. Summary Audit Verdict
- **Architecture**: **PASS**
- **Core Screens**: **PASS** (19 of 20 verified; 1 resolved in Phase C)
- **Visual Identity**: **PASS** (Distinctive ceramic & orange identity maintained)
- **Token System**: **PARTIAL** (Minor drift identified; scheduled for standardization in Phase B)
- **Market Watch Architecture**: **PARTIAL** (Ambiguity identified; scheduled for resolution in Phase C)
