/**
 * Script idempotente — correção local NFs/CPs/SEM NF Bruno Peres (cenoura + cebola)
 *
 * Uso (somente Mongo local):
 *   MONGO_URI=mongodb://127.0.0.1:27017/agrovenda node backend/scripts/fix_bruno_audit_data.js
 */
const mongoose = require('mongoose');
const { Sale } = require('../models');
const { roundMoney } = require('../utils/money');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/agrovenda';

function info(msg, data) {
  console.log(data ? `${msg} ${JSON.stringify(data)}` : msg);
}

function recomputeClientStatus(sale) {
  const vp = roundMoney(Number(sale.valorTotalVP) || 0);
  const paid = roundMoney(Number(sale.paidAmount) || 0);
  if (vp > 0 && paid >= vp - 0.05) sale.paymentStatus = 'Recebido';
  else if (paid > 0) sale.paymentStatus = 'Parcial';
  else sale.paymentStatus = 'A Receber';
}

function recomputeProducerStatus(sale) {
  const nf = roundMoney(Number(sale.totalOperation) || 0);
  const paid = roundMoney(Number(sale.producerPaidAmount) || 0);
  if (nf <= 0) {
    sale.producerPaymentStatus = 'A Pagar';
    return;
  }
  if (paid >= nf - 0.05) sale.producerPaymentStatus = 'Pago';
  else if (paid > 0) sale.producerPaymentStatus = 'Parcial';
  else sale.producerPaymentStatus = 'A Pagar';
}

async function addClientPaymentIfMissing(sale, amount, notes, paymentMethod = 'PIX') {
  if (!Array.isArray(sale.paymentHistory)) sale.paymentHistory = [];
  const exists = sale.paymentHistory.some(
    (h) => Math.abs(Number(h.amount) - amount) < 0.02
  );
  if (exists) {
    info(`[SKIP CP] ${sale.id} já tem pagamento ~${amount}`);
    return false;
  }
  sale.paymentHistory.push({
    amount,
    date: new Date().toISOString().split('T')[0],
    paymentMethod,
    notes
  });
  sale.paidAmount = roundMoney((Number(sale.paidAmount) || 0) + amount);
  recomputeClientStatus(sale);
  await sale.save();
  info(`[CP] ${sale.id} +${amount} → paid=${sale.paidAmount} status=${sale.paymentStatus}`);
  return true;
}

