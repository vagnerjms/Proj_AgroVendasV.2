const express = require('express');
const router = express.Router();
const { Sale } = require('../db');
const { requireAuth } = require('../middlewares/auth');

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
        let itemValorNF = Number(s.totalOperation) || 0;
        let itemFunrural = Number(s.funruralTotal) || 0;
        let itemPrecoKg = itemPesoNF > 0 ? (itemValorNF / itemPesoNF) : 0;
        let itemLiquido = itemValorNF - itemFunrural;

        if (isFaturado || s.nfFile) {
          nfs++;
        } else {
          pedidosSemNF++;
        }

        pesoNF += itemPesoNF;
        valorTotalNF += itemValorNF;
        funrural += itemFunrural;
        pesoColheita += itemPesoNF;
        cxsVendidas += s.totalVolumes || 0;

        const caixas = s.totalVolumes || (itemPesoNF > 0 ? (itemPesoNF / 29) : 0);
        let cotacao = Number(s.dailyQuote) || 0;
        if (!cotacao && s.notes) {
          const matchCot = s.notes.match(/Cotação:?\s*R\$\s*([\d,.]+)/i);
          if (matchCot) cotacao = parseFloat(matchCot[1].replace(',', '.'));
        }
        if (!cotacao) cotacao = 45.0;

        const valorVP = Number(s.valorTotalVP) > 0 ? Number(s.valorTotalVP) : (caixas * cotacao);
        totalVendaAReceber += valorVP;

        const nfNumber = s.nfFile ? s.nfFile.replace('NF-', '').replace('.pdf', '') : (s.nfeKey ? s.nfeKey.slice(-8) : 'Pendente');

        const taxaComissao = Number(s.feeValue) || 3.0;
        const comissao = valorVP * (taxaComissao / 100);
        const liquidoProdutor = valorVP - comissao;

        return {
          vp: s.id,
          dataVP: s.saleDate ? s.saleDate.split('-').reverse().join('/') : '-',
          nf: nfNumber,
          dataNF: s.saleDate ? s.saleDate.split('-').reverse().join('/') : '-',
          product: s.items?.[0]?.product || 'Cenoura (Caixa 29kg)',
          unit: s.items?.[0]?.unit || 'Caixas (29kg)',
          pesoNF: itemPesoNF,
          pesoColheita: itemPesoNF,
          cxs: s.totalVolumes,
          precoKg: itemPrecoKg,
          valorNF: itemValorNF,
          funrural: itemFunrural,
          cotacao: cotacao,
          valorVP: valorVP,
          liquido: itemLiquido,
          taxaComissao: taxaComissao,
          comissao: comissao,
          liquidoProdutor: liquidoProdutor,
          venc: s.notes?.match(/Vencimento:\s*([^\s|]+)/i)?.[1] || 'Em aberto',
          status: s.status
        };
      });

      const totalComissaoLoja = itens.reduce((a, b) => a + b.comissao, 0);
      const totalLiquidoProdutorLoja = itens.reduce((a, b) => a + b.liquidoProdutor, 0);

      return {
        loja: clientName,
        nfs,
        pedidosVenda,
        pedidosSemNF,
        pesoNF,
        pesoColheita,
        cxsVendidas,
        valorTotalNF,
        funrural,
        totalVendaAReceber,
        liquidoNF: valorTotalNF - funrural,
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
      valorTotalNF: stores.reduce((a, b) => a + b.valorTotalNF, 0),
      funrural: stores.reduce((a, b) => a + b.funrural, 0),
      totalVendaAReceber: stores.reduce((a, b) => a + b.totalVendaAReceber, 0),
      liquidoNF: stores.reduce((a, b) => a + b.liquidoNF, 0),
      totalComissao: stores.reduce((a, b) => a + b.totalComissao, 0),
      totalLiquidoProdutor: stores.reduce((a, b) => a + b.totalLiquidoProdutor, 0)
    };

    res.json({ stores, totalGeral });
  } catch (err) {
    console.error('Erro ao gerar relatório consolidado:', err);
    res.status(500).json({ error: 'Erro ao processar relatório' });
  }
});

module.exports = router;
