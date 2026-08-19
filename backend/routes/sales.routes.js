const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { Sale, WeighingSlip, getNextSequence } = require('../db');
const { TAX_RATES } = require('../constants');
const { uploadDir } = require('../middlewares/upload');
const { sendSaleWebhook } = require('../services/webhook.service');
const { escapeRegex } = require('../utils/security');

// GET /api/sales
router.get('/', async (req, res) => {
  try {
    const { operationType, status, search } = req.query;
    let filter = {};
    if (operationType && operationType !== 'all') {
      filter.operationType = operationType;
    }
    if (status && status !== 'all') {
      filter.status = status;
    }
    if (search && search.trim()) {
      const escaped = escapeRegex(search);
      const regex = new RegExp(escaped, 'i');
      filter.$or = [
        { id: regex },
        { client: regex },
        { nfeKey: regex },
        { destCity: regex },
        { 'items.product': regex }
      ];
    }
    const sales = await Sale.find(filter).sort({ saleDate: -1, createdAt: -1 }).lean();
    res.json(sales);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar vendas' });
  }
});

// GET /api/sales/agenda-events (Recebíveis formatados por Data de Vencimento para Google Calendar)
router.get('/agenda-events', async (req, res) => {
  try {
    const sales = await Sale.find().sort({ saleDate: -1 });
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
        const days = Number(s.paymentTermDays) !== undefined && !isNaN(Number(s.paymentTermDays)) ? Number(s.paymentTermDays) : 30;
        const d = new Date(s.saleDate + 'T12:00:00');
        d.setDate(d.getDate() + days);
        dueDate = d.toISOString().split('T')[0];
      }
      if (!dueDate) dueDate = new Date().toISOString().split('T')[0];

      const clientShort = s.client ? s.client.split(' ')[0] : 'Cliente';
      const totalOp = Number(s.totalOperation) || 0;

      return {
        id: s.id,
        client: s.client,
        saleDate: s.saleDate,
        dueDate: dueDate,
        totalOperation: totalOp,
        status: s.status,
        paymentStatus: s.paymentStatus,
        summary: `💰 ${clientShort} · R$ ${totalOp.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} (${s.id})`,
        start: `${dueDate}T09:00:00-03:00`,
        end: `${dueDate}T10:00:00-03:00`,
        description: `🏪 Comprador: ${s.client}\n📅 Vencimento: ${dueDate.split('-').reverse().join('/')}\n💰 Valor a Receber: R$ ${totalOp.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n📦 Volumes: ${s.totalVolumes || 0} cx\n📄 Nota Fiscal: ${s.nfFile || 'Pendente'}\n📌 Status: ${s.paymentStatus || 'A Receber'}`
      };
    });

    res.json(events);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar agenda de eventos' });
  }
});

// GET /api/sales/check-nfe/:key
router.get('/check-nfe/:key', async (req, res) => {
  try {
    const { key } = req.params;
    if (!key || key.length < 10) return res.json({ exists: false });
    const existing = await Sale.findOne({ nfeKey: key }).lean();
    if (existing) {
      return res.json({ exists: true, saleId: existing.id, client: existing.client, date: existing.saleDate });
    }
    res.json({ exists: false });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao verificar NF-e' });
  }
});

// GET /api/sales/:id
router.get('/:id', async (req, res) => {
  try {
    const sale = await Sale.findOne({ id: req.params.id });
    if (!sale) return res.status(404).json({ error: 'Venda não encontrada' });
    res.json(sale);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar detalhes da venda' });
  }
});

