# BrainWise — Complete Screen Inventory & Audit Specification
**Document ID:** `docs/design-freeze/04-screen-inventory.md`  
**Version:** `1.0.0-frozen`  
**Status:** APPROVED (Phase C)

---

## 1. Overview & Verification Methodology

Every route, sub-view, tab, drawer, and modal in the BrainWise product was individually inspected, traced through its rendering code, evaluated across all 5 UI states (Loading, Empty, Success, Error, Disabled), and validated across responsive breakpoints.

Approval Status Definitions:
- **APPROVED**: Fully implemented, verified against tokens, functional prototype interactions, tested against responsive and accessibility standards.
- **NEEDS FIX**: Critical or high visual or functional defect preventing freeze.
- **NOT IMPLEMENTED**: Feature declared in concept but missing in code.
- **UNVERIFIED**: Cannot be confirmed without execution or external services.

---

## 2. Marketing Website

### Screen 2.1: Marketing Homepage & Hero Showcase
- **Route / Component**: `/` (`LandingPage.tsx`)
- **Purpose**: Introduce BrainWise value proposition, articulate business operating system model, demonstrate workflow through an interactive device mockup, and drive account signups.
- **Main UI Elements**:
  - Sticky frosted navigation bar (`.bw-frosted-nav`) with logo lockup, anchor navigation links (`Capabilities`, `Departments`, `Journal`, `About`, `Pricing`, `FAQ`), and "Start Free Trial" CTA.
  - Editorial headline: "The Autonomous Intelligence Platform for Modern Ventures."
  - Value pill: "15-Section Research Dossiers · 2×2 Positioning Radar · Design System Sync".
  - Interactive device showcase: Multi-step interactive mockup with real-time UI previews (Idea Dossier, Competitive Radar, Brand Studio, Growth Planner).
  - Department breakdown grid with tactile ceramic cards.
  - Curated Journal section with category filters and editorial photography.
  - Pricing tier ladder ($49 Starter, $149 Growth, $399 Scale) with annual discount toggle.
  - Interactive FAQ accordion with expand/collapse animations.
  - Footer with legal disclosures, sitemap links, and system status indicator.
- **User Actions**:
  - Step through interactive mockup tabs (01–04).
  - Toggle annual/monthly pricing discount.
  - Expand/collapse FAQ accordions.
  - Filter journal articles by category.
  - Click CTAs to launch directly into Signup (`navigate('signup')`) or Onboarding.
- **Responsive Behaviour**:
  - Desktop: Full 12-column grid, persistent horizontal navigation.
  - Tablet: 2-column card layouts, condensed device mockup.
  - Mobile (375–390px): Hamburger menu drawer with slide-out navigation; device mockup scales fluidly; FAQ touch targets maintain min 44px.
- **States Coverage**:
  - *Loading*: Media elements use `ResilientMedia` with graceful shimmer placeholders.
  - *Empty*: N/A (Marketing content is fully populated).
  - *Success*: Visual confirmation on newsletter/trial CTA clicks.
  - *Error*: Image fallback handles missing assets gracefully.
  - *Disabled*: Inactive controls visually dimmed.
- **Implementation Status**: **APPROVED**
- **Outstanding Issues**: None.

---

## 3. Account & Authentication

### Screen 3.1: Sign In (`AuthPages.tsx?mode=login`)
- **Route**: `login`
- **Purpose**: Authenticate existing founders into their BrainWise workspace.
- **Main UI Elements**: Centered ceramic auth container, email input, password input, "Forgot password?" link, "Sign In" button, "One-Click Founder Demo" shortcut, signup redirect.
- **User Actions**: Enter credentials, trigger form submission, one-click demo login, navigate to forgot password or signup.
- **Responsive Behaviour**: Centered card adapts to full-width mobile sheet with generous touch targets.
- **States**:
  - *Loading*: Submit button renders rotating spinner with "Verifying credentials...".
  - *Empty*: Form fields cleared with accessible placeholders.
  - *Success*: Instant transition into `dashboard` workspace.
  - *Error*: Red error banner displaying validation messages ("Password must be at least 6 characters").
  - *Disabled*: Submit button disabled until valid email and password entered.
- **Implementation Status**: **APPROVED**

