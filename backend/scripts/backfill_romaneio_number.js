/**
 * Backfill Sale.romaneioNumber a partir de "Planilha VP:" em notes
 * e/ou nome do evidenceFile (09733-….jpeg).
 *
 * Uso: node scripts/backfill_romaneio_number.js [--dry-run]
 */
try { require('dotenv').config({ path: require('path').join(__dirname, '../../.env') }); } catch (_) {}
const mongoose = require('mongoose');
const { Sale } = require('../db');
const {
  formatRomaneioNumber,
  extractRomaneioFromNotes,
  extractRomaneioFromFilename
} = require('../utils/dataHelpers');

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/agrovenda';
  await mongoose.connect(uri);
  console.log('Connected');

  const sales = await Sale.find({}).lean();
  let updated = 0;
  let skipped = 0;

  for (const s of sales) {
    if (s.romaneioNumber && String(s.romaneioNumber).trim()) {
      skipped += 1;
      continue;
    }
    const fromNotes = extractRomaneioFromNotes(s.notes);
    const fromFile = extractRomaneioFromFilename(s.evidenceFile);
    const value = fromNotes || fromFile;
    if (!value) {
      skipped += 1;
      continue;
    }
    const romaneioNumber = formatRomaneioNumber(value);
    console.log(`${dryRun ? '[dry]' : '[upd]'} ${s.id} → ${romaneioNumber}`);
    if (!dryRun) {
      await Sale.updateOne({ id: s.id }, { $set: { romaneioNumber } });
    }
    updated += 1;
  }

  console.log(`Done. updated=${updated} skipped=${skipped} dryRun=${dryRun}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
