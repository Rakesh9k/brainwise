# BRAINWISE PHASE 1: BUSINESS KNOWLEDGE FOUNDATION
## Master REST API Documentation

---

## 1. Overview & General Conventions

All Business Brain APIs are exposed via standard REST over HTTPS. All endpoints are scoped to a specific workspace to ensure strict multi-tenant isolation.

- **Base URL:** `https://api.brainwise.ai/api/v1/workspaces/:workspaceId/business-profile`
- **Wire Format:** Standard JSON (`application/json; charset=utf-8`)
- **Authentication:** Bearer token in the `Authorization` header (`Authorization: Bearer <jwt_or_dev_token>`)
- **Idempotency:** State-mutating endpoints support the `X-Idempotency-Key: <uuid>` header
- **Standard Response Envelope:**

```typescript
// Success Response
{
  "success": true,
  "data": T
}

// Error Response
{
  "success": false,
  "error": {
    "code": string,
    "message": string,
    "details"?: unknown
  }
}
```

---

## 2. Authentication & Authorization

All endpoints enforce tenant membership validation:
- The authenticated user (`req.user.uid`) must be a member of `workspaceId`.
- Write endpoints (`POST`, `PATCH`, `DELETE`) require the role `owner`, `admin`, or `member`.
- Any attempt to access data belonging to another workspace yields `403 FORBIDDEN` (`CROSS_WORKSPACE_FORBIDDEN`).

---

## 3. Complete Endpoint Reference

### 3.1 Business Identity & Profile

#### `GET /api/v1/workspaces/:workspaceId/business-profile`
Returns the active Business Brain profile including fact provenance metadata and completeness stats.

- **Permissions:** `owner`, `admin`, `member`, `viewer`
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "workspaceId": "ws_alpha_123",
    "businessName": "Solstice Craft Coffee Roasters",
    "tagline": "Roast-to-order origin coffees",
    "industry": "Specialty Food & Beverage",
    "subIndustry": "Coffee Roasting & Retail",
    "businessModel": "D2C & B2B Wholesale",
    "stage": "Growing Business",
    "location": "Bengaluru, India",
    "serviceAreas": ["Indiranagar", "Koramangala", "Whitefield"],
    "operationType": "hybrid",
    "website": "https://solsticecoffee.com",
    "operatingHours": "Mon-Sun 07:00-22:00 IST",
    "strengths": ["Farm-traceable single origins", "Proprietary roasting curve"],
    "weaknesses": ["Limited cold storage during peak harvest"],
    "version": 4,
    "confirmedFacts": {
      "businessName": { "confirmedBy": "Founder", "confirmedAt": "2026-11-20T10:00:00.000Z" },
      "location": { "confirmedBy": "Founder", "confirmedAt": "2026-11-20T10:00:00.000Z" }
    },
    "completenessScore": 85,
    "updatedAt": "2026-11-20T10:30:00.000Z"
  }
}
```

---

#### `PATCH /api/v1/workspaces/:workspaceId/business-profile`
Updates business profile fields, increments version number, and records an immutable snapshot in version history.

- **Permissions:** `owner`, `admin`, `member`
- **Request Body:**
```json
{
  "tagline": "Elevating the daily ritual through ethical single origins.",
  "operatingHours": "Mon-Sun 06:30-22:00 IST",
  "strengths": ["Direct farm trade", "Freshness guarantee"]
}
```
- **Response `200 OK`:** Returns the updated `BusinessProfileEntity`.

---

#### `POST /api/v1/workspaces/:workspaceId/business-profile/confirm-fact`
Elevates an AI-inferred or derived fact to `USER_CONFIRMED` ground truth.

- **Permissions:** `owner`, `admin`, `member`
- **Request Body:**
```json
{
  "factKey": "brandPositioning"
}
```
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "factKey": "brandPositioning",
    "confirmedBy": "Founder Name",
    "confirmedAt": "2026-11-20T11:00:00.000Z",
    "status": "CONFIRMED"
  }
}
```

---

### 3.2 Intelligent Document & URL Extraction Pipeline

#### `POST /api/v1/workspaces/:workspaceId/business-profile/extract-document`
Processes an uploaded file (menu, catalogue, PDF, DOCX, CSV, image) via multimodal OCR and structured heuristic extraction.