// POST /api/sales (Atomic sequence & Romaneio sync)
router.post('/', async (req, res) => {
  const body = req.body;
  try {
    // 1. Prevent duplicate XML/SEFAZ import by 44-digit nfeKey
    if (body.nfeKey && body.nfeKey.trim().length >= 10) {
      const existingKey = await Sale.findOne({ nfeKey: body.nfeKey.trim() }).lean();
      if (existingKey) {
        return res.status(409).json({ 
          error: `Esta NF-e (Chave SEFAZ: ${body.nfeKey}) já foi importada e está vinculada à Venda ${existingKey.id} (${existingKey.client}).` 
        });
      }
    }

    const seq = await getNextSequence('sale_vp_id', Sale, 'VP');
    const newId = `VP${String(seq).padStart(3, '0')}`;

    const totalOp = Number(body.totalOperation) || 0;
    const previdenciaSocial = totalOp * TAX_RATES.PREVIDENCIA;
    const rat = totalOp * TAX_RATES.RAT;
    const senar = totalOp * TAX_RATES.SENAR;
    const funruralTotal = totalOp * TAX_RATES.FUNRURAL_TOTAL;

    const newSale = new Sale({
      id: newId,
      operationType: body.operationType || "Intermediação (Corretagem / Comissão)",
      saleDate: body.saleDate || new Date().toISOString().split('T')[0],
      client: body.client || "Cliente Geral",
      clientDocument: body.clientDocument || "",
      origin: body.origin || "",
      destCity: body.destCity || "",
      destUF: body.destUF || "",
      notes: body.notes || "",
      nfFile: body.nfFile || null,
      nfeKey: body.nfeKey || "",
      evidenceFile: body.evidenceFile || null,
      freightType: body.freightType || 'FOB (Retira na Origem)',
      carrierName: body.carrierName || '',
      truckPlate: body.truckPlate || '',
      driverName: body.driverName || '',
      driverCPF: body.driverCPF || '',
      items: body.items || [],
      feeType: body.feeType || "Porcentagem (%)",
      feeValue: Number(body.feeValue) || 0,
      totalVolumes: Number(body.totalVolumes) || 0,
      totalKg: Number(body.totalKg) || 0,
      totalOperation: totalOp,
      totalCommission: Number(body.totalCommission) || 0,
      funruralTotal: Number(body.funruralTotal) || funruralTotal,
      previdenciaSocial: Number(body.previdenciaSocial) || previdenciaSocial,
      rat: Number(body.rat) || rat,
      senar: Number(body.senar) || senar,
      status: body.nfFile ? "Faturado" : "Pendente NF",
      paymentStatus: "A Receber",
      paymentTerms: body.paymentTerms || (body.paymentTermDays !== undefined ? (Number(body.paymentTermDays) === 0 ? 'À Vista' : `${body.paymentTermDays} dias`) : '30 dias'),
      paymentTermDays: body.paymentTermDays !== undefined ? Number(body.paymentTermDays) : 30,
      dueDate: body.dueDate || '',
      isDivergent: false,
      nfPending: !body.nfFile
    });

    await newSale.save();

    // Auto-create matching Weighing Slip (ROM-VPXXX)
    try {
      const slipId = `ROM-${newSale.id}`;
      const existingSlip = await WeighingSlip.findOne({ id: slipId });
      if (!existingSlip) {
        const originKg = Number(body.totalKg) || 0;
        const newSlip = new WeighingSlip({
          id: slipId,
          saleId: newSale.id,
          client: newSale.client,
          product: newSale.items?.[0]?.product || 'Cenoura (Caixa 29kg)',
          truckPlate: newSale.truckPlate || 'ABC-1234',
          driverName: newSale.driverName || newSale.origin || 'Transportador Bruno Peres Romeiro',
          date: newSale.saleDate,
          originWeightKg: originKg,
          destWeightKg: originKg,
          humidityPct: 14.0,
          impurityPct: 1.0,
          discountKg: 0,
          netWeightKg: originKg,
          weightDifferenceKg: 0,
          weightDifferencePct: 0,
          tolerancePct: 0.25,
          status: 'Aprovado',
          resolutionNotes: `Romaneio gerado automaticamente para a Venda ${newSale.id}`
        });
        await newSlip.save();
      }
    } catch (e) {
      console.error('Erro ao sincronizar romaneio automático:', e);
    }

    // Disparar Webhook para o n8n em tempo real (não bloqueante)
    sendSaleWebhook('sale.created', newSale);

    res.status(201).json(newSale);
  } catch (err) {
    console.error('Erro ao salvar venda:', err);

    // Rollback orphaned uploaded files if MongoDB insertion fails
    if (body.nfFile) {
      try { fs.unlinkSync(path.join(uploadDir, body.nfFile)); } catch (e) {}
    }
    if (body.evidenceFile) {
      try { fs.unlinkSync(path.join(uploadDir, body.evidenceFile)); } catch (e) {}
    }

    res.status(500).json({ error: `Erro ao registrar venda: ${err.message}` });
  }
});

