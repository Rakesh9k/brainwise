# BrainWise Phase 2: Architecture Decision Records (ADRs)

## Document Metadata
- **Document ID:** `BW-DOC-P2-017`
- **Version:** `1.0.0`
- **Author:** Principal Software Architect & Architecture Review Board
- **Date:** 2026-11-19
- **Status:** Approved / Enforced for Phase 3 Implementation
- **Mandatory Product Restriction:** BrainWise **EXPLICITLY EXCLUDES ALL AI VIDEO GENERATION, VIDEO EDITING, REEL GENERATION, VIDEO RENDERING, VIDEO PIPELINES, OR VIDEO CREDITS**.

---

## Index of Architecture Decision Records

| ADR ID | Title | Status | Impact Area |
| :--- | :--- | :--- | :--- |
| **ADR-001** | Modular Serverless Monolith on Firebase Functions Gen 2 vs. Microservices | **ACCEPTED** | Backend & Infrastructure |
| **ADR-002** | Cloud Firestore NoSQL Hierarchical Document Model vs. Relational Cloud SQL | **ACCEPTED** | Database & Persistence |
| **ADR-003** | Exclusion of Vector Database in Favor of Full-Context LLM Business Ingestion | **ACCEPTED** | AI Systems & FinOps |
| **ADR-004** | Total Exclusion of AI Video Generation and Video Rendering Pipelines | **ACCEPTED** | Product Scope & Core Architecture |
| **ADR-005** | Deterministic Truth Engine with Server-Side Auto-Refund Guarantee | **ACCEPTED** | AI Reliability & Business Brain |
| **ADR-006** | Server-Side Two-Phase Credit Reservation Protocol for Financial Concurrency | **ACCEPTED** | Billing & Credit Wallet |
| **ADR-007** | Pure SVG Vector Generation via LLM vs. Raster Diffusion Image Generation | **ACCEPTED** | AI Brand Studio & Collateral |
| **ADR-008** | Cashfree Domestic Gateway with Dual-Check Server Verification | **ACCEPTED** | Payment Gateway & Invoicing |
| **ADR-009** | Cloud Tasks Distributed Asynchronous Queue for Social Media Scheduling | **ACCEPTED** | Background Jobs & Publishing |
| **ADR-010** | Client-Side React 19 Design Freeze Preservation & Zero-Regression Rules | **ACCEPTED** | Frontend Engineering & UX |

---

## ADR-001: Modular Serverless Monolith on Firebase Functions Gen 2 vs. Microservices

### Context & Problem Statement
BrainWise encompasses 14 functional departments ranging from Onboarding and Business Brain management to Market Research, Copy Generation, and Social Publishing. The engineering team must select a deployment topology that provides rapid developer velocity, high reliability, zero idle infrastructure costs, and minimal operational overhead for an initial team of 4 to 8 full-stack engineers.

### Decision Drivers
1. Minimize operational DevOps complexity (no Kubernetes clusters, service meshes, or ingress controllers).
2. Zero idle infrastructure cost during low-traffic hours (nighttime in India / bootstrap phase).
3. Scale elastically from 0 to 1,000 concurrent requests during marketing spikes.
4. Share TypeScript types seamlessly between frontend client and backend handlers.

### Considered Options
- **Option 1:** Distributed Microservices (separate repositories and Docker containers for each of the 14 departments deployed on Google Kubernetes Engine).
- **Option 2:** Single Long-Running Express Server on a Compute Engine VM or basic Cloud Run.
- **Option 3:** Modular Serverless Monolith deployed via Firebase Functions Gen 2 (Cloud Run backend) in region `asia-south1` (Mumbai).

### Decision Outcome
**Chosen Option: Option 3 (Modular Serverless Monolith on Firebase Functions Gen 2).**

