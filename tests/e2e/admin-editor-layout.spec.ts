import { test, expect, type APIRequestContext, type Page, type Locator } from 'playwright/test';

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

function boxesOverlap(
  first: { x: number; y: number; width: number; height: number },
  second: { x: number; y: number; width: number; height: number }
) {
  return (
    first.x < second.x + second.width &&
    first.x + first.width > second.x &&
    first.y < second.y + second.height &&
    first.y + first.height > second.y
  );
}

async function collectBoxes(page: Page, extraLocators: Record<string, Locator> = {}) {
  const locators: Record<string, Locator> = {
    searchInput: page.locator('input[placeholder="搜索地址、路名…"], input[placeholder="未配置地图搜索"]').first(),
    vectorButton: page.getByRole('button', { name: '矢量' }),
    imgButton: page.getByRole('button', { name: '卫星' }),
    terrainButton: page.getByRole('button', { name: '地形' }),
    pointButton: page.getByRole('button', { name: '点标注' }),
    lineButton: page.getByRole('button', { name: '线标注' }),
    polygonButton: page.getByRole('button', { name: '面标注' }),
    toolButton: page.getByRole('button', { name: '工具' }),
    namesButton: page.locator('button').filter({ hasText: /^名称$/ }).first(),
    heatButton: page.locator('button').filter({ hasText: /^热力$/ }).first(),
    smartButton: page.getByRole('button', { name: '智能标注' }),
    showNamesButton: page.locator('.map-overlay-tool').filter({ hasText: '显示名称' }),
    ...extraLocators,
  };

  const boxes: Record<string, { x: number; y: number; width: number; height: number }> = {};
  for (const [name, locator] of Object.entries(locators)) {
    const box = await locator.boundingBox();
    if (!box) continue;
    boxes[name] = box;
  }
  return boxes;
}

function findOverlaps(boxes: Record<string, { x: number; y: number; width: number; height: number }>) {
  const overlaps: string[] = [];
  const names = Object.keys(boxes);
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      if (boxesOverlap(boxes[names[i]], boxes[names[j]])) {
        overlaps.push(`${names[i]} overlaps ${names[j]}`);
      }
    }
  }
  return overlaps;
}

async function setupMap(page: Page) {
  const appRequest = page.context().request;
  await ensureLoggedIn(appRequest);
  const timestamp = Date.now();
  const response = await appRequest.post('/api/maps', {
    data: { name: `Overlap Test ${timestamp}`, description: 'Test' },
  });
  expect(response.ok()).toBeTruthy();
  const { mapProject } = await response.json() as { mapProject: { id: string } };
  return mapProject;
}

test('admin editor overlays do not overlap at 1440x960', async ({ page }) => {
  const mapProject = await setupMap(page);
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto(`/admin?mapId=${mapProject.id}`);
  await expect(page.getByRole('button', { name: '点标注' })).toBeVisible({ timeout: 15000 });
  const boxes = await collectBoxes(page);
  expect(findOverlaps(boxes), `Overlaps: ${findOverlaps(boxes).join(', ')}`).toEqual([]);
});

test('admin editor overlays do not overlap at 1280x960', async ({ page }) => {
  const mapProject = await setupMap(page);
  await page.setViewportSize({ width: 1280, height: 960 });
  await page.goto(`/admin?mapId=${mapProject.id}`);
  await expect(page.getByRole('button', { name: '点标注' })).toBeVisible({ timeout: 15000 });
  const boxes = await collectBoxes(page);
  expect(findOverlaps(boxes), `Overlaps: ${findOverlaps(boxes).join(', ')}`).toEqual([]);
});

test('admin editor overlays do not overlap with settings panel', async ({ page }) => {
  const mapProject = await setupMap(page);
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto(`/admin?mapId=${mapProject.id}`);
  await expect(page.getByRole('button', { name: '设置' })).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: '设置' }).click();
  const settingsPanel = page.locator('h3').filter({ hasText: '访问设置' }).locator('..').locator('..').first();
  await expect(settingsPanel).toBeVisible();
  const boxes = await collectBoxes(page, { settingsPanel });
  expect(findOverlaps(boxes), `Overlaps: ${findOverlaps(boxes).join(', ')}`).toEqual([]);
});
