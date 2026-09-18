const path = require('path');
const fs = require('fs').promises;
const { Sale, WeighingSlip, uploadDir } = require('../db');
const { getNextSequence } = require('../utils/sequence');
const { roundMoney, calculateFiscalDeductions, calculateCommission } = require('../utils/money');
const { normalizeProducerOrigin } = require('../utils/producer');
const { sendSaleWebhook } = require('./webhook.service');
const { ensureProductsRegistered } = require('./product.service');

/**
 * Criação atômica de Venda (VP) com cálculo tributário, geração de romaneio e webhook
 */
async function createSale(body) {
  // 1. Evita duplicidade de NF-e pela chave SEFAZ de 44 dígitos
  if (body.nfeKey && body.nfeKey.trim().length >= 10) {
    const existingKey = await Sale.findOne({ nfeKey: body.nfeKey.trim() }).lean();
    if (existingKey) {
      const err = new Error(`Esta NF-e (Chave SEFAZ: ${body.nfeKey}) já foi importada e está vinculada à Venda ${existingKey.id} (${existingKey.client}).`);
      err.statusCode = 409;
      throw err;
    }
  }

  const seq = await getNextSequence('sale_vp_id', Sale, 'VP');
  const newId = `VP${String(seq).padStart(3, '0')}`;

  const totalOp = roundMoney(body.totalOperation);
  const fiscal = calculateFiscalDeductions(totalOp);
  const valorVP = roundMoney(body.valorTotalVP > 0 ? body.valorTotalVP : totalOp);
  const commission = calculateCommission(valorVP, body.feeValue);
  const normalizedOrigin = await normalizeProducerOrigin(body.origin || '', body.notes || '');

  const newSale = new Sale({
    id: newId,
    operationType: body.operationType || "Intermediação (Corretagem / Comissão)",
    saleDate: body.saleDate || new Date().toISOString().split('T')[0],
    client: body.client || "Cliente Geral",
    clientDocument: body.clientDocument || "",
    origin: normalizedOrigin,
    destCity: body.destCity || "",
    destUF: body.destUF || "",
    notes: body.notes || "",
    nfFile: body.nfFile || null,
    nfeKey: body.nfeKey || "",
    nfeDate: body.nfeDate || (body.nfFile ? body.saleDate : ""),
    evidenceFile: body.evidenceFile || null,
    freightType: body.freightType || 'FOB (Retira na Origem)',
    carrierName: body.carrierName || '',
    truckPlate: body.truckPlate || '',
    driverName: body.driverName || '',
    driverCPF: body.driverCPF || '',
    items: body.items || [],
    feeType: body.feeType || "Porcentagem (%)",
    feeValue: Number(body.feeValue) || 3.0,
    dailyQuote: roundMoney(body.dailyQuote),
    valorTotalVP: valorVP,
    totalVolumes: Number(body.totalVolumes) || 0,
    totalKg: Number(body.totalKg) || 0,
    totalOperation: totalOp,
    totalCommission: commission.comissao,
    funruralTotal: fiscal.funruralTotal,
    previdenciaSocial: fiscal.previdencia,
    rat: fiscal.rat,
    senar: fiscal.senar,
    liquidoAReceber: roundMoney(Math.max(0, valorVP - fiscal.funruralTotal)),
    valorLiquidar: roundMoney(Math.max(0, valorVP - fiscal.funruralTotal)),
    status: body.nfFile ? "Faturado" : "Pendente NF",
    paymentStatus: "A Receber",
    paymentTerms: body.paymentTerms || (body.paymentTermDays !== undefined ? (Number(body.paymentTermDays) === 0 ? 'À Vista' : `${body.paymentTermDays} dias`) : '30 dias'),
    paymentTermDays: body.paymentTermDays !== undefined ? Number(body.paymentTermDays) : 30,
    dueDate: body.dueDate || '',
    paidAmount: 0,
    paymentHistory: [],
    isDivergent: false,
    nfPending: !body.nfFile
  });

  await newSale.save();

  // Auto-cadastra os produtos da venda no catálogo se ainda não existirem
  if (newSale.items && Array.isArray(newSale.items) && newSale.items.length > 0) {
    ensureProductsRegistered(newSale.items).catch(e => console.warn('Aviso ao auto-cadastrar produtos:', e.message));
  }

  // Auto-cria Romaneio vinculado (ROM-VPXXX)
  try {
    const existingSlip = await WeighingSlip.findOne({
      $or: [{ saleId: newSale.id }, { id: `ROM-${newSale.id}` }]
    });

    if (!existingSlip) {
      const isBatata = (newSale.items && newSale.items.some(it => it.product?.toLowerCase().includes('batata'))) || (newSale.notes && newSale.notes.toLowerCase().includes('batata'));
      const unitKg = isBatata ? 25 : (newSale.items?.[0]?.boxWeightKg || 29);
      const computedBoxes = Number(newSale.totalVolumes) > 0 ? Number(newSale.totalVolumes) : (Number(newSale.totalKg) > 0 ? Number((Number(newSale.totalKg) / unitKg).toFixed(2)) : 0);

      const newSlip = new WeighingSlip({
        id: `ROM-${newSale.id}`,
        saleId: newSale.id,
        date: newSale.saleDate,
        client: newSale.client,
        driverName: newSale.driverName || normalizedOrigin || 'Não Informado',
        truckPlate: newSale.truckPlate || 'SEM PLACA',
        product: newSale.items?.[0]?.product || 'Hortifrúti Diversos',
        originWeightKg: Number(newSale.totalKg) || 0,
        destWeightKg: Number(newSale.totalKg) || 0,
        netWeightKg: Number(newSale.totalKg) || 0,
        boxes: computedBoxes,
        boxWeightKg: unitKg,
        pricePerBox: Number(newSale.items?.[0]?.dailyQuote) || Number(newSale.items?.[0]?.price) || Number(newSale.dailyQuote) || 0,
        notes: `Criado automaticamente a partir da Venda ${newSale.id}`
      });
      await newSlip.save();
    }
  } catch (slipErr) {
    console.warn('Aviso: erro ao criar romaneio automático vinculado à venda:', slipErr.message);
  }

  // Disparar Webhook para o n8n
  sendSaleWebhook('sale.created', newSale);

  return newSale;
}

