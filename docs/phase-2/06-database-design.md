# BrainWise Phase 2 — 06: Database Design & Storage Architecture

**Document ID:** `docs/phase-2/06-database-design.md`  
**Version:** `2.0.0`  
**Date:** November 19, 2026  
**Auditor:** Database Architect & Principal Backend Engineer  
**Status:** APPROVED & BINDING  

---

## 1. Executive Summary

This document specifies the complete logical and physical database architecture for BrainWise. 

The primary operational data store is **Google Cloud Firestore** (Datastore mode in Native NoSQL document format), complemented by **Google Cloud Storage (GCS)** for binary visual assets and document files. The schema enforces multi-tenant workspace isolation, fast indexing, subcollection encapsulation, and atomic transaction safety.

**Mandatory Restriction:** All video entities, video asset tables, and video render fields are strictly excluded.

---

## 2. Global Firestore Collection Architecture

BrainWise utilizes a hybrid collection design:
1. **Root Global Collections:** For cross-workspace authentication (`users`), multi-tenancy management (`workspaces`, `workspaceMembers`), billing webhooks (`paymentOrders`), and global audits (`auditLogs`, `adminActions`).
2. **Workspace Subcollections:** For tenant-isolated operational domain models (`businessBrain`, `products`, `contentItems`, `marketingTasks`, `creditWallets`).

```
Firestore Root
├── users/ {userId}
├── workspaces/ {workspaceId}
│   ├── businessBrain/ rootDoc
│   ├── products/ {productId}
│   ├── personas/ {personaId}
│   ├── brandIdentities/ {identityId}
│   ├── brandAssets/ {assetId}
│   ├── marketingStrategies/ {strategyId}
│   ├── contentItems/ {contentId}
│   │   └── versions/ {versionId}
│   ├── competitors/ {competitorId}
│   │   └── snapshots/ {snapshotId}
│   ├── researchReports/ {reportId}
│   ├── recommendations/ {recommendationId}
│   ├── marketingTasks/ {taskId}
│   ├── scheduledPosts/ {scheduledPostId}
│   ├── analyticsSnapshots/ {snapshotId}
│   ├── creditWallet/ rootWallet
│   │   ├── transactions/ {transactionId}
│   │   └── reservations/ {reservationId}
│   └── subscriptions/ rootSubscription
├── workspaceMembers/ {memberId} (composite key: uid_workspaceId)
├── socialAccounts/ {accountId} (OAuth tokens)
├── paymentOrders/ {orderId} (Cashfree / Stripe tracking)
├── aiUsageLogs/ {logId} (FinOps cost monitoring)
├── adminActions/ {actionId}
└── auditLogs/ {logId}
```

---

## 3. Comprehensive Entity Schemas

### 3.1 `users` (Root Collection)
- **Path:** `/users/{userId}`
- **Purpose:** Stores root user credentials and personal preferences.
- **Fields:**
  - `userId`: `string` (Matches Firebase Auth UID, Primary Key)
  - `email`: `string` (Required, RFC 5322)
  - `firstName`: `string` (Required)
  - `lastName`: `string` (Required)
  - `avatarUrl`: `string?` (Optional GCS URL)
  - `timezone`: `string` (e.g. `'Asia/Kolkata'`)
  - `activeWorkspaceId`: `string` (Points to currently active workspace)
  - `isSuperAdmin`: `boolean` (Default: `false`)
  - `createdAt`: `timestamp` (Server timestamp)
  - `updatedAt`: `timestamp` (Server timestamp)

### 3.2 `workspaces` (Root Collection)
- **Path:** `/workspaces/{workspaceId}`
- **Purpose:** Multi-tenant workspace anchor.
- **Fields:**
  - `workspaceId`: `string` (UUID v4, Primary Key)
  - `name`: `string` (Required, 2–64 chars)
  - `slug`: `string` (Unique index, lowercase alphanumeric)
  - `ownerId`: `string` (Foreign key $\to$ `users.userId`)
  - `industry`: `string` (e.g. `'Specialty Food & Beverage'`)
  - `planId`: `string` (Enum: `'starter' | 'growth' | 'scale'`)
  - `createdAt`: `timestamp`
  - `updatedAt`: `timestamp`

### 3.3 `businessBrain` (Workspace Subcollection)
- **Path:** `/workspaces/{workspaceId}/businessBrain/rootDoc`
- **Purpose:** Authoritative single source of truth for business intelligence.
- **Fields:**
  - `businessName`: `string`
  - `tagline`: `string`
  - `stage`: `string` (Enum: `'Idea Stage' | 'Pre-Launch' | 'Early Traction' | 'Growing Business' | 'Established'`)
  - `location`: `string`
  - `website`: `string`
  - `foundedYear`: `string`
  - `overviewSummary`: `string`
  - `targetAudience`: `string`
  - `brandPositioning`: `string`
  - `valueProposition`: `string`
  - `businessModel`: `string`
  - `revenueModel`: `string`
  - `primaryGoals`: `array<string>`
  - `provenance`: `map<fieldKey, FactProvenanceItem>`:
    - `source`: `'USER_CONFIRMED' | 'DERIVED_FROM_DOC' | 'AI_INFERRED' | 'SYSTEM_DEFAULT'`
    - `confidence`: `number` (0.0 to 1.0)
    - `verifiedAt`: `timestamp`
    - `lastConfirmedBy`: `string`
    - `notes`: `string`
  - `strategicMemory`: `map`:
    - `usedAngles`: `array<{ id, angle, theme, usedIn, lastUsedAt, frequency }>`
    - `fatiguedThemes`: `array<string>`
    - `explicitExclusions`: `array<string>`
    - `lastUpdated`: `timestamp`
  - `lastUpdated`: `timestamp`

