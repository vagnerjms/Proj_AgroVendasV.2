const path = require('path');
const fs = require('fs').promises;
const { Sale, WeighingSlip, getNextSequence } = require('../db');
const { uploadDir } = require('../middlewares/upload');
const { roundMoney, calculateFiscalDeductions, calculateCommission } = require('../utils/money');
const { normalizeProducerOrigin } = require('./producer.service');
const { sendSaleWebhook } = require('./webhook.service');
const { ensureProductsRegistered } = require('./product.service');
const { invalidateAuditCache } = require('./audit.service');

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
  invalidateAuditCache();

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
  invalidateAuditCache();

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

  const { 
    paidAmount: inputAmount, 
    isPartial, 
    paymentProofFile, 
    paymentDate, 
    notes,
    paymentMethod = 'PIX',
    checkNumber = '',
    checkBank = '',
    checkDueDate = ''
  } = payload;
  const currentPaid = Number(sale.paidAmount) || 0;
  const remainingBalance = roundMoney(Math.max(0, totalLiquido - currentPaid));

  if (isPartial) {
    const paymentValue = roundMoney(Number(inputAmount) || 0);
    if (paymentValue <= 0) {
      const err = new Error('Informe um valor de liquidação parcial válido maior que zero.');
      err.statusCode = 400;
      throw err;
    }

    if (paymentValue > remainingBalance + 0.05) {
      const err = new Error(`O valor informado (R$ ${paymentValue.toFixed(2)}) não pode ser maior que o saldo em aberto (R$ ${remainingBalance.toFixed(2)}).`);
      err.statusCode = 400;
      throw err;
    }

    const newAccumulated = roundMoney(Math.min(totalLiquido, currentPaid + paymentValue));
    sale.paidAmount = newAccumulated;

    if (!Array.isArray(sale.paymentHistory)) sale.paymentHistory = [];
    sale.paymentHistory.push({
      amount: paymentValue,
      date: paymentDate || new Date().toISOString().split('T')[0],
      paymentMethod: paymentMethod || 'PIX',
      checkNumber: checkNumber || '',
      checkBank: checkBank || '',
      checkDueDate: checkDueDate || '',
      paymentProofFile: paymentProofFile || null,
      notes: notes || 'Pagamento parcial registrado'
    });

    if (newAccumulated >= totalLiquido - 0.01) {
      sale.paidAmount = totalLiquido;
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
      paymentMethod: paymentMethod || 'PIX',
      checkNumber: checkNumber || '',
      checkBank: checkBank || '',
      checkDueDate: checkDueDate || '',
      paymentProofFile: paymentProofFile || null,
      notes: notes || 'Quitação integral registrada'
    });

    sale.paymentStatus = 'Recebido';

    // Conclui o status geral da venda somente se o repasse do produtor também já estiver quitado
    const totalNF = roundMoney(sale.totalOperation);
    const isProducerSettled = sale.producerPaymentStatus === 'Pago' || (Number(sale.producerPaidAmount) || 0) >= totalNF - 0.05;
    if (isProducerSettled) {
      sale.status = 'Concluído';
    } else if (payload.syncProducerPayment) {
      sale.producerPaidAmount = totalNF;
      sale.producerPaymentStatus = 'Pago';
      sale.status = 'Concluído';
    } else {
      sale.status = sale.nfFile ? 'Faturado' : 'Pendente NF';
    }
  }

  sale.paymentMethod = paymentMethod || 'PIX';

  if (paymentProofFile) {
    sale.paymentProofFile = paymentProofFile;
  }

  await sale.save();
  sendSaleWebhook('sale.settled', sale);
  invalidateAuditCache();

  return sale;
}

/**
 * Reverter Liquidação de Venda (Total ou Última Parcela)
 */
