const express = require('express');
const router = express.Router();
const { Sale, WeighingSlip, Purchase, FinancialSummary } = require('../db');

// GET /api/dashboard
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = {};

    if (startDate && endDate) {
      query.saleDate = { $gte: startDate, $lte: endDate };
    }

    const filteredSales = await Sale.find(query);
    const allSales = await Sale.find().sort({ saleDate: -1 });
    let finSummary = await FinancialSummary.findOne();
    if (!finSummary) {
      finSummary = { totalAReceber: 0.00, totalAPagar: 0.00, vencidos: 0.00, notasPendentes: 0, divergentes: 0 };
    }

    const pendingDivergences = await WeighingSlip.countDocuments({ status: 'Divergente' });
    const pendingNfs = allSales.filter(s => s.nfPending || !s.nfFile).length;

    const totalSalesCount = filteredSales.length;
    const totalSold = filteredSales.reduce((acc, s) => acc + (Number(s.totalOperation) || 0), 0);
    
    // Cálculo em tempo real 100% harmonizado com a rota de Relatórios
    const totalCommission = filteredSales.reduce((acc, s) => {
      const caixas = s.totalVolumes || (s.totalKg > 0 ? (s.totalKg / 29) : 0);
      let cotacao = 45.0;
      if (s.notes) {
        const matchCot = s.notes.match(/Cotação:?\s*R\$\s*([\d,.]+)/i);
        if (matchCot) cotacao = parseFloat(matchCot[1].replace(',', '.'));
      }
      const valorVP = caixas * cotacao;
      const taxa = Number(s.feeValue) || 3.0;
      const comissao = valorVP > 0 ? (valorVP * (taxa / 100)) : (Number(s.totalCommission) || 0);
      return acc + comissao;
    }, 0);

    const grossProfit = totalCommission;

    const totalAReceber = allSales
      .filter(s => s.paymentStatus !== 'Recebido')
      .reduce((acc, s) => acc + (Number(s.totalOperation) || 0), 0);

    const allPurchases = await Purchase.find();
    const totalAPagar = allPurchases
      .filter(p => p.paymentStatus !== 'Pago')
      .reduce((acc, p) => acc + (Number(p.total) || 0), 0);

    const vencidos = finSummary.vencidos || 0.00;

    const lastTransactions = allSales.slice(0, 5).map(s => {
      const parts = s.saleDate.split('-');
      const formattedDate = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : s.saleDate;
      return {
        id: s.id,
        date: formattedDate,
        rawDate: s.saleDate,
        module: 'Venda',
        type: s.operationType,
        client: s.client,
        value: Number(s.totalOperation) || 0
      };
    });

    const performanceDays = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      
      const daySales = allSales.filter(s => s.saleDate === dateStr);
      const dayTotal = daySales.reduce((acc, s) => acc + (Number(s.totalOperation) || 0), 0);
      performanceDays.push({
        date: dateStr,
        label: dayLabel,
        total: dayTotal,
        count: daySales.length
      });
    }

    res.json({
      period: { startDate: startDate || '', endDate: endDate || '' },
      kpis: {
        salesCount: totalSalesCount,
        totalSold: totalSold,
        totalSoldGrowth: '+0%',
        totalAReceber: totalAReceber,
        totalAPagar: totalAPagar,
        grossProfit: grossProfit,
        targetReached: true
      },
      alerts: {
        vencidos: vencidos,
        notasPendentes: pendingNfs,
        divergentes: pendingDivergences
      },
      lastTransactions,
      performanceDays
    });
  } catch (err) {
    console.error('Erro no dashboard:', err);
    res.status(500).json({ error: 'Erro interno ao processar métricas' });
  }
});

module.exports = router;
