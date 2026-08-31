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

// Helper para sincronizar e recalcular a venda vinculada ao peso escolhido
async function syncLinkedSaleWeight(slip, chosenWeightKg, weightChoice) {
  if (!slip || !chosenWeightKg || chosenWeightKg <= 0) return null;

  const rawSaleRef = slip.saleId || slip.id.replace('ROM-', '');
  // Aceita formatos como 'ROM-VP046', 'VP046', 'VP46', '46'
  const digits = rawSaleRef.replace(/[^0-9]/g, '');
  const possibleIds = [
    rawSaleRef,
    rawSaleRef.replace('ROM-', ''),
    `VP${digits.padStart(3, '0')}`,
    `VP${digits}`
  ];

  const sale = await Sale.findOne({ id: { $in: possibleIds } });
  if (!sale) return null;

  const newTotalKg = Number(chosenWeightKg);
  const newVolumes = Math.round(newTotalKg / 29);

  // Recalcula totais da venda
  if (sale.items && sale.items.length > 0) {
    const unitPriceKg = sale.totalKg > 0 ? (sale.totalOperation / sale.totalKg) : (sale.items[0].price || 2.0);
    sale.items[0].kg = newTotalKg;
    sale.items[0].quantity = newVolumes;
    sale.items[0].total = roundMoney(newTotalKg * unitPriceKg);
    sale.totalOperation = sale.items[0].total;
  } else if (sale.totalKg > 0) {
    const pricePerKg = sale.totalOperation / sale.totalKg;
    sale.totalOperation = roundMoney(newTotalKg * pricePerKg);
  }

  sale.totalKg = newTotalKg;
  sale.totalVolumes = newVolumes;

  // Recalcula impostos fiscais (FUNRURAL)
  const fiscal = calculateFiscalDeductions(sale.totalOperation);
  sale.funruralTotal = fiscal.funruralTotal;
  sale.previdenciaSocial = fiscal.previdenciaSocial;
  sale.rat = fiscal.rat;
  sale.senar = fiscal.senar;

  // Recalcula Valor Total VP
  let cotacao = Number(sale.dailyQuote) || 0;
  if (!cotacao && sale.notes) {
    const matchCot = sale.notes.match(/Cotação:?\s*R\$\s*([\d,.]+)/i);
    if (matchCot) cotacao = parseFloat(matchCot[1].replace(',', '.'));
  }
  if (!cotacao) cotacao = 45.0;
  sale.valorTotalVP = roundMoney(newVolumes * cotacao);

  // Recalcula comissão
  const comm = calculateCommission(sale.valorTotalVP, sale.feeValue);
  sale.totalCommission = comm.comissao;

  sale.isDivergent = false;

  // Anota no histórico da venda
  const choiceText = weightChoice === 'dest' ? 'Peso Destino' : (weightChoice === 'origin' ? 'Peso Origem' : 'Peso Ajustado');
  const adjustTag = `[Pesagem: ${choiceText} (${newTotalKg.toLocaleString('pt-BR')} kg - ${newVolumes} cx)]`;
  if (!sale.notes.includes('[Pesagem:')) {
    sale.notes = sale.notes ? `${sale.notes} | ${adjustTag}` : adjustTag;
  } else {
    sale.notes = sale.notes.replace(/\[Pesagem:[^\]]+\]/, adjustTag);
  }

  await sale.save();

  try {
    const { sendSaleWebhook } = require('../services/webhook.service');
    sendSaleWebhook('sale.updated', sale).catch(() => {});
  } catch (e) {}

  return sale;
}

// PUT /api/weighings/:id
router.put('/:id', async (req, res) => {
  try {
    const body = req.body;
    let origin = Number(body.originWeightKg) || 0;
    let dest = Number(body.destWeightKg) || 0;

    const allowed = [
      'client', 'product', 'truckPlate', 'driverName', 'date', 'originWeightKg',
      'destWeightKg', 'humidityPct', 'impurityPct', 'discountKg', 'tolerancePct',
      'status', 'resolutionNotes'
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
      updatedSale = await syncLinkedSaleWeight(updated, chosenWeight, weightChoice || 'dest');
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
    const updatedSale = await syncLinkedSaleWeight(slip, chosenWeight, choice);

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
