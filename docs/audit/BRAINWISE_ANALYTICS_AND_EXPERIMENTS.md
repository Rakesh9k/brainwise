# BRAINWISE — PRODUCT METRICS, EVENT INSTRUMENTATION & EXPERIMENTATION ROADMAP
**Document ID:** `docs/audit/BRAINWISE_ANALYTICS_AND_EXPERIMENTS.md`  
**Audit Date:** November 2026  
**Auditor:** Multidisciplinary Psychological Product & Systems Audit Board  
**Target Platform:** BrainWise AI Business Intelligence & Growth Engine

---

## 1. Master Product Metrics Framework

To transition BrainWise from an engineering prototype to a data-driven enterprise product, six metric categories must be tracked with precise event instrumentation. 

*Note: All benchmark targets are initial directional hypotheses to be calibrated against BrainWise’s empirical production baseline.*

---

### Category 1: Acquisition Metrics
| Metric Name | Formal Definition | Calculation Formula | Instrumentation Event & Location | Reporting Frequency | Target Hypothesis |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Landing Page Conversion Rate** | Percentage of unique landing page visitors who initiate registration or demo exploration. | $\frac{\text{Unique Signups + Demo Launches}}{\text{Unique Landing Visitors}} \times 100$ | `landing_cta_clicked`, `demo_launched` (`LandingPage.tsx`) | Daily | $\ge 8.5\%$ |
| **Idea Sandbox Conversion Rate** | Percentage of visitors who input an idea on the landing page and complete signup. | $\frac{\text{Signups from Sandbox}}{\text{Unique Sandbox Submissions}} \times 100$ | `landing_sandbox_submitted` (`LandingPage.tsx`) | Weekly | $\ge 14.0\%$ |
| **Visitor-to-Paid Lead Velocity** | Average hours elapsed from initial site visit to account creation. | $\text{Median}(T_{\text{signup}} - T_{\text{first\_visit}})$ | Cookie timestamp delta | Weekly | $< 48\text{ hrs}$ |

---

### Category 2: Activation Metrics
| Metric Name | Formal Definition | Calculation Formula | Instrumentation Event & Location | Reporting Frequency | Target Hypothesis |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Onboarding Completion Rate** | Percentage of registered users who reach and approve Business Brain (Stage 5). | $\frac{\text{Completed Onboardings}}{\text{Initiated Onboardings}} \times 100$ | `onboarding_started`, `onboarding_approved` (`OnboardingPage.tsx`) | Daily | $\ge 68.0\%$ |
| **Time to First Value (TTV)** | Elapsed minutes from registration to the first generated asset or research dossier. | $\text{Median}(T_{\text{first\_deliverable}} - T_{\text{register}})$ | `auth_registered`, `deliverable_created` | Weekly | $< 4\text{ mins}$ |
| **Core Activation Rate** | Users who complete Onboarding, accept 1 Sprint Task, and generate 1 Brand/Research asset in Session 1. | $\frac{\text{Activated Users}}{\text{New Registrations}} \times 100$ | Session composite event (`session_activated`) | Weekly | $\ge 45.0\%$ |

---

### Category 3: Engagement Metrics
| Metric Name | Formal Definition | Calculation Formula | Instrumentation Event & Location | Reporting Frequency | Target Hypothesis |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **WAU / MAU Stickiness Ratio** | Ratio of weekly active workspaces to monthly active workspaces. | $\frac{\text{Active Workspaces (7-day)}}{\text{Active Workspaces (30-day)}}$ | API gateway bearer token requests | Weekly | $\ge 40.0\%$ |
| **Recommendation Acceptance Rate** | Percentage of AI recommendations accepted into the Daily Focus Sprint. | $\frac{\text{Accepted Recommendations}}{\text{Total Generated Recommendations}} \times 100$ | `recommendation_accepted` (`DashboardPage.tsx`) | Weekly | $\ge 35.0\%$ |
| **Sprint Task Completion Velocity**| Percentage of focus sprint tasks marked complete within their scheduled due date. | $\frac{\text{Completed Tasks}}{\text{Total Sprint Tasks}} \times 100$ | `task_completed` (`DashboardPage.tsx`) | Weekly | $\ge 60.0\%$ |

---

