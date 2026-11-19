# BrainWise Phase 2 — 12: System Architecture Diagrams & Technical Specifications

**Document ID:** `docs/phase-2/12-system-architecture-diagrams.md`  
**Version:** `2.0.0`  
**Date:** November 19, 2026  
**Auditor:** Principal Software Architect & Lead Systems Engineer  
**Status:** APPROVED & BINDING  

---

## 1. Executive Summary

This document consolidates the **12 authoritative architectural diagrams** for the BrainWise platform. Every diagram is accompanied by a technical narrative explaining components, trust boundaries, state transitions, and error recovery protocols.

**Mandatory Scope Reminder:** In accordance with product restrictions, all video components, rendering microservices, and video pipelines are strictly excluded from all architecture diagrams.

---

## 2. Diagram 1: Overall System Architecture

```mermaid
flowchart TD
    subgraph Clients["1. Client Layer (Web & Mobile Responsive)"]
        Browser[Next.js 16 / React 19 Frontend App]
        PWA[Progressive Web App Shell]
    end

    subgraph Edge["2. Edge, CDN & App Hosting"]
        Hosting[Firebase App Hosting / Cloudflare CDN]
        WAF[Google Cloud Armor DDoS Protection]
    end

    subgraph Compute["3. Serverless Compute Layer (asia-south1)"]
        Gateway[API Gateway / Router]
        AuthSvc[Auth & Tenancy Service]
        BrainSvc[Business Brain Engine]
        AiSvc[AI Orchestrator & Dispatcher]
        ResearchSvc[Research & Competitor Worker]
        BillingSvc[Credit Wallet & Cashfree Engine]
        SocialSvc[Publishing & OAuth Worker]
    end

    subgraph Queues["4. Asynchronous Queues & Schedulers"]
        CloudTasks[Google Cloud Tasks Queue]
        CloudScheduler[Google Cloud Scheduler Cron]
    end

    subgraph Data["5. Persistent Data & Secrets"]
        Firestore[(Cloud Firestore NoSQL)]
        GCS[(Google Cloud Storage)]
        SecretMgr[Google Cloud Secret Manager]
    end

    subgraph External["6. Third-Party Sanctioned APIs"]
        Gemini[Google Gemini 2.5 Flash / Pro]
        Imagen[Google Imagen 3 - Static Only]
        Tavily[Tavily Search API]
        Cashfree[Cashfree PG Webhooks]
        SocialMeta[Meta Graph & LinkedIn APIs]
        Resend[Resend Transactional Email]
    end

    Browser --> WAF
    PWA --> WAF
    WAF --> Hosting
    Hosting --> Gateway

    Gateway --> AuthSvc
    Gateway --> BrainSvc
    Gateway --> AiSvc
    Gateway --> ResearchSvc
    Gateway --> BillingSvc
    Gateway --> SocialSvc

    AiSvc --> CloudTasks
    SocialSvc --> CloudTasks
    CloudScheduler --> BillingSvc
    CloudScheduler --> ResearchSvc

    AuthSvc --> Firestore
    BrainSvc --> Firestore
    AiSvc --> Firestore
    ResearchSvc --> Firestore
    BillingSvc --> Firestore
    SocialSvc --> Firestore

    BrainSvc --> GCS
    AiSvc --> GCS
    AuthSvc --> SecretMgr
    BillingSvc --> SecretMgr
    SocialSvc --> SecretMgr

    AiSvc --> Gemini
    AiSvc --> Imagen
    ResearchSvc --> Tavily
    BillingSvc --> Cashfree
    SocialSvc --> SocialMeta
    AuthSvc --> Resend
```

### Architectural Narrative: Diagram 1
- **Client Tier:** React 19 single-page application with modular typography, responsive across 7 breakpoints.
- **Edge Security:** Google Cloud Armor and Cloudflare provide DDoS mitigation, TLS 1.3 termination, and edge caching for static assets.
- **Serverless Compute:** Firebase Cloud Functions Gen 2 running in Mumbai (`asia-south1`) on Node 22 automatically scale from 0 to 1,000 instances.
- **Persistence:** Cloud Firestore provides logical multi-tenancy and real-time synchronization; Google Cloud Storage stores private documents and rendered static assets with signed URL protection.

---

