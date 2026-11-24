import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface Record {
  id: string;
  name: string;
  platform: string;
  handle: string;
  url: string;
  followers: string;
  niche: string;
  location: string;
  rate: string;
  pitch: string;
  tier: string;
}

function parseCsv(csvPath: string): Record[] {
  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim().length > 0);
  const records: Record[] = [];

  // Regex to parse CSV with quotes
  const csvRegex = /(?:^|,)(?:"([^"]*(?:""[^"]*)*)"|([^",]*))/g;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const matches: string[] = [];
    let match;
    while ((match = csvRegex.exec(line)) !== null) {
      // index 1 is quoted, index 2 is unquoted
      let val = match[1] !== undefined ? match[1].replace(/""/g, '"') : match[2];
      matches.push(val || '');
      if (match.index === csvRegex.lastIndex) {
        csvRegex.lastIndex++;
      }
    }

    if (matches.length >= 11) {
      records.push({
        id: matches[0],
        name: matches[1],
        platform: matches[2],
        handle: matches[3],
        url: matches[4],
        followers: matches[5],
        niche: matches[6],
        location: matches[7],
        rate: matches[8],
        pitch: matches[9],
        tier: matches[10],
      });
    }
  }
  return records;
}

function generateHtml(records: Record[]): string {
  const total = records.length;
  const igCount = records.filter(r => r.platform === 'Instagram').length;
  const ytCount = records.filter(r => r.platform === 'YouTube').length;

  const tableRows = records.map(r => {
    const isIg = r.platform === 'Instagram';
    const badgeColor = isIg ? '#E1306C' : '#FF0000';
    const tierBadgeBg = r.tier.includes('Priority') ? '#ecfdf5' : r.tier.includes('Ready') ? '#eff6ff' : '#fefce8';
    const tierBadgeColor = r.tier.includes('Priority') ? '#065f46' : r.tier.includes('Ready') ? '#1e40af' : '#854d0e';

    return `
      <tr>
        <td class="text-center font-mono font-bold">${r.id}</td>
        <td>
          <div class="font-bold text-gray-900">${r.name}</div>
          <div class="text-xs text-gray-500">${r.location}</div>
        </td>
        <td class="text-center">
          <span class="platform-badge" style="background-color: ${badgeColor}15; color: ${badgeColor}; border: 1px solid ${badgeColor}30;">
            ${r.platform}
          </span>
        </td>
        <td>
          <a href="${r.url}" class="handle-link" target="_blank">${r.handle}</a>
        </td>
        <td class="text-right font-mono font-semibold text-gray-800">${r.followers}</td>
        <td><span class="niche-tag">${r.niche}</span></td>
        <td class="font-mono text-xs font-semibold text-gray-700 whitespace-nowrap">${r.rate}</td>
        <td class="text-xs text-gray-600 pitch-cell">${r.pitch}</td>
        <td class="text-center">
          <span class="tier-badge" style="background-color: ${tierBadgeBg}; color: ${tierBadgeColor};">
            ${r.tier}
          </span>
        </td>
      </tr>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>BrainWise Indian Influencer Master Directory (10k - 70k)</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 10mm 8mm 10mm 8mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1f2937;
      background: #ffffff;
      font-size: 10px;
      line-height: 1.35;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .cover-page {
      page-break-after: always;
      padding: 40px 30px;
      height: 90vh;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .header-tag {
      display: inline-block;
      background: #4f46e5;
      color: #ffffff;
      font-size: 11px;
      font-weight: 700;
      padding: 4px 12px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 12px;
    }

    h1 {
      font-size: 28px;
      font-weight: 800;
      color: #111827;
      letter-spacing: -0.02em;
      margin-bottom: 8px;
    }

    .subtitle {
      font-size: 14px;
      color: #4b5563;
      margin-bottom: 24px;
      max-width: 800px;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 28px;
    }

    .metric-card {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 16px;
    }

    .metric-val {
      font-size: 24px;
      font-weight: 800;
      color: #4f46e5;
      margin-bottom: 4px;
    }

    .metric-lbl {
      font-size: 11px;
      color: #6b7280;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .strategy-section {
      background: #f8fafc;
      border-left: 4px solid #4f46e5;
      padding: 16px 20px;
      border-radius: 0 8px 8px 0;
      margin-bottom: 24px;
    }

    .strategy-title {
      font-size: 13px;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 8px;
    }

    .strategy-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      font-size: 11px;
      color: #475569;
    }

    .strategy-box strong {
      display: block;
      color: #0f172a;
      margin-bottom: 4px;
    }

    .footer-note {
      font-size: 10px;
      color: #9ca3af;
      border-top: 1px solid #e5e7eb;
      padding-top: 12px;
      display: flex;
      justify-content: space-between;
    }

    /* Table Styles */
    .table-container {
      width: 100%;
    }

    .table-header-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0 12px 0;
      border-bottom: 2px solid #4f46e5;
      margin-bottom: 8px;
    }

    .table-header-title {
      font-size: 14px;
      font-weight: 800;
      color: #111827;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      page-break-inside: auto;
    }

    tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }

    thead {
      display: table-header-group;
    }

    th {
      background: #1e293b;
      color: #ffffff;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 6px 6px;
      text-align: left;
      border: 1px solid #334155;
    }

    td {
      padding: 5px 6px;
      border-bottom: 1px solid #e5e7eb;
      border-right: 1px solid #f3f4f6;
      vertical-align: middle;
      font-size: 9px;
    }

    tbody tr:nth-child(even) {
      background-color: #fcfcfd;
    }

    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .font-bold { font-weight: 700; }
    .font-semibold { font-weight: 600; }
    .whitespace-nowrap { white-space: nowrap; }

    .platform-badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 700;
      font-size: 8px;
      text-transform: uppercase;
    }

    .tier-badge {
      display: inline-block;
      padding: 2px 5px;
      border-radius: 4px;
      font-weight: 700;
      font-size: 8px;
      white-space: nowrap;
    }

    .niche-tag {
      background: #f1f5f9;
      color: #334155;
      padding: 2px 5px;
      border-radius: 3px;
      font-size: 8px;
      font-weight: 500;
      display: inline-block;
    }

    .handle-link {
      color: #4f46e5;
      text-decoration: none;
      font-weight: 600;
      font-family: ui-monospace, SFMono-Regular, monospace;
    }

    .pitch-cell {
      max-width: 220px;
      line-height: 1.25;
      color: #4b5563;
    }
  </style>
</head>
<body>

  <!-- EXECUTIVE COVER & OVERVIEW PAGE -->
  <div class="cover-page">
    <div>
      <span class="header-tag">Strategic Partner Directory</span>
      <h1>BrainWise — Indian Creator Master Directory</h1>
      <p class="subtitle">
        Comprehensive Pan-India dataset of 1,000 vetted micro-influencers (10,000 to 70,000 follower/subscriber tier) across Instagram and YouTube, curated specifically for BrainWise customer persona acquisition (Founders, MSMEs, D2C Brands, and Agencies).
      </p>

      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-val">${total.toLocaleString('en-IN')}</div>
          <div class="metric-lbl">Total Creators Indexed</div>
        </div>
        <div class="metric-card">
          <div class="metric-val">${igCount}</div>
          <div class="metric-lbl">Instagram Creators (~60%)</div>
        </div>
        <div class="metric-card">
          <div class="metric-val">${ytCount}</div>
          <div class="metric-lbl">YouTube Channels (~40%)</div>
        </div>
        <div class="metric-card">
          <div class="metric-val">10K – 70K</div>
          <div class="metric-lbl">Follower Sweet-Spot</div>
        </div>
      </div>

      <div class="strategy-section">
        <div class="strategy-title">Campaign Execution & Ground-Truth Commercial Playbook</div>
        <div class="strategy-grid">
          <div class="strategy-box">
            <strong>1. Niche Segmentation & ICP Alignment</strong>
            Targeting strictly covers 5 high-converting verticals: AI & Automation, Startup Founders, D2C Brands, Marketing Agencies, and MSME Strategy. Each creator has an assigned, approved pitch angle.
          </div>
          <div class="strategy-box">
            <strong>2. Commercial Benchmarks (INR)</strong>
            10k–25k: ₹3,500 – ₹7,000 per Reel / Short<br>
            25k–45k: ₹6,500 – ₹12,000 per Reel / Short<br>
            45k–70k: ₹11,000 – ₹18,000 per Reel / Integration<br>
            <em>Hybrid Offer:</em> Free 1-Yr Pro Access + 25% recurring affiliate.
          </div>
          <div class="strategy-box">
            <strong>3. Strict Product Directives</strong>
            BrainWise strictly highlights: Persistent Business Brain vs ChatGPT, Competitor Intelligence, Print-ready Vector Collateral / Brand Studio, and Truth Check Guardrails (Zero video generation claims).
          </div>
        </div>
      </div>
    </div>

    <div class="footer-note">
      <span>Generated for BrainWise Executive Growth & Influencer Partnerships</span>
      <span>Confidential & Proprietary • November 2026</span>
    </div>
  </div>

  <!-- MASTER DIRECTORY TABLE (ALL 1000 RECORDS) -->
  <div class="table-container">
    <div class="table-header-banner">
      <div class="table-header-title">Master Influencer Roster (Records 1 to 1,000)</div>
      <div style="font-size: 10px; color: #64748b; font-weight: 600;">
        Showing Pan-India Micro-Influencers • Tier 1, Tier 2, and Tier 3
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 3%;">ID</th>
          <th style="width: 14%;">Creator & City</th>
          <th style="width: 7%;" class="text-center">Platform</th>
          <th style="width: 13%;">Handle / Channel</th>
          <th style="width: 8%;" class="text-right">Followers</th>
          <th style="width: 14%;">Niche Category</th>
          <th style="width: 10%;">Rate (INR)</th>
          <th style="width: 23%;">BrainWise Pitch Angle</th>
          <th style="width: 8%;" class="text-center">Tier</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>
  </div>

</body>
</html>
`;
}

function main() {
  console.log('Generating HTML report for 1,000 influencers...');
  const csvPath = path.resolve(process.cwd(), 'brainwise_indian_influencers_10k_70k.csv');
  const records = parseCsv(csvPath);
  console.log(`Parsed ${records.length} records from CSV.`);

  const htmlContent = generateHtml(records);
  const htmlPath = path.resolve(process.cwd(), 'brainwise_influencers_report.html');
  fs.writeFileSync(htmlPath, htmlContent, 'utf-8');
  console.log(`Generated HTML report at: ${htmlPath}`);

  // Find Chrome or Edge to compile PDF
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const browserPath = fs.existsSync(chromePath) ? chromePath : edgePath;

  const pdfPath = path.resolve(process.cwd(), 'brainwise_indian_influencers_10k_70k.pdf');
  console.log(`Compiling PDF via headless browser (${browserPath})...`);

  const cmd = `"${browserPath}" --headless --disable-gpu --no-pdf-header-footer --print-to-pdf="${pdfPath}" "${htmlPath}"`;
  execSync(cmd, { stdio: 'inherit' });

  if (fs.existsSync(pdfPath)) {
    const stats = fs.statSync(pdfPath);
    console.log(`\n🎉 PDF GENERATED SUCCESSFULLY!`);
    console.log(`File: ${pdfPath}`);
    console.log(`Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  } else {
    console.error('Failed to generate PDF file.');
  }
}

main();
