import { test, expect } from '@playwright/test';

test.describe('Ocado auto price sort', () => {
  test('finds the sort button', async ({ page }) => {
    await page.setContent(`
            <div data-test="sort-button"
                 role="combobox"
                 aria-expanded="false">
                <span>Relevance</span>
            </div>
        `);

    await expect(page.locator('[data-test="sort-button"]')).toBeVisible();
  });

  test('detects existing price sort', async ({ page }) => {
    await page.setContent(`
        <div data-test="sort-button">
            <span>Price per Unit: Low to High</span>
        </div>
    `);

    await expect(page.locator('[data-test="sort-button"] span')).toHaveText(
      'Price per Unit: Low to High',
    );
  });

  test('can select price ascending option', async ({ page }) => {
    await page.setContent(`
            <div data-test="sort-button"
                 aria-expanded="true">
                <span>Relevance</span>
            </div>

            <div role="option"
                 data-name="Price per Unit: Low to High">
                Price per Unit: Low to High
            </div>
        `);

    await page.locator('[role="option"][data-name="Price per Unit: Low to High"]').click();

    await expect(page.locator('[role="option"]')).toHaveCount(1);
  });
});
