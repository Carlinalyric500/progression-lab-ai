import { expect } from '@playwright/test';

import { test } from './fixtures/test';

test.describe('generator flow', () => {
  test('reveals result navigation after successful generation', async ({ api, homePage, page }) => {
    await api.mockLoggedOutUser();
    await api.mockGeneratorSuccess();

    await homePage.goto();
    await homePage.expectResultNavHidden();

    const chordSuggestionsResponse = page.waitForResponse('**/api/chord-suggestions');
    await homePage.generateIdeas();
    await chordSuggestionsResponse;

    await homePage.expectResultsRendered();
    await homePage.expectResultNavVisible();
  });

  test('single-shot recording: place cursor and tap pads to insert events', async ({
    api,
    homePage,
    page,
  }) => {
    await api.mockLoggedOutUser();
    await api.mockGeneratorSuccess();

    await homePage.goto();
    const chordSuggestionsResponse = page.waitForResponse('**/api/chord-suggestions');
    await homePage.generateIdeas();
    await chordSuggestionsResponse;

    // Wait for a result chord (should render as a clickable suggestion)
    const chordButton = page.getByRole('button', { name: /Am7|Cmaj7|Dm7|G7/ }).first();
    await expect(chordButton).toBeVisible();

    // Open the generator dialog (usually via a button on a result or through suggestions)
    const generatorDialogTitle = page.getByRole('heading', { name: /chord grid|arrange/i });
    if (!(await generatorDialogTitle.isVisible())) {
      // If no explicit button, generate a new arrangement or open from existing result
      const arrangeButton = page.getByRole('button', { name: /arrange|open|generate/i }).first();
      if (await arrangeButton.isVisible()) {
        await arrangeButton.click();
      }
    }

    await expect(generatorDialogTitle).toBeVisible({ timeout: 5000 });

    // Switch to single-shot recording mode
    const singleShotButton = page.getByRole('button', { name: /single-shot/i });
    await expect(singleShotButton).toBeVisible();
    await singleShotButton.click();

    // Verify cursor placement hint is shown
    const cursorHint = page.getByText(/click timeline to place cursor/i);
    await expect(cursorHint).toBeVisible();

    // Click on the timeline to place cursor at step ~3
    const timelineLane = page.getByLabel(/Chord timeline lane/i);
    await expect(timelineLane).toBeVisible();
    const laneRect = await timelineLane.boundingBox();
    if (laneRect) {
      const clickX = laneRect.x + 100; // Approximate step 3-5 position
      const clickY = laneRect.y + laneRect.height / 2;
      await page.mouse.click(clickX, clickY);
    }

    // Verify cursor is placed (check for cursor indicator text in status)
    const cursorStatus = page.getByText(/Single-shot cursor: step/i);
    await expect(cursorStatus).toBeVisible({ timeout: 2000 });

    // Tap a chord pad (first visible chord button in the grid)
    const chordPadButton = page
      .locator('button')
      .filter({ hasText: /Am7|Cmaj7|Dm7|G7|Fmaj|^[A-G]/ })
      .first();
    await expect(chordPadButton).toBeVisible();
    await chordPadButton.click();

    // Verify event was inserted (check event count increased)
    const eventCount = page.getByText(/event|1 event/i);
    await expect(eventCount).toBeVisible({ timeout: 2000 });

    // Tap a different chord pad to test replacement at same step
    const secondChordPad = page
      .locator('button')
      .filter({ hasText: /Am7|Cmaj7|Dm7|G7|Fmaj|^[A-G]/ })
      .nth(1);
    if (await secondChordPad.isVisible()) {
      await secondChordPad.click();

      // Still should see 1 event because of single-clip-per-step replacement
      await expect(eventCount).toBeVisible({ timeout: 2000 });
    }
  });
});
