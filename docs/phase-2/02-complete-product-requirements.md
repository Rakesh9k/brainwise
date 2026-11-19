# BrainWise Phase 2 — 02: Complete Product Requirements Document (PRD)

**Document ID:** `docs/phase-2/02-complete-product-requirements.md`  
**Version:** `2.0.0`  
**Date:** November 19, 2026  
**Auditor:** Chief Product Officer (CPO), Senior SaaS PM, & Lead Systems Architect  
**Status:** APPROVED & BINDING  

---

## 1. Document Architecture & Scope

This Product Requirements Document (PRD) specifies every department, module, and feature in BrainWise. In accordance with Section 4 of the Master Execution Instruction, each feature is exhaustively defined using the **35-point architectural template**, establishing input schemas, AI model assignments, backend workflows, database entities, credit costs, error states, and acceptance criteria.

**Strict Architectural Mandate:** All video generation, editing, rendering, and video credits are strictly excluded.

---

## 2. Department 1: User Account & Workspace Management

### Feature 1.1: Multi-Tenant Workspace & Role-Based Access Control
1. **Feature Name:** Multi-Tenant Workspace & Role-Based Access Control
2. **Feature ID:** `FEAT-AUTH-001`
3. **Department:** Department 1: User Account & Workspace Management
4. **Business Problem Solved:** Founders and agencies manage multiple brands or invite team members and contractors without sharing root credentials or risking data leakage between client workspaces.
5. **Target User:** Startup Founders, Agency Account Directors, Marketing Team Leads.
6. **User Journey:** Founder creates an account → Creates primary workspace → Invites team member via email with assigned role (`Owner`, `Admin`, `Member`, `Viewer`) → Member accepts invite via email link → Switched workspace context.
7. **Entry Point in Interface:** Top navigation workspace selector, Settings → Team Members tab (`/settings?tab=team-members`).
8. **User Inputs:** Workspace Name, Workspace Slug, Team Member Email, Role selector (`Admin` | `Member` | `Viewer`).
9. **Required Business Brain Information:** `businessName`, `industry`, `stage`.
10. **Other Required Data:** User session token, inviter ID, workspace ID.
11. **Data Validation Rules:** 
    - Workspace Name: 2–64 characters, non-empty.
    - Slug: lower-case alphanumeric, dashes only, unique across system.
    - Email: RFC 5322 compliant.
    - Role: must be one of `['Owner', 'Admin', 'Member', 'Viewer']`.
12. **AI Model / External Service Required:** None (Pure backend logic).
13. **Why Selected:** N/A.
14. **Backend Processing Workflow:**
    ```
    Client Request -> Verify Auth JWT -> Check Inviter is Owner/Admin -> 
    Generate 7-day secure invite token -> Store in `workspaceInvites` -> 
    Trigger transactional email via Resend -> Return invite metadata
    ```
15. **AI Prompt / Context Requirements:** None.
16. **Expected AI Output:** None.
17. **Output Schema:**
    ```json
    {
      "inviteId": "inv_9a8b7c",
      "workspaceId": "ws_12345",
      "email": "sarah@agency.co",
      "role": "Member",
      "status": "pending",
      "expiresAt": "2026-11-26T12:00:00Z"
    }
    ```
18. **User Actions Available After Generation:** Revoke invite, resend invite link, change role, remove member.
19. **Editing & Regeneration Behaviour:** Roles can be modified by Owner/Admin at any time.
20. **Data Stored:** User record, workspace record, membership join document, invite token.
21. **Database Entities Affected:** `workspaces`, `workspaceMembers`, `workspaceInvites`, `auditLogs`.
22. **File Storage Requirements:** None.
23. **API Endpoints / Backend Operations:**
    - `POST /api/v1/workspaces`
    - `POST /api/v1/workspaces/:id/invites`
    - `GET /api/v1/workspaces/:id/members`
    - `DELETE /api/v1/workspaces/:id/members/:userId`
24. **Credit Consumption:** 0 credits (Core platform functionality).
25. **Cost Implications:** Negligible compute (Firestore read/write + Resend email transaction @ $0.0008/email).
26. **Loading States:** Shimmer skeleton on member list; disabled button with spinner on "Send Invite".
27. **Empty States:** "No team members invited yet. Add your brand designer or strategist."
28. **Error States:** `403 Forbidden` (non-admin invite), `409 Conflict` (user already a member), `400 Bad Request` (invalid email).
29. **Retry Behaviour:** Automatic exponential backoff on transient network failures.
30. **Failure Recovery:** Invite tokens are self-expiring; failed email jobs are logged to DLQ for admin inspection.
31. **Security & Permissions:** Strictly verified via Firestore Security Rules and server-side middleware checking `workspaceMembers` collection.
32. **Dependencies:** Resend/SendGrid API, Firebase Authentication.
33. **Acceptance Criteria:**
    - Owner can invite Admin, Member, or Viewer.
    - Viewer cannot trigger AI generations or edit Business Brain.
    - Switching workspace updates active context across all departments within <150ms.
34. **Testing Scenarios:**
    - Test inviting an existing user to a second workspace (multi-tenancy check).
    - Test permission boundary: Viewer attempting `POST /api/v1/brand/assets` receives `403`.
    - Test expired invite token rejection.
35. **Implementation Priority:** **P0** (Essential launch requirement).

---

## 3. Department 2: Business Onboarding

### Feature 2.1: Intelligent Multi-Step Onboarding with Document Fact Extraction
1. **Feature Name:** Intelligent Multi-Step Onboarding with Document Fact Extraction
2. **Feature ID:** `FEAT-ONB-001`
3. **Department:** Department 2: Business Onboarding
4. **Business Problem Solved:** Founders abandon long onboarding forms. BrainWise extracts company facts directly from uploaded pitch decks, product catalogs, or websites in seconds.
5. **Target User:** First-time onboarding founders and business owners.
6. **User Journey:** User logs in → Lands on `/onboarding` → Step 1: Selects founder role & goals → Step 2: Enters business name, industry, location (or uploads PDF/Deck) → Step 3: AI extracts & previews draft profile → Step 4: User reviews/edits core offerings and competitors → Step 5: Automated workspace initialization.
7. **Entry Point in Interface:** Initial route for un-onboarded authenticated users (`/onboarding`).
8. **User Inputs:** Role, primary goals, business name, industry, headquarters, product catalog/deck file (PDF/CSV/DOCX), competitor names.
9. **Required Business Brain Information:** None (this feature initializes the Business Brain).
10. **Other Required Data:** User profile metadata, workspace ID.
11. **Data Validation Rules:**
    - Uploaded files: Maximum 20MB, supported MIME types: `application/pdf`, `text/csv`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`.
    - Business name: 2–100 characters.
12. **AI Model / External Service Required:** **Google Gemini 2.5 Flash** (Multimodal text/document extraction).
13. **Why Selected:** 1M+ token context window allows processing an entire 40-page pitch deck or catalog in a single prompt with structured JSON extraction at low latency (<2.5s) and ultra-low cost ($0.075/1M input tokens).
14. **Backend Processing Workflow:**
    ```
    Client uploads document -> GCS signed upload URL -> File uploaded to `uploads/temp/:id` -> 
    Cloud Function triggers Gemini 2.5 Flash with document bytes -> 
    Extract structured JSON matching OnboardingFactsSchema -> 
    Tag extracted facts as `DERIVED_FROM_DOC` -> Return draft to user for review
    ```
15. **AI Prompt / Context Requirements:**
    System instructions commanding the model to act as a rigorous business analyst, strictly extracting factual data without inventing revenue numbers, customer counts, or unlisted products.
16. **Expected AI Output:** Validated JSON containing business summary, products/services, target audience, and detected competitors.
17. **Output Schema:**
    ```json
    {
      "businessName": "Solstice Craft Coffee",
      "industry": "Specialty Food & Beverage",
      "tagline": "Single-origin micro-lot roasts",
      "products": [
        { "name": "Origin Subscription", "priceRange": "$18–$26/mo", "category": "D2C" }
      ],
      "targetAudience": "Urban professionals 24-40 seeking traceable coffee",
      "competitors": ["Blue Tokai", "Third Wave Coffee"]
    }
    ```
18. **User Actions Available After Generation:** 1-click accept all, inline edit any field, add missing competitors, restart extraction.
19. **Editing & Regeneration Behaviour:** User retains full control to edit or confirm each extracted fact before committing to the Business Brain.
20. **Data Stored:** Stored in `onboardingDrafts` collection and committed upon confirmation to `businessBrain`.
21. **Database Entities Affected:** `onboardingDrafts`, `businessBrain`, `workspaces`.
22. **File Storage Requirements:** Uploaded document stored permanently in `gs://[bucket]/workspaces/:id/documents/`.
23. **API Endpoints / Backend Operations:**
    - `POST /api/v1/onboarding/extract-document`
    - `POST /api/v1/onboarding/confirm`
