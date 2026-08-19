const fs = require('fs');
const path = require('path');
const { Sale } = require('../db');
const { uploadDir } = require('../middlewares/upload');

/**
 * Remove arquivos órfãos/temporários da pasta uploads que não estejam vinculados
 * a nenhuma venda salva no banco de dados e que tenham mais de 15 minutos de criação.
 */
async function cleanupOrphanUploads() {
  try {
    if (!fs.existsSync(uploadDir)) return { deletedCount: 0 };

    const sales = await Sale.find({}, { nfFile: 1, evidenceFile: 1 }).lean();
    const activeFiles = new Set();
    sales.forEach(s => {
      if (s.nfFile) activeFiles.add(s.nfFile);
      if (s.evidenceFile) activeFiles.add(s.evidenceFile);
    });

    const diskFiles = fs.readdirSync(uploadDir);
    const now = Date.now();
    const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
    let deletedCount = 0;

    for (const filename of diskFiles) {
      if (!activeFiles.has(filename)) {
        const filePath = path.join(uploadDir, filename);
        try {
          const stat = fs.statSync(filePath);
          // Só remove se tiver mais de 15 minutos (para não apagar arquivos de formulários abertos sendo preenchidos)
          if (now - stat.mtimeMs > FIFTEEN_MINUTES_MS) {
            fs.unlinkSync(filePath);
            deletedCount++;
            console.log(`[Cleanup] Arquivo temporário órfão removido: ${filename}`);
          }
        } catch (e) {
          console.warn(`[Cleanup] Não foi possível remover ${filename}:`, e.message);
        }
      }
    }

    return { success: true, deletedCount };
  } catch (err) {
    console.error('[Cleanup] Erro na limpeza de arquivos órfãos:', err);
    return { success: false, error: err.message };
  }
}

// Iniciar agendamento automático a cada 1 hora
function startCleanupScheduler() {
  // Executar uma limpeza inicial após 10 segundos de boot
  setTimeout(() => {
    cleanupOrphanUploads();
  }, 10000);

  // Executar periodicamente a cada 1 hora
  setInterval(() => {
    cleanupOrphanUploads();
  }, 60 * 60 * 1000);
}

module.exports = {
  cleanupOrphanUploads,
  startCleanupScheduler
};
