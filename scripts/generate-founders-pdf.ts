import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface Lead {
  id: string;
  founderName: string;
  companyName: string;
  role: string;
  industry: string;
  companyStage: string;
  teamSize: string;
  primaryPlatform: string;
  profileUrl: string;
  location: string;
  corePainPoint: string;
  brainwiseEntryFeature: string;
  outreachHook: string;
}

function parseCsv(csvPath: string): Lead[] {
  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim().length > 0);
  const records: Lead[] = [];

  const csvRegex = /(?:^|,)(?:"([^"]*(?:""[^"]*)*)"|([^",]*))/g;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const matches: string[] = [];
    let match;
    while ((match = csvRegex.exec(line)) !== null) {
      let val = match[1] !== undefined ? match[1].replace(/""/g, '"') : match[2];
      matches.push(val || '');
      if (match.index === csvRegex.lastIndex) {
        csvRegex.lastIndex++;
      }
    }

    if (matches.length >= 13) {
      records.push({
        id: matches[0],
        founderName: matches[1],
        companyName: matches[2],
        role: matches[3],
        industry: matches[4],
        companyStage: matches[5],
        teamSize: matches[6],
        primaryPlatform: matches[7],
        profileUrl: matches[8],
        location: matches[9],
        corePainPoint: matches[10],
        brainwiseEntryFeature: matches[11],
        outreachHook: matches[12]
      });
    }
  }
  return records;
}

function getPlatformBadge(platform: string) {
  if (platform.includes('LinkedIn')) {
    return { bg: '#0A66C215', color: '#0A66C2', border: '#0A66C230' };
  } else if (platform.includes('X')) {
    return { bg: '#00000015', color: '#111827', border: '#00000030' };
  } else if (platform.includes('Reddit')) {
    return { bg: '#FF450015', color: '#FF4500', border: '#FF450030' };
  } else {
    return { bg: '#E1306C15', color: '#E1306C', border: '#E1306C30' };
  }
}

function generateHtml(records: Lead[]): string {
  const total = records.length;
  const linkedinCount = records.filter(r => r.primaryPlatform.includes('LinkedIn')).length;
  const xCount = records.filter(r => r.primaryPlatform.includes('X')).length;
  const redditCount = records.filter(r => r.primaryPlatform.includes('Reddit')).length;
  const igCount = records.filter(r => r.primaryPlatform.includes('Instagram')).length;

  const tableRows = records.map(r => {
    const badge = getPlatformBadge(r.primaryPlatform);
    return `
      <tr>
        <td class="text-center font-mono font-bold">${r.id}</td>
        <td>
          <div class="font-bold text-gray-900">${r.founderName}</div>
          <div class="text-xs text-gray-500">${r.role}</div>
        </td>
        <td>
          <div class="font-semibold text-gray-900">${r.companyName}</div>
          <div class="text-xs text-gray-500">${r.location}</div>
        </td>
        <td>
          <div class="font-medium text-gray-800">${r.industry}</div>
          <div class="text-xs text-gray-500">${r.companyStage} • ${r.teamSize}</div>
        </td>
        <td class="text-center">
          <span class="platform-badge" style="background-color: ${badge.bg}; color: ${badge.color}; border: 1px solid ${badge.border};">
            ${r.primaryPlatform}
          </span>
          <div style="margin-top: 3px;">
            <a href="${r.profileUrl}" class="profile-link" target="_blank">Profile Link</a>
          </div>
        </td>
        <td>
          <div class="text-xs text-red-700 font-semibold mb-1">${r.corePainPoint}</div>
          <div class="feature-tag">${r.brainwiseEntryFeature}</div>
        </td>
        <td class="hook-cell text-xs text-gray-700">
          "${r.outreachHook}"
        </td>
      </tr>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>BrainWise — 1,500 Prospective Founders & Business Operators</title>
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
      font-size: 9.5px;
      line-height: 1.35;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .cover-page {
      page-break-after: always;
      padding: 36px 28px;
      height: 90vh;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .header-tag {
      display: inline-block;
      background: #0284c7;
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
      font-size: 26px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.02em;
      margin-bottom: 6px;
    }

    .subtitle {
      font-size: 13px;
      color: #475569;
      margin-bottom: 24px;
      max-width: 900px;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 14px;
      margin-bottom: 24px;
    }

    .metric-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px;
    }

    .metric-val {
      font-size: 22px;
      font-weight: 800;
      color: #0284c7;
      margin-bottom: 2px;
    }

    .metric-lbl {
      font-size: 10px;
      color: #64748b;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .strategy-section {
      background: #f8fafc;
      border-left: 4px solid #0284c7;
      padding: 16px 20px;
      border-radius: 0 8px 8px 0;
      margin-bottom: 20px;
    }

    .strategy-title {
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 8px;
    }

    .strategy-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 14px;
      font-size: 10.5px;
      color: #475569;
    }

    .strategy-box strong {
      display: block;
      color: #0f172a;
      margin-bottom: 4px;
    }

    .footer-note {
      font-size: 10px;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
      padding-top: 10px;
      display: flex;
      justify-content: space-between;
    }

    .table-container {
      width: 100%;
    }

    .table-header-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0 10px 0;
      border-bottom: 2px solid #0284c7;
      margin-bottom: 8px;
    }

    .table-header-title {
      font-size: 14px;
      font-weight: 800;
      color: #0f172a;
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
      background: #0f172a;
      color: #ffffff;
      font-size: 8.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 6px 5px;
      text-align: left;
      border: 1px solid #1e293b;
    }

    td {
      padding: 5px 5px;
      border-bottom: 1px solid #e2e8f0;
      border-right: 1px solid #f1f5f9;
      vertical-align: top;
      font-size: 8.5px;
    }

    tbody tr:nth-child(even) {
      background-color: #f8fafc;
    }

    .text-center { text-align: center; }
    .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .font-bold { font-weight: 700; }
    .font-semibold { font-weight: 600; }
    .text-red-700 { color: #b91c1c; }
    .mb-1 { margin-bottom: 3px; }

    .platform-badge {
      display: inline-block;
      padding: 2px 5px;
      border-radius: 4px;
      font-weight: 700;
      font-size: 7.5px;
      text-transform: uppercase;
    }

    .profile-link {
      color: #0284c7;
      text-decoration: none;
      font-size: 7.5px;
      font-weight: 600;
    }

    .feature-tag {
      background: #e0f2fe;
      color: #0369a1;
      padding: 2px 4px;
      border-radius: 3px;
      font-size: 7.5px;
      font-weight: 600;
      display: inline-block;
    }

    .hook-cell {
      max-width: 280px;
      line-height: 1.25;
      font-style: italic;
    }
  </style>
</head>
<body>

  <!-- COVER / EXECUTIVE SUMMARY -->
  <div class="cover-page">
    <div>
      <span class="header-tag">Direct Prospecting Intelligence</span>
      <h1>BrainWise — 1,500 Prospective Founders & Business Operators</h1>
      <p class="subtitle">
        Actionable B2B prospect database scanned across LinkedIn, X (Twitter), Reddit, and Instagram. Profiles cover high-intent Indian founders, solo entrepreneurs, D2C brand heads, and agency owners facing acute pain points that BrainWise's persistent Business Brain, Brand Studio, and Competitive Intelligence solve.
      </p>

      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-val">${total.toLocaleString('en-IN')}</div>
          <div class="metric-lbl">Total Prospects</div>
        </div>
        <div class="metric-card">
          <div class="metric-val">${linkedinCount}</div>
          <div class="metric-lbl">LinkedIn Prospects</div>
        </div>
        <div class="metric-card">
          <div class="metric-val">${xCount}</div>
          <div class="metric-lbl">X / Twitter Builders</div>
        </div>
        <div class="metric-card">
          <div class="metric-val">${redditCount}</div>
          <div class="metric-lbl">Reddit Founders</div>
        </div>
        <div class="metric-card">
          <div class="metric-val">${igCount}</div>
          <div class="metric-lbl">Instagram D2C/Retail</div>
        </div>
      </div>

      <div class="strategy-section">
        <div class="strategy-title">Multi-Channel Outbound Conversion Playbooks</div>
        <div class="strategy-grid">
          <div class="strategy-box">
            <strong>1. LinkedIn (B2B SaaS & Growth)</strong>
            Focus on prompt drift and memory loss in ChatGPT. Pitch BrainWise as the persistent ground-truth memory layer for their product, pricing, and buyer personas.
          </div>
          <div class="strategy-box">
            <strong>2. X / Twitter (Indie Hackers & Solo)</strong>
            Engage with #BuildInPublic founders who have technical products but lack GTM/marketing discipline. Pitch 30/60/90-day roadmaps and competitive sizing.
          </div>
          <div class="strategy-box">
            <strong>3. Reddit (Founders & SMBs)</strong>
            Engage natively on r/IndianStartups, r/SaaS, and r/smallbusiness. Share solutions to agency retainer fatigue and ungrounded AI marketing copy.
          </div>
          <div class="strategy-box">
            <strong>4. Instagram (D2C & MSME)</strong>
            Reach out directly to brand handles on Instagram. Offer the Brand Studio for generating print-ready flyers, business stationery, and non-repetitive packaging copy.
          </div>
        </div>
      </div>
    </div>

    <div class="footer-note">
      <span>Generated for BrainWise Outbound Sales & Growth Engineering</span>
      <span>Confidential & Proprietary • November 2026</span>
    </div>
  </div>

  <!-- TABLE (ALL 1500 LEADS) -->
  <div class="table-container">
    <div class="table-header-banner">
      <div class="table-header-title">Master Outbound Prospect List (Leads 1 to 1,500)</div>
      <div style="font-size: 10px; color: #64748b; font-weight: 600;">
        Pan-India Founders & Operators with Personalized Pain Points & Hooks
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 3%;">ID</th>
          <th style="width: 14%;">Founder & Role</th>
          <th style="width: 14%;">Company & City</th>
          <th style="width: 16%;">Vertical & Stage</th>
          <th style="width: 10%;" class="text-center">Platform & Link</th>
          <th style="width: 19%;">Pain Point & BrainWise Fit</th>
          <th style="width: 24%;">Personalized Outreach Hook</th>
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
  console.log('Generating HTML report for 1,500 founder prospects...');
  const csvPath = path.resolve(process.cwd(), 'brainwise_prospective_founders_1500.csv');
  const records = parseCsv(csvPath);
  console.log(`Parsed ${records.length} founder records from CSV.`);

  const htmlContent = generateHtml(records);
  const htmlPath = path.resolve(process.cwd(), 'brainwise_prospective_founders_1500.html');
  fs.writeFileSync(htmlPath, htmlContent, 'utf-8');
  console.log(`Generated HTML report at: ${htmlPath}`);

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const browserPath = fs.existsSync(chromePath) ? chromePath : edgePath;

  const pdfPath = path.resolve(process.cwd(), 'brainwise_prospective_founders_1500.pdf');
  console.log(`Compiling 1,500-lead PDF via headless browser (${browserPath})...`);

  const cmd = `"${browserPath}" --headless --disable-gpu --no-pdf-header-footer --print-to-pdf="${pdfPath}" "${htmlPath}"`;
  try {
    execSync(cmd, { stdio: 'inherit' });
  } catch (e) {
    // ignore non-zero exit if process detached
  }

  // Poll for file existence (Chrome on Windows writes asynchronously)
  let waited = 0;
  while (!fs.existsSync(pdfPath) && waited < 20) {
    execSync('powershell -Command "Start-Sleep -Seconds 1"');
    waited++;
  }

  if (fs.existsSync(pdfPath)) {
    // Wait an extra second for write to flush
    execSync('powershell -Command "Start-Sleep -Seconds 2"');
    const stats = fs.statSync(pdfPath);
    console.log(`\n🎉 1,500-LEAD PDF GENERATED SUCCESSFULLY!`);
    console.log(`File: ${pdfPath}`);
    console.log(`Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  } else {
    console.error('Failed to generate PDF file.');
  }
}

main();
