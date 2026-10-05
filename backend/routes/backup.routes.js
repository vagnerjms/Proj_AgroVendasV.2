const express = require('express');
const router = express.Router();
const fs = require('fs');
const { upload } = require('../middlewares/upload');
const { requireAuth, requirePermission } = require('../middlewares/auth');
const backupService = require('../services/backup.service');

const RESTORE_CONFIRM_PHRASE = 'RESTAURAR';

function parseTruthy(value) {
  return value === true || value === 'true' || value === '1' || value === 1;
}

// Proteger todas as rotas de backup (apenas usuários autenticados com permissão de backup)
router.use(requireAuth);
router.use(requirePermission('backup_sistema'));

// GET /api/backup/stats
router.get('/stats', async (req, res, next) => {
  try {
    const stats = await backupService.getBackupStats();
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

// GET /api/backup/export
router.get('/export', async (req, res, next) => {
  try {
    const backupPackage = await backupService.generateBackupPackage();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="agrovenda_backup_completo_${timestamp}.json"`);
    res.send(JSON.stringify(backupPackage, null, 2));
  } catch (err) {
    next(err);
  }
});

// POST /api/backup/restore
router.post('/restore', upload.single('backupFile'), async (req, res, next) => {
  try {
    const confirmPhrase = req.body?.confirmPhrase;
    if (confirmPhrase !== RESTORE_CONFIRM_PHRASE) {
      return res.status(400).json({
        error: 'Confirmação inválida. Digite RESTAURAR para continuar.'
      });
    }

    const salesWithPayments = await backupService.countSalesWithPayments();
    const acknowledgePaymentsLoss = parseTruthy(req.body?.acknowledgePaymentsLoss);
    if (salesWithPayments > 0 && !acknowledgePaymentsLoss) {
      return res.status(409).json({
        error: 'Existem vendas com baixas/recebimentos. Confirme que entende a perda dessas baixas para restaurar.',
        salesWithPayments
      });
    }

    let backupData = null;

    if (req.file) {
      const rawText = await fs.promises.readFile(req.file.path, 'utf-8');
      backupData = JSON.parse(rawText);
      fs.promises.unlink(req.file.path).catch(() => {});
    } else if (req.body.backupJson) {
      backupData = typeof req.body.backupJson === 'string' ? JSON.parse(req.body.backupJson) : req.body.backupJson;
    } else {
      return res.status(400).json({ error: 'Nenhum arquivo de backup fornecido' });
    }

    const result = await backupService.restoreBackup(backupData);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
