# BRAINWISE — PHASE 4: DEPARTMENT PERMISSION & ISOLATION MATRIX

> **Security Architecture, Multi-Tenant Data Isolation, Role-Based Access Control, and Sensitive Data Redaction**
> **Product Architecture Directive:** Strict multi-tenant isolation under `workspaces/{workspaceId}/...`; zero unauthorized cross-tenant or role-inappropriate financial data exposure.

---

## 1. Security & Multi-Tenancy Principles

1. **Strict Multi-Tenant Isolation:**
   - Every department context retrieval, task submission, and event dispatch validates the caller's active workspace against the resource's target workspace.
   - Any cross-tenant attempt throws `TENANT_ISOLATION_VIOLATION` with HTTP status `403 FORBIDDEN`.
2. **Least Privilege Data Exposure:**
   - Departments receive only the data slices necessary to perform their specialized function.
   - Internal unit costs, margins, and financial balance sheets are restricted to authorized financial roles.
3. **Immutability of Audit Trails:**
   - All state transitions (approval, rejection, retry, completion) are indelibly recorded in the task's `auditHistory` with actor ID and timestamp.

---

## 2. Department Role-Based Access Matrix

| Department | Allowed Roles | Read Context | Execute Standard Tasks | Execute Consequential Tasks | Approve / Reject Tasks | Sensitive Financials Access |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **STRATEGY** | `owner`, `admin`, `member`, `viewer` | Yes | Yes (Non-Viewer) | `owner`, `admin` only | `owner`, `admin` only | `owner`, `admin` only |
| **FINANCE** | `owner`, `admin` | Yes | `owner`, `admin` only | `owner`, `admin` only | `owner`, `admin` only | Yes (Full Unredacted) |
| **MARKETING** | `owner`, `admin`, `member`, `viewer` | Yes | Yes (Non-Viewer) | `owner`, `admin` only | `owner`, `admin` only | Redacted (`'UNKNOWN'`) |
| **RESEARCH** | `owner`, `admin`, `member`, `viewer` | Yes | Yes (Non-Viewer) | `owner`, `admin` only | `owner`, `admin` only | Redacted (`'UNKNOWN'`) |
| **CREATIVE** | `owner`, `admin`, `member`, `viewer` | Yes | Yes (Non-Viewer) | `owner`, `admin` only | `owner`, `admin` only | Redacted (`'UNKNOWN'`) |
| **SALES** | `owner`, `admin`, `member`, `viewer` | Yes | Yes (Non-Viewer) | `owner`, `admin` only | `owner`, `admin` only | Redacted (`'UNKNOWN'`) |
| **ANALYTICS** | `owner`, `admin`, `member`, `viewer` | Yes | Yes (Non-Viewer) | `owner`, `admin` only | `owner`, `admin` only | Redacted (`'UNKNOWN'`) |
| **CUSTOMER_SUCCESS** | `owner`, `admin`, `member`, `viewer` | Yes | Yes (Non-Viewer) | `owner`, `admin` only | `owner`, `admin` only | Redacted (`'UNKNOWN'`) |

---

## 3. Sensitive Financial Data Redaction Engine

When a non-finance role or department requests shared business context:
```typescript
const canSeeFinancials = departmentPermissionService.canAccessFinancialMargins(userRole, department);

const relevantProducts = products.map((p) => ({
  id: p.productId,
  name: p.name,
  price: p.price,
  unitCost: canSeeFinancials ? p.unitCost : 'UNKNOWN',
  marginPercent: canSeeFinancials ? p.marginPercent : 'UNKNOWN',
}));
```

If redaction occurs:
- `dataRedactions` records `['product_unit_costs', 'product_margins', 'internal_financial_ledgers']`.
- The client receives valid product pricing without exposing internal cost of goods sold (COGS) or profitability ratios.

---

## 4. Tenant Isolation Enforcement

Tenant boundaries are enforced via `departmentPermissionService.assertTenantAccess()`:
```typescript
public assertTenantAccess(callerWorkspaceId: string | undefined, targetWorkspaceId: string): void {
  if (!callerWorkspaceId || callerWorkspaceId !== targetWorkspaceId) {
    const err = new Error(
      `TENANT_ISOLATION_VIOLATION: Cross-tenant data access blocked. Caller (${callerWorkspaceId}) cannot access tenant (${targetWorkspaceId}).`
    );
    (err as any).statusCode = 403;
    throw err;
  }
}
```
This check is applied at middleware entry points and within internal service boundaries.
