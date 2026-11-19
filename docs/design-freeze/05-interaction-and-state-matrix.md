# BrainWise — Five-State Design Matrix & Interaction Specification
**Document ID:** `docs/design-freeze/05-interaction-and-state-matrix.md`  
**Version:** `1.0.0-frozen`  
**Status:** APPROVED (Phase D)

---

## 1. Five-State System Architecture

In BrainWise, every user surface must account for the five foundational interface states:
1. **Loading State**: Visual continuity during async actions, network requests, or AI generation via shape-matched shimmer skeletons or spinner overlays.
2. **Empty State**: Zero-data context when an account is fresh or search results yield nothing, offering clear context and a decisive next action.
3. **Success State**: Clear, non-intrusive confirmation via toasts, badges, or check transitions that verify state persistence.
4. **Error State**: Actionable recovery guidance when operations fail, preserving user inputs and providing clear retry mechanisms.
5. **Disabled State**: Visually distinct controls with `40%` opacity and `not-allowed` cursor when prerequisites are unmet or forms are incomplete.

---

## 2. Screen-by-Screen Five-State Coverage Matrix

| Screen / Feature | Loading State | Empty State | Success State | Error State | Disabled State | Verified Result |
|---|---|---|---|---|---|---|
| **Marketing (Landing)** | Progressive image shimmers via `ResilientMedia` | N/A (Marketing copy is static and complete) | Newsletter signup pill confirms with green check | Inline alert if email syntax is invalid | CTA disabled during simulated submission | **PASS** |
| **Auth: Sign In** | Button spinner with "Verifying credentials..." | Clean empty inputs with focus defaults | Instant session transition to `/dashboard` | Red alert banner: "Invalid credentials" | Button disabled until both email and password are provided | **PASS** |
| **Auth: Sign Up** | "Creating workspace..." spinner | Initialized empty inputs | Transition to `verify-email` screen | "Please enter a valid work email" | Button disabled while required fields are empty | **PASS** |
| **Auth: Verify Email** | "Verifying code..." spinner | 6 digit boxes empty | Green banner: "Email verified. Initializing..." | Red alert: "Code invalid or expired (Try 482910)" | Disabled when entered digits < 6 | **PASS** |
| **Auth: Password Reset** | "Sending instructions..." spinner | Email input empty | Green card with resend instructions | "Please enter a valid email address" | Disabled when email is empty | **PASS** |
| **Onboarding Wizard** | Step 5 `WorkspaceInitSkeleton` + neural pulse | Step 4 fresh workspace toggle option | Automatic transition into `/dashboard` | Step alerts if company name omitted | "Next" button disabled when step inputs are incomplete | **PASS** |
| **Dashboard** | `LiquidSkeletonReveal` shape-matched card waves | Empty workspace state with "Validate First Idea" card | Instant strike-through & decrement on task done | Graceful fallback if metric stream is interrupted | Reordering controls disabled during animation | **PASS** |
| **Business Brain** | Subtle pulse indicator during AI field suggest | "No offerings documented yet" placeholder card | Emerald toast: "Business Brain synchronized" | Alert if invalid URL entered in website field | "Save to Brain" disabled when no unsaved changes | **PASS** |
| **Idea Intelligence** | Phased AI milestone sweep ("Evaluating TAM...") | Sample idea guidance cards (Coffee, SaaS) | Toast: "Dossier saved to Business Brain" | "AI timeout" alert + instant deterministic fallback | Sliders clamped to bounds; generation disabled if prompt blank | **PASS** |
| **Competitive Intelligence**| Skeleton loader while competitor cards render | `GuidedActionEmptyCard` prompting first competitor | Toast: "Competitive strategy saved to Brain" | Alert on duplicate competitor name | Dragging clamped within 2×2 positioning bounds | **PASS** |
| **Market Watch** | Skeleton table rows while fetching signals | Empty feed card: "No unread alerts matching filter" | Toast: "Event converted to Growth Experiment" | Error recovery on invalid schedule settings | "Convert" button disabled if already converted | **PASS** |
| **Brand Studio** | Shimmer skeleton during logo/slide generation | "No custom palettes saved yet" | Checkmark beacon on token copy & Brain sync | Alert on invalid hex code in custom color picker | Export disabled while slides are regenerating | **PASS** |
| **Asset Library** | Grid skeletons during asset search | "No assets match search query" | Confirmation toast on asset rename/archive | Alert on unsupported file type upload | Upload disabled while file exceeds size limit | **PASS** |
| **Growth Planner** | Staggered row reveal on roadmap change | "All daily tasks completed for today! 🎉" | Strike-through animation + progress bar update | Alert if goal target value is less than current value | Progress slider disabled when goal is marked completed | **PASS** |
| **Analytics & Reports** | `AnalyticsSkeleton` wave shimmer | Zero-data empty state with "Connect Stripe/GA" CTA | CSV/JSON download confirmation | "Failed to load report data" with retry button | Milestones non-draggable; past date ranges read-only | **PASS** |
| **Settings & Preferences**| Inline spinner during simulated plan upgrade | "No additional team members invited yet" | Toast: "Profile preferences saved successfully" | Red outline on invalid webhook URL | "Save Changes" disabled until form is dirty | **PASS** |