## 3. Diagram 2: Frontend-to-Backend Communication Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as User Browser
    participant React as React 19 Frontend
    participant Token as Firebase Auth Client SDK
    participant API as Cloud Functions Gateway
    participant RBAC as Tenant Security Middleware
    participant Service as Business Domain Service
    participant DB as Cloud Firestore

    User->>React: Clicks "Generate Brand Collateral"
    React->>Token: Obtains fresh Firebase ID Token (JWT)
    React->>API: HTTPS POST /api/v1/brand/generate-collateral<br/>Headers: Authorization, X-Workspace-Id, X-Idempotency-Key
    API->>API: Validates JWT signature & expiration
    API->>RBAC: Verifies user belongs to X-Workspace-Id with role != Viewer
    alt Unauthorized Role
        RBAC-->>React: 403 Forbidden (Insufficient permissions)
    else Authorized Tenant
        RBAC->>Service: Dispatches request to BrandCollateralService
        Service->>DB: Checks credit balance & reserves 5 credits
        Service->>Service: Generates SVG & runs Truth Check
        Service->>DB: Commits credits & writes asset record
        Service-->>React: 200 OK + Asset JSON & SVG Markup
        React-->>User: Renders verified collateral preview on artboard
    end
```

### Architectural Narrative: Diagram 2
Every user mutation is bound to an active workspace ID and cryptographically validated via Firebase Auth JWT. Role-Based Access Control is enforced server-side before any credit deduction or AI model execution occurs.

---

## 4. Diagram 3: Authentication & Workspace Authorization Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as User
    participant AuthUI as AuthPages (/login, /signup)
    participant FBAuth as Firebase Authentication
    participant CloudFn as Auth Cloud Function
    participant DB as Cloud Firestore (users & workspaces)

    User->>AuthUI: Submits email + password (or Google SSO)
    AuthUI->>FBAuth: signInWithPassword / signInWithPopup
    FBAuth-->>AuthUI: Returns ID Token & Refresh Token
    AuthUI->>CloudFn: POST /api/v1/auth/session-init
    CloudFn->>DB: Queries `users/{uid}` and `workspaceMembers/{uid_wsId}`
    alt First Time User
        CloudFn->>DB: Creates user profile & provisions default workspace
        CloudFn->>FBAuth: Sets custom claim `workspaceId = defaultWsId`
    else Existing User
        CloudFn->>DB: Resolves active workspace & membership role
    end
    CloudFn-->>AuthUI: Returns User Profile, Workspaces list & Active Role
    AuthUI-->>User: Transitions to Onboarding or Dashboard
```

### Architectural Narrative: Diagram 3
Authentication utilizes Firebase Auth for industry-standard credential storage. Tenant scoping is achieved through Custom Claims embedded within the JWT token, ensuring that client requests cannot spoof workspace IDs.

---

## 5. Diagram 4: Business Brain Ingestion & Data Flow

```mermaid
flowchart TD
    subgraph Ingestion["1. Document & Founder Ingestion"]
        Doc[Pitch Deck / Catalog PDF Upload] --> GCS[Cloud Storage Temp Upload]
        Manual[Founder Manual Fact Entries] --> ConfirmedTag[Tag: USER_CONFIRMED]
    end

    subgraph Extraction["2. AI Multimodal Fact Parsing"]
        GCS --> GeminiExtract[Gemini 2.5 Flash Document Parser]
        GeminiExtract --> ExtractedFacts[Structured JSON Facts]
        ExtractedFacts --> DocTag[Tag: DERIVED_FROM_DOC]
    end

    subgraph Conflict["3. Conflict Resolution & Review"]
        DocTag --> Resolver{Conflict Resolver}
        ConfirmedTag --> Resolver
        Resolver -->|USER_CONFIRMED strictly overrides DOC| CanonicalBrain[Approved Business Brain Store]
    end

    subgraph Distribution["4. Downstream Grounding Context"]
        CanonicalBrain --> TruthEngine[Deterministic Truth Engine]
        CanonicalBrain --> BrandStudio[AI Brand Studio Context]
        CanonicalBrain --> Strategy[Growth Director Context]
        CanonicalBrain --> Research[Idea Intelligence Context]
    end
```

### Architectural Narrative: Diagram 4
The Business Brain maintains a strict authority hierarchy: facts confirmed directly by the founder take precedence over AI extractions from uploaded pitch decks or catalogs. All downstream generation engines retrieve their prompt context from this sanitized store.

---

## 6. Diagram 5: Centralized AI Orchestration Pipeline