async function run() {
  if (!/localhost|127\.0\.0\.1|mongodb:27017/.test(MONGO_URI)) {
    console.error('Abortado: script só roda em Mongo local. URI:', MONGO_URI);
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);
  info('Conectado', { MONGO_URI });

  const nfFixes = [
    { id: 'VP9713', totalOperation: 25070.5, nfHint: '27957569' },
    { id: 'VP9715', totalOperation: 29328, nfHint: '27970562' },
    { id: 'VP9720', nfHint: '27999695' },
    { id: 'VP9733', totalOperation: 41686.4 }
  ];

  for (const fix of nfFixes) {
    const sale = await Sale.findOne({ id: fix.id });
    if (!sale) {
      info(`[SKIP] ${fix.id} ausente`);
      continue;
    }
    if (fix.totalOperation != null) sale.totalOperation = fix.totalOperation;
    if (fix.nfHint) {
      if (!sale.nfFile || sale.nfFile === 'SEM NF' || !String(sale.nfFile).includes(fix.nfHint)) {
        sale.nfFile = sale.nfFile && sale.nfFile !== 'SEM NF'
          ? sale.nfFile
          : `NF-${fix.nfHint}.pdf`;
      }
      if (!sale.nfeKey) sale.nfeKey = fix.nfHint;
    }
    if (sale.totalOperation > 0) sale.status = 'Faturado';
    recomputeProducerStatus(sale);
    recomputeClientStatus(sale);
    await sale.save();
    info(`[NF] ${fix.id}`, {
      totalOperation: sale.totalOperation,
      valorTotalVP: sale.valorTotalVP,
      paymentStatus: sale.paymentStatus
    });
  }

  for (const id of ['VP9734', 'VP9743', 'VP9744']) {
    const sale = await Sale.findOne({ id });
    if (!sale) {
      info(`[SKIP SEM NF] ${id} ausente`);
      continue;
    }
    sale.totalOperation = 0;
    sale.funruralTotal = 0;
    sale.nfFile = null;
    sale.nfPending = true;
    sale.status = 'Pendente NF';
    sale.producerPaidAmount = 0;
    sale.producerPaymentStatus = 'A Pagar';
    if (id === 'VP9744' && (!sale.totalKg || Number(sale.totalKg) < 8000)) {
      sale.totalKg = 8790;
    }
    recomputeClientStatus(sale);
    await sale.save();
    info(`[SEM NF] ${id}`, { valorTotalVP: sale.valorTotalVP, totalKg: sale.totalKg });
  }

  // CP W&A PIX 39552 → VP9730
  const vp9730 = await Sale.findOne({ id: 'VP9730' });
  if (vp9730) await addClientPaymentIfMissing(vp9730, 39552, 'W&A PIX 39552 (auditoria Bruno)');
  else info('[SKIP] VP9730 ausente para CP 39552');

  // Rubi CPs — alocar em vendas Rubi Bruno com saldo
  const rubiAmounts = [
    { amount: 37710.14, notes: 'Rubi 37710.14 (auditoria Bruno)' },
    { amount: 41280.98, notes: 'Rubi 41280.98 (auditoria Bruno)' },
    { amount: 32102.07, notes: 'Rubi 32102.07 (conferência)' },
    { amount: 2915.59, notes: 'Ressarcimento 2915.59' }
  ];
  for (const cp of rubiAmounts) {
    const candidates = await Sale.find({ client: /rubi/i, origin: /bruno/i });
    let applied = false;
    for (const sale of candidates) {
      const already = (sale.paymentHistory || []).some(
        (h) => Math.abs(Number(h.amount) - cp.amount) < 0.02
      );
      if (already) {
        info(`[SKIP CP dup] ${sale.id} já tem ${cp.amount}`);
        applied = true;
        break;
      }
      const vp = Number(sale.valorTotalVP) || 0;
      const paid = Number(sale.paidAmount) || 0;
      if (vp - paid >= cp.amount - 1) {
        await addClientPaymentIfMissing(sale, cp.amount, cp.notes);
        applied = true;
        break;
      }
    }
    if (!applied) info(`[LOG] CP ${cp.amount} sem venda clara — não inventar`, cp);
  }

  // Cebola Agrofanho PIX 58539
  const agro = await Sale.find({ client: /agrofanho/i, origin: /bruno/i });
  for (const s of agro) {
    if (s.paymentStatus === 'Recebido') continue;
    const target = roundMoney(Number(s.valorTotalVP) || Number(s.totalOperation) || 0);
    if (target > 50000 && target < 70000) {
      await addClientPaymentIfMissing(s, Math.min(58539, roundMoney(target - (Number(s.paidAmount) || 0))), 'PIX Agrofanho 58539 (auditoria Bruno)');
    } else {
      info(`[LOG cebola] ${s.id} VP=${s.valorTotalVP} — conferir PIX 58539`);
    }
  }

  const brunoSales = await Sale.find({ origin: /bruno/i }).lean();
  let vpCenoura = 0;
  let recCenoura = 0;
  let vpCebola = 0;
  let recCebola = 0;
  for (const s of brunoSales) {
    const isCebola = /cebola/i.test(JSON.stringify(s.items || [])) || /cebola/i.test(s.notes || '');
    const vp = Number(s.valorTotalVP) || 0;
    const paid = Number(s.paidAmount) || 0;
    if (isCebola) {
      vpCebola += vp;
      recCebola += paid;
    } else {
      vpCenoura += vp;
      recCenoura += paid;
    }
  }
  info('=== TOTAIS BRUNO ===');
  info('Cenoura', { vp: roundMoney(vpCenoura), recebido: roundMoney(recCenoura), esperadoVP: 1186046.72, esperadoRec: 643255.39 });
  info('Cebola', { vp: roundMoney(vpCebola), recebido: roundMoney(recCebola), esperadoVend: 510255, esperadoRec: 160638.08 });

  await mongoose.disconnect();
  info('Concluído.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
