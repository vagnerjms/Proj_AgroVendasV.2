const express = require('express');
const router = express.Router();
const { WeighingSlip, Sale } = require('../db');
const { escapeRegex } = require('../utils/security');
const { requireAuth } = require('../middlewares/auth');

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

// POST /api/weighings
router.post('/', async (req, res) => {
  try {
    const body = req.body;
    const origin = Number(body.originWeightKg) || 0;
    const dest = Number(body.destWeightKg) || 0;
    const diff = Math.abs(origin - dest);
    const diffPct = origin > 0 ? Number(((diff / origin) * 100).toFixed(2)) : 0;
    const isDiv = diffPct > (Number(body.tolerancePct) || 0.25);

    let slipId = '';
    let saleRef = body.saleId || '';
    if (saleRef) {
      slipId = saleRef.startsWith('ROM-') ? saleRef : `ROM-${saleRef}`;
    } else {
      const allSlips = await WeighingSlip.find({}, { id: 1 });
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
      product: body.product || 'Soja Grão Comercial',
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
      tolerancePct: Number(body.tolerancePct) || 0.25,
      status: isDiv ? 'Divergente' : 'Aprovado',
      resolutionNotes: body.resolutionNotes || ''
    });

    await newSlip.save();
    res.status(201).json(newSlip);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao cadastrar romaneio' });
  }
});

// PUT /api/weighings/:id
router.put('/:id', async (req, res) => {
  try {
    const body = req.body;
    const origin = Number(body.originWeightKg) || 0;
    const dest = Number(body.destWeightKg) || 0;
    const diff = Math.abs(origin - dest);
    const diffPct = origin > 0 ? Number(((diff / origin) * 100).toFixed(2)) : 0;

    const allowed = [
      'client', 'product', 'truckPlate', 'driverName', 'date', 'originWeightKg',
      'destWeightKg', 'humidityPct', 'impurityPct', 'discountKg', 'tolerancePct',
      'status', 'resolutionNotes'
    ];
    const updateData = {};
    for (const key of allowed) {
      if (body[key] !== undefined) updateData[key] = body[key];
    }
    updateData.weightDifferenceKg = diff;
    updateData.weightDifferencePct = diffPct;
    updateData.netWeightKg = dest - (Number(body.discountKg) || 0);

    const updated = await WeighingSlip.findOneAndUpdate(
      { id: req.params.id },
      updateData,
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Romaneio não encontrado' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar romaneio' });
  }
});

// DELETE /api/weighings/:id
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await WeighingSlip.findOneAndDelete({ id: req.params.id });
    if (!deleted) return res.status(404).json({ error: 'Romaneio não encontrado' });
    res.json({ success: true, message: 'Romaneio excluído com sucesso' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir romaneio' });
  }
});

// PUT /api/weighings/:id/resolve
router.put('/:id/resolve', async (req, res) => {
  try {
    const { action, resolutionNotes } = req.body;
    const slip = await WeighingSlip.findOne({ id: req.params.id });
    if (!slip) return res.status(404).json({ error: 'Romaneio não encontrado' });

    slip.status = action || 'Ajustado';
    slip.resolutionNotes = resolutionNotes || 'Divergência tratada e compensada financeiramente.';
    slip.resolvedAt = new Date();
    await slip.save();

    // Reconcile linked Sale isDivergent flag if resolved
    if (slip.saleId) {
      try {
        await Sale.findOneAndUpdate(
          { $or: [{ id: slip.saleId }, { id: slip.id.replace('ROM-', '') }] },
          { isDivergent: false }
        );
      } catch (saleSyncErr) {
        console.warn('Aviso: erro ao sincronizar reconciliação na venda:', saleSyncErr.message);
      }
    }

    res.json({ success: true, slip });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao resolver divergência' });
  }
});

module.exports = router;
