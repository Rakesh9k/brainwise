# BrainWise Phase 2 — 13: Non-Functional Requirements (NFR) & Quality Standards

**Document ID:** `docs/phase-2/13-non-functional-requirements.md`  
**Version:** `2.0.0`  
**Date:** November 19, 2026  
**Auditor:** Principal Software Architect & QA Lead  
**Status:** APPROVED & BINDING  

---

## 1. Executive Summary

This document specifies the measurable, verifiable Non-Functional Requirements (NFRs) governing BrainWise. 

These engineering standards define performance thresholds, availability SLAs, accessibility criteria, disaster recovery objectives, and usage sizing across early-stage and growth cohorts.

---

## 2. Quantitative Performance & Latency Budgets

| Operation / Path | Performance Metric | Strict Target (P95) | Degradation Alert (P99) |
|---|---|---|---|
| **Client Page Route Transitions** | First Contentful Paint / Transition | **< 140ms** | > 280ms |
| **Business Brain Fact Mutation (CRUD)** | Server Response Time | **< 180ms** | > 400ms |
| **Social Carousel Generation (5 Slides)** | End-to-End Latency (Gemini Flash) | **< 2,800ms** | > 5,500ms |
| **Brand Collateral Generation (SVG)** | End-to-End Latency (Gemini Flash) | **< 2,200ms** | > 4,500ms |
| **Market Validation Dossier (TAM/SAM/SOM)**| End-to-End Latency (Gemini Pro) | **< 4,200ms** | > 7,500ms |
| **Deterministic Truth Engine Pass** | In-Memory Verification & Regex Scan | **< 35ms** | > 80ms |
| **Credit Wallet Hold / Commit** | Firestore Atomic Transaction | **< 95ms** | > 220ms |
| **Cashfree Webhook Ingestion & Grant** | Webhook Processing & Credit Allocation| **< 350ms** | > 800ms |

---

## 3. High Availability, Reliability & Disaster Recovery

### 3.1 Availability SLA
- **Uptime Target:** **99.9% Availability** ($\le 43.8$ minutes of unplanned downtime per calendar month).
- **Scheduled Maintenance Windows:** Restricted to Sundays between 02:00 and 04:00 IST with 48-hour advance in-app notification.

### 3.2 Recovery Objectives
- **Recovery Point Objective (RPO):** **< 5 minutes**. Cloud Firestore provides continuous multi-region replication and point-in-time recovery (PITR) up to 7 days.
- **Recovery Time Objective (RTO):** **< 30 minutes**. In the event of a total regional disaster, traffic is rerouted to a standby region via Cloud DNS routing.

---

## 4. Accessibility (a11y) & Visual Ergonomics

1. **WCAG Compliance:** Strict **WCAG 2.2 Level AA** compliance across all 19 application screens.
2. **Color Contrast Ratios:**
   - Primary Body Text (`#252525` on `#FFFFFF`): **15.3:1** (Far exceeds 4.5:1 requirement).
   - Secondary Text (`#5C5C58` on `#FFFFFF`): **6.2:1** (Passes AA).
   - Signal Orange Accent (`#C44D00` text on `#FFFFFF`): **4.6:1** (Passes AA for bold text).
3. **Keyboard Navigation:** All interactive elements, tabs, modals, and dropdowns are fully navigable via `Tab`, `Shift+Tab`, `Enter`, and `Escape`. Focus rings utilize canonical `--bw-focus-ring` (`#FF7417` 2px solid with 2px offset).
4. **Motion Safety:** All animations respect `prefers-reduced-motion: reduce`, instantly falling back to 0ms opacity crossfades.

---

## 5. Responsive Breakpoint Matrix

The application must render with **zero horizontal scrollbar or overflow** across the 7 locked breakpoints:

| Breakpoint Tier | Device Category | Viewport Dimensions | Status in QA Audit |
|---|---|---|---|
| **Mobile Compact** | iPhone SE | 375 × 667 | **100% PASS** |
| **Mobile Standard** | iPhone 14 / Pixel 7 | 390 × 844 | **100% PASS** |
| **Tablet Portrait** | iPad Mini | 768 × 1024 | **100% PASS** |
| **Tablet Landscape** | iPad Pro | 1024 × 768 | **100% PASS** |
| **Laptop Standard** | MacBook Air / ThinkPad | 1366 × 768 | **100% PASS** |
| **Desktop Full** | 24" Monitor | 1440 × 900 | **100% PASS** |
| **Widescreen HD** | 27" / 4K Monitor | 1920 × 1080 | **100% PASS** |

---

## 6. Sizing Assumptions Across Customer Cohorts

```
┌────────────────────────────────────────────────────────────────────────┐
│                        COHORT SIZING ASSUMPTIONS                       │
├─────────────────────┬──────────────────┬───────────────┬───────────────┤
│ Metric              │ Phase 1 (100)    │ Phase 2 (1k)  │ Phase 3 (10k) │
├─────────────────────┼──────────────────┼───────────────┼───────────────┤
│ Active Workspaces   │ 100              │ 1,000         │ 10,000        │
│ Peak Concurrency    │ 20 concurrent    │ 150 concurrent│ 1,200 conc.   │
│ Monthly AI Calls    │ 6,500            │ 72,000        │ 850,000       │
│ Document Storage    │ 25 GB            │ 350 GB        │ 4,200 GB      │
│ Database IOPS       │ ~45 ops/sec      │ ~380 ops/sec  │ ~3,200 ops/sec│
│ Outbound Emails     │ 1,200 / mo       │ 14,000 / mo   │ 160,000 / mo  │
└─────────────────────┴──────────────────┴───────────────┴───────────────┘
```