24. **Credit Consumption:** Free during onboarding (0 credits charged; subsidized as customer acquisition cost).
25. **Cost Implications:** ~$0.0015 per PDF extraction using Gemini 2.5 Flash.
26. **Loading States:** Liquid skeleton animation with step-by-step progress checklist (Reading document → Identifying products → Mapping competitors).
27. **Empty States:** Clear manual fallback form if the user has no document to upload.
28. **Error States:** File size exceeds 20MB, corrupt PDF, unreadable scan, Gemini upstream timeout.
29. **Retry Behaviour:** Client offers 1-click retry button; automatically falls back to manual step-by-step form if extraction fails twice.
30. **Failure Recovery:** Clean form inputs with pre-filled blanks; user never blocked from onboarding.
31. **Security & Permissions:** Uploaded files validated for magic bytes to prevent executable execution; authenticated user token bound to workspace upload path.
32. **Dependencies:** Cloud Storage, Google Gen AI SDK.
33. **Acceptance Criteria:**
    - Uploading a standard 10-slide pitch deck PDF populates business name, industry, 2+ products, and 1+ persona in <4 seconds.
    - All extracted facts default to `DERIVED_FROM_DOC` provenance.
    - Confirmation writes directly to `businessBrain` and sets `onboarding.completed = true`.
34. **Testing Scenarios:**
    - Test upload of 15-page PDF coffee roaster business plan.
    - Test upload of non-PDF file (verify rejection).
    - Test zero-upload manual onboarding path.
35. **Implementation Priority:** **P0** (Essential launch requirement).

---

## 4. Department 3: Business Brain

### Feature 3.1: Persistent Structured Knowledge Base with Fact Provenance
1. **Feature Name:** Persistent Structured Knowledge Base with Fact Provenance
2. **Feature ID:** `FEAT-BRN-001`
3. **Department:** Department 3: Business Brain
4. **Business Problem Solved:** AI tools suffer from amnesia, requiring users to re-prompt business context repeatedly. Un-grounded AI hallucinates prices, false claims, and non-existent products.
5. **Target User:** All BrainWise users across all roles.
6. **User Journey:** User navigates to `/business-brain` → Views structured tabs (Overview, Products, Personas, Strategy, Documents, Decisions) → Inspects fact provenance badges → Edits facts or clicks "Confirm" to elevate AI inferences → Downstream departments immediately inherit updated facts.
7. **Entry Point in Interface:** Left sidebar "Business Brain" link (`/business-brain`).
8. **User Inputs:** Business profile patches, product catalog additions, customer persona profiles, strategic rules, claim exclusions.
9. **Required Business Brain Information:** Self-referential authoritative store.
10. **Other Required Data:** User ID, timestamp, provenance tag (`USER_CONFIRMED`, `AI_INFERRED`, `DERIVED_FROM_DOC`, `SYSTEM_DEFAULT`).
11. **Data Validation Rules:**
    - Products: Name (required), Price Range (must contain currency symbol and valid numbers), Category.
    - Personas: Name, segment, pain points (array of non-empty strings), willingness to pay.
    - Exclusions: Prohibited phrases cannot be empty.
12. **AI Model / External Service Required:** None for storage/CRUD; **Gemini 2.5 Flash** for fact completeness evaluation.
13. **Why Selected:** Pure deterministic data store for business truth; LLM only used to score completeness and identify missing business facts.
14. **Backend Processing Workflow:**
    ```
    Client PATCH /api/v1/brain -> Backend validates payload schema -> 
    Stamps provenance (`USER_CONFIRMED` + user initials + timestamp) -> 
    Writes to Firestore `businessBrain/:workspaceId` -> 
    Invalidates cached Brain context in Redis/memory -> 
    Emits real-time snapshot update to active clients
    ```
15. **AI Prompt / Context Requirements:** Evaluator prompt checks for missing critical fields (e.g. unstated pricing, missing ICPs).
16. **Expected AI Output:** Knowledge completeness score (0–100%) and missing action prompts.
17. **Output Schema:**
    ```json
    {
      "completenessScore": 88,
      "missingItems": [
        { "section": "Pricing", "prompt": "Add explicit price ranges for wholesale products." }
      ]
    }
    ```
18. **User Actions Available After Generation:** 1-click confirm fact, edit fact, delete product, export Brain as JSON.
19. **Editing & Regeneration Behaviour:** Immediate optimistic UI update with rollback on server rejection.
20. **Data Stored:** Full structured business identity, product catalog, customer personas, strategic decisions, claim exclusions.
21. **Database Entities Affected:** `businessBrain`, `products`, `personas`, `strategicDecisions`, `auditLogs`.
22. **File Storage Requirements:** Document briefs stored in `workspaces/:id/documents/`.
23. **API Endpoints / Backend Operations:**
    - `GET /api/v1/brain`
    - `PATCH /api/v1/brain`
    - `POST /api/v1/brain/facts/:key/confirm`
    - `POST /api/v1/brain/exclusions`
    - `DELETE /api/v1/brain/exclusions/:ruleId`
24. **Credit Consumption:** 0 credits for CRUD and fact confirmation.
25. **Cost Implications:** Pure Firestore document read/writes (<$0.0001 per operation).
26. **Loading States:** Ceramic skeleton layout with TopoGrid overlay.
27. **Empty States:** GuidedActionEmptyCard with "Add your first product" and "Define target buyer".
28. **Error States:** Network disconnect banner, schema validation error toast, concurrency collision warning.
29. **Retry Behaviour:** Auto-retry with optimistic lock revision check.
30. **Failure Recovery:** Reverts to last committed server snapshot if transaction fails.
31. **Security & Permissions:** Firestore Rules enforce `request.auth != null && request.auth.token.workspaceId == resource.data.workspaceId`. Only `Owner` and `Admin` can edit core pricing facts.
32. **Dependencies:** Cloud Firestore.
33. **Acceptance Criteria:**
    - Facts edited by a founder receive `USER_CONFIRMED` badge.
    - AI Inferred facts display amber badge with 1-click `Confirm` button.
    - Pricing updates immediately propagate to `BrandStudio` and `IdeaIntelligence` truth checks.
34. **Testing Scenarios:**
    - Verify optimistic UI updates when adding a new product.
    - Verify concurrent edit prevention using Firestore atomic transaction.
    - Test exporting Brain data as RFC-compliant JSON.
35. **Implementation Priority:** **P0** (Essential launch requirement).

---

## 5. Department 4: AI Brand Studio (Static Assets Only)

### Feature 4.1: Brand Identity & Static Collateral Generator
1. **Feature Name:** Brand Identity & Static Collateral Generator
2. **Feature ID:** `FEAT-BRD-001`
3. **Department:** Department 4: AI Brand Studio
4. **Business Problem Solved:** Small businesses lack the budget for graphic designers to create professional logos, color palettes, business cards, flyers, and packaging graphics.
5. **Target User:** Founders launching new ventures, SMB owners refreshing brand collateral.
6. **User Journey:** User visits `/brand-studio` → Chooses collateral type (e.g. Visiting Cards, Flyers, Packaging Label) → System pulls locked brand colors, typography, and Business Brain positioning → User customizes headline prompt → AI generates 3 print-ready vector/SVG variations → User edits text, downloads SVG/PDF, or saves to Asset Library.
7. **Entry Point in Interface:** Left navigation "Brand Studio" (`/brand-studio`).
8. **User Inputs:** Collateral category, layout style, headline focus, surface mode (Light/Dark), custom notes.
9. **Required Business Brain Information:** `businessName`, `tagline`, `brandPositioning`, `approvedProducts`, `brandColors`, `typography`.
10. **Other Required Data:** Active concept ID, workspace ID.
11. **Data Validation Rules:** Prompt $\le 300$ characters, valid category enum (`'business-card' | 'flyer' | 'packaging' | 'poster' | 'social-graphic'`).
12. **AI Model / External Service Required:** **Google Gemini 2.5 Flash** (SVG vector text & layout composition) + **Google Imagen 3** (High-resolution static texture/background generation).
13. **Why Selected:** 
    - Gemini 2.5 Flash outputs precise, scalable, script-sanitized SVG vector layouts with crisp typography without raster blur.
    - Imagen 3 produces photorealistic static backdrops with unmatched contrast and photorealism.
    - **Explicitly Excludes:** Any video generation models.
14. **Backend Processing Workflow:**
    ```
    Client POST /api/v1/brand/generate-collateral -> Verify Credit Balance -> 
    Reserve 5 Credits in Credit Wallet -> Fetch Business Brain Context -> 
    Execute Gemini SVG generator -> Sanitize SVG (strip <script>, foreignObject) -> 
    Execute Truth Check on generated text -> Save asset to GCS -> 
    Commit 5 Credits -> Return asset record to client
    ```
