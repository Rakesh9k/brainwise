import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import express from 'express';
import { chromium, type Browser, type Page } from 'playwright';

const PORT = 4173;
const SCREENSHOT_DIR = path.resolve(process.cwd(), 'docs/design-freeze/screenshots');

const VIEWPORTS = [
  { name: 'desktop-1440', width: 1440, height: 900, category: 'Desktop' },
  { name: 'desktop-1920', width: 1920, height: 1080, category: 'Desktop Large' },
  { name: 'laptop-1366', width: 1366, height: 768, category: 'Laptop' },
  { name: 'tablet-landscape-1024', width: 1024, height: 768, category: 'Tablet Landscape' },
  { name: 'tablet-portrait-768', width: 768, height: 1024, category: 'Tablet Portrait' },
  { name: 'mobile-iphone14-390', width: 390, height: 844, category: 'Mobile' },
  { name: 'mobile-iphone-se-375', width: 375, height: 812, category: 'Mobile Compact' },
];

async function startStaticServer(): Promise<http.Server> {
  const app = express();
  const distDir = path.resolve(process.cwd(), 'dist');
  app.use(express.static(distDir));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });

  return new Promise((resolve) => {
    const server = app.listen(PORT, '127.0.0.1', () => {
      console.log(`Test audit server running at http://127.0.0.1:${PORT}`);
      resolve(server);
    });
  });
}

async function checkHorizontalOverflow(page: Page): Promise<{ hasOverflow: boolean; scrollWidth: number; clientWidth: number }> {
  return await page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    const scrollWidth = Math.max(doc.scrollWidth, body.scrollWidth);
    const clientWidth = window.innerWidth;
    return {
      hasOverflow: scrollWidth > clientWidth + 1, // 1px rounding tolerance
      scrollWidth,
      clientWidth,
    };
  });
}

async function runAudit() {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  const server = await startStaticServer();
  const browser: Browser = await chromium.launch({ headless: true });
  const consoleErrors: string[] = [];
  const results: Array<{
    screen: string;
    viewport: string;
    dimensions: string;
    hasOverflow: boolean;
    overflowDetails?: string;
    screenshot: string;
  }> = [];

  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Ignore benign favicon or external font timeouts if any
        if (!text.includes('favicon.ico')) {
          consoleErrors.push(`[Console Error] ${text}`);
        }
      }
    });

    console.log('\n--- 1. Testing Marketing Landing Page across all 7 viewports ---');
    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(400);

      const overflow = await checkHorizontalOverflow(page);
      const filename = `landing-${vp.name}.png`;
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, filename), fullPage: false });

      results.push({
        screen: 'Marketing Landing Page',
        viewport: vp.name,
        dimensions: `${vp.width}x${vp.height}`,
        hasOverflow: overflow.hasOverflow,
        overflowDetails: overflow.hasOverflow ? `scrollWidth ${overflow.scrollWidth} > clientWidth ${overflow.clientWidth}` : 'None',
        screenshot: filename,
      });

      console.log(`✓ Landing [${vp.name}] (${vp.width}x${vp.height}): Overflow=${overflow.hasOverflow ? 'FAIL' : 'PASS'}`);
    }

    console.log('\n--- 2. Testing Authentication & Onboarding Screens ---');
    await page.setViewportSize({ width: 1440, height: 900 });

    // Login screen
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle' });
    const loginLink = page.locator('button:has-text("Sign In"), a:has-text("Sign In")').first();
    if (await loginLink.count()) {
      await loginLink.click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'auth-login.png') });
      console.log('✓ Captured Login Screen');
    }

    // Signup screen
    await page.evaluate(() => {
      localStorage.clear();
    });
    // Trigger login demo shortcut to enter workspace
    const demoButton = page.locator('button:has-text("Demo Access"), button:has-text("One-Click Founder Demo"), button:has-text("Demo Founder Workspace")').first();
    if (await demoButton.count()) {
      await demoButton.click();
      await page.waitForTimeout(500);
      console.log('✓ Successfully entered workspace using Founder Demo shortcut');
    }

    console.log('\n--- 3. Testing Workspace Departments across Desktop & Mobile ---');
    const departments = [
      { id: 'dashboard', name: 'Dashboard' },
      { id: 'business-brain', name: 'Business Brain' },
      { id: 'idea-intelligence', name: 'Idea Intelligence' },
      { id: 'competitive-intelligence', name: 'Competitive Intelligence' },
      { id: 'market-watch', name: 'Market Watch' },
      { id: 'brand-studio', name: 'Brand Studio' },
      { id: 'asset-library', name: 'Asset Library' },
      { id: 'growth-director', name: 'Growth Planner' },
      { id: 'business-performance', name: 'Analytics' },
      { id: 'reports', name: 'Executive Reports' },
      { id: 'settings', name: 'Settings' },
      { id: 'help-support', name: 'Help & Support' },
    ];

    for (const dept of departments) {
      // 1440x900 Desktop
      await page.setViewportSize({ width: 1440, height: 900 });
      // Use sidebar or direct state navigation
      await page.evaluate((route) => {
        window.dispatchEvent(new CustomEvent('brainwise-navigate', { detail: route }));
      }, dept.id);
      await page.waitForTimeout(450);

      const desktopOverflow = await checkHorizontalOverflow(page);
      const desktopFilename = `dept-${dept.id}-desktop-1440.png`;
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, desktopFilename) });

      results.push({
        screen: dept.name,
        viewport: 'desktop-1440',
        dimensions: '1440x900',
        hasOverflow: desktopOverflow.hasOverflow,
        screenshot: desktopFilename,
      });

      // 390x844 Mobile
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(350);
      const mobileOverflow = await checkHorizontalOverflow(page);
      const mobileFilename = `dept-${dept.id}-mobile-390.png`;
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, mobileFilename) });

      results.push({
        screen: dept.name,
        viewport: 'mobile-390',
        dimensions: '390x844',
        hasOverflow: mobileOverflow.hasOverflow,
        screenshot: mobileFilename,
      });

      console.log(`✓ ${dept.name}: Desktop Overflow=${desktopOverflow.hasOverflow ? 'FAIL' : 'PASS'}, Mobile Overflow=${mobileOverflow.hasOverflow ? 'FAIL' : 'PASS'}`);
    }

    console.log('\n--- 4. Testing Modals & Dialogs (Command Palette, Drawers) ---');
    await page.setViewportSize({ width: 1440, height: 900 });
    // Trigger global command palette via ⌘K or button
    const cmdTrigger = page.locator('button[aria-label*="Search"], button:has-text("⌘K"), [data-testid="global-search-trigger"]').first();
    if (await cmdTrigger.count()) {
      await cmdTrigger.click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'dialog-command-palette.png') });
      console.log('✓ Captured Command Palette Dialog');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
    }

    // Write test run summary
    fs.writeFileSync(
      path.resolve(process.cwd(), 'docs/design-freeze/e2e-audit-results.json'),
      JSON.stringify({ timestamp: new Date().toISOString(), results, consoleErrors }, null, 2)
    );

    console.log(`\nAudit completed successfully! Saved ${results.length} screen audits and screenshots to docs/design-freeze/screenshots/`);
    if (consoleErrors.length > 0) {
      console.log(`Found ${consoleErrors.length} console errors:`, consoleErrors);
    } else {
      console.log('✓ Zero critical console errors encountered!');
    }
  } finally {
    await browser.close();
    server.close();
  }
}

runAudit().catch((err) => {
  console.error('E2E Audit Failed:', err);
  process.exit(1);
});