async function unsettleSale(id, payload = {}) {
  const sale = await Sale.findOne({ id });
  if (!sale) {
    const err = new Error('Venda não encontrada');
    err.statusCode = 404;
    throw err;
  }

  if (payload.mode === 'last' && Array.isArray(sale.paymentHistory) && sale.paymentHistory.length > 0) {
    sale.paymentHistory.pop();
    const remainingPaid = sale.paymentHistory.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    sale.paidAmount = roundMoney(Math.max(0, remainingPaid));

    const fiscal = calculateFiscalDeductions(sale.totalOperation);
    const valorVP = Number(sale.valorTotalVP) > 0 ? Number(sale.valorTotalVP) : Number(sale.totalOperation);
    const totalLiquido = roundMoney(Math.max(0, valorVP - fiscal.funruralTotal));

    if (sale.paidAmount <= 0) {
      sale.paymentStatus = 'A Receber';
      sale.status = sale.nfFile ? 'Faturado' : 'Pendente NF';
      sale.paymentProofFile = null;
    } else if (sale.paidAmount < totalLiquido - 0.01) {
      sale.paymentStatus = 'Parcial';
      sale.status = sale.nfFile ? 'Faturado' : 'Pendente NF';
      const lastWithProof = [...sale.paymentHistory].reverse().find(p => p.paymentProofFile);
      sale.paymentProofFile = lastWithProof ? lastWithProof.paymentProofFile : null;
    } else {
      sale.paymentStatus = 'Recebido';
      sale.status = 'Concluído';
    }
  } else {
    sale.paymentStatus = 'A Receber';
    sale.paidAmount = 0;
    sale.paymentHistory = [];
    sale.paymentProofFile = null;
    sale.status = sale.nfFile ? 'Faturado' : 'Pendente NF';
  }

  await sale.save();

  sendSaleWebhook('sale.updated', sale);
  invalidateAuditCache();

  return sale;
}

/**
 * Liquidação Total ou Parcial de Repasse ao Produtor Rural (Base: Total NF - FUNRURAL)
 */
async function settleProducerPayment(id, payload = {}) {
  const sale = await Sale.findOne({ id });
  if (!sale) {
    const err = new Error('Venda não encontrada');
    err.statusCode = 404;
    throw err;
  }

  const fiscal = calculateFiscalDeductions(sale.totalOperation);
  const totalNF = roundMoney(sale.totalOperation);
  const funruralTotal = fiscal.funruralTotal;
  const liquidoProdutor = roundMoney(Math.max(0, totalNF - funruralTotal));

  const { 
    paidAmount: inputAmount, 
    isPartial, 
    paymentProofFile, 
    paymentDate, 
    notes,
    paymentMethod = 'PIX',
    checkNumber = '',
    checkBank = '',
    checkDueDate = ''
  } = payload;
  const currentPaid = Number(sale.producerPaidAmount) || 0;
  // O valor de quitação total do produtor baseia-se no valor total da nota
  const remainingBalance = roundMoney(Math.max(0, totalNF - currentPaid));

  if (isPartial) {
    const paymentValue = roundMoney(Number(inputAmount) || 0);
    if (paymentValue <= 0) {
      const err = new Error('Informe um valor de repasse ao produtor válido maior que zero.');
      err.statusCode = 400;
      throw err;
    }

    if (paymentValue > remainingBalance + 0.05) {
      const err = new Error(`O valor informado (R$ ${paymentValue.toFixed(2)}) não pode ser maior que o saldo em aberto do produtor (R$ ${remainingBalance.toFixed(2)}).`);
      err.statusCode = 400;
      throw err;
    }

    const newAccumulated = roundMoney(Math.min(totalNF, currentPaid + paymentValue));
    sale.producerPaidAmount = newAccumulated;

    if (!Array.isArray(sale.producerPaymentHistory)) sale.producerPaymentHistory = [];
    sale.producerPaymentHistory.push({
      amount: paymentValue,
      date: paymentDate || new Date().toISOString().split('T')[0],
      paymentMethod: paymentMethod || 'PIX',
      checkNumber: checkNumber || '',
      checkBank: checkBank || '',
      checkDueDate: checkDueDate || '',
      paymentProofFile: paymentProofFile || null,
      notes: notes || 'Repasse parcial ao produtor registrado'
    });

    if (newAccumulated >= totalNF - 0.01) {
      sale.producerPaidAmount = totalNF;
      sale.producerPaymentStatus = 'Pago';
    } else {
      sale.producerPaymentStatus = 'Parcial';
    }
  } else {
    // Quitação Total do Produtor baseada no Valor Total da Nota
    const remainingToSettle = roundMoney(Math.max(0, totalNF - currentPaid));
    sale.producerPaidAmount = totalNF;

    if (!Array.isArray(sale.producerPaymentHistory)) sale.producerPaymentHistory = [];
    sale.producerPaymentHistory.push({
      amount: remainingToSettle > 0 ? remainingToSettle : totalNF,
      date: paymentDate || new Date().toISOString().split('T')[0],
      paymentMethod: paymentMethod || 'PIX',
      checkNumber: checkNumber || '',
      checkBank: checkBank || '',
      checkDueDate: checkDueDate || '',
      paymentProofFile: paymentProofFile || null,
      notes: notes || 'Repasse integral ao produtor quitado (Valor Total da Nota)'
    });

    sale.producerPaymentStatus = 'Pago';

    // Conclui o status geral da venda se o recebimento do cliente também já estiver quitado
    if (sale.paymentStatus === 'Recebido' || (Number(sale.paidAmount) || 0) >= totalNF - 0.05) {
      sale.status = 'Concluído';
    } else if (payload.syncClientPayment) {
      sale.paidAmount = totalNF;
      sale.paymentStatus = 'Recebido';
      sale.status = 'Concluído';
    }
  }

  sale.producerPaymentMethod = paymentMethod || 'PIX';

  if (paymentProofFile) {
    sale.producerPaymentProofFile = paymentProofFile;
  }

  await sale.save();
  sendSaleWebhook('sale.producer_settled', sale);
  invalidateAuditCache();

  return sale;
}