- **Credit Cost:** 3 Credits (Two-Phase Reservation Protocol)
- **Feature ID:** `FEAT-DOC-001`
- **Request Body:**
```json
{
  "documentId": "doc_1710928000_abc",
  "storagePath": "workspaces/ws_alpha_123/documents/menu.pdf",
  "fileName": "Summer-2026-Menu.pdf",
  "mimeType": "application/pdf"
}
```
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "extracted": {
      "identity": { "businessName": "Solstice Cafe", "industry": "Hospitality & Dining" },
      "products": [
        {
          "name": "Cold Brew Nitro Keg 20L",
          "price": 155,
          "category": "Commercial Kegs",
          "pricingStructure": "one-time"
        }
      ],
      "detectedProducts": [ /* Backward-compatible alias */ ]
    },
    "jobId": "job_1710928000_xyz",
    "documentId": "doc_1710928000_abc",
    "confidence": 92,
    "verificationItems": [
      {
        "itemId": "ver_item_1",
        "domain": "products",
        "fieldKey": "name",
        "proposedValue": { "name": "Cold Brew Nitro Keg 20L", "price": 155 }
      }
    ],
    "duplicateProducts": [],
    "missingInfoQuestions": [
      { "id": "q1", "question": "What is your monthly marketing budget?" }
    ],
    "creditsDeducted": 3,
    "creditBalanceRemaining": 247
  }
}
```
- **Error Codes:**
  - `DOCUMENT_NOT_FOUND` (404)
  - `UNSUPPORTED_MIME_TYPE` (400)
  - `INSUFFICIENT_CREDITS` (402)
  - `EXTRACTION_FAILED` (500, credits automatically refunded)

---

#### `POST /api/v1/workspaces/:workspaceId/business-profile/extract-url`
Crawls and parses a business website URL with server-side SSRF protection.

- **Credit Cost:** 3 Credits (Two-Phase Reservation Protocol)
- **Feature ID:** `FEAT-DOC-001`
- **Request Body:**
```json
{
  "url": "https://solsticecoffee.com"
}
```
- **Response `200 OK`:** Same structure as `extract-document`.
- **SSRF Blocked Response `400 Bad Request`:**
```json
{
  "success": false,
  "error": {
    "code": "SSRF_BLOCKED",
    "message": "Blocked private, loopback, or cloud-internal metadata host"
  }
}
```

---

#### `GET /api/v1/workspaces/:workspaceId/business-profile/documents`
Lists all business documents uploaded to the workspace.

- **Response `200 OK`:**
```json
{
  "success": true,
  "data": [
    {
      "documentId": "doc_101",
      "workspaceId": "ws_alpha_123",
      "name": "PriceList_2026.csv",
      "type": "CSV",
      "mimeType": "text/csv",
      "sizeBytes": 14250,
      "confidenceScore": 95,
      "status": "COMPLETED",
      "uploadedAt": "2026-11-20T08:30:00.000Z"
    }
  ]
}
```

---

#### `POST /api/v1/workspaces/:workspaceId/business-profile/documents/:documentId/reprocess`
Reruns extraction pipeline against an existing stored document.

- **Response `200 OK`:** Returns refreshed `ExtractionJobEntity`.

---

#### `DELETE /api/v1/workspaces/:workspaceId/business-profile/documents/:documentId`
Soft-deletes the document metadata and marks storage reference inactive.

- **Response `200 OK`:** `{ "success": true, "data": { "deleted": true, "documentId": "doc_101" } }`

---

### 3.3 Catalogue Import & Deduplication

#### `POST /api/v1/workspaces/:workspaceId/business-profile/products/import`
Performs bulk import of products or services with automatic duplicate detection.

- **Request Body:**
```json
{
  "products": [
    {
      "name": "Apex Nitro Keg 20L",
      "sku": "KEG-NITRO-20L",
      "category": "Commercial Kegs",
      "price": 155.00,
      "description": "High-flow nitrogen keg for commercial draft lines.",
      "pricingStructure": "one-time"
    },
    {
      "name": "Single Origin Tasting Box",
      "sku": "BOX-TASTE-3PK",
      "category": "Retail Coffee",
      "price": 38.00,
      "description": "Three 100g bags of current seasonal lots."
    }
  ],
  "updateExisting": false
}
```
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "importedCount": 2,
    "updatedCount": 0,
    "duplicateCount": 0,
    "duplicates": []
  }
}
```
- When duplicates are detected with `updateExisting: false`:
```json
{
  "success": true,
  "data": {
    "importedCount": 1,
    "updatedCount": 0,
    "duplicateCount": 1,
    "duplicates": [
      {
        "name": "Apex Nitro Keg 20L",
        "sku": "KEG-NITRO-20L",
        "reason": "Existing product matches SKU 'KEG-NITRO-20L'"
      }
    ]
  }
}
```

---

### 3.4 Verification Queue

#### `GET /api/v1/workspaces/:workspaceId/business-profile/verification-queue`
Retrieves facts extracted from documents or web URLs requiring founder confirmation.

- **Query Params:** `status=pending|approved|rejected|edited` (defaults to `pending`)
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": [
    {
      "itemId": "ver_item_987",
      "workspaceId": "ws_alpha_123",
      "jobId": "job_123",
      "domain": "products",
      "fieldKey": "Apex Nitro Keg 20L",
      "fieldLabel": "Product Offering",
      "proposedValue": {
        "name": "Apex Nitro Keg 20L",
        "price": 155,
        "category": "Commercial Kegs"
      },
      "source": "DERIVED_FROM_DOC",
      "confidenceScore": 92,
      "status": "pending",
      "createdAt": "2026-11-20T11:00:00.000Z"
    }
  ]
}
```

---

#### `POST /api/v1/workspaces/:workspaceId/business-profile/verification-queue/:itemId/verify`
Approves, edits, or rejects an extracted fact. Approved and edited facts are automatically merged into the active Business Brain as `USER_CONFIRMED` ground truth.

- **Request Body (Approve):**
```json
{
  "action": "approve"
}
```
- **Request Body (Edit & Approve):**
```json
{
  "action": "edit",
  "editedValue": {
    "name": "Apex Nitro Keg 20L (Reserve)",
    "price": 165,
    "category": "Commercial Kegs"
  }
}
```
- **Request Body (Reject):**
```json
{
  "action": "reject"
}
```
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "item": { "itemId": "ver_item_987", "status": "approved", "verifiedBy": "Founder" },
    "profile": { /* Updated BusinessProfileEntity */ }
  }
}
```

