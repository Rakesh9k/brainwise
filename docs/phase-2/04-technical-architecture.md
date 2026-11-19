# BrainWise Phase 2 — 04: Technical Architecture Specification

**Document ID:** `docs/phase-2/04-technical-architecture.md`  
**Version:** `2.0.0`  
**Date:** November 19, 2026  
**Auditor:** Principal Software Architect, Backend Architect, & Cloud Infrastructure Engineer  
**Status:** APPROVED & BINDING  

---

## 1. Architectural Philosophy & Strategy

BrainWise is architected as a **Modular Serverless Monolith** hosted on Google Cloud Platform (GCP) and Firebase. 

### Core Design Principles:
1. **Server-Side AI Control:** Clients never call AI models directly. Every request is authenticated, credit-metered, grounded in Business Brain context, and validated server-side.
2. **Deterministic Truth & Provenance First:** No AI output reaches the client without passing through the Deterministic Truth Engine to eliminate price hallucinations and claim violations.
3. **Avoid Microservice Sprawl:** A single modular codebase running on Firebase Functions Gen 2 and Cloud Run delivers maximum developer velocity, zero idle cost, and effortless scaling from 10 to 10,000 tenants.
4. **Zero Video Footprint:** All video generation, video rendering microservices (e.g. Remotion, FFmpeg), and GPU video workers are strictly excluded from the architecture.

---

## 2. Technology Stack Evaluation & Selection

```mermaid
flowchart TD
    subgraph Client["Frontend Layer (Next.js 16 / React 19)"]
        UI[Design Freeze v1.0 UI / Tailwind v4]
        State[BrainWiseContext + Server State SWR]
        Motion[Motion v12 Liquid Physics]
    end

    subgraph Gateway["API Gateway & Compute (Firebase Gen 2 / Cloud Run)"]
        Functions[Firebase Cloud Functions v2 - Node 22]
        Tasks[Cloud Tasks Async Job Queue]
        Sched[Cloud Scheduler Cron]
    end

    subgraph Data["Persistence & Storage Layer"]
        Firestore[(Cloud Firestore NoSQL)]
        GCS[(Google Cloud Storage Assets)]
        Secrets[GCP Secret Manager]
    end

    subgraph External["Sanctioned External Services"]
        Gemini[Google Gemini 2.5 Flash / Pro]
        Imagen[Google Imagen 3 (Static Only)]
        Search[Tavily / Google Search API]
        Pay[Cashfree PG / Stripe]
        Social[Meta Graph API / LinkedIn API]
    end

    Client -->|HTTPS + Firebase Auth JWT| Functions
    Functions -->|Transactions & Queries| Firestore
    Functions -->|Signed Upload & Asset Read| GCS
    Functions -->|Enqueue Background Work| Tasks
    Sched -->|Trigger Daily Maintenance| Functions
    Functions -->|Orchestrated AI Prompting| Gemini
    Functions -->|Static Visual Textures| Imagen
    Functions -->|Competitor Domain Scans| Search
    Functions -->|Checkout & Webhooks| Pay
    Functions -->|Official Post Publishing| Social
```

### 2.1 Layer-by-Layer Evaluation

| Layer | Selected Technology | Alternative Evaluated | Selection Rationale & Trade-off Analysis |
|---|---|---|---|
| **Frontend Framework** | **React 19 + Next.js App Router (or Vite SPA)** | Single Page App (Vite only) vs Remix | The existing React 19 component library integrates seamlessly. Next.js App Router provides server-side rendering for marketing pages, fast static builds, and edge API routing. |
| **Styling & Design Tokens** | **Tailwind CSS v4 + CSS Variables** | CSS Modules / Styled Components | Fully implemented and frozen in `src/index.css` and `src/design/tokens.ts`. Tailwind v4 compiler is 5x faster; CSS custom properties guarantee zero design token drift. |
| **Animation Engine** | **Motion v12 (`motion/react`)** | GSAP, Vanilla CSS | Locked in Design Freeze v1.0. Implements approved fluid deceleration curve `cubic-bezier(0.16, 1, 0.3, 1)` with automatic `prefers-reduced-motion` safety. |
| **Backend Compute** | **Firebase Cloud Functions Gen 2 (Node 22 / TSX)** | Dedicated Express VM, Kubernetes | Built on Google Cloud Run. Scales automatically from 0 to 1,000 instances; zero idle cost; native integration with Cloud Firestore and Cloud Tasks. |
| **Database** | **Google Cloud Firestore** | PostgreSQL (Cloud SQL), MongoDB | Serverless NoSQL document store with native real-time synchronization, subcollection isolation, strict Security Rules, and multi-region 99.999% availability. |
| **Object Storage** | **Google Cloud Storage (GCS)** | AWS S3, Cloudflare R2 | Direct signed URLs for secure uploads; regional colocation with Cloud Functions eliminates egress latency and bandwidth charges. |
| **Primary Text AI** | **Google Gemini 2.5 Flash & Pro** | OpenAI GPT-4o, Anthropic Claude 3.5 | 1M+ token context window allows full document ingestion; structured JSON schema enforcement; 60–80% lower cost per token than competitors. |
| **Static Image AI** | **Google Imagen 3** | Midjourney, Stable Diffusion | Native Google Gen AI SDK support; commercially cleared; photorealistic static textures and backgrounds without hosting GPUs. |
| **Payment Gateway** | **Cashfree Payments** | Razorpay, Stripe India | Native support for Indian INR UPI AutoPay recurring subscriptions, credit/debit cards, netbanking, and automated GST tax invoices. |

