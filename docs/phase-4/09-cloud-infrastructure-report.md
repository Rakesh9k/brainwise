# BrainWise Phase 4 Cloud Infrastructure Report

## 1. Cloud Infrastructure Architecture
BrainWise leverages Google Cloud Platform (GCP) managed serverless primitives to optimize performance, eliminate server management, and minimize hosting expenses:
- **Compute:** Google Cloud Run (Containerized Node.js 22 LTS / Express).
- **Database:** Google Cloud Firestore (Native Mode, Multi-Region / Regional Strong Consistency).
- **Object Storage:** Google Cloud Storage (Private Bucket with V4 Signed URLs).
- **Authentication:** Firebase Authentication (Identity Toolkit).
- **Secret Management:** Google Secret Manager.
- **CI/CD:** Google Cloud Build + GitHub Actions.

---

## 2. Resource Attribution & Cost Projections
- **Zero Idle Costs:** Cloud Run scales to zero instances when traffic drops, incurring zero compute cost during idle windows.
- **Firestore Free Tier & Pay-as-You-Go:** Optimized document reads and subcollection indexing keep read/write operations within cost thresholds.
- **Storage Egress Minimization:** Direct browser-to-GCS transfers using signed URLs eliminate API server egress bandwidth bottlenecks.
- **Strict Video Exclusion:** Eliminating video transcoding and streaming saves an estimated 85% of projected media infrastructure and storage costs.
