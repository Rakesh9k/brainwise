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
export function buildContextualLedgerAriaProps(cardTitle: string) {
  return {
    role: 'menu' as const,
    'aria-label': `Contextual actions for ${cardTitle}`,
    'aria-orientation': 'vertical' as const,
  };
}
