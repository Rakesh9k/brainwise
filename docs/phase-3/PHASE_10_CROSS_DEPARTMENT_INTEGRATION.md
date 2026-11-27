# BRAINWISE — PHASE 10: CROSS-DEPARTMENT INTEGRATION & DATA HARMONIZATION
## Master Engineering Transformation Deliverable

**Status:** Completed & Validated  
**Component:** `DepartmentCoordinationService`, `DepartmentEventBus`, `DepartmentPermissionService`  
**Test Suite:** `src/server/crossDepartmentIntegration.test.ts` (5/5 Passing)  
**Date:** March 2025

---

## 1. Executive Summary

Phase 10 unifies the 14 BrainWise autonomous growth departments through event-driven cascade re-grounding, role-based access control (RBAC), sensitive financial isolation, and automated task spawning handoffs. Prior to Phase 10, departments operated largely as isolated feature silos with weak cross-department intelligence sharing. With the Phase 10 integration:
1. **Dynamic Cascade Alerts:** Whenever foundational business profile parameters, target audience segments, or competitor intelligence change, affected downstream departments (Creative, SEO, Campaigns, Sales, Executive) automatically receive contextual re-grounding invalidate-and-alert events.
2. **Context Propagation:** When newly synthesized customer personas or competitor counter-positioning angles are published, they are immediately broadcast to downstream generation pipelines, eliminating outdated marketing angles and stale positioning.
3. **Actionable Task Spawning:** Approved strategic recommendations automatically decompose into typed `GrowthTaskEntity` items assigned to specific department owners with estimated hours, budgets, deliverables, and sprint stages.
4. **Strict Permission Hardening:** Consequential actions (e.g., executing campaigns, publishing content, modifying financial goals) require `owner` or `admin` authorization. Sensitive financial margins, CAC targets, and revenue data are strictly masked from untrusted or general viewer tiers.

---

## 2. Architecture & Service Design

```
+---------------------------------------------------------------------------------------------------+
|                                      BRAINWISE EVENT BUS                                          |
|                                     (DepartmentEventBus)                                          |
+---------------------------------------------------------------------------------------------------+
             ▲                                         ▲                               ▲
             | 1. Profile / Competitor                 | 2. Re-grounding Alerts        | 3. Task Dispatch
             |    Audience Events                      |    Broadcast                  |
+----------------------------+        +-----------------------------------+     +-------------------------+
|  CompetitiveStrategyEngine |        |   DepartmentCoordinationService   |     | RecommendationEngine    |
|  CustomerIntelligence      |───────▶|   - Invalidation Alerts           |────▶| TaskRepository          |
|  BusinessDiagnosisEngine   |        |   - Re-grounding Prompts          |     | GrowthTaskEntity        |
+----------------------------+        +-----------------------------------+     +-------------------------+
                                                       ▲
                                                       | Strict RBAC & Financial Masking
                                      +-----------------------------------+
                                      |   DepartmentPermissionService     |
                                      |   - Consequential action checks   |
                                      |   - Financial margin masking      |
                                      +-----------------------------------+
```

### 2.1 Event Subscriptions & Cascade Handling
In `src/server/services/departmentCoordinationService.ts`:
- `initEventSubscriptions()` hooks into the global `departmentEventBus`:
  - `BUSINESS_PROFILE_UPDATED`: Invalidate SEO keyword strategies, campaign angles, creative templates, and strategic briefs.
  - `TARGET_AUDIENCE_UPDATED`: Invalidate persona targeting across Paid Ads, Content Marketing, and Sales sequences.
  - `COMPETITOR_CHANGED`: Broadcast competitor parity shifts and price undercutting alerts to Product Strategy and Paid Media.

### 2.2 Role-Based Access Control & Financial Masking
In `src/server/services/departmentPermissionService.ts`:
- **`canExecuteTask(role, department, isConsequential)`**:
  - General tasks can be executed by `editor`, `admin`, `owner`.
  - Consequential actions (incurring financial spend or publishing live copy) enforce `isConsequential === true` guardrails, restricting execution exclusively to `admin` and `owner`.
- **`sanitizeFinancialData(role, data)`**:
  - Masks gross profit margins, raw net revenue, and CAC limits with `[RESTRICTED_FINANCIAL_METRIC]` unless caller holds `owner` or `admin` authority.

---

## 3. Test Verification & Evidence

All integration tests pass in `src/server/crossDepartmentIntegration.test.ts`:
- `should notify downstream departments when business profile changes`: Verified event publication and notification distribution.
- `should propagate newly identified customer segments to marketing and campaign departments`: Verified audience segment propagation.
- `should propagate competitor intelligence updates to product and marketing departments`: Verified competitor parity and pricing alerts.
- `should convert approved recommendations into executable department tasks`: Verified conversion of recommendations into structured `GrowthTaskEntity` records.
- `should enforce department permission boundaries and prevent unauthorized cross-department data leaks`: Verified consequential action blocks for `editor` role and masking of sensitive financial metrics.

```
✓ Cross-Department Integration & Data Harmonization (5 tests)
  ✓ should notify downstream departments when business profile changes (3ms)
  ✓ should propagate newly identified customer segments to marketing and campaign departments (1ms)
  ✓ should propagate competitor intelligence updates to product and marketing departments (2ms)
  ✓ should convert approved recommendations into executable department tasks (1ms)
  ✓ should enforce department permission boundaries and prevent unauthorized cross-department data leaks (1ms)
```

---

## 4. Phase 10 Sign-Off & Status
- **Acceptance Criteria Met:** 100%
- **Security & Privacy:** Enforced tenant isolation and sensitive financial data masking.
- **Architectural Integrity:** Clean, typed event-driven coordination without cyclical dependencies.
