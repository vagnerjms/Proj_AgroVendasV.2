const express = require('express');
const router = express.Router();
const auditService = require('../services/audit.service');
const { requireAuth } = require('../middlewares/auth');

// Todas as rotas de notificações exigem autenticação
router.use(requireAuth);

/**
 * GET /api/notifications
 * Retorna contadores agregados e lista completa de inconsistências/alertas
 */
router.get('/', async (req, res, next) => {
  try {
    const force = req.query.force === 'true';
    const data = await auditService.generateNotifications(force);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/notifications/refresh
 * Força a reavaliação imediata de todas as regras de auditoria
 */
router.post('/refresh', async (req, res, next) => {
  try {
    auditService.invalidateAuditCache();
    const data = await auditService.generateNotifications(true);
    res.json({
      message: 'Notificações e auditoria atualizadas com sucesso.',
      ...data
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
