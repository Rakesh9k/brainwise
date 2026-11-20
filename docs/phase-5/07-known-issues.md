# Phase 5: Known Issues & Technical Debt Register
## Architectural Limitations, Workarounds & Future Phase Roadmap

**Document Version:** 1.0.0  
**Phase Status:** ACTIVE TRACKING  
**Date:** November 20, 2026  
**Scope:** Phase 5 SaaS Engine, Auth, Onboarding & Business Brain

---

## 1. Technical Debt & Workarounds Register

### 1.1 Production Transactional Email Transport
- **Current State:** The 6-digit verification codes and password reset tokens are generated cryptographically and stored in Firestore. In development and test modes, codes are returned in API responses and logged to the server console.
- **Production Requirement:** For public production deployment, a dedicated transactional email provider (SendGrid, Postmark, AWS SES, or Resend) must be bound to `authService.sendVerificationEmail` and `authService.sendPasswordResetEmail`.
- **Impact:** Low during closed alpha / staging testing. High for self-serve open registration.
- **Remediation Plan:** Wire `nodemailer` or official SendGrid SDK in Phase 6 deployment scripts.

---

### 1.2 Frontend Bundle Size (> 500 kB Chunk)
- **Current State:** Vite production build generates `dist/assets/index-dSXYO0YH.js` (~1.5 MB uncompressed, ~414 kB gzip). Vite emits a chunk size warning suggesting dynamic imports.
- **Reason:** Full application bundle includes Lucide icons, Motion animation primitives, Recharts, and all 14 department pages in a single chunk.
- **Impact:** Initial page load time is slightly higher on slow 3G mobile connections. Once loaded, client navigation is instantaneous.
- **Remediation Plan:** Introduce `React.lazy()` route-based code splitting for secondary department pages (`AnalyticsReportsPage`, `MarketWatchPage`, `BrandStudioPage`) during Phase 6 optimization.

---

### 1.3 Google OAuth Integration Bridge
- **Current State:** Complete email/password registration, verification codes, session restoration, and password reset are operational. Google OAuth UI button is present in `AuthPages.tsx`.
- **Reason:** Direct Firebase Client SDK Google Popup requires active Google Cloud OAuth Client ID and registered authorized domains in Firebase Console (`brain-wise.com`).
- **Impact:** Minimal. Founders can register and sign in seamlessly with email and password.
- **Remediation Plan:** Enable Google Identity Provider in Firebase Console when DNS is configured for staging.

---

### 1.4 Strict Product Boundaries Maintained
- **Video Generation:** Zero video generator scripts or pipelines exist in BrainWise. All collateral remains high-DPI vector SVG, stationery, carousels, and copy packs.
- **Persistence Boundary:** LocalStorage is completely blocked from storing user credentials, onboarding state, or business brain documents. LocalStorage is restricted exclusively to ephemeral UI preferences (e.g. sidebar collapse state).
