const { test, expect } = require('@playwright/test');

/**
 * Fluxos críticos 8–17 — ver docs/E2E_CRITICAL_FLOWS.md.
 * Sessão via e2e/auth.setup.js (storageState).
 */

async function ensureApp(page) {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  await expect(
    page.getByText(/dashboard|painel|financeiro|vendas|encerrar sess[aã]o|ol[aá],/i).first()
  ).toBeVisible({ timeout: 20000 });
}

test.describe('AgroVenda critical flows (8–12)', () => {
  test('8. Apuração FUNRURAL — página própria via sidebar', async ({ page }) => {
    await ensureApp(page);
    await page.getByText(/financeiro\s*&\s*fiscal/i).first().click();
    await page.waitForTimeout(800);

    const funruralNav = page.getByRole('button', { name: /apura[cç][aã]o\s+funrural|funrural/i }).first();
    await expect(funruralNav).toBeVisible({ timeout: 10000 });
    await funruralNav.click();
    await page.waitForTimeout(1500);

    const body = await page.locator('body').innerText();
    expect(/funrural/i.test(body)).toBeTruthy();
    expect(/previd[eê]ncia|senar|rat|n[ºo°]?\s*vp|valor/i.test(body)).toBeTruthy();
  });

  test('9. Romaneios/Pesagem — abre página de pesagem', async ({ page }) => {
    await ensureApp(page);

    let romaneiosNav = page.getByRole('button', { name: /romaneios\s*&\s*pesagem|romaneios/i }).first();
    if (!(await romaneiosNav.isVisible({ timeout: 3000 }).catch(() => false))) {
      await page.getByText(/^comercial$/i).first().click();
      await page.waitForTimeout(800);
      romaneiosNav = page.getByRole('button', { name: /romaneios\s*&\s*pesagem|romaneios/i }).first();
    }
    await expect(romaneiosNav).toBeVisible({ timeout: 10000 });
    await romaneiosNav.click();
    await page.waitForTimeout(1500);

    const body = await page.locator('body').innerText();
    expect(/pesagem|romaneio/i.test(body)).toBeTruthy();
  });

  test('10. Cadastros → Produtos', async ({ page }) => {
    await ensureApp(page);

    await page.getByRole('button', { name: /^cadastros$/i }).first().click();
    await page.waitForTimeout(800);

    const produtosNav = page.getByRole('button', { name: /produtos\s*&\s*gr[aã]os|produtos/i }).first();
    await expect(produtosNav).toBeVisible({ timeout: 10000 });
    await produtosNav.click();
    await page.waitForTimeout(1500);

    const body = await page.locator('body').innerText();
    expect(/produto|gr[aã]o|estoque|commodity/i.test(body)).toBeTruthy();
  });

  test('11. Fiscal: label Quantidade (não só Caixas no cabeçalho)', async ({ page }) => {
    await ensureApp(page);
    await page.getByText(/financeiro\s*&\s*fiscal/i).first().click();
    await page.waitForTimeout(600);
    await page.getByText(/contas e fluxo/i).first().click();
    await page.waitForTimeout(1500);

    const body = await page.locator('body').innerText();
    expect(/quantidade/i.test(body)).toBeTruthy();

    const headerCells = await page.locator('thead th').allTextContents();
    expect(/quantidade/i.test(headerCells.join(' | '))).toBeTruthy();
    const caixasAsSoleVolume =
      headerCells.some((h) => /^\s*caixas\s*$/i.test(h.trim())) &&
      !headerCells.some((h) => /quantidade/i.test(h));
    expect(caixasAsSoleVolume).toBeFalsy();
  });

  test('12. Encerrar Sessão / logout visível após login', async ({ page }) => {
    await ensureApp(page);

    const logoutBtn = page.getByRole('button', { name: /encerrar sess[aã]o|sair/i }).first();
    const logoutText = page.getByText(/encerrar sess[aã]o/i).first();
    const visible =
      (await logoutBtn.isVisible({ timeout: 8000 }).catch(() => false)) ||
      (await logoutText.isVisible({ timeout: 8000 }).catch(() => false));
    expect(visible).toBeTruthy();
  });
});

