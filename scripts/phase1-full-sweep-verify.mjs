import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE_URL = process.env.MCG_BASE_URL ?? 'http://127.0.0.1:3000';
const OUT_DIR = process.env.MCG_VERIFY_OUT_DIR ?? '/tmp/mcg-phase1-sweep';

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 375, height: 812 },
];

const PAGE_MATRIX = [
  { key: 'home', path: '/' },
  { key: 'packs', path: '/packs' },
  { key: 'collection', path: '/collection' },
  { key: 'contests', path: '/contests' },
  { key: 'contestDetail', path: '/contests/__FIRST__' },
  { key: 'rewards', path: '/rewards' },
  { key: 'profile', path: '/profile' },
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

async function getLayoutMetrics(page) {
  return page.evaluate(() => {
    const overflowAmount = Math.max(0, document.documentElement.scrollWidth - window.innerWidth);
    const clipped = [];
    const all = Array.from(document.querySelectorAll('body *'));
    for (const el of all) {
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      const rect = el.getBoundingClientRect();
      if (rect.width < 8 || rect.height < 8) continue;
      if (rect.right > window.innerWidth + 1 || rect.left < -1) {
        clipped.push({
          tag: el.tagName.toLowerCase(),
          cls: (el.className || '').toString().slice(0, 80),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          w: Math.round(rect.width),
        });
        if (clipped.length >= 60) break;
      }
    }
    return {
      overflowX: overflowAmount,
      clippedCount: clipped.length,
      clippedSample: clipped.slice(0, 12),
      viewport: { width: window.innerWidth, height: window.innerHeight },
      url: location.href,
    };
  });
}

function verdictFromMetrics(metrics) {
  if (metrics.overflowX <= 1 && metrics.clippedCount <= 2) return 'PASS';
  if (metrics.overflowX <= 8 && metrics.clippedCount <= 10) return 'PARTIAL';
  return 'FAIL';
}

async function gotoStable(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.waitForTimeout(1200);
}

async function findFirstContestPath(page) {
  const href = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll('a[href^="/contests/"]'));
    const found = anchors
      .map((a) => a.getAttribute('href'))
      .find((h) => h && h !== '/contests' && !h.includes('/create'));
    return found || null;
  });
  return href;
}

async function screenshotWithMetrics(page, key, viewportName, report) {
  const shotPath = path.join(OUT_DIR, `${key}_${viewportName}.png`);
  await page.screenshot({ path: shotPath, fullPage: true });
  const metrics = await getLayoutMetrics(page);
  report.pages[key] ??= {};
  report.pages[key][viewportName] = {
    screenshot: shotPath,
    ...metrics,
    verdict: verdictFromMetrics(metrics),
  };
}

async function tryClick(page, selectorsOrNames) {
  for (const entry of selectorsOrNames) {
    try {
      if (entry.type === 'role') {
        const locator = page.getByRole(entry.role, { name: entry.name }).first();
        if (await locator.count()) {
          await locator.click({ timeout: 1500 });
          await page.waitForTimeout(800);
          return true;
        }
      } else {
        const locator = page.locator(entry.selector).first();
        if (await locator.count()) {
          await locator.click({ timeout: 1500 });
          await page.waitForTimeout(800);
          return true;
        }
      }
    } catch {}
  }
  return false;
}

async function verifyModal(page, key, openActions, modalSelector, report) {
  await tryClick(page, openActions);
  const open = (await page.locator(modalSelector).count()) > 0;
  const shotPath = path.join(OUT_DIR, `${key}.png`);
  await page.screenshot({ path: shotPath, fullPage: true });
  const metrics = open ? await getLayoutMetrics(page) : { overflowX: null, clippedCount: null, clippedSample: [], viewport: null, url: page.url() };
  report.modals[key] = {
    open,
    selector: modalSelector,
    screenshot: shotPath,
    ...metrics,
    verdict: open ? verdictFromMetrics(metrics) : 'PARTIAL',
    explanation: open ? 'Modal opened and measured.' : 'Modal entrypoint was not available in this state.',
  };
  if (open) {
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(300);
  }
}