// PUT /api/sales/:id
router.put('/:id', async (req, res) => {
  try {
    const existing = await Sale.findOne({ id: req.params.id });
    if (!existing) return res.status(404).json({ error: 'Venda não encontrada' });

    const body = req.body;
    const allowedFields = [
      'operationType', 'saleDate', 'client', 'clientDocument', 'origin', 'destCity',
      'destUF', 'notes', 'nfFile', 'nfeKey', 'evidenceFile', 'freightType', 'carrierName',
      'truckPlate', 'driverName', 'driverCPF', 'items', 'feeType', 'feeValue',
      'totalVolumes', 'totalKg', 'totalOperation', 'totalCommission', 'status',
      'paymentStatus', 'paymentTerms', 'paymentTermDays', 'dueDate', 'paidAmount',
      'isDivergent', 'nfPending'
    ];

    let updateFields = {};
    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        updateFields[key] = body[key];
      }
    }

    // Recalculate FUNRURAL only if totalOperation is explicitly updated
    if (body.totalOperation !== undefined) {
      const totalOp = Number(body.totalOperation) || 0;
      updateFields.totalOperation = totalOp;
      updateFields.previdenciaSocial = totalOp * TAX_RATES.PREVIDENCIA;
      updateFields.rat = totalOp * TAX_RATES.RAT;
      updateFields.senar = totalOp * TAX_RATES.SENAR;
      updateFields.funruralTotal = totalOp * TAX_RATES.FUNRURAL_TOTAL;
    }

    const updated = await Sale.findOneAndUpdate(
      { id: req.params.id },
      updateFields,
      { new: true }
    );

    // Cascade update to matching Weighing Slip (ROM-VPXXX)
    if (updated) {
      try {
        const slipUpdate = {};
        if (body.client) slipUpdate.client = body.client;
        if (body.truckPlate) slipUpdate.truckPlate = body.truckPlate;
        if (body.driverName || body.origin) slipUpdate.driverName = body.driverName || body.origin;
        if (body.saleDate) slipUpdate.date = body.saleDate;
        if (body.items?.[0]?.product) slipUpdate.product = body.items[0].product;
        if (body.totalKg !== undefined) {
          const kg = Number(body.totalKg) || 0;
          slipUpdate.originWeightKg = kg;
          slipUpdate.destWeightKg = kg;
          slipUpdate.netWeightKg = kg;
        }
        if (Object.keys(slipUpdate).length > 0) {
          await WeighingSlip.findOneAndUpdate(
            { $or: [{ saleId: updated.id }, { id: `ROM-${updated.id}` }] },
            slipUpdate
          );
        }
      } catch (slipSyncErr) {
        console.warn('Aviso: erro ao sincronizar edição no romaneio vinculado:', slipSyncErr.message);
      }

      // Disparar Webhook para o n8n
      sendSaleWebhook('sale.updated', updated);
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar venda' });
  }
});

// DELETE /api/sales/:id (Cascade delete on linked romaneios and physical files)
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Sale.findOneAndDelete({ id: req.params.id });
    if (!deleted) return res.status(404).json({ error: 'Venda não encontrada' });

    // Cascade delete of matching weighing slips
    try {
      await WeighingSlip.deleteMany({
        $or: [
          { saleId: deleted.id },
          { id: `ROM-${deleted.id}` }
        ]
      });
    } catch (slipErr) {
      console.warn('Aviso: falha ao remover romaneio vinculado:', slipErr);
    }

    // Clean up physical files on disk if they exist
    if (deleted.nfFile) {
      const otherUsingNf = await Sale.findOne({ nfFile: deleted.nfFile });
      if (!otherUsingNf) {
        const nfPath = path.join(uploadDir, deleted.nfFile);
        if (fs.existsSync(nfPath)) {
          try { fs.unlinkSync(nfPath); } catch (e) {}
        }
      }
    }

    if (deleted.evidenceFile) {
      const otherUsingEvidence = await Sale.findOne({ evidenceFile: deleted.evidenceFile });
      if (!otherUsingEvidence) {
        const evPath = path.join(uploadDir, deleted.evidenceFile);
        if (fs.existsSync(evPath)) {
          try { fs.unlinkSync(evPath); } catch (e) {}
        }
      }
    }

    res.json({ success: true, message: `Venda ${deleted.id} e romaneio vinculado excluídos com sucesso.` });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir venda' });
  }
});

// POST /api/sales/:id/settle
router.post('/:id/settle', async (req, res) => {
  try {
    const sale = await Sale.findOne({ id: req.params.id });
    if (!sale) return res.status(404).json({ error: 'Venda não encontrada' });

    sale.paymentStatus = 'Recebido';
    sale.paidAmount = sale.totalOperation;
    sale.status = 'Concluído';
    await sale.save();

    // Disparar Webhook para atualizar status no n8n / Calendar
    sendSaleWebhook('sale.settled', sale);

    res.json({ success: true, sale });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao liquidar venda' });
  }
});

// POST /api/sales/:id/sync-calendar (Manual sync trigger for a specific sale)
router.post('/:id/sync-calendar', async (req, res) => {
  try {
    const sale = await Sale.findOne({ id: req.params.id });
    if (!sale) return res.status(404).json({ error: 'Venda não encontrada' });

    sendSaleWebhook('sale.manual_sync', sale);
    res.json({ success: true, message: `Webhook disparado para a venda ${sale.id}` });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao sincronizar venda com o calendário' });
  }
});

module.exports = router;
