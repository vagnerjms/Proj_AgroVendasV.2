const { Sale, Purchase } = require('../db');
const { roundMoney, calculateFiscalDeductions, calculateCommission } = require('../utils/money');

/**
 * Serviço de Consolidação Financeira e Fiscal — AgroVenda V2
 * Centraliza cálculos de contas a receber (VP e NF), retenções de FUNRURAL,
 * liquidação (integral/parcial) e comissões de intermediação.
 */
async function getFinancialSummary(queryParams = {}) {
  const { startDate, endDate, client, status } = queryParams;
  const query = {};

  if (startDate || endDate) {
    query.saleDate = {};
    if (startDate) query.saleDate.$gte = startDate;
    if (endDate) query.saleDate.$lte = endDate;
  }
  if (client) query.client = new RegExp(client, 'i');
  if (status) query.paymentStatus = status;

  const [sales, purchases] = await Promise.all([
    Sale.find(query).lean(),
    Purchase ? Purchase.find().lean() : []
  ]);

  const todayStr = new Date().toISOString().split('T')[0];

  let totalAReceberNF = 0;
  let totalAReceberVP = 0;
  let totalALiquidar = 0;
  let totalRecebido = 0;
  let totalVencido = 0;
  let totalFunrural = 0;
  let totalPrevidencia = 0;
  let totalRat = 0;
  let totalSenar = 0;
  let totalComissao = 0;
  let totalLiquidoProdutor = 0;

  for (const s of sales) {
    const valorNF = roundMoney(s.totalOperation);
    
    // Respeita estritamente o VP registrado; se não houver negociação particular, a base comercial é o próprio valor da NF
    let valorVP = Number(s.valorTotalVP) > 0 ? roundMoney(s.valorTotalVP) : valorNF;
    if (valorVP <= 0 && Number(s.totalVolumes) > 0 && Number(s.dailyQuote) > 0) {
      valorVP = roundMoney(Number(s.totalVolumes) * Number(s.dailyQuote));
    }

    // Apuração exata de FUNRURAL sobre o valor da Nota Fiscal (NF)
    const fiscal = calculateFiscalDeductions(valorNF > 0 ? valorNF : valorVP);
    const valorLiquidar = roundMoney(Math.max(0, valorVP - fiscal.funruralTotal));

    const paidClient = roundMoney(Number(s.paidAmount) || 0);
    const isRecebido = s.paymentStatus === 'Recebido' || (valorLiquidar > 0 && paidClient >= valorLiquidar - 0.05);

    if (isRecebido) {
      const recebidoEfetivo = paidClient > 0 ? paidClient : valorLiquidar;
      totalRecebido = roundMoney(totalRecebido + recebidoEfetivo);
    } else {
      const saldoPendente = roundMoney(Math.max(0, valorLiquidar - paidClient));
      if (paidClient > 0) {
        totalRecebido = roundMoney(totalRecebido + paidClient);
      }
      totalALiquidar = roundMoney(totalALiquidar + saldoPendente);
      totalAReceberVP = roundMoney(totalAReceberVP + (valorVP > 0 && valorLiquidar > 0 ? roundMoney(valorVP * (saldoPendente / valorLiquidar)) : saldoPendente));
      totalAReceberNF = roundMoney(totalAReceberNF + (valorNF > 0 && valorLiquidar > 0 ? roundMoney(valorNF * (saldoPendente / valorLiquidar)) : saldoPendente));
      
      // Verificação de vencimento baseada no saldo real pendente
      let due = s.dueDate;
      if (!due && s.saleDate) {
        const days = Number(s.paymentTermDays) || 30;
        const d = new Date(s.saleDate + 'T12:00:00Z');
        if (!isNaN(d.getTime())) {
          d.setUTCDate(d.getUTCDate() + days);
          due = d.toISOString().split('T')[0];
        }
      }
      if (due && due < todayStr && saldoPendente > 0) {
        totalVencido = roundMoney(totalVencido + saldoPendente);
      }
    }

    totalFunrural = roundMoney(totalFunrural + fiscal.funruralTotal);
    totalPrevidencia = roundMoney(totalPrevidencia + fiscal.previdencia);
    totalRat = roundMoney(totalRat + fiscal.rat);
    totalSenar = roundMoney(totalSenar + fiscal.senar);

    // Comissões (prioriza valor persistido ou calcula sobre a base comercial)
    let comissao = Number(s.totalCommission);
    if (isNaN(comissao) || comissao <= 0) {
      const fee = Number(s.feeValue) || 3.0;
      comissao = calculateCommission(valorVP, fee).comissao;
    }
    totalComissao = roundMoney(totalComissao + comissao);
    // Repasse integral da NF ao produtor rural (sem retenção de corretagem na base do produtor)
    totalLiquidoProdutor = roundMoney(totalLiquidoProdutor + (valorNF > 0 ? valorNF : valorVP));
  }

  // Contas a pagar (Repasses devidos a Produtores Rurais + Compras de Insumos/Embalagens)
  let totalAPagarProdutores = 0;
  let totalProdutorPago = 0;
  for (const s of sales) {
    const totalNF = roundMoney(s.totalOperation || 0);
    const paid = Number(s.producerPaidAmount) || 0;
    const isPaid = s.producerPaymentStatus === 'Pago' || (totalNF > 0 && paid >= totalNF - 0.01);
    if (isPaid) {
      totalProdutorPago = roundMoney(totalProdutorPago + (paid > 0 ? paid : totalNF));
    } else {
      totalProdutorPago = roundMoney(totalProdutorPago + paid);
      totalAPagarProdutores = roundMoney(totalAPagarProdutores + Math.max(0, totalNF - paid));
    }
  }

  let totalAPagarInsumos = 0;
  for (const p of purchases) {
    if (p.paymentStatus === 'A Pagar' || !p.paymentStatus) {
      totalAPagarInsumos = roundMoney(totalAPagarInsumos + (Number(p.total) || 0));
    }
  }

  const totalAPagar = roundMoney(totalAPagarProdutores + totalAPagarInsumos);

  const liquidoNF = roundMoney(totalAReceberNF - totalFunrural);

  return {
    totalAReceber: totalALiquidar,
    totalALiquidar,
    totalAReceberVP,
    totalComercialVP: totalAReceberVP,
    totalAReceberNF,
    totalFaturadoNF: totalAReceberNF,
    liquidoNF,
    totalAPagar,
    totalAPagarProdutores,
    totalProdutorPago,
    totalRecebido,
    vencidos: totalVencido,
    totalFunrural,
    totalPrevidencia,
    totalRat,
    totalSenar,
    totalComissao,
    totalLiquidoProdutor,
    salesCount: sales.length
  };
}

module.exports = {
  getFinancialSummary
};