### 3.4 `products` (Workspace Subcollection)
- **Path:** `/workspaces/{workspaceId}/products/{productId}`
- **Purpose:** Verified product/service catalog used for price grounding.
- **Fields:**
  - `productId`: `string` (UUID v4)
  - `workspaceId`: `string` (Indexed)
  - `name`: `string` (Required)
  - `category`: `string`
  - `priceRange`: `string` (e.g. `'$18 – $26 / month'`)
  - `normalizedPrices`: `array<number>` (e.g. `[18, 26]`)
  - `description`: `string`
  - `marginEstimate`: `string`
  - `createdAt`: `timestamp`

### 3.5 `contentItems` (Workspace Subcollection)
- **Path:** `/workspaces/{workspaceId}/contentItems/{contentId}`
- **Purpose:** Stores generated static carousels, social posts, and copy packs.
- **Fields:**
  - `contentId`: `string` (UUID v4)
  - `workspaceId`: `string` (Indexed)
  - `platform`: `string` (Enum: `'Instagram Post' | 'Carousel' | 'LinkedIn Post' | 'Facebook Creative'`)
  - `title`: `string`
  - `caption`: `string`
  - `hashtags`: `array<string>`
  - `postingRationale`: `string`
  - `slideCount`: `number` (1 to 7)
  - `slides`: `array<map>`:
    - `slideNumber`: `number`
    - `role`: `'Hook' | 'Problem' | 'Insight' | 'Proof' | 'CTA'`
    - `headline`: `string`
    - `body`: `string`
    - `svgMotif`: `string` (Sanitized XML string)
  - `truthScore`: `number` (0 to 100)
  - `status`: `string` (Enum: `'draft' | 'approved' | 'scheduled' | 'published'`)
  - `createdAt`: `timestamp`

### 3.6 `creditWallet` (Workspace Subcollection)
- **Path:** `/workspaces/{workspaceId}/creditWallet/rootWallet`
- **Purpose:** Authoritative server-side credit balance and reservation lock.
- **Fields:**
  - `workspaceId`: `string`
  - `balance`: `number` (Integer, total spendable credits)
  - `reserved`: `number` (Integer, currently locked for active generations)
  - `monthlyQuota`: `number` (Plan allowance, e.g. 800)
  - `quotaRenewalDate`: `timestamp`
  - `lifetimeGranted`: `number`
  - `lifetimeConsumed`: `number`
  - `updatedAt`: `timestamp`

### 3.7 `creditTransactions` (Subcollection under Credit Wallet)
- **Path:** `/workspaces/{workspaceId}/creditWallet/rootWallet/transactions/{txId}`
- **Purpose:** Immutable append-only financial ledger of every credit movement.
- **Fields:**
  - `txId`: `string` (UUID v4)
  - `workspaceId`: `string`
  - `type`: `string` (Enum: `'GRANT' | 'RESERVATION_HOLD' | 'SETTLEMENT' | 'REFUND' | 'ADMIN_ADJUST'`)
  - `amount`: `number` (Signed integer: positive for grant/refund, negative for settlement)
  - `balanceBefore`: `number`
  - `balanceAfter`: `number`
  - `featureId`: `string` (e.g. `'FEAT-CNT-001'`)
  - `idempotencyKey`: `string` (Unique index)
  - `notes`: `string`
  - `createdAt`: `timestamp`

---

## 4. Query Patterns & Compound Index Specifications

The following compound indexes are required in `firestore.indexes.json`:

```json
{
  "indexes": [
    {
      "collectionGroup": "contentItems",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "workspaceId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "marketingTasks",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "workspaceId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "dueDate", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "scheduledPosts",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "scheduledTime", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "creditTransactions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "workspaceId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

---

## 5. Google Cloud Storage Hierarchy & Access Policies

All binary files (document briefs, static image collateral, SVG assets, PDF reports, tax invoices) are stored in Google Cloud Storage with strict prefix partitioning:

```
gs://[project-id]-brainwise-assets/
├── workspaces/{workspaceId}/
│   ├── documents/           # Uploaded PDFs, spreadsheets, pitch decks
│   │   └── {documentId}.pdf
│   ├── brand/               # Logos, wordmarks, visiting card SVGs
│   │   ├── logos/{conceptId}.svg
│   │   └── collateral/{assetId}.pdf
│   ├── content/             # Social media slide PNGs & SVGs
│   │   └── {contentId}/slide_{number}.png
│   ├── reports/             # Rendered executive PDF reports
│   │   └── {reportId}.pdf
│   └── invoices/            # Legal GST tax invoice PDFs
│       └── inv_{orderId}.pdf
```

### Storage Security Policy:
- **Private by Default:** All buckets are private with Uniform Bucket-Level Access.
- **Signed URLs:** Client downloads and uploads use short-lived HMAC signed URLs (15-minute expiration) generated by Cloud Functions.
- **Lifecycle Rules:** `temp/` folder objects auto-delete after 24 hours.