### Category 4: Retention Metrics
| Metric Name | Formal Definition | Calculation Formula | Instrumentation Event & Location | Reporting Frequency | Target Hypothesis |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Day 1 Retention** | Percentage of activated users returning within 24 hours of first session. | $\frac{\text{Active Users on Day 1}}{\text{Cohort Signups on Day 0}} \times 100$ | Client session init (`main.tsx`) | Cohort / Weekly | $\ge 50.0\%$ |
| **Day 7 Retention** | Percentage of activated users returning between Day 6 and Day 8. | $\frac{\text{Active Users on Day 7}}{\text{Cohort Signups on Day 0}} \times 100$ | Client session init (`main.tsx`) | Cohort / Weekly | $\ge 35.0\%$ |
| **Day 30 Retention** | Percentage of activated users active in the 4th week post-signup. | $\frac{\text{Active Users on Day 30}}{\text{Cohort Signups on Day 0}} \times 100$ | Client session init (`main.tsx`) | Cohort / Monthly | $\ge 24.0\%$ |
| **Monthly Subscription Churn** | Percentage of paid workspaces that cancel or fail renewal within 30 days. | $\frac{\text{Cancelled Subscriptions}}{\text{Active Subscriptions at Start}} \times 100$| `subscription_cancelled` (`billingRoutes.ts`) | Monthly | $< 4.5\%$ |

---

### Category 5: Monetization Metrics
| Metric Name | Formal Definition | Calculation Formula | Instrumentation Event & Location | Reporting Frequency | Target Hypothesis |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Free-to-Paid Conversion Rate** | Percentage of free workspaces that upgrade to Starter, Pro, or Enterprise within 30 days. | $\frac{\text{Paid Upgrades}}{\text{Free Workspaces}} \times 100$ | `payment_order_settled` (`billingWebhookRoutes.ts`) | Monthly | $\ge 6.5\%$ |
| **Credit Pack Top-Up Rate** | Percentage of paid subscribers who purchase supplemental credit packs. | $\frac{\text{Subscribers Purchasing Packs}}{\text{Total Paid Subscribers}} \times 100$ | `credit_pack_purchased` (`creditEngine.ts`) | Monthly | $\ge 18.0\%$ |
| **Average Revenue Per User (ARPU)**| Monthly recurring revenue divided by total active paid workspaces. | $\frac{\text{Total Monthly MRR}}{\text{Active Paid Workspaces}}$ | Firestore subscription ledger | Monthly | $\ge \text{₹4,800} / \$60$ |
| **Refund / Dispute Rate** | Percentage of Cashfree transactions resulting in refunds or payment disputes. | $\frac{\text{Refund Transactions}}{\text{Total Settled Transactions}} \times 100$ | `refund_processed` (`refundService.ts`) | Monthly | $< 0.8\%$ |

---

### Category 6: User Experience & Psychological Health Metrics
| Metric Name | Formal Definition | Calculation Formula | Instrumentation Event & Location | Reporting Frequency | Target Hypothesis |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Customer Effort Score (CES)** | 1-question post-workflow micro-poll: *"How easy was it to complete your task?"* (1–7). | Average of rating responses | In-app satisfaction toast modal | Bi-weekly | $\ge 6.2 / 7$ |
| **AI Trust Index** | Ratio of AI inferred facts confirmed vs rejected in the Verification Queue. | $\frac{\text{Confirmed Facts}}{\text{Confirmed Facts + Rejected Facts}} \times 100$| `fact_confirmed`, `fact_rejected` (`BusinessBrainPage.tsx`) | Monthly | $\ge 82.0\%$ |
| **Cognitive Fluency Rating** | Usability rating evaluating visual clarity and lack of confusion across departments. | Quarterly 5-question user assessment | In-app feedback dialog | Quarterly | $\ge 85 / 100$ |

---

## 2. Event Instrumentation Schema Specification

Every key action across the client must emit a strongly typed telemetry event structured as follows:

```typescript
interface BrainWiseTelemetryEvent {
  eventId: string;             // UUID v4
  timestamp: string;           // ISO 8601
  workspaceId: string;         // e.g. "ws_solstice_craft"
  userId: string;              // e.g. "usr_vishesh_kakar"
  eventName: string;           // e.g. "task_completed"
  department: string;          // e.g. "Growth Director"
  properties: Record<string, any>;
  sessionDurationSec: number;
}
```

### Critical Missing Events to Instrument in Codebase:
1. `onboarding_url_entered` (`OnboardingPage.tsx`)
2. `showcase_stage_toggled` (`LandingPage.tsx`)
3. `sprint_victory_modal_rendered` (`DashboardPage.tsx`)
4. `citation_popover_opened` (`IdeaIntelligencePage.tsx`)
5. `checkout_abandoned_modal_rendered` (`BillingDashboardView.tsx`)
6. `master_brain_dossier_exported` (`BusinessBrainPage.tsx`)

---

## 3. High-Priority Experimentation Roadmap (A/B Test Protocols)

---