/**
 * Reverter Repasse ao Produtor Rural
 */
async function unsettleProducerPayment(id, payload = {}) {
  const sale = await Sale.findOne({ id });
  if (!sale) {
    const err = new Error('Venda não encontrada');
    err.statusCode = 404;
    throw err;
  }

  const fiscal = calculateFiscalDeductions(sale.totalOperation);
  const totalNF = roundMoney(sale.totalOperation);
  const liquidoProdutor = roundMoney(Math.max(0, totalNF - fiscal.funruralTotal));

  if (payload.mode === 'last' && Array.isArray(sale.producerPaymentHistory) && sale.producerPaymentHistory.length > 0) {
    sale.producerPaymentHistory.pop();
    const remainingPaid = sale.producerPaymentHistory.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    sale.producerPaidAmount = roundMoney(Math.max(0, remainingPaid));

    if (sale.producerPaidAmount <= 0) {
      sale.producerPaymentStatus = 'A Pagar';
      sale.producerPaymentProofFile = null;
    } else if (sale.producerPaidAmount < totalNF - 0.01) {
      sale.producerPaymentStatus = 'Parcial';
      const lastWithProof = [...sale.producerPaymentHistory].reverse().find(p => p.paymentProofFile);
      sale.producerPaymentProofFile = lastWithProof ? lastWithProof.paymentProofFile : null;
    } else {
      sale.producerPaymentStatus = 'Pago';
    }
  } else {
    sale.producerPaymentStatus = 'A Pagar';
    sale.producerPaidAmount = 0;
    sale.producerPaymentHistory = [];
    sale.producerPaymentProofFile = null;
  }

  await sale.save();
  sendSaleWebhook('sale.updated', sale);
  invalidateAuditCache();

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

  invalidateAuditCache();
  return deleted;
}

/**
 * Normaliza flags e status de pendência de NF-e na venda
 */
