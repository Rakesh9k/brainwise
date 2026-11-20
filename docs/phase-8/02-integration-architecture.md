# BRAINWISE — PHASE 8: EXTERNAL INTEGRATIONS ARCHITECTURE SPECIFICATION
**Document ID:** `docs/phase-8/02-integration-architecture.md`  
**Phase:** 8 — External Integrations, Connectivity & Intelligent Automation Engine  
**Security Classification:** Highly Confidential / Enterprise Architectural Blueprint  
**Status:** Approved & Implemented in Production  

---

## 1. Executive Architectural Overview

Phase 8 elevates BrainWise from a self-contained AI strategic intelligence application into a real-time, operating platform connected to external enterprise data sources, digital marketing channels, web performance telemetry, and transactional delivery gateways.

The integration architecture is designed around four foundational pillars:
1. **Zero-Trust Multi-Tenant Isolation:** All third-party credentials, data telemetry, execution queues, and audit logs are isolated under `workspaces/{workspaceId}/...`. Cross-tenant data leakage is cryptographically and logically prohibited.
2. **Authenticated Credential Encryption (AES-256-GCM):** Sensitive OAuth access tokens, refresh tokens, and API keys are encrypted at rest using AES-256-GCM with a 96-bit random IV, 128-bit authentication tag, and scrypt key derivation. Tokens are never exposed to the client bundle or written in cleartext to Firestore.
3. **Normalized Canonical Data Stream Layer:** Raw payloads from diverse third-party APIs (REST, JSON, GraphQL) are transformed into strongly typed canonical `NormalizedDataRecord` objects before persistence, providing a consistent telemetry vocabulary for all 7 departments.
4. **Three-Tier Action Safety & Human Approval Gate:** Operations are classified into Category A (Read-Only), Category B (Internal Strategic Synthesis), and Category C (External Consequential Write). All Category C actions enforce an explicit human approval gate.

```
+---------------------------------------------------------------------------------------------------+
|                                     BRAINWISE CLIENT (REACT 19)                                   |
|  - Integration Center (Registry, Automations, Audit Streams)                                     |
|  - Connection Workflow Modal (Scope Transparency, Consent Check)                                  |
|  - Management Drawer (Health Checks, Sync Now, Disconnect)                                        |
|  - Human Approval Gate Modal (Category C Pending Confirmation)                                    |
+-------------------------------------------------+-------------------------------------------------+
                                                  | REST API (/api/v1/integrations/*)
                                                  v
+---------------------------------------------------------------------------------------------------+
|                                BRAINWISE INTEGRATION CORE SERVICE                                 |
|                                                                                                   |
|  +--------------------+  +----------------------+  +---------------------+  +------------------+  |
|  | IntegrationManager |  |    OAuthService      |  |  CredentialManager  |  | IngestionService |  |
|  | - Lifecycle Engine |  | - State Nonce & HMAC |  | - AES-256-GCM       |  | - Canonical Map  |  |
|  | - Health Audits    |  | - PKCE S256 Verifier |  | - Scrypt Derivation |  | - Deduplication  |  |
|  | - Sync Coordinator |  | - Single-Use Replay  |  | - Subcollection Enc |  | - Tenant Storage |  |
|  +--------------------+  +----------------------+  +---------------------+  +------------------+  |
|                                                  |                                                |
|  +-----------------------------------------------+---------------------------------------------+  |
|  |                              PROVIDER ADAPTER REGISTRY                                      |  |
|  |  [Google Research]     [Google Analytics 4]     [Search Console]     [Google Business]      |  |
|  |  [Email Gateway]       [Meta / Instagram]       [LinkedIn Page]      [Google Drive]         |  |
|  |  [YouTube Data] (*Read-Only Analytics Solely — Strict Video Generation Exclusion)           |  |
|  +-----------------------------------------------+---------------------------------------------+  |
|                                                  |                                                |
|  +-----------------------------------------------+---------------------------------------------+  |
|  |                           AUTOMATION ENGINE & SCHEDULER                                     |  |
|  |  - 7 Production Templates  - Time/Data Event Triggers  - Automatic Retries (Backoff)       |  |
|  |  - Three-Tier Safety Gate: Category A / B Auto-Exec | Category C Human Approval Halt        |  |
|  +---------------------------------------------------------------------------------------------+  |
+-------------------------------------------------+-------------------------------------------------+
                                                  |
                                                  v
+---------------------------------------------------------------------------------------------------+
|                               PERSISTENCE & SECURITY ISOLATION                                    |
|  - workspaces/{workspaceId}/integrations/{integrationId}           (Connection Metadata)          |
|  - workspaces/{workspaceId}/integrations/{integrationId}/secure/... (AES-256-GCM Credentials)     |
|  - workspaces/{workspaceId}/imported_data/{recordId}               (Normalized Telemetry)         |
|  - workspaces/{workspaceId}/automations/{automationId}             (Job Definitions)              |
|  - workspaces/{workspaceId}/automations/.../executions/{id}        (Execution Runs & Approval)    |
|  - workspaces/{workspaceId}/integration_audit/{eventId}            (Tamper-Evident Ledger)        |
+---------------------------------------------------------------------------------------------------+
```