### Justification & Consequences
- **Positive:** Single repository (`/backend/functions`) containing organized department routers (`/routes/brain`, `/routes/marketing`, etc.) sharing unified middleware, auth, and database helpers. Scales down to zero cost when idle and automatically scales up to 1,000 container instances.
- **Negative:** Cold starts of ~1.2s on Node.js container spin-up (mitigated by setting `minInstances: 1` on critical auth and generation endpoints in production).
- **Verification:** Unit tests and integration test suites run against local Firebase Emulator Suite with 100% route fidelity.

---

## ADR-002: Cloud Firestore NoSQL Hierarchical Document Model vs. Relational Cloud SQL

### Context & Problem Statement
The platform manages hierarchical, highly semi-structured data: workspace metadata, user profiles, evolving Business Brain facts with flexible attributes, AI-generated campaign trees, social copy variations, and market research dossiers. We must choose between a relational model (Cloud SQL PostgreSQL) and a hierarchical document model (Cloud Firestore).

### Decision Drivers
1. Rapid schema evolution for AI-inferred business facts without executing database migrations.
2. Native real-time synchronization capabilities for collaboration and generation progress indicators.
3. Automatic multi-zone replication, automated daily backups, and serverless auto-scaling.
4. Clean tenant isolation enforced at the database security rule layer.

### Considered Options
- **Option 1:** Cloud SQL for PostgreSQL with Prisma ORM.
- **Option 2:** Cloud Firestore in Datastore mode.
- **Option 3:** Cloud Firestore in Native mode with hierarchical subcollections (`workspaces/{workspaceId}/...`).

### Decision Outcome
**Chosen Option: Option 3 (Cloud Firestore Native Mode with Hierarchical Subcollections).**

### Justification & Consequences
- **Positive:** Subcollection model naturally enforces multi-tenancy. Security rules guarantee that Tenant A can never read Tenant B's data at the database engine level. Flexible JSON document structures allow the Business Brain to evolve without complex DDL migration scripts.
- **Negative:** Firestore does not support relational JOIN operations. Cross-entity aggregation requires denormalization or parallel batch reads. Mitigated by disciplined document design and pre-aggregated summary fields (`memberCount`, `totalCampaigns`).

---

## ADR-003: Exclusion of Vector Database in Favor of Full-Context LLM Business Ingestion

### Context & Problem Statement
Modern generative AI architectures frequently default to Retrieval-Augmented Generation (RAG) using external vector databases (Pinecone, Weaviate, Milvus, Qdrant). BrainWise stores business facts, brand voice guidelines, product catalogs, and competitor benchmarks. We must evaluate whether a dedicated vector database is warranted.

### Decision Drivers
1. **Fact Fidelity:** Vector similarity search (cosine distance on embeddings) frequently retrieves semantically similar but factually irrelevant or out-of-date fragments, causing hallucination.
2. **Infrastructure Cost:** Managed vector databases incur fixed baseline costs of \$70 to \$200 per month regardless of traffic volume.
3. **Context Window Expansion:** Foundation models (Gemini 2.5 Flash and Gemini 2.5 Pro) feature context windows exceeding 1,000,000 tokens. A comprehensive business profile, product list, and brand guideline document consumes fewer than 15,000 tokens (less than 1.5% of the available window).

### Considered Options
- **Option 1:** Dedicated Vector Database (Pinecone) with text embeddings (text-embedding-004) chunking business data.
- **Option 2:** Firestore Vector Search extension (pgvector equivalent on Firestore).
- **Option 3:** Full-Context Ingestion of authoritative, structured Business Brain JSON directly into LLM system prompts with zero vector indexing.

### Decision Outcome
**Chosen Option: Option 3 (Full-Context Ingestion of Structured Business Brain JSON).**

### Justification & Consequences
- **Positive:** Eliminates retrieval hallucination completely; 100% of confirmed business facts and negative constraints are guaranteed to be present in the model's active attention window. Saves \$1,500+ annually in cloud infrastructure. Eliminates vector synchronization pipelines.
- **Negative:** Slightly higher input token counts per prompt (~8,000 tokens vs 1,500 tokens). Given Gemini 2.5 Flash's pricing of \$0.075 per 1M input tokens, 8,000 tokens costs only \$0.0006 per call, which is 100x cheaper than the amortized cost of running dedicated vector clusters.

