const { Sale } = require('../db');
const { roundMoney, calculateFiscalDeductions, calculateCommission } = require('../utils/money');
const { normalizeProducerOrigin } = require('../utils/producer');
const { escapeRegex } = require('../utils/security');

/**
 * Agregação analítica de vendas por loja, produtor e período
 */
async function getStoresSummary({ startDate, endDate, producer }) {
  let query = {};
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  const validStart = (typeof startDate === 'string' && dateRegex.test(startDate.trim())) ? startDate.trim() : null;
  const validEnd = (typeof endDate === 'string' && dateRegex.test(endDate.trim())) ? endDate.trim() : null;

  if (validStart && validEnd) {
    query.saleDate = { $gte: validStart, $lte: validEnd };
  } else if (validStart) {
    query.saleDate = { $gte: validStart };
  } else if (validEnd) {
    query.saleDate = { $lte: validEnd };
  }

  if (producer && producer !== 'ALL') {
    const baseName = producer.replace(/\s*\(.*\)/, '').trim();
    if (baseName.length >= 4) {
      const escapedBase = escapeRegex ? escapeRegex(baseName) : baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.origin = { $regex: new RegExp(escapedBase, 'i') };
    } else {
      query.origin = producer;
    }
  }

  const allSales = await Sale.find(query).sort({ saleDate: 1 }).lean();
  const rawProducers = await Sale.distinct('origin');
  const producerSet = new Set();
  for (const p of rawProducers) {
    if (p && p.trim()) {
      const norm = await normalizeProducerOrigin(p);
      producerSet.add(norm);
    }
  }
  const producers = Array.from(producerSet).sort();

  const clientGroups = {};
  for (const s of allSales) {
    if (!clientGroups[s.client]) {
      clientGroups[s.client] = [];
    }
    clientGroups[s.client].push(s);
  }

  const stores = Object.keys(clientGroups).map(clientName => {
    const sales = clientGroups[clientName];
    let nfs = 0;
    let pedidosVenda = sales.length;
    let pedidosSemNF = 0;
    let pesoNF = 0;
    let pesoColheita = 0;
    let cxsVendidas = 0;
    let valorTotalNF = 0;
    let funrural = 0;
    let totalVendaAReceber = 0;

    const itens = sales.map(s => {
      const isFaturado = s.status === 'Faturado';
      
      let itemPesoNF = Number(s.totalKg) || 0;
      let itemValorNF = roundMoney(s.totalOperation);
      const fiscal = calculateFiscalDeductions(itemValorNF);
      let itemFunrural = fiscal.funruralTotal;
      let itemPrecoKg = itemPesoNF > 0 ? roundMoney(itemValorNF / itemPesoNF) : 0;

      if (isFaturado || s.nfFile) {
        nfs++;
      } else {
        pedidosSemNF++;
      }

      pesoNF += itemPesoNF;
      valorTotalNF = roundMoney(valorTotalNF + itemValorNF);
      funrural = roundMoney(funrural + itemFunrural);
      pesoColheita += itemPesoNF;

      // Volumes
      const isBatata = (s.items && s.items.some(it => it.product?.toLowerCase().includes('batata'))) || (s.notes && s.notes.toLowerCase().includes('batata'));
      const unitKg = isBatata ? 25 : (s.items?.[0]?.boxWeightKg || 29);
      let itemCaixas = Number(s.totalVolumes) > 0 ? Number(s.totalVolumes) : (itemPesoNF > 0 ? Number((itemPesoNF / unitKg).toFixed(2)) : 0);

      cxsVendidas = Number((cxsVendidas + itemCaixas).toFixed(2));

      // Valor Comercial (VP) consolidado multi-item
      let valorVP = 0;
      if (s.items && Array.isArray(s.items) && s.items.length > 0) {
        valorVP = s.items.reduce((acc, it) => {
          const itKg = Number(it.kg) || 0;
          const bw = Number(it.boxWeightKg) || 25;
          const itVol = Number(it.quantity) || (itKg > 0 && bw > 0 ? itKg / bw : 0);
          const q = Number(it.dailyQuote) || 0;
          if (q > 0) {
            const isQKg = (q > 0 && q <= 10.0) || (it.unit && it.unit.includes('Granel')) || bw === 1;
            return acc + (isQKg ? (itKg * q) : (itVol * q));
          }
          if (Number(it.valorTotalVP) > 0) return acc + Number(it.valorTotalVP);
          if (Number(it.total) > 0) return acc + Number(it.total);
          return acc;
        }, 0);
      } else if (Number(s.valorTotalVP) > 0) {
        valorVP = Number(s.valorTotalVP);
      } else {
        let cotacao = Number(s.dailyQuote) || 0;
        if (!cotacao && s.notes) {
          const matchCot = s.notes.match(/Cotação:?\s*R\$\s*([\d,.]+)/i);
          if (matchCot) cotacao = parseFloat(matchCot[1].replace(',', '.'));
        }
        if (cotacao > 0 && cotacao <= 10.0 && itemPesoNF > 0) {
          valorVP = roundMoney(itemPesoNF * cotacao);
        } else if (cotacao > 10.0) {
          valorVP = roundMoney(itemCaixas * cotacao);
        } else {
          valorVP = itemValorNF;
        }
      }
      valorVP = roundMoney(valorVP);

      // Regra de Liquidação: Total, Parcial ou A Receber
      const totalLiquidoItem = roundMoney(Math.max(0, valorVP - itemFunrural));
      const paid = roundMoney(Number(s.paidAmount) || 0);
      
      let itemLiquidado = 0;
      let itemALiquidar = totalLiquidoItem;

      if (s.paymentStatus === 'Recebido' || s.status === 'Concluído' || s.status === 'Recebido') {
        itemLiquidado = totalLiquidoItem;
        itemALiquidar = 0;
      } else if (s.paymentStatus === 'Parcial' || (paid > 0 && paid < totalLiquidoItem)) {
        itemLiquidado = Math.min(paid, totalLiquidoItem);
        itemALiquidar = Math.max(0, totalLiquidoItem - paid);
      } else {
        itemLiquidado = 0;
        itemALiquidar = totalLiquidoItem;
      }

      totalVendaAReceber = roundMoney(totalVendaAReceber + valorVP);

      const nfNumber = s.nfFile ? s.nfFile.replace(/^\d{10,15}(-\d+)?-/, '').replace('NF-', '').replace('.pdf', '') : (s.nfeKey ? s.nfeKey.slice(-8) : 'Pendente');
      const comm = calculateCommission(valorVP, itemValorNF, s.feeValue);

      // Nome / discriminação dos produtos
      let productLabel = 'Cenoura';
      if (s.items && s.items.length > 1) {
        productLabel = s.items.map(it => {
          const itKg = Number(it.kg) || 0;
          const bw = Number(it.boxWeightKg) || (it.unit?.includes('Granel') ? 1 : (it.product?.toLowerCase().includes('batata') ? 25 : 29));
          const itVol = Number(it.quantity) || (itKg > 0 && bw > 0 ? itKg / bw : 0);
          const unitAbbr = it.unit?.toLowerCase().includes('saca') || it.product?.toLowerCase().includes('batata') ? 'sc' : (it.unit?.toLowerCase().includes('granel') ? 'kg' : 'cx');
          return `${it.product || 'Item'} (${itVol > 0 ? `${itVol.toFixed(0)} ${unitAbbr}` : `${itKg} kg`})`;
        }).join(' + ');
      } else if (s.items && s.items.length === 1) {
        productLabel = s.items[0].product || 'Cenoura';
      } else if (s.notes) {
        const m = s.notes.match(/Venda de ([^|]+)/i);
        if (m && m[1]) productLabel = m[1].trim();
      }

      const cleanEvidence = s.evidenceFile ? s.evidenceFile.replace(/^\d{10,15}(-\d+)?-/, '') : '';
      const cleanNfFile = s.nfFile ? s.nfFile.replace(/^\d{10,15}(-\d+)?-/, '') : '';
      const produtorNome = s.origin || (s.notes?.match(/Produtor:\s*([^|]+)/i)?.[1]?.trim()) || 'Produtor Rural';

      return {
        vp: s.id,
        dataVP: s.saleDate ? s.saleDate.split('-').reverse().join('/') : '-',
        nf: nfNumber,
        dataNF: s.saleDate ? s.saleDate.split('-').reverse().join('/') : '-',
        producer: produtorNome,
        origin: s.origin || produtorNome,
        destUF: s.destUF || '',
        uf: s.destUF || (s.client?.toUpperCase().includes('RJ') ? 'RJ' : (s.client?.toUpperCase().includes('SP') ? 'SP' : 'MG')),
        product: productLabel,
        unit: isBatata ? 'Sacas (25kg)' : (s.items?.[0]?.unit || 'Caixas (29kg)'),
        items: s.items || [],
        pesoNF: itemPesoNF,
        pesoColheita: itemPesoNF,
        cxs: itemCaixas,
        precoKg: itemPrecoKg,
        valorNF: itemValorNF,
        funrural: itemFunrural,
        cotacao: s.items?.[0]?.dailyQuote ? Number(s.items[0].dailyQuote) : (Number(s.dailyQuote) || 0),
        valorVP: valorVP,
        liquido: itemLiquidado,
        valorLiquidado: itemLiquidado,
        valorALiquidar: itemALiquidar,
        paidAmount: paid,
        paymentMethod: s.paymentMethod || (s.paymentHistory && s.paymentHistory.length > 0 ? s.paymentHistory[s.paymentHistory.length - 1].paymentMethod : 'PIX'),
        paymentHistory: s.paymentHistory || [],
        liquidoNF: roundMoney(itemValorNF - itemFunrural),
        taxaComissao: comm.taxaPercentual,
        comissao: comm.comissao,
        liquidoProdutor: comm.liquidoProdutor,
        spreadComercial: comm.spreadComercial,
        lucroCorretor: comm.lucroCorretor,
        venc: s.dueDate ? s.dueDate.split('-').reverse().join('/') : (s.notes?.match(/Vencimento:\s*([^\s|]+)/i)?.[1] || 'Em aberto'),
        status: s.status,
        paymentStatus: s.paymentStatus || 'A Receber',
        evidenceFile: cleanEvidence || '-',
        rawEvidenceFile: s.evidenceFile || null,
        paymentProofFile: s.paymentProofFile || null,
        nfFile: cleanNfFile || '-',
        rawNfFile: s.nfFile || null
      };
    });

    const totalComissaoLoja = roundMoney(itens.reduce((a, b) => a + b.comissao, 0));
    const totalLiquidoProdutorLoja = roundMoney(itens.reduce((a, b) => a + b.liquidoProdutor, 0));
    const totalSpreadComercialLoja = roundMoney(itens.reduce((a, b) => a + (b.spreadComercial || 0), 0));
    const totalLucroCorretorLoja = roundMoney(itens.reduce((a, b) => a + (b.lucroCorretor || 0), 0));
    const valorLiquidadoLoja = roundMoney(itens.reduce((a, b) => a + (b.valorLiquidado || 0), 0));
    const valorALiquidarLoja = roundMoney(itens.reduce((a, b) => a + (b.valorALiquidar || 0), 0));

    return {
      loja: clientName,
      nfs,
      pedidosVenda,
      pedidosSemNF,
      pesoNF,
      pesoColheita,
      cxsVendidas,
      valorTotalNF: roundMoney(valorTotalNF),
      funrural: roundMoney(funrural),
      totalVendaAReceber: roundMoney(totalVendaAReceber),
      liquidoNF: roundMoney(valorTotalNF - funrural),
      totalComissao: totalComissaoLoja,
      totalLiquidoProdutor: totalLiquidoProdutorLoja,
      totalSpreadComercial: totalSpreadComercialLoja,
      totalLucroCorretor: totalLucroCorretorLoja,
      valorLiquidado: valorLiquidadoLoja,
      valorALiquidar: valorALiquidarLoja,
      itens
    };
  });

  const totalGeral = {
    nfs: stores.reduce((a, b) => a + b.nfs, 0),
    pedidosVenda: stores.reduce((a, b) => a + b.pedidosVenda, 0),
    pedidosSemNF: stores.reduce((a, b) => a + b.pedidosSemNF, 0),
    pesoNF: stores.reduce((a, b) => a + b.pesoNF, 0),
    pesoColheita: stores.reduce((a, b) => a + b.pesoColheita, 0),
    cxsVendidas: stores.reduce((a, b) => a + b.cxsVendidas, 0),
    valorTotalNF: roundMoney(stores.reduce((a, b) => a + b.valorTotalNF, 0)),
    funrural: roundMoney(stores.reduce((a, b) => a + b.funrural, 0)),
    totalVendaAReceber: roundMoney(stores.reduce((a, b) => a + b.totalVendaAReceber, 0)),
    liquidoNF: roundMoney(stores.reduce((a, b) => a + b.liquidoNF, 0)),
    totalComissao: roundMoney(stores.reduce((a, b) => a + b.totalComissao, 0)),
    totalLiquidoProdutor: roundMoney(stores.reduce((a, b) => a + b.totalLiquidoProdutor, 0)),
    totalSpreadComercial: roundMoney(stores.reduce((a, b) => a + (b.totalSpreadComercial || 0), 0)),
    totalLucroCorretor: roundMoney(stores.reduce((a, b) => a + (b.totalLucroCorretor || 0), 0)),
    valorTotalLiquidado: roundMoney(stores.reduce((a, b) => a + (b.valorLiquidado || 0), 0)),
    valorTotalALiquidar: roundMoney(stores.reduce((a, b) => a + (b.valorALiquidar || 0), 0))
  };

  return { stores, totalGeral, producers };
}