---

## 2. Integration Core Components

### 2.1 Credential Manager (`src/server/integrations/credentialManager.ts`)
- Implements authenticated encryption using Node.js `crypto` primitives.
- Algorithm: `aes-256-gcm` with 96-bit random IV and 128-bit authentication tag.
- Storage: Dedicated restricted subcollection `workspaces/{workspaceId}/integrations/{integrationId}/secure/credentials`.
- Security Boundary: Cleartext keys are decrypted strictly in server memory during active sync requests and immediately released.

### 2.2 OAuth Service (`src/server/integrations/oauthService.ts`)
- Manages CSRF-resistant state nonces with 15-minute TTL.
- Enforces single-use consumption: upon verification, the state token is permanently deleted from the cache to prevent replay attacks.
- Supports RFC 7636 Proof Key for Code Exchange (PKCE) with SHA-256 code challenge generation.

### 2.3 Provider Registry (`src/server/integrations/providerRegistry.ts`)
- Single point of discovery for all 9 integrated adapters.
- Categorizes providers into `website_seo`, `local_business`, `social_media`, `communication`, `storage_docs`, and `research`.
- Exposes uniform capability metadata, required OAuth scopes, and official documentation links.

### 2.4 Data Ingestion Service (`src/server/integrations/dataIngestionService.ts`)
- Ingests raw batches and maps them into `NormalizedDataRecord`.
- Applies provenance metadata (`sourceType`, `verified`, `confidenceScore`).
- Performs deduplication by `recordId` within time windows.
- Automatically purges all imported data when an integration is disconnected.

### 2.5 Integration Audit Service (`src/server/integrations/integrationAuditService.ts`)
- Records an immutable audit event for every lifecycle action (Connect, Sync, Disconnect, Approve).
- Sanitizes sensitive parameters (strips `accessToken`, `refreshToken`, `apiKey`, `clientSecret`).
- Preserves legal and compliance traceability under India's Digital Personal Data Protection Act (DPDPA).

---

## 3. Strict Compliance Directives

### 3.1 Strict Video Exclusion
In accordance with `AGENTS.md` and `GEMINI.md`:
- YouTube Data API adapter (`src/server/integrations/providers/youtubeProvider.ts`) is strictly restricted to read-only channel and video performance analytics (subscriber counts, views, watch-time minutes, audience retention).
- Write actions attempting video generation, editing, rendering, or Remotion pipeline execution are permanently blocked and rejected at the adapter boundary.

### 3.2 Two-Phase Credit Reservation Protocol
- Background automated jobs and external research workflows consume credits strictly through `CreditService` backend transactions.
- If upstream provider APIs fail or truth check validation fails, reserved credits are automatically released with zero net charge to the workspace wallet.
