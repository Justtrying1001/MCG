import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE_URL = process.env.MCG_BASE_URL ?? 'https://memecardgame.com';
const OUT_DIR = process.env.MCG_VERIFY_OUT_DIR ?? '/tmp/mcg-phase1-final-verify';

const REQUIRED_ENV = ['MCG_SESSION_COOKIE', 'PRIVY_TOKEN_COOKIE'];
const missing = REQUIRED_ENV.filter((name) => !process.env[name]);
if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

const cookies = [
  { name: 'mcg_session', value: process.env.MCG_SESSION_COOKIE, domain: 'memecardgame.com', path: '/' },
  { name: 'mcg_has_session', value: '1', domain: 'memecardgame.com', path: '/' },
  { name: 'privy-session', value: 't', domain: 'memecardgame.com', path: '/' },
  { name: 'privy-token', value: process.env.PRIVY_TOKEN_COOKIE, domain: 'memecardgame.com', path: '/' },
];

async function verifyProfileAndModal(browser, report, viewportName, width, height) {
  const context = await browser.newContext({ viewport: { width, height }, ignoreHTTPSErrors: true });
  await context.addCookies(cookies);
  const page = await context.newPage();

  await page.goto(`${BASE_URL}/profile`, { waitUntil: 'networkidle', timeout: 120_000 });
  await page.waitForTimeout(1_200);

  const bodyText = await page.locator('body').innerText();
  const authOk = /logout/i.test(bodyText) && !/connect wallet/i.test(bodyText);
  if (viewportName === 'mobile') {
    report.auth = authOk;
  }

  await page.screenshot({ path: path.join(OUT_DIR, `profile_${viewportName}.png`), fullPage: true });

  const accountSettingsButton = page.getByRole('button', { name: /account settings/i }).first();
  let opened = false;
  if (await accountSettingsButton.count()) {
    await accountSettingsButton.click();
    await page.waitForTimeout(900);
    opened = (await page.locator('.profile-settings-modal').count()) > 0;
    await page.screenshot({ path: path.join(OUT_DIR, `profile_modal_${viewportName}.png`), fullPage: true });
  }

  report.profile[viewportName] = { authOk, url: page.url() };
  report.modal[viewportName] = { opened };
  await context.close();
}

async function verifyContestDetail(browser, report) {
  const context = await browser.newContext({ viewport: { width: 375, height: 812 }, ignoreHTTPSErrors: true });
  await context.addCookies(cookies);
  const page = await context.newPage();

  await page.goto(`${BASE_URL}/contests`, { waitUntil: 'networkidle', timeout: 120_000 });
  await page.waitForTimeout(1_200);

  let href = await page.evaluate(() => {
    const links = [...document.querySelectorAll('a[href*="/contests/"]')]
      .map((anchor) => anchor.getAttribute('href'))
      .filter(Boolean);
    return links.find((candidate) => candidate && candidate !== '/contests') ?? null;
  });

  if (href && href.startsWith('/')) {
    href = `${BASE_URL}${href}`;
  }
  report.contest.url = href;

  if (href) {
    await page.goto(href, { waitUntil: 'networkidle', timeout: 120_000 });
    await page.waitForTimeout(1_200);
    await page.screenshot({ path: path.join(OUT_DIR, 'contest_detail_mobile.png'), fullPage: true });
  }

  await context.close();
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const report = { auth: false, profile: {}, modal: {}, contest: {} };

  const browser = await chromium.launch({ headless: true });
  try {
    await verifyProfileAndModal(browser, report, 'mobile', 375, 812);
    await verifyProfileAndModal(browser, report, 'tablet', 768, 1024);
    await verifyContestDetail(browser, report);
  } finally {
    await browser.close();
  }

  fs.writeFileSync(path.join(OUT_DIR, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`Verification complete: ${OUT_DIR}`);
}

await main();