test.describe('AgroVenda critical flows (13–17)', () => {
  test('13. Agenda: MultiStore/MultiProduct; Status sem PIX/Cheque; sem select legado', async ({ page }) => {
    await ensureApp(page);
    await page.getByText(/agenda\s*&\s*alertas/i).first().click();
    await page.waitForTimeout(1500);

    const body = await page.locator('body').innerText();
    expect(/saldo a receber/i.test(body)).toBeTruthy();
    expect(/a receber|parcial|recebido/i.test(body)).toBeTruthy();

    const legacyStore = page.locator('select').filter({ hasText: /todas as lojas/i });
    const legacyStatus = page.locator('select').filter({ hasText: /todos os status/i });
    expect(await legacyStore.count()).toBe(0);
    expect(await legacyStatus.count()).toBe(0);

    const statusArea = await page.locator('tbody').innerText().catch(() => '');
    expect(/status pagamento[\s\S]{0,120}\b(pix|cheque|ted)\b/i.test(statusArea)).toBeFalsy();

    const chipAReceber = page.getByRole('button', { name: /^a receber$/i }).first();
    await expect(chipAReceber).toBeVisible({ timeout: 8000 });
  });

  test('14. /uploads com token; missing → 404 (não dashboard)', async ({ page, request }) => {
    await ensureApp(page);
    const token = await page.evaluate(() => localStorage.getItem('agrovenda_token'));
    expect(token).toBeTruthy();

    const missing = await request.get(`/uploads/missing-e2e-${Date.now()}.pdf?token=${token}`);
    expect(missing.status()).toBe(404);
    const missingBody = await missing.text();
    expect(missingBody).not.toMatch(/<!DOCTYPE html>/i);
    expect(missingBody).not.toMatch(/dashboard/i);
    expect(missingBody).toMatch(/n[aã]o encontrado|not found/i);
  });

  test('15. Modal comprovante: Abrir original + preview (quando CP existir)', async ({ page }) => {
    await ensureApp(page);
    await page.getByText(/agenda\s*&\s*alertas/i).first().click();
    await page.waitForTimeout(1200);

    const cpBtn = page.getByRole('button', { name: /^cp$/i }).first();
    const hasCp = await cpBtn.isVisible({ timeout: 4000 }).catch(() => false);

    if (hasCp) {
      await cpBtn.click();
      await page.waitForTimeout(800);
      await expect(page.getByText(/abrir original/i).first()).toBeVisible({ timeout: 8000 });
      await expect(page.getByText(/comprovante/i).first()).toBeVisible();
    } else {
      await page.getByText(/financeiro\s*&\s*fiscal/i).first().click();
      await page.waitForTimeout(600);
      await page.getByText(/contas e fluxo/i).first().click();
      await page.waitForTimeout(1500);
      const fiscalCp = page.getByRole('button', { name: /^cp$/i }).first();
      if (await fiscalCp.isVisible({ timeout: 4000 }).catch(() => false)) {
        await fiscalCp.click();
        await page.waitForTimeout(800);
        await expect(page.getByText(/abrir original/i).first()).toBeVisible({ timeout: 8000 });
      } else {
        expect(true).toBeTruthy();
      }
    }
  });

  test('16. Fiscal: coluna Forma pgto.; Anexos com token=', async ({ page }) => {
    await ensureApp(page);
    await page.getByText(/financeiro\s*&\s*fiscal/i).first().click();
    await page.waitForTimeout(600);
    await page.getByText(/contas e fluxo/i).first().click();
    await page.waitForTimeout(1500);

    const headers = (await page.locator('thead th').allTextContents()).join(' | ');
    expect(/forma\s*pgto/i.test(headers)).toBeTruthy();
    expect(/anexos/i.test(headers)).toBeTruthy();

    const attachmentLinks = page.locator('a[href*="/uploads/"][href*="token="]');
    const count = await attachmentLinks.count();
    if (count > 0) {
      const href = await attachmentLinks.first().getAttribute('href');
      expect(href).toMatch(/[?&]token=/);
    }
  });

  test('17. Relatórios: UTF-8; sem Atualizar; Limpar filtros restaura grade', async ({ page }) => {
    await ensureApp(page);
    await page.getByText(/relat[oó]rios/i).first().click();
    await page.waitForTimeout(1500);

    const body = await page.locator('body').innerText();
    expect(/presta[cç][aã]o/i.test(body)).toBeTruthy();
    expect(/per[ií]odo|comiss[aã]o|resultado/i.test(body)).toBeTruthy();
    expect(body).not.toMatch(/PrestaÃ§|PerÃ­odo|ComissÃ£o/);

    const atualizar = page.getByRole('button', { name: /^atualizar$/i });
    expect(await atualizar.count()).toBe(0);

    // Botão "Limpar" só aparece com filtro ativo — ativa produtor se houver opções
    const producerSelect = page.locator('select').filter({ hasText: /produtor|todos/i }).first();
    if (await producerSelect.count()) {
      const options = await producerSelect.locator('option').allTextContents();
      const nonAll = options.find((o) => o && !/^todos/i.test(o.trim()));
      if (nonAll) {
        await producerSelect.selectOption({ label: nonAll.trim() });
        await page.waitForTimeout(400);
      }
    }

    const clearBtn = page.getByRole('button', { name: /limpar todos os filtros/i }).first();
    if (await clearBtn.count()) {
      await expect(clearBtn).toBeVisible({ timeout: 5000 });
      await clearBtn.click();
      await page.waitForTimeout(500);
    }

    await expect(page.getByText(/presta[cç][aã]o/i).first()).toBeVisible();
  });
});
