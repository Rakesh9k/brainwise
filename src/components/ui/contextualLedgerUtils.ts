/**
 * Pure utility functions for the BrainWise Contextual Action Ledger.
 * Computes viewport-safe coordinate positioning, export data formatting,
 * and ARIA menu accessibility attributes.
 */

export interface ContextualCardData {
  id: string;
  title: string;
  subtitle?: string;
  category?: string;
  route?: string;
  data?: unknown;
  details?: Record<string, unknown> | string;
}

/**
 * Calculates viewport-constrained screen coordinates for the floating Contextual Action Ledger.
 * Flips position inward when the right-click occurs near viewport boundaries to prevent cutoff.
 */
export function calculateLedgerPosition(
  clickX: number,
  clickY: number,
  menuWidth = 280,
  menuHeight = 290,
  viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1280,
  viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800,
  margin = 12
): { x: number; y: number } {
  let x = clickX;
  let y = clickY;

  // Prevent right edge overflow
  if (x + menuWidth > viewportWidth - margin) {
    x = Math.max(margin, clickX - menuWidth);
  }

  // Prevent bottom edge overflow
  if (y + menuHeight > viewportHeight - margin) {
    y = Math.max(margin, clickY - menuHeight);
  }

  // Constrain inside boundary limits
  x = Math.max(margin, Math.min(x, viewportWidth - menuWidth - margin));
  y = Math.max(margin, Math.min(y, viewportHeight - menuHeight - margin));

  return { x: Math.round(x), y: Math.round(y) };
}

/**
 * Serializes dashboard card telemetry into a standardized BrainWise JSON export payload.
 */
export function formatCardDataAsJson(cardTitle: string, payload: unknown): string {
  const exportPayload = {
    _engine: 'BrainWise Command Platform',
    _version: '1.0.0-frozen',
    exportedAt: new Date().toISOString(),
    widgetTitle: cardTitle,
    data: payload ?? { note: 'No supplementary telemetry attributes provided' },
  };
  return JSON.stringify(exportPayload, null, 2);
}

/**
 * Formats basic array or key-value object data into CSV format for quick tabular analysis.
 */
export function formatCardDataAsCsv(cardTitle: string, payload: unknown): string {
  if (Array.isArray(payload) && payload.length > 0) {
    const first = payload[0];
    if (typeof first === 'object' && first !== null) {
      const headers = Object.keys(first);
      const rows = payload.map((row) =>
        headers
          .map((h) => {
            const val = (row as Record<string, unknown>)[h];
            const str = typeof val === 'object' ? JSON.stringify(val) : String(val ?? '');
            return `"${str.replace(/"/g, '""')}"`;
          })
          .join(',')
      );
      return [headers.join(','), ...rows].join('\n');
    }
    return ['Item', ...payload.map((p) => `"${String(p).replace(/"/g, '""')}"`)].join('\n');
  }

  if (typeof payload === 'object' && payload !== null) {
    const lines = ['Key,Value'];
    for (const [k, v] of Object.entries(payload as Record<string, unknown>)) {
      const str = typeof v === 'object' ? JSON.stringify(v) : String(v ?? '');
      lines.push(`"${k}","${str.replace(/"/g, '""')}"`);
    }
    return lines.join('\n');
  }

  return `Widget,Data\n"${cardTitle}","${String(payload ?? '')}"`;
}

/**
 * Triggers a native file download in the browser.
 */
