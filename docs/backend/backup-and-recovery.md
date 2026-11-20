# BrainWise Backup, Disaster Recovery & High Availability Plan

## 1. High Availability Architecture
The BrainWise production infrastructure is built on Google Cloud Platform's serverless managed primitives to guarantee high availability (99.95% SLA) without manual cluster operations:
- **Compute (Cloud Run):** Multi-zone regional autoscaling with instant failover and zero-downtime rolling updates.
- **Database (Cloud Firestore):** Multi-region or regional automatic replication across availability zones with strong consistency.
- **Storage (Google Cloud Storage):** Standard multi-regional storage providing 99.999999999% (11 9's) annual durability.

---

## 2. Automated Backup Strategy

### 2.1 Firestore Scheduled Backups
Firestore automated backups are executed via **Cloud Scheduler** triggering the Firestore export API to a dedicated cold-storage backup bucket:
```bash
gcloud firestore export gs://brainwise-firestore-backups/daily/$(date +%Y-%m-%d)
```
- **Frequency:** Daily at 02:00 UTC.
- **Retention:** 30-day lifecycle policy with automatic object expiration.
- **Coverage:** Complete database dump including all workspace subcollections.

### 2.2 Point-in-Time Recovery (PITR)
Firestore Point-in-Time Recovery is enabled on production databases:
- Continuous recovery window of 7 days.
- Protection against accidental mass document corruption or administrative error.

### 2.3 Cloud Storage Versioning
Object versioning is enabled on `brainwise-app-storage`:
- Previous versions of brand assets and documents are retained for 30 days following modification or deletion.

---

## 3. Disaster Recovery (DR) & RTO/RPO Objectives
- **Recovery Point Objective (RPO):** < 1 minute (via PITR) or < 24 hours (via daily snapshot).
- **Recovery Time Objective (RTO):** < 30 minutes to restore a full environment to a secondary region.
