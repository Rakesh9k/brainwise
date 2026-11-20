# BrainWise Security Implementation Specification

## 1. Threat Modeling & Defense-in-Depth
The BrainWise backend enforces security across all operational vectors in accordance with OWASP Top 10 API Security Risks:

1. **Broken Object Level Authorization (BOLA / IDOR):**
   - Strictly mitigated by `requireWorkspaceAccess` middleware. Path parameters (`:workspaceId`) are never assumed valid without validating `workspace_members` records matching the authenticated user.
2. **Broken Authentication:**
   - Stateless JWT verification via Firebase Admin SDK. Cryptographic signature and expiration checks run on every request.
3. **Broken Object Property Level Authorization:**
   - In Firestore Security Rules (`firestore.rules`), users cannot alter sensitive fields such as credit balances or roles directly.
4. **Unrestricted Resource Consumption:**
   - Sliding-window rate limiting in Express (`src/server/middleware/rateLimit.ts`).
   - Two-Phase Credit Reservation prevents unauthorized AI spending.
   - 2MB body size limit on Express JSON parser; 25MB limit on signed GCS uploads.
5. **Security Misconfiguration & Header Hardening:**
   - Explicit security response headers:
     - `X-Content-Type-Options: nosniff`
     - `X-Frame-Options: DENY`
     - `X-XSS-Protection: 1; mode=block`
     - `Referrer-Policy: strict-origin-when-cross-origin`
6. **Server-Side Request Forgery (SSRF) & Injection:**
   - All input bodies, queries, and route parameters validated via Zod schemas.
   - SVG sanitization in `src/utils/logic.ts` strips `<script>`, inline event handlers (`onload`, `onclick`), and `<foreignObject>` elements.

---

## 2. Multi-Tenant Cryptographic Boundaries
- Workspaces are physically isolated in Firestore (`workspaces/{workspaceId}/...`).
- Cloud Storage prefixes strictly enforce `workspaces/{workspaceId}/`.
- Cross-tenant data access is denied at the database driver, middleware, and security rules layers.
