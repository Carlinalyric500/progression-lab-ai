import { test } from './fixtures/test';

test.describe('auth csrf flow', () => {
  test('sends the csrf token when logging out', async ({ api, homePage, page }) => {
    const csrfToken = 'playwright-csrf-token';

    await api.mockAuthenticatedUser();
    await api.expectLogoutWithCsrf(csrfToken);

    await homePage.goto();
    await page.evaluate((token) => {
      document.cookie = `csrf-token=${token}; path=/`;
    }, csrfToken);

    const logoutRequest = page.waitForRequest(
      (request) =>
        request.url().includes('/api/auth/logout') &&
        request.method() === 'POST' &&
        request.headers()['x-csrf-token'] === csrfToken,
    );

    await page.getByRole('button', { name: 'Logout' }).click();
    await logoutRequest;
  });
});