---

## 3. Interactive Outcome & Feedback Specifications

For every interactive element across the application, the exact interaction contract is established below:

### 3.1 Button & CTA Interactions
1. **User Action**: Click primary CTA (e.g. "Save to Brain", "Run Dossier", "Convert to Experiment").
2. **State Change**: Button transitions to `loading` state; background slightly dims; spinner appears; control becomes temporarily unclickable to prevent double-submission.
3. **Feedback**: On completion (typically 200–400ms for simulated async operations), a tactile feedback toast appears at the top/bottom right (`showToast`) with an optional `Undo` action.
4. **Failure Handling**: If the simulated network fails or AI times out, an inline `ErrorState` banner appears with an explicit "Try Again" or "Use Local Template" button. The user's input is never cleared or lost.
5. **Mobile Readiness**: All buttons meet minimum `44px × 44px` touch targets with active press-down feedback (`translateY(0)`).

### 3.2 Form Validation & Error Association
- **Required Fields**: Indicated by clear visual typography and required attributes.
- **Input Entry**: Instant typing response with no re-render lag or layout shift.
- **Validation Timing**: Validated on blur and on submit. Live format validation for emails and numeric constraints.
- **Error Association**: Every invalid input receives:
  - `border-color: #BC3E3E`
  - `aria-invalid="true"`
  - `aria-describedby="{fieldId}-error"`
  - Direct association with the error text element rendered directly below the input.
- **Preservation on Failure**: If submission fails, all input values remain intact. Password fields are preserved in simulated prototype environments.

### 3.3 Modal & Dialog Interactions
- **Opening**: Click triggers portal mount with backdrop fade (`180ms`) and panel spring-up (`220ms` cubic-bezier).
- **Body Scroll Lock**: `createScrollLockCounter()` locks document body scrolling; counter ensures nested dialogs or overlays do not prematurely unlock scrolling.
- **Focus Trapping**: Tab and Shift+Tab cycle exclusively through focusable elements inside the dialog.
- **Dismissal**:
  1. ESC key press.
  2. Clicking close ("X") button in top right.
  3. Clicking outer backdrop (when `closeOnBackdropClick` is enabled).
- **Destructive Confirmations**: Destructive operations (e.g., removing a competitor, archiving an asset, deleting a team member) require explicit confirmation via `<ConfirmationDialog>` with a red destructive action button.

---

## 4. Five-State Validation Findings
- **Loading**: All async actions provide immediate feedback; no indefinite blank screens.
- **Empty**: Every list or table has an informative zero-data state with a clear call to action.
- **Success**: State changes trigger non-intrusive toast notifications with undo options.
- **Error**: Errors provide descriptive explanation and fallback alternatives (e.g. AI local generation).
- **Disabled**: Form buttons correctly reflect valid form states and prevent unintended double-submissions.
