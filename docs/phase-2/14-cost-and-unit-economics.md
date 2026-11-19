# BrainWise Phase 2 — 14: AI Cost Modeling & SaaS Unit Economics

**Document ID:** `docs/phase-2/14-cost-and-unit-economics.md`  
**Version:** `2.0.0`  
**Date:** November 19, 2026  
**Auditor:** FinOps Architect & Chief Product Officer (CPO)  
**Status:** APPROVED & BINDING  

---

## 1. Executive Summary

This document establishes the financial model, cloud infrastructure costs, and customer unit economics for BrainWise. 

By grounding the platform in **Google Gemini 2.5 Flash** for high-speed structured text/SVG generation, reserving **Gemini 2.5 Pro** strictly for deep reasoning, and **completely excluding expensive GPU video models**, BrainWise achieves an extraordinary **gross margin exceeding 95%** across all subscription tiers.

---

## 2. Infrastructure & Provider Unit Cost Baseline

| Cost Category | Service Provider | Billable Metric | Unit Cost (USD) |
|---|---|---|---|
| **High-Speed Text & SVG** | Google Gemini 2.5 Flash | Input / Output Tokens | $0.075 / 1M in · $0.30 / 1M out |
| **Deep Reasoning Strategy** | Google Gemini 2.5 Pro | Input / Output Tokens | $1.25 / 1M in · $5.00 / 1M out |
| **Static Visual Textures** | Google Imagen 3 | Per Generated Image | $0.030 per image |
| **Competitor Research** | Tavily Search API | Per Web Domain Query | $0.005 per query |
| **Document Ingestion** | Gemini 2.5 Flash Multimodal| Per 15-Page Pitch Deck | ~$0.0015 per document |
| **Cloud Database Reads** | Google Cloud Firestore | Per 100,000 Document Reads | $0.06 |
| **Cloud Database Writes** | Google Cloud Firestore | Per 100,000 Document Writes | $0.18 |
| **Cloud Object Storage** | Google Cloud Storage | Storage per GB / month | $0.02 |
| **Serverless Compute** | Firebase Functions Gen 2 | Invocations & vCPU-sec | $0.40 / 1M inv (2M free/mo) |
| **Transactional Email** | Resend | Emails sent | $0.0004 / email ($20 for 50k) |
| **Payment Gateway** | Cashfree Payments | Payment Transaction Fee | 1.95% on domestic INR volume |
| **AI Video Production** | **NONE (EXCLUDED)** | **Zero Video GPU Cost** | **$0.00 (EXCLUDED)** |

---

## 3. Financial Projections Across Customer Cohorts

```
┌────────────────────────────────────────────────────────────────────────┐
│               MONTHLY COST BREAKDOWN ACROSS CUSTOMER COHORTS           │
├─────────────────────┬──────────────┬──────────────┬────────────────────┤
│ Cost Driver         │ 100 Tenants  │ 1,000 Tenants│ 5,000 Tenants      │
├─────────────────────┼──────────────┼──────────────┼────────────────────┤
│ Blended Sub Revenue │ $9,800 / mo  │ $98,000 / mo │ $490,000 / mo      │
├─────────────────────┼──────────────┼──────────────┼────────────────────┤
│ Text AI (Gemini)    │ $12.50       │ $138.00      │ $740.00            │
│ Image AI (Imagen 3) │ $18.00       │ $195.00      │ $980.00            │
│ Search API (Tavily) │ $25.00       │ $260.00      │ $1,350.00          │
│ Database (Firestore)│ $4.50        │ $48.00       │ $260.00            │
│ Storage (GCS)       │ $1.20        │ $14.00       │ $85.00             │
│ Serverless Compute  │ $0.00 (Free) │ $28.00       │ $160.00            │
│ Email Delivery      │ $0.00 (Free) │ $20.00       │ $65.00             │
│ Payment Processing  │ $191.10      │ $1,911.00    │ $9,555.00          │
├─────────────────────┼──────────────┼──────────────┼────────────────────┤
│ TOTAL DIRECT COGS   │ $252.30      │ $2,614.00    │ $13,195.00         │
├─────────────────────┼──────────────┼──────────────┼────────────────────┤
│ GROSS PROFIT        │ $9,547.70    │ $95,386.00   │ $476,805.00        │
│ GROSS MARGIN %      │ **97.4%**    │ **97.3%**    │ **97.3%**          │
└─────────────────────┴──────────────┴──────────────┴────────────────────┘
```

---

## 4. Per-Customer Unit Economics

Assuming an average customer on the **Growth Pro Plan ($149 / month)** consuming their full **800 monthly credits**:

```
Customer Monthly Subscription Revenue:                    $149.00
-----------------------------------------------------------------
Direct AI Costs:
  • 40 Social Carousels (Gemini Flash @ 4 credits):       $ 0.032
  • 20 Brand Collateral SVGs (Gemini Flash @ 5 credits):   $ 0.016
  • 10 Competitor Scans (Tavily + Gemini @ 3 credits):    $ 0.056
  • 5 Market Dossiers (Gemini Pro @ 8 credits):           $ 0.095
  • 2 Strategic Roadmaps (Gemini Pro @ 10 credits):       $ 0.041
  • 10 Static Background Textures (Imagen 3):             $ 0.300
Direct Infrastructure Costs:
  • Firestore Reads/Writes & GCS asset storage:           $ 0.080
  • Serverless Function Invocations:                      $ 0.020
  • Cashfree Payment Processing Fee (1.95%):              $ 2.905
-----------------------------------------------------------------
TOTAL DIRECT COST OF GOODS SOLD (COGS):                   $ 3.545
MONTHLY NET GROSS PROFIT PER SUBSCRIBER:                  $145.45
CUSTOMER GROSS MARGIN:                                     97.6%
```

---

## 5. FinOps Optimization Strategies

1. **Strict Capability Routing:** The AI Orchestrator strictly forbids routing routine copywriting or social carousels to Gemini 2.5 Pro. Pro is unlocked only for multi-step reasoning (TAM/SAM/SOM market sizing and 90-day roadmaps).
2. **SVG Vector Generation Over Diffusion:** Collateral cards, packaging labels, and carousel motifs are generated as SVG code by Gemini Flash rather than rendering heavy raster diffusion images, reducing compute cost by over **95% per graphic**.
3. **Prompt Delimitation & Token Pruning:** Unconfirmed AI facts and raw documents are pruned before prompt assembly; only relevant Business Brain fields are passed to minimize prompt token count.
4. **Credit Safeguard Pre-Verification:** If an account lacks sufficient credits, the request halts at the API gateway before executing any model calls, preventing uncollectible provider costs.