/**
 * Disparo de relatório filtrado para o webhook do n8n / Google Drive
 */
async function triggerN8nReport(user, body) {
  const { webhookUrl, startDate, endDate, selectedLoja, selectedProducer, activeTab, excelHtml, filteredStores, currentTotal } = body;
  if (!webhookUrl || typeof webhookUrl !== 'string') {
    const err = new Error('URL do Webhook do n8n não informada');
    err.statusCode = 400;
    throw err;
  }

  try {
    const parsedUrl = new URL(webhookUrl);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      const err = new Error('Protocolo de URL inválido para webhook (apenas http e https são permitidos)');
      err.statusCode = 400;
      throw err;
    }
    const hostname = parsedUrl.hostname.toLowerCase();
    if (
      hostname === '169.254.169.254' ||
      hostname === 'metadata.google.internal' ||
      hostname.endsWith('.internal')
    ) {
      const err = new Error('Endereço de webhook restrito por segurança (SSRF)');
      err.statusCode = 400;
      throw err;
    }
  } catch (urlErr) {
    const err = new Error('URL de Webhook inválida');
    err.statusCode = 400;
    throw err;
  }

  const safeLoja = (!selectedLoja || selectedLoja === 'ALL') ? 'Geral' : selectedLoja.replace(/[^a-zA-Z0-9]/g, '_');
  const today = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  const startStr = startDate || 'Inicio';
  const endStr = endDate || todayStr;
  const fileName = `Relatorio_AgroVenda_${safeLoja}_${startStr}_a_${endStr}.xls`;
  const folderName = `Relatórios AgroVenda (${todayStr.slice(0, 7)})`;

  let htmlContent = excelHtml || `<html><head><meta charset="utf-8"></head><body><h2>Relatório AgroVenda (${safeLoja})</h2></body></html>`;

  const fileBuffer = Buffer.from(htmlContent, 'utf-8');
  const contentBase64 = fileBuffer.toString('base64');

  const payload = {
    event: 'report.generated',
    triggeredAt: new Date().toISOString(),
    user: user ? user.name : 'Administrador',
    fileName: fileName,
    folderName: folderName,
    suggestedFolder: folderName,
    fileSize: fileBuffer.length,
    mimeType: 'application/vnd.ms-excel',
    contentBase64: contentBase64,
    hasFiles: true,
    files: [
      {
        filename: fileName,
        mimeType: 'application/vnd.ms-excel',
        sizeBytes: fileBuffer.length,
        contentBase64: contentBase64
      }
    ],
    driveFolder: {
      monthFolder: todayStr.slice(0, 7),
      clientFolder: safeLoja,
      suggestedFolder: folderName
    },
    filters: {
      startDate: startDate || null,
      endDate: endDate || null,
      selectedLoja: selectedLoja || 'ALL',
      selectedProducer: selectedProducer || 'ALL',
      activeTab: activeTab || 'geral'
    },
    stores: filteredStores,
    totalGeral: currentTotal
  };

  const fetchModule = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
  const fetchFunc = typeof fetch === 'function' ? fetch : fetchModule;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  let response;
  try {
    response = await fetchFunc(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeoutId);
  }

  const resultText = await response.text();
  let resultJson;
  try { resultJson = JSON.parse(resultText); } catch(e) { resultJson = { raw: resultText }; }

  return {
    success: response.ok,
    status: response.status,
    message: response.ok ? 'Relatório filtrado enviado ao n8n com sucesso!' : 'Falha na resposta do n8n',
    response: resultJson
  };
}