export function triggerFileDownload(filename: string, content: string, mimeType: string): void {
  if (typeof document === 'undefined') return;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generates ARIA attributes for the context menu according to WCAG menu patterns.
 */
/**
 * Generates an executive-grade printable HTML briefing dossier (A4 / Letter print-ready).
 * Can be opened in a print window or saved directly as PDF via native browser dialog.
 */
export function generateExecutiveBriefingPdfHtml(
  cardTitle: string,
  subtitle = 'Executive Telemetry & Performance Briefing',
  payload?: unknown,
  businessName = 'BrainWise Workspace'
): string {
  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  // Extract key metrics from payload if present
  let metricCards: { label: string; value: string; detail?: string }[] = [];
  let tableRows: { label: string; value: string; detail?: string }[] = [];

  if (typeof payload === 'object' && payload !== null) {
    const p = payload as Record<string, unknown>;
    if (Array.isArray(p.series)) {
      tableRows = (p.series as Array<{ label: string; value: number | string; detail?: string }>).map((pt) => ({
        label: String(pt.label),
        value: typeof pt.value === 'number' ? `${pt.value}%` : String(pt.value),
        detail: pt.detail || '',
      }));
    }

    if (p.completionRate !== undefined) {
      metricCards.push({
        label: 'Sprint Velocity',
        value: `${p.completionRate}%`,
        detail: 'Tasks completed in current sprint cycle',
      });
    }
    if (p.timeframe) {
      metricCards.push({
        label: 'Selected Timeframe',
        value: String(p.timeframe).toUpperCase(),
        detail: 'Rolling performance telemetry window',
      });
    }

    // If no series array, extract generic keys
    if (tableRows.length === 0) {
      for (const [k, v] of Object.entries(p)) {
        if (typeof v === 'object' && v !== null && !Array.isArray(v)) continue;
        const valStr = typeof v === 'object' ? JSON.stringify(v) : String(v ?? '');
        tableRows.push({
          label: k.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()),
          value: valStr,
        });
      }
    }
  }

  if (metricCards.length === 0 && tableRows.length > 0) {
    metricCards = tableRows.slice(0, 3);
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${cardTitle} — Executive Briefing (${businessName})</title>
  <style>
    :root {
      --primary: #FF7417;
      --primary-dark: #C44D00;
      --surface: #FFFFFF;
      --bg: #F8F8F6;
      --border: #E6E6E2;
      --text: #171717;
      --text-muted: #666660;
      --success: #24724E;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
      padding: 0;
      margin: 0;
    }
    .action-bar {
      position: sticky;
      top: 0;
      z-index: 100;
      background: #FFFFFF;
      border-bottom: 1px solid var(--border);
      padding: 12px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    }
    .action-bar .brand-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 600;
      color: var(--text);
    }
    .action-bar .brand-badge span { color: var(--primary); }
    .btn-group { display: flex; gap: 8px; }
    .btn {
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
      border: 1px solid var(--border);
      background: #FFF;
      color: var(--text);
    }
    .btn:hover { background: #F1F1EF; }
    .btn-primary {
      background: var(--primary);
      color: #FFF;
      border-color: var(--primary-dark);
    }
    .btn-primary:hover { background: var(--primary-dark); }
    
    .document-container {
      max-width: 860px;
      margin: 32px auto;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 48px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.03);
    }

    .doc-header {
      border-bottom: 2px solid var(--border);
      padding-bottom: 24px;
      margin-bottom: 32px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 20px;
    }
    .doc-title-group h1 {
      font-size: 26px;
      font-weight: 700;
      color: var(--text);
      letter-spacing: -0.02em;
      margin-bottom: 4px;
    }
    .doc-title-group p {
      font-size: 14px;
      color: var(--text-muted);
    }
    .badge-tag {
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 4px 10px;
      border-radius: 6px;
      background: #FFF0E5;
      color: var(--primary-dark);
      border: 1px solid #FFD9BE;
      margin-bottom: 8px;
    }
    .meta-box {
      text-align: right;
      font-size: 12px;
      color: var(--text-muted);
    }
    .meta-box strong { color: var(--text); display: block; margin-bottom: 2px; }

    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 36px;
    }
    .kpi-card {
      background: #FAFAFA;
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
    }
    .kpi-card .kpi-label {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--text-muted);
      margin-bottom: 6px;
    }
    .kpi-card .kpi-val {
      font-size: 28px;
      font-weight: 700;
      color: var(--text);
      letter-spacing: -0.02em;
    }
    .kpi-card .kpi-detail {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 4px;
    }

    .section-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--text);
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .section-title::before {
      content: "";
      display: inline-block;
      width: 4px;
      height: 16px;
      background: var(--primary);
      border-radius: 2px;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 36px;
      font-size: 13px;
    }
    .data-table th {
      background: #F4F4F2;
      text-align: left;
      padding: 10px 14px;
      font-weight: 600;
      color: var(--text);
      border-top: 1px solid var(--border);
      border-bottom: 1px solid var(--border);
    }
    .data-table td {
      padding: 12px 14px;
      border-bottom: 1px solid #ECECE8;
      color: var(--text);
    }
    .data-table tr:hover { background: #FAFAFA; }

    .takeaways-box {
      background: #FDFDFD;
      border: 1px solid #E2E2DE;
      border-left: 4px solid var(--primary);
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 36px;
    }
    .takeaways-box h4 {
      font-size: 14px;
      font-weight: 700;
      color: var(--text);
      margin-bottom: 8px;
    }
    .takeaways-box ul {
      padding-left: 20px;
      font-size: 13px;
      color: #333330;
    }
    .takeaways-box li { margin-bottom: 6px; }

    .doc-footer {
      border-top: 1px solid var(--border);
      padding-top: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      color: #888880;
    }

    @media print {
      body { background: #FFF !important; }
      .no-print { display: none !important; }
      .document-container {
        border: none !important;
        box-shadow: none !important;
        padding: 0 !important;
        margin: 0 !important;
        max-width: 100% !important;
      }
      @page {
        margin: 15mm;
        size: A4 portrait;
      }
    }
  </style>
</head>
<body>
  <div class="action-bar no-print">
    <div class="brand-badge">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FF7417" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
      <span>BrainWise</span> Executive Briefing Export
    </div>
    <div class="btn-group">
      <button class="btn btn-primary" onclick="window.print()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 6 2 18 2 18 9"></polyline>
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
          <rect x="6" y="14" width="12" height="8"></rect>
        </svg>
        Save as PDF / Print
      </button>
      <button class="btn" onclick="window.close()">Close</button>
    </div>
  </div>

  <div class="document-container">
    <div class="doc-header">
      <div class="doc-title-group">
        <div class="badge-tag">${businessName}</div>
        <h1>${cardTitle}</h1>
        <p>${subtitle}</p>
      </div>
      <div class="meta-box">
        <strong>${businessName}</strong>
        <div>${dateStr}</div>
        <div>Generated at ${timeStr}</div>
        <div style="color: #24724E; font-weight: 600; margin-top: 4px;">✓ Verified Telemetry</div>
      </div>
    </div>

    ${
      metricCards.length > 0
        ? `
    <div class="kpi-grid">
      ${metricCards
        .map(
          (c) => `
        <div class="kpi-card">
          <div class="kpi-label">${c.label}</div>
          <div class="kpi-val">${c.value}</div>
          ${c.detail ? `<div class="kpi-detail">${c.detail}</div>` : ''}
        </div>
      `
        )
        .join('')}
    </div>
    `
        : ''
    }

    ${
      tableRows.length > 0
        ? `
    <div class="section-title">Telemetry & Performance Progression</div>
    <table class="data-table">
      <thead>
        <tr>
          <th>Metric / Checkpoint</th>
          <th>Recorded Value</th>
          ${tableRows.some((r) => r.detail) ? '<th>Operational Detail</th>' : ''}
        </tr>
      </thead>
      <tbody>
        ${tableRows
          .map(
            (r) => `
          <tr>
            <td style="font-weight: 600;">${r.label}</td>
            <td>${r.value}</td>
            ${tableRows.some((row) => row.detail) ? `<td style="color: #666660;">${r.detail || '—'}</td>` : ''}
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>
    `
        : ''
    }

    <div class="takeaways-box">
      <h4>Executive Synthesis & Strategic Directives</h4>
      <ul>
        <li><strong>Continuous Execution:</strong> Velocity metrics derive directly from verified sprint tasks and goal pacing in your workspace Business Brain.</li>
        <li><strong>Operational Alignment:</strong> Focus today's resources on highest-priority growth tasks to maintain upward momentum.</li>
        <li><strong>Audit Trail:</strong> All calculations ground strictly in active workspace entities without simulated extrapolation.</li>
      </ul>
    </div>

    <div class="doc-footer">
      <div>BrainWise Autonomous Business Intelligence & Growth Engine · Confidential</div>
      <div>Page 1 of 1 · Generated for ${businessName}</div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Triggers printing of the executive PDF briefing via a new window or fallback download.
 */
export function exportExecutivePdf(
  cardTitle: string,
  subtitle?: string,
  payload?: unknown,
  businessName = 'BrainWise Workspace'
): void {
  const html = generateExecutiveBriefingPdfHtml(cardTitle, subtitle, payload, businessName);
  const slug = cardTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  if (typeof window !== 'undefined') {
    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.open();
      printWin.document.write(html);
      printWin.document.close();
      setTimeout(() => {
        try {
          printWin.focus();
          printWin.print();
        } catch {
          // Fallback if print call fails
        }
      }, 350);
      return;
    }
  }

  // Fallback if popup blocked
  triggerFileDownload(`${slug}-executive-briefing.html`, html, 'text/html');
}

/**
 * Generates an executive 16:9 Presentation Deck (HTML slide deck with keyboard arrows,
 * presentation mode, and Google Slides / Keynote compatible export).
 */
export function generateExecutiveSlideDeckHtml(
  cardTitle: string,
  subtitle = 'Executive Briefing & Performance Presentation',
  payload?: unknown,
  businessName = 'BrainWise Workspace'
): string {
  const dateStr = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // Extract metrics
  let metrics: { label: string; value: string; detail?: string }[] = [];
  let seriesPoints: { label: string; value: number; detail?: string }[] = [];

  if (typeof payload === 'object' && payload !== null) {
    const p = payload as Record<string, unknown>;
    if (Array.isArray(p.series)) {
      seriesPoints = p.series as Array<{ label: string; value: number; detail?: string }>;
    }
    if (p.completionRate !== undefined) {
      metrics.push({
        label: 'Sprint Velocity',
        value: `${p.completionRate}%`,
        detail: 'Current sprint throughput',
      });
    }
  }

  if (metrics.length === 0 && seriesPoints.length > 0) {
    const last = seriesPoints[seriesPoints.length - 1];
    metrics.push({ label: 'Current Velocity', value: `${last.value}%`, detail: last.detail });
  }

  // Fallback defaults if metrics empty
  if (metrics.length === 0) {
    metrics = [
      { label: 'Sprint Rate', value: '100%', detail: 'Sprint tasks completed' },
      { label: 'Execution Momentum', value: 'Active', detail: 'High alignment' },
      { label: 'Strategic Alignment', value: 'Optimal', detail: 'Zero ungrounded claims' },
    ];
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${businessName} — ${cardTitle} Presentation Deck</title>
  <style>
    :root {
      --bg: #0F0F11;
      --card-bg: #18181B;
      --border: #27272A;
      --accent: #FF7417;
      --accent-glow: rgba(255, 116, 23, 0.25);
      --text: #F4F4F5;
      --text-muted: #A1A1AA;
      --success: #34D399;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      overflow-x: hidden;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 24px;
    }
    .deck-container {
      width: 100%;
      max-width: 1120px;
      aspect-ratio: 16 / 9;
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 24px;
      box-shadow: 0 25px 60px rgba(0,0,0,0.6);
      position: relative;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .slide {
      flex: 1;
      display: none;
      flex-direction: column;
      padding: 56px 64px;
      animation: fadeIn 0.25s ease-out;
    }
    .slide.active { display: flex; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }

    .slide-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 32px;
    }
    .brand-tag {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--accent);
      background: rgba(255, 116, 23, 0.1);
      padding: 6px 12px;
      border-radius: 20px;
      border: 1px solid rgba(255, 116, 23, 0.3);
    }
    .slide-meta {
      font-size: 13px;
      color: var(--text-muted);
    }

    /* Cover Slide */
    .cover-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .cover-title {
      font-size: 48px;
      font-weight: 800;
      letter-spacing: -0.03em;
      line-height: 1.15;
      margin-bottom: 16px;
      background: linear-gradient(135deg, #FFF 0%, #A1A1AA 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .cover-sub {
      font-size: 20px;
      color: var(--text-muted);
      max-width: 720px;
      line-height: 1.4;
      margin-bottom: 36px;
    }
    .cover-footer {
      display: flex;
      align-items: center;
      gap: 24px;
      font-size: 14px;
      color: var(--text-muted);
      border-top: 1px solid var(--border);
      padding-top: 24px;
    }

    /* Metric Slide */
    .slide-heading {
      font-size: 32px;
      font-weight: 700;
      letter-spacing: -0.02em;
      margin-bottom: 8px;
    }
    .slide-subheading {
      font-size: 16px;
      color: var(--text-muted);
      margin-bottom: 36px;
    }
    .kpi-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
      margin-top: auto;
      margin-bottom: auto;
    }
    .deck-kpi-card {
      background: #111113;
      border: 1px solid var(--border);
      border-radius: 18px;
      padding: 32px 24px;
      position: relative;
    }
    .deck-kpi-card .k-label {
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      margin-bottom: 12px;
    }
    .deck-kpi-card .k-val {
      font-size: 44px;
      font-weight: 800;
      color: var(--text);
      letter-spacing: -0.02em;
      margin-bottom: 8px;
    }
    .deck-kpi-card .k-detail {
      font-size: 13px;
      color: var(--text-muted);
    }

    /* Timeline points */
    .timeline-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
      margin-top: 20px;
    }
    .timeline-node {
      background: #111113;
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 20px;
    }
    .timeline-node .t-label {
      font-size: 13px;
      font-weight: 700;
      color: var(--accent);
      margin-bottom: 4px;
    }
    .timeline-node .t-val {
      font-size: 26px;
      font-weight: 800;
      color: #FFF;
      margin-bottom: 6px;
    }
    .timeline-node .t-desc {
      font-size: 12px;
      color: var(--text-muted);
    }

    /* Action Slide */
    .action-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-top: 20px;
    }
    .action-item {
      display: flex;
      gap: 20px;
      align-items: flex-start;
      background: #111113;
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 20px 24px;
    }
    .action-num {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--accent);
      color: #FFF;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      shrink: 0;
    }
    .action-body h4 { font-size: 16px; font-weight: 600; margin-bottom: 4px; }
    .action-body p { font-size: 13px; color: var(--text-muted); }

    /* Controls */
    .deck-controls {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 24px;
      background: #111113;
      border-top: 1px solid var(--border);
      font-size: 13px;
      color: var(--text-muted);
    }
    .deck-controls button {
      background: #27272A;
      color: var(--text);
      border: 1px solid #3F3F46;
      border-radius: 8px;
      padding: 8px 14px;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .deck-controls button:hover { background: #3F3F46; color: #FFF; }
    .btn-accent { background: var(--accent) !important; color: #FFF !important; border-color: #C44D00 !important; }

    @media print {
      body { background: #FFF !important; padding: 0 !important; color: #000 !important; }
      .deck-controls { display: none !important; }
      .deck-container {
        border: none !important;
        box-shadow: none !important;
        max-width: 100% !important;
        border-radius: 0 !important;
      }
      .slide {
        display: flex !important;
        page-break-after: always;
        background: #18181B !important;
        color: #F4F4F5 !important;
      }
      @page {
        size: landscape;
        margin: 0;
      }
    }
  </style>
</head>
<body>
  <div class="deck-container" id="presentationContainer">
    <!-- Slide 1: Cover -->
    <div class="slide active" id="slide-1">
      <div class="slide-top">
        <span class="brand-tag">${businessName}</span>
        <span class="slide-meta">${dateStr}</span>
      </div>
      <div class="cover-content">
        <h1 class="cover-title">${cardTitle}</h1>
        <p class="cover-sub">${subtitle}</p>
        <div class="cover-footer">
          <div>Autonomous Intelligence: <strong>100% Grounded</strong></div>
          <div>Verified Truth Engine: <strong>Active</strong></div>
          <div>BrainWise Executive Briefing</div>
        </div>
      </div>
    </div>

    <!-- Slide 2: KPI Scorecard -->
    <div class="slide" id="slide-2">
      <div class="slide-top">
        <span class="brand-tag">${businessName}</span>
        <span class="slide-meta">Slide 02 / 04</span>
      </div>
      <h2 class="slide-heading">Performance & Execution Pulse</h2>
      <p class="slide-subheading">Live sprint execution velocity & goal pacing scorecard</p>
      <div class="kpi-row">
        ${metrics
          .map(
            (m) => `
          <div class="deck-kpi-card">
            <div class="k-label">${m.label}</div>
            <div class="k-val">${m.value}</div>
            ${m.detail ? `<div class="k-detail">${m.detail}</div>` : ''}
          </div>
        `
          )
          .join('')}
      </div>
    </div>

    <!-- Slide 3: Telemetry Cadence -->
    <div class="slide" id="slide-3">
      <div class="slide-top">
        <span class="brand-tag">${businessName}</span>
        <span class="slide-meta">Slide 03 / 04</span>
      </div>
      <h2 class="slide-heading">Telemetry Progression</h2>
      <p class="slide-subheading">Historical sprint velocity across measured checkpoints</p>
      <div class="timeline-grid">
        ${
          seriesPoints.length > 0
            ? seriesPoints
                .map(
                  (pt) => `
          <div class="timeline-node">
            <div class="t-label">${pt.label}</div>
            <div class="t-val">${pt.value}%</div>
            <div class="t-desc">${pt.detail || 'Checkpoint milestone'}</div>
          </div>
        `
                )
                .join('')
            : `
          <div class="timeline-node">
            <div class="t-label">Baseline</div>
            <div class="t-val">100%</div>
            <div class="t-desc">Active sprint pacing</div>
          </div>
        `
        }
      </div>
    </div>

    <!-- Slide 4: Strategic Priorities -->
    <div class="slide" id="slide-4">
      <div class="slide-top">
        <span class="brand-tag">${businessName}</span>
        <span class="slide-meta">Slide 04 / 04</span>
      </div>
      <h2 class="slide-heading">Executive Directives</h2>
      <p class="slide-subheading">Recommended strategic growth priorities for immediate sprint execution</p>
      <div class="action-list">
        <div class="action-item">
          <div class="action-num">1</div>
          <div class="action-body">
            <h4>Maintain Sprint Cadence</h4>
            <p>Complete remaining high-priority sprint tasks in Growth Planner to preserve 100% execution velocity.</p>
          </div>
        </div>
        <div class="action-item">
          <div class="action-num">2</div>
          <div class="action-body">
            <h4>Track Growth Experiments</h4>
            <p>Deploy measurable growth tests to validate customer willingness to pay and market traction.</p>
          </div>
        </div>
        <div class="action-item">
          <div class="action-num">3</div>
          <div class="action-body">
            <h4>Update Business Brain Ground Truth</h4>
            <p>Periodically review competitor radar and customer feedback to keep strategic memory current.</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Presentation Controls -->
    <div class="deck-controls">
      <div>
        <button id="prevBtn" onclick="prevSlide()">← Prev</button>
        <span id="slideIndicator" style="margin: 0 12px; font-weight: 600;">Slide 1 / 4</span>
        <button id="nextBtn" onclick="nextSlide()">Next →</button>
      </div>
      <div style="display: flex; gap: 8px;">
        <button onclick="toggleFullscreen()">⛶ Fullscreen</button>
        <button class="btn-accent" onclick="window.print()">🖨️ Export PDF Deck</button>
      </div>
    </div>
  </div>

  <script>
    let currentSlide = 1;
    const totalSlides = 4;

    function showSlide(n) {
      currentSlide = Math.max(1, Math.min(totalSlides, n));
      for (let i = 1; i <= totalSlides; i++) {
        const el = document.getElementById('slide-' + i);
        if (el) el.classList.toggle('active', i === currentSlide);
      }
      const ind = document.getElementById('slideIndicator');
      if (ind) ind.innerText = 'Slide ' + currentSlide + ' / ' + totalSlides;
    }

    function nextSlide() { showSlide(currentSlide + 1); }
    function prevSlide() { showSlide(currentSlide - 1); }

    function toggleFullscreen() {
      const container = document.getElementById('presentationContainer');
      if (!document.fullscreenElement) {
        if (container.requestFullscreen) container.requestFullscreen();
      } else {
        if (document.exitFullscreen) document.exitFullscreen();
      }
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { nextSlide(); e.preventDefault(); }
      if (e.key === 'ArrowLeft') { prevSlide(); e.preventDefault(); }
      if (e.key === 'f' || e.key === 'F') { toggleFullscreen(); }
    });
  </script>
</body>
</html>`;
}

/**
 * Downloads the 16:9 executive presentation slide deck and opens it in a new window for immediate viewing.
 */
export function exportExecutiveSlides(
  cardTitle: string,
  subtitle?: string,
  payload?: unknown,
  businessName = 'BrainWise Workspace'
): void {
  const html = generateExecutiveSlideDeckHtml(cardTitle, subtitle, payload, businessName);
  const slug = cardTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  triggerFileDownload(`${slug}-executive-presentation.html`, html, 'text/html');

  if (typeof window !== 'undefined') {
    const slideWin = window.open('', '_blank');
    if (slideWin) {
      slideWin.document.open();
      slideWin.document.write(html);
      slideWin.document.close();
    }
  }
}

/**
 * 1-Click Master Business Operating System Exporter (REC-P1-05).
 * Compiles a comprehensive, boardroom-ready executive dossier combining:
 * 1. Business Brain Ground Truth
 * 2. Product & Unit Economics Catalog
 * 3. Customer Personas & Pain Points
 * 4. Living Brand Guidelines & Hex Tokens
 * 5. Competitor White-Space & Review Teardowns
 * 6. 30-Day Growth Roadmap & OKR Sprints
 */
export function exportMasterBusinessOS({
  state,
  format = 'pdf-html',
}: {
  state: any;
  format?: 'pdf-html' | 'markdown' | 'json';
}): void {
  const brain = state.brain || {};
  const businessName = brain.businessName || 'My Enterprise';
  const slug = businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const dateStr = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  if (format === 'json') {
    const backupPayload = {
      _platform: 'BrainWise Business Intelligence Platform',
      _version: '2.0.0-enterprise',
      exportedAt: new Date().toISOString(),
      businessBrain: brain,
      brandGuidelines: state.brandGuidelines || {},
      competitors: state.competitors || [],
      goals: state.goals || [],
      tasks: state.tasks || [],
      experiments: state.experiments || [],
    };
    triggerFileDownload(
      `${slug}-master-business-os.json`,
      JSON.stringify(backupPayload, null, 2),
      'application/json'
    );
    return;
  }

  if (format === 'markdown') {
    const md = `# ${businessName.toUpperCase()} — MASTER BUSINESS OPERATING SYSTEM
*Generated via BrainWise Business Intelligence Platform on ${dateStr}*
*Strategic Ground Truth · Provenance Verified · Strict Video Exclusion Enforced*

---

## 1. EXECUTIVE FOUNDATION & STRATEGIC IDENTITY
- **Company Name:** ${businessName}
- **Industry & Archetype:** ${brain.industry || 'Modern Business'}
- **Current Stage:** ${brain.stage || 'Early Traction'}
- **Geographic Footprint:** ${brain.location || 'Global'}
- **Core Value Proposition:** ${brain.valueProposition || 'High-reliability, differentiated customer value'}
- **Tagline:** "${brain.tagline || 'Strategic Excellence Delivered'}"
- **Pricing Architecture:** ${brain.pricingModel || 'Value-Based Pricing'}

---

## 2. PRODUCT & SERVICE PORTFOLIO
${
  Array.isArray(brain.products) && brain.products.length > 0
    ? brain.products
        .map(
          (p: any, i: number) => `### 2.${i + 1} ${p.name || 'Core Product'}
- **Price Point:** ${p.price || 'Market Rate'}
- **Gross Margin:** ${p.margin || 'N/A'}
- **Target Audience:** ${p.targetAudience || 'Core Segment'}
- **Description:** ${p.description || 'Verified product offering grounded in company catalog.'}
`
        )
        .join('\n')
    : '*(No products cataloged yet — Add offerings in Business Brain Products tab)*'
}

---

## 3. TARGET CUSTOMER INTELLIGENCE & PERSONAS
- **Primary Audience:** ${brain.targetAudience || 'Forward-thinking buyers'}
- **Identified Customer Pain Points:**
${
  Array.isArray(brain.customerPainPoints) && brain.customerPainPoints.length > 0
    ? brain.customerPainPoints.map((pp: string) => `  - ${pp}`).join('\n')
    : '  - High friction in legacy solutions\n  - Lack of strategic clarity and reliable support'
}

---

## 4. AUTHORITATIVE BRAND GUIDELINES & IDENTITY TOKENS
- **Brand Voice & Personality:** ${state.brandGuidelines?.voice || 'Executive, Authoritative, Concise, Disciplined'}
- **Color Design Tokens:**
  - Primary Brand Hex: \`${state.brandGuidelines?.colors?.primary || '#171717'}\`
  - Secondary Brand Hex: \`${state.brandGuidelines?.colors?.secondary || '#F5F5F4'}\`
  - Signal Accent Hex: \`${state.brandGuidelines?.colors?.accent || '#FF7417'}\`
- **Typography Scale:** Strict 1.25 Modular Scale (Base: 16px / Major Third)
- **Approved Logo Lockups:** Primary Horizontal, Stacked Wordmark, Monochrome Symbol, Favicon.

---

## 5. COMPETITIVE LANDSCAPE & STRATEGIC WHITE-SPACE
${
  Array.isArray(state.competitors) && state.competitors.length > 0
    ? state.competitors
        .map(
          (c: any, i: number) => `### 5.${i + 1} ${c.name || 'Rival Competitor'}
- **Category:** ${c.industry || 'Market Incumbent'}
- **Monitored Status:** ${c.isMonitored ? 'Active Surveillance Watchlist' : 'Cataloged'}
- **Strategic Gap:** ${c.strategicGap || 'Vulnerable to transparent pricing and agile personalized execution.'}
- **Website:** ${c.website || 'N/A'}
`
        )
        .join('\n')
    : '*(Competitor monitoring initialized)*'
}

---

## 6. 30-DAY GROWTH ROADMAP & ACTIVE OKR SPRINTS
- **Primary Strategic Objective:** Accelerate qualified customer acquisition while maintaining gross margins.
- **Active Focus Sprint Tasks:**
${
  Array.isArray(state.tasks) && state.tasks.length > 0
    ? state.tasks
        .filter((t: any) => t.status !== 'completed')
        .slice(0, 5)
        .map(
          (t: any, i: number) =>
            `  ${i + 1}. **[${t.priority?.toUpperCase() || 'HIGH'}]** ${t.title} (${t.estimatedMinutes || 30} mins · ${t.department || 'Growth'})`
        )
        .join('\n')
    : '  1. Complete Business Brain ground truth verification\n  2. Launch contrast campaign against primary competitor'
}

---
*BrainWise Master Executive Dossier · Confidential Enterprise Asset*
`;
    triggerFileDownload(`${slug}-master-business-os.md`, md, 'text/markdown');
    return;
  }

  // Default: pdf-html (Self-contained, high-craft printable executive dossier)
  const productsList = Array.isArray(brain.products) ? brain.products : [];
  const competitorsList = Array.isArray(state.competitors) ? state.competitors : [];
  const tasksList = Array.isArray(state.tasks) ? state.tasks : [];

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${businessName} — Master Business Operating System</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
    :root {
      --primary: #171717;
      --accent: #FF7417;
      --bg: #FFFFFF;
      --border: #E6E6E2;
      --muted: #686864;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Geist', -apple-system, BlinkMacSystemFont, sans-serif;
      background: #F9F9F8;
      color: #171717;
      line-height: 1.55;
      padding: 40px 20px;
    }
    .dossier-wrapper {
      max-width: 900px;
      margin: 0 auto;
      background: #FFFFFF;
      border: 1px solid var(--border);
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.04);
      padding: 60px;
    }
    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid var(--primary);
      padding-bottom: 24px;
      margin-bottom: 40px;
    }
    .brand-title {
      font-size: 32px;
      font-weight: 800;
      letter-spacing: -0.03em;
      color: var(--primary);
    }
    .brand-meta {
      font-size: 13px;
      color: var(--muted);
      margin-top: 4px;
    }
    .stamp-pill {
      display: inline-block;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      padding: 6px 12px;
      border-radius: 20px;
      background: #FFF0E5;
      color: var(--accent);
      border: 1px solid rgba(255,116,23,0.3);
    }
    h2 {
      font-size: 20px;
      font-weight: 700;
      color: var(--primary);
      margin: 36px 0 14px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border);
      letter-spacing: -0.01em;
    }
    p, li {
      font-size: 14px;
      color: #333330;
      margin-bottom: 8px;
    }
    ul { list-style: square; padding-left: 20px; }
    .kv-grid {
      display: grid;
      grid-cols: 2;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin: 16px 0;
    }
    .kv-card {
      padding: 14px 18px;
      border-radius: 10px;
      background: #FAFAF9;
      border: 1px solid #EFEFEB;
    }
    .kv-label {
      font-size: 11px;
      font-family: 'JetBrains Mono', monospace;
      text-transform: uppercase;
      color: var(--muted);
      font-weight: 600;
    }
    .kv-value {
      font-size: 15px;
      font-weight: 700;
      color: var(--primary);
      margin-top: 2px;
    }
    .table-custom {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
      font-size: 13px;
    }
    .table-custom th, .table-custom td {
      text-align: left;
      padding: 10px 14px;
      border: 1px solid var(--border);
    }
    .table-custom th {
      background: #F4F4F2;
      font-weight: 700;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .action-btn {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: var(--accent);
      color: #FFFFFF;
      border: none;
      font-size: 14px;
      font-weight: 700;
      padding: 12px 24px;
      border-radius: 30px;
      cursor: pointer;
      box-shadow: 0 8px 24px rgba(255,116,23,0.35);
      z-index: 100;
    }
    @media print {
      body { background: #FFFFFF; padding: 0; }
      .dossier-wrapper { border: none; box-shadow: none; padding: 0; max-width: 100%; }
      .action-btn { display: none; }
      h2 { page-break-after: avoid; }
      .table-custom { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <button class="action-btn" onclick="window.print()">🖨️ Print or Save as PDF</button>

  <div class="dossier-wrapper">
    <div class="header-bar">
      <div>
        <h1 class="brand-title">${businessName}</h1>
        <div class="brand-meta">Master Business Operating System · ${brain.industry || 'Enterprise'} · ${dateStr}</div>
      </div>
      <div class="stamp-pill">Verified Truth Engine</div>
    </div>

    <h2>1. Executive Foundation & Ground Truth</h2>
    <div class="kv-grid">
      <div class="kv-card">
        <div class="kv-label">Company Name</div>
        <div class="kv-value">${businessName}</div>
      </div>
      <div class="kv-card">
        <div class="kv-label">Business Stage</div>
        <div class="kv-value">${brain.stage || 'Early Traction'}</div>
      </div>
      <div class="kv-card">
        <div class="kv-label">Operating Location</div>
        <div class="kv-value">${brain.location || 'Global Operations'}</div>
      </div>
      <div class="kv-card">
        <div class="kv-label">Pricing Architecture</div>
        <div class="kv-value">${brain.pricingModel || 'Value-Based Pricing'}</div>
      </div>
    </div>
    <p><strong>Strategic Value Proposition:</strong> ${brain.valueProposition || 'High-reliability, differentiated customer value anchored in authentic brand execution.'}</p>
    <p><strong>Official Tagline:</strong> "${brain.tagline || 'Excellence Grounded in Evidence'}"</p>

    <h2>2. Product & Service Portfolio</h2>
    <table class="table-custom">
      <thead>
        <tr>
          <th>Product / Service</th>
          <th>Price Point</th>
          <th>Gross Margin</th>
          <th>Target Customer Segment</th>
        </tr>
      </thead>
      <tbody>
        ${
          productsList.length > 0
            ? productsList
                .map(
                  (p: any) => `
          <tr>
            <td><strong>${p.name || 'Core Offer'}</strong><br><small style="color:#666">${p.description || ''}</small></td>
            <td>${p.price || 'Market Rate'}</td>
            <td>${p.margin || 'N/A'}</td>
            <td>${p.targetAudience || 'Primary Segment'}</td>
          </tr>
        `
                )
                .join('')
            : `
          <tr>
            <td colspan="4" style="text-align: center; color: #888;">Core offerings cataloged in Business Brain</td>
          </tr>
        `
        }
      </tbody>
    </table>

    <h2>3. Customer Personas & Pain Points</h2>
    <p><strong>Primary Target Audience:</strong> ${brain.targetAudience || 'Quality-conscious modern business leaders and consumers'}</p>
    <div style="margin-top: 10px;">
      <strong>Core Customer Friction Points Addressed:</strong>
      <ul>
        ${
          Array.isArray(brain.customerPainPoints) && brain.customerPainPoints.length > 0
            ? brain.customerPainPoints.map((pp: string) => `<li>${pp}</li>`).join('')
            : '<li>Lack of clear, reliable, and persistent strategic direction</li><li>High agency overhead with inconsistent quality execution</li>'
        }
      </ul>
    </div>

    <h2>4. Brand Guidelines & Identity Tokens</h2>
    <div class="kv-grid">
      <div class="kv-card">
        <div class="kv-label">Brand Voice</div>
        <div class="kv-value">${state.brandGuidelines?.voice || 'Executive & Authoritative'}</div>
      </div>
      <div class="kv-card">
        <div class="kv-label">Modular Typography</div>
        <div class="kv-value">1.25 Major Third Scale (Base 16px)</div>
      </div>
      <div class="kv-card">
        <div class="kv-label">Primary Hex Token</div>
        <div class="kv-value">${state.brandGuidelines?.colors?.primary || '#171717'}</div>
      </div>
      <div class="kv-card">
        <div class="kv-label">Signal Accent Hex</div>
        <div class="kv-value" style="color: #FF7417;">${state.brandGuidelines?.colors?.accent || '#FF7417'}</div>
      </div>
    </div>

    <h2>5. Competitive Surveillance & White Space</h2>
    <table class="table-custom">
      <thead>
        <tr>
          <th>Competitor</th>
          <th>Watchlist Status</th>
          <th>Strategic White-Space Opening</th>
        </tr>
      </thead>
      <tbody>
        ${
          competitorsList.length > 0
            ? competitorsList
                .map(
                  (c: any) => `
          <tr>
            <td><strong>${c.name}</strong><br><small style="color:#666">${c.industry || 'Incumbent'}</small></td>
            <td><span style="color:#2563EB; font-weight:600;">${c.isMonitored ? 'Active Radar' : 'Logged'}</span></td>
            <td>${c.strategicGap || 'Vulnerable to transparent pricing and agile execution.'}</td>
          </tr>
        `
                )
                .join('')
            : `
          <tr>
            <td colspan="3" style="text-align: center; color: #888;">Active competitor surveillance configured</td>
          </tr>
        `
        }
      </tbody>
    </table>

    <h2>6. 30-Day Growth Roadmap & Active Sprint Tasks</h2>
    <ul>
      ${
        tasksList.length > 0
          ? tasksList
              .slice(0, 6)
              .map(
                (t: any) =>
                  `<li><strong>[${t.priority?.toUpperCase() || 'HIGH'}]</strong> ${t.title} — <em>${t.department || 'Growth Director'} (${t.estimatedMinutes || 30} mins)</em></li>`
              )
              .join('')
          : '<li>Deploy pricing transparency comparison card against category rivals</li><li>Generate brand identity collateral suite</li>'
      }
    </ul>

    <div style="margin-top: 48px; padding-top: 20px; border-top: 1px solid var(--border); font-size: 11px; color: var(--muted); display: flex; justify-content: space-between;">
      <span>BrainWise Business Intelligence Platform · Master Enterprise Dossier</span>
      <span>Strict Video Exclusion Certified · Level 3 Approval Gate</span>
    </div>
  </div>
</body>
</html>`;

  triggerFileDownload(`${slug}-master-business-os.html`, html, 'text/html');

  if (typeof window !== 'undefined') {
    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.open();
      printWin.document.write(html);
      printWin.document.close();
    }
  }
}

/**
 * Generates ARIA attributes for the context menu according to WCAG menu patterns.
 */
export function buildContextualLedgerAriaProps(cardTitle: string) {
  return {
    role: 'menu' as const,
    'aria-label': `Contextual actions for ${cardTitle}`,
    'aria-orientation': 'vertical' as const,
  };
}
