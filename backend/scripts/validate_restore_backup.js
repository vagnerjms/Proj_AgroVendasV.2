/**
 * Valida backups/agrovenda_backup_reconciliado_rotas_2026-10-23.json
 * Uso: node backend/scripts/validate_restore_backup.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const FILE = process.env.BACKUP_PATH
  ? path.resolve(process.cwd(), process.env.BACKUP_PATH)
  : path.join(ROOT, 'backups', 'agrovenda_backup_reconciliado_rotas_2026-10-23.json');

function round2(n) {
  return Math.round(Number(n) * 100) / 100;
}

function collectRefs(sale) {
  const refs = [];
  const push = (k, v) => { if (v) refs.push([k, String(v)]); };
  push('nfFile', sale.nfFile);
  push('evidenceFile', sale.evidenceFile);
  push('paymentProofFile', sale.paymentProofFile);
  push('producerPaymentProofFile', sale.producerPaymentProofFile);
  (sale.paymentHistory || []).forEach((p, i) => {
    push(`ph${i}.proof`, p.paymentProofFile);
    (p.paymentProofFiles || []).forEach((f, j) => push(`ph${i}.files[${j}]`, f));
  });
  (sale.producerPaymentHistory || []).forEach((p, i) => {
    push(`pph${i}.proof`, p.paymentProofFile);
    (p.paymentProofFiles || []).forEach((f, j) => push(`pph${i}.files[${j}]`, f));
  });
  return refs;
}

function main() {
  if (!fs.existsSync(FILE)) {
    console.error('Arquivo não encontrado:', FILE);
    process.exit(2);
  }
  const j = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  const sales = j.database?.sales || [];
  const files = Array.isArray(j.files) ? j.files : [];
  const bySale = new Map();
  for (const f of files) {
    const sid = f.saleId || '';
    if (!bySale.has(sid)) bySale.set(sid, new Map());
    bySale.get(sid).set(f.filename, f);
  }

  const issues = [];
  const warnings = [];

  for (const s of sales) {
    for (const [k, name] of collectRefs(s)) {
      if (!bySale.get(s.id)?.has(name)) {
        issues.push(`BROKEN_REF ${s.id} ${k}=${name}`);
      }
    }
    const histSum = round2((s.paymentHistory || []).reduce((a, p) => a + Number(p.amount || 0), 0));
    const paid = round2(Number(s.paidAmount) || 0);
    if ((s.paymentHistory || []).length && Math.abs(histSum - paid) > 0.02) {
      issues.push(`PAID_MISMATCH ${s.id} hist=${histSum} paid=${paid} st=${s.paymentStatus}`);
    }
  }

  for (const f of files) {
    if (!f.contentBase64 || String(f.contentBase64).length < 8) {
      issues.push(`EMPTY_FILE ${f.saleId} ${f.filename}`);
    }
    if (/[/\\]/.test(f.filename || '')) issues.push(`PATH_IN_FILENAME ${f.filename}`);
    if (/^\d{10,}-\d+-/.test(f.filename || '')) warnings.push(`MULTER_NAME ${f.saleId} ${f.filename}`);
  }

  const badin = sales.filter((s) => /BADIN/i.test(s.client || ''));
  const bankTot = 104809.95;
  const badinPaid = round2(badin.reduce((a, s) => a + (Number(s.paidAmount) || 0), 0));
  const v008 = badin.find((s) => s.id === 'VP008');
  const v010 = badin.find((s) => s.id === 'VP010');
  const v018 = badin.find((s) => s.id === 'VP018');
  const v022 = badin.find((s) => s.id === 'VP022');

  if (Math.abs(badinPaid - bankTot) > 0.01) issues.push(`BADIN_TOTAL_PAID ${badinPaid}!=${bankTot}`);
  if (!v008 || v008.paymentStatus !== 'Parcial' || Math.abs(Number(v008.paidAmount) - 14296.32) > 0.01) {
    issues.push('BADIN_09718_NOT_PARTIAL_14296');
  }
  const open008 = round2((Number(v008?.valorTotalVP) || 0) - (Number(v008?.paidAmount) || 0));
  if (Math.abs(open008 - 7510.58) > 0.01) issues.push(`BADIN_09718_OPEN ${open008}`);
  for (const s of [v010, v018, v022]) {
    if (!s || s.paymentStatus !== 'Recebido') issues.push(`BADIN_NOT_RECEIVED ${s && s.id}`);
  }
  const p18 = (v008?.paymentHistory || [])[0];
  if (!p18 || p18.date !== '2026-09-18') issues.push('BADIN_14296_WRONG_DATE');

  const v23 = sales.find((s) => s.id === 'VP023');
  const has33902 = (v23?.paymentHistory || []).some(
    (p) => Math.abs(Number(p.amount) - 33902.4) < 0.01 && p.date === '2026-10-05'
  );
  if (!has33902) issues.push('WA_VP023_MISSING_33902');
  if (v23?.paymentStatus !== 'Recebido') issues.push('WA_VP023_NOT_RECEIVED');
  if (v23?.paymentProofFile && !bySale.get('VP023')?.has(v23.paymentProofFile)) {
    issues.push('WA_VP023_PROOF_MISSING');
  }

  const waOpen = sales
    .filter((s) => /W\s*&\s*A/i.test(s.client || ''))
    .reduce((a, s) => {
      const vp = Number(s.valorTotalVP) || 0;
      const paid = Number(s.paidAmount) || 0;
      const settled = s.paymentStatus === 'Recebido' || (vp > 0 && paid >= vp - 0.05);
      return a + (settled ? 0 : Math.max(0, vp - paid));
    }, 0);

  const summary = {
    file: path.relative(ROOT, FILE),
    sales: sales.length,
    files: files.length,
    issues: issues.length,
    warnings: warnings.length,
    badinPaid,
    bankTot,
    open008,
    waOpen: round2(waOpen),
    issuesList: issues,
    warningsSample: warnings.slice(0, 15)
  };

  console.log(JSON.stringify(summary, null, 2));
  if (issues.length) process.exit(1);
  console.log('OK — restore JSON válido (sem rotas quebradas / regras Badin+W&A OK)');
}

main();
