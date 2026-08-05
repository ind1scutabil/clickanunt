import { test, expect, type APIRequestContext } from '@playwright/test';

const strongPassword = 'Password123!';

async function csrf(request: APIRequestContext): Promise<string> {
  const res = await request.get('/api/csrf');
  expect(res.ok()).toBeTruthy();
  const data = (await res.json()) as { csrfToken?: string };
  expect(data.csrfToken).toBeTruthy();
  return data.csrfToken!;
}

async function registerFreshUser(request: APIRequestContext): Promise<string> {
  const email = `fav-empty-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  const token = await csrf(request);
  const res = await request.post('/api/auth/register', {
    data: {
      email,
      password: strongPassword,
      confirmPassword: strongPassword,
      name: 'Fav Empty',
      acceptTerms: true,
      acceptPrivacy: true,
    },
    headers: { 'x-csrf-token': token },
  });
  expect(res.ok(), await res.text()).toBeTruthy();
  return email;
}

async function loginToFavorites(
  page: import('@playwright/test').Page,
  email: string
) {
  await page.context().clearCookies();
  await page.goto('/auth/login?next=%2Ffavorites');
  const loginForm = page
    .locator('form')
    .filter({ has: page.locator('button[type="submit"]') })
    .first();
  await loginForm.locator('input[type="email"]').fill(email);
  await loginForm.locator('input[type="password"]').fill(strongPassword);
  await loginForm.locator('button[type="submit"]').click();
  await page.waitForURL(/\/favorites/, { timeout: 30000 });
}

test.describe('Favorites', () => {
  test('should add listing to favorites when a card control exists', async ({
    page,
    request,
  }) => {
    const email = await registerFreshUser(request);
    await page.context().clearCookies();
    await page.goto('/auth/login');
    const loginForm = page
      .locator('form')
      .filter({ has: page.locator('button[type="submit"]') })
      .first();
    await loginForm.locator('input[type="email"]').fill(email);
    await loginForm.locator('input[type="password"]').fill(strongPassword);
    await loginForm.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth/login'), {
      timeout: 30000,
    });
    await page.goto('/listings');
    const favoriteButton = page
      .locator(
        'button[aria-label*="favorite" i], button[aria-label*="Favorite" i], button[aria-label*="favorit" i]'
      )
      .first();
    if (!(await favoriteButton.isVisible().catch(() => false))) {
      test.info().annotations.push({
        type: 'note',
        description: 'No favorite control on first listing card in this DB',
      });
      return;
    }
    const initialState = await favoriteButton.getAttribute('aria-pressed');
    await favoriteButton.click();
    await expect
      .poll(async () => favoriteButton.getAttribute('aria-pressed'), {
        timeout: 8000,
      })
      .not.toBe(initialState);
  });

  test('should display empty state when no favorites', async ({ page, request }) => {
    const email = await registerFreshUser(request);
    await loginToFavorites(page, email);
    await expect(page).toHaveURL(/\/favorites/);
    await expect(page.getByText(/Se încarcă favorite/i)).toHaveCount(0, {
      timeout: 15000,
    });
    await expect(page.getByText(/Niciun anunț favorit/i)).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByRole('link', { name: /Către anunțuri/i })).toBeVisible();
  });

  test('empty state persists after reload', async ({ page, request }) => {
    const email = await registerFreshUser(request);
    await loginToFavorites(page, email);
    await expect(page.getByText(/Niciun anunț favorit/i)).toBeVisible({
      timeout: 15000,
    });
    await page.reload();
    await expect(page).toHaveURL(/\/favorites/);
    await expect(page.getByText(/Se încarcă favorite/i)).toHaveCount(0, {
      timeout: 15000,
    });
    await expect(page.getByText(/Niciun anunț favorit/i)).toBeVisible({
      timeout: 15000,
    });
  });
});
