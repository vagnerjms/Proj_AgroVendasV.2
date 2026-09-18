const express = require('express');
const router = express.Router();
const { Sale } = require('../db');
const { calculateFiscalDeductions, roundMoney } = require('../utils/money');
const { sendSaleWebhook } = require('../services/webhook.service');
const { escapeRegex } = require('../utils/security');
const { requireAuth } = require('../middlewares/auth');
const saleService = require('../services/sale.service');

// GET /api/sales/agenda-events (Recebíveis formatados por Data de Vencimento para n8n & Google Calendar)
router.get('/agenda-events', async (req, res, next) => {
  try {
    const sales = await Sale.find().sort({ saleDate: -1 }).lean();
    const events = sales.map(s => {
      let dueDate = s.dueDate || '';
      if (!dueDate && s.notes) {
        const match = s.notes.match(/Vencimento:\s*([^\s|]+)/i);
        if (match && match[1]) {
          const parts = match[1].split('/');
          if (parts.length === 3) {
            dueDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
          }
        }
      }
      if (!dueDate && s.saleDate) {
        const days = Number(s.paymentTermDays) >= 0 ? Number(s.paymentTermDays) : 30;
        const d = new Date(s.saleDate + 'T12:00:00');
        d.setDate(d.getDate() + days);
        dueDate = d.toISOString().split('T')[0];
      }
      if (!dueDate) dueDate = new Date().toISOString().split('T')[0];

      const valorFinal = Number(s.valorTotalVP) > 0 ? Number(s.valorTotalVP) : (Number(s.totalOperation) || 0);
      const fiscal = calculateFiscalDeductions(s.totalOperation);
      const valorLiquidar = roundMoney(Math.max(0, valorFinal - fiscal.funruralTotal));
      const clientShort = s.client ? s.client.split(' ')[0] : 'Cliente';
      const volumesInt = Math.round(Number(s.totalVolumes) || (Number(s.totalKg) > 0 ? Number(s.totalKg) / 29 : 0));

      return {
        id: s.id,
        client: s.client,
        saleDate: s.saleDate,
        dueDate: dueDate,
        totalOperation: Number(s.totalOperation) || 0,
        valorVP: valorFinal,
        valorLiquidar: valorLiquidar,
        paidAmount: Number(s.paidAmount) || 0,
        status: s.status,
        paymentStatus: s.paymentStatus || 'A Receber',
        summary: `💰 ${clientShort} · R$ ${valorLiquidar.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${s.id})`,
        start: `${dueDate}T09:00:00-03:00`,
        end: `${dueDate}T10:00:00-03:00`,
        description: `🏪 Comprador: ${s.client}\n📅 Vencimento: ${dueDate.split('-').reverse().join('/')}\n💰 Valor a Liquidar: R$ ${valorLiquidar.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n📊 Total Comercial (VP): R$ ${valorFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n📦 Volumes: ${volumesInt} cx\n📄 Nota Fiscal: ${s.nfFile || 'Pendente'}\n📌 Status: ${s.paymentStatus || 'A Receber'}`
      };
    });

    res.json(events);
  } catch (err) {
    next(err);
  }
});

// Protect internal sales endpoints with JWT authentication
router.use(requireAuth);

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

    const normalized = sales.map(s => {
      const hasNf = !!(s.nfFile && s.nfFile.trim());
      if (hasNf) {
        s.nfPending = false;
        if (s.status === 'Pendente NF') {
          s.status = s.paymentStatus === 'Recebido' ? 'Concluído' : 'Faturado';
        }
      } else {
        s.nfPending = true;
        if (!s.status || s.status === 'Faturado') {
          s.status = 'Pendente NF';
        }
      }
      return s;
    });

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
    const hasNf = !!(sale.nfFile && sale.nfFile.trim());
    if (hasNf) {
      sale.nfPending = false;
      if (sale.status === 'Pendente NF') {
        sale.status = sale.paymentStatus === 'Recebido' ? 'Concluído' : 'Faturado';
      }
    } else {
      sale.nfPending = true;
      if (!sale.status || sale.status === 'Faturado') {
        sale.status = 'Pendente NF';
      }
    }
    res.json(sale);
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

// POST /api/sales/:id/settle (Liquidação Total ou Parcial via sale.service.js)
router.post('/:id/settle', async (req, res, next) => {
  try {
    const sale = await saleService.settleSale(req.params.id, req.body);
    res.json({ success: true, sale });
  } catch (err) {
    next(err);
  }
});

// POST /api/sales/:id/unsettle (Reverter liquidação via sale.service.js)
router.post('/:id/unsettle', async (req, res, next) => {
  try {
    const sale = await saleService.unsettleSale(req.params.id);
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
