import { test, expect, type APIRequestContext, type Page } from 'playwright/test';

const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'playwright-admin-123';
const SETUP_TOKEN = process.env.APP_SETUP_TOKEN || 'playwright-setup-token';

type MapCreateResponse = {
  mapProject: {
    id: string;
    name: string;
  };
};

type SetupStatusResponse = {
  configured: boolean;
  setupTokenRequired: boolean;
};

type SessionResponse = {
  loggedIn: boolean;
};

async function ensureLoggedIn(request: APIRequestContext) {
  const setupResponse = await request.post('/api/auth/setup', {
    data: {
      password: ADMIN_PASSWORD,
      confirmPassword: ADMIN_PASSWORD,
      setupToken: SETUP_TOKEN,
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

test('前台地图控件不会互相遮挡', async ({ page }) => {
  const appRequest = page.context().request;

  await ensureLoggedIn(appRequest);
  const mapProject = await createMap(appRequest);

  await page.goto(`/map/${mapProject.id}`);

  const sidebarToggle = page.getByRole('button', { name: '收起侧边栏' });
  const mapSearchInput = page.locator('input[placeholder="搜索地址、路名…"], input[placeholder="未配置地图搜索"]').first();
  const vectorButton = page.getByRole('button', { name: '矢量' });
  const showNamesButton = page.getByRole('button', { name: '切换名称显示' });

  await expect(sidebarToggle).toBeVisible({ timeout: 15000 });
  await expect(mapSearchInput).toBeVisible();
  await expect(vectorButton).toBeVisible();
  await expect(showNamesButton).toBeVisible();

  const sidebarToggleBox = await sidebarToggle.boundingBox();
  const mapSearchInputBox = await mapSearchInput.boundingBox();
  const vectorButtonBox = await vectorButton.boundingBox();
  const showNamesButtonBox = await showNamesButton.boundingBox();

  expect(sidebarToggleBox).not.toBeNull();
  expect(mapSearchInputBox).not.toBeNull();
  expect(vectorButtonBox).not.toBeNull();
  expect(showNamesButtonBox).not.toBeNull();

  expect(boxesOverlap(sidebarToggleBox!, mapSearchInputBox!)).toBeFalsy();
  expect(boxesOverlap(vectorButtonBox!, showNamesButtonBox!)).toBeFalsy();
});

test('setup 状态、登录登出与重复 setup 拒绝正常工作', async ({ page }) => {
  const appRequest = page.context().request;

  const initialSetup = await appRequest.get('/api/auth/setup');
  expect(initialSetup.ok()).toBeTruthy();
  const initialStatus = await initialSetup.json() as SetupStatusResponse;

  if (initialStatus.configured) {
    const loginResponse = await appRequest.post('/api/auth/login', {
      data: { password: ADMIN_PASSWORD },
    });
    expect(loginResponse.ok(), await loginResponse.text()).toBeTruthy();
  } else {
    const setupResponse = await appRequest.post('/api/auth/setup', {
      data: {
        password: ADMIN_PASSWORD,
        confirmPassword: ADMIN_PASSWORD,
        setupToken: SETUP_TOKEN,
      },
    });
    expect(setupResponse.ok(), await setupResponse.text()).toBeTruthy();
  }

  const configuredSetup = await appRequest.get('/api/auth/setup');
  const configuredStatus = await configuredSetup.json() as SetupStatusResponse;
  expect(configuredStatus.configured).toBeTruthy();

  const sessionAfterSetup = await appRequest.get('/api/auth/session');
  const loggedInStatus = await sessionAfterSetup.json() as SessionResponse;
  expect(loggedInStatus.loggedIn).toBeTruthy();

  const repeatedSetup = await appRequest.post('/api/auth/setup', {
    data: {
      password: ADMIN_PASSWORD,
      confirmPassword: ADMIN_PASSWORD,
      setupToken: SETUP_TOKEN,
    },
  });
  expect(repeatedSetup.status()).toBe(403);

  const logoutResponse = await appRequest.post('/api/auth/logout');
  expect(logoutResponse.ok()).toBeTruthy();

  const sessionAfterLogout = await appRequest.get('/api/auth/session');
  const loggedOutStatus = await sessionAfterLogout.json() as SessionResponse;
  expect(loggedOutStatus.loggedIn).toBeFalsy();

  const loginResponse = await appRequest.post('/api/auth/login', {
    data: { password: ADMIN_PASSWORD },
  });
  expect(loginResponse.ok(), await loginResponse.text()).toBeTruthy();

  const sessionAfterLogin = await appRequest.get('/api/auth/session');
  const reloggedStatus = await sessionAfterLogin.json() as SessionResponse;
  expect(reloggedStatus.loggedIn).toBeTruthy();

  await page.goto('/auth/login');
  await expect(page.getByText('设置管理密码')).toHaveCount(0);
});

test('setup 状态会暴露是否需要初始化口令', async ({ page }) => {
  const appRequest = page.context().request;
  const statusResponse = await appRequest.get('/api/auth/setup');
  expect(statusResponse.ok()).toBeTruthy();
  const status = await statusResponse.json() as SetupStatusResponse;
  expect(typeof status.setupTokenRequired).toBe('boolean');

  await page.goto('/setup');

  if (status.configured) {
    await expect(page.getByText('密码已设置')).toBeVisible();
    return;
  }

  if (status.setupTokenRequired) {
    await expect(page.getByText('初始化口令')).toBeVisible();
    await page.getByRole('button', { name: '设置密码' }).click();
    await expect(page.getByText('请输入初始化口令')).toBeVisible();
    return;
  }

  await expect(page.getByText('设置管理密码')).toBeVisible();
});

test('登录失败达到阈值后会被限流', async ({ page }) => {
  const appRequest = page.context().request;

  const initialSetup = await appRequest.get('/api/auth/setup');
  expect(initialSetup.ok()).toBeTruthy();
  const initialStatus = await initialSetup.json() as SetupStatusResponse;

  if (!initialStatus.configured) {
    const setupResponse = await appRequest.post('/api/auth/setup', {
      data: {
        password: ADMIN_PASSWORD,
        confirmPassword: ADMIN_PASSWORD,
        setupToken: SETUP_TOKEN,
      },
    });
    expect(setupResponse.ok(), await setupResponse.text()).toBeTruthy();
    await appRequest.post('/api/auth/logout');
  }

  for (let attempt = 1; attempt <= 5; attempt++) {
    const loginResponse = await appRequest.post('/api/auth/login', {
      data: { password: 'definitely-wrong-password' },
      headers: {
        'x-forwarded-for': '198.51.100.77',
      },
    });
    expect(loginResponse.status(), `attempt ${attempt} should return 401`).toBe(401);
  }

  const limitedResponse = await appRequest.post('/api/auth/login', {
    data: { password: 'definitely-wrong-password' },
    headers: {
      'x-forwarded-for': '198.51.100.77',
    },
  });

  expect(limitedResponse.status()).toBe(429);
  expect(limitedResponse.headers()['retry-after']).toBeTruthy();
  await expect(limitedResponse.json()).resolves.toMatchObject({ error: '尝试过于频繁，请稍后再试' });
});

test('文字标注会按纯文本渲染并可持久化', async ({ page }) => {
  const appRequest = page.context().request;

  await ensureLoggedIn(appRequest);
  const mapProject = await createMap(appRequest);
  const textValue = '<img src=x onerror=alert(1)> Playwright 文字标注';

  await page.goto(`/admin?mapId=${mapProject.id}`);
  await expect(page.getByRole('button', { name: '工具' })).toBeVisible({ timeout: 15000 });

  await page.getByRole('button', { name: '工具' }).click();
  await page.getByRole('button', { name: '文字' }).click();

  const mapCanvas = page.locator('.leaflet-container');
  await mapCanvas.click({ position: { x: 240, y: 220 } });

  await expect(page.getByRole('heading', { name: '添加文字标注' })).toBeVisible();
  await page.getByPlaceholder('输入标注文字...').fill(textValue);
  await page.getByRole('button', { name: '添加' }).click();

  await expect(page.locator('.custom-text-marker')).toContainText(textValue);
  await expect(page.locator('.custom-text-marker img')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.custom-text-marker')).toContainText(textValue);
  await expect(page.locator('.custom-text-marker img')).toHaveCount(0);

  const groupAResponse = await appRequest.post('/api/groups', {
    data: { mapId: mapProject.id, name: 'Group A' },
  });
  expect(groupAResponse.ok(), await groupAResponse.text()).toBeTruthy();
  const groupAData = await groupAResponse.json() as { group: { id: string } };

  const groupBResponse = await appRequest.post('/api/groups', {
    data: { mapId: mapProject.id, name: 'Group B', parentId: groupAData.group.id },
  });
  expect(groupBResponse.ok(), await groupBResponse.text()).toBeTruthy();
  const groupBData = await groupBResponse.json() as { group: { id: string } };

  const cycleResponse = await appRequest.put('/api/groups', {
    data: {
      id: groupAData.group.id,
      parent_id: groupBData.group.id,
    },
  });
  expect(cycleResponse.status()).toBe(400);
  await expect(cycleResponse.json()).resolves.toMatchObject({ error: '父分组不能是当前分组或其子分组' });
});
