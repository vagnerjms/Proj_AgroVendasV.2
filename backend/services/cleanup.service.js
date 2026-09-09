const fs = require('fs');
const path = require('path');
const { Sale, WeighingSlip } = require('../db');
const { uploadDir } = require('../middlewares/upload');

/**
 * Remove arquivos temporários órfãos da pasta uploads que não estejam vinculados
 * a nenhuma venda, comprovante ou romaneio e com mais de 30 minutos de criação.
 */
async function cleanupOrphanUploads() {
  try {
    if (!fs.existsSync(uploadDir)) return { deletedCount: 0 };

    const [sales, slips] = await Promise.all([
      Sale.find({}, { nfFile: 1, evidenceFile: 1, paymentProofFile: 1 }).lean(),
      WeighingSlip.find({}, { ticketImage: 1, attachment: 1 }).lean()
    ]);

    const activeFiles = new Set();
    sales.forEach(s => {
      if (s.nfFile) activeFiles.add(s.nfFile);
      if (s.evidenceFile) activeFiles.add(s.evidenceFile);
      if (s.paymentProofFile) activeFiles.add(s.paymentProofFile);
    });

    slips.forEach(sl => {
      if (sl.ticketImage) activeFiles.add(sl.ticketImage);
      if (sl.attachment) activeFiles.add(sl.attachment);
    });

    const diskFiles = await fs.promises.readdir(uploadDir);
    const now = Date.now();
    const THIRTY_MINUTES_MS = 30 * 60 * 1000;
    let deletedCount = 0;

    for (const filename of diskFiles) {
      if (!activeFiles.has(filename)) {
        const filePath = path.join(uploadDir, filename);
        try {
          const stat = await fs.promises.stat(filePath);
          if (now - stat.mtimeMs > THIRTY_MINUTES_MS) {
            await fs.promises.unlink(filePath);
            deletedCount++;
            console.log(`[Cleanup] Arquivo temporário órfão removido com segurança: ${filename}`);
          }
        } catch (e) {}
      }
    }

    return { success: true, deletedCount };
  } catch (err) {
    console.error('[Cleanup] Erro na limpeza de arquivos órfãos:', err);
    return { success: false, error: err.message };
  }
}

function startCleanupScheduler() {
  setTimeout(() => {
    cleanupOrphanUploads();
  }, 15000);

  setInterval(() => {
    cleanupOrphanUploads();
  }, 60 * 60 * 1000);
}

module.exports = {
  cleanupOrphanUploads,
  startCleanupScheduler
};

