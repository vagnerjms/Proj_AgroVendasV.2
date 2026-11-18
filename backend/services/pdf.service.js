/**
 * Gera PDF a partir de HTML com Playwright Chromium.
 */
const { chromium } = require('playwright');

async function htmlToPdfBuffer(html, options = {}) {
  if (!html || typeof html !== 'string') {
    const err = new Error('HTML inválido para geração de PDF.');
    err.status = 400;
    throw err;
  }

  const fs = require('fs');
  const candidates = [
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    process.env.CHROMIUM_PATH,
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser'
  ].filter(Boolean);
  const executablePath = candidates.find((p) => {
    try { return fs.existsSync(p); } catch { return false; }
  });

  const launchOpts = {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  };
  if (executablePath) launchOpts.executablePath = executablePath;

  let browser;
  try {
    browser = await chromium.launch(launchOpts);
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle' });
    const pdf = await page.pdf({
      format: options.format || 'A4',
      landscape: options.landscape !== false,
      printBackground: true,
      margin: options.margin || {
        top: '10mm',
        right: '10mm',
        bottom: '12mm',
        left: '10mm'
      }
    });
    return Buffer.from(pdf);
  } finally {
    if (browser) {
      try { await browser.close(); } catch (_) { /* ignore */ }
    }
  }
}

module.exports = { htmlToPdfBuffer };