### Screen 3.2: Account Registration (`AuthPages.tsx?mode=signup`)
- **Route**: `signup`
- **Purpose**: Register new founder account and collect name, work email, and initial password.
- **Main UI Elements**: Name field, email field, password field, terms agreement footnote, "Create Workspace" button.
- **User Actions**: Enter registration details, submit form, redirect to email verification.
- **States**:
  - *Loading*: Submit button shows loading spinner.
  - *Error*: Field validation on missing name or short password.
  - *Success*: Transition to `verify-email` route.
  - *Disabled*: Submit button disabled until required inputs are present.
- **Implementation Status**: **APPROVED**

### Screen 3.3: Email Verification (`AuthPages.tsx?mode=verify-email`)
- **Route**: `verify-email`
- **Purpose**: Verify user ownership via simulated 6-digit confirmation code.
- **Main UI Elements**: 6-digit code input with numeric formatting, "Verify Code" button, resend code countdown timer (`60s`), return to login link.
- **User Actions**: Type 6 digits, submit verification, trigger code resend when timer elapses.
- **States**:
  - *Error*: Code `000000` triggers simulated expired/invalid code error banner.
  - *Success*: Green success banner: "Email verified. Initializing Business Brain onboarding...", redirects to `onboarding`.
  - *Disabled*: Disabled while code length < 6 or during submission.
- **Implementation Status**: **APPROVED**

### Screen 3.4: Password Reset Request (`AuthPages.tsx?mode=forgot-password`)
- **Route**: `forgot-password`
- **Purpose**: Request secure password recovery link.
- **Main UI Elements**: Email input, "Send Recovery Instructions" button, return link.
- **States**: Success card with confirmation instructions; email validation on invalid syntax.
- **Implementation Status**: **APPROVED**

### Screen 3.5: Set New Password (`AuthPages.tsx?mode=reset-password`)
- **Route**: `reset-password`
- **Purpose**: Enter new password with confirmation matching.
- **Main UI Elements**: New password input, confirm password input, "Update Password & Sign In" button.
- **States**: Validates password length and password matching; success redirect to login.
- **Implementation Status**: **APPROVED**

---

## 4. Onboarding Wizard

### Screen 4.1: Founder Onboarding (`OnboardingPage.tsx`)
- **Route**: `onboarding`
- **Purpose**: Gather business context to initialize the Business Brain repository and configure intelligence benchmarks.
- **5-Step Structure**:
  1. *Step 1: Role & Goals*: Founder persona selection (Startup founder, Aspiring founder, Small business, etc.) and multi-select primary business goals.
  2. *Step 2: Business Profile*: Company Name, Industry, Stage (Idea, Pre-launch, Early Traction, Growing), Location.
  3. *Step 3: Offer & Audience*: Product summary (auto-populated from landing prompts), Target customer description, Website.
  4. *Step 4: Competitors & Mode*: Add competitor chips, pre-suggested category peers, toggle "Start Fresh Empty Workspace" vs "Pre-populate Demo Context".
  5. *Step 5: Neural Synthesis & Initialization*: Visual `WorkspaceInitSkeleton`, animated neural network graph, progressive progress bar (`0% → 100%`), automatic workspace entry.
- **User Actions**: Next/Back navigation, chip selection, competitor tag entry/removal, workspace initialization.
- **Responsive Behaviour**: Progress indicator adapts from horizontal step pills to compact percentage counter on mobile.
- **States**:
  - *Loading*: Step 5 displays specialized fluid initialization skeleton.
  - *Error*: Required field alerts if advancing without company name.
  - *Disabled*: "Next" disabled until valid step inputs provided.
- **Implementation Status**: **APPROVED**

---

## 5. Workspace Core

### Screen 5.1: Main Home Dashboard (`DashboardPage.tsx`)
- **Route**: `dashboard`
- **Purpose**: Central executive overview displaying key business metrics, MRR trajectory, Business Brain completeness, recommended founder actions, and recent activity.
- **Main UI Elements**:
  - Business context banner with quick sync indicator.
  - 4 Key Metric Cards (MRR, Brain Completeness, Active Experiments, Signals Detected).
  - Growth Trend Chart with time range tabs (7d, 30d, 90d, YTD) and curve mode toggle.
  - "Today's Focus Sprint" interactive task checklist with countdown timer.
  - "Founder Playbook" recommendation card with action trigger.
  - Pinned widgets section with unpinning/reordering support.
  - Quick Department Launchpad cards.
