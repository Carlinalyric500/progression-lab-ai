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
    await homePage.expectResultsRendered();

    // Open the generated pad/grid dialog from the top action bar.
    const openPadsButton = page.getByRole('button', { name: /pads/i });
    await expect(openPadsButton).toBeVisible();
    await openPadsButton.click();

    const composerDialog = page.getByRole('dialog');
    await expect(composerDialog).toBeVisible({ timeout: 5000 });

    // Switch to single-shot recording mode
    const singleShotButton = composerDialog.getByRole('button', { name: /single-shot/i });
    await expect(singleShotButton).toBeVisible();
    await singleShotButton.click();

    // Click on the timeline to place cursor at step ~3
    const timelineLane = composerDialog.getByLabel(/Chord timeline lane/i);
    await expect(timelineLane).toBeVisible();
    const laneRect = await timelineLane.boundingBox();
    if (laneRect) {
      const clickX = laneRect.x + 100; // Approximate step 3-5 position
      const clickY = laneRect.y + laneRect.height / 2;
      await page.mouse.click(clickX, clickY);
    }

    // Verify cursor is placed (check for cursor indicator text in status)
    const cursorStatus = composerDialog.getByText(/single-shot cursor: step/i);
    await expect(cursorStatus).toBeVisible({ timeout: 2000 });

    // Tap a chord pad (first visible chord button in the grid)
    const chordPadButton = composerDialog
      .getByRole('button', { name: /^\d+\s+[A-G][^\s]*$/i })
      .first();
    await expect(chordPadButton).toBeVisible();
    await chordPadButton.click();

    // Verify event was inserted (event summary should report a singular event).
    const eventCount = page.getByText(/\b1\s+event\b/i);
    await expect(eventCount).toBeVisible({ timeout: 2000 });

    // Tap a different chord pad to test replacement at same step
    const secondChordPad = composerDialog
      .getByRole('button', { name: /^\d+\s+[A-G][^\s]*$/i })
      .nth(1);
    if (await secondChordPad.isVisible()) {
      await secondChordPad.click();

      // Still should see 1 event because of single-clip-per-step replacement
      await expect(eventCount).toBeVisible({ timeout: 2000 });
    }
  });
});
