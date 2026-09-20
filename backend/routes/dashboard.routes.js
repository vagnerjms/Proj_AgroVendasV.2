const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middlewares/auth');
const dashboardService = require('../services/dashboard.service');

// Protect all dashboard endpoints with JWT authentication
router.use(requireAuth);

// GET /api/dashboard (Métricas consolidadas, KPIs e alertas via dashboard.service.js)
router.get('/', async (req, res, next) => {
  try {
    const data = await dashboardService.getDashboardData(req.query);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