15. **AI Prompt / Context Requirements:**
    System instructions specifying exact SVG dimensions, modular typography classes, hex palette tokens from Brain, and anti-fatigue negative constraints.
16. **Expected AI Output:** Sanitizeable, valid SVG document with semantic layers, viewBox, and clean geometric motifs.
17. **Output Schema:**
    ```json
    {
      "assetId": "ast_99182",
      "title": "Minimalist Visiting Card - Alabaster",
      "category": "business-card",
      "format": "SVG + PDF",
      "svgMarkup": "<svg viewBox=\"0 0 1050 600\" ...></svg>",
      "truthScore": 100,
      "creditsDeducted": 5
    }
    ```
18. **User Actions Available After Generation:** 1-click download SVG, export as print-ready PDF (300 DPI), save to Asset Library, edit copy inline, remix layout.
19. **Editing & Regeneration Behaviour:** Users can click individual text nodes in the preview to edit headlines directly without re-consuming AI credits.
20. **Data Stored:** Stored in `brandAssets` collection with reference URL to GCS.
21. **Database Entities Affected:** `brandAssets`, `assetLibrary`, `creditTransactions`.
22. **File Storage Requirements:** SVG file and rendered PNG preview stored in `gs://[bucket]/workspaces/:id/assets/`.
23. **API Endpoints / Backend Operations:**
    - `POST /api/v1/brand/generate-collateral`
    - `POST /api/v1/brand/assets/:id/save`
    - `GET /api/v1/brand/assets/:id/export`
24. **Credit Consumption:** **5 Credits** per collateral variation set.
25. **Cost Implications:** Gemini 2.5 Flash ($0.0005) + Storage ($0.0001) = Total unit cost ~$0.0006 per generation. Strong gross margin (>90%).
26. **Loading States:** Shimmer artboard skeleton displaying "Synthesizing vector artboard and typographic hierarchy...".
27. **Empty States:** Interactive template gallery displaying default sample cards and flyers.
28. **Error States:** Invalid SVG output, content safety filter trigger, credit balance insufficient.
29. **Retry Behaviour:** Automatic single-pass repair if Gemini produces malformed SVG tags; credit auto-refunded if second attempt fails.
30. **Failure Recovery:** Credit reservation auto-released immediately upon error.
31. **Security & Permissions:** Strict SVG sanitization via DOMPurify on frontend and server-side XML parser preventing XSS or script injection.
32. **Dependencies:** Cloud Storage, Google Gen AI SDK.
33. **Acceptance Criteria:**
    - Generated SVG scales infinitely without pixelation.
    - Colors strictly match the active Brand Studio palette.
    - Generated copy passes Deterministic Truth Check against confirmed Business Brain facts.
34. **Testing Scenarios:**
    - Test generation of standard 3.5" x 2" business card.
    - Test prompt injection attempt inside custom prompt (e.g. `<script>alert(1)</script>`).
    - Verify credit refund when simulated Gemini API error occurs.
35. **Implementation Priority:** **P0** (Essential launch requirement).

---

## 6. Department 5: Marketing Strategy & Planning

### Feature 5.1: 30/60/90-Day Autonomous Growth Roadmap & Audit
1. **Feature Name:** 30/60/90-Day Autonomous Growth Roadmap & Audit
2. **Feature ID:** `FEAT-STR-001`
3. **Department:** Department 5: Marketing Strategy & Planning
4. **Business Problem Solved:** Founders waste time and money on uncoordinated marketing tactics without a structured, sequenced strategic plan.
5. **Target User:** Founders, CMOs, Growth Leads.
6. **User Journey:** User navigates to `/growth-director` → System analyzes current business stage, verified products, ICPs, and competitive gap data from Business Brain → Generates a sequenced 3-phase roadmap (Days 1–30: Foundation & Acquisition Pilot, Days 31–60: Channel Optimization & Referral Loops, Days 61–90: Scale & Retention) → User converts roadmap milestones into actionable tasks.
7. **Entry Point in Interface:** Left navigation "Growth Director" (`/growth-director`).
8. **User Inputs:** Target 90-day revenue or subscriber goal, primary marketing focus (e.g. Organic Search vs Paid Meta vs B2B Partnerships), weekly available founder hours.
9. **Required Business Brain Information:** `businessName`, `stage`, `primaryGoals`, `revenueModel`, `personas`, `decisions`.
10. **Other Required Data:** Historical experiment outcomes from `growthExperiments`.
11. **Data Validation Rules:** Available hours must be between 2 and 60 hours/week; target goals must be non-empty.
12. **AI Model / External Service Required:** **Google Gemini 2.5 Pro** (Deep reasoning and multi-step strategic synthesis).
13. **Why Selected:** Gemini 2.5 Pro excels at complex reasoning, trade-off analysis, and realistic operational planning without generic boilerplate.
14. **Backend Processing Workflow:**
    ```
    Client POST /api/v1/strategy/generate-roadmap -> Validate Subscription Tier -> 
    Reserve 10 Credits -> Assemble comprehensive Business Brain prompt context -> 
    Invoke Gemini 2.5 Pro with structured RoadmapSchema -> 
    Validate feasibility constraints -> Store roadmap in `marketingStrategies` -> 
    Settle 10 Credits -> Return roadmap object
    ```
15. **AI Prompt / Context Requirements:** Complete Business Brain context, verified pricing constraints, anti-fatigue directives, and founder hour limits.
16. **Expected AI Output:** Comprehensive 3-phase strategic roadmap with weekly milestones, resource estimates, and expected outcomes.
17. **Output Schema:**
    ```json
    {
      "strategyId": "strat_88192",
      "title": "Q4 Direct-to-Consumer Growth & Subscription Scale",
      "phases": [
        {
          "phase": "Days 1–30: Foundation & Trial Conversion",
          "objective": "Establish 48h roast-to-order trial funnel",
          "milestones": ["Launch 3-pack tasting kit", "Set up Meta creative test"],
          "estimatedHoursPerWeek": 8,
          "targetKpi": "50 Trial Conversions"
        }
      ],
      "recommendedChannels": ["Instagram Carousel Ads", "Local Studio Partnerships"]
    }
    ```
18. **User Actions Available After Generation:** 1-click convert milestone to task in Marketing Calendar, export strategic PDF, regenerate phase, edit milestones.
19. **Editing & Regeneration Behaviour:** Individual milestones can be checked off, edited, reordered, or deleted.
20. **Data Stored:** Stored in `marketingStrategies` collection.
21. **Database Entities Affected:** `marketingStrategies`, `marketingTasks`, `creditTransactions`.
22. **File Storage Requirements:** Generated PDF export stored in `workspaces/:id/reports/`.
23. **API Endpoints / Backend Operations:**
    - `POST /api/v1/strategy/generate-roadmap`
    - `GET /api/v1/strategy/current`
    - `POST /api/v1/strategy/milestones/:id/convert-to-task`
24. **Credit Consumption:** **10 Credits** per roadmap generation.
25. **Cost Implications:** Gemini 2.5 Pro prompt (~4k tokens) + output (~2k tokens) = ~$0.007 per roadmap. Excellent margin on 10 credits ($0.10 value).
26. **Loading States:** Multi-phase progress bar displaying strategic calculation steps.
27. **Empty States:** "No active growth roadmap. Generate your 90-day strategy to unlock daily founder focus sprints."
28. **Error States:** Upstream LLM timeout, credit exhaustion, invalid goal format.
29. **Retry Behaviour:** Auto-retry once on timeout with 15s deadline; full credit refund on failure.
30. **Failure Recovery:** Reverts to pre-existing strategy or provides deterministic baseline roadmap template.
31. **Security & Permissions:** Restricted to `Owner` and `Admin` roles.
32. **Dependencies:** Cloud Firestore, Gemini 2.5 Pro.
33. **Acceptance Criteria:**
    - Generated roadmap references exact products and target personas from the Business Brain.
    - Weekly milestones do not exceed user-specified weekly hours.
    - Clicking "Convert to Task" adds item to `marketingTasks` with deadline and priority.
34. **Testing Scenarios:**
    - Test roadmap generation for early-stage idea stage vs growing business.
    - Verify credit deduction and settlement in ledger.
    - Test conversion of milestones into marketing tasks.
35. **Implementation Priority:** **P0** (Essential launch requirement).

---

## 7. Department 6: AI Content Studio (Static & Written Only)

