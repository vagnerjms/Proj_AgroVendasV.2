const express = require('express');
const router = express.Router();
const { Sale } = require('../db');
const { calculateFiscalDeductions, roundMoney } = require('../utils/money');
const { sendSaleWebhook } = require('../services/webhook.service');
const { escapeRegex } = require('../utils/security');
const { requireAuth } = require('../middlewares/auth');
const saleService = require('../services/sale.service');

// Protect all sales endpoints with JWT authentication
router.use(requireAuth);

// GET /api/sales/agenda-events (Recebíveis formatados por Data de Vencimento para n8n & Google Calendar via sale.service.js)
router.get('/agenda-events', async (req, res, next) => {
  try {
    const events = await saleService.getAgendaEvents();
    res.json(events);
  } catch (err) {
    next(err);
  }
});

// GET /api/sales (Lista de vendas com paginação, filtros e busca)
router.get('/', async (req, res, next) => {
  try {
    const { operationType, status, search, page, limit } = req.query;
    let filter = {};
    if (operationType && operationType !== 'all') {
      filter.operationType = operationType;
    }
    if (status && status !== 'all') {
      if (status === 'Pendente NF') {
        filter.$or = [
          { nfFile: { $in: [null, ''] } },
          { nfPending: true, nfFile: { $in: [null, ''] } }
        ];
      } else if (status === 'Faturado') {
        filter.$or = [
          { status: 'Faturado' },
          { nfFile: { $exists: true, $ne: null, $ne: '' } }
        ];
      } else {
        filter.status = status;
      }
    }
    if (search && search.trim()) {
      const escaped = escapeRegex(search.trim());
      const regex = new RegExp(escaped, 'i');
      filter.$or = [
        { id: regex },
        { client: regex },
        { nfeKey: regex },
        { destCity: regex },
        { 'items.product': regex }
      ];
    }

    const total = await Sale.countDocuments(filter);
    res.setHeader('X-Total-Count', total);

    let query = Sale.find(filter).sort({ saleDate: -1, createdAt: -1 });
    if (page && limit) {
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.max(1, Math.min(500, parseInt(limit, 10) || 50));
      query = query.skip((pageNum - 1) * limitNum).limit(limitNum);
    }
    const sales = await query.lean();
    const normalized = sales.map(s => saleService.normalizeSaleNfStatus(s));
    res.json(normalized);
  } catch (err) {
    next(err);
  }
});

// GET /api/sales/check-nfe/:key
router.get('/check-nfe/:key', async (req, res, next) => {
  try {
    const { key } = req.params;
    if (!key || key.length < 10) return res.json({ exists: false });
    const existing = await Sale.findOne({ nfeKey: key }).lean();
    if (existing) {
      return res.json({ exists: true, saleId: existing.id, client: existing.client, date: existing.saleDate });
    }
    res.json({ exists: false });
  } catch (err) {
    next(err);
  }
});

// GET /api/sales/:id
router.get('/:id', async (req, res, next) => {
  try {
    const sale = await Sale.findOne({ id: req.params.id }).lean();
    if (!sale) return res.status(404).json({ error: 'Venda não encontrada' });
    res.json(saleService.normalizeSaleNfStatus(sale));
  } catch (err) {
    next(err);
  }
});

// POST /api/sales (Criação via sale.service.js)
router.post('/', async (req, res, next) => {
  try {
    const newSale = await saleService.createSale(req.body);
    res.status(201).json(newSale);
  } catch (err) {
    next(err);
  }
});

// PUT /api/sales/:id (Atualização via sale.service.js)
router.put('/:id', async (req, res, next) => {
  try {
    const updated = await saleService.updateSale(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/sales/:id (Exclusão via sale.service.js)
router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await saleService.deleteSale(req.params.id);
    res.json({ success: true, message: `Venda ${deleted.id} e romaneio vinculado excluídos com sucesso.` });
  } catch (err) {
    next(err);
  }
});

// POST /api/sales/:id/settle (Liquidação Total ou Parcial da Loja via sale.service.js)
router.post('/:id/settle', async (req, res, next) => {
  try {
    const sale = await saleService.settleSale(req.params.id, req.body);
    res.json({ success: true, sale });
  } catch (err) {
    next(err);
  }
});

// POST /api/sales/:id/unsettle (Reverter liquidação da Loja via sale.service.js)
router.post('/:id/unsettle', async (req, res, next) => {
  try {
    const sale = await saleService.unsettleSale(req.params.id, req.body);
    res.json({ success: true, sale });
  } catch (err) {
    next(err);
  }
});

// POST /api/sales/:id/settle-producer (Liquidação de Repasse ao Produtor Rural)
router.post('/:id/settle-producer', async (req, res, next) => {
  try {
    const sale = await saleService.settleProducerPayment(req.params.id, req.body);
    res.json({ success: true, sale });
  } catch (err) {
    next(err);
  }
});

// POST /api/sales/:id/unsettle-producer (Reverter Repasse ao Produtor Rural)
router.post('/:id/unsettle-producer', async (req, res, next) => {
  try {
    const sale = await saleService.unsettleProducerPayment(req.params.id, req.body);
    res.json({ success: true, sale });
  } catch (err) {
    next(err);
  }
});

// POST /api/sales/:id/sync-calendar (Sincronização manual)
router.post('/:id/sync-calendar', async (req, res, next) => {
  try {
    const sale = await Sale.findOne({ id: req.params.id });
    if (!sale) return res.status(404).json({ error: 'Venda não encontrada' });
    sendSaleWebhook('sale.manual_sync', sale);
    res.json({ success: true, message: `Webhook disparado para a venda ${sale.id}` });
  } catch (err) {
    next(err);
  }
});

// POST /api/sales/sync-all-webhooks (Sincronização de lote)
router.post('/sync-all-webhooks', async (req, res, next) => {
  try {
    const sales = await Sale.find().sort({ saleDate: 1 });
    let count = 0;
    for (const sale of sales) {
      await sendSaleWebhook('sale.batch_sync', sale);
      await new Promise(resolve => setTimeout(resolve, 250));
      count++;
    }
    res.json({ success: true, count, message: `${count} eventos e anexos de vendas foram sincronizados com sucesso!` });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