```mermaid
flowchart LR
    A[Feature Request] --> B[Credit Reservation: Hold N Credits]
    B --> C[Retrieve Business Brain Context & Anti-Fatigue Rules]
    C --> D[Hydrate Prompt Template & Model Selection]
    D --> E[Execute Gemini / Imagen API Call]
    E --> F[Zod JSON Schema Validation]
    F --> G[Deterministic Truth Check Pass]
    G -->|Pass| H[Settle Credits & Store Asset in Firestore/GCS]
    G -->|Fail| I[Auto-Refund Credits & Emit Safeguard Notice]
```

### Architectural Narrative: Diagram 5
Every AI call follows an 8-stage pipeline: credits are held in pending status before the model is called, structured output is validated via Zod schemas, and copy is verified against ground-truth facts. Credits are settled only upon verified completion.

---

## 7. Diagram 6: Competitor & Market Research Engine

```mermaid
sequenceDiagram
    autonumber
    actor User as User / Scheduled Cron
    participant Intel as Competitive Intelligence Service
    participant Search as Tavily Search API
    participant AI as Gemini 2.5 Flash
    participant DB as Cloud Firestore

    User->>Intel: Request Competitor Teardown: "roasteryhouse.com"
    Intel->>Search: Queries public domain text & meta content
    Search-->>Intel: Returns clean markdown & text excerpts
    Intel->>AI: Prompts Gemini with CompetitorSchema + Brain products
    AI-->>Intel: Extracts pricing tiers, claimed USPs, and positioning coordinates (X, Y)
    Intel->>DB: Stores snapshot in `competitors/{id}/snapshots`
    Intel->>DB: Updates 2D positioning map & feature comparison matrix
    Intel-->>User: Returns updated competitor teardown & strategic counter-moves
```

### Architectural Narrative: Diagram 6
Public competitor analysis avoids fragile scraping by utilizing the Tavily Search API for clean, legal text extraction. Gemini formats the data into structured positioning coordinates and gap analyses.

---

## 8. Diagram 7: Server-Side Credit Ledger & State Machine

```mermaid
stateDiagram-v2
    [*] --> Available: Monthly Quota Allocation / Top-Up Pack
    
    Available --> Reserved: Feature Request Initiated (Firestore Transaction Lock)
    
    Reserved --> Settled: Generation Succeeded & Truth Check Passed (Permanent Debit)
    Reserved --> Available: Timeout (>120s) / Upstream Failure / Truth Violation (Auto-Refund)
    
    Settled --> [*]
```

### Architectural Narrative: Diagram 7
Credit balances are managed inside atomic Firestore transactions. A two-phase commit protocol reserves credits prior to API calls and auto-refunds them immediately if errors or truth violations occur.

---

## 9. Diagram 8: Payment & Subscription Lifecycle (Cashfree & Stripe)

```mermaid
sequenceDiagram
    autonumber
    actor Founder as Workspace Owner
    participant Frontend as BrainWise Web
    participant Server as Billing Cloud Function
    participant Cashfree as Cashfree Payment Gateway
    participant DB as Firestore (Subscriptions & Wallet)

    Founder->>Frontend: Selects "Growth Pro ($149 / mo)"
    Frontend->>Server: POST /api/v1/billing/create-order
    Server->>Cashfree: Calls /pg/orders (Amount, Customer Details, ReturnURL)
    Cashfree-->>Server: Returns orderId & paymentSessionId
    Server->>DB: Records `paymentOrders` document (PENDING)
    Server-->>Frontend: Returns paymentSessionId
    Frontend->>Founder: Renders Cashfree Checkout Modal (UPI/Card/Netbanking)
    Founder->>Cashfree: Authorizes payment
    Cashfree->>Server: Server-to-Server Webhook (HMAC-SHA256 Signed)
    Server->>Server: Verifies webhook signature with Secret Key
    Server->>DB: Atomic Transaction: Set Order=SUCCESS, Subscription=ACTIVE, Grant 800 Credits
    Server-->>Cashfree: 200 OK
    DB-->>Frontend: Real-time listener updates credit balance on screen
```

### Architectural Narrative: Diagram 8
Payment confirmation relies strictly on cryptographically verified server-to-server webhooks using HMAC-SHA256 signatures. In-browser redirects serve purely as UX transitions.

---

## 10. Diagram 9: Background Job Queue (Cloud Tasks & Schedulers)

