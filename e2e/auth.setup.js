const { test: setup, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const EMAIL = process.env.E2E_EMAIL || 'admin@agrovenda.com.br';
const PASSWORDS = [
  process.env.E2E_PASSWORD,
  'Admin123@',
  'Admin123!'
].filter(Boolean);

const authDir = path.join(__dirname, '.auth');
const authFile = path.join(authDir, 'user.json');

setup('authenticate', async ({ page, request, baseURL }) => {
  setup.setTimeout(120000);
  fs.mkdirSync(authDir, { recursive: true });

  const apiBase = process.env.E2E_API_URL || baseURL || 'http://localhost:3000';
  let authPayload = null;

  for (const password of [...new Set(PASSWORDS)]) {
    const res = await request.post(`${apiBase}/api/auth/login`, {
      data: { email: EMAIL, password },
      failOnStatusCode: false
    });
    if (res.ok()) {
      authPayload = await res.json();
      break;
    }
    if (res.status() === 429) {
      await page.waitForTimeout(65000);
    }
  }

  expect(authPayload?.token).toBeTruthy();
  expect(authPayload?.user).toBeTruthy();

  await page.goto('/');
  await page.evaluate(({ token, user }) => {
    const sessionPayload = {
      user,
      rememberMe: true,
      savedAt: Date.now(),
      expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000
    };
    localStorage.setItem('agrovenda_token', token);
    localStorage.setItem('agrovenda_user_v2', JSON.stringify(sessionPayload));
    localStorage.setItem('agrovenda_user', JSON.stringify(user));
    document.cookie = `agrovenda_token=${encodeURIComponent(token)}; path=/; SameSite=Lax; max-age=604800`;
    document.cookie = `agrovenda_session=${encodeURIComponent(JSON.stringify(sessionPayload))}; path=/; SameSite=Lax; max-age=${365 * 24 * 60 * 60}`;
  }, { token: authPayload.token, user: authPayload.user });

  await page.reload();
  await page.waitForLoadState('domcontentloaded');
  await expect(
    page.getByText(/dashboard|painel|financeiro|vendas|encerrar sess[aã]o|ol[aá],/i).first()
  ).toBeVisible({ timeout: 20000 });

  await page.context().storageState({ path: authFile });
});
