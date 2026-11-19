# BrainWise Phase 2 — 07: API Specifications & Endpoint Contracts

**Document ID:** `docs/phase-2/07-api-contracts.md`  
**Version:** `2.0.0`  
**Date:** November 19, 2026  
**Auditor:** API Architect & Principal Backend Engineer  
**Status:** APPROVED & BINDING  

---

## 1. Global API Standards & Conventions

All BrainWise backend endpoints follow strict RESTful and HTTPS Callable conventions.

### 1.1 Base URL & Versioning
- **Base URL:** `https://api.brain-wise.com/api/v1` (or regional Firebase Functions callable endpoints `asia-south1-brainwise-app.cloudfunctions.net/api/v1`).
- **All requests must include:**
  - `Authorization: Bearer <Firebase_ID_Token>`
  - `X-Workspace-Id: <workspaceId>` (Identifies tenant context)
  - `X-Idempotency-Key: <uuid-v4>` (Mandatory for credit-deducting and billing operations)

### 1.2 Standard Success Response Envelope
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "requestId": "req_88192a8b",
    "creditsDeducted": 4,
    "creditBalanceRemaining": 446,
    "truthScore": 100,
    "modelUsed": "gemini-2.5-flash",
    "latencyMs": 1420
  }
}
```

### 1.3 Standard Error Response Envelope
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_CREDITS",
    "message": "This operation requires 4 credits. Your balance is 2 credits.",
    "category": "BILLING_ERROR",
    "details": {
      "requiredCredits": 4,
      "availableBalance": 2
    },
    "retryable": false
  }
}
```

---

## 2. API Inventory by Department

```
┌────────────────────────────────────────────────────────────────────────┐
│                        BRAINWISE API INVENTORY                         │
├──────────────────────────┬──────────────────────────┬──────────────────┤
│ 1. Auth & Workspaces (5) │ 2. Onboarding (2)        │ 3. Brain (5)     │
│ 4. Brand Studio (4)      │ 5. Strategy (3)          │ 6. Content (3)   │
│ 7. Social Management (4) │ 8. Competitor Intel (4)  │ 9. Research (3)  │
│ 10. AI Advisor (3)       │ 11. Tasks & Calendar (4) │ 12. Analytics (3)│
│ 13. Billing & Credits (4)│ 14. Admin Operations (4) │ TOTAL: 47 APIs   │
└──────────────────────────┴──────────────────────────┴──────────────────┘
```

---

## 3. Core Endpoint Specifications

### 3.1 Department 2: Onboarding Document Extraction
- **Endpoint:** `POST /api/v1/onboarding/extract-document`
- **Purpose:** Extracts structured business facts from an uploaded pitch deck or catalog PDF.
- **Credit Charge:** 0 Credits (Free onboarding subsidy).
- **Request Headers:** `Authorization: Bearer <token>`, `X-Workspace-Id: <id>`
- **Request Schema:**
  ```json
  {
    "storagePath": "workspaces/ws_123/temp/pitch_deck_v2.pdf",
    "originalFileName": "Solstice_Pitch_Deck.pdf",
    "mimeType": "application/pdf"
  }
  ```
- **Response Schema (`200 OK`):**
  ```json
  {
    "success": true,
    "data": {
      "businessName": "Solstice Craft Coffee",
      "industry": "Specialty Food & Beverage",
      "tagline": "Single-origin specialty roasts within 48 hours of roasting.",
      "stage": "Early Traction",
      "location": "Hyderabad & Bengaluru, India",
      "products": [
        {
          "name": "Roast-to-Order Origin Subscription",
          "priceRange": "$18 – $26 / month",
          "category": "Recurring Subscription",
          "description": "Bi-weekly micro-lot single origin beans."
        }
      ],
      "targetAudience": "Urban knowledge workers and home pour-over enthusiasts.",
      "competitors": ["Roastery House", "Blue Tokai Coffee"],
      "confidenceScore": 0.94
    }
  }
  ```

### 3.2 Department 3: Business Brain Fact Confirmation
- **Endpoint:** `POST /api/v1/brain/facts/:fieldKey/confirm`
- **Purpose:** Elevates an `AI_INFERRED` or `DERIVED_FROM_DOC` fact to `USER_CONFIRMED` ground truth.
- **Credit Charge:** 0 Credits.
- **Request Schema:**
  ```json
  {
    "fieldKey": "brandPositioning",
    "confirmedValue": "Warm architectural minimalism with radical roast-date transparency.",
    "notes": "Confirmed by founder in Strategy review"
  }
  ```
- **Response Schema (`200 OK`):**
  ```json
  {
    "success": true,
    "data": {
      "fieldKey": "brandPositioning",
      "source": "USER_CONFIRMED",
      "confidence": 1.0,
      "verifiedAt": "2026-11-19T14:30:00Z",
      "lastConfirmedBy": "Vishesh Kakar"
    }
  }
  ```

### 3.3 Department 4: Generate Brand Collateral
- **Endpoint:** `POST /api/v1/brand/generate-collateral`
- **Purpose:** Generates static vector/SVG visiting cards, flyers, posters, or packaging.
- **Credit Charge:** 5 Credits.
- **Request Schema:**
  ```json
  {
    "category": "business-card",
    "prompt": "Minimalist founder visiting card with alabaster surface and terracotta accent",
    "surfaceMode": "light",
    "conceptId": "concept_architectural"
  }
  ```
