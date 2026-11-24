# BRAINWISE — MASTER UX & DESIGN SYSTEM SPECIFICATION
## Strict Design Freeze v1.0 • React 19 • 1.25 Modular Typography
### Master Technical Document 07

---

## 1. UX Philosophy & Design Freeze Directive

BrainWise is engineered with tactile precision, editorial authority, and modern technical minimalism. The user interface communicates institutional trustworthiness and rigorous business intelligence.

### Strict Design Freeze Mandate
Per Master Directives, **UI layouts, core component hierarchies, design tokens, and typography scales are frozen**. All engineering transformations must wire typed API client hooks into existing components without altering the visual presentation layer.

---

## 2. 1.25 Modular Typography Ladder (Major Third)

All type sizes throughout BrainWise strictly adhere to the **Major Third (1.25)** ratio based on a 16px body base ($16 \times 1.25^n$):

| Token | Scale Factor | Computed Size | Font Family | Usage |
|---|---|---|---|---|
| `display` | Step +5 ($1.25^5$) | **48.8px** | Plus Jakarta Sans | Hero display, major opportunity verdict |
| `h1` | Step +4 ($1.25^4$) | **39.1px** | Plus Jakarta Sans | Department primary page headers |
| `h2` | Step +3 ($1.25^3$) | **31.3px** | Plus Jakarta Sans | Section titles, key metric callouts |
| `h3` | Step +2 ($1.25^2$) | **25.0px** | Plus Jakarta Sans | Card headings, drawer titles |
| `bodyLarge` | Step +1 ($1.25^1$) | **20.0px** | Inter | Executive lead paragraphs |
| `body` | Base ($1.25^0$) | **16.0px** | Inter | Primary interface copy, form inputs |
| `bodySmall` | Step -1 ($1.25^{-1}$) | **12.8px** | Inter | Secondary descriptions, table text |
| `caption` | Step -2 ($1.25^{-2}$) | **10.2px** | JetBrains Mono | Monospace telemetry, timestamps, badges |

---

## 3. Master Color Palette & Design Tokens

```css
:root {
  /* Canvas Backgrounds */
  --color-canvas-white: #FAFAF9;   /* Editorial warm white background */
  --color-surface-white: #FFFFFF;  /* Clean card surface */
  --color-surface-muted: #F5F5F3;  /* Subdued card surface */

  /* Dark Editorial Surfaces */
  --color-charcoal-deep: #171717;  /* High-contrast brand dark */
  --color-graphite: #252525;       /* Elevated dark card surface */
  --color-border-dark: #333333;    /* Subtle dark border */

  /* Primary Accent */
  --color-accent-orange: #FF7417;  /* High-intent orange CTA & highlights */
  --color-accent-orange-hover: #E5640D;

  /* Neutrals & Muted */
  --color-text-primary: #171717;
  --color-text-secondary: #5C5C58;
  --color-text-muted: #858585;
  --color-border-light: #E6E6E2;

  /* Intelligence & Health Status Tokens */
  --color-status-success: #16A34A; /* Verified / GO Verdict / Healthy */
  --color-status-warning: #D97706; /* Caution / Lagging / Estimated */
  --color-status-danger: #DC2626;  /* Blocker / Critical Risk / Contradiction */
  --color-status-info: #2563EB;    /* Corroborated / In-Progress */
}
```

---

## 4. Key UI Components & Interaction States

### 4.1 Evidence Badges & Source Inspector Drawer
- Rendered inline with factual statements (`<EvidenceBadge classification="VERIFIED" sourceCount={3} />`).
- Clicking an Evidence Badge opens the slide-over `<SourceInspectorDrawer>`, surfacing the primary citation, extraction date, original URL, and corroborated evidence links.

### 4.2 Calculation Transparency Cards
- Placed beneath all generated scores, TAM/SAM/SOM sizing figures, and financial ratios.
- Displays explicit mathematical formula, input values, and step-by-step logic to guarantee complete transparency.

### 4.3 6-Factor Alert Cards (Business Watch)
- Features clear categorization tags (`COMPETITOR_MOVE`, `REGULATORY_CHANGE`, `EXECUTION_ANOMALY`).
- Provides 1-click action triggers routing directly to the appropriate department with pre-populated task parameters.

### 4.4 Responsive Viewport Support
- **Desktop (1920px & 1440px)**: Multi-column grid with persistent sidebar navigation and floating intelligence strategist drawer.
- **Laptop (1366px)**: Fluid 2-column layout with responsive chart containers.
- **Tablet (1024px & 768px)**: Collapsible sidebar with drawer navigation.
- **Mobile (375px)**: Single-column stacked cards with bottom navigation bar and full-screen drawer overlays.