### Feature 6.1: High-Converting Multi-Slide Static Carousel & Post Studio
1. **Feature Name:** High-Converting Multi-Slide Static Carousel & Post Studio
2. **Feature ID:** `FEAT-CNT-001`
3. **Department:** Department 6: AI Content Studio (Static Content Only)
4. **Business Problem Solved:** Creating multi-slide educational carousels and high-converting static social posts takes hours of copy drafting and design layout.
5. **Target User:** Social media managers, founders, content marketers.
6. **User Journey:** User visits `/brand-studio` (Social Studio mode) → Selects platform (`Instagram Carousel`, `Instagram Post`, `LinkedIn Post`, `Facebook Card`) → Selects campaign angle (`Educational Carousel`, `Competitor Counter-Hook`, `Product Launch`) → AI generates 3–7 cohesive slides with hook, problem, differentiation, proof, and CTA + ready-to-post caption & hashtags → User previews slides, copies caption, or schedules for publishing.
7. **Entry Point in Interface:** Brand Studio → Studio Tab → Social Media mode (`/brand-studio?tab=studio`).
8. **User Inputs:** Platform format, campaign angle, custom prompt/focus, slide count (3–7), visual mood (Light/Dark/Mixed).
9. **Required Business Brain Information:** `businessName`, `tagline`, `brandPositioning`, `approvedProducts`, `brandColors`, `targetAudience`.
10. **Other Required Data:** `strategicMemory` (to enforce anti-fatigue and avoid recently used hooks).
11. **Data Validation Rules:** Slide count must be an integer between 3 and 7 for carousels; exactly 1 for single posts. Prompt $\le 400$ chars.
12. **AI Model / External Service Required:** **Google Gemini 2.5 Flash** (Structured JSON output with SVG geometric motifs).
13. **Why Selected:** Outstanding structured output compliance and high speed (<1.8s for complete 5-slide pack) at minimal token cost.
14. **Backend Processing Workflow:**
    ```
    Client POST /api/v1/content/social-package -> Validate Credits -> 
    Reserve 4 Credits -> Inject Business Brain & Anti-Fatigue Constraints -> 
    Call Gemini 2.5 Flash with SocialPackageSchema -> 
    Execute Deterministic Truth Check on generated copy -> 
    Sanitize SVG slide motifs -> Store in `contentItems` -> 
    Commit 4 Credits -> Return complete package
    ```
15. **AI Prompt / Context Requirements:** Strict prompt formatting demanding hook $\to$ problem $\to$ proof $\to$ CTA flow, verified product names, and strict avoidance of fatigued themes.
16. **Expected AI Output:** Validated JSON containing post title, caption, 6 hashtags, posting rationale, and array of slide objects.
17. **Output Schema:**
    ```json
    {
      "packageId": "pkg_49921",
      "title": "Carousel: Why Freshness Matters",
      "caption": "Most coffee sits on supermarket shelves for 4 months...",
      "hashtags": ["#SpecialtyCoffee", "#CraftRoast", "#SingleOrigin"],
      "postingRationale": "High save-rate educational breakdown targeting pour-over brewers.",
      "slides": [
        {
          "slideNumber": 1,
          "role": "Hook",
          "kicker": "THE ROAST DATE TRUTH · 01",
          "headline": "Why your morning coffee tastes bitter",
          "body": "Swipe to see the 48-hour difference.",
          "layout": "editorial-grid",
          "svgMotif": "<svg viewBox=\"0 0 120 48\" ...></svg>"
        }
      ],
      "truthScore": 100
    }
    ```
18. **User Actions Available After Generation:** 1-click copy caption + hashtags, download all slides as PNG/SVG, schedule to connected Instagram/LinkedIn account, edit slide text, remix single slide.
19. **Editing & Regeneration Behaviour:** User can regenerate an individual slide (e.g. rewrite slide 3) without regenerating the entire package.
20. **Data Stored:** Stored in `contentItems` and `contentVersions` collections.
21. **Database Entities Affected:** `contentItems`, `contentVersions`, `creditTransactions`, `strategicMemory`.
22. **File Storage Requirements:** Generated slide SVG/PNG assets stored in `workspaces/:id/content/`.
23. **API Endpoints / Backend Operations:**
    - `POST /api/v1/content/generate-social`
    - `POST /api/v1/content/regenerate-slide`
    - `POST /api/v1/content/:id/schedule`
24. **Credit Consumption:** **4 Credits** for full carousel package; **1 Credit** for single slide remix.
25. **Cost Implications:** Gemini 2.5 Flash API cost ~$0.0008. Strong profit margin.
26. **Loading States:** Shimmer artboard skeleton with status label: "Synthesizing social creative artboard and typography...".
27. **Empty States:** Gallery of pre-generated local sample carousels.
28. **Error States:** Safety violation, credit exhaustion, invalid JSON output.
29. **Retry Behaviour:** Auto-retried once with higher temperature (0.7) if output fails schema validation; auto-refunds on failure.
30. **Failure Recovery:** Falls back to local deterministic template generator in `src/utils/logic.ts`.
31. **Security & Permissions:** SVG motifs sanitized to strip scripts; user authorization verified against workspace.
32. **Dependencies:** Cloud Storage, Google Gen AI SDK.
33. **Acceptance Criteria:**
    - Complete 5-slide carousel renders in <2.5 seconds.
    - Output passes Deterministic Truth Check (100% ground-truth score).
    - Strategic angle is logged in `strategicMemory` to prevent repetition.
34. **Testing Scenarios:**
    - Test generating 7-slide LinkedIn carousel.
    - Test regenerating single slide (Slide 2).
    - Test prompt containing prohibited exclusion (verify Truth Check rejection).
35. **Implementation Priority:** **P0** (Essential launch requirement).

---

## 8. Department 7: Social Media Management

### Feature 7.1: OAuth Connection & Scheduled Multi-Platform Publishing
1. **Feature Name:** OAuth Connection & Scheduled Multi-Platform Publishing
2. **Feature ID:** `FEAT-SOC-001`
3. **Department:** Department 7: Social Media Management
4. **Business Problem Solved:** Founders forget to post regularly and waste time manually copying graphics and captions between multiple social media apps.
5. **Target User:** Business owners and marketing operators.
6. **User Journey:** User visits Settings → Integrations → Connects Instagram Professional / Facebook Page / LinkedIn via official OAuth 2.0 → Selects content item from Content Studio → Chooses date and time on Marketing Calendar → Clicks "Schedule Post" → Background worker publishes post at scheduled time and records live post link and status.
7. **Entry Point in Interface:** Content Studio "Schedule Post" button, Marketing Calendar, Settings → Integrations.
8. **User Inputs:** Target social channel selector, publish date and time, caption edits, image asset selector.
9. **Required Business Brain Information:** None.
10. **Other Required Data:** Content asset URL, encrypted OAuth access tokens, social account ID.
11. **Data Validation Rules:**
    - Publish date must be at least 15 minutes in the future and within 75 days.
    - Image dimensions must meet platform standards (Instagram: 1:1, 4:5, or 9:16; LinkedIn: max 10MB).
    - Caption length: Instagram $\le 2,200$ chars; LinkedIn $\le 3,000$ chars; X $\le 280$ chars.
12. **AI Model / External Service Required:** **Meta Graph API v19.0**, **LinkedIn Marketing API v2**, **Cloud Tasks** (Scheduling worker). No AI model required.
13. **Why Selected:** Official sanctioned platform APIs guarantee account safety and zero risk of shadow-banning.
14. **Backend Processing Workflow:**
    ```
    Client POST /api/v1/social/schedule -> Verify Account Ownership -> 
    Decrypt access token -> Validate media format -> 
    Create `scheduledPosts` document -> 
    Enqueue Cloud Tasks HTTP task with execution timestamp -> 
    Return scheduled confirmation
    
    [At Execution Time]:
    Cloud Task triggers Cloud Function -> Re-verify token validity -> 
    Execute container upload & publish API call -> 
    Update document status to `published` -> Log post URL and timestamp
    ```
15. **AI Prompt / Context Requirements:** None.
16. **Expected AI Output:** None.
17. **Output Schema:**
    ```json
    {
      "scheduledPostId": "sch_88291",
      "platform": "instagram",
      "scheduledTime": "2026-11-21T10:00:00Z",
      "status": "queued",
      "platformPostId": null
    }
    ```
18. **User Actions Available After Generation:** Cancel scheduled post, reschedule time, edit caption before publish window, view live published post on social app.
19. **Editing & Regeneration Behaviour:** Edits permitted up to 10 minutes prior to scheduled execution time.
20. **Data Stored:** Stored in `socialAccounts` (AES-256 encrypted tokens) and `scheduledPosts`.
21. **Database Entities Affected:** `socialAccounts`, `scheduledPosts`, `contentItems`, `auditLogs`.
22. **File Storage Requirements:** Published static media hosted with public signed read URLs.
23. **API Endpoints / Backend Operations:**
    - `POST /api/v1/social/oauth/:provider/connect`
    - `POST /api/v1/social/schedule`
    - `DELETE /api/v1/social/schedule/:id`
    - `POST /api/v1/social/publish-worker` (internal Cloud Task target)
