const { test, expect } = require('@playwright/test');

/**
 * Fluxos críticos 1–7 — ver docs/E2E_CRITICAL_FLOWS.md.
 * Sessão via e2e/auth.setup.js (storageState).
 */

async function openFiscal(page) {
  await page.getByText(/financeiro\s*&\s*fiscal/i).first().click();
  await page.getByText(/contas e fluxo/i).first().click();
  await page.waitForTimeout(1500);
}

async function ensureApp(page) {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  await expect(
    page.getByText(/dashboard|painel|financeiro|vendas|encerrar sess[aã]o|ol[aá],/i).first()
  ).toBeVisible({ timeout: 20000 });
}

test.describe('AgroVenda e2e', () => {
  test('1–2. login / dashboard carregam com sessão', async ({ page }) => {
    await ensureApp(page);
  });

  test('3. relatório: colunas VP/NF sem Cotação; labels romaneio/produto', async ({ page }) => {
    await ensureApp(page);
    await page.getByText(/relat[oó]rio/i).first().click();
    await page.waitForTimeout(1500);

    const body = await page.locator('body').innerText();
    const hasCotacaoCol = /cota[cç][aã]o\s+dia/i.test(body);
    expect(/valor\s*vp|n[ºo°]?\s*vp|valor negociado/i.test(body) || /vp/i.test(body)).toBeTruthy();
    expect(hasCotacaoCol).toBeFalsy();
    expect(/planilha\s*vp|n[ºo°]?\s*romaneio|romaneio/i.test(body)).toBeTruthy();
    expect(/produto/i.test(body)).toBeTruthy();
  });

  test('4. Fiscal unificado: uma tabela Baixas+Rastreio sem placa', async ({ page }) => {
    await ensureApp(page);
    await openFiscal(page);

    await expect(page.getByText(/fiscal\s*[—\-–]\s*baixas/i).first()).toBeVisible({ timeout: 10000 });

    const body = await page.locator('body').innerText();
    expect(/receber|a receber|saldo|valor negociado|total comercial/i.test(body)).toBeTruthy();
    expect(/n[ºo°]?\s*romaneio|romaneio/i.test(body)).toBeTruthy();
    expect(/valor negociado/i.test(body)).toBeTruthy();
    expect(/\bplaca\b/i.test(body)).toBeFalsy();
  });

  test('5. Fiscal: filtros produto/loja e labels Produto', async ({ page }) => {
    await ensureApp(page);
    await openFiscal(page);
    const body = await page.locator('body').innerText();
    expect(/produto/i.test(body)).toBeTruthy();
    expect(/lojas|loja/i.test(body)).toBeTruthy();
    expect(/baixas|receber|saldo/i.test(body)).toBeTruthy();
  });

  test('6. Agenda não tem botão Receber/Repassar de liquidação', async ({ page }) => {
    await ensureApp(page);
    await page.getByText(/agenda\s*&\s*alertas/i).first().click();
    await page.waitForTimeout(1500);

    const receberBtn = page.getByRole('button', { name: /^(Receber|Receber \(\+\))$/ });
    const repassarBtn = page.getByRole('button', { name: /^(Repassar|Repassar \(\+\))$/ });
    await expect(receberBtn).toHaveCount(0);
    await expect(repassarBtn).toHaveCount(0);

    const body = await page.locator('body').innerText();
    expect(/lembrete|vencimento|baixar no fiscal|agenda/i.test(body)).toBeTruthy();
  });

  test('7. Histórico: Incluir canceladas e Nº Romaneio', async ({ page }) => {
    await ensureApp(page);
    const histBtn = page.getByRole('button', { name: /hist\.?\s*vendas/i });
    if (!(await histBtn.isVisible().catch(() => false))) {
      await page.getByRole('button', { name: /^comercial$/i }).click();
    }
    await histBtn.click();
    await page.waitForTimeout(1500);
    const body = await page.locator('body').innerText();
    expect(/incluir canceladas/i.test(body)).toBeTruthy();
    expect(/n[ºo°]?\s*romaneio|romaneio/i.test(body)).toBeTruthy();
  });
});