- **Response Schema (`200 OK`):**
  ```json
  {
    "success": true,
    "data": {
      "assetId": "ast_99210",
      "title": "Minimalist Founder Card",
      "category": "business-card",
      "format": "SVG + PDF",
      "svgMarkup": "<svg viewBox=\"0 0 1050 600\" xmlns=\"http://www.w3.org/2000/svg\">...</svg>",
      "truthScore": 100,
      "downloadUrl": "https://storage.googleapis.com/.../card_ast_99210.pdf"
    },
    "meta": { "creditsDeducted": 5, "creditBalanceRemaining": 445 }
  }
  ```

### 3.4 Department 6: Generate Social Media Carousel
- **Endpoint:** `POST /api/v1/content/social-package`
- **Purpose:** Generates complete 3–7 slide static carousel with caption, hashtags, and SVG motifs.
- **Credit Charge:** 4 Credits.
- **Request Schema:**
  ```json
  {
    "platform": "Carousel",
    "angle": "Educational Carousel",
    "prompt": "Why roast date matters for specialty coffee extraction",
    "slideCount": 5,
    "visualMood": "Dark Charcoal Editorial"
  }
  ```
- **Response Schema (`200 OK`):**
  ```json
  {
    "success": true,
    "data": {
      "contentId": "cnt_882910",
      "title": "Carousel: The Roast Date Truth",
      "caption": "Most grocery store coffee sat on a shelf for 4 months...\n\nTap link in bio to taste 48h fresh.",
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
          "svgMotif": "<svg viewBox=\"0 0 120 48\">...</svg>"
        }
      ],
      "truthScore": 100
    },
    "meta": { "creditsDeducted": 4, "creditBalanceRemaining": 441 }
  }
  ```

### 3.5 Department 8: Competitor Research Teardown
- **Endpoint:** `POST /api/v1/competitors`
- **Purpose:** Scans public competitor domain, extracts pricing and positioning, updates gap matrix.
- **Credit Charge:** 3 Credits.
- **Request Schema:**
  ```json
  {
    "name": "Roastery House",
    "website": "https://roasteryhouse.example.com",
    "category": "Specialty Roaster",
    "monitoringFrequency": "Weekly"
  }
  ```
- **Response Schema (`201 Created`):**
  ```json
  {
    "success": true,
    "data": {
      "competitorId": "cmp_1920",
      "name": "Roastery House",
      "positioningCoordinates": { "x": 65, "y": 70 },
      "priceRange": "$22–$30 / bag",
      "threatLevel": "high",
      "strategicGaps": [
        "Lacks flexible weekly recurring roast subscriptions",
        "Slow regional shipping (>5 days outside metro)"
      ]
    },
    "meta": { "creditsDeducted": 3, "creditBalanceRemaining": 438 }
  }
  ```

### 3.6 Department 9: Parametric Market Validation Dossier
- **Endpoint:** `POST /api/v1/research/dossier`
- **Purpose:** Generates comprehensive 15-section market validation report with TAM/SAM/SOM bands.
- **Credit Charge:** 8 Credits.
- **Request Schema:**
  ```json
  {
    "ideaSummary": "Specialty Coffee Roast-on-Demand Subscription with Tasting Kit",
    "industry": "Specialty Food & Beverage",
    "targetMarket": "Urban professionals 24-40",
    "geography": "India Tier-1 Metros",
    "depth": "Deep Market Dossier"
  }
  ```
- **Response Schema (`200 OK`):**
  ```json
  {
    "success": true,
    "data": {
      "reportId": "rep_9921",
      "title": "Specialty Coffee Roast-on-Demand Validation",
      "overallConfidence": "High",
      "viabilitySignal": "Strong Fit",
      "tamSamSom": {
        "tamLabel": "$4.5B – $6.2B",
        "samLabel": "$540M – $720M",
        "somLabel": "$5.4M – $8.6M",
        "assumptions": [
          { "id": "tam", "label": "Category Annual Spend ($B)", "value": 5.2, "unit": "$B" },
          { "id": "sam", "label": "Serviceable Target Share (%)", "value": 12, "unit": "%" },
          { "id": "som", "label": "24-Month Target Capture (%)", "value": 1.2, "unit": "%" }
        ]
      },
      "truthScore": 100
    },
    "meta": { "creditsDeducted": 8, "creditBalanceRemaining": 430 }
  }
  ```

### 3.7 Department 13: Create Cashfree Checkout Order
- **Endpoint:** `POST /api/v1/billing/create-order`
- **Purpose:** Initiates a secure Cashfree PG checkout session for subscription activation or credit pack purchase.
- **Credit Charge:** 0 Credits.
- **Request Schema:**
  ```json
  {
    "planId": "growth-pro",
    "billingCycle": "annual",
    "currency": "INR"
  }
  ```
- **Response Schema (`200 OK`):**
  ```json
  {
    "success": true,
    "data": {
      "orderId": "order_bw_109283",
      "paymentSessionId": "session_cf_99a8b7c",
      "orderAmount": 14900.00,
      "orderCurrency": "INR",
      "paymentGateway": "CASHFREE"
    }
  }
  ```

### 3.8 Department 13: Cashfree Webhook Handler
- **Endpoint:** `POST /api/v1/billing/cashfree-webhook`
- **Purpose:** Server-side webhook receiving asynchronous payment settlement confirmation.
- **Security:** Verified with `x-webhook-signature` using HMAC-SHA256 and Cashfree secret key.
- **Response Schema (`200 OK`):**
  ```json
  { "received": true, "orderId": "order_bw_109283", "creditsAllocated": 800 }
  ```