---

### 3.5 Resources & Constraints

#### `GET /api/v1/workspaces/:workspaceId/business-profile/resources-constraints`
Retrieves operational limits, marketing budgets, and hard boundaries.

- **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "monthlyMarketingBudget": 5000,
    "currency": "USD",
    "teamCapabilities": ["Barista Training", "Wholesale Distribution"],
    "operationalCapacity": "100 kegs / month maximum",
    "geographicBoundaries": "Within 25km of Bengaluru metropolitan area",
    "explicitExclusions": [
      "Never claim instant coffee",
      "Never offer video generation"
    ]
  }
}
```

---

#### `PATCH /api/v1/workspaces/:workspaceId/business-profile/resources-constraints`
Updates operational constraints and founder exclusions.

- **Request Body:** Partial `BusinessResourcesAndConstraints` object.
- **Response `200 OK`:** Returns the updated `BusinessResourcesAndConstraints` object.

---

### 3.6 Brand Intelligence

#### `GET /api/v1/workspaces/:workspaceId/business-profile/brand-intelligence`
Returns the active brand profile including color palette, typography, tone, words to use/avoid, and approved claims.

- **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "brandId": "brand_101",
    "brandName": "Solstice Craft Coffee",
    "voice": ["Artisanal", "Direct", "Gastronomic"],
    "colorPalette": {
      "primary": "#4A2C11",
      "secondary": "#D4A373",
      "accent": "#E76F51",
      "background": "#FAEDCD",
      "neutral": "#333333"
    },
    "typography": {
      "headings": "Playfair Display",
      "body": "Plus Jakarta Sans"
    },
    "wordsToUse": ["Single origin", "Farm-gate price", "Artisan roasted"],
    "wordsToAvoid": ["Cheap", "Instant", "Commercial blend"],
    "approvedClaims": ["Roasted within 48 hours of shipping"],
    "restrictedClaims": ["Never claim 100% organic without official certificate"]
  }
}
```

---

#### `POST /api/v1/workspaces/:workspaceId/business-profile/brand-intelligence`
Updates brand intelligence and syncs voice and restrictions back to `BusinessProfileEntity`.

- **Response `200 OK`:** Returns updated `BrandIdentityEntity`.

---

### 3.7 Missing Information & Gap Analysis

#### `GET /api/v1/workspaces/:workspaceId/business-profile/missing-info`
Runs cross-domain completeness checks and produces targeted follow-up prompts.

- **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "completenessScore": 75,
    "completenessPercentage": 75,
    "completedDomains": ["Business Identity", "Products & Services", "Brand Intelligence"],
    "missingItems": [
      {
        "domain": "Resources & Constraints",
        "field": "monthlyMarketingBudget",
        "prompt": "Marketing budget and operational constraints are undefined",
        "severity": "high"
      }
    ],
    "gaps": [
      {
        "domain": "Resources & Constraints",
        "field": "monthlyMarketingBudget",
        "missingFields": ["monthlyMarketingBudget"],
        "prompt": "Marketing budget and operational constraints are undefined",
        "followUpQuestion": "What is your estimated monthly marketing budget?",
        "severity": "high"
      }
    ],
    "followUpQuestions": [
      {
        "id": "fq_budget",
        "domain": "Resources & Constraints",
        "question": "What is your estimated monthly marketing budget?",
        "options": ["<$500/mo", "$500-$2,000/mo", "$2,000-$10,000/mo", ">$10,000/mo"]
      }
    ]
  }
}
```

---

### 3.8 Version Snapshots & Audit Trail

#### `GET /api/v1/workspaces/:workspaceId/business-profile/versions`
Returns the chronological list of all immutable profile versions.

- **Response `200 OK`:**
```json
{
  "success": true,
  "data": [
    {
      "versionId": "ver_snap_1",
      "versionNumber": 2,
      "changedBy": "Founder",
      "changeSummary": "Profile updated with operating hours and tagline",
      "createdAt": "2026-11-20T11:15:00.000Z"
    },
    {
      "versionId": "ver_snap_0",
      "versionNumber": 1,
      "changedBy": "System",
      "changeSummary": "Initial Business Profile creation",
      "createdAt": "2026-11-20T10:00:00.000Z"
    }
  ]
}
```

---

#### `GET /api/v1/workspaces/:workspaceId/business-profile/versions/:versionId`
Retrieves a full historical snapshot of the Business Brain.
