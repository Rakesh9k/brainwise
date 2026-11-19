# BrainWise — Brand Identity & Guidelines
**Document ID:** `docs/design-freeze/02-brand-guidelines.md`  
**Version:** `1.0.0-frozen`  
**Status:** APPROVED (Phase B)

---

## 1. Brand Essence & Philosophy

BrainWise is an intelligent, high-conviction workspace for founders, executives, and product leaders. It combines structured market validation, competitive surveillance, brand crafting, and weekly execution into a unified business operating system.

### The Visual Tone
- **Sophisticated & Editorial**: Clear hierarchy inspired by high-end financial and architectural publications.
- **Calm & Tactile**: White and warm off-white ceramic surfaces (`#FFFFFF`, `#FAFAF9`) with subtle inset borders and recessed controls.
- **Decisive & Analytical**: Deep charcoal (`#171717`) for navigation anchors, strategic metrics, and high-priority states.
- **Signal Orange Accent**: `#FF7417` as the singular illumination color, reserved for key CTAs, active focus states, live research beacons, and progress highlights.

### Strict Brand Prohibitions
To preserve BrainWise's distinct professional character, the following are strictly prohibited:
- **NO Purple Gradients or Neon Colors**: Do not introduce generic AI purple/violet gradients or neon cyber-styling.
- **NO Excessive Glassmorphism**: Avoid overly blurred or opaque floating panels that hinder data legibility. Only frosted glass navigation (`bw-frosted-nav`) is approved.
- **NO Deep Drop Shadows**: Rely on crisp 1px borders (`#E6E6E2`) and subtle ceramic ambient elevation (`--bw-shadow-raised`).
- **NO Canva-style Decorative Clutter**: Decorative stickers, confetti, or arbitrary blob illustrations are forbidden. All motifs must be topographic, geometric, or algorithmic.

---

## 2. Logo System

The official BrainWise logo embodies intelligence, structure, and neural insight. It consists of two authoritative forms:

### 2.1 Full Brand Lockup
- **Mark**: Geometric neural constellation featuring interconnected nodes with a prominent orange core beacon (`#FF7417`).
- **Wordmark**: "BrainWise" set in **Geist** with `-0.035em` tracking.
  - "Brain" rendered in Bold (`700`), `#171717` (light mode) or `#FFFFFF` (dark mode).
  - "Wise" rendered in Medium (`500`), `#5C5C58` or accented in `#FF7417`.
- **Component Implementation**: `<BrandLogoMark size={28} />` paired with typography classes in `src/components/ui/DesignSystem.tsx`.

### 2.2 Icon-Only Logo Mark
- **Usage**: Favicon, mobile header, collapsed sidebar, social avatars, and app icons.
- **Geometry**: Concentric ring structure with 3 orbital node clusters linked by hair-thin vectors, culminating in a glowing `#FF7417` center point.
- **SVG Definition**:
  ```svg
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" rx="8" fill="#171717"/>
    <circle cx="16" cy="16" r="10" stroke="#FF7417" stroke-width="1.5" stroke-opacity="0.35"/>
    <circle cx="16" cy="16" r="5" stroke="#FFFFFF" stroke-width="1.5"/>
    <circle cx="16" cy="16" r="2.5" fill="#FF7417"/>
    <circle cx="21" cy="11" r="1.5" fill="#FFFFFF"/>
    <circle cx="11" cy="21" r="1.5" fill="#FFFFFF" fill-opacity="0.6"/>
  </svg>
  ```

---

## 3. Logo Usage & Clear Space

```
         ┌──────────────────────────────────────┐
         │                  [X]                 │
         │         ┌──────────────────┐         │
     [X] │     [X] │    BRAINWISE     │ [X]     │ [X]
         │         └──────────────────┘         │
         │                  [X]                 │
         └──────────────────────────────────────┘
```

- **Clear Space (`[X]`)**: The minimum clear space surrounding the mark and wordmark must equal the height of the primary "B" in BrainWise (or `50%` of the mark width).
- **Minimum Sizing**:
  - Full Lockup: Minimum height `24px` on digital screens (minimum width `110px`).
  - Icon-Only Mark: Minimum size `16px × 16px` (e.g. favicon) up to `64px × 64px` in app launcher.
- **Background Contrast Rules**:
  - **Light Surfaces (`#FFFFFF` to `#F1F1EF`)**: Use dark charcoal `#171717` text with orange core.
  - **Dark Surfaces (`#171717` to `#252525`)**: Use pure white `#FFFFFF` text with warm orange `#FF9A45` core.
  - **Busy Imagery**: Logo must sit within a frosted glass ceramic pill (`.bw-frosted-nav`) or dedicated backdrop mask.

### Incorrect Logo Usage
- **Do not** stretch, distort, or shear the aspect ratio.
- **Do not** recolor the orange beacon to blue, green, or red.
- **Do not** apply a drop shadow or outer neon glow to the logo mark.
- **Do not** place the logo on clashing multi-colored photo backgrounds without an isolating container.

---

## 4. Typography Personality

| Hierarchy Role | Font Family | Weight | Letter Spacing | Approved Usage |
|---|---|---|---|---|
| **Display** | Geist | 800 (ExtraBold) | `-0.04em` | Landing hero headlines, major valuation numbers |
| **Headings (H1–H4)** | Geist | 700 / 600 | `-0.025em` | Department titles, modal titles, card headers |
| **Body Regular** | Geist / Inter | 400 (Regular) | `0em` | Dossier narrative, explanatory text, table cells |
| **Body Small** | Geist / Inter | 400 / 500 | `0em` | Metadata, helper labels, captions, footnotes |
| **Overline / Eyebrow**| JetBrains Mono | 600 (SemiBold) | `+0.08em` (UPPERCASE) | Department category badges, step indicators |
| **Numerical & Metrics**| JetBrains Mono | 700 (Bold) | `-0.02em` (`tabular-nums`) | Financial metrics, TAM sizing, dates, percentages |

---

## 5. Official Imagery & Media Direction

- **Photography Style**: Minimalist, high-key architectural photography, tactile industrial craft (ceramics, precision roastery equipment, modern Scandinavian design studios).
- **Duotone & Illumination**: Natural daylight with subtle directional shadows. Never use saturated stock photos of smiling models giving thumbs-up.
- **Diagrams & Visualizations**: Geometric coordinate meshes (`.bw-topo-grid`), clean continuous spline curves, and minimalist node constellation graphs.
