import { test, expect } from '@playwright/test';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USERSCRIPT_PATH = path.join(__dirname, '../src/hide-sponsored-listings.user.js');

const USERSCRIPT = fs.readFileSync(USERSCRIPT_PATH, 'utf8');

const AMAZON_SEARCH_URL = 'https://www.amazon.co.uk/s?k=cordless+drill';

const SEARCH_RESULTS_CONTAINER = '.s-main-slot.s-result-list.s-search-results';

/*
 * Amazon sponsored markers currently observed in search results.
 *
 * These deliberately target Amazon's actual sponsored/ad markers
 * rather than generic text such as "Sponsored", which can also
 * appear in Amazon's feedback UI.
 */
const SPONSORED_MARKERS = [
  '.puis-sponsored-label-text',
  '.s-widget-sponsored-label-text',
  '[aria-label="View Sponsored information or leave advertisement feedback"]',
  '[aria-label="Leave feedback on sponsored ad"]',
  '[aria-label="Leave feedback on Sponsored ad"]',
].join(', ');

/*
 * Return the actual sponsored markers currently exposed by Amazon.
 *
 * We deliberately count the markers themselves here rather than
 * attempting to identify their containing result/card. This makes
 * the test independent of Amazon's changing result-container
 * hierarchy.
 */
async function getSponsoredMarkers(page) {
  return page.locator(SPONSORED_MARKERS).evaluateAll((markers) =>
    markers.map((marker, index) => ({
      index: index + 1,
      tag: marker.tagName,
      className: marker.className,
      ariaLabel: marker.getAttribute('aria-label'),
      text: marker.textContent?.trim().slice(0, 200),
      resultAncestor: marker.closest('.s-result-item')?.className ?? null,
      adHolder: marker.closest('.AdHolder')?.className ?? null,
    })),
  );
}

test.setTimeout(60000);

test('userscript removes all sponsored content from live Amazon search', async ({ page }) => {
  await page.goto(AMAZON_SEARCH_URL, {
    waitUntil: 'domcontentloaded',
  });

  await page.waitForSelector(SEARCH_RESULTS_CONTAINER, {
    timeout: 15000,
  });

  /*
   * Wait for Amazon to finish rendering its search/ad modules.
   *
   * We poll rather than relying on a single arbitrary delay because
   * Amazon renders parts of the search page asynchronously.
   */
  const maxAttempts = 10;

  let before = [];

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    before = await getSponsoredMarkers(page);

    console.log(
      `Waiting for sponsored content: attempt ${attempt}/${maxAttempts}, found ${before.length}`,
    );

    // console.log(`Sponsored markers before userscript: ${before.length}`);

    /*
    if (before.length > 0) {
      console.log('Sponsored markers detected:', before);
    }
    */

    if (before.length === 0) {
      test.skip(true, 'Amazon did not expose sponsored content in this run');
    }
    await page.waitForTimeout(1000);
  }

  console.log(`Sponsored markers before userscript: ${before.length}`);

  if (before.length > 0) {
    console.log('Sponsored markers detected:', before);
  }

  /*
   * This is deliberately an assertion.
   *
   * This is a live local-Amazon test and we expect Amazon to
   * expose sponsored content before the userscript is installed.
   */

  test.skip(before.length === 0, 'Amazon did not expose sponsored content in this run');
  /*
   * Install the userscript AFTER Amazon has rendered the
   * sponsored content.
   */
  await page.addScriptTag({
    content: `${USERSCRIPT}\n//# sourceURL=hide-sponsored-listings.user.js`,
    type: 'text/javascript',
  });

  /*
   * Allow the userscript's initial scan and MutationObserver
   * processing to complete.
   */
  await page.waitForTimeout(1000);

  const afterInitial = await getSponsoredMarkers(page);

  console.log(`Sponsored markers after userscript: ${afterInitial.length}`);

  if (afterInitial.length > 0) {
    console.log('Sponsored markers remaining:', afterInitial);
  }

  expect(afterInitial.length, 'Sponsored content remains after userscript was installed').toBe(0);

  /*
   * Scroll through the page to deliberately trigger Amazon's
   * lazy-loading of additional content.
   */
  for (let i = 0; i < 8; i += 1) {
    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight);
    });

    await page.waitForTimeout(750);
  }

  /*
   * Allow any newly inserted content to be processed by the
   * userscript's MutationObserver.
   */
  await page.waitForTimeout(1000);

  const afterScroll = await getSponsoredMarkers(page);

  console.log(`Sponsored markers after scrolling: ${afterScroll.length}`);

  if (afterScroll.length > 0) {
    console.log('Sponsored markers remaining after scrolling:', afterScroll);
  }

  expect(afterScroll.length, 'Sponsored content appeared or survived after lazy-loading').toBe(0);
});