24. **Credit Consumption:** 0 credits (Platform utility feature).
25. **Cost Implications:** Cloud Tasks execution ($0.40 per million tasks) + Cloud Function compute (<$0.0001 per publish).
26. **Loading States:** Status badge transitions from `Queued` $\to$ `Publishing` $\to$ `Published`.
27. **Empty States:** "No social accounts connected. Connect Instagram or LinkedIn in Settings."
28. **Error States:** Token expired/revoked (`401`), Platform API rate limit reached (`429`), Unsupported media aspect ratio (`400`).
29. **Retry Behaviour:** Cloud Tasks retries transient network errors up to 3 times with exponential backoff; hard errors (e.g. invalid token) mark post `failed` and notify user via email/toast.
30. **Failure Recovery:** In-app notification with explicit error explanation and "Reconnect Account" CTA.
31. **Security & Permissions:** OAuth tokens encrypted using AES-256-GCM with keys managed in Google Cloud Secret Manager. Tokens never exposed to client browser.
32. **Dependencies:** Meta Graph API, LinkedIn API, Google Cloud Tasks.
33. **Acceptance Criteria:**
    - Static single image post publishes automatically at specified time within $\pm 60$ seconds.
    - Token expiration detected and user alerted before scheduled jobs fail.
    - Revoking an account cancels all pending scheduled jobs for that channel.
34. **Testing Scenarios:**
    - Test scheduling an Instagram 4:5 post for 1 hour in the future.
    - Test publish failure handling when OAuth token is deliberately invalidated.
    - Test canceling a post 20 minutes before execution.
35. **Implementation Priority:** **P1** (Important capability following core MVP validation).

---

## 9. Department 8: Competitor Intelligence

### Feature 8.1: Competitor Profile Teardown & Positioning Gap Matrix
1. **Feature Name:** Competitor Profile Teardown & Positioning Gap Matrix
2. **Feature ID:** `FEAT-CMP-001`
3. **Department:** Department 8: Competitor Intelligence
4. **Business Problem Solved:** Founders operate in the dark about competitor pricing, positioning wedges, and promotional tactics, leading to undifferentiated products and wasted ad spend.
5. **Target User:** Founders, Product Strategists, Marketing Directors.
6. **User Journey:** User visits `/competitive-intelligence` → Clicks "Add Competitor" or selects an existing profile → System scans public competitor website domain (via sanctioned search/research API) → Extracts pricing tiers, claimed USPs, and audience targets → Updates interactive 2D positioning map and feature matrix → Highlights strategic gaps where the founder's business holds an unfair advantage.
7. **Entry Point in Interface:** Left navigation "Competitive Intelligence" (`/competitive-intelligence`).
8. **User Inputs:** Competitor Name, Website URL, Category, Monitoring Frequency (`Daily` | `Weekly` | `Bi-weekly`).
9. **Required Business Brain Information:** `businessName`, `products`, `brandPositioning`, `valueProposition`.
10. **Other Required Data:** Search API results, public meta descriptions.
11. **Data Validation Rules:** Valid website URL (http/https); competitor name 2–80 characters.
12. **AI Model / External Service Required:** **Google Gemini 2.5 Flash** (Content summarization and positioning analysis) + **Tavily / Google Custom Search API** (Public webpage retrieval).
13. **Why Selected:** Tavily provides high-precision clean text extraction from public domains without brittle or illegal web scraping; Gemini extracts structured pricing and capability comparisons.
14. **Backend Processing Workflow:**
    ```
    Client POST /api/v1/competitors -> Validate Credits -> Reserve 3 Credits -> 
    Fetch public domain text via Tavily API -> 
    Pass text + Business Brain context to Gemini 2.5 Flash -> 
    Extract structured positioning coordinates (X/Y) & feature comparison -> 
    Store in `competitors` and `competitorSnapshots` -> 
    Settle 3 Credits -> Return profile & updated gap matrix
    ```
15. **AI Prompt / Context Requirements:** Grounding prompt commanding the model to extract verified public facts only, explicitly marking estimated market share as an estimate.
16. **Expected AI Output:** Validated JSON containing competitor positioning coordinates, strengths, weaknesses, price points, and strategic counter-moves.
17. **Output Schema:**
    ```json
    {
      "competitorId": "cmp_77192",
      "name": "Roastery House",
      "website": "https://roasteryhouse.example.com",
      "positioningCoordinates": { "x": 65, "y": 70 },
      "priceRange": "$22–$30 / bag",
      "threatLevel": "high",
      "strategicGaps": [
        "Lacks flexible weekly recurring roast subscriptions",
        "Slow regional shipping (>5 days outside metro)"
      ],
      "recommendedCounterMove": "Lead acquisition with 48h freshness guarantee and $15 Discovery Kit."
    }
    ```
18. **User Actions Available After Generation:** 1-click save counter-move to Growth Director, edit competitor notes, update monitoring frequency, view positioning map.
19. **Editing & Regeneration Behaviour:** User can adjust positioning map coordinates manually via drag-and-drop or trigger a manual refresh.
20. **Data Stored:** Stored in `competitors` and `competitorSnapshots` collections.
21. **Database Entities Affected:** `competitors`, `competitorSnapshots`, `creditTransactions`.
22. **File Storage Requirements:** Competitor logo/favicon stored in `workspaces/:id/competitors/`.
23. **API Endpoints / Backend Operations:**
    - `POST /api/v1/competitors`
    - `GET /api/v1/competitors`
    - `POST /api/v1/competitors/:id/refresh`
    - `DELETE /api/v1/competitors/:id`
24. **Credit Consumption:** **3 Credits** per competitor research teardown.
25. **Cost Implications:** Search API query ($0.005) + Gemini 2.5 Flash ($0.0006) = Total unit cost ~$0.0056.
26. **Loading States:** Topographic radar sweep animation with label: "Analyzing competitor positioning and public offerings...".
27. **Empty States:** "No competitors monitored yet. Add your top 3 rivals to generate your positioning gap matrix."
28. **Error States:** Domain unreachable, search quota exceeded, credit balance insufficient.
29. **Retry Behaviour:** Auto-retry search query once on network glitch; full credit refund on persistent failure.
30. **Failure Recovery:** Allows user to manually enter competitor price range and description if URL analysis fails.
31. **Security & Permissions:** All research requests proxy through backend; robots.txt and standard domain policies strictly respected.
32. **Dependencies:** Tavily Search API, Google Gen AI SDK, Cloud Firestore.
33. **Acceptance Criteria:**
    - Submitting a competitor domain returns pricing range, 2+ strategic gaps, and positioning coordinates in <3 seconds.
    - Counter-moves are tailored specifically to the user's Business Brain offerings.
34. **Testing Scenarios:**
    - Test adding real D2C specialty coffee brand URL.
    - Test adding competitor with non-functional URL (verify error fallback).
    - Test credit reservation and settlement.
35. **Implementation Priority:** **P0** (Essential launch requirement).

---

## 10. Department 9: Market Research & Trend Intelligence

### Feature 9.1: Parametric TAM/SAM/SOM Sizing & Market Validation Dossier
1. **Feature Name:** Parametric TAM/SAM/SOM Sizing & Market Validation Dossier
2. **Feature ID:** `FEAT-RES-001`
3. **Department:** Department 9: Market Research & Trend Intelligence
4. **Business Problem Solved:** Founders need defensible, realistic market validation reports for investor pitches and strategic planning without paying $5,000 to market research firms.
5. **Target User:** Startup founders, business planners, product managers.
6. **User Journey:** User visits `/idea-intelligence` → Enters concept summary, industry, target market, and geography → Selects research depth (`Rapid Pulse`, `Standard Validation`, `Deep Market Dossier`) → AI models parametric sizing bands and synthesizes a 15-section validation dossier → User adjusts interactive TAM/SAM/SOM assumption sliders (e.g. Category Spend, Serviceable Share) → Sizing figures update dynamically → User saves dossier to Business Brain or exports print-ready PDF.
7. **Entry Point in Interface:** Left navigation "Idea Intelligence" (`/idea-intelligence`).
8. **User Inputs:** Idea summary, industry, target customer market, geography, research depth selector.
9. **Required Business Brain Information:** `businessName`, `industry`, `location`, `products`.
10. **Other Required Data:** None.
11. **Data Validation Rules:** Idea summary $\ge 10$ characters, non-empty industry and geography.
12. **AI Model / External Service Required:** **Google Gemini 2.5 Pro** (Deep economic modeling and market analysis).
13. **Why Selected:** Gemini 2.5 Pro generates rigorous, mathematically sound parametric bounds without inventing false precision or fabricated survey citations.
14. **Backend Processing Workflow:**
    ```
    Client POST /api/v1/research/dossier -> Validate Subscription -> 
    Reserve 8 Credits -> Call Gemini 2.5 Pro with DossierSchema -> 
    Format TAM/SAM/SOM range bands -> Execute Deterministic Truth Check -> 
    Save report to `researchReports` -> Settle 8 Credits -> Return dossier object
    ```
