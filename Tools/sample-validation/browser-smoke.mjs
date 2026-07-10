import { chromium } from 'playwright';

function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      continue;
    }

    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
      continue;
    }

    args[key] = next;
    index += 1;
  }

  return args;
}

const args = parseArgs(process.argv.slice(2));
if (!args.url) {
  throw new Error('--url is required');
}

const timeoutMs = Number(args['timeout-ms'] ?? '60000');
const waitMs = Number(args['wait-ms'] ?? '1500');
const expectSelector = args['expect-selector'] ?? 'body';
const expectText = args['expect-text'];
const clickSelector = args['click-selector'];
const screenshotPath = typeof args.screenshot === 'string' ? args.screenshot : undefined;
const headed = Boolean(args.headed);
const failOnConsoleError = Boolean(args['fail-on-console-error']);

const browser = await chromium.launch({ headless: !headed });
const page = await browser.newPage();
const pageErrors = [];
const consoleErrors = [];

page.on('pageerror', error => {
  pageErrors.push(error.stack ?? String(error));
});

if (failOnConsoleError) {
  page.on('console', message => {
    if (message.type() === 'error' || message.type() === 'assert') {
      consoleErrors.push(message.text());
    }
  });
}

try {
  await page.goto(args.url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
  await page.waitForSelector(expectSelector, { state: 'visible', timeout: timeoutMs });
  await page.waitForLoadState('networkidle', { timeout: Math.min(timeoutMs, 5000) }).catch(() => {});

  if (waitMs > 0) {
    await page.waitForTimeout(waitMs);
  }

  if (clickSelector) {
    const locator = page.locator(clickSelector).first();
    if (await locator.count() === 0) {
      throw new Error(`Could not find clickable selector: ${clickSelector}`);
    }

    await locator.click();
    await page.waitForTimeout(750);
  }

  if (expectText) {
    await page.locator(`text=${expectText}`).first().waitFor({ state: 'visible', timeout: timeoutMs });
  }

  const bodyText = (await page.locator('body').innerText()).trim();
  if (bodyText.length === 0) {
    throw new Error('The page rendered an empty body.');
  }

  if (screenshotPath) {
    const { dirname } = await import('node:path');
    const { mkdirSync } = await import('node:fs');
    mkdirSync(dirname(screenshotPath), { recursive: true });
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Saved screenshot to ${screenshotPath}`);
  }

  if (pageErrors.length > 0) {
    throw new Error(`Browser page errors detected:\n${pageErrors.join('\n\n')}`);
  }

  if (consoleErrors.length > 0) {
    throw new Error(`Browser console errors detected:\n${consoleErrors.join('\n\n')}`);
  }

  console.log(`Browser smoke passed for ${args.url}`);
}
finally {
  await page.close();
  await browser.close();
}