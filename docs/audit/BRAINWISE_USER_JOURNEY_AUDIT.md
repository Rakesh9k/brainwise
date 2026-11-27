# BRAINWISE — COMPLETE USER JOURNEY PSYCHOLOGICAL AUDIT
**Document ID:** `docs/audit/BRAINWISE_USER_JOURNEY_AUDIT.md`  
**Audit Date:** November 2026  
**Auditor:** Multidisciplinary Psychological Product & Systems Audit Board  
**Scope:** Complete 15-Stage Lifecycle Audit (Desktop & Mobile)  
**Target Platform:** BrainWise AI Business Intelligence & Growth Engine

---

## 1. Executive Journey Framework

The user journey through BrainWise represents an ambitious transition from a curious, skeptical visitor into a confident, strategically empowered operator. Business intelligence and growth software inherently suffers from high abandonment because founders and marketers are time-starved, inundated with generic AI tools, and deeply protective of their capital and reputation.

To evaluate whether BrainWise guides users through this gauntlet without triggering cognitive burnout or skepticism, each of the 15 distinct lifecycle stages has been audited across psychological state, cognitive friction, emotional resonance, and underlying behavioral principles.

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                         BRAINWISE 15-STAGE LIFECYCLE MAP                         │
├─────────────┬─────────────┬─────────────┬──────────────┬──────────────┬──────────┤
│ 1.Discovery │ 2.Landing   │ 3.Signup    │ 4.Onboarding │ 5.First Val. │ 6.Dash   │
├─────────────┼─────────────┼─────────────┼──────────────┼──────────────┼──────────┤
│ 7.Features  │ 8.AI Trust  │ 9.Repeated  │ 10.Upgrade   │ 11.Payment   │ 12.Post  │
├─────────────┼─────────────┼─────────────┼──────────────┼──────────────┼──────────┤
│ 13.Loyalty  │ 14.Churn/Cancel           │ 15.Advocacy / Viral Referral           │
└─────────────┴─────────────┴─────────────┴──────────────┴──────────────┴──────────┘
```

---

## 2. Exhaustive Stage-by-Stage Psychological Audit

### Stage 1: Discovery (Attention, Positioning & Curiosity)
- **Existing Experience:** The user encounters BrainWise via organic founder networks, social media commentary, LinkedIn articles, or search queries regarding "AI marketing agency alternative" or "business validation framework".
- **User's Psychological State:** Skeptical, fatigued by AI hype, expecting yet another ChatGPT wrapper or automated SEO spam generator. Guard is up; attention span is under 5 seconds.
- **Friction Points:** If initial discovery collateral focuses on generic "AI growth", the user assumes it is a low-quality prompt generator. The unique value of a "Persistent Business Brain" requires precise articulation.
- **Emotional Response:** Cautious intrigue mixed with cynicism.
- **Psychological Principles Involved:** Curiosity Gap (Information Gap Theory), Framing Effect, Cognitive Heuristics.
- **Desktop vs. Mobile:** Discovery occurs predominantly on mobile (LinkedIn/Twitter feeds), making immediate clarity on a 390px viewport paramount.
- **Stage Score:** **7.0 / 10**
- **Recommended Improvements:** Emphasize the core contrast in discovery copy: *"Stop renting disconnected AI copywriters. Install a persistent strategic intelligence partner that remembers your business, defends your margins, and tracks your rivals."*

---

### Stage 2: Landing Page (`LandingPage.tsx`)
- **Existing Experience:** Displays a clean, typography-led white and signal orange canvas (`#FFFFFF`, `#171717`, `#FF7417`). Features an interactive device mockup showcasing the 4 major departments, an interactive live Idea Sandbox (`"Test any business concept"`), customer case study toggle, and pricing preview.
- **User's Psychological State:** Scanning for immediate relevance. Asking: *"Can this actually help my specific business, or is it made for generic SaaS companies?"*
- **Friction Points:** The 4-step showcase auto-rotates every 3.4 seconds unless interacted with. Users attempting to read the detailed 15-section dossier card experience visual shifts before digesting the information.
- **Emotional Response:** Visually impressed by the high-craft aesthetic; appreciative of the explicit "No AI Video" transparency statement.
- **Psychological Principles Involved:** First Impression Psychology, Cognitive Ease, Self-Determination (Autonomy in exploring demo vs signup), Social Proof.
- **Desktop vs. Mobile:** Desktop offers a majestic split-screen interactive experience. Mobile condenses the showcase into vertical cards with a collapsible navigation drawer.
- **Stage Score:** **8.5 / 10**
- **Recommended Improvements:** Pause showcase auto-rotation on hover/touch. Add an interactive instant preview in the Idea Sandbox directly on the landing page before requiring any navigation or signup.