15. **AI Prompt / Context Requirements:** Strict prompt formatting enforcing realistic bounds: TAM between $0.5B and $25B, SAM share between 4% and 30%, SOM share between 0.4% and 5%.
16. **Expected AI Output:** Validated JSON containing 15-section report: executive summary, demand signals, customer segments, pain point matrix, pricing tiers, risks, and next steps.
17. **Output Schema:**
    ```json
    {
      "reportId": "rep_33192",
      "title": "Specialty Coffee Subscription & Tasting Kit Validation",
      "overallConfidence": "High",
      "viabilitySignal": "Strong Fit",
      "tamSamSom": {
        "tamLabel": "$4.5B – $6.2B",
        "samLabel": "$540M – $720M",
        "somLabel": "$5.4M – $8.6M",
        "assumptions": [
          { "id": "tam", "label": "Category Spend", "value": 5.2, "unit": "$B" },
          { "id": "sam", "label": "Serviceable Share", "value": 12, "unit": "%" },
          { "id": "som", "label": "24-Mo Target Capture", "value": 1.2, "unit": "%" }
        ]
      },
      "truthScore": 100
    }
    ```
18. **User Actions Available After Generation:** Adjust parametric sliders in real-time, save dossier to Business Brain, export print-ready PDF report, convert validation experiments to tasks.
19. **Editing & Regeneration Behaviour:** Sliders update SAM/SOM calculations client-side instantaneously using deterministic formulas without consuming additional credits.
20. **Data Stored:** Stored in `researchReports` collection.
21. **Database Entities Affected:** `researchReports`, `businessBrain`, `creditTransactions`.
22. **File Storage Requirements:** Generated executive PDF exports stored in `workspaces/:id/reports/`.
23. **API Endpoints / Backend Operations:**
    - `POST /api/v1/research/dossier`
    - `GET /api/v1/research/reports`
    - `POST /api/v1/research/reports/:id/save-to-brain`
24. **Credit Consumption:** **8 Credits** per deep dossier.
25. **Cost Implications:** Gemini 2.5 Pro tokens (~3.5k input, ~2.5k output) cost ~$0.0075. High gross margin on 8 credits ($0.08 value).
26. **Loading States:** Step-by-step progress checklist (Scoping category $\to$ Sizing TAM/SAM/SOM $\to$ Auditing competitors $\to$ Structuring dossier).
27. **Empty States:** Gallery of pre-validated sample dossiers across D2C, SaaS, and professional services.
28. **Error States:** Upstream timeout, credit balance insufficient, content safety block.
29. **Retry Behaviour:** Auto-retry once on network timeout; full credit auto-refund on failure.
30. **Failure Recovery:** Gracefully falls back to local parametric dossier generator in `src/utils/logic.ts`.
31. **Security & Permissions:** User workspace authorization strictly enforced.
32. **Dependencies:** Google Gen AI SDK, Cloud Firestore.
33. **Acceptance Criteria:**
    - Generates 15 distinct, populated report sections in <3.5 seconds.
    - TAM/SAM/SOM displays realistic ranges (never false single-dollar precision).
    - Slider adjustments recalculate live figures immediately.
34. **Testing Scenarios:**
    - Test validation for specialty food brand in India.
    - Test parametric slider adjustments (verify mathematical consistency).
    - Test saving dossier to Business Brain.
35. **Implementation Priority:** **P0** (Essential launch requirement).

---

## 11. Department 10: AI Marketing Advisor

### Feature 10.1: Contextual Marketing Recommendation Engine
1. **Feature Name:** Contextual Marketing Recommendation Engine
2. **Feature ID:** `FEAT-ADV-001`
3. **Department:** Department 10: AI Marketing Advisor
4. **Business Problem Solved:** Business owners experience decision paralysis: they do not know what to promote this week, which marketing channels are underperforming, or how to react to competitor moves.
5. **Target User:** Solo founders, busy business operators.
6. **User Journey:** User logs in to Dashboard (`/dashboard`) → Advisor widget displays 3 prioritized, explainable marketing recommendations (e.g. "Run tasting kit trial campaign", "Counter competitor price drop") → User clicks "Why this matters" to inspect rationale → Clicks "Execute Now" to instantly open Brand Studio pre-filled with the recommended prompt.
7. **Entry Point in Interface:** Executive Dashboard Advisor Card (`/dashboard`), Growth Director Recommendations tab.
8. **User Inputs:** 1-click action buttons ("Execute Now", "Dismiss", "Add to Tasks").
9. **Required Business Brain Information:** `businessName`, `stage`, `primaryGoals`, `products`, `strategicMemory`.
10. **Other Required Data:** Competitor threat alerts from `competitorSnapshots`, recent publishing history.
11. **Data Validation Rules:** Recommendations must include explicit rationale and priority enum (`'high' | 'medium' | 'low'`).
12. **AI Model / External Service Required:** **Google Gemini 2.5 Flash** (Rule-guided contextual recommendation synthesis).
13. **Why Selected:** Fast execution, strong grounding in structured context, low cost for frequent proactive recommendations.
14. **Backend Processing Workflow:**
    ```
    Scheduled Cron / Dashboard Load -> Check cached recommendations -> 
    If stale (>24h): Call Gemini 2.5 Flash with Business Brain + Competitor Alerts -> 
    Filter out dismissed recommendations -> Store in `recommendations` -> 
    Return top 3 prioritized recommendations
    ```
15. **AI Prompt / Context Requirements:** Grounded in Business Brain goals, recent competitor moves, and anti-fatigue history.
16. **Expected AI Output:** Array of 3–5 actionable recommendations with title, category, whyItMatters rationale, expectedOutcome, and estimatedMinutes.
17. **Output Schema:**
    ```json
    {
      "recommendations": [
        {
          "id": "rec_01",
          "title": "Launch 3-Pack Tasting Kit Starter Promo",
          "category": "Acquisition",
          "whyItMatters": "Lowers first-time customer barrier; competitors currently mandate full 500g bag commitments.",
          "expectedOutcome": "15-25 new customer trial orders within 14 days.",
          "priority": "high",
          "estimatedMinutes": 15,
          "actionRoute": "brand-studio"
        }
      ]
    }
    ```
18. **User Actions Available After Generation:** "Execute Now" (deep links to creative tool), "Add to Tasks" (adds to Marketing Calendar), "Dismiss".
19. **Editing & Regeneration Behaviour:** Dismissing a recommendation trains the anti-fatigue memory to avoid similar suggestions for 30 days.
20. **Data Stored:** Stored in `recommendations` subcollection.
21. **Database Entities Affected:** `recommendations`, `marketingTasks`, `strategicMemory`.
22. **File Storage Requirements:** None.
23. **API Endpoints / Backend Operations:**
    - `GET /api/v1/advisor/recommendations`
    - `POST /api/v1/advisor/recommendations/:id/dismiss`
    - `POST /api/v1/advisor/recommendations/:id/execute`
24. **Credit Consumption:** 0 credits (Included as core platform intelligence).
25. **Cost Implications:** Batch-generated once per 24 hours per workspace (~$0.0004/day per active user).
26. **Loading States:** Shimmer card on dashboard with pulse beacon.
27. **Empty States:** "All recommended sprints completed! Check back tomorrow for fresh insights."
28. **Error States:** Graceful fallback to deterministic strategic recommendations in `src/utils/logic.ts`.
29. **Retry Behaviour:** Silent background retry on failure.
30. **Failure Recovery:** Deterministic heuristic fallback engine ensures the dashboard never displays an empty error box.
31. **Security & Permissions:** Workspace-level isolation enforced.
32. **Dependencies:** Cloud Firestore, Gemini 2.5 Flash.
33. **Acceptance Criteria:**
    - Recommendations explicitly reference verified company products.
    - Clicking "Execute Now" deep-links directly to the relevant department with pre-populated prompt.
34. **Testing Scenarios:**
    - Test recommendation generation for fresh workspace vs active workspace.
    - Test dismissal persistence.
35. **Implementation Priority:** **P0** (Essential launch requirement).

---

## 12. Department 11: Marketing Calendar & Task Management

