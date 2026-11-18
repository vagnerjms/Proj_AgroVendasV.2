/**
 * Normaliza embalagem canônica:
 * - Batata → Sacas (25kg) / boxWeightKg=25 / kg=qty×25
 * - Cenoura → Caixas (29kg) / 29
 * - Cebola/Alho → Granel (kg) / 1
 *
 * Vendas: só unit/boxWeightKg/kg/totalKg/totalVolumes.
 * NÃO altera valorTotalVP, dailyQuote, baixas.
 * SEM NF (!nfFile): totalOperation=0, nfPending=true, status='Pendente NF'.
 *
 * Uso:
 *   node scripts/migrate_packaging_canonical.js [--dry-run]
 */
try { require('dotenv').config({ path: require('path').join(__dirname, '../../.env') }); } catch (_) {}
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { Sale, Product } = require('../db');

function round2(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.round((x + Number.EPSILON) * 100) / 100;
}

function canonForName(name = '') {
  const n = String(name || '').toLowerCase();
  if (/batata/.test(n)) return { unit: 'Sacas (25kg)', boxWeightKg: 25, defaultUnit: 'Sacas (25kg)', unitKg: 25, kind: 'batata' };
  if (/cebola|alho/.test(n)) return { unit: 'Granel (kg)', boxWeightKg: 1, defaultUnit: 'Granel (kg)', unitKg: 1, kind: 'granel' };
  if (/cenoura/.test(n)) return { unit: 'Caixas (29kg)', boxWeightKg: 29, defaultUnit: 'Caixas (29kg)', unitKg: 29, kind: 'cenoura' };
  return null;
}