function normalizeSaleNfStatus(s) {
  if (!s) return s;
  const doc = s.toObject ? s.toObject() : { ...s };
  const hasNf = !!(doc.nfFile && doc.nfFile.trim());
  if (hasNf) {
    doc.nfPending = false;
    if (doc.status === 'Pendente NF') {
      doc.status = doc.paymentStatus === 'Recebido' ? 'Concluído' : 'Faturado';
    }
  } else {
    doc.nfPending = true;
    if (!doc.status || doc.status === 'Faturado') {
      doc.status = 'Pendente NF';
    }
  }
  return doc;
}

/**
 * Gera lista de eventos de recebimento por vencimento para o n8n e Google Calendar
 */
async function getAgendaEvents() {
  const sales = await Sale.find().sort({ saleDate: -1 }).lean();
  return sales.map(s => {
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
}

/**
 * Sincroniza e recalcula venda vinculada a partir da pesagem de romaneio
 */
async function syncSaleWeightFromSlip(slip, chosenWeightKg, weightChoice) {
  if (!slip || !chosenWeightKg || chosenWeightKg <= 0) return null;

  const rawSaleRef = slip.saleId || slip.id.replace('ROM-', '');
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
  const isBatata = (sale.items && sale.items.some(it => it.product?.toLowerCase().includes('batata'))) || (sale.notes && sale.notes.toLowerCase().includes('batata'));
  const boxWeight = Number(sale.items?.[0]?.boxWeightKg) || (isBatata ? 25 : 29);
  const newVolumes = boxWeight === 1 ? newTotalKg : Number((newTotalKg / boxWeight).toFixed(2));

  // Recalcula totais da venda
  if (sale.items && sale.items.length > 0) {
    const unitPriceKg = sale.totalKg > 0 ? (sale.totalOperation / sale.totalKg) : (sale.items[0].price || 2.0);
    sale.items[0].kg = newTotalKg;
    sale.items[0].quantity = Math.round(newVolumes);
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
  sale.previdenciaSocial = fiscal.previdencia;
  sale.rat = fiscal.rat;
  sale.senar = fiscal.senar;

  // Recalcula Valor Total VP
  let cotacao = Number(sale.dailyQuote) || 0;
  if (!cotacao && sale.notes) {
    const matchCot = sale.notes.match(/Cotação:?\s*R\$\s*([\d,.]+)/i);
    if (matchCot) cotacao = parseFloat(matchCot[1].replace(',', '.'));
  }

  if (cotacao > 0 && cotacao <= 10.0) {
    sale.valorTotalVP = roundMoney(newTotalKg * cotacao);
  } else if (cotacao > 10.0) {
    sale.valorTotalVP = roundMoney(newVolumes * cotacao);
  } else {
    sale.valorTotalVP = roundMoney(sale.totalOperation);
  }

  // Recalcula comissão
  const comm = calculateCommission(sale.valorTotalVP, sale.feeValue);
  sale.totalCommission = comm.comissao;

  sale.isDivergent = false;

  // Anota no histórico da venda
  const choiceText = weightChoice === 'dest' ? 'Peso Destino' : (weightChoice === 'origin' ? 'Peso Origem' : 'Peso Ajustado');
  const adjustTag = `[Pesagem: ${choiceText} (${newTotalKg.toLocaleString('pt-BR')} kg - ${newVolumes} cx)]`;
  const existingNotes = typeof sale.notes === 'string' ? sale.notes : '';
  if (!existingNotes.includes('[Pesagem:')) {
    sale.notes = existingNotes ? `${existingNotes} | ${adjustTag}` : adjustTag;
  }

  await sale.save();

  try {
    sendSaleWebhook('sale.weight_synced', sale);
  } catch (e) {}

  return sale;
}

module.exports = {
  createSale,
  updateSale,
  settleSale,
  unsettleSale,
  settleProducerPayment,
  unsettleProducerPayment,
  deleteSale,
  normalizeSaleNfStatus,
  getAgendaEvents,
  syncSaleWeightFromSlip
};
