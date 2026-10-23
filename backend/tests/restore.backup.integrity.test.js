/**
 * Integridade do pacote de restore reconciliado + regras Badin/W&A.
 * - Fixture mínima sempre roda no CI
 * - Pacote real em backups/ é validado quando presente (local / artefato)
 */
const fs = require('fs');
const path = require('path');
const { buildDriveAttachmentName, buildDriveSuggestedPath } = require('../utils/dataHelpers');

const ROOT = path.resolve(__dirname, '../..');
const RESTORE_JSON = path.join(ROOT, 'backups', 'agrovenda_backup_reconciliado_rotas_2026-10-23.json');

function round2(n) {
  return Math.round(Number(n) * 100) / 100;
}

function collectRefs(sale) {
  const refs = [];
  const push = (v) => { if (v) refs.push(String(v)); };
  push(sale.nfFile);
  push(sale.evidenceFile);
  push(sale.paymentProofFile);
  push(sale.producerPaymentProofFile);
  (sale.paymentHistory || []).forEach((p) => {
    push(p.paymentProofFile);
    (p.paymentProofFiles || []).forEach(push);
  });
  (sale.producerPaymentHistory || []).forEach((p) => {
    push(p.paymentProofFile);
    (p.paymentProofFiles || []).forEach(push);
  });
  return refs;
}

function assertPackageIntegrity(pkg) {
  const sales = pkg.database?.sales || pkg.sales || [];
  const files = Array.isArray(pkg.files) ? pkg.files : [];
  const bySale = new Map();
  for (const f of files) {
    const sid = f.saleId || '';
    if (!bySale.has(sid)) bySale.set(sid, new Set());
    bySale.get(sid).add(f.filename);
  }

  const broken = [];
  for (const s of sales) {
    for (const name of collectRefs(s)) {
      if (!bySale.get(s.id)?.has(name)) broken.push(`${s.id}:${name}`);
    }
    const histSum = round2((s.paymentHistory || []).reduce((a, p) => a + Number(p.amount || 0), 0));
    const paid = round2(Number(s.paidAmount) || 0);
    if ((s.paymentHistory || []).length && Math.abs(histSum - paid) > 0.02) {
      broken.push(`PAID_MISMATCH:${s.id}:${histSum}:${paid}`);
    }
  }
  for (const f of files) {
    expect(f.filename).toBeTruthy();
    expect(String(f.filename)).not.toMatch(/[/\\]/);
    expect(f.contentBase64 && String(f.contentBase64).length >= 8).toBe(true);
  }
  expect(broken).toEqual([]);
}

describe('restore package — fixture mínima', () => {
  const tinyB64 = Buffer.from('pdf-bytes').toString('base64');

  test('refs da venda apontam para files[] do mesmo saleId', () => {
    const rom = '09733';
    const nf = '28042894';
    const nfName = buildDriveAttachmentName('nf', { romaneioNumber: rom, nfNumber: nf, ext: '.pdf' });
    const pedName = buildDriveAttachmentName('pedido', { romaneioNumber: rom, ext: '.jpeg' });
    const cpName = buildDriveAttachmentName('cp', { romaneioNumber: rom, nfNumber: nf, ext: '.pdf', seq: 1 });

    const pkg = {
      database: {
        sales: [{
          id: 'VP023',
          client: 'W & A DISTRIBUIDORA DE VERDURAS LTDA',
          romaneioNumber: rom,
          nfFile: nfName,
          evidenceFile: pedName,
          paymentProofFile: cpName,
          paidAmount: 33902.4,
          paymentStatus: 'Parcial',
          paymentHistory: [{
            amount: 33902.4,
            date: '2026-10-05',
            paymentProofFile: cpName,
            paymentProofFiles: [cpName]
          }]
        }]
      },
      files: [
        { filename: nfName, saleId: 'VP023', sizeBytes: 10, contentBase64: tinyB64 },
        { filename: pedName, saleId: 'VP023', sizeBytes: 10, contentBase64: tinyB64 },
        { filename: cpName, saleId: 'VP023', sizeBytes: 10, contentBase64: tinyB64 }
      ]
    };

    assertPackageIntegrity(pkg);
    expect(cpName).toBe('09733-CP01-28042894.pdf');
    expect(buildDriveSuggestedPath({
      client: 'W & A DISTRIBUIDORA DE VERDURAS LTDA',
      saleId: 'VP023',
      storeName: 'W & A DISTRIBUIDORA DE VERDURAS LTDA'
    }).suggestedPath).toContain('VP023');
  });

  test('detecta rota perdida (ref sem arquivo)', () => {
    const pkg = {
      database: {
        sales: [{
          id: 'VP001',
          nfFile: '09711-NF-27957662.pdf',
          paidAmount: 0,
          paymentHistory: []
        }]
      },
      files: []
    };
    expect(() => assertPackageIntegrity(pkg)).toThrow();
  });
});

