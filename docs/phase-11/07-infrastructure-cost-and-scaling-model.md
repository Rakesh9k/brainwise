# BRAINWISE — INFRASTRUCTURE COST & SCALING MODEL
**Classification:** Financial Engineering & Cloud Economics  
**Authority:** Phase 11 Cloud Cost Architecture  
**Target Region:** `asia-south1` (Mumbai)  

---

## 1. Executive Unit Economics

BrainWise operates on a **High-Gross-Margin Serverless Architecture** that dynamically scales to zero during idle periods and incurs compute costs strictly in proportion to active user demand.

Because BrainWise strictly excludes video generation, high-cost GPU clusters, FFmpeg transcoding servers, and expensive video rendering pipelines are completely avoided. Marketing collateral is rendered as deterministic vector SVG, static multi-frame carousels, and high-DPI print PDFs, keeping AI generation costs to text/vision token levels.

### Target Gross Margin Summary
- **Average Revenue Per User (ARPU):** ₹2,499 / month (~$30 USD)
- **Average Direct Cost of Goods Sold (COGS) Per User:** ₹142 / month (~$1.70 USD)
- **Blended Gross Margin:** **> 94.3%**

---

## 2. Multi-Tier Operational Cost Breakdown

### Tier 1: Initial Public Launch (0 – 100 Active Workspaces)
*Workload Profile: 100 workspaces, ~200,000 monthly page views, ~25,000 AI generations.*

| Service Component | Monthly Volume | Unit Rate (asia-south1) | Estimated Monthly Cost (USD) | Estimated Monthly Cost (INR) |
| :--- | :--- | :--- | :--- | :--- |
| **Cloud Run Backend** | 1 instance warm base + traffic burst (approx 120 vCPU-hrs) | $0.000024 / vCPU-sec | $18.50 | ₹1,535 |
| **Cloud Firestore** | 1.2M reads, 400K writes, 5 GB storage | $0.06 / 100K reads | $4.20 | ₹350 |
| **Cloud Storage** | 25 GB storage, 50 GB egress | $0.02 / GB storage | $2.50 | ₹205 |
| **Firebase Hosting & CDN** | 100 GB bandwidth | Included in free tier | $0.00 | ₹0 |
| **Secret Manager & Tasks** | 5 secrets, 50K task invocations | $0.06 / secret | $0.80 | ₹65 |
| **Google Gemini AI API** | ~35M tokens (Gemini 2.5 Flash @ $0.075/M tokens) | $0.075 / 1M prompt tokens | $12.50 | ₹1,040 |
| **Cashfree Payment Gateway** | ~₹250,000 volume @ blended 1.2% fee | Transaction fee | $36.00 | ₹3,000 |
| **Total Tier 1 Operational Cost** | — | — | **$74.50 / month** | **₹6,195 / month** |
| **Monthly Revenue (100 users @ ₹2,499)** | — | — | **$3,010 / month** | **₹249,900 / month** |
| **Tier 1 Gross Margin** | — | — | **97.5%** | **97.5%** |

---

### Tier 2: Growth Stage (100 – 1,000 Active Workspaces)
*Workload Profile: 1,000 workspaces, ~2M monthly page views, ~300,000 AI generations.*

| Service Component | Monthly Volume | Estimated Monthly Cost (USD) | Estimated Monthly Cost (INR) |
| :--- | :--- | :--- | :--- |
| **Cloud Run Backend** | 2–5 auto-scaling instances (approx 1,200 vCPU-hrs) | $95.00 | ₹7,885 |
| **Cloud Firestore** | 15M reads, 4M writes, 45 GB storage | $38.50 | ₹3,200 |
| **Cloud Storage** | 250 GB storage, 500 GB egress | $22.00 | ₹1,825 |
| **Firebase Hosting & CDN** | 1,000 GB bandwidth | $15.00 | ₹1,245 |
| **Google Cloud Monitoring** | Metrics, custom logs, alerting sinks | $12.00 | ₹1,000 |
| **Google Gemini AI API** | ~400M tokens | $145.00 | ₹12,035 |
| **Cashfree Payment Gateway** | ~₹2,499,000 volume @ blended 1.2% fee | $360.00 | ₹29,880 |
| **Total Tier 2 Operational Cost** | — | **$687.50 / month** | **₹57,070 / month** |
| **Monthly Revenue (1,000 users @ ₹2,499)** | — | **$30,100 / month** | **₹2,499,000 / month** |
| **Tier 2 Gross Margin** | — | **97.7%** | **97.7%** |

---

### Tier 3: Expansion Stage (1,000 – 10,000 Active Workspaces)
*Workload Profile: 10,000 workspaces, ~25M monthly page views, ~3.5M AI generations.*

| Service Component | Monthly Volume | Estimated Monthly Cost (USD) | Estimated Monthly Cost (INR) |
| :--- | :--- | :--- | :--- |
| **Cloud Run Backend** | 10–25 auto-scaling instances (concurrency 80) | $680.00 | ₹56,440 |
| **Cloud Firestore** | 180M reads, 45M writes, 500 GB storage | $380.00 | ₹31,540 |
| **Cloud Storage** | 2.5 TB storage, 5 TB egress | $185.00 | ₹15,350 |
| **Firebase Hosting & CDN** | 10 TB global CDN bandwidth | $120.00 | ₹9,960 |
| **Monitoring & SRE Suite** | High-volume logs, trace, metrics | $85.00 | ₹7,055 |
| **Google Gemini AI API** | ~4.2 Billion tokens | $1,450.00 | ₹120,350 |
| **Cashfree Payment Gateway** | ~₹24,990,000 volume @ negotiated 1.0% fee | $3,010.00 | ₹249,900 |
| **Total Tier 3 Operational Cost** | — | **$5,510.00 / month** | **₹490,595 / month** |
| **Monthly Revenue (10,000 users @ ₹2,499)** | — | **$301,000 / month** | **₹24,990,000 / month** |
| **Tier 3 Gross Margin** | — | **98.0%** | **98.0%** |

---

## 3. Cost Governance & Guardrails

1. **Strict Zero-Video Policy Impact:**
   Elimination of video pipelines prevents monthly GPU compute costs of ~$12,000 – $45,000 at Tier 3 scale.
2. **Two-Phase Credit Reservation:**
   Unfulfilled AI requests immediately release reservations, guaranteeing zero billing leaks and zero unmetered API calls.
3. **GCP Budget Alerts:**
   Configured at $250, $750, and $2,000 with automated notifications dispatched to engineering leads.
