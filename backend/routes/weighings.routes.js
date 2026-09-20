const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { WeighingSlip } = require('../db');
const { escapeRegex } = require('../utils/security');
const { requireAuth } = require('../middlewares/auth');
const { uploadDir } = require('../middlewares/upload');
const saleService = require('../services/sale.service');

// Protect all weighings endpoints with JWT authentication
router.use(requireAuth);

// GET /api/weighings (Supports optional page/limit pagination with X-Total-Count)
router.get('/', async (req, res) => {
  try {
    const { status, search, page, limit } = req.query;
    let filter = {};
    if (status && status !== 'all') {
      filter.status = status;
    }
    if (search && search.trim()) {
      const escaped = escapeRegex(search);
      const regex = new RegExp(escaped, 'i');
      filter.$or = [
        { id: regex },
        { saleId: regex },
        { client: regex },
        { truckPlate: regex },
        { driverName: regex }
      ];
    }

    const total = await WeighingSlip.countDocuments(filter);
    res.setHeader('X-Total-Count', total);

    let query = WeighingSlip.find(filter).sort({ date: -1 });
    if (page && limit) {
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.max(1, Math.min(500, parseInt(limit, 10) || 50));
      query = query.skip((pageNum - 1) * limitNum).limit(limitNum);
    }
    const slips = await query.lean();
    res.json(slips);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar romaneios' });
  }
});

// POST /api/weighings (Com cálculo correto de diffPct e prevenção de ReferenceError)
router.post('/', async (req, res) => {
  try {
    const body = req.body;
    const origin = Number(body.originWeightKg) || 0;
    const dest = Number(body.destWeightKg) || 0;
    const diff = Math.abs(origin - dest);
    const diffPct = origin > 0 ? Number(((diff / origin) * 100).toFixed(2)) : 0;
    const tolerance = Math.min(Math.max(Number(body.tolerancePct) || 0.25, 0), 2.0);
    const isDiv = diffPct > tolerance;

    let slipId = '';
    let saleRef = body.saleId || '';
    if (saleRef) {
      slipId = saleRef.startsWith('ROM-') ? saleRef : `ROM-${saleRef}`;
    } else {
      const allSlips = await WeighingSlip.find({}, { id: 1 }).lean();
      let maxId = 0;
      for (const s of allSlips) {
        if (s.id) {
          const match = s.id.match(/ROM-VP0*(\d+)/i) || s.id.match(/(\d+)/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > maxId) maxId = num;
          }
        }
      }
      const nextSeq = maxId + 1;
      saleRef = `VP${String(nextSeq).padStart(3, '0')}`;
      slipId = `ROM-${saleRef}`;
    }

    const newSlip = new WeighingSlip({
      id: slipId,
      saleId: saleRef,
      client: body.client || 'Cliente Padrão',
      product: body.product || 'Cenoura (Caixa 29kg)',
      truckPlate: body.truckPlate || 'ABC-1234',
      driverName: body.driverName || 'Motorista',
      date: body.date || new Date().toISOString().split('T')[0],
      originWeightKg: origin,
      destWeightKg: dest,
      humidityPct: Number(body.humidityPct) || 14.0,
      impurityPct: Number(body.impurityPct) || 1.0,
      discountKg: Number(body.discountKg) || 0,
      netWeightKg: dest - (Number(body.discountKg) || 0),
      weightDifferenceKg: diff,
      weightDifferencePct: diffPct,
      tolerancePct: tolerance,
      status: isDiv ? 'Divergente' : 'Aprovado',
      resolutionNotes: body.resolutionNotes || '',
      ticketImage: body.ticketImage || body.attachment || '',
      attachment: body.attachment || body.ticketImage || ''
    });

    await newSlip.save();
    res.status(201).json(newSlip);
  } catch (err) {
    console.error('Erro ao cadastrar romaneio:', err);
    res.status(500).json({ error: `Erro ao cadastrar romaneio: ${err.message}` });
  }
});