---

## ADR-004: Total Exclusion of AI Video Generation and Video Rendering Pipelines

### Context & Problem Statement
Competitor AI platforms (such as InVideo, HeyGen, or generic content generators) offer AI video generation, automated Reel rendering, and avatar speaking clips. We must make an explicit, binding architectural determination regarding AI video capabilities in BrainWise.

### Decision Drivers
1. **Product Focus:** BrainWise is positioned as an intelligent business growth and marketing management platform, not a video editing studio.
2. **Technical Feasibility & Cost:** Video generation and rendering requires dedicated GPU instances, Remotion/FFmpeg rendering clusters, massive bandwidth, and high-latency pipelines (2 to 8 minutes per render), creating high infrastructure complexity and poor unit economics.
3. **Customer Value Proposition:** Target users (MSMEs, local businesses, boutique agencies) need clear brand identity, high-converting copy, marketing calendars, competitor clarity, and static brand collateral before they can benefit from automated video.

### Considered Options
- **Option 1:** Full AI Video Generation suite with third-party video APIs (Runway Gen-2, Luma Dream Machine, Remotion).
- **Option 2:** Template-based video stitching with text overlays.
- **Option 3:** **Strict, total exclusion of all AI video generation, video editing, Reel generation, video rendering, and video credits across the entire platform.**

### Decision Outcome
**Chosen Option: Option 3 (Strict, total exclusion of AI video).**

### Justification & Consequences
- **Positive:** Zero GPU infrastructure costs, zero FFmpeg rendering pipelines, zero video storage bloat, and hyper-focused product messaging. Engineering resources are 100% directed toward superior business intelligence, brand identity, static design collateral, and actionable strategy.
- **Negative:** Platform cannot fulfill customer requests for auto-generated TikTok/Reels video clips. Mitigated by generating rich multi-frame carousel graphics, static visual posts, and detailed video scripts with shot-by-shot storyboards for manual production.

---

## ADR-005: Deterministic Truth Engine with Server-Side Auto-Refund Guarantee

### Context & Problem Statement
Generative AI models occasionally hallucinate unverified claims, incorrect product pricing, non-existent offers, or fabricated contact information. If BrainWise generates marketing copy with inaccurate business facts, it damages the client's commercial credibility and erodes trust in the platform.

### Decision Drivers
1. Guarantee zero hallucinated pricing or business claims in public marketing copy.
2. Differentiate between confirmed customer facts and speculative marketing copy.
3. Provide financial protection to users so they are never charged platform credits for flawed AI outputs.

### Considered Options
- **Option 1:** Client-side disclaimer banner (*"AI can make mistakes; check important info"*).
- **Option 2:** Secondary LLM critique prompt (*"Check if this copy matches the business facts"*).
- **Option 3:** Deterministic Two-Stage Truth Check (`truthCheck.ts`) combining rule-based regular expressions, negative constraint enforcement, and strict price validation, coupled with an automatic server-side credit refund protocol.

### Decision Outcome
**Chosen Option: Option 3 (Deterministic Two-Stage Truth Check with Server-Side Auto-Refund).**

### Justification & Consequences
- **Positive:** Guarantees brand safety. If generated copy violates a confirmed negative constraint (e.g., claiming a warranty that does not exist) or cites a price not found in the Business Brain, the output is blocked, an error record is logged, and reserved credits are instantly restored to the user's wallet with zero net balance change.
- **Negative:** Strict heuristics may occasionally flag creative marketing metaphors (e.g., "a million ways to save"). Mitigated by allowing verified business owners to override soft warnings via explicit confirmation.

---

## ADR-006: Server-Side Two-Phase Credit Reservation Protocol for Financial Concurrency

### Context & Problem Statement
When a user initiates an AI generation (such as a 30-day marketing calendar costing 50 credits), the generation process takes between 3 and 15 seconds. If credits are deducted before generation, a failed API call leaves the user out of pocket. If credits are deducted after generation, a malicious user could fire 10 concurrent requests with only 50 credits in their wallet, resulting in negative credit balances.