```mermaid
flowchart TD
    ScheduleRequest[User Schedules Post for Friday 10:00 AM] --> CloudTaskAPI[Cloud Tasks Enqueue]
    CloudTaskAPI --> TaskQueue[Queue: social-publishing-queue]
    TaskQueue -->|Delayed Execution| TaskWorker[Cloud Functions Publish Worker]
    TaskWorker --> VerifyToken[Verify Decrypted Meta/LinkedIn Token]
    VerifyToken --> CallAPI[Call Official Social Media API]
    CallAPI -->|Success| MarkPublished[Update Post Status: PUBLISHED]
    CallAPI -->|Transient Failure| RetryTask[Retry with Exponential Backoff: Max 3x]
    CallAPI -->|Permanent Failure| MoveDLQ[Move to Dead Letter Queue & Alert User]
```

### Architectural Narrative: Diagram 9
Point-in-time scheduled social publishing and recurring competitor surveillance run on Google Cloud Tasks, guaranteeing exact-time execution without persistent background worker processes.

---

## 11. Diagram 10: Social Media Integrations & Publishing

```mermaid
sequenceDiagram
    autonumber
    actor User as User
    participant Frontend as Brand Studio / Calendar
    participant Worker as Cloud Function Publish Worker
    participant Secrets as Secret Manager (AES-256 Key)
    participant Meta as Meta Graph API v19.0 (Instagram/FB)
    participant DB as Cloud Firestore

    User->>Frontend: Schedules 4:5 Carousel Post for Instagram
    Frontend->>Worker: Enqueues Cloud Task with execution timestamp
    Note over Worker: Cloud Task wakes worker at scheduled time
    Worker->>Secrets: Retrieves Master Decryption Key
    Worker->>DB: Fetches encrypted Instagram Page Access Token
    Worker->>Worker: Decrypts token via AES-256-GCM
    Worker->>Meta: POST /v19.0/{ig_user_id}/media (Image URLs + Caption)
    Meta-->>Worker: Returns creation_id container
    Worker->>Meta: POST /v19.0/{ig_user_id}/media_publish (creation_id)
    Meta-->>Worker: Returns live platform post_id & permalink
    Worker->>DB: Updates `scheduledPosts` document (Status: PUBLISHED, URL: permalink)
    Worker-->>Frontend: Real-time update displays published checkmark
```

### Architectural Narrative: Diagram 10
Social integrations connect exclusively via official platform APIs (Meta Graph API v19.0 and LinkedIn Marketing API). Tokens are encrypted with AES-256-GCM and decrypted only in memory during publish execution.

---

## 12. Diagram 11: Analytics Aggregation & Reporting Engine

```mermaid
flowchart TD
    SocialAPIs[Meta & LinkedIn Insights API] --> IngestWorker[Cloud Tasks Sync Worker]
    StripeShopify[Stripe & Shopify Webhooks] --> IngestWorker
    IngestWorker --> AggregateDB[(Firestore analyticsSnapshots)]
    AggregateDB --> Dashboard[Recharts Performance Dashboard]
    AggregateDB --> GeminiReport[Gemini 2.5 Flash Narrative Generator]
    GeminiReport --> ExecutiveMemo[Print-Ready Executive PDF Memo]
```

### Architectural Narrative: Diagram 11
Metrics are ingested from official APIs into normalized daily snapshots. The Recharts dashboard visualizes trends while Gemini 2.5 Flash provides executive narrative analysis grounded strictly in confirmed numbers.

---

## 13. Diagram 12: Firestore Data Architecture & Collection Relationships

```mermaid
erDiagram
    users ||--o{ workspaceMembers : joins
    workspaces ||--o{ workspaceMembers : contains
    workspaces ||--|| businessBrain : owns
    workspaces ||--o{ products : catalogs
    workspaces ||--o{ personas : targets
    workspaces ||--o{ contentItems : generates
    workspaces ||--o{ marketingTasks : tracks
    workspaces ||--o{ competitors : monitors
    workspaces ||--o{ researchReports : validates
    workspaces ||--|| creditWallet : holds
    creditWallet ||--o{ creditTransactions : records
    workspaces ||--|| subscriptions : bills
    subscriptions ||--o{ paymentOrders : invoices
```

### Architectural Narrative: Diagram 12
The entity-relationship model enforces strict multi-tenancy: every core business object is encapsulated within a parent `workspaces` document boundary, preventing cross-tenant access and simplifying cascade deletions.
