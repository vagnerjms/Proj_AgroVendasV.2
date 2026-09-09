const express = require('express');
const router = express.Router();
const { Sale, WeighingSlip, Purchase, FinancialSummary } = require('../db');
const { requireAuth } = require('../middlewares/auth');

// Protect all dashboard endpoints with JWT authentication
router.use(requireAuth);

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
    const { roundMoney, calculateCommission } = require('../utils/money');

    const getSaleCommercialValue = (s) => {
      let valorVP = Number(s.valorTotalVP) > 0 ? roundMoney(s.valorTotalVP) : roundMoney(s.totalOperation);
      if (valorVP <= 0 && Number(s.totalVolumes) > 0 && Number(s.dailyQuote) > 0) {
        valorVP = roundMoney(Number(s.totalVolumes) * Number(s.dailyQuote));
      }
      return valorVP;
    };

    const totalSalesCount = filteredSales.length;
    // Total Comercial (Total VP) 100% harmonizado com a rota de Relatórios e Financeiro
    const totalSold = roundMoney(filteredSales.reduce((acc, s) => acc + getSaleCommercialValue(s), 0));
    
    // Lucratividade Bruta / Comissão sobre a base comercial
    const totalCommission = roundMoney(filteredSales.reduce((acc, s) => {
      const valorVP = getSaleCommercialValue(s);
      const taxa = Number(s.feeValue) || 3.0;
      return acc + calculateCommission(valorVP, taxa).comissao;
    }, 0));

    const grossProfit = totalCommission;

    const totalAReceber = roundMoney(allSales
      .filter(s => s.paymentStatus !== 'Recebido')
      .reduce((acc, s) => acc + getSaleCommercialValue(s), 0));

    const allPurchases = await Purchase.find();
    const totalAPagar = roundMoney(allPurchases
      .filter(p => p.paymentStatus !== 'Pago')
      .reduce((acc, p) => acc + (Number(p.total) || 0), 0));

    const pendingDivergences = await WeighingSlip.countDocuments({ status: 'Divergente' });
    const pendingNfs = allSales.filter(s => !s.nfFile || typeof s.nfFile !== 'string' || s.nfFile.trim() === '').length;

    // Cálculo em tempo real dos títulos vencidos (harmonizado com financial.routes.js)
    const todayStr = new Date().toISOString().split('T')[0];
    let totalVencido = 0;
    for (const s of allSales) {
      if (s.paymentStatus !== 'Recebido') {
        let due = s.dueDate;
        if (!due && s.saleDate) {
          const days = Number(s.paymentTermDays) || 30;
          const d = new Date(s.saleDate + 'T12:00:00Z');
          if (!isNaN(d.getTime())) {
            d.setUTCDate(d.getUTCDate() + days);
            due = d.toISOString().split('T')[0];
          }
        }
        if (due && due < todayStr) {
          totalVencido = roundMoney(totalVencido + getSaleCommercialValue(s));
        }
      }
    }
    const vencidos = totalVencido;

    const lastTransactions = allSales.slice(0, 5).map(s => {
      const parts = (s.saleDate || '').split('-');
      const formattedDate = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : (s.saleDate || '-');
      return {
        id: s.id,
        date: formattedDate,
        rawDate: s.saleDate,
        module: 'Venda',
        type: s.operationType,
        client: s.client,
        value: getSaleCommercialValue(s)
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
      const dayTotal = daySales.reduce((acc, s) => acc + getSaleCommercialValue(s), 0);
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