- **User Actions**: Toggle sprint tasks, launch quick actions, filter chart time ranges, unpin widgets, navigate to departments.
- **Responsive Behaviour**: 4-column metric grid stacks to 2-column on tablet and 1-column on mobile.
- **States**:
  - *Loading*: `LiquidSkeletonReveal` shape-matched skeletons.
  - *Empty*: Special empty state when "Start Fresh Empty Workspace" was selected, prompting user to validate first idea.
  - *Success*: Visual task completion animation with strike-through and count decrement.
- **Implementation Status**: **APPROVED**

### Screen 5.2: Business Brain Repository (`BusinessBrainPage.tsx`)
- **Route**: `business-brain`
- **Purpose**: Authoritative strategic knowledgebase storing company identity, offerings, audience personas, competitive advantages, and strategic guidelines.
- **Main UI Elements**:
  - Completeness Gauge (0–100%) highlighting missing dimensions.
  - Section tabs: Company Profile, Offerings & Pricing, Target Customers, Strategic Decisions.
  - Inline edit mode with tactile textareas, inputs, and category tag creators.
  - AI Suggestion pills that auto-complete business statements from research reports.
  - "Save to Brain" primary action with unsaved changes badge.
- **User Actions**: Edit field values, accept AI suggestions, add/delete customer personas, save changes, revert edits.
- **States**:
  - *Success*: Emerald toast "Business Brain synchronized successfully".
  - *Disabled*: Save button disabled when no changes have been made.
- **Implementation Status**: **APPROVED**

---

## 6. Intelligence

### Screen 6.1: Idea Intelligence (`IdeaIntelligencePage.tsx`)
- **Route**: `idea-intelligence`
- **Purpose**: Transform raw product ideas into a structured, evidence-backed 15-section research dossier with editable financial models.
- **Main UI Elements**:
  - 7-step idea generation prompt bar with depth selector (Quick Scan, Deep Dive, Comprehensive).
  - 15-Section Research Dossier: Executive Summary, Problem Validation, Market Sizing (TAM/SAM/SOM), Customer Personas, Competitor Matrix, Unit Economics, Risk Factors, Go-to-Market Strategy, etc.
  - Interactive TAM/SAM/SOM range sliders with real-time valuation updates.
  - Scenario comparison matrix (Base vs Bull vs Conservative).
  - Actions: "Save to Brain", "Export Markdown", "Download JSON", "Print Dossier".
- **User Actions**: Generate new dossier, adjust financial sliders, switch scenario presets, save findings to Brain.
- **States**:
  - *Loading*: Neural pulse animation with phased milestone text ("Analyzing market sizing...", "Clustering customer complaints...").
  - *Error*: Automatic fallback button to generate dossier using local deterministic model.
  - *Empty*: Guidance card with pre-filled sample ideas (e.g., Specialty Coffee Roastery, B2B SaaS).
- **Implementation Status**: **APPROVED**

### Screen 6.2: Competitive Intelligence (`CompetitiveIntelligencePage.tsx`)
- **Route**: `competitive-intelligence`
- **Purpose**: Deep structural analysis of competitors, 2×2 positioning maps, feature benchmarking, and strategic white-space discovery.
- **Main UI Elements**:
  - Tabs: Market Overview, Dossiers, Head-to-Head Comparison, Strategic Gaps, Competitive Strategy.
  - Interactive 2×2 Positioning Map (Price vs Innovation) with draggable company marker.
  - Full 9-section Competitor Dossier (Overview, Products, Pricing, Positioning, Website/UX, Marketing, Reviews, SWOT, Recent Changes).
  - Review complaint cluster analyzer (grouping 1-star reviews by topic).
  - Strategic White Space recommendations.
  - Surveillance banner with direct one-click bridge to Market Watch.
- **User Actions**: Drag own position marker on 2×2 map, switch competitor dossiers, filter customer complaints, generate competitive strategy, open Market Watch.
- **States**:
  - *Empty*: Prompt to add competitors if list is empty.
  - *Success*: Toast confirmation when competitive strategy is saved to Business Brain.