---

## 3. Service Boundaries & Responsibilities

The architecture is split into 6 decoupled serverless modules:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        BRAINWISE BACKEND MODULES                       │
├──────────────────────────┬──────────────────────────┬──────────────────┤
│ 1. Identity & Tenancy    │ 2. Business Brain Core   │ 3. AI Dispatcher │
├──────────────────────────┼──────────────────────────┼──────────────────┤
│ 4. Competitor Engine     │ 5. Publishing Queue      │ 6. Billing Wallet│
└──────────────────────────┴──────────────────────────┴──────────────────┘
```

1. **Identity & Tenancy Service (`services/auth/`):** Manages user session verification, workspace provisioning, member invitations, and role-based permissions.
2. **Business Brain Core Service (`services/brain/`):** Manages structured profile CRUD, fact provenance tagging, conflict resolution between documents and founder inputs, and context building.
3. **AI Dispatcher & Orchestration Service (`services/ai/`):** Central entry point for all LLM calls. Handles model routing, prompt templating, token counting, credit reservation, and deterministic truth checking.
4. **Competitor & Market Research Service (`services/research/`):** Orchestrates public domain searches via Tavily/Google Search, extracts positioning coordinates, and calculates parametric TAM/SAM/SOM sizing.
5. **Publishing & Social Distribution Service (`services/social/`):** Manages encrypted OAuth tokens, schedules posts via Cloud Tasks, and interacts with Meta Graph API and LinkedIn Marketing API.
6. **Billing & Credit Wallet Service (`services/billing/`):** Executes atomic credit ledger transactions, processes Cashfree order checkouts and webhook verification, and issues tax invoices.

---

## 4. Scalability & Tenancy Model

### 4.1 Tenancy Isolation
BrainWise implements **Logical Multi-Tenancy** within Cloud Firestore:
- Every data document contains a top-level `workspaceId` field.
- Firestore Security Rules enforce isolation at the database engine level:
  ```javascript
  match /workspaces/{workspaceId}/{collection}/{docId} {
    allow read, write: if request.auth != null && 
      exists(/databases/$(database)/documents/workspaceMembers/$(request.auth.uid + '_' + workspaceId));
  }
  ```
- Subcollections (`workspaces/{id}/products`, `workspaces/{id}/contentItems`) guarantee that cross-tenant queries are physically impossible in client and server SDK queries.

### 4.2 Scale Roadmap: 100 to 10,000 Customers

```
Phase 1: 100 Tenants (Launch)
  • Serverless concurrency: Functions scale to ~20 instances on demand.
  • Database: Single Firestore multi-region database (asia-south1 / us-central1).
  • Zero idle infrastructure cost (<$15/mo baseline).

Phase 2: 1,000 Tenants (Growth)
  • Caching: Redis (Google Cloud Memorystore) caches active Business Brain contexts.
  • Async Decoupling: Cloud Tasks absorbs peak traffic spikes for research jobs.
  • Database: Automated index optimization and collection group partitioning.

Phase 3: 10,000 Tenants (Scale)
  • Cloud Run dedicated containers for heavy analytical aggregations.
  • Read Replicas: Read-heavy public reports served via Cloudflare CDN caching.
  • FinOps: Committed use discounts on GCP compute and enterprise Gemini tier.
```
