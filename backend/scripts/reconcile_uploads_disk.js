/**
 * Reconcilia campos de anexo das vendas (nfFile / evidenceFile / paymentProofFile)
 * com ficheiros reais em backend/uploads.
 *
 * Uso:
 *   node scripts/reconcile_uploads_disk.js           # dry-run
 *   node scripts/reconcile_uploads_disk.js --apply   # atualiza Mongo para o nome no disco
 *
 * Preferência: atualizar Mongo → nome real no disco (não renomeia PDFs).
 */
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

const APPLY = process.argv.includes('--apply');

async function main() {
  if (!process.env.MONGO_URI) {
    process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/agrovenda';
  }

  const { connectDB } = require('../db');
  const { Sale } = require('../models');
  const { uploadDir } = require('../middlewares/upload');
  const { resolveUploadFile } = require('../utils/resolveUploadFile');

  await connectDB();

  if (!fs.existsSync(uploadDir)) {
    console.error('Pasta uploads inexistente:', uploadDir);
    process.exit(1);
  }

  const diskFiles = await fs.promises.readdir(uploadDir);
  console.log('Uploads dir:', uploadDir);
  console.log('Ficheiros no disco:', diskFiles.length);
  console.log('Modo:', APPLY ? 'APPLY (grava Mongo)' : 'DRY-RUN');

  const sales = await Sale.find({
    $or: [
      { nfFile: { $exists: true, $ne: null, $ne: '' } },
      { evidenceFile: { $exists: true, $ne: null, $ne: '' } },
      { paymentProofFile: { $exists: true, $ne: null, $ne: '' } }
    ]
  }).lean();

  const report = { matched: [], missing: [], alreadyOk: [], updated: [] };
  const fields = ['nfFile', 'evidenceFile', 'paymentProofFile'];

  for (const sale of sales) {
    for (const field of fields) {
      const value = sale[field];
      if (!value) continue;

      const exactPath = path.join(uploadDir, path.basename(String(value)));
      if (fs.existsSync(exactPath)) {
        report.alreadyOk.push({ id: sale.id, field, value });
        continue;
      }

      const resolved = resolveUploadFile(value, { dir: uploadDir, diskFiles });
      if (!resolved) {
        report.missing.push({ id: sale.id, field, value });
        continue;
      }

      if (resolved.filename === value) {
        report.alreadyOk.push({ id: sale.id, field, value });
        continue;
      }

      report.matched.push({
        id: sale.id,
        field,
        from: value,
        to: resolved.filename
      });

      if (APPLY) {
        await Sale.updateOne({ id: sale.id }, { $set: { [field]: resolved.filename } });
        report.updated.push({ id: sale.id, field, to: resolved.filename });
      }
    }
  }

  console.log('\n=== Relatório ===');
  console.log('Já OK:', report.alreadyOk.length);
  console.log('Resolvíveis (nome divergente):', report.matched.length);
  console.log('Missing (sem ficheiro):', report.missing.length);
  if (APPLY) console.log('Atualizados:', report.updated.length);

  if (report.matched.length) {
    console.log('\n-- Matches (amostra até 25) --');
    report.matched.slice(0, 25).forEach((r) => {
      console.log(`  ${r.id}.${r.field}: "${r.from}" → "${r.to}"`);
    });
  }
  if (report.missing.length) {
    console.log('\n-- Missing (amostra até 25) --');
    report.missing.slice(0, 25).forEach((r) => {
      console.log(`  ${r.id}.${r.field}: "${r.value}"`);
    });
  }

  const outPath = path.join(__dirname, '../../docs/reconcile_uploads_report.json');
  try {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify({
      at: new Date().toISOString(),
      apply: APPLY,
      counts: {
        alreadyOk: report.alreadyOk.length,
        matched: report.matched.length,
        missing: report.missing.length,
        updated: report.updated.length
      },
      matched: report.matched,
      missing: report.missing,
      updated: report.updated
    }, null, 2));
    console.log('\nRelatório JSON:', outPath);
  } catch (e) {
    console.warn('Não foi possível gravar relatório JSON:', e.message);
  }

  await mongoose.disconnect().catch(() => {});
  process.exit(report.missing.length && !report.matched.length ? 2 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