---

### Stage 3: Registration & Authentication (`AuthPages.tsx`)
- **Existing Experience:** Clean modal form supporting email/password registration and Google OAuth popup. Includes a prominent alternative: *"Explore Live Demo (Solstice Craft Coffee)"* for instant, zero-friction entry.
- **User's Psychological State:** Reluctant to enter personal information or endure complex email verification workflows before tasting value.
- **Friction Points:** Requires 6-digit email OTP verification before granting access to personal workspace creation. While security-conscious, this introduces a 30–60 second delay where users must leave the tab, check email, and copy digits.
- **Emotional Response:** Mild annoyance at email gating, relieved by the 1-click Google OAuth and "Explore Demo" fallback.
- **Psychological Principles Involved:** Effort Reduction (Friction Theory), Foot-in-the-Door Technique, Endowed Progress Effect.
- **Desktop vs. Mobile:** Google OAuth popup works smoothly on desktop; mobile browsers occasionally block popups or trigger redirect delays.
- **Stage Score:** **7.5 / 10**
- **Recommended Improvements:** Allow progressive onboarding *before* account registration. Let users input their business name and target audience first, synthesize the preliminary brain, and require account creation only to save and approve the profile.

---

### Stage 4: Intelligent Onboarding (`OnboardingPage.tsx`)
- **Existing Experience:** A 5-stage progressive wizard. 
  - Stage 1: Business category, name, website, city.
  - Stage 2: Priorities and target customer persona.
  - Stage 3: Offerings summary, differentiators, business stage.
  - Stage 4: AI Synthesis animation with progress bar (30% $\to$ 60% $\to$ 90%).
  - Stage 5: Business Brain Review & Approval Gate.
- **User's Psychological State:** Engaged, feeling understood as the questions adapt to their specific business category.
- **Friction Points:** Stage 3 contains multiple free-text inputs (`productSummary`, `objectiveDetails`, `customerPainPoints`) which can cause cognitive fatigue if the user is typing on a mobile device.
- **Emotional Response:** Wonder and validation during Stage 4 as the AI synthesizes their disparate inputs into a coherent, highly structured Business Brain.
- **Psychological Principles Involved:** Endowed Progress Effect, IKEA Effect (effort invested builds emotional ownership), Personalization Effect, Peak-End Rule.
- **Desktop vs. Mobile:** Desktop multi-column grid is fast; mobile keyboard popping up across 4 consecutive text fields induces friction.
- **Stage Score:** **8.0 / 10**
- **Recommended Improvements:** Implement URL-scraping in Stage 1. If the user enters `https://mybusiness.com`, automatically scrape the homepage and pre-populate Stage 2 and Stage 3 fields, reducing manual typing by 70%.

---

### Stage 5: Time to First Value & First Session
- **Existing Experience:** Upon approving the Business Brain, the user is landed on `dashboard`. The dashboard immediately surfaces their business name, completeness score (e.g. 78%), their first prioritized action, and 2 AI-discovered opportunities.
- **User's Psychological State:** Expectant. Looking for proof that the onboarding effort produced immediate, tangible intelligence.
- **Friction Points:** The user is confronted with a dense dashboard featuring metrics, trend charts, daily sprint tasks, and market watch events. A first-time user may wonder: *"Where do I click first?"*
- **Emotional Response:** Reassurance from seeing their actual business name and industry terminology accurately mirrored back to them.
- **Psychological Principles Involved:** Peak-End Rule, Time to Value (TTV), Cognitive Load, Goal Gradient Effect.
- **Desktop vs. Mobile:** Desktop displays the dominant "Primary Strategic Priority" card prominently. On mobile, charts push the primary action below the fold.
- **Stage Score:** **7.5 / 10**
- **Recommended Improvements:** Trigger a dedicated "First Value Micro-Journey" modal: *"Here is your first completed deliverable: 1 Competitor White-Space Gap and 1 Custom Brand Wordmark ready for review."*

---