### Feature 12.1: Unified Campaign Calendar & Task Execution Ledger
1. **Feature Name:** Unified Campaign Calendar & Task Execution Ledger
2. **Feature ID:** `FEAT-CAL-001`
3. **Department:** Department 11: Marketing Calendar & Task Management
4. **Business Problem Solved:** Marketing strategy fails when tasks are disconnected from scheduled social content, content drafts, and daily founder priorities.
5. **Target User:** Founders, marketing managers, agency account leads.
6. **User Journey:** User navigates to `/growth-director` (or Calendar view) → Views unified monthly/weekly grid showing scheduled social posts, campaign launches, and strategic tasks → Drags tasks to reschedule → Clicks a task to open details and notes → Completes daily sprint tasks with live countdown timer.
7. **Entry Point in Interface:** Growth Director → Tasks & Experiments mode (`/growth-director?mode=tasks`), Application Header calendar widget.
8. **User Inputs:** Task title, due date, estimated minutes, priority (`high` | `medium` | `low`), notes, status toggle.
9. **Required Business Brain Information:** `primaryGoals`.
10. **Other Required Data:** `scheduledPosts` records, `growthExperiments` records.
11. **Data Validation Rules:** Title non-empty (2–120 chars); due date valid ISO-8601 string; estimated minutes between 5 and 480.
12. **AI Model / External Service Required:** None (Core software workflow).
13. **Why Selected:** N/A.
14. **Backend Processing Workflow:**
    ```
    Client POST /api/v1/tasks -> Validate Workspace Membership -> 
    Create `marketingTasks` document -> Associate with campaignId if present -> 
    Emit real-time update to active clients
    ```
15. **AI Prompt / Context Requirements:** None.
16. **Expected AI Output:** None.
17. **Output Schema:**
    ```json
    {
      "taskId": "tsk_29102",
      "title": "Review Q4 Tasting Kit Packaging Proofs",
      "status": "todo",
      "dueDate": "2026-11-24",
      "estimatedMinutes": 30,
      "priority": "high",
      "completedAt": null
    }
    ```
18. **User Actions Available After Generation:** Toggle complete/incomplete, reorder, reschedule date, add execution notes, delete task.
19. **Editing & Regeneration Behaviour:** Instant optimistic UI update with real-time Firestore sync.
20. **Data Stored:** Stored in `marketingTasks` collection.
21. **Database Entities Affected:** `marketingTasks`, `workspaces`.
22. **File Storage Requirements:** None.
23. **API Endpoints / Backend Operations:**
    - `GET /api/v1/tasks`
    - `POST /api/v1/tasks`
    - `PATCH /api/v1/tasks/:id`
    - `DELETE /api/v1/tasks/:id`
24. **Credit Consumption:** 0 credits.
25. **Cost Implications:** Minimal Firestore read/writes (<$0.0001/task).
26. **Loading States:** Ceramic skeleton task rows.
27. **Empty States:** "No tasks scheduled for this week. Convert recommendations or roadmap milestones into tasks."
28. **Error States:** Network disconnect banner with local caching.
29. **Retry Behaviour:** IndexedDB / localStorage offline queue syncs when connectivity restores.
30. **Failure Recovery:** Client-side optimistic state reverts if server rejects mutation.
31. **Security & Permissions:** All workspace members can view and toggle tasks; only Admin/Owner can delete.
32. **Dependencies:** Cloud Firestore.
33. **Acceptance Criteria:**
    - Completing a task updates completion percentage gauge immediately.
    - Dragging task to a new date updates Firestore `dueDate` within 200ms.
34. **Testing Scenarios:**
    - Test creating, toggling, and deleting a task.
    - Test calendar view aggregation of scheduled social posts and marketing tasks.
35. **Implementation Priority:** **P0** (Essential launch requirement).

---

## 13. Department 12: Analytics & Reporting

### Feature 13.1: Executive Performance Dashboard & Print-Ready PDF Reports
1. **Feature Name:** Executive Performance Dashboard & Print-Ready PDF Reports
2. **Feature ID:** `FEAT-ANL-001`
3. **Department:** Department 12: Analytics & Reporting
4. **Business Problem Solved:** Founders and agencies spend days compiling fragmented spreadsheets and screenshots to review monthly marketing ROI.
5. **Target User:** Founders, Managing Directors, Agency Account Executives.
6. **User Journey:** User navigates to `/business-performance` → Views executive health gauges (MRR growth, customer acquisition cost, retention cohorts, marketing funnel) → Switches to "Executive Reports" tab → Selects report time range (e.g. Q4 2026) → AI synthesizes narrative commentary comparing actual results against Business Brain goals → Clicks "Export PDF" to produce a pixel-perfect, print-ready executive memo.
7. **Entry Point in Interface:** Left navigation "Analytics" (`/business-performance`).
8. **User Inputs:** Time range selector (`7d` | `30d` | `90d` | `YTD`), export format selector (`Print / PDF` | `CSV Data`).
9. **Required Business Brain Information:** `businessName`, `primaryGoals`, `stage`, `revenueModel`.
10. **Other Required Data:** Analytics snapshots, social publishing history, conversion funnel events.
11. **Data Validation Rules:** Time range must be a supported valid enum.
12. **AI Model / External Service Required:** **Google Gemini 2.5 Flash** (Narrative executive performance interpretation).
13. **Why Selected:** Synthesizes complex numerical metrics into concise, executive-level commentary highlighting strategic wins, risks, and next steps.
14. **Backend Processing Workflow:**
    ```
    Client GET /api/v1/analytics/report -> Query aggregated metrics for period -> 
    Format summary table -> Invoke Gemini 2.5 Flash for narrative analysis -> 
    Combine charts, tables, and narrative into Report payload -> 
    Return structured report
    ```
15. **AI Prompt / Context Requirements:** Grounded in actual numerical metrics; forbidden from inventing numbers not present in the input table.
16. **Expected AI Output:** Executive narrative with 3 key sections: Executive Summary, Metric Divergences, Strategic Corrective Actions.
17. **Output Schema:**
    ```json
    {
      "reportId": "anl_88291",
      "period": "2026-Q4",
      "metricsSummary": { "mrr": "$18,400", "mrrGrowthPct": 14.2, "blendedCac": "$28" },
      "executiveNarrative": "MRR grew 14.2% driven by strong tasting-kit trial conversion...",
      "keyRisks": ["Day-30 trial churn increased 2.1% in Tier-2 regions."],
      "actionRecommendations": ["Introduce automated Day-14 subscription credit reminder."]
    }
    ```
18. **User Actions Available After Generation:** 1-click browser print / PDF export (using verified print CSS stylesheets), download raw CSV data, save narrative to Business Brain.
19. **Editing & Regeneration Behaviour:** User can edit the narrative text inline before printing.
20. **Data Stored:** Stored in `analyticsSnapshots` collection.
21. **Database Entities Affected:** `analyticsSnapshots`, `researchReports`.
22. **File Storage Requirements:** Rendered PDF reports stored in `workspaces/:id/reports/`.
23. **API Endpoints / Backend Operations:**
    - `GET /api/v1/analytics/dashboard`
    - `POST /api/v1/analytics/generate-report`
    - `GET /api/v1/analytics/export.csv`
24. **Credit Consumption:** **2 Credits** per AI narrative generation (free dashboard view).
25. **Cost Implications:** Gemini 2.5 Flash (~1.5k tokens) costs ~$0.0003. High margin.
26. **Loading States:** Shimmer Recharts grid and metric gauge skeletons.
27. **Empty States:** "No performance data recorded yet. Connect Shopify or Stripe in Settings to activate automated metrics."
28. **Error States:** Integration sync error banner, date range out of bounds.
29. **Retry Behaviour:** Auto-retry once on transient API failure.
30. **Failure Recovery:** Recharts displays raw data without narrative if AI synthesis fails.
31. **Security & Permissions:** Strictly restricted to `Owner` and `Admin` roles.
32. **Dependencies:** Recharts, Google Gen AI SDK, Cloud Firestore.
33. **Acceptance Criteria:**
    - Print view removes sidebar, header, and controls, producing a clean black-and-white executive memo with zero page breaks across charts.
    - Visualized metrics match underlying Firestore snapshot data exactly.
34. **Testing Scenarios:**
    - Test print dialog trigger (verify CSS `@media print` styling).
    - Test CSV export formatting with RFC-compliant headers.
35. **Implementation Priority:** **P0** (Essential launch requirement).

---

## 14. Department 13: Subscription, Credits & Billing