### Decision Drivers
1. Prevent credit race conditions and double-spending across concurrent browser tabs.
2. Prevent user loss of funds during upstream LLM timeouts or network disconnections.
3. Maintain an immutable, auditable double-entry transaction ledger.

### Considered Options
- **Option 1:** Simple Post-Generation Deduction (`wallet.balance -= cost` upon completion).
- **Option 2:** Simple Pre-Generation Deduction (`wallet.balance -= cost` prior to starting, manual refund script on failure).
- **Option 3:** Two-Phase Credit Reservation Protocol (`wallet.balance -= cost`, `wallet.reserved += cost` inside an atomic Firestore transaction; commit on success, release on failure).

### Decision Outcome
**Chosen Option: Option 3 (Two-Phase Credit Reservation Protocol).**

### Justification & Consequences
- **Positive:** Mathematically eliminates race conditions. The user's available balance is decremented immediately, preventing concurrent overdraws. If the AI worker succeeds, the reservation is settled. If the generation fails, crashes, or is rejected by the Truth Check, the reservation is released in an atomic transaction with zero manual support intervention required.
- **Negative:** Requires two Firestore database writes per operation instead of one. Minor latency increase (~40ms) completely outweighed by financial integrity.

---

## ADR-007: Pure SVG Vector Generation via LLM vs. Raster Diffusion Image Generation

### Context & Problem Statement
In Department 4 (AI Brand Studio), businesses require brand stationery, business cards, letterheads, social posters, and packaging labels. We must determine whether to generate these assets as raster images via diffusion models (Imagen 3 / Midjourney) or as structured SVG vector graphics via LLM code generation.

### Decision Drivers
1. **Editability:** Raster images (PNG/JPG) cannot have their text, colors, or logo placements modified by the user after generation.
2. **Text Rendering Precision:** Diffusion models frequently introduce spelling errors, warped characters, and illegible text on labels and stationery.
3. **Print-Ready Resolution:** Print collateral requires infinite vector scalability (300+ DPI PDF export) rather than 1024x1024 pixel raster outputs.
4. **Cost & Speed:** LLM code generation for SVG takes ~2.5s and costs \$0.001; diffusion models take ~8s and cost \$0.03 to \$0.05 per generation.

### Considered Options
- **Option 1:** Pure Diffusion Image Generation (Imagen 3 generating full raster poster images).
- **Option 2:** Pre-built static canvas templates populated with dynamic text via client-side Fabric.js.
- **Option 3:** Pure SVG Vector Generation via Gemini LLM using structured layout grammars, with optional Imagen 3 background textures embedded as raster layers.

### Decision Outcome
**Chosen Option: Option 3 (Structured SVG Vector Generation with Hybrid Background Embedding).**

### Justification & Consequences
- **Positive:** Complete post-generation editability in the browser. Users can double-click any headline, swap brand colors, update phone numbers, and export crisp, high-resolution vector PDFs. Guarantees 100% correct spelling of brand names and prices.
- **Negative:** LLMs occasionally produce syntax errors in complex SVG paths. Mitigated by passing generated SVG through server-side DOMParser validation and automatic linting before persisting.

---

## ADR-008: Cashfree Domestic Gateway with Dual-Check Server Verification

### Context & Problem Statement
BrainWise requires a frictionless payment collection mechanism for subscriptions and credit top-up packs in India. We must decide on the payment service provider and architect an ironclad order fulfillment pipeline that prevents lost payments and fraudulent credit grants.

### Decision Drivers
1. Maximum payment success rate on UPI (Google Pay, PhonePe, Paytm, BHIM) and RuPay cards.
2. Automated GST e-invoicing and tax compliance for Indian B2B entities.
3. Zero tolerance for client-side payment forgery.

### Considered Options
- **Option 1:** Razorpay Standard Checkout.
- **Option 2:** Stripe Billing India.
- **Option 3:** Cashfree Payment Gateway with Server-to-Server Webhook Signature Verification and Dual Return-Page Verification.

