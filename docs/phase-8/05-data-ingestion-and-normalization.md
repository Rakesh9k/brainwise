# BRAINWISE — PHASE 8: DATA INGESTION & NORMALIZATION SPECIFICATION
**Document ID:** `docs/phase-8/05-data-ingestion-and-normalization.md`  
**Phase:** 8 — External Integrations, Connectivity & Intelligent Automation Engine  
**Status:** Approved & Implemented in Production  

---

## 1. Universal Data Ingestion Architecture

BrainWise connects to diverse external platforms that return data in disparate shapes, units, time resolutions, and protocols (Google Analytics REST payloads, Search Console row structures, Graph API JSON arrays, and CSV exports).

The **Data Ingestion Service** (`src/server/integrations/dataIngestionService.ts`) acts as an abstraction barrier:
1. Translates disparate third-party shapes into strongly typed `NormalizedDataRecord` objects.
2. Attaches immutable provenance metadata (`sourceType`, `verified`, `confidenceScore`).
3. Deduplicates identical records within sync windows.
4. Stores normalized records under multi-tenant partitioned Firestore paths: `workspaces/{workspaceId}/imported_data/{recordId}`.
5. Provides an indexed query interface for the 7 BrainWise departments without exposing raw third-party schemas.

---

## 2. Canonical Record Schema (`NormalizedDataRecord`)

```typescript
export interface NormalizedDataRecord {
  recordId: string;                     // Unique record identifier
  workspaceId: string;                  // Workspace tenant isolation boundary
  integrationId: string;                // Connected integration instance ID
  provider: string;                     // e.g. "google-analytics-4", "google-search-console"
  externalResourceId?: string;          // Third-party property ID or URL
  category: string;                     // e.g. "website_seo", "local_business", "social_media"
  retrievedAt: string;                  // ISO 8601 synchronization timestamp
  sourceTimestamp?: string;             // Upstream platform generation timestamp
  sourceReference: string;              // Direct deep-link or report reference URL
  syncJobId: string;                    // Ingestion batch / job identifier
  dataVersion: number;                  // Schema migration version
  provenance: {
    sourceType: string;                 // e.g. "GA4_RUN_REPORT_API", "SEARCH_CONSOLE_API"
    verified: boolean;                  // True for authenticated API responses
    confidenceScore: number;            // 0.0 - 1.0 confidence weighting
  };
  metrics: Record<string, number>;      // Canonical numeric metrics (sessions, clicks, reach)
  dimensions: Record<string, string>;   // Categorical facets (country, source, device)
  rawPayload?: Record<string, unknown>; // Optional sanitized payload for deep audits
}
```

---

## 3. Metric & Dimension Standard Mapping

| Upstream Provider | Stream Category | Canonical Metrics | Canonical Dimensions |
|-------------------|-----------------|-------------------|----------------------|
| **Google Analytics 4** | `website_seo` | `activeUsers`, `sessions`, `screenPageViews`, `engagementRate`, `conversions` | `primarySource`, `topDeviceCategory`, `topLandingPage` |
| **Google Search Console** | `seo_performance` | `totalClicks`, `totalImpressions`, `averageCtr`, `averagePosition` | `period`, `siteUrl`, `topQuery`, `pageUrl` |
| **Google Business Profile** | `local_business` | `mapsImpressions`, `searchImpressionsMobile`, `directionRequests`, `phoneCallClicks`, `averageStarRating` | `locationName`, `address`, `topSearchTerm` |
| **Meta / Instagram** | `social_media` | `totalFollowers`, `impressions30Days`, `reach30Days`, `engagementRate` | `handle`, `topContentType` |
| **LinkedIn Pages** | `social_media` | `totalFollowers`, `impressions30Days`, `clickThroughRate`, `engagementRate` | `topIndustryFollowers`, `topSeniority` |
| **YouTube Data API** | `social_media` | `subscribers`, `lifetimeViews`, `viewVelocity30Days`, `watchTimeMinutes` | `channelTitle`, `topVideoTitle` |
| **Google Drive** | `storage_docs` | `syncedFilesCount`, `totalSizeBytes` | `folderName`, `lastUploadedReport` |

---

## 4. Deduplication & Disconnection Purge

### 4.1 Deduplication Logic
Before persisting each `NormalizedDataRecord`, the Ingestion Service performs an atomic document lookup:
```ts
const recordRef = db.doc(`workspaces/${workspaceId}/imported_data/${record.recordId}`);
const existing = await recordRef.get();
if (existing.exists) {
  duplicateCount++;
  continue; // Skip without overwriting
}
await recordRef.set({ ...record, workspaceId, integrationId });
ingestedCount++;
```
This guarantees that repeated polling or webhook deliveries do not duplicate analytics data or distort period-over-period aggregate trends.

### 4.2 Disconnection Purge Policy (DPDPA Compliance)
When a user disconnects an integration via the UI or API, `purgeIntegrationData(workspaceId, integrationId)` is invoked:
- All documents in `workspaces/{workspaceId}/imported_data` where `integrationId == target` are deleted.
- Encrypted tokens in `.../secure/credentials` are deleted.
- The connection entity in `workspaces/{workspaceId}/integrations/{integrationId}` is removed.
- An immutable audit record (`DISCONNECT_INTEGRATION`) is recorded in the audit ledger.
- This ensures full compliance with user data deletion requests under data protection regulations.
