const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middlewares/auth');
const { getStoresSummary, triggerN8nReport } = require('../services/report.service');

// Protect all reports endpoints with JWT authentication
router.use(requireAuth);

// GET /api/reports/stores-summary
router.get('/stores-summary', async (req, res, next) => {
  try {
    const summary = await getStoresSummary(req.query);
    res.json(summary);
  } catch (err) {
    next(err);
  }
});

// POST /api/reports/trigger-n8n - Dispara webhook do n8n para gerar e salvar no Google Drive
router.post('/trigger-n8n', async (req, res, next) => {
  try {
    const result = await triggerN8nReport(req.user, req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