async function main() {
  ensureDir(OUT_DIR);
  const report = { baseUrl: BASE_URL, generatedAt: new Date().toISOString(), pages: {}, modals: {} };

  const browser = await chromium.launch({ headless: true });
  try {
    let firstContestPath = null;

    for (const vp of VIEWPORTS) {
      const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, ignoreHTTPSErrors: true });
      const page = await context.newPage();

      await gotoStable(page, `${BASE_URL}/contests`);
      firstContestPath = firstContestPath || (await findFirstContestPath(page));

      for (const pageDef of PAGE_MATRIX) {
        let targetPath = pageDef.path;
        if (targetPath.includes('__FIRST__')) {
          if (!firstContestPath) {
            report.pages[pageDef.key] ??= {};
            report.pages[pageDef.key][vp.name] = {
              verdict: 'PARTIAL',
              screenshot: null,
              overflowX: null,
              clippedCount: null,
              explanation: 'No contest detail link found from /contests.',
            };
            continue;
          }
          targetPath = firstContestPath;
        }
        const url = targetPath.startsWith('http') ? targetPath : `${BASE_URL}${targetPath}`;
        await gotoStable(page, url);
        await screenshotWithMetrics(page, pageDef.key, vp.name, report);
      }

      await context.close();
    }

    // Mobile modal sweep
    const context = await browser.newContext({ viewport: { width: 375, height: 812 }, ignoreHTTPSErrors: true });
    const page = await context.newPage();

    await gotoStable(page, `${BASE_URL}/packs`);
    await verifyModal(page, 'pack_reveal_375', [
      { type: 'role', role: 'button', name: /open pack|reveal|open now|open/i },
      { type: 'selector', selector: '[data-testid*="reveal" i], .pack-reveal-trigger, .mcg-pack-open-btn' },
    ], '.pack-reveal-modal, .pack-preview-modal, .pack-open-modal, [role="dialog"]', report);

    await verifyModal(page, 'pack_complete_375', [
      { type: 'role', role: 'button', name: /continue|done|complete|finish/i },
      { type: 'selector', selector: '.pack-complete-trigger, [data-testid*="complete" i]' },
    ], '.pack-complete-modal, .pack-finish-modal, [role="dialog"]', report);

    await gotoStable(page, `${BASE_URL}/profile`);
    await verifyModal(page, 'account_settings_375', [
      { type: 'role', role: 'button', name: /account settings|settings/i },
      { type: 'selector', selector: '.profile-settings-open, [data-testid="profile-settings-open"]' },
    ], '.profile-settings-modal, [role="dialog"]', report);

    await verifyModal(page, 'showcase_picker_375', [
      { type: 'role', role: 'button', name: /showcase|edit showcase|pick showcase|manage showcase/i },
      { type: 'selector', selector: '.profile-showcase-picker, .profile-showcase-open, [data-testid*="showcase" i]' },
    ], '.profile-showcase-modal, [role="dialog"]', report);

    await gotoStable(page, `${BASE_URL}/contests`);
    const firstContest = await findFirstContestPath(page);
    if (firstContest) {
      await gotoStable(page, `${BASE_URL}${firstContest}`);
      await verifyModal(page, 'lineup_picker_375', [
        { type: 'role', role: 'button', name: /edit lineup|continue lineup|build lineup|add card|select|replace/i },
        { type: 'selector', selector: '.contest-detail-lineup-slot.actionable, .contest-detail-inline-builder .mcg-btn, .contest-detail-hero-cta' },
      ], '.contest-modal.team-builder-modal, .stitch-lineup-modal.bldr-modal, [role="dialog"]', report);
    } else {
      report.modals.lineup_picker_375 = {
        open: false,
        verdict: 'PARTIAL',
        screenshot: null,
        overflowX: null,
        clippedCount: null,
        explanation: 'No contest detail route available to test lineup picker.',
      };
    }

    await gotoStable(page, `${BASE_URL}/`);
    await verifyModal(page, 'auth_connect_375', [
      { type: 'role', role: 'button', name: /connect|sign in|login|wallet|x/i },
      { type: 'selector', selector: '.connect-x-inline-btn, .mcg-btn' },
    ], '[role="dialog"], [data-state="open"], .privy-modal, .privy-dialog', report);

    await context.close();
  } finally {
    await browser.close();
  }

  const reportPath = path.join(OUT_DIR, 'report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`Phase 1 sweep complete: ${reportPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
