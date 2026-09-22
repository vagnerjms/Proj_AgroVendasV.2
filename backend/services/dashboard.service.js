const { Sale, WeighingSlip, Purchase } = require('../db');
const { roundMoney, calculateCommission, calculateFiscalDeductions } = require('../utils/money');

const getSaleCommercialValue = (s) => {
  let valorVP = Number(s.valorTotalVP) > 0 ? roundMoney(s.valorTotalVP) : roundMoney(s.totalOperation);
  if (valorVP <= 0 && Number(s.totalVolumes) > 0 && Number(s.dailyQuote) > 0) {
    valorVP = roundMoney(Number(s.totalVolumes) * Number(s.dailyQuote));
  }
  return valorVP;
};

const getSaleLiquidationValue = (s) => {
  const valorVP = getSaleCommercialValue(s);
  const valorNF = roundMoney(s.totalOperation);
  const fiscal = calculateFiscalDeductions(valorNF > 0 ? valorNF : valorVP);
  return roundMoney(Math.max(0, valorVP - fiscal.funruralTotal));
};

const getSalePendingReceivable = (s) => {
  if (s.paymentStatus === 'Recebido' || s.producerPaymentStatus === 'Pago' || s.status === 'Concluído') return 0;
  const totalLiq = getSaleLiquidationValue(s);
  const paid = roundMoney(Math.max(Number(s.producerPaidAmount) || 0, Number(s.paidAmount) || 0));
  return roundMoney(Math.max(0, totalLiq - paid));
};

/**
 * Serviço do Dashboard — AgroVenda V2
 * Agrega KPIs comerciais, apura lucratividade por comissão, calcula títulos vencidos,
 * detecta alertas de pendência e gera gráfico de desempenho dos últimos 7 dias.
 */
async function getDashboardData(queryParams = {}) {
  const { startDate, endDate } = queryParams;
  let query = {};

  if (startDate && endDate) {
    query.saleDate = { $gte: startDate, $lte: endDate };
  }

  const [filteredSales, allSales, allPurchases, pendingDivergences] = await Promise.all([
    Sale.find(query).lean(),
    Sale.find().sort({ saleDate: -1 }).lean(),
    Purchase ? Purchase.find().lean() : [],
    WeighingSlip.countDocuments({ status: 'Divergente' })
  ]);

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

  // Total a Receber (Saldo pendente real deduzindo parciais pagas)
  const totalAReceber = roundMoney(allSales
    .reduce((acc, s) => acc + getSalePendingReceivable(s), 0));

  // Total a Pagar Consolidado (Repasses a Produtores Rurais em aberto + Compras de Insumos/Embalagens)
  const totalAPagarProdutores = roundMoney(allSales.reduce((acc, s) => {
    const totalNF = roundMoney(s.totalOperation || 0);
    const paid = Number(s.producerPaidAmount) || 0;
    const isPaid = s.producerPaymentStatus === 'Pago' || (totalNF > 0 && paid >= totalNF - 0.01);
    if (isPaid) return acc;
    return acc + Math.max(0, totalNF - paid);
  }, 0));

  const totalAPagarInsumos = roundMoney(allPurchases
    .filter(p => p.paymentStatus !== 'Pago')
    .reduce((acc, p) => acc + (Number(p.total) || 0), 0));

  const totalAPagar = roundMoney(totalAPagarProdutores + totalAPagarInsumos);

  const pendingNfs = allSales.filter(s => !s.nfFile || typeof s.nfFile !== 'string' || s.nfFile.trim() === '').length;

  // Cálculo em tempo real dos títulos vencidos (harmonizado com financial.service.js)
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
        totalVencido = roundMoney(totalVencido + getSalePendingReceivable(s));
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

  return {
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
  };
}

module.exports = {
  getDashboardData,
  getSaleCommercialValue,
  getSaleLiquidationValue,
  getSalePendingReceivable
};
