/**
 * Importa vendas do lote batata out/nov via createSale (idempotente por romaneioNumber).
 *
 * Uso (no host/container com MONGO_URI):
 *   CONSOLIDADO_PATH=/path/VENDAS_BATATA_OUT_NOV_2026_CONSOLIDADO.json \
 *   MONGO_URI=mongodb://mongodb:27017/agrovenda \
 *   SKIP_WEBHOOK=1 \
 *   node backend/scripts/import_batata_out_nov_createsale.js
 *
 * SKIP_WEBHOOK=1 evita republicar anexos no Drive (já estão em ROM-*).
 * Após import, rode rename_rom_folders_to_vp.js no Desktop sync.
 */
const path = require('path');
const fs = require('fs');

process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/agrovenda';

const { connectDB } = require('../db');
const Sale = require('../models/Sale.model');
const saleService = require('../services/sale.service');

const CONSOLIDADO_PATH = process.env.CONSOLIDADO_PATH
  || path.resolve(__dirname, '../../backups/vendas_out_nov/VENDAS_BATATA_OUT_NOV_2026_CONSOLIDADO.json');
const SKIP_WEBHOOK = String(process.env.SKIP_WEBHOOK || '1') !== '0';
const DRY_RUN = String(process.env.DRY_RUN || '0') === '1';

async function main() {
  if (!fs.existsSync(CONSOLIDADO_PATH)) {
    console.error('JSON não encontrado:', CONSOLIDADO_PATH);
    process.exit(1);
  }

  const pack = JSON.parse(fs.readFileSync(CONSOLIDADO_PATH, 'utf8'));
  const sales = Array.isArray(pack.sales) ? pack.sales : [];
  console.log(JSON.stringify({
    consolidado: CONSOLIDADO_PATH,
    cargas: sales.length,
    skipWebhook: SKIP_WEBHOOK,
    dryRun: DRY_RUN,
    mongo: process.env.MONGO_URI.replace(/\/\/.*@/, '//***@')
  }, null, 2));

  if (SKIP_WEBHOOK) {
    // Impede upload duplicado de Pedido/NF no Drive durante o create
    process.env.N8N_WEBHOOK_URL = '';
  }

  await connectDB();

  const results = [];
  for (const raw of sales) {
    const rom = String(raw.romaneioNumber || '').trim();
    if (!rom) {
      results.push({ ok: false, error: 'sem romaneio' });
      continue;
    }

    const existing = await Sale.findOne({ romaneioNumber: rom }).lean();
    if (existing) {
      results.push({
        ok: true,
        skipped: true,
        romaneioNumber: rom,
        saleId: existing.id,
        reason: 'já existe'
      });
      continue;
    }

    const body = {
      operationType: raw.operationType,
      saleDate: raw.saleDate,
      client: raw.client,
      clientDocument: raw.clientDocument || '',
      origin: raw.origin,
      destCity: raw.destCity || '',
      destUF: raw.destUF || '',
      notes: raw.notes || '',
      nfFile: raw.nfFile || null,
      nfNumber: raw.nfNumber || '',
      nfeKey: raw.nfeKey || '',
      nfeDate: raw.nfeDate || '',
      evidenceFile: raw.evidenceFile || null,
      freightType: raw.freightType || 'CIF (Pago pelo Remetente)',
      items: raw.items || [],
      feeType: raw.feeType || 'Porcentagem (%)',
      feeValue: raw.feeValue != null ? raw.feeValue : 3,
      dailyQuote: raw.dailyQuote || 0,
      valorTotalVP: raw.valorTotalVP,
      totalVolumes: raw.totalVolumes,
      totalKg: raw.totalKg,
      totalOperation: raw.totalOperation,
      paymentTerms: raw.paymentTerms || '60 dias',
      paymentTermDays: raw.paymentTermDays != null ? raw.paymentTermDays : 60,
      romaneioNumber: rom,
      skipPatioReconcile: true
    };

    if (DRY_RUN) {
      results.push({ ok: true, dryRun: true, romaneioNumber: rom, valorTotalVP: body.valorTotalVP });
      continue;
    }

    try {
      const created = await saleService.createSale(body);
      results.push({
        ok: true,
        created: true,
        romaneioNumber: rom,
        saleId: created.id,
        status: created.status,
        valorTotalVP: created.valorTotalVP,
        totalOperation: created.totalOperation,
        nfFile: created.nfFile,
        evidenceFile: created.evidenceFile,
        suggestedRename: {
          from: `ROM-${rom}`,
          to: created.id,
          storeFolder: raw.driveFolder?.storeFolder || null,
          suggestedPathWas: raw.driveFolder?.suggestedPath || null
        }
      });
    } catch (e) {
      results.push({ ok: false, romaneioNumber: rom, error: e.message });
    }
  }

  const created = results.filter((r) => r.created);
  const skipped = results.filter((r) => r.skipped);
  const failed = results.filter((r) => !r.ok);

  const audit = {
    created: created.length,
    skipped: skipped.length,
    failed: failed.length,
    createdIds: created.map((r) => ({ rom: r.romaneioNumber, id: r.saleId })),
    failedDetails: failed,
    renamePlan: created.map((r) => r.suggestedRename).filter(Boolean)
  };

  const outPath = path.resolve(
    path.dirname(CONSOLIDADO_PATH),
    `_import_createsale_result_${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  );
  fs.writeFileSync(outPath, JSON.stringify({ at: new Date().toISOString(), results, audit }, null, 2));
  console.log(JSON.stringify({ outPath, audit }, null, 2));
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
