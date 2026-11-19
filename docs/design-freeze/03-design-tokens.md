# BrainWise — Canonical Design Token System & Component Specification
**Document ID:** `docs/design-freeze/03-design-tokens.md`  
**Version:** `1.0.0-frozen`  
**Status:** APPROVED (Phase B)

---

## 1. Single Source of Truth Architecture

BrainWise establishes a synchronized dual-layer token system:
1. **TypeScript Single Source of Truth**: `src/design/tokens.ts` (strict type-safe constants, scale calculations, and programmatic generators).
2. **CSS Variables & Utility Classes**: `src/index.css` (native CSS Custom Properties under `:root` and tailored utility classes under `@layer`).
3. **Automated Verification**: `src/design/tokens.test.ts` asserts that CSS custom properties and TypeScript definitions never drift apart.

---

## 2. Color Palette Tokens

### 2.1 Surfaces & Canvas (60% Ratio)
| Token Name | CSS Custom Property | Hex / RGBA | Role & Application |
|---|---|---|---|
| `canvas.primary` | `--bw-bg-primary` | `#FFFFFF` | Primary card surfaces, modal panels, text input backgrounds |
| `canvas.secondary`| `--bw-bg-secondary` | `#FAFAF9` | Application base canvas, page backdrop, subtle alternating table rows |
| `canvas.subtle` | `--bw-bg-subtle` | `#F1F1EF` | Recessed containers, pill tab tracks, disabled button backgrounds |
| `canvas.border` | `--bw-border` | `#E6E6E2` | Standard card dividers, table borders, panel outlines |
| `canvas.borderStrong`| `--bw-border-strong` | `#D6D6D0` | High-contrast container borders, active input borders |

### 2.2 Charcoal & Typography (30% Ratio)
| Token Name | CSS Custom Property | Hex / RGBA | Role & Application |
|---|---|---|---|
| `charcoal.deep` | `--bw-dark` | `#171717` | Navigation sidebar background, primary dark buttons, modal scrims |
| `charcoal.graphite`| `--bw-text-primary` | `#252525` | Display headlines, section titles, high-emphasis body text |
| `charcoal.bodyMuted`| `--bw-text-body-muted` | `#5C5C58` | Long-form editorial body narrative, dossier insights, captions |
| `charcoal.secondary`| `--bw-text-muted` | `#858585` | Placeholder text, inactive icons, timestamps, step labels |

### 2.3 Signal Accent: Orange (10% Ratio)
| Token Name | CSS Custom Property | Hex / RGBA | Role & Application |
|---|---|---|---|
| `accent.orange` | `--bw-orange` | `#FF7417` | Primary action button background, active tab indicators, focus rings |
| `accent.orangeWarm` | `--bw-orange-warm` | `#FF9A45` | Ambient lighting radial gradients, hover sparkles, secondary badges |
| `accent.orangeHover`| `--bw-orange-hover` | `#E55F08` | Primary button hover state, active interaction feedback |
| `accent.orangeAccessibleText`| `--bw-orange-text` | `#C44D00` | High-contrast accessible text labels on white canvas (meets WCAG AA) |
| `accent.orangePale` | `--bw-orange-light` | `#FFF0E5` | Selected card tinted backgrounds, unread alert highlights, hover pills |

### 2.4 Semantic State Colors
| Semantic Role | Foreground CSS Token | Background CSS Token | Hex Values |
|---|---|---|---|
| **Success / Verified** | `--bw-success` | `--bw-success-bg` | `#24724E` on `#ECF7F1` |
| **Warning / Attention**| `--bw-warning` | `--bw-warning-bg` | `#A85E16` on `#FDF4EA` |
| **Error / Critical** | `--bw-error` | `--bw-error-bg` | `#BC3E3E` on `#FDF0F0` |
| **Information / Neutral**| `--bw-text-primary`| `--bw-bg-subtle` | `#252525` on `#F1F1EF` |

---

## 3. Strict Modular Typography System

BrainWise adheres strictly to a **1.25 Major Third Modular Scale** rooted at `16px` (`1rem`). Every step is mathematically derived: `size = 16px × 1.25^step`.