### Stage 6: Dashboard Command Center (`DashboardPage.tsx`)
- **Existing Experience:** Executive Command Center showing the Universal Executive Layer, situation summary, 4 core KPI cards, daily focus sprint with checkboxes, market signals, and sticky strategic notes.
- **User's Psychological State:** Managerial, looking for clarity on priorities and reassurance that nothing critical is slipping through the cracks.
- **Friction Points:** The Growth Trend chart (`ExecutionPulseSeries`) renders simulated baseline data for fresh workspaces, which can confuse users who haven't connected Shopify or Stripe yet.
- **Emotional Response:** Sense of order and control. The tactile checkboxes produce satisfying micro-animations upon task completion.
- **Psychological Principles Involved:** Cognitive Fluency, Goal Gradient, Variable Rewards (discovering new recommendations via "Scan Opportunities").
- **Desktop vs. Mobile:** Mobile responsiveness is clean, but the sticky quick-notes drawer requires vertical scrolling to discover.
- **Stage Score:** **8.0 / 10**
- **Recommended Improvements:** Clearly tag empty or unintegrated analytics charts with: *"Awaiting store sync — Connect Shopify or enter manual baseline."*

---

### Stage 7: Main Feature Engagement (Deep Intelligence Exploration)
- **Existing Experience:** Users navigate into Idea Intelligence (15-section dossiers), Competitive Intelligence (12-dimension teardowns), Brand Studio (SVG logos & carousels), or Growth Director (30-day roadmap).
- **User's Psychological State:** Deep analytical exploration. Assessing whether the depth of analysis matches or exceeds human consultants.
- **Friction Points:** The depth of information in the 15-section dossier is vast. Users can feel overwhelmed unless guided through executive summaries first.
- **Emotional Response:** High delight in Brand Studio when generating clean vector SVG logos and seeing their exact brand color tokens applied to Instagram carousels in real time.
- **Psychological Principles Involved:** Self-Determination (Competence & Autonomy), Effort Reduction, Flow State.
- **Desktop vs. Mobile:** Brand Studio and Collateral editing are significantly superior on desktop screens (1080p+), as mobile screens compress multi-slide carousels into single-slide views.
- **Stage Score:** **8.5 / 10**
- **Recommended Improvements:** Introduce "Executive Summary vs. Deep Forensic View" toggle across all reports to let users control the level of cognitive density.

---

### Stage 8: AI Interaction & Ground-Truth Verification
- **Existing Experience:** Every AI generation references the Business Brain. The Verification Queue flags provisional facts (`AI_INFERRED`) and prompts user review before they become ground truth.
- **User's Psychological State:** Guarded against hallucinations. Demanding to know: *"Did the AI make this up, or is this backed by real data?"*
- **Friction Points:** In conversational research, when the AI searches external sources, network delays can take 4–8 seconds.
- **Emotional Response:** Deep respect for the platform's honesty. When the AI admits data is unavailable or provides conservative TAM/SAM/SOM confidence bounds instead of hallucinating, trust surges.
- **Psychological Principles Involved:** Trust and Psychological Safety, Deterministic Truth Engine, Transparency Heuristic.
- **Desktop vs. Mobile:** Verification badges (`USER_CONFIRMED` in green, `AI_INFERRED` in amber) are easily visible across both form factors.
- **Stage Score:** **9.0 / 10**
- **Recommended Improvements:** Add inline source citations with 1-click domain reputation popovers for all external competitor facts and market size claims.

---

### Stage 9: Repeated Sessions & Habit Formation (Day 2 to Day 7)
- **Existing Experience:** Returning users see updated competitor alerts in Market Watch, newly prioritized tasks in their focus sprint, and refreshed recommendation prompts.
- **User's Psychological State:** Forming an operational routine. Deciding whether BrainWise is a daily/weekly necessity or a tool used once during business setup.
- **Friction Points:** In the absence of live competitor updates or push notifications, users without an active campaign may forget to check the platform daily.
- **Emotional Response:** Satisfaction when checking off daily sprint tasks and watching their Business Intelligence Score increase.
- **Psychological Principles Involved:** Habit Loop (Cue, Routine, Reward), Variable Reinforcement, Endowed Progress.
- **Desktop vs. Mobile:** Lack of native mobile push notifications weakens the external "Cue" mechanism.
- **Stage Score:** **6.5 / 10**
- **Recommended Improvements:** Implement an automated "Monday Morning Executive Briefing" email and WhatsApp/Slack digest summarizing 3 competitor shifts and 3 weekly priority tasks.

