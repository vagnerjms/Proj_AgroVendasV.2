/**
 * Restaura backup completo no Mongo (e arquivos no uploadDir local).
 *
 * Backup bruto (como exportado):
 *   MONGO_URI=mongodb://127.0.0.1:27017/agrovenda node backend/scripts/restore_from_docs_backup.js
 *
 * Backup reconciliado (pagamentos zerados + romaneio/NF/anexos normalizados):
 *   BACKUP_PATH=docs/agrovenda_backup_reconciliado_zerado.json ^
 *   MONGO_URI=mongodb://127.0.0.1:27017/agrovenda ^
 *   node backend/scripts/restore_from_docs_backup.js
 *
 * Gerar o JSON reconciliado + checklist:
 *   node backend/scripts/reconcile_docs_backup.js
 *
 * Relatório: docs/RECONCILIACAO_BACKUP_2026-10-01.md e .csv
 */
const path = require('path');
const fs = require('fs');
const { connectDB } = require('../db');
const { restoreBackup } = require('../services/backup.service');
const { uploadDir } = require('../middlewares/upload');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/agrovenda';
const BACKUP_PATH = process.env.BACKUP_PATH || path.resolve(__dirname, '../../docs/agrovenda_backup_completo_2026-10-01.json');

async function main() {
  if (!/localhost|127\.0\.0\.1|mongodb:27017/.test(MONGO_URI) && !process.env.ALLOW_REMOTE_RESTORE) {
    console.error('Abortado: restore só em Mongo local (defina ALLOW_REMOTE_RESTORE=1 se precisar).');
    process.exit(1);
  }
  if (!fs.existsSync(BACKUP_PATH)) {
    console.error('Backup não encontrado:', BACKUP_PATH);
    process.exit(1);
  }

  console.log('Lendo', BACKUP_PATH);
  const backupData = JSON.parse(fs.readFileSync(BACKUP_PATH, 'utf8'));
  console.log('Stats no arquivo:', backupData.stats);

  process.env.MONGO_URI = MONGO_URI;
  await connectDB();
  console.log('Restaurando em', MONGO_URI, '→ uploads:', uploadDir);

  const result = await restoreBackup(backupData);
  console.log(JSON.stringify(result, null, 2));

  const { Sale, Client, Product, WeighingSlip } = require('../models');
  const counts = {
    sales: await Sale.countDocuments(),
    clients: await Client.countDocuments(),
    products: await Product.countDocuments(),
    slips: await WeighingSlip.countDocuments(),
    uploadFiles: fs.existsSync(uploadDir) ? fs.readdirSync(uploadDir).length : 0
  };
  console.log('Contagens pós-restore:', counts);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
