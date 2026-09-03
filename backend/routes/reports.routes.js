const express = require('express');
const router = express.Router();
const { Sale } = require('../db');
const { requireAuth } = require('../middlewares/auth');
const { roundMoney, calculateFiscalDeductions, calculateCommission } = require('../utils/money');

// Protect all reports endpoints with JWT authentication
router.use(requireAuth);

// GET /api/reports/stores-summary
router.get('/stores-summary', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
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

    const allSales = await Sale.find(query).sort({ saleDate: 1 }).lean();

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
        let itemLiquido = fiscal.liquidoNF;

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

        totalVendaAReceber = roundMoney(totalVendaAReceber + valorVP);

        const nfNumber = s.nfFile ? s.nfFile.replace('NF-', '').replace('.pdf', '') : (s.nfeKey ? s.nfeKey.slice(-8) : 'Pendente');
        const comm = calculateCommission(valorVP, s.feeValue);

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

        return {
          vp: s.id,
          dataVP: s.saleDate ? s.saleDate.split('-').reverse().join('/') : '-',
          nf: nfNumber,
          dataNF: s.saleDate ? s.saleDate.split('-').reverse().join('/') : '-',
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
          liquido: itemLiquido,
          taxaComissao: comm.taxaPercentual,
          comissao: comm.comissao,
          liquidoProdutor: comm.liquidoProdutor,
          venc: s.dueDate ? s.dueDate.split('-').reverse().join('/') : (s.notes?.match(/Vencimento:\s*([^\s|]+)/i)?.[1] || 'Em aberto'),
          status: s.status
        };
      });

      const totalComissaoLoja = roundMoney(itens.reduce((a, b) => a + b.comissao, 0));
      const totalLiquidoProdutorLoja = roundMoney(itens.reduce((a, b) => a + b.liquidoProdutor, 0));

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
      totalLiquidoProdutor: roundMoney(stores.reduce((a, b) => a + b.totalLiquidoProdutor, 0))
    };

    res.json({ stores, totalGeral });
  } catch (err) {
    console.error('Erro ao gerar relatório consolidado:', err);
    res.status(500).json({ error: 'Erro ao processar relatório' });
  }
});

// POST /api/reports/trigger-n8n - Dispara webhook do n8n para gerar e salvar no Google Drive
router.post('/trigger-n8n', requireAuth, async (req, res) => {
  try {
    const { webhookUrl, startDate, endDate, selectedLoja, activeTab, excelHtml, filteredStores, currentTotal } = req.body;
    if (!webhookUrl) {
      return res.status(400).json({ error: 'URL do Webhook do n8n não informada' });
    }

    const safeLoja = (!selectedLoja || selectedLoja === 'ALL') ? 'Geral' : selectedLoja.replace(/[^a-zA-Z0-9]/g, '_');
    const today = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    const startStr = startDate || 'Inicio';
    const endStr = endDate || todayStr;
    const fileName = `Relatorio_AgroVenda_${safeLoja}_${startStr}_a_${endStr}.xls`;
    const folderName = `Relatórios AgroVenda (${todayStr.slice(0, 7)})`;

    let htmlContent = excelHtml;

    // Se o HTML não veio do front, gera a partir da query filtrada no banco
    let storesSummary = filteredStores;
    let totalSummary = currentTotal;

    if (!htmlContent) {
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

      if (selectedLoja && selectedLoja !== 'ALL') {
        query.client = selectedLoja;
      }

      const allSales = await Sale.find(query).sort({ saleDate: 1 }).lean();
      const clientGroups = {};
      for (const s of allSales) {
        if (!clientGroups[s.client]) clientGroups[s.client] = [];
        clientGroups[s.client].push(s);
      }

      storesSummary = Object.keys(clientGroups).map(clientName => {
        const sales = clientGroups[clientName];
        let nfs = 0, pedidosVenda = sales.length, pedidosSemNF = 0, pesoNF = 0, valorTotalNF = 0, funrural = 0, totalVendaAReceber = 0;
        sales.forEach(s => {
          if (s.status === 'Faturado' || s.nfFile) nfs++; else pedidosSemNF++;
          const peso = Number(s.totalKg) || 0;
          const valor = roundMoney(s.totalOperation);
          const fiscal = calculateFiscalDeductions(valor);
          pesoNF += peso;
          valorTotalNF = roundMoney(valorTotalNF + valor);
          funrural = roundMoney(funrural + fiscal.funruralTotal);
          const caixas = Number(s.totalVolumes) || (peso > 0 ? (peso / 29) : 0);
          let cotacao = Number(s.dailyQuote) || 45.0;
          const valorVP = Number(s.valorTotalVP) > 0 ? roundMoney(s.valorTotalVP) : roundMoney(caixas * cotacao);
          totalVendaAReceber = roundMoney(totalVendaAReceber + valorVP);
        });
        return {
          loja: clientName,
          nfs,
          pedidosVenda,
          pedidosSemNF,
          pesoNF,
          valorTotalNF: roundMoney(valorTotalNF),
          funrural: roundMoney(funrural),
          totalVendaAReceber: roundMoney(totalVendaAReceber),
          liquidoNF: roundMoney(valorTotalNF - funrural)
        };
      });

      totalSummary = {
        nfs: storesSummary.reduce((a, b) => a + b.nfs, 0),
        pedidosVenda: storesSummary.reduce((a, b) => a + b.pedidosVenda, 0),
        pesoNF: storesSummary.reduce((a, b) => a + b.pesoNF, 0),
        valorTotalNF: roundMoney(storesSummary.reduce((a, b) => a + b.valorTotalNF, 0)),
        funrural: roundMoney(storesSummary.reduce((a, b) => a + b.funrural, 0)),
        totalVendaAReceber: roundMoney(storesSummary.reduce((a, b) => a + b.totalVendaAReceber, 0)),
        liquidoNF: roundMoney(storesSummary.reduce((a, b) => a + b.liquidoNF, 0))
      };

      htmlContent = `<html><head><meta charset="utf-8"></head><body><h2>Relatório AgroVenda (${safeLoja}) - ${startStr} a ${endStr}</h2></body></html>`;
    }

    const fileBuffer = Buffer.from(htmlContent, 'utf-8');
    const contentBase64 = fileBuffer.toString('base64');

    const payload = {
      event: 'report.generated',
      triggeredAt: new Date().toISOString(),
      user: req.user ? req.user.name : 'Administrador',
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
        activeTab: activeTab || 'geral'
      },
      stores: storesSummary,
      totalGeral: totalSummary
    };

    const fetchModule = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
    const fetchFunc = typeof fetch === 'function' ? fetch : fetchModule;

    const response = await fetchFunc(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const resultText = await response.text();
    let resultJson;
    try { resultJson = JSON.parse(resultText); } catch(e) { resultJson = { raw: resultText }; }

    res.json({
      success: response.ok,
      status: response.status,
      message: response.ok ? 'Relatório filtrado enviado ao n8n com sucesso!' : 'Falha na resposta do n8n',
      response: resultJson
    });
  } catch (err) {
    console.error('Erro ao disparar webhook de relatório no n8n:', err);
    res.status(500).json({ error: `Erro ao conectar com o n8n: ${err.message}` });
  }
});

module.exports = router;