- **Implementation Status**: **APPROVED**

### Screen 6.3: Market Watch (`MarketWatchPage.tsx`)
- **Route**: `market-watch`
- **Purpose**: Continuous automated surveillance of competitor price changes, feature releases, executive hires, and review shifts.
- **Main UI Elements**:
  - Standalone PageHeader: "Market Watch & Competitor Signals".
  - 4 Surveillance Metric Cards: Active Watchlist, Signals Detected (7d), Unread Alerts, Next Scheduled Digest.
  - 4 Functional Tabs: Overview, Competitor Watchlist, Intelligence Feed, Scheduled Reports.
  - Category filter bar: All, Pricing, Feature, Executive, Marketing, Review Sentiment.
  - Signal cards with "Convert to Experiment", "Dismiss", and "Mark Read" actions.
  - Watchlist management table: Polling frequency dropdowns (Daily, Weekly, Real-time), alert threshold toggles.
  - Scheduled report configuration: Format, frequency, delivery time, recipient email, trigger instant run.
  - Event details slide-over drawer.
- **User Actions**: Filter feed, convert alert to growth experiment, dismiss alert, change competitor monitoring frequency, schedule reports, add competitor.
- **States**:
  - *Empty*: Clean empty feed illustration with "No unread alerts" and button to adjust filters.
  - *Success*: Toast notification when event is converted into a growth experiment.
- **Implementation Status**: **APPROVED** (Architectural ambiguity fully resolved in Phase C; promoted to authoritative standalone route).

---

## 7. Execution

### Screen 7.1: Brand Studio (`BrandStudioPage.tsx`)
- **Route**: `brand-studio`
- **Purpose**: Formulate brand identity, generate geometric logo marks, establish color tokens, preview collateral, and design social carousels and pitch slides.
- **Main UI Elements**:
  - Logo concept generator with SVG concept selector.
  - Color palette editor with WCAG contrast badges and copyable CSS variables.
  - Typography ladder previewing Geist and JetBrains Mono.
  - Brand voice matrix (Formal, Conversational, Technical, Bold).
  - Social carousel designer with multi-slide preview, hook generator, and caption copy.
  - 5-slide pitch deck preview with SVG layout export.
- **User Actions**: Select active logo concept, tweak palette colors, copy CSS/JSON tokens, regenerate social slides, export SVG assets.
- **States**:
  - *Loading*: Shimmer skeletons during asset generation.
  - *Success*: Visual checkmark on token copy and Brain sync.
- **Implementation Status**: **APPROVED**

### Screen 7.2: Asset Library (`AssetLibraryPage.tsx`)
- **Route**: `asset-library`
- **Purpose**: Searchable digital asset management for logos, social banners, pitch decks, and brand style guides.
- **Main UI Elements**: Category filter tabs (All, Logos, Collateral, Social, Decks), search input, asset cards with SVG thumbnails, asset preview dialog, rename input, archive button, simulated asset upload modal.
- **User Actions**: Preview asset, download SVG/PNG/CSS, rename asset, archive asset, upload new creative.
- **States**:
  - *Empty*: "No assets found" state with "Upload First Asset" CTA.
  - *Success*: Toast confirmation on rename or archive.
- **Implementation Status**: **APPROVED**

### Screen 7.3: Growth Planner (`GrowthDirectorPage.tsx`)
- **Route**: `growth-director` (and `tasks-experiments`)
- **Purpose**: Manage daily execution sprints, 30/60/90-day growth roadmaps, business goals, experiments lifecycle, and AI growth recommendations.
- **Main UI Elements**:
  - Focus Sprint checklist with Pomodoro countdown timer.
  - Phased Roadmap (30 Days: Validation, 60 Days: Traction, 90 Days: Scale).
  - Goal cards with interactive progress sliders and target milestones.
  - Experiments Kanban/List (Draft, Running, Concluded) with hypothesis, metric, and conversion from Market Watch signals.
  - AI Growth Recommendations with "Accept as Task" or "Dismiss" actions.
