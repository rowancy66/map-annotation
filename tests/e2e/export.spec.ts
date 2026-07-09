import { test, expect, type APIRequestContext, type Page } from 'playwright/test';

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

test('export button downloads xlsx and csv files', async ({ page, context }) => {
  const appRequest = context.request;
  await ensureLoggedIn(appRequest);

  // 创建测试地图
  const timestamp = Date.now();
  const mapResponse = await appRequest.post('/api/maps', {
    data: { name: `Export Test ${timestamp}`, description: 'Test' },
  });
  expect(mapResponse.ok()).toBeTruthy();
  const { mapProject } = await mapResponse.json() as { mapProject: { id: string } };

  // 添加一个点标注
  const annoResponse = await appRequest.post('/api/annotations', {
    data: {
      annotations: [{
        map_id: mapProject.id,
        type: 'point',
        name: '测试点',
        description: '测试位置',
        geometry: { type: 'Point', coordinates: [120.5, 36.1] },
        style: { icon: 'default', color: '#c0392b', size: 12 },
        custom_fields: [],
      }],
    },
  });
  expect(annoResponse.ok()).toBeTruthy();

  await page.goto(`/admin?mapId=${mapProject.id}`);
  await page.getByRole('button', { name: '导出' }).waitFor({ state: 'visible', timeout: 10000 });

  // 测试 Excel 导出
  const [xlsxDownload] = await Promise.all([
    page.waitForEvent('download', { timeout: 10000 }),
    (async () => {
      await page.getByRole('button', { name: '导出' }).click();
      await page.getByRole('button', { name: '导出 Excel' }).click();
    })(),
  ]);
  expect(xlsxDownload.suggestedFilename()).toMatch(/\.xlsx$/);

  // 测试 CSV 导出
  const [csvDownload] = await Promise.all([
    page.waitForEvent('download', { timeout: 10000 }),
    (async () => {
      await page.getByRole('button', { name: '导出' }).click();
      await page.getByRole('button', { name: '导出 CSV' }).click();
    })(),
  ]);
  expect(csvDownload.suggestedFilename()).toMatch(/\.csv$/);
});