/**
 * Atualização de Venda com cascata em romaneios e webhook
 */
async function updateSale(id, body) {
  if (body.origin || body.notes) {
    body.origin = await normalizeProducerOrigin(body.origin || '', body.notes || '');
  }

  const updated = await Sale.findOneAndUpdate(
    { id },
    { $set: body },
    { new: true }
  );

  if (!updated) {
    const err = new Error('Venda não encontrada');
    err.statusCode = 404;
    throw err;
  }

  if (updated.items && Array.isArray(updated.items) && updated.items.length > 0) {
    ensureProductsRegistered(updated.items).catch(e => console.warn('Aviso ao auto-cadastrar produtos:', e.message));
  }

  // Sincronização com Romaneio vinculado
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

  sendSaleWebhook('sale.updated', updated);

  return updated;
}

/**
 * Liquidação Total ou Parcial de Venda
 */
async function settleSale(id, payload = {}) {
  const sale = await Sale.findOne({ id });
  if (!sale) {
    const err = new Error('Venda não encontrada');
    err.statusCode = 404;
    throw err;
  }

  const fiscal = calculateFiscalDeductions(sale.totalOperation);
  const valorVP = Number(sale.valorTotalVP) > 0 ? Number(sale.valorTotalVP) : Number(sale.totalOperation);
  const totalLiquido = roundMoney(Math.max(0, valorVP - fiscal.funruralTotal));

  const { paidAmount: inputAmount, isPartial, paymentProofFile, paymentDate, notes } = payload;
  const currentPaid = Number(sale.paidAmount) || 0;

  if (isPartial) {
    const paymentValue = roundMoney(Number(inputAmount) || 0);
    if (paymentValue <= 0) {
      const err = new Error('Informe um valor de liquidação parcial válido maior que zero.');
      err.statusCode = 400;
      throw err;
    }

    const newAccumulated = roundMoney(currentPaid + paymentValue);
    sale.paidAmount = newAccumulated;

    if (!Array.isArray(sale.paymentHistory)) sale.paymentHistory = [];
    sale.paymentHistory.push({
      amount: paymentValue,
      date: paymentDate || new Date().toISOString().split('T')[0],
      paymentProofFile: paymentProofFile || null,
      notes: notes || 'Pagamento parcial registrado'
    });

    if (newAccumulated >= totalLiquido) {
      sale.paymentStatus = 'Recebido';
      sale.status = 'Concluído';
    } else {
      sale.paymentStatus = 'Parcial';
    }
  } else {
    // Quitação Total
    const remainingToSettle = roundMoney(Math.max(0, totalLiquido - currentPaid));
    sale.paidAmount = totalLiquido;

    if (!Array.isArray(sale.paymentHistory)) sale.paymentHistory = [];
    sale.paymentHistory.push({
      amount: remainingToSettle > 0 ? remainingToSettle : totalLiquido,
      date: paymentDate || new Date().toISOString().split('T')[0],
      paymentProofFile: paymentProofFile || null,
      notes: notes || 'Quitação integral registrada'
    });

    sale.paymentStatus = 'Recebido';
    sale.status = 'Concluído';
  }

  if (paymentProofFile) {
    sale.paymentProofFile = paymentProofFile;
  }

  await sale.save();
  sendSaleWebhook('sale.settled', sale);

  return sale;
}

/**
 * Reverter Liquidação de Venda
 */
async function unsettleSale(id) {
  const sale = await Sale.findOne({ id });
  if (!sale) {
    const err = new Error('Venda não encontrada');
    err.statusCode = 404;
    throw err;
  }

  sale.paymentStatus = 'A Receber';
  sale.paidAmount = 0;
  sale.paymentHistory = [];
  sale.status = sale.nfFile ? 'Faturado' : 'Pendente NF';
  await sale.save();

  sendSaleWebhook('sale.updated', sale);

  return sale;
}

/**
 * Exclusão de Venda com cascata de romaneios e arquivos
 */
async function deleteSale(id) {
  const deleted = await Sale.findOneAndDelete({ id });
  if (!deleted) {
    const err = new Error('Venda não encontrada');
    err.statusCode = 404;
    throw err;
  }

  try {
    await WeighingSlip.deleteMany({
      $or: [{ saleId: deleted.id }, { id: `ROM-${deleted.id}` }]
    });
  } catch (slipErr) {
    console.warn('Aviso: falha ao remover romaneio vinculado:', slipErr);
  }

  // Limpeza de arquivos físicos
  if (deleted.nfFile) {
    const otherUsingNf = await Sale.findOne({ nfFile: deleted.nfFile });
    if (!otherUsingNf) {
      const nfPath = path.join(uploadDir, deleted.nfFile);
      fs.unlink(nfPath).catch(() => {});
    }
  }

  if (deleted.evidenceFile) {
    const otherUsingEvidence = await Sale.findOne({ evidenceFile: deleted.evidenceFile });
    if (!otherUsingEvidence) {
      const evPath = path.join(uploadDir, deleted.evidenceFile);
      fs.unlink(evPath).catch(() => {});
    }
  }

  return deleted;
}

module.exports = {
  createSale,
  updateSale,
  settleSale,
  unsettleSale,
  deleteSale
};