---

### Stage 10: Upgrade Experience & Pricing Presentation (`BillingDashboardView.tsx`)
- **Existing Experience:** Free Starter tier provides 150 welcome credits. When credits run low or when attempting to access advanced departments (Growth Director, deep competitor reports), users encounter the Credit Unlock Modal and Billing Dashboard.
- **User's Psychological State:** Cost-benefit evaluation. Calculating: *"Is ₹2,763/mo ($35) or ₹6,243/mo ($79) justified compared to hiring an intern, an agency, or doing it myself?"*
- **Friction Points:** Free tier users who consume their 150 credits on two research dossiers hit a hard gate without seeing a preview of the ongoing weekly value.
- **Emotional Response:** Respect for the transparent credit ledger showing exact credit costs per operation without hidden deductions.
- **Psychological Principles Involved:** Loss Aversion, Value-Price Framing, Anchoring Effect.
- **Desktop vs. Mobile:** Plan comparison cards render cleanly in a 3-column layout on desktop; stacked vertically on mobile.
- **Stage Score:** **7.5 / 10**
- **Recommended Improvements:** Implement "Dual Credit Refill": instead of a hard block, offer a 50-credit reward for completing key Business Brain fields or inviting a team collaborator.

---

### Stage 11: Payment & Checkout Execution (Cashfree PG)
- **Existing Experience:** Selecting a plan or credit pack dispatches `apiClient.createSubscription()` or `createPaymentOrder()`, redirecting seamlessly to the secure Cashfree checkout interface supporting UPI, Credit Cards, Net Banking, and Wallets.
- **User's Psychological State:** Transactional anxiety. Ensuring payment details are secure and recurring subscription terms are clear.
- **Friction Points:** If the user abandons checkout at the Cashfree gateway, returning to BrainWise shows a pending state without a dedicated recovery prompt.
- **Emotional Response:** High confidence in Cashfree's branded, RBI-compliant checkout flow with instant UPI QR codes.
- **Psychological Principles Involved:** Perceived Security, Frictionless Checkout, Commitment and Consistency.
- **Desktop vs. Mobile:** UPI payments on mobile (Google Pay, PhonePe, Paytm) are near-frictionless (single-tap app switch); desktop requires scanning a QR code.
- **Stage Score:** **8.5 / 10**
- **Recommended Improvements:** Add an immediate abandoned-checkout banner with a 1-click retry button and clear customer support link.

---

### Stage 12: Post-Purchase Reinforcement
- **Existing Experience:** Upon successful payment verification, the system clears the `order_id` parameter, reloads the billing dashboard, credits the account, and displays a celebration toast: *"Payment verified successfully! Your subscription and credits are now active."*
- **User's Psychological State:** Seeking confirmation that they made the right financial decision. Vulnerable to buyer's remorse if value doesn't expand immediately.
- **Friction Points:** After the toast message, the user remains on the Billing Settings page rather than being redirected to an unlocked high-value feature.
- **Emotional Response:** Relief that payment succeeded, slight confusion about what to do next.
- **Psychological Principles Involved:** Peak-End Rule, Buyer's Remorse Mitigation, Endowed Progress.
- **Desktop vs. Mobile:** Identical across both platforms.
- **Stage Score:** **6.5 / 10**
- **Recommended Improvements:** Immediately launch an "Unlocked Power Tour" modal upon upgrade: *"Your Growth Pro workspace is active. Let’s generate your 30-Day Growth Roadmap with your 2,500 fresh credits."*

---

### Stage 13: Long-Term Usage, Ownership & Retention (Day 30+)
- **Existing Experience:** The workspace accumulates historical data: approved brand assets, versioned logo decks, competitor monitoring timeline, completed growth experiments, and documented strategic decisions.
- **User's Psychological State:** Strong feeling that BrainWise has become the "second brain" of their enterprise. Leaving would mean forfeiting institutional memory.
- **Friction Points:** If the user's business model pivots or changes radically, updating the Business Brain requires manual editing across multiple tabs.
- **Emotional Response:** High emotional ownership and pride in the accumulated digital asset repository.
- **Psychological Principles Involved:** Endowment Effect (Emotional Ownership), Sunk Cost Fallacy (Ethical), Switching Costs.
- **Desktop vs. Mobile:** Long-term administration is predominantly executed on desktop.
- **Stage Score:** **8.5 / 10**
- **Recommended Improvements:** Introduce an automated "Business Brain Health & Evolution Review" every 30 days: *"Your business has evolved. 3 new competitors entered your space—review proposed strategic updates."*

