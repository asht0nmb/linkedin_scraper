const fs   = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;


  // ─── LOAD CONFIG ────────────────────────────────────────────────────────────────
  const config = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, 'config.json'), 'utf8')
  );
  const {
    filters,
    navigationWait: NAVIGATION_WAIT = 5000,
    scrollDistance : SCROLL_DISTANCE = 200,
    scrollWait     : SCROLL_WAIT = 500,
    nameSelector   : NAME_SEL = 'span[data-test-row-lockup-full-name] a'
  } = config;

  // PER_PAGE hard‑coded to default (LinkedIn usually shows 25 per page)
  const PER_PAGE = 25;

(async () => {
  // ─── STATE FOR CTRL+C HANDLER ─────────────────────────────────────────────
  let currentFilterName = null;
  let currentAllNames   = null;

  // ─── LAUNCH & SETUP ───────────────────────────────────────────────────────
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page    = await context.newPage();

  // ─── GRACEFUL SHUTDOWN ON CTRL+C: dump partial CSV ───────────────────────
  process.on('SIGINT', async () => {
    console.log('\n🛑 Caught interrupt—writing partial results...');
    if (currentFilterName && currentAllNames) {
      const fileName = `linkedin_names_${currentFilterName.replace(/\s+/g,'_')}.csv`;
      const writer = createCsvWriter({
        path: fileName,
        header: [{ id: 'name', title: 'Name' }]
      });
      await writer.writeRecords(
        Array.from(currentAllNames).map(name => ({ name }))
      );
      console.log(`✅ Partially wrote ${currentAllNames.size} names to ${fileName}`);
    }
    await browser.close();
    process.exit(0);
  });

  // ─── LOGIN ────────────────────────────────────────────────────────────────
  await page.goto(filters[0].url);
  await page.waitForTimeout(NAVIGATION_WAIT);
  console.log('🔑 Please log in (and complete 2FA), then press ENTER');
  await new Promise(r => process.stdin.once('data', r));
  process.stdin.pause();

  // ─── SCRAPE EACH FILTER ───────────────────────────────────────────────────
  for (const { name, url } of filters) {
    currentFilterName = name;
    currentAllNames   = new Set();

    console.log(`\n▶️  Scraping filter: ${name}`);

    // prepare base URL (strip out start)
    const u0 = new URL(url);
    const baseParams = new URLSearchParams(u0.searchParams);
    baseParams.delete('start');
    const baseURL = u0.origin + u0.pathname;

    let start = 0;
    while (true) {
      const params = new URLSearchParams(baseParams);
      params.set('start', start);
      const nextUrl = `${baseURL}?${params}`;

      console.log(`  → Navigating to start=${start}`);
      await page.goto(nextUrl);
      await page.waitForTimeout(NAVIGATION_WAIT);

      // incremental scroll
      await page.evaluate(async ({ distance, delay }) => {
        const doc = document.scrollingElement;
        while (doc.scrollTop + window.innerHeight < doc.scrollHeight) {
          doc.scrollBy(0, distance);
          await new Promise(r => setTimeout(r, delay));
        }
      }, { distance: SCROLL_DISTANCE, delay: SCROLL_WAIT });
      await page.waitForTimeout(NAVIGATION_WAIT);

      // scrape names
      const names = await page.$$eval(
        NAME_SEL,
        els => els.map(e => e.textContent.trim()).filter(n => n)
      );
      console.log(`    • Got ${names.length} names`);

      // ─── UPDATED PAGINATION BREAK LOGIC ───────────────────────────────
      if (names.length === 0 || names.length < PER_PAGE) {
        console.log('  ↩️  Reached final page, exiting pagination loop');
        names.forEach(n => currentAllNames.add(n));
        break;
      }
      const beforeCount = currentAllNames.size;
      names.forEach(n => currentAllNames.add(n));
      if (currentAllNames.size === beforeCount) {
        console.log('  ↩️  No new names found, exiting loop');
        break;
      }
      start += PER_PAGE;
    }

    // write full CSV for this filter
    const fileName = `linkedin_names_${name.replace(/\s+/g,'_')}.csv`;
    const csvWriter = createCsvWriter({
      path: fileName,
      header: [{ id: 'name', title: 'Name' }]
    });
    await csvWriter.writeRecords(
      Array.from(currentAllNames).map(n => ({ name: n }))
    );
    console.log(`✅ Wrote ${currentAllNames.size} names to ${fileName}`);
  }

  // ─── CLEAN UP ───────────────────────────────────────────────────────────────
  await browser.close();
  console.log('\n🎉 All done!');
  process.exit(0);
})();
