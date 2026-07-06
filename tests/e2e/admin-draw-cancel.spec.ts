import { test, expect, type APIRequestContext, type Page } from 'playwright/test';

const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'playwright-admin-123';

type MapCreateResponse = {
  mapProject: {
    id: string;
    name: string;
  };
};

async function ensureLoggedIn(request: APIRequestContext) {
  const setupResponse = await request.post('/api/auth/setup', {
    data: {
      password: ADMIN_PASSWORD,
      confirmPassword: ADMIN_PASSWORD,
    },
  });

  if (setupResponse.ok()) {
    return;
  }

  if (setupResponse.status() !== 403) {
    throw new Error(`setup failed: ${setupResponse.status()} ${await setupResponse.text()}`);
  }

  const loginResponse = await request.post('/api/auth/login', {
    data: { password: ADMIN_PASSWORD },
  });

  expect(loginResponse.ok(), await loginResponse.text()).toBeTruthy();
}

async function createMap(request: APIRequestContext) {
  const timestamp = Date.now();
  const response = await request.post('/api/maps', {
    data: {
      name: `Playwright Draw Cancel ${timestamp}`,
      description: 'Regression test map',
    },
  });

  expect(response.ok(), await response.text()).toBeTruthy();
  const data = await response.json() as MapCreateResponse;
  return data.mapProject;
}

async function expectDrawCancelFlow(page: Page, modeName: '点标注' | '线标注' | '面标注', promptText: string) {
  await page.getByRole('button', { name: modeName }).click();

  await expect(page.getByText(promptText)).toBeVisible();

  const cancelButton = page.locator('div').filter({ hasText: promptText }).getByRole('button', { name: '取消' });
  await expect(cancelButton).toBeVisible();
  await cancelButton.click();

  await expect(page.getByText(promptText)).toHaveCount(0);
}

test('绘制提示条取消按钮可点击并退出点线面模式', async ({ page }) => {
  const appRequest = page.context().request;

  await ensureLoggedIn(appRequest);
  const mapProject = await createMap(appRequest);

  await page.goto(`/admin?mapId=${mapProject.id}`);

  await expect(page.getByRole('button', { name: '点标注' })).toBeVisible({ timeout: 15000 });

  await expectDrawCancelFlow(page, '点标注', '点击地图放置标注点');
  await expectDrawCancelFlow(page, '线标注', '依次点击添加折线顶点，双击结束');
  await expectDrawCancelFlow(page, '面标注', '依次点击添加多边形顶点，双击结束');
});