### Decision Outcome
**Chosen Option: Option 3 (Cashfree Payment Gateway with Dual-Check Verification).**

### Justification & Consequences
- **Positive:** Cashfree provides superior UPI auto-collect APIs, lower transaction MDR (1.75% vs 2.0%), and instant settlement features. Dual-check verification guarantees that credits are only granted when Cashfree's cryptographic HMAC-SHA256 signature is verified server-side, or when a direct server-to-server query confirms the order status as `PAID`.
- **Negative:** Limited international multi-currency coverage compared to Stripe. Mitigated by adding Stripe in v1.1.0 (see DEC-001).

---

## ADR-009: Cloud Tasks Distributed Asynchronous Queue for Social Media Scheduling

### Context & Problem Statement
Department 9 enables users to schedule marketing campaigns and social posts across multiple channels for specific future timestamps (e.g., publishing a product announcement at 9:00 AM on Monday). We need a scheduling infrastructure that guarantees point-in-time execution without maintaining long-running daemon servers.

### Decision Drivers
1. Zero idle server infrastructure (no self-hosted Redis / BullMQ worker clusters).
2. Guaranteed at-least-once delivery with automated retry policies.
3. Millisecond-accurate scheduling without polling loops.

### Considered Options
- **Option 1:** Redis + BullMQ hosted on a persistent Compute Engine virtual machine.
- **Option 2:** Cron-based Polling (Cloud Scheduler triggering a Cloud Function every 5 minutes to query Firestore for due posts).
- **Option 3:** Google Cloud Tasks with Named Future-Dated Tasks pointing to secure Cloud Function webhooks.

### Decision Outcome
**Chosen Option: Option 3 (Google Cloud Tasks Named Future-Dated Tasks).**

### Justification & Consequences
- **Positive:** Completely serverless. When a post is scheduled for `2027-04-15T09:00:00Z`, a Cloud Task is created with `scheduleTime` set to that exact moment. Cloud Tasks handles the timer and invokes the publishing Cloud Function with zero polling database overhead. Deduplication and cancellation are handled natively via deterministic Task IDs (`task_${workspaceId}_${postId}`).
- **Negative:** Cloud Tasks maximum delay is 30 days. For campaigns scheduled > 30 days in advance, a lightweight weekly Cloud Scheduler cron sweeps and buffers tasks into Cloud Tasks 14 days prior to publication.

---

## ADR-010: Client-Side React 19 Design Freeze Preservation & Zero-Regression Rules

### Context & Problem Statement
The existing BrainWise frontend possesses an extensive, highly refined design system built on React 19, Vite, Tailwind CSS, Lucide icons, and modern dashboard UI components. When implementing Phase 3 backend integrations, there is a risk that developers might rewrite, degrade, or replace existing UI components, introducing visual regressions and breaking existing page layouts.

### Decision Drivers
1. Preserve all existing UI screens, navigation flows, and aesthetic quality established in the current repository.
2. Decouple frontend UI presentation from backend API implementation.
3. Ensure zero visual regressions during backend wiring.

### Considered Options
- **Option 1:** Full-stack refactor replacing current client components with a unified Next.js SSR architecture.
- **Option 2:** Gradual opportunistic UI changes during backend endpoint wiring.
- **Option 3:** **Strict Client-Side Design Freeze.** All existing JSX layouts, Tailwind CSS utility classes, and component structures are frozen. Backend integration is achieved strictly by replacing mock state hooks with typed API client hooks (`useBrainData`, `useCreditWallet`, `useGenerateMarketing`).

### Decision Outcome
**Chosen Option: Option 3 (Strict Client-Side Design Freeze with Hook-Based Integration).**

### Justification & Consequences
- **Positive:** Guarantees 100% design fidelity. Frontend engineers focus exclusively on connecting live API client services to existing UI state hooks without altering CSS or visual layouts. Eliminates the risk of UI regressions during Phase 3.
- **Negative:** Requires rigorous discipline during code reviews to ensure mock data structures match production API contract schemas exactly.