### Experiment 1: Automated URL Scrape vs. Manual Onboarding Form
- **Hypothesis:** Pre-populating Stage 2 and Stage 3 of onboarding from the user’s website URL will reduce cognitive strain and typing effort, increasing onboarding completion by +35%.
- **Control Experience (A):** Existing 5-stage wizard requiring manual text entry across 3 free-text fields.
- **Proposed Alternative (B):** Entering a URL in Stage 1 displays a 3-second animated pulse while scraping meta tags and pre-filling offerings and audience descriptions with 1-click confirmation pills.
- **Primary Success Metric:** Onboarding Completion Rate (Step 1 $\to$ Step 5 approval).
- **Secondary Metrics:** Time to Complete Onboarding, Day 1 Return Rate.
- **Guardrail Metrics:** Fact Rejection Rate in Stage 5 (must not exceed 20%).
- **Sample & Duration:** 500 new signups split 50/50 over 14 days.
- **Decision Criteria:** If Alternative B achieves a statistically significant lift ($p < 0.05$) in completion rate of $\ge 20\%$ with acceptable fact accuracy, roll out to 100% of traffic.

---

### Experiment 2: Monday Morning Executive Digest (External Habit Trigger)
- **Hypothesis:** Dispatching an automated weekly email digest every Monday morning at 08:30 AM containing 1 competitor shift and 3 suggested sprint tasks will create a recurring external cue, increasing WAU retention by +40%.
- **Control Experience (A):** Zero automated external notifications; users must remember to navigate to `app.brainwise.com` on their own.
- **Proposed Alternative (B):** Automated Monday 08:30 AM email digest featuring: (1) Top rival move, (2) Top 3 sprint priorities, (3) 1-click button opening the Monday focus sprint.
- **Primary Success Metric:** Week 4 Workspace Retention (WAU).
- **Secondary Metrics:** Email Open Rate, Click-to-Sprint Rate, Sprint Task Completion Rate.
- **Guardrail Metrics:** Email Unsubscribe / Spam Complaint Rate ($< 0.5\%$).
- **Sample & Duration:** 800 active workspaces split 50/50 over 30 days.
- **Decision Criteria:** If Alternative B increases Week 4 retention by $\ge 25\%$, graduate the weekly digest into a core platform feature and add Slack webhook support.

---

### Experiment 3: Post-Payment "Unlocked Power Tour" vs. Static Settings Redirect
- **Hypothesis:** Celebrating successful Cashfree payment with an animated "Executive Workspace Unlocked" modal and immediate routing into Growth Director will mitigate buyer’s remorse and accelerate feature adoption.
- **Control Experience (A):** Cashfree checkout returns user to the Settings Billing tab with a simple 3-second toast alert.
- **Proposed Alternative (B):** Checkout return displays a full-screen celebration modal with newly unlocked capabilities and a prominent button: *"Launch Your 30-Day Growth Roadmap Now"*.
- **Primary Success Metric:** First-Hour Feature Adoption Rate (generating a roadmap or deep competitor report).
- **Secondary Metrics:** 7-Day Active Session Count, Support Ticket Inquiries regarding billing.
- **Guardrail Metrics:** Payment Dispute / Refund Request Rate.
- **Sample & Duration:** 200 upgraded workspaces split 50/50 over 45 days.
- **Decision Criteria:** If Alternative B increases first-hour feature usage by $\ge 30\%$, adopt as the permanent checkout return protocol.

---

## 4. Qualitative User Research Protocol: 10 Core Diagnostic Interview Questions

To validate psychological sentiment and uncover latent friction that quantitative analytics cannot capture, the product team must conduct semi-structured user interviews with 15 active founders and 15 churned users using these 10 diagnostic questions:

1. **First Impression & Mental Model:** *"When you first opened BrainWise, what did you think it was going to do for you, and how long did it take before you understood what the 'Business Brain' actually meant?"*
2. **Perceived Core Value:** *"Think back to the last time BrainWise gave you an insight or asset that genuinely impressed you. What was it, and what would you have done if BrainWise didn’t exist?"*
3. **Cognitive Friction & Confusion:** *"Was there any moment where you looked at a screen or report and felt completely overwhelmed or unsure of what to do next? What were you trying to achieve?"*
4. **Routine & Habit Triggers:** *"What specifically causes you to open BrainWise during your work week? Is it a scheduled routine, a reminder, or an ad-hoc impulse when a problem arises?"*
5. **Ignored Features:** *"Which department or tab in BrainWise have you looked at once and never opened again? Why does it feel irrelevant to your day-to-day operations?"*
6. **Hallucination & Trust:** *"Have you ever caught BrainWise generating an assumption, price, or recommendation that you knew was inaccurate? How did that affect your willingness to rely on it?"*
7. **Willingness to Pay:** *"If BrainWise announced tomorrow that it was doubling its monthly price, what specific capability would justify you continuing to pay without hesitation?"*
8. **Churn & Cancellation Drivers:** *"If you were to cancel your subscription next month, what would be the honest reason: too expensive, lack of time, lack of fresh information, or something else?"*
9. **Advocacy & Social Currency:** *"Have you ever mentioned or shown BrainWise to a co-founder, investor, or peer? If yes, what specific screen or export did you show them?"*
10. **The Indispensability Test (Sean Ellis):** *"How would you feel if you could no longer use BrainWise tomorrow: Very disappointed, somewhat disappointed, or not disappointed? (And why?)"*