---

### Stage 14: Cancellation, Downgrade & Offboarding
- **Existing Experience:** Users can click "Cancel Subscription" in `BillingDashboardView.tsx`, triggering a confirmation dialog with clear warnings about credit expiration and entitlement downscaling.
- **User's Psychological State:** Frustrated, cost-cutting, or feeling they have extracted all initial value and no longer need active monitoring.
- **Friction Points:** The cancellation modal is currently a simple binary dialog without an interactive survey uncovering the root cause of churn.
- **Emotional Response:** Appreciative of the zero-dark-pattern cancellation policy (no hidden phone calls or multi-page hostage loops).
- **Psychological Principles Involved:** Psychological Safety, Reciprocity, Autonomy (Self-Determination).
- **Desktop vs. Mobile:** Accessible directly within settings across all viewports.
- **Stage Score:** **7.0 / 10**
- **Recommended Improvements:** Implement an intelligent pause option (*"Pause subscription for 60 days while retaining all Business Brain memory"*), accompanied by a 1-question exit feedback poll.

---

### Stage 15: Advocacy, Referral & Viral Expansion
- **Existing Experience:** Users can invite team members via `SettingsPage.tsx` (`team-members` tab) with specific roles (`Admin`, `Editor`, `Viewer`). Reports can be exported as clean white-label PDF/Markdown documents.
- **User's Psychological State:** Proud of the strategic output; wanting to share the 15-section market dossier with co-founders, investors, or clients.
- **Friction Points:** There is currently no formalized viral referral loop or credit bounty for inviting other founders.
- **Emotional Response:** Satisfaction in presenting professional, data-dense executive slide decks generated by BrainWise.
- **Psychological Principles Involved:** Social Currency (Berger’s STEPPS), Reciprocity, Social Proof.
- **Desktop vs. Mobile:** Team invites and export sharing are desktop-dominant workflows.
- **Stage Score:** **6.0 / 10**
- **Recommended Improvements:** Introduce a "Give 250 Credits, Get 250 Credits" founder referral program, and embed subtle, elegant watermarks on free exported slide decks (*"Powered by BrainWise Strategic Intelligence"*).

---

## 3. Comprehensive User Journey Scorecard Matrix

```
┌────────────────────────────────────────────────────────────────────────┐
│                   USER JOURNEY STAGE SCORECARD SUMMARY                 │
├──────────────────────────────┬───────┬────────────┬────────────────────┤
│ Lifecycle Stage              │ Score │ Confidence │ Primary Bottleneck │
├──────────────────────────────┼───────┼────────────┼────────────────────┤
│ 1. Discovery                 │ 7.0   │ High       │ Positioning clarity│
│ 2. Landing Page              │ 8.5   │ High       │ Showcase auto-spin │
│ 3. Registration              │ 7.5   │ High       │ Email OTP friction │
│ 4. Intelligent Onboarding    │ 8.0   │ High       │ Text entry density │
│ 5. First Value Delivery      │ 7.5   │ High       │ Dashboard overload │
│ 6. Dashboard Command Center  │ 8.0   │ High       │ Mock chart clarity │
│ 7. Main Feature Exploration  │ 8.5   │ High       │ Deep dossier length│
│ 8. AI Ground-Truth Trust     │ 9.0   │ High       │ Citation popovers  │
│ 9. Repeated Session Habits   │ 6.5   │ High       │ External cues/push │
│ 10. Upgrade Experience       │ 7.5   │ High       │ Hard credit walls  │
│ 11. Payment Execution        │ 8.5   │ High       │ Drop-off recovery  │
│ 12. Post-Purchase Flow       │ 6.5   │ High       │ Post-pay routing   │
│ 13. Long-Term Retention      │ 8.5   │ High       │ Pivot re-grounding │
│ 14. Cancellation Experience  │ 7.0   │ High       │ Lack of pause tier │
│ 15. Advocacy & Referral      │ 6.0   │ High       │ Missing referral   │
├──────────────────────────────┼───────┼────────────┼────────────────────┤
│ OVERALL JOURNEY AVERAGE      │ 7.64  │ HIGH       │ GOOD WITH KEY GAPS │
└──────────────────────────────┴───────┴────────────┴────────────────────┘
```