| Step Token | Step Index | Computed Px | Rem Value | Line Height | Tracking | Semantic Class (`typeClass.*`) |
|---|---|---|---|---|---|---|
| `--bw-text-step-n2`| `-2` | `10.24px` | `0.64rem` | `1.4` | `+0.08em` | `.bw-type-overline` |
| `--bw-text-step-n1`| `-1` | `12.80px` | `0.80rem` | `1.55` | `0em` | `.bw-type-body-sm`, `.bw-type-mono-meta` |
| `--bw-text-step-0` | `0` | `16.00px` | `1.00rem` | `1.6` | `0em` | `.bw-type-body`, `.bw-type-lead` (mobile) |
| `--bw-text-step-1` | `1` | `20.00px` | `1.25rem` | `1.3` | `-0.015em` | `.bw-type-h4`, `.bw-type-metric-sm` |
| `--bw-text-step-2` | `2` | `25.00px` | `1.5625rem` | `1.25` | `-0.02em` | `.bw-type-h3`, `.bw-type-metric` |
| `--bw-text-step-3` | `3` | `31.25px` | `1.953125rem`| `1.18` | `-0.025em`| `.bw-type-h2`, `.bw-type-metric-lg` |
| `--bw-text-step-4` | `4` | `39.06px` | `2.441406rem`| `1.12` | `-0.03em` | `.bw-type-h1` |
| `--bw-text-step-5` | `5` | `48.83px` | `3.051758rem`| `1.08` | `-0.035em`| `.bw-type-display-sm` |
| `--bw-text-step-6` | `6` | `61.04px` | `3.814697rem`| `1.04` | `-0.04em` | `.bw-type-display` |

---

## 4. Spacing Scale (4px Baseline Grid)

All layout paddings, margins, gaps, and component internal geometry must resolve to the following 11 canonical steps:

| Token | Pixels | Rem Equivalent | Primary UI Usage |
|---|---|---|---|
| `--bw-space-1` | `4px` | `0.25rem` | Micro icon gaps, badge vertical padding, border offsets |
| `--bw-space-2` | `8px` | `0.50rem` | Control gaps, button internal vertical padding, tight list items |
| `--bw-space-3` | `12px` | `0.75rem` | Form field rhythm, card compact inner padding |
| `--bw-space-4` | `16px` | `1.00rem` | Standard card internal padding, toolbar item spacing |
| `--bw-space-5` | `20px` | `1.25rem` | Medium component padding, modal inner rhythm |
| `--bw-space-6` | `24px` | `1.50rem` | Grid gutters, desktop modal panel padding |
| `--bw-space-8` | `32px` | `2.00rem` | Workspace department section vertical cadence |
| `--bw-space-10`| `40px` | `2.50rem` | Large block separation, hero margins |
| `--bw-space-12`| `48px` | `3.00rem` | Major department section padding |
| `--bw-space-16`| `64px` | `4.00rem` | Landing page section vertical separation |
| `--bw-space-20`| `80px` | `5.00rem` | Hero section top/bottom breathing room |

---

## 5. Border Radii Tokens

| Token | CSS Custom Property | Value | Usage |
|---|---|---|---|
| `BW_RADII.xs` | `--bw-radius-xs` | `4px` | Checkboxes, progress bar segments, micro badges |
| `BW_RADII.sm` | `--bw-radius-sm` | `8px` | Badges, small tags, tooltips, inline code blocks |
| `BW_RADII.md` | `--bw-radius-md` | `12px` | Inputs, dropdown menus, button controls, metric cards |
| `BW_RADII.lg` | `--bw-radius-lg` | `16px` | Standard cards, dossier sections, notification cards |
| `BW_RADII.xl` | `--bw-radius-xl` | `20px` | Feature cards, interactive device frames |
| `BW_RADII.xxl`| `--bw-radius-2xl`| `24px` | Modal dialogs, floating drawers, hero cards |
| `BW_RADII.full`| `--bw-radius-full`| `9999px` | Circular icon buttons, pill tabs, status orbs |

---

## 6. Depth, Glass, Focus & Elevation Tokens

### 6.1 Elevation Shadows
- `--bw-shadow-raised`: `inset 0 1px 0 rgba(255, 255, 255, 0.92), 0 1px 2px rgba(23, 23, 23, 0.025), 0 14px 32px -22px rgba(23, 23, 23, 0.09)`
- `--bw-surface-elevated`: `inset 0 1px 0 rgba(255, 255, 255, 0.96), 0 0 0 1px rgba(255, 255, 255, 0.65), 0 4px 12px rgba(23, 23, 23, 0.045), 0 28px 64px -20px rgba(23, 23, 23, 0.16)`
- `--bw-shadow-inset`: `inset 0 1px 2px rgba(23, 23, 23, 0.035)`
- `--bw-ceramic-control`: `inset 0 1px 0 rgba(255, 255, 255, 0.95), 0 1px 2px rgba(23, 23, 23, 0.05), 0 4px 10px -6px rgba(23, 23, 23, 0.08)`

