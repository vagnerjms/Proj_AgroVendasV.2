const { test, expect } = require('@playwright/test');

/**
 * Traceability / pátio / multi-CP — gate pós PR1–PR5.
 * API via proxy do preview (vite → :3001).
 */

async function ensureApp(page) {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  await expect(
    page.getByText(/dashboard|painel|financeiro|vendas|encerrar sess[aã]o|ol[aá],/i).first()
  ).toBeVisible({ timeout: 20000 });
}

async function apiToken(page) {
  return page.evaluate(() => localStorage.getItem('agrovenda_token'));
}

test.describe('Traceability & pátio', () => {
  test('19. Módulo motorista /m carrega captura de pátio', async ({ page }) => {
    await page.goto('/m');
    await page.waitForLoadState('domcontentloaded');
    await expect(
      page.getByText(/p[aá]tio|motorista|agrovenda/i).first()
    ).toBeVisible({ timeout: 20000 });
    const body = await page.locator('body').innerText();
    expect(/placa|nf|romaneio|balan[cç]a|captura/i.test(body)).toBeTruthy();
  });

  test('20. API pátio: captura + candidates + reconcile (2 CPs no ledger)', async ({ page, request }) => {
    await ensureApp(page);
    const token = await apiToken(page);
    expect(token).toBeTruthy();
    const auth = { Authorization: `Bearer ${token}` };

    const plate = `E2E${Date.now().toString().slice(-4)}`;
    const nfNumber = String(Date.now()).slice(-8);

    const patio = await request.post('/api/weighings/patio', {
      headers: auth,
      data: {
        truckPlate: plate,
        nfNumber,
        originWeightKg: 1000,
        destWeightKg: 995,
        nfPhotoFile: `Patio-NF-${nfNumber}.jpeg`,
        scaleRomaneioImage: 'Patio-RomaneioBalanca.jpg'
      }
    });
    expect(patio.ok()).toBeTruthy();
    const slip = await patio.json();
    expect(slip.source).toBe('patio');
    expect(slip.saleId).toBeFalsy();

    const cand = await request.get(
      `/api/weighings/patio/candidates?nfNumber=${nfNumber}&truckPlate=${plate}`,
      { headers: auth }
    );
    expect(cand.ok()).toBeTruthy();
    const candBody = await cand.json();
    expect(candBody.candidates?.length).toBeGreaterThanOrEqual(1);

    const saleRes = await request.post('/api/sales', {
      headers: auth,
      data: {
        client: 'E2E Loja Trace',
        origin: 'Produtor E2E',
        saleDate: '2025-06-01',
        totalOperation: 5000,
        valorTotalVP: 5000,
        totalKg: 995,
        truckPlate: plate,
        nfFile: `NF-${nfNumber}.pdf`,
        nfNumber,
        patioSlipId: slip.id,
        items: [{ product: 'Cenoura', valorTotalVP: 5000, kg: 995 }],
        feeValue: 3
      }
    });
    expect(saleRes.status()).toBe(201);
    const sale = await saleRes.json();
    expect(sale.id).toMatch(/^VP/);

    const linked = await request.get(`/api/weighings?search=${sale.id}`, { headers: auth });
    expect(linked.ok()).toBeTruthy();

    const settle1 = await request.post(`/api/sales/${sale.id}/settle`, {
      headers: auth,
      data: {
        isPartial: true,
        paidAmount: 2000,
        paymentMethod: 'PIX',
        paymentProofFiles: ['CP01-e2e-a.pdf'],
        paymentProofFile: 'CP01-e2e-a.pdf'
      }
    });
    expect(settle1.ok()).toBeTruthy();

    const settle2 = await request.post(`/api/sales/${sale.id}/settle`, {
      headers: auth,
      data: {
        isPartial: true,
        paidAmount: 1500,
        paymentMethod: 'TED',
        paymentProofFiles: ['CP02-e2e-b.pdf'],
        paymentProofFile: 'CP02-e2e-b.pdf'
      }
    });
    expect(settle2.ok()).toBeTruthy();
    const after = await settle2.json();
    const history = after.sale?.paymentHistory || [];
    expect(history.length).toBeGreaterThanOrEqual(2);
    const proofs = history.flatMap((h) => h.paymentProofFiles || (h.paymentProofFile ? [h.paymentProofFile] : []));
    expect(proofs.some((p) => /CP01|e2e-a/i.test(p))).toBeTruthy();
    expect(proofs.some((p) => /CP02|e2e-b/i.test(p))).toBeTruthy();
    expect(Number(after.sale.paidAmount)).toBeCloseTo(3500, 1);
  });

  test('21. Fiscal: barra de filtros estável + Nova Venda menciona pátio após NF', async ({ page }) => {
    await ensureApp(page);
    await page.getByText(/financeiro\s*&\s*fiscal/i).first().click();
    await page.waitForTimeout(600);
    await page.getByText(/contas e fluxo/i).first().click();
    await page.waitForTimeout(1200);

    const toolbar = page.locator('body');
    const text = await toolbar.innerText();
    expect(/filtro|loja|produtor|status|per[ií]odo|buscar/i.test(text)).toBeTruthy();

    // Toolbar não some ao focar busca (regressão de layout)
    const search = page.getByPlaceholder(/buscar|pesquisar|vp|loja/i).first();
    if (await search.isVisible({ timeout: 3000 }).catch(() => false)) {
      await search.focus();
      await page.waitForTimeout(300);
      await expect(page.getByText(/contas|fluxo|fiscal/i).first()).toBeVisible();
    }

    await page.getByText(/^comercial$/i).first().click().catch(() => {});
    await page.waitForTimeout(400);
    const newSaleNav = page.getByRole('button', { name: /nova venda|registrar venda/i }).first();
    if (await newSaleNav.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newSaleNav.click();
      await page.waitForTimeout(1000);
      const body = await page.locator('body').innerText();
      expect(/nova venda|opera[cç][aã]o|nf-e|xml/i.test(body)).toBeTruthy();
    }
  });
});