### Feature 14.1: Server-Side Credit Wallet & Cashfree Payment Lifecycle
1. **Feature Name:** Server-Side Credit Wallet & Cashfree Payment Lifecycle
2. **Feature ID:** `FEAT-BIL-001`
3. **Department:** Department 13: Subscription, Credits & Billing
4. **Business Problem Solved:** AI SaaS platforms suffer from API cost overruns, credit fraud, and failed payment reconciliation when credit balances are calculated client-side or tied to insecure redirects.
5. **Target User:** Workspace Owners and billing administrators.
6. **User Journey:** User visits Settings → Billing → Selects plan (`Starter: $49/mo [200 Credits]`, `Growth Pro: $149/mo [800 Credits]`, `Scale: $399/mo [2,500 Credits]`) → System creates Cashfree PG payment order → User completes payment via UPI, Card, or Netbanking → Cashfree webhook securely notifies backend → Signature verified via HMAC-SHA256 → Subscription activated and credits granted atomically in Firestore transaction → Invoice generated and emailed.
7. **Entry Point in Interface:** Settings → Subscription & Billing tab (`/settings?tab=subscription-billing`), Credit balance indicator in application header.
8. **User Inputs:** Plan selection button, billing cycle toggle (Monthly / Annual), payment method details in gateway modal.
9. **Required Business Brain Information:** `businessName`, `location`.
10. **Other Required Data:** User email, phone number, Cashfree App ID & Secret Key (server-side only).
11. **Data Validation Rules:**
    - Plan ID must match verified active catalog (`'starter' | 'growth' | 'scale'`).
    - Webhook signature must match `x-webhook-signature` using HMAC-SHA256.
12. **AI Model / External Service Required:** **Cashfree Payment Gateway API** (India INR UPI, Cards, Netbanking) + **Stripe** (International USD fallback). No AI model required.
13. **Why Selected:** Cashfree is the market leader for Indian payment collection with native UPI AutoPay recurring support and automated GST tax invoicing.
14. **Backend Processing Workflow:**
    ```
    Client POST /api/v1/billing/create-order -> Validate Plan & Amount -> 
    Call Cashfree Order API -> Store `paymentOrders` document -> Return order token to client ->
    User completes checkout -> Cashfree POST /api/v1/billing/webhook -> 
    Verify HMAC signature -> Run Firestore Transaction:
      1. Check order status is `PAID` (idempotency check)
      2. Set `paymentOrders.status = 'SUCCESS'`
      3. Update `subscriptions.status = 'active'`
      4. Grant monthly credits to `creditWallets`
      5. Append to `creditTransactions` ledger
    Emit real-time wallet update to client
    ```
15. **AI Prompt / Context Requirements:** None.
16. **Expected AI Output:** None.
17. **Output Schema:**
    ```json
    {
      "orderId": "order_bw_991823",
      "paymentSessionId": "session_88192a8b",
      "orderAmount": 149.00,
      "orderCurrency": "USD",
      "planId": "growth-pro"
    }
    ```
18. **User Actions Available After Generation:** View active plan, download GST tax invoice PDF, buy additional credit top-up pack, cancel renewal.
19. **Editing & Regeneration Behaviour:** Plan changes execute with pro-rata credit calculation upon billing cycle rollover.
20. **Data Stored:** Stored in `subscriptions`, `paymentOrders`, `creditWallets`, `creditTransactions`.
21. **Database Entities Affected:** `subscriptions`, `paymentOrders`, `paymentTransactions`, `creditWallets`, `creditTransactions`.
22. **File Storage Requirements:** Tax invoices stored in `workspaces/:id/invoices/`.
23. **API Endpoints / Backend Operations:**
    - `POST /api/v1/billing/create-order`
    - `POST /api/v1/billing/cashfree-webhook`
    - `GET /api/v1/billing/subscription`
    - `GET /api/v1/billing/invoices`
24. **Credit Consumption:** 0 credits.
25. **Cost Implications:** Payment gateway transaction fee (Cashfree 1.95% on domestic cards/UPI; Stripe 2.9% + $0.30).
26. **Loading States:** Cashfree SDK modal overlay; wallet balance spinner during atomic credit settlement.
27. **Empty States:** Clear pricing comparison table when no active subscription exists.
28. **Error States:** Payment declined (`402`), Webhook signature mismatch (`401`), Duplicate order token (`409`).
29. **Retry Behaviour:** Cashfree automatically retries webhook delivery up to 5 times; backend scheduled job checks pending orders every 15 minutes as safety reconciliation.
30. **Failure Recovery:** Webhook replay safety via atomic database locks; user account never debited without credit grant.
31. **Security & Permissions:** Payment creation restricted to Workspace `Owner`. Webhook verification uses secret key stored in Google Cloud Secret Manager.
32. **Dependencies:** Cashfree API SDK, Cloud Secret Manager, Cloud Firestore.
33. **Acceptance Criteria:**
    - Completing payment updates workspace credit balance within <2 seconds without requiring manual page reload.
    - Webhook replays do not result in double credit allocations (strict idempotency).
    - Invoice PDF generated with legal company name and GST number.
34. **Testing Scenarios:**
    - Test Cashfree sandbox test payment flow.
    - Test simulated webhook replay (verify duplicate prevention).
    - Test credit reservation and auto-refund on simulated AI service timeout.
35. **Implementation Priority:** **P0** (Essential launch requirement).

---

## 15. Department 14: Administration & Platform Operations

### Feature 14.1: Super-Admin Tenant Management & AI Cost Telemetry
1. **Feature Name:** Super-Admin Tenant Management & AI Cost Telemetry
2. **Feature ID:** `FEAT-ADM-001`
3. **Department:** Department 14: Administration & Platform Operations
4. **Business Problem Solved:** Platform operators need real-time visibility into AI token consumption, provider error rates, customer credit balances, and tenant health to prevent financial leakage and resolve user issues.
5. **Target User:** Platform Super-Admins, DevOps/SRE Engineers, Finance Leads.
6. **User Journey:** Super-admin authenticates with root credentials at `/admin` → Views global health dashboard (active tenants, total token spend, gross margin, API error rates) → Searches for specific workspace → Inspects tenant's Business Brain, credit ledger, and failed AI jobs → Manually adjusts credit balance or issues refund with audit reason.
7. **Entry Point in Interface:** Dedicated internal admin route (`/admin`).
8. **User Inputs:** Search query, tenant filter, credit adjustment amount, reason string, feature flag toggles.
9. **Required Business Brain Information:** None.
10. **Other Required Data:** Admin session token, Google Cloud Logging metrics.
11. **Data Validation Rules:** Super-admin role verification via Firebase Custom Claims (`admin: true`). Credit adjustment must include mandatory reason text $\ge 5$ characters.
12. **AI Model / External Service Required:** None (Pure software telemetry & administration).
13. **Why Selected:** N/A.
14. **Backend Processing Workflow:**
    ```
    Client Request -> Verify Admin Custom Claim -> Query aggregated telemetry -> 
    If manual adjustment: Execute atomic credit ledger update -> 
    Write to `adminActions` and `auditLogs` -> Return updated tenant state
    ```
15. **AI Prompt / Context Requirements:** None.
16. **Expected AI Output:** None.
17. **Output Schema:**
    ```json
    {
      "workspaceId": "ws_12345",
      "businessName": "Solstice Craft Coffee",
      "plan": "Growth Pro",
      "creditBalance": 450,
      "totalTokensConsumed": 1420500,
      "aiCostUsd": 1.48,
      "status": "active"
    }
    ```
18. **User Actions Available After Generation:** Adjust credits, impersonate tenant (read-only), toggle feature flags, ban workspace, inspect raw generation error traces.
19. **Editing & Regeneration Behaviour:** Instant administrative mutations logged with immutable audit stamps.
20. **Data Stored:** Stored in `adminActions`, `auditLogs`, `aiUsageLogs`.
21. **Database Entities Affected:** `workspaces`, `creditWallets`, `creditTransactions`, `adminActions`, `auditLogs`.
22. **File Storage Requirements:** None.
23. **API Endpoints / Backend Operations:**
    - `GET /api/v1/admin/overview`
    - `GET /api/v1/admin/tenants/:id`
    - `POST /api/v1/admin/tenants/:id/adjust-credits`
    - `POST /api/v1/admin/tenants/:id/toggle-flag`
24. **Credit Consumption:** 0 credits.
25. **Cost Implications:** Pure internal administrative queries (<$0.001/query).
26. **Loading States:** Dark slate administrative dashboard with TopoGrid telemetry charts.
27. **Empty States:** "No matching tenants found."
28. **Error States:** `403 Forbidden` (non-super-admin access attempt), `404 Not Found`.
29. **Retry Behaviour:** Standard API backoff.
30. **Failure Recovery:** All administrative actions recorded to append-only immutable audit collection.
31. **Security & Permissions:** Protected by strict Firebase Custom Auth Claims and IP allowlisting where appropriate.
32. **Dependencies:** Cloud Firestore, Firebase Auth Custom Claims.
33. **Acceptance Criteria:**
    - Non-admin user attempting to access `/admin` or invoke admin APIs receives immediate `403 Forbidden` and audit log entry.
    - Adjusting a tenant's credits immediately reflects in the tenant's wallet and records the admin's email and reason.
34. **Testing Scenarios:**
    - Test unauthorized user access to admin endpoints (verify hard rejection).
    - Test manual credit adjustment transaction and ledger history.
35. **Implementation Priority:** **P1** (Required before scaling public production onboarding).