/**
 * Agregação analítica exclusiva por Produtor Rural (Prestação de Contas baseada na NF)
 * Não contém VP Comercial ou Cotação negociada com a loja.
 */
async function getProducersSummary({ startDate, endDate, producer }) {
  let query = {};
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  const validStart = (typeof startDate === 'string' && dateRegex.test(startDate.trim())) ? startDate.trim() : null;
  const validEnd = (typeof endDate === 'string' && dateRegex.test(endDate.trim())) ? endDate.trim() : null;

  if (validStart && validEnd) {
    query.saleDate = { $gte: validStart, $lte: validEnd };
  } else if (validStart) {
    query.saleDate = { $gte: validStart };
  } else if (validEnd) {
    query.saleDate = { $lte: validEnd };
  }

  if (producer && producer !== 'ALL') {
    const baseName = producer.replace(/\s*\(.*\)/, '').trim();
    if (baseName.length >= 4) {
      const escapedBase = escapeRegex ? escapeRegex(baseName) : baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.origin = { $regex: new RegExp(escapedBase, 'i') };
    } else {
      query.origin = producer;
    }
  }

  const allSales = await Sale.find(query).sort({ saleDate: 1 }).lean();
  
  // Agrupar por Produtor (Origem)
  const producerGroups = {};
  for (const s of allSales) {
    const prodName = s.origin || (s.notes?.match(/Produtor:\s*([^|]+)/i)?.[1]?.trim()) || 'Produtor Rural';
    if (!producerGroups[prodName]) {
      producerGroups[prodName] = [];
    }
    producerGroups[prodName].push(s);
  }

  const producers = Object.keys(producerGroups).map(prodName => {
    const sales = producerGroups[prodName];
    let nfs = 0;
    let pedidos = sales.length;
    let pesoNF = 0;
    let cxs = 0;
    let valorTotalNF = 0;
    let funrural = 0;
    let liquidoProdutor = 0;
    let repassesPagos = 0;
    let saldoAPagar = 0;

    const itens = sales.map(s => {
      const nfNumber = s.nfFile ? s.nfFile.replace(/^\d{10,15}(-\d+)?-/, '').replace('NF-', '').replace('.pdf', '') : (s.nfeKey ? s.nfeKey.slice(-8) : 'Pendente');
      if (s.status === 'Faturado' || s.nfFile) nfs++;

      const itemPeso = Number(s.totalKg) || 0;
      const itemValorNF = roundMoney(s.totalOperation);
      const fiscal = calculateFiscalDeductions(itemValorNF);
      const itemFunrural = fiscal.funruralTotal;
      const itemPrecoKg = itemPeso > 0 ? roundMoney(itemValorNF / itemPeso) : 0;
      const itemLiquido = roundMoney(Math.max(0, itemValorNF - itemFunrural));

      const isBatata = (s.items && s.items.some(it => it.product?.toLowerCase().includes('batata'))) || (s.notes && s.notes.toLowerCase().includes('batata'));
      const unitKg = isBatata ? 25 : (s.items?.[0]?.boxWeightKg || 29);
      const itemCaixas = Number(s.totalVolumes) > 0 ? Number(s.totalVolumes) : (itemPeso > 0 ? Number((itemPeso / unitKg).toFixed(2)) : 0);

      const pago = roundMoney(Number(s.producerPaidAmount) || 0);
      const saldo = roundMoney(Math.max(0, itemLiquido - pago));
      
      pesoNF += itemPeso;
      cxs = Number((cxs + itemCaixas).toFixed(2));
      valorTotalNF = roundMoney(valorTotalNF + itemValorNF);
      funrural = roundMoney(funrural + itemFunrural);
      liquidoProdutor = roundMoney(liquidoProdutor + itemLiquido);
      repassesPagos = roundMoney(repassesPagos + pago);
      saldoAPagar = roundMoney(saldoAPagar + saldo);

      let productLabel = 'Cenoura';
      if (s.items && s.items.length > 1) {
        productLabel = s.items.map(it => it.product || 'Item').join(' + ');
      } else if (s.items && s.items.length === 1) {
        productLabel = s.items[0].product || 'Cenoura';
      }

      const cleanProof = s.producerPaymentProofFile ? s.producerPaymentProofFile.replace(/^\d{10,15}(-\d+)?-/, '') : '';

      return {
        id: s.id,
        date: s.saleDate ? s.saleDate.split('-').reverse().join('/') : '-',
        nf: nfNumber,
        lojaDestino: s.client || 'Mercado Destino',
        product: productLabel,
        items: s.items || [],
        pesoNF: itemPeso,
        cxs: itemCaixas,
        precoKg: itemPrecoKg,
        valorNF: itemValorNF,
        funrural: itemFunrural,
        funruralDetails: {
          previdencia: fiscal.previdencia,
          rat: fiscal.rat,
          senar: fiscal.senar
        },
        liquidoProdutor: itemLiquido,
        repassado: pago,
        saldo: saldo,
        statusRepasse: s.producerPaymentStatus || (pago >= itemLiquido && itemLiquido > 0 ? 'Pago' : (pago > 0 ? 'Parcial' : 'A Pagar')),
        producerProofFile: cleanProof || null,
        rawProducerProofFile: s.producerPaymentProofFile || null,
        paymentMethod: s.producerPaymentMethod || (s.producerPaymentHistory && s.producerPaymentHistory.length > 0 ? s.producerPaymentHistory[s.producerPaymentHistory.length - 1].paymentMethod : 'PIX'),
        producerPaymentHistory: s.producerPaymentHistory || [],
        venc: s.dueDate ? s.dueDate.split('-').reverse().join('/') : '-'
      };
    });

    const isFullyPaid = saldoAPagar <= 0.01 && liquidoProdutor > 0;
    const isPartial = repassesPagos > 0 && !isFullyPaid;

    return {
      producer: prodName,
      nfs,
      pedidos,
      pesoNF: roundMoney(pesoNF),
      cxsVendidas: Number(cxs.toFixed(2)),
      valorTotalNF: roundMoney(valorTotalNF),
      funrural: roundMoney(funrural),
      liquidoProdutor: roundMoney(liquidoProdutor),
      repassesPagos: roundMoney(repassesPagos),
      saldoAPagar: roundMoney(saldoAPagar),
      status: isFullyPaid ? 'Quitado' : (isPartial ? 'Parcial' : 'A Pagar'),
      itens
    };
  });

  const totalGeral = {
    produtoresCount: producers.length,
    pedidos: producers.reduce((a, b) => a + b.pedidos, 0),
    nfs: producers.reduce((a, b) => a + b.nfs, 0),
    pesoNF: roundMoney(producers.reduce((a, b) => a + b.pesoNF, 0)),
    cxsVendidas: roundMoney(producers.reduce((a, b) => a + b.cxsVendidas, 0)),
    valorTotalNF: roundMoney(producers.reduce((a, b) => a + b.valorTotalNF, 0)),
    funrural: roundMoney(producers.reduce((a, b) => a + b.funrural, 0)),
    liquidoProdutor: roundMoney(producers.reduce((a, b) => a + b.liquidoProdutor, 0)),
    repassesPagos: roundMoney(producers.reduce((a, b) => a + b.repassesPagos, 0)),
    saldoAPagar: roundMoney(producers.reduce((a, b) => a + b.saldoAPagar, 0))
  };

  return { producers, totalGeral };
}

module.exports = {
  getStoresSummary,
  getProducersSummary,
  triggerN8nReport
};
