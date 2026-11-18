const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middlewares/auth');
const { getStoresSummary, getProducersSummary, triggerN8nReport } = require('../services/report.service');
const { htmlToPdfBuffer } = require('../services/pdf.service');

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

// GET /api/reports/producers-summary - Extrato analítico exclusivo do Produtor Rural (baseado em NF)
router.get('/producers-summary', async (req, res, next) => {
  try {
    const summary = await getProducersSummary(req.query);
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

// POST /api/reports/fiscal-pdf — HTML → PDF real (Playwright Chromium)
router.post('/fiscal-pdf', async (req, res, next) => {
  try {
    const html = req.body?.html;
    if (!html || typeof html !== 'string' || html.length < 20) {
      return res.status(400).json({ error: 'Campo html é obrigatório.' });
    }
    if (html.length > 8_000_000) {
      return res.status(413).json({ error: 'HTML excessivamente grande.' });
    }
    const pdfBuffer = await htmlToPdfBuffer(html, {
      landscape: req.body?.landscape !== false,
      format: 'A4'
    });
    const filename = String(req.body?.filename || `Fiscal_Contas_${new Date().toISOString().slice(0, 10)}.pdf`)
      .replace(/[^\w.\-]+/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
