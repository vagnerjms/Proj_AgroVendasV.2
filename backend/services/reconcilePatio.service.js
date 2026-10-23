/**
 * Concilia NF da Nova Venda com romaneio capturado no pátio (motorista).
 */
const { WeighingSlip } = require('../db');
const { formatNfNumber } = require('../utils/dataHelpers');
const { roundMoney } = require('../utils/money');

/**
 * @param {{ nfeKey?: string, nfNumber?: string, nfFile?: string, totalKg?: number, truckPlate?: string, saleId?: string }} saleLike
 * @param {{ weightTolerancePct?: number }} opts
 */
async function findPatioCandidates(saleLike = {}, opts = {}) {
  const nfeKey = String(saleLike.nfeKey || '').replace(/\D/g, '');
  const nfNumber = formatNfNumber(saleLike.nfNumber || saleLike.nfFile || nfeKey)
    || String(saleLike.nfNumber || '').replace(/\D/g, '');
  const plate = String(saleLike.truckPlate || '').trim().toUpperCase();

  const or = [];
  if (nfeKey && nfeKey.length >= 20) or.push({ nfeKey });
  if (nfNumber) or.push({ nfNumber });
  if (plate) or.push({ truckPlate: plate, source: 'patio', saleId: '' });

  if (!or.length) return [];

  const slips = await WeighingSlip.find({
    source: 'patio',
    $or: [
      { saleId: '' },
      { saleId: null },
      { saleId: { $exists: false } }
    ],
    $and: [{ $or: or }]
  }).sort({ date: -1 }).limit(20).lean();

  return slips;
}

/**
 * Compara nº NF e peso; vincula saleId se matched.
 * Aceita patioSlipId para forçar vínculo com um candidato específico.
 */
async function reconcilePatioSlip(saleLike = {}, opts = {}) {
  const forcedId = String(saleLike.patioSlipId || opts.patioSlipId || '').trim();
  let candidates = await findPatioCandidates(saleLike, opts);

  if (forcedId) {
    const forced = await WeighingSlip.findOne({
      id: forcedId,
      source: 'patio',
      $or: [{ saleId: '' }, { saleId: null }, { saleId: { $exists: false } }, { saleId: saleLike.saleId || saleLike.id || '' }]
    }).lean();
    if (forced) {
      candidates = [forced, ...candidates.filter((c) => c.id !== forced.id)];
    }
  }

  if (!candidates.length) {
    return { status: 'unmatched', candidates: [], slip: null };
  }

  const saleNf = formatNfNumber(saleLike.nfNumber || saleLike.nfFile || saleLike.nfeKey)
    || String(saleLike.nfNumber || '').replace(/\D/g, '');
  const saleKg = Number(saleLike.totalKg) || 0;
  const tolPct = Number(opts.weightTolerancePct) || 0.25;

  let best = null;
  let bestScore = -1;

  for (const s of candidates) {
    if (forcedId && s.id !== forcedId) continue;
    let score = 0;
    const slipNf = s.nfNumber || formatNfNumber(s.nfeKey) || '';
    const keyMatch = !!(saleLike.nfeKey && s.nfeKey && String(saleLike.nfeKey) === String(s.nfeKey));
    // Chave SEFAZ equivale a match de NF (não deixar só score alto com status unmatched)
    const nfMatch = keyMatch || !!(saleNf && slipNf && String(saleNf) === String(slipNf));
    if (nfMatch) score += 10;
    if (keyMatch) score += 20;
    if (forcedId && s.id === forcedId) score += 15;

    const slipKg = Number(s.netWeightKg) || Number(s.destWeightKg) || Number(s.originWeightKg) || 0;
    let weightOk = true;
    let weightDiffPct = 0;
    if (saleKg > 0 && slipKg > 0) {
      weightDiffPct = Math.abs(saleKg - slipKg) / saleKg * 100;
      weightOk = weightDiffPct <= tolPct + 0.01;
      if (weightOk) score += 5;
    }

    if (score > bestScore) {
      bestScore = score;
      best = { slip: s, nfMatch, weightOk, weightDiffPct: roundMoney(weightDiffPct), saleKg, slipKg };
    }
  }

  if (!best || (bestScore < 10 && !forcedId)) {
    return { status: 'unmatched', candidates, slip: null, detail: best };
  }

  let status;
  if (forcedId) {
    status = best.weightOk ? 'matched' : 'divergent';
  } else {
    status = best.nfMatch && best.weightOk ? 'matched' : (best.nfMatch ? 'divergent' : 'unmatched');
  }
  const saleId = saleLike.saleId || saleLike.id || '';

  if (saleId && (status === 'matched' || status === 'divergent')) {
    // Garante no máximo um romaneio de pátio por VP
    await WeighingSlip.updateMany(
      { source: 'patio', saleId, id: { $ne: best.slip.id } },
      {
        $set: {
          saleId: '',
          matchStatus: 'unmatched',
          matchNotes: 'Desvinculado: outro romaneio de pátio foi associado à venda',
          status: 'AguardandoVenda'
        }
      }
    );
    await WeighingSlip.updateOne(
      { id: best.slip.id },
      {
        $set: {
          saleId,
          matchStatus: status,
          matchNotes: status === 'divergent'
            ? `Divergência peso: venda ${best.saleKg} kg vs pátio ${best.slipKg} kg (${best.weightDiffPct}%)`
            : 'Vinculado automaticamente à venda',
          status: status === 'matched' ? 'Aprovado' : 'Divergente'
        }
      }
    );
    best.slip = await WeighingSlip.findOne({ id: best.slip.id }).lean();
  }

  return { status, candidates, slip: best.slip, detail: best };
}

module.exports = { findPatioCandidates, reconcilePatioSlip };
