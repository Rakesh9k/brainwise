# BrainWise Phase 2 — 15: Feature Prioritization & MVP Release Scope

**Document ID:** `docs/phase-2/15-feature-prioritization-and-release-scope.md`  
**Version:** `2.0.0`  
**Date:** November 19, 2026  
**Auditor:** Chief Product Officer (CPO) & Senior SaaS Product Manager  
**Status:** APPROVED & BINDING  

---

## 1. Prioritization Framework & Release Philosophy

To prevent overengineering and ensure rapid commercial validation, all features across the 14 departments are categorized using a strict 4-tier prioritization framework:

- **P0 — Essential Launch Requirements (MVP / GA):** The minimum coherent, production-ready product required to acquire, onboard, and retain paying customers with high satisfaction.
- **P1 — Important Capabilities (Fast-Follow):** High-leverage features that strengthen retention and automation, scheduled for rollout within 60 days of GA.
- **P2 — Advanced Capabilities (Scale Stage):** Third-party data syncs and agency workflows introduced after achieving product-market fit.
- **P3 — Future Possibilities:** Exploratory concepts that must not distract from core engineering execution.

---

## 2. Master Feature Prioritization Matrix

```
┌────────────────────────────────────────────────────────────────────────┐
│                        BRAINWISE RELEASE PHASING                       │
├─────────────────────┬──────────────────┬───────────────┬───────────────┤
│ Tier                │ Focus            │ Department    │ Delivery SLA  │
├─────────────────────┼──────────────────┼───────────────┼───────────────┤
│ P0: Core MVP        │ Truth & Strategy │ Depts 1–6, 8, │ Launch Day    │
│                     │ Brand Collateral │ 9, 11, 12, 13 │ (Week 1–8)    │
├─────────────────────┼──────────────────┼───────────────┼───────────────┤
│ P1: Fast-Follow     │ Direct Publishing│ Depts 1, 7, 14│ Post-Launch   │
│                     │ Team Invites     │               │ (Week 9–14)   │
├─────────────────────┼──────────────────┼───────────────┼───────────────┤
│ P2: Scale Enablers  │ E-comm Sync      │ Depts 7, 8, 12│ Quarter 2     │
│                     │ Automated Alerts │               │ (Week 15–24)  │
├─────────────────────┼──────────────────┼───────────────┼───────────────┤
│ P3: Future Horizon  │ Native Mobile    │ Multi-Channel │ Deferred      │
│                     │ Multilingual     │               │ (Year 2)      │
└─────────────────────┴──────────────────┴───────────────┴───────────────┘
```

### 2.1 Detailed Feature Tiering

