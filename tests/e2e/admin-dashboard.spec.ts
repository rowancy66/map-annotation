import { test, expect, type APIRequestContext } from 'playwright/test';

const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'playwright-admin-123';
const SETUP_TOKEN = process.env.APP_SETUP_TOKEN || 'playwright-setup-token';

async function ensureLoggedIn(request: APIRequestContext) {
  const setupResponse = await request.post('/api/auth/setup', {
    data: { password: ADMIN_PASSWORD, confirmPassword: ADMIN_PASSWORD, setupToken: SETUP_TOKEN },
  });
  if (setupResponse.ok()) return;
  if (setupResponse.status() !== 403) throw new Error('setup failed');
  const loginResponse = await request.post('/api/auth/login', { data: { password: ADMIN_PASSWORD } });
  expect(loginResponse.ok()).toBeTruthy();
}

test('admin dashboard map card body is clickable to edit', async ({ page }) => {
  const appRequest = page.context().request;
  await ensureLoggedIn(appRequest);
  const timestamp = Date.now();
  const response = await appRequest.post('/api/maps', {
    data: { name: `Card Click Test ${timestamp}`, description: 'Test' },
  });
  expect(response.ok()).toBeTruthy();
  const { mapProject } = await response.json() as { mapProject: { id: string; name: string } };

  await page.goto('/admin');
  await expect(page.getByText(mapProject.name)).toBeVisible({ timeout: 15000 });

  // Click on the card body (not the title button or edit icon)
  const card = page.locator('article').filter({ hasText: mapProject.name });
  const cardBox = await card.boundingBox();
  expect(cardBox).not.toBeNull();
  // Click near the bottom center of the card body, away from buttons
  await page.mouse.click(cardBox!.x + cardBox!.width / 2, cardBox!.y + cardBox!.height - 30);

  await expect(page).toHaveURL(`/admin?mapId=${mapProject.id}`);
});