describe('Badin ledger — regras de fechamento', () => {
  test('8 comprovantes = 104809.95; 09718 parcial 7510.58; demais quitados', () => {
    const bank = [
      { date: '2026-09-18', amount: 14296.32 },
      { date: '2026-10-05', amount: 32300.19 },
      { date: '2026-10-06', amount: 10416.31 },
      { date: '2026-10-08', amount: 10416.31 },
      { date: '2026-10-09', amount: 10934.12 },
      { date: '2026-10-13', amount: 11123.35 },
      { date: '2026-10-14', amount: 11123.35 },
      { date: '2026-10-15', amount: 4200 }
    ];
    expect(round2(bank.reduce((a, b) => a + b.amount, 0))).toBe(104809.95);

    // Alocação canônica
    const vp008 = { vp: 21806.9, paid: 14296.32 }; // 09718
    const vp010 = { paidParts: [10416.31, 10416.31, 3991.86] }; // 09720
    const vp018 = { paidParts: [5319.17, 11123.35, 11123.35, 4200] }; // 09728
    const vp022 = { paidParts: [32300.19, 1623.09] }; // 09732

    expect(round2(vp008.vp - vp008.paid)).toBe(7510.58);
    expect(round2(vp010.paidParts.reduce((a, b) => a + b, 0))).toBe(24824.48);
    expect(round2(vp018.paidParts.reduce((a, b) => a + b, 0))).toBe(31765.87);
    expect(round2(vp022.paidParts.reduce((a, b) => a + b, 0))).toBe(33923.28);
    // rateio do PIX 10934.12
    expect(round2(3991.86 + 5319.17 + 1623.09)).toBe(10934.12);
  });
});

describe('restore JSON real (quando presente)', () => {
  const present = fs.existsSync(RESTORE_JSON);
  const maybe = present ? test : test.skip;

  maybe('pacote reconciliado sem rotas quebradas + Badin/W&A', () => {
    const pkg = JSON.parse(fs.readFileSync(RESTORE_JSON, 'utf8'));
    assertPackageIntegrity(pkg);

    const sales = pkg.database.sales;
    const badin = sales.filter((s) => /BADIN/i.test(s.client || ''));
    const paid = round2(badin.reduce((a, s) => a + (Number(s.paidAmount) || 0), 0));
    expect(paid).toBe(104809.95);

    const v008 = badin.find((s) => s.id === 'VP008');
    expect(v008.paymentStatus).toBe('Parcial');
    expect(round2(v008.paidAmount)).toBe(14296.32);
    expect(v008.paymentHistory[0].date).toBe('2026-09-18');
    expect(round2(v008.valorTotalVP - v008.paidAmount)).toBe(7510.58);

    for (const id of ['VP010', 'VP018', 'VP022']) {
      expect(badin.find((s) => s.id === id).paymentStatus).toBe('Recebido');
    }

    const v23 = sales.find((s) => s.id === 'VP023');
    expect(v23.paymentStatus).toBe('Recebido');
    expect(v23.paymentHistory.some((p) => Math.abs(Number(p.amount) - 33902.4) < 0.01)).toBe(true);

    // nenhum nome multer cru no pacote
    for (const f of pkg.files) {
      expect(f.filename).not.toMatch(/^\d{10,}-\d+-/);
    }
  });
});
