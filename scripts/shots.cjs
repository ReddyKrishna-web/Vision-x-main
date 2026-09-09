// Dev-only visual review harness: screenshots via system Edge + playwright-core.
// Usage: server running at baseUrl, then: node scripts/shots.cjs [baseUrl] [outDir]
const { chromium } = require('playwright-core');

const BASE = process.argv[2] || 'http://localhost:3119';
const OUT = process.argv[3] || 'C:/Users/aKris/AppData/Local/Temp/opencode/vx-shots';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@visionx.hack';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'VisionX!2026';
const fs = require('node:fs');
fs.mkdirSync(OUT, { recursive: true });

async function withBrowser(viewport, fn) {
  const browser = await chromium.launch({ executablePath: EDGE, args: ['--no-sandbox'] });
  try {
    await fn(browser, viewport);
  } finally {
    await browser.close().catch(() => {});
  }
}

async function shot(name, path, viewport = { width: 1440, height: 900 }) {
  await withBrowser(viewport, async (browser) => {
    const page = await browser.newPage({ viewport });
    try {
      const errors = [];
      page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
      page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('404')) errors.push('console: ' + m.text().slice(0, 160)); });
      await page.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(1500);
      // Walk the page like a reader so scroll reveals + transitions settle.
      await page.evaluate(async () => {
        const h = document.body.scrollHeight;
        for (let y = 0; y < h; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 90)); }
        window.scrollTo(0, 0);
        await new Promise((r) => setTimeout(r, 900));
      });
      await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true, timeout: 30000 });
      console.log(name, errors.length ? JSON.stringify(errors.slice(0, 4)) : 'clean');
    } catch (e) {
      console.log(name, 'SHOT-FAIL ' + e.message.split('\n')[0]);
    }
    await page.close().catch(() => {});
  });
}

async function adminShot(name, path) {
  await withBrowser({ width: 1440, height: 900 }, async (browser) => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const p = await ctx.newPage();
    try {
      await p.goto(BASE + '/admin/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await p.waitForTimeout(1500);
      await p.fill('#a-email', ADMIN_EMAIL);
      await p.fill('#a-pass', ADMIN_PASSWORD);
      await p.click('button[type="submit"]');
      await p.waitForURL('**/admin/dashboard', { timeout: 15000 });
      await p.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await p.waitForTimeout(2500);
      await p.screenshot({ path: `${OUT}/${name}.png`, fullPage: true, timeout: 30000 });
      console.log(name, p.url());
    } catch (e) {
      console.log(name, 'SHOT-FAIL ' + e.message.split('\n')[0]);
    }
    await ctx.close().catch(() => {});
  });
}

(async () => {
  const only = process.argv[4]; // optional single shot name filter
  const jobs = [
    ['01-home', '/', 'pub'],
    ['02-register', '/register', 'pub'],
    ['03-payment', '/payment', 'pub'],
    ['04-admin-login', '/admin/login', 'pub'],
    ['05-home-mobile', '/', 'pub-mobile'],
    ['06-register-mobile', '/register', 'pub-mobile'],
    ['07-dashboard', '/admin/dashboard', 'admin'],
    ['08-registrations', '/admin/registrations', 'admin'],
    ['09-payments', '/admin/payments', 'admin'],
    ['10-datasync', '/admin/data-sync', 'admin'],
    ['11-settings', '/admin/settings', 'admin'],
    ['12-audit', '/admin/audit', 'admin'],
  ];
  for (const [n, path, kind] of jobs) {
    if (only && n !== only) continue;
    if (kind === 'admin') await adminShot(n, path);
    else if (kind === 'pub-mobile') await shot(n, path, { width: 390, height: 844 });
    else await shot(n, path);
  }
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
