# BrainWise — Liquid Motion & Animation Guidelines
**Document ID:** `docs/design-freeze/07-motion-guidelines.md`  
**Version:** `1.0.0-frozen`  
**Status:** APPROVED (Phase E)

---

## 1. Motion Philosophy: Restrained Fluid Intelligence

BrainWise uses motion purposefully to reinforce spatial orientation, confirm state changes, and convey algorithmic intelligence. Motion in BrainWise is:
- **Subtle & Editorial**: Never bouncy, whimsical, or arcade-like.
- **Fast & Responsive**: Micro-interactions finish under `160ms`; layout settling completes under `240ms`.
- **Physically Grounded**: Curves mimic viscous fluids settling under gravity (`cubic-bezier(0.16, 1, 0.3, 1)`).
- **Reduced-Motion Safe**: Completely disabled or simplified to opacity transitions when `prefers-reduced-motion: reduce` is active.

---

## 2. Standardized Easing & Duration Curves

### 2.1 Easing Primitives
| Easing Name | Cubic Bezier Curve | CSS Variable | Character & Usage |
|---|---|---|---|
| **Liquid Easing** | `cubic-bezier(0.16, 1, 0.3, 1)` | `--bw-ease-liquid` | Primary entrance curve: fast onset with a gentle, extended fluid deceleration. Used for modals, department transitions, and drawer panels. |
| **Smooth Settle** | `cubic-bezier(0.22, 1, 0.36, 1)` | `--bw-ease-smooth` | Balanced curve for hover lifts, color shifts, and tab slider layout animations. |
| **Linear** | `linear` | N/A | Exclusively reserved for continuous background ambient drift (`KineticMarquee`). |

### 2.2 Duration Tokens
- **Fast (`140ms`)**: Button hover states, checkbox toggles, badge appearances, tooltip fade-ins.
- **Base (`220ms`)**: Tab line sliding, department cross-fade settle, card hover lift, dropdown menu reveals.
- **Slow (`360ms`)**: Large modal openings, drawer slide-overs, full-page layout transitions.

---

## 3. Canonical Motion Primitives (`src/components/motion/`)

### 3.1 Department Transition (`DepartmentTransition`)
- **Trigger**: Switching workspace departments in sidebar or command palette.
- **Mechanics**:
  - `initial: { opacity: 0, y: 6 }`
  - `animate: { opacity: 1, y: 0 }`
  - `exit: { opacity: 0, y: -4 }`
  - `transition: { duration: 0.22, ease: BW_EASE }`
- **Usability Benefit**: Provides directional continuity without jarring page flashes or slow animations.

### 3.2 Tactile Card Lift (`.bw-trace-card`)
- **Trigger**: Hovering or focusing interactive cards.
- **Mechanics**:
  - `transform: translateY(-2px)`
  - `box-shadow: var(--bw-shadow-elevated)`
  - Subtle hairline illumination: `border-color: rgba(255, 116, 23, 0.32)`
  - Active press: `transform: translateY(0)` with `duration: 75ms`

### 3.3 Intelligence Pulse & Halo (`.bw-orb-halo`)
- **Trigger**: Live AI synthesis in Idea Intelligence, Brand Studio, or Growth Planner.
- **Mechanics**:
  - Concentric radial scale: `scale(1) → scale(1.26)`
  - Opacity drift: `0.65 → 0.22`
  - Cycle: `2.8s` continuous loop with fluid settle.
- **Safety**: Automatically terminated when synthesis completes; replaced with a crisp static status badge.

### 3.4 Progressive Result Stagger (`ProgressiveResultReveal`)
- **Trigger**: Revealing generated research sections, logo concepts, or pitch deck slides.
- **Mechanics**: Staggered delay of `45ms` per item, fading in while settling upward by `8px`.
- **Safety**: Never delays the first item; total cascade sequence finishes in `< 300ms`.

---

## 4. Strict Animation Prohibitions

1. **NO Indefinite Loaders without Feedback**: Skeletons must not cycle indefinitely. If an async call exceeds 15 seconds, a retry state must be displayed.
2. **NO Motion that Blocks Interaction**: Clicks and keyboard inputs must register immediately, even while an element is settling into place (`pointer-events: auto`).
3. **NO Decorative Floating Background Blobs**: Do not introduce drifting colorful background orbs on core analytical screens. Topographic coordinate grids (`.bw-topo-grid`) must remain static or non-distracting.
4. **NO Inconsistent Spring Bounces**: Spring dampening must not oscillate past its target position.

---

## 5. Accessibility & `prefers-reduced-motion` Enforcement

In `src/index.css`, a global media query guarantees compliance:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
  .bw-marquee-track,
  .bw-liquid-blob,
  .bw-orb-halo,
  .bw-liquid-shimmer,
  .bw-skeleton-wave::after,
  .bw-skeleton-wave-accent::after,
  .bw-skeleton-wave-dark::after {
    animation: none !important;
  }
  .bw-trace-card,
  .bw-trace-card:hover,
  .bw-trace-card:focus-within,
  .bw-trace-card:active {
    transform: none !important;
  }
}
```

In React components using Motion, `useReducedMotion()` from `motion/react` conditionally bypasses transforms and applies instantaneous transitions.