### 6.2 Frosted Glass Tokens
- Background: `rgba(255, 255, 255, 0.76)` (`--bw-glass-bg`)
- Elevated Background: `rgba(255, 255, 255, 0.84)` (`--bw-glass-bg-elevated`)
- Border: `rgba(230, 230, 226, 0.78)` (`--bw-glass-border`)
- Blur: `14px` (`--bw-glass-blur`)

### 6.3 Focus Ring Tokens (WCAG 2.2 AA Compliant)
- CSS Property: `--bw-focus-ring`
- Value: `0 0 0 2px var(--bw-focus-ring-offset), 0 0 0 4.5px var(--bw-orange), 0 0 0 6.5px rgba(196, 77, 0, 0.18)`
- Utilities: `.focus-ring`, `.focus-ring-dark`, `.focus-ring-inset`

---

## 7. Component Design Specification

Every standard BrainWise UI component is specified below across its interactive states:

### 7.1 Buttons (`Button` in `DesignSystem.tsx`)
- **Primary**: Background `#FF7417`, text `#FFFFFF`, rounded pill (`rounded-full`).
  - *Default*: High-contrast ceramic illumination.
  - *Hover*: Background `#E55F08`, slight tactile lift (`-1px`).
  - *Active*: Background `#C44D00`, transform translateY(0).
  - *Focus*: 3-tier orange focus ring (`.focus-ring`).
  - *Disabled*: Opacity `40%`, cursor `not-allowed`, no hover transform.
  - *Loading*: Disabled with inline 14px rotating SVG spinner, text preserved.
- **Secondary (Ceramic)**: Background `#FFFFFF`, border `#E8E8E4`, text `#252525`, box-shadow `bw-ceramic-control`.
  - *Hover*: Border `#D6D6D0`, background `#FAFAF9`.
  - *Active*: Inset shadow active.
- **Destructive**: Background `#BC3E3E`, hover `#A13232`, text `#FFFFFF`.
- **Ghost / Tertiary**: Transparent background, text `#5C5C58`, hover `#F1F1EF`, text `#171717`.

### 7.2 Form Controls (`Input`, `Select`, `Textarea` in `DesignSystem.tsx`)
- Background `#FFFFFF`, border `1px solid #E6E6E2`, text `#171717`, placeholder `#858585`.
- *Focus*: Border `#FF7417`, outline 2px solid `#FF7417`, ring shadow.
- *Error*: Border `#BC3E3E`, `aria-invalid="true"`, error message linked via `aria-describedby`.
- *Disabled*: Background `#F1F1EF`, border `#E6E6E2`, text `#858585`, cursor `not-allowed`.

### 7.3 Cards (`MetricCard`, `DepartmentCards`, `bw-trace-card`)
- Base surface `#FFFFFF`, border `1px solid #E6E6E2`, box-shadow `--bw-shadow-raised`.
- *Interactive Trace*: `.bw-trace-card` displays gentle hover lift (`translateY(-2px)`), elevated shadow, and an expanding orange border hairline (`rgba(255, 116, 23, 0.45)`).

### 7.4 Dialogs & Modals (`Dialog.tsx`, `Overlay.tsx`)
- Backdrop: `rgba(23, 23, 23, 0.24)` with `10px` blur (`.bw-dialog-backdrop`).
- Ceramic Container: Surface `#FFFFFF` with top highlight hairline (`.bw-dialog-ceramic`), border radius `24px` (`sm:rounded-[24px]`).
- Focus trapping enabled, ESC key listener, body scroll lock counter.

### 7.5 Tabs (`Tabs` in `DesignSystem.tsx`)
- Pill container `#F1F1EF`, active pill `#FFFFFF` with `shadow-xs` and text `#171717`.
- Spring layout animation on active selection via `layoutId`.

### 7.6 Empty States (`EmptyState.tsx`)
- Centralized illustration variants: `strategy`, `research`, `brand`, `tasks`, `radar`, `analytics`, `assets`.
- Contextual eyebrow, clear title, empathetic explanation, primary action button.