// PUT /api/weighings/:id
router.put('/:id', async (req, res) => {
  try {
    const body = req.body;
    let origin = Number(body.originWeightKg) || 0;
    let dest = Number(body.destWeightKg) || 0;

    const allowed = [
      'client', 'product', 'truckPlate', 'driverName', 'date', 'originWeightKg',
      'destWeightKg', 'humidityPct', 'impurityPct', 'discountKg', 'tolerancePct',
      'status', 'resolutionNotes', 'ticketImage', 'attachment'
    ];
    const updateData = {};
    for (const key of allowed) {
      if (body[key] !== undefined) updateData[key] = body[key];
    }

    // Se o usuário selecionou uma opção de peso (origem ou destino), equaliza ambos os pesos
    const weightChoice = body.weightChoice; // 'origin' | 'dest'
    let chosenWeight = dest - (Number(body.discountKg) || 0);

    if (weightChoice === 'origin') {
      chosenWeight = origin - (Number(body.discountKg) || 0);
      updateData.originWeightKg = origin;
      updateData.destWeightKg = origin; // Equaliza destino com origem
      updateData.weightDifferenceKg = 0;
      updateData.weightDifferencePct = 0;
      updateData.status = 'Ajustado';
    } else if (weightChoice === 'dest') {
      chosenWeight = dest - (Number(body.discountKg) || 0);
      updateData.destWeightKg = dest;
      updateData.originWeightKg = dest; // Equaliza origem com destino
      updateData.weightDifferenceKg = 0;
      updateData.weightDifferencePct = 0;
      updateData.status = 'Ajustado';
    } else {
      const diff = Math.abs(origin - dest);
      const diffPct = origin > 0 ? Number(((diff / origin) * 100).toFixed(2)) : 0;
      updateData.weightDifferenceKg = diff;
      updateData.weightDifferencePct = diffPct;
    }

    updateData.netWeightKg = chosenWeight;

    if (body.applyWeightToSale) {
      updateData.status = 'Ajustado';
    }

    const updated = await WeighingSlip.findOneAndUpdate(
      { id: req.params.id },
      updateData,
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Romaneio não encontrado' });

    let updatedSale = null;
    if (body.applyWeightToSale || weightChoice) {
      updatedSale = await saleService.syncSaleWeightFromSlip(updated, chosenWeight, weightChoice || 'dest');
    }

    res.json({
      success: true,
      slip: updated,
      saleUpdated: !!updatedSale,
      saleId: updatedSale ? updatedSale.id : null
    });
  } catch (err) {
    console.error('Erro ao atualizar romaneio:', err);
    res.status(500).json({ error: 'Erro ao atualizar romaneio' });
  }
});

// DELETE /api/weighings/:id (Com limpeza assíncrona de ticket anexado)
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await WeighingSlip.findOneAndDelete({ id: req.params.id });
    if (!deleted) return res.status(404).json({ error: 'Romaneio não encontrado' });

    const ticketFile = deleted.ticketImage || deleted.attachment;
    if (ticketFile) {
      const otherUsing = await WeighingSlip.findOne({
        $or: [{ ticketImage: ticketFile }, { attachment: ticketFile }]
      });
      if (!otherUsing) {
        const filePath = path.join(uploadDir, ticketFile);
        fs.promises.unlink(filePath).catch(() => {});
      }
    }

    res.json({ success: true, message: 'Romaneio excluído com sucesso' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir romaneio' });
  }
});

// PUT /api/weighings/:id/resolve
router.put('/:id/resolve', async (req, res) => {
  try {
    const { action, resolutionNotes, weightChoice } = req.body;
    const slip = await WeighingSlip.findOne({ id: req.params.id });
    if (!slip) return res.status(404).json({ error: 'Romaneio não encontrado' });

    const choice = weightChoice || 'dest';
    const chosenWeight = choice === 'origin' ? slip.originWeightKg : slip.destWeightKg;

    // Equaliza os dois pesos para eliminar a divergência
    slip.originWeightKg = chosenWeight;
    slip.destWeightKg = chosenWeight;
    slip.weightDifferenceKg = 0;
    slip.weightDifferencePct = 0;
    slip.status = action || 'Ajustado';
    slip.netWeightKg = chosenWeight - (slip.discountKg || 0);
    slip.resolutionNotes = resolutionNotes || `Divergência tratada considerando ${choice === 'origin' ? 'Peso Origem' : 'Peso Destino'} (${chosenWeight.toLocaleString('pt-BR')} kg) e pesos equalizados.`;
    slip.resolvedAt = new Date();
    await slip.save();

    // Sincroniza e recalcula a Venda vinculada
    const updatedSale = await saleService.syncSaleWeightFromSlip(slip, chosenWeight, choice);

    res.json({
      success: true,
      slip,
      saleUpdated: !!updatedSale,
      saleId: updatedSale ? updatedSale.id : null
    });
  } catch (err) {
    console.error('Erro ao resolver divergência:', err);
    res.status(500).json({ error: 'Erro ao resolver divergência' });
  }
});

module.exports = router;