- **User Actions**: Toggle task completion, update goal progress, transition experiment status, accept AI recommendations.
- **States**:
  - *Empty*: Empty checklist message when all tasks are complete.
  - *Success*: Toast notification when recommendation is accepted into sprint.
- **Implementation Status**: **APPROVED**

---

## 8. Reporting

### Screen 8.1: Business Performance Analytics (`AnalyticsReportsPage.tsx?tab=overview`)
- **Route**: `business-performance`
- **Purpose**: Visual analytics tracking revenue trajectories, milestone correlation, acquisition funnels, and retention metrics.
- **Main UI Elements**:
  - Interactive Recharts MRR Curve with range toggles (7d, 30d, 90d, YTD) and curve smoothing toggle.
  - Milestone annotations placed along the growth trajectory.
  - Marketing Conversion Funnel breakdown (Visitors → Trials → Paid).
  - Retention cohort matrix.
- **User Actions**: Change time range, switch curve mode, hover data points for inspection tooltips.
- **States**:
  - *Loading*: `AnalyticsSkeleton` wave shimmer.
  - *Empty*: Zero-data state with prompt to connect Stripe/GA integrations.
- **Implementation Status**: **APPROVED**

### Screen 8.2: Executive Reports (`AnalyticsReportsPage.tsx?tab=reports`)
- **Route**: `reports`
- **Purpose**: Comprehensive printable reports summarizing weekly founder progress, strategic decisions, and financial benchmarks.
- **Main UI Elements**:
  - Report selector (Weekly Executive Summary, Competitive Brief, Financial Model).
  - Structured narrative report preview with KPI tables.
  - Export actions: "Download CSV", "Export JSON", "Print Report".
- **User Actions**: Switch reports, download CSV, trigger print layout (`@media print`).
- **States**: Print stylesheet hides navigation sidebar and header for clean PDF output.
- **Implementation Status**: **APPROVED**

---

## 9. Account & Configuration

### Screen 9.1: Settings & Preferences (`SettingsHelpPages.tsx?SettingsPage`)
- **Route**: `settings`
- **Purpose**: Comprehensive configuration across 7 functional sub-tabs:
  1. *Profile*: User name, email, avatar, role.
  2. *Business Settings*: Company name, stage, industry, website, location.
  3. *Team Management*: Member roster, role assignment (Admin, Editor, Viewer), invite modal.
  4. *Integrations*: Google Analytics, Stripe, HubSpot, Slack, GitHub toggle cards with simulated authorization.
  5. *Billing & Usage*: Current plan badge, usage meters (AI credits, tracked competitors), plan comparison table, upgrade simulation.
  6. *Notifications*: Email digests, in-app alerts, Slack webhook switches.
  7. *AI & Privacy*: Gemini model selection, reasoning effort, data retention preferences.
- **User Actions**: Edit profile, invite team member, toggle integration, upgrade subscription, adjust AI settings.
- **States**: Field validation, unsaved changes indicators, simulated upgrade confirmations.
- **Implementation Status**: **APPROVED**

### Screen 9.2: Help & Knowledgebase (`SettingsHelpPages.tsx?HelpSupportPage`)
- **Route**: `help-support`
- **Purpose**: Guided FAQ, keyboard shortcuts cheatsheet, contact support modal, and diagnostic health check.
- **Main UI Elements**: Searchable help articles, shortcut reference table, system status indicator (Vite build, AI health).
- **Implementation Status**: **APPROVED**

---

## 10. Summary Approval Status Table

| Category | Total Screens / Modes | Approved | Needs Fix | Not Implemented |
|---|---|---|---|---|
| Marketing Website | 1 | 1 | 0 | 0 |
| Account & Auth | 5 | 5 | 0 | 0 |
| Onboarding Wizard | 1 (5 steps) | 1 | 0 | 0 |
| Core Workspace | 2 | 2 | 0 | 0 |
| Intelligence | 3 | 3 | 0 | 0 |
| Execution | 3 | 3 | 0 | 0 |
| Reporting | 2 | 2 | 0 | 0 |
| Configuration & Help | 2 (8 tabs) | 2 | 0 | 0 |
| **Total Product Footprint** | **19 Screen Controllers** | **19 (100%)** | **0** | **0** |

**Final Screen Approval Status:** **DESIGN FREEZE APPROVED**