| Feature Name | Feature ID | Department | Priority Tier | Justification & Rationale |
|---|---|---|---|---|
| **Production Auth & JWT Sessions** | `FEAT-AUTH-001` | Dept 1: Account | **P0** | Cannot launch a commercial SaaS without secure, persistent user accounts. |
| **Document Onboarding Ingestion** | `FEAT-ONB-001` | Dept 2: Onboarding | **P0** | Essential for fast time-to-value; extracts facts from pitch decks in <3 seconds. |
| **Persistent Business Brain Store** | `FEAT-BRN-001` | Dept 3: Brain | **P0** | Core architectural differentiator; prevents LLM amnesia and repetitive re-prompting. |
| **Fact Provenance Tagging** | `FEAT-BRN-002` | Dept 3: Brain | **P0** | Distinguishes founder ground truth from AI inference; builds customer trust. |
| **Brand Identity & Static Collateral**| `FEAT-BRD-001`| Dept 4: Brand Studio| **P0** | Immediate tangible value: generates print-ready cards, flyers, and labels. |
| **30/60/90-Day Growth Roadmap** | `FEAT-STR-001` | Dept 5: Strategy | **P0** | Solves strategic paralysis; provides founder daily focus sprints. |
| **Static Social Carousel Studio** | `FEAT-CNT-001` | Dept 6: Content | **P0** | Top weekly marketing use-case: ready-to-post swipeable carousel packs. |
| **Competitor Teardown & Gap Matrix**| `FEAT-CMP-001` | Dept 8: Competitor | **P0** | Critical intelligence: reveals rival pricing and strategic counter-moves. |
| **Parametric Market Sizing Dossier**| `FEAT-RES-001` | Dept 9: Research | **P0** | High perceived value for founders validating new initiatives and pitching investors. |
| **Contextual Marketing Advisor** | `FEAT-ADV-001` | Dept 10: Advisor | **P0** | Proactive intelligence: recommends exact marketing actions on login. |
| **Marketing Calendar & Tasks** | `FEAT-CAL-001` | Dept 11: Calendar | **P0** | Bridges strategy and execution; unites campaigns and daily checklists. |
| **Executive Performance Dashboard** | `FEAT-ANL-001` | Dept 12: Analytics | **P0** | Essential for ROI visibility; print-ready executive PDF report export. |
| **Credit Wallet & Cashfree Checkout**| `FEAT-BIL-001` | Dept 13: Billing | **P0** | Commercial foundation: handles UPI/Card payments and meters AI usage. |
| **Deterministic Truth Check** | `FEAT-TRU-001` | Cross-Cutting | **P0** | Protects brand reputation by eliminating price hallucinations and claim errors. |
| **Anti-Fatigue Strategic Memory** | `FEAT-MEM-001` | Cross-Cutting | **P0** | Eliminates repetitive copy and ensures fresh creative angles. |
| **Meta Graph API Scheduled Publish** | `FEAT-SOC-001` | Dept 7: Social | **P1** | High convenience; deferred slightly pending Meta App Review approval. |
| **LinkedIn Direct Publishing** | `FEAT-SOC-002` | Dept 7: Social | **P1** | Important for B2B/professional brands; requires LinkedIn Developer App review. |
| **Multi-User Team Invitations** | `FEAT-AUTH-002` | Dept 1: Account | **P1** | Needed when businesses invite external freelancers or designers. |
| **Super-Admin Telemetry Dashboard** | `FEAT-ADM-001` | Dept 14: Admin | **P1** | Essential for internal FinOps, SRE monitoring, and customer support. |
| **WhatsApp Lead Attribution Links** | `FEAT-EXE-001` | Dept 6: Content | **P2** | Generates trackable pre-filled `https://wa.me/` links for direct chat leads. |
| **Automated Competitor Alert Push** | `FEAT-CMP-002` | Dept 8: Competitor | **P2** | Real-time email alert when a rival updates pricing or announces a promo. |
| **E-Commerce Webhook Sync (Shopify)**| `FEAT-ANL-002` | Dept 12: Analytics | **P2** | Automatically ingests live D2C order velocity into the analytics funnel. |
| **White-Label Agency Exports** | `FEAT-ANL-003` | Dept 12: Analytics | **P2** | Agency tier feature: removes BrainWise branding from executive PDF reports. |
| **Capacitor Mobile Application** | `FEAT-MOB-001` | Mobile Shell | **P3** | Future native app store wrapper for iOS and Android. |

---

## 3. The Minimum Viable Product (MVP) Definition

The **BrainWise MVP** is strictly scoped to the **15 P0 features**.

### What the MVP Delivers:
A founder can sign up $\to$ upload a pitch deck $\to$ review their confirmed Business Brain $\to$ generate a defensible TAM/SAM/SOM market sizing dossier $\to$ lock their visual brand tokens and download print-ready collateral $\to$ synthesize high-converting static carousels with guaranteed 100% price truth $\to$ track competitors on a 2D gap matrix $\to$ execute daily 30-day growth sprints $\to$ pay via Cashfree UPI/Card.

### What is Explicitly Excluded from MVP:
- Auto-publishing to social channels (users copy caption and download slides for manual posting).
- Video generation of any kind.
- Live Shopify/Stripe revenue sync webhooks.
- Multi-user RBAC beyond Owner/Admin.
