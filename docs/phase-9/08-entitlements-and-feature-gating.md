# BrainWise Commercial Infrastructure — Entitlements & Feature Gating

**Document ID:** BW-DOC-P9-008  
**Status:** Approved & Implemented  
**Date:** 2026-11-20  
**Phase:** 9 (Commercial Infrastructure)  

---

## 1. Centralized Entitlement Engine (`EntitlementEngine`)

Feature gating is enforced centrally on the backend. Client code never determines feature authorization autonomously.

```typescript
export interface EntitlementCheckResult {
  allowed: boolean;
  reason?: string;
  currentUsage?: number;
  limit?: number | 'unlimited';
  upgradeRequired?: boolean;
  recommendedPlan?: string;
}
```

---

## 2. Plan Limit Matrix

| Feature / Limit Key | Free Starter | Starter (₹2,763) | Professional (₹6,999) | Business (₹16,499) |
|---|---|---|---|---|
| `workspacesMax` | 1 | 1 | 3 | 10 |
| `teamSeatsMax` | 1 | 2 | 5 | 20 |
| `monthlyCredits` | 0 (150 welcome) | 800 | 3,000 | 10,000 |
| `competitorsMax` | 2 | 5 | 20 | 100 |
| `brandAssetsMonthlyMax` | 10 | 50 | 250 | 1,000 |
| `activeAutomationsMax` | 0 | 2 | 10 | 50 |
| `ideaDossiersMonthlyMax` | 3 | 10 | Unlimited | Unlimited |
| `integrationsMax` | 1 | 3 | All 9 | All 9 |
| `scheduledReports` | No | Weekly | Daily / Weekly | Real-time |
| `priorityAiModels` | No | No | Yes (Pro/Flash) | Yes (VIP) |
| `exportPdfWhiteLabel` | No | No | Yes | Yes |

---

## 3. Express Middleware Protection

`entitlementEngine.createMiddleware(featureKey)` guards endpoints by verifying active subscription status and feature quotas before controller execution. Rejections emit `403 ENTITLEMENT_RESTRICTED` with recommended upgrade path.
