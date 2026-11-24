# BrainWise Competitive Intelligence — Security Audit & Threat Modeling

**Date:** 2026-11-22  
**Scope:** Competitive Intelligence Subsystems, Public Crawler Ingestion, Multi-Tenancy & Financial Transactions.

---

## 1. Threat Modeling (STRIDE Methodology)

### 1.1 Spoofing (Identity & Tenant Spoofing)
- **Risk:** Malicious user injecting foreign `workspaceId` headers to read or mutate a competitor project belonging to another organization.
- **Mitigation:**
  - Route handlers authenticate the caller via Firebase Auth and enforce workspace membership checks.
  - All queries in `competitiveIntelligenceRepository.ts` prefix paths with `workspaces/{workspaceId}/`.
  - Automated tests (`competitiveIntelligence.e2e.test.ts` Scenario I) verify that queries across workspaces return zero cross-tenant records.

### 1.2 Tampering (Data Modification & Ingestion Poisoning)
- **Risk:** Malicious competitor feeding deceptive data into public reviews or meta-tags to pollute the business context.
- **Mitigation:**
  - Ingestion sources are weighted by `authorityScore` (0–100).
  - Unverified claims are categorized as `ESTIMATED` or `UNAVAILABLE`.
  - Contradiction detection actively flags conflicting signals rather than blindly averaging them.

### 1.3 Repudiation (Billing & Credit Disputes)
- **Risk:** User disputes credit consumption after initiating an expensive deep research workflow.
- **Mitigation:**
  - Enforces the Two-Phase Credit Reservation Protocol (ADR-006).
  - An atomic transaction creates a reservation ledger entry before the job starts.
  - Only upon successful report synthesis is the charge permanently finalized.
  - Failures automatically release reserved credits with zero net cost to the user.

### 1.4 Information Disclosure (SSRF & Internal Network Exposure)
- **Risk:** A user provides a competitor website URL targeting internal services or cloud metadata endpoints (`http://169.254.169.254/latest/meta-data/` or `http://localhost:8080`).
- **Mitigation:**
  - `ssrfValidator.ts` validates all outbound URLs before initiating HTTP queries.
  - Rejects:
    - IPv4 private networks: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`.
    - Link-local and cloud metadata: `169.254.0.0/16`.
    - Localhost & Loopback: `127.0.0.0/8`, `::1`, `localhost`.
  - Verified by `competitiveIntelligence.e2e.test.ts` Scenario J.

### 1.5 Denial of Service (ReDoS & Resource Exhaustion)
- **Risk:** Pathological regex inputs in company name normalization or LLM response parsing locking up the Node event loop.
- **Mitigation:**
  - Company canonicalization uses safe linear string transformations and anchored replacements.
  - Long prompts and review corpora are capped at strict token boundaries before processing.

### 1.6 Elevation of Privilege
- **Risk:** Workspace viewers or external guests triggering expensive research scans.
- **Mitigation:**
  - RBAC verification requires `admin` or `member` role permissions for triggering discovery scans or credit wallet deductions.

---

## 2. DPDPA & Data Privacy Compliance
- Competitor executive tracking adheres strictly to publicly available corporate filings and press releases.
- Customer review analysis anonymizes user identifiers, aggregating only sentiment themes and product pain points.
- No personal identifiable information (PII) of consumers is indexed or persisted in the Evidence Lake.