function isBatataItem(it) {
  const prod = String(it?.product || '').toLowerCase();
  const unit = String(it?.unit || '').toLowerCase();
  return /batata/.test(prod) || (/saca/.test(unit) && (/50\s*kg/.test(unit) || Number(it?.boxWeightKg) === 50));
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/agrovenda';
  await mongoose.connect(uri);
  console.log('Connected', dryRun ? '(dry-run)' : '');

  const report = {
    generatedAt: new Date().toISOString(),
    dryRun,
    products: { updated: [], skipped: [] },
    sales: { updated: [], semNfZeroed: [], alerts: [] },
    summary: {}
  };

  // --- Products ---
  const products = await Product.find({}).lean();
  for (const p of products) {
    const canon = canonForName(p.name);
    if (!canon) {
      report.products.skipped.push({ id: p.id, name: p.name, reason: 'fora_da_regra' });
      continue;
    }
    const needs =
      Number(p.unitKg) !== canon.unitKg ||
      String(p.defaultUnit || '') !== canon.defaultUnit;
    if (!needs) {
      report.products.skipped.push({ id: p.id, name: p.name, reason: 'ja_ok' });
      continue;
    }
    const before = { unitKg: p.unitKg, defaultUnit: p.defaultUnit };
    const after = { unitKg: canon.unitKg, defaultUnit: canon.defaultUnit };
    report.products.updated.push({ id: p.id, name: p.name, before, after });
    if (!dryRun) {
      await Product.updateOne({ id: p.id }, { $set: after });
    }
  }

  // --- Sales (batata packaging + SEM NF) ---
  const sales = await Sale.find({}).lean();
  for (const s of sales) {
    const items = Array.isArray(s.items) ? s.items : [];
    let touchedPackaging = false;
    const beforeItems = items.map((it) => ({
      product: it.product,
      unit: it.unit,
      boxWeightKg: it.boxWeightKg,
      quantity: it.quantity,
      kg: it.kg
    }));

    const nextItems = items.map((it) => {
      const copy = { ...it };
      const canon = canonForName(it.product) || (isBatataItem(it) ? canonForName('Batata') : null);
      if (!canon || canon.kind !== 'batata') {
        // Ainda normaliza cenoura/cebola/alho se presente
        if (canon && (canon.kind === 'cenoura' || canon.kind === 'granel')) {
          const qty = Number(copy.quantity) || 0;
          const nextKg = qty > 0 ? round2(qty * canon.boxWeightKg) : Number(copy.kg) || 0;
          if (
            String(copy.unit) !== canon.unit ||
            Number(copy.boxWeightKg) !== canon.boxWeightKg ||
            (qty > 0 && Number(copy.kg) !== nextKg)
          ) {
            touchedPackaging = true;
            copy.unit = canon.unit;
            copy.boxWeightKg = canon.boxWeightKg;
            if (qty > 0) copy.kg = nextKg;
          }
        }
        return copy;
      }

      const qty = Number(copy.quantity) || 0;
      const nextKg = qty > 0 ? round2(qty * 25) : Number(copy.kg) || 0;
      if (
        String(copy.unit) !== 'Sacas (25kg)' ||
        Number(copy.boxWeightKg) !== 25 ||
        (qty > 0 && Number(copy.kg) !== nextKg)
      ) {
        touchedPackaging = true;
        copy.unit = 'Sacas (25kg)';
        copy.boxWeightKg = 25;
        if (qty > 0) copy.kg = nextKg;
      }
      return copy;
    });

    const totalKg = round2(nextItems.reduce((a, it) => a + (Number(it.kg) || 0), 0));
    const totalVolumes = round2(nextItems.reduce((a, it) => a + (Number(it.quantity) || 0), 0));

    const noNf = !s.nfFile;
    const semNfNeedsFix =
      noNf &&
      (Number(s.totalOperation) !== 0 || s.nfPending !== true || String(s.status || '') !== 'Pendente NF');

    // Alerta: 10185 VP anômalo permanece; só zera NF$
    if (String(s.id) === '10185' || String(s.romaneioNumber || '').includes('10185')) {
      report.sales.alerts.push({
        id: s.id,
        romaneio: s.romaneioNumber,
        message: 'VP comercial permanece como no banco; migração não reescreve cotações. SEM NF → totalOperation=0.'
      });
    }

    if (!touchedPackaging && !semNfNeedsFix) continue;

    const patch = {};
    if (touchedPackaging) {
      patch.items = nextItems;
      patch.totalKg = totalKg;
      patch.totalVolumes = totalVolumes;
    }
    if (semNfNeedsFix) {
      patch.totalOperation = 0;
      patch.nfPending = true;
      patch.status = 'Pendente NF';
    }

    const entry = {
      id: s.id,
      romaneio: s.romaneioNumber,
      client: s.client,
      before: {
        items: beforeItems,
        totalKg: s.totalKg,
        totalVolumes: s.totalVolumes,
        totalOperation: s.totalOperation,
        status: s.status,
        nfFile: s.nfFile || null,
        valorTotalVP: s.valorTotalVP
      },
      after: {
        items: touchedPackaging ? nextItems.map((it) => ({
          product: it.product,
          unit: it.unit,
          boxWeightKg: it.boxWeightKg,
          quantity: it.quantity,
          kg: it.kg
        })) : beforeItems,
        totalKg: patch.totalKg != null ? patch.totalKg : s.totalKg,
        totalVolumes: patch.totalVolumes != null ? patch.totalVolumes : s.totalVolumes,
        totalOperation: patch.totalOperation != null ? patch.totalOperation : s.totalOperation,
        status: patch.status || s.status
      },
      touchedPackaging,
      semNfZeroed: !!semNfNeedsFix
    };

    report.sales.updated.push(entry);
    if (semNfNeedsFix) report.sales.semNfZeroed.push({ id: s.id, romaneio: s.romaneioNumber });

    if (!dryRun) {
      await Sale.updateOne({ id: s.id }, { $set: patch });
    }
  }

  report.summary = {
    productsUpdated: report.products.updated.length,
    salesUpdated: report.sales.updated.length,
    semNfZeroed: report.sales.semNfZeroed.length,
    alerts: report.sales.alerts.length
  };

  const outDir = path.join(__dirname, '../../backups');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(
    outDir,
    `migrate_packaging_canonical_${new Date().toISOString().slice(0, 10)}${dryRun ? '_dry' : ''}.json`
  );
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(JSON.stringify({ ...report.summary, reportPath: outPath }, null, 2));
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
