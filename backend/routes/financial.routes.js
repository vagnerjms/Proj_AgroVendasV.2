const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middlewares/auth');
const financialService = require('../services/financial.service');

// Protect all financial endpoints with JWT authentication
router.use(requireAuth);

// GET /api/financial (Com suporte a filtros por período startDate/endDate e consolidação via financial.service.js)
router.get('/', async (req, res, next) => {
  try {
    const summary = await financialService.getFinancialSummary(req.query);
    res.json(summary);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
