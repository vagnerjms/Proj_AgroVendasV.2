const express = require('express');
const router = express.Router();
const { Sale, Purchase } = require('../db');
const { requireAuth } = require('../middlewares/auth');
const { roundMoney, calculateFiscalDeductions } = require('../utils/money');

// Protect all financial endpoints with JWT authentication
router.use(requireAuth);

// GET /api/financial
router.get('/', async (req, res) => {
  try {
    const [sales, purchases] = await Promise.all([
      Sale.find().lean(),
      Purchase.find().lean()
    ]);

    const todayStr = new Date().toISOString().split('T')[0];

    let totalAReceberNF = 0;
    let totalAReceberVP = 0;
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
      const caixas = Number(s.totalVolumes) || (Number(s.totalKg) > 0 ? (Number(s.totalKg) / 29) : 0);
      let cotacao = Number(s.dailyQuote) || 0;
      if (!cotacao && s.notes) {
        const matchCot = s.notes.match(/Cotação:?\s*R\$\s*([\d,.]+)/i);
        if (matchCot) cotacao = parseFloat(matchCot[1].replace(',', '.'));
      }
      if (!cotacao) cotacao = 45.0;

      const valorVP = Number(s.valorTotalVP) > 0 ? roundMoney(s.valorTotalVP) : roundMoney(caixas * cotacao);
      const isAReceber = s.paymentStatus === 'A Receber' || !s.paymentStatus;

      if (isAReceber) {
        totalAReceberNF = roundMoney(totalAReceberNF + valorNF);
        totalAReceberVP = roundMoney(totalAReceberVP + valorVP);
        
        // Verifica se está vencido
        let due = s.dueDate;
        if (!due && s.saleDate) {
          const days = Number(s.paymentTermDays) || 30;
          const d = new Date(s.saleDate + 'T12:00:00');
          d.setDate(d.getDate() + days);
          due = d.toISOString().split('T')[0];
        }
        if (due && due < todayStr) {
          totalVencido = roundMoney(totalVencido + valorNF);
        }
      } else if (s.paymentStatus === 'Recebido') {
        totalRecebido = roundMoney(totalRecebido + valorNF);
      }

      // Impostos e deduções do FUNRURAL
      const fiscal = calculateFiscalDeductions(valorNF);
      totalFunrural = roundMoney(totalFunrural + fiscal.funruralTotal);
      totalPrevidencia = roundMoney(totalPrevidencia + fiscal.previdencia);
      totalRat = roundMoney(totalRat + fiscal.rat);
      totalSenar = roundMoney(totalSenar + fiscal.senar);

      // Comissões
      const taxa = Number(s.feeValue) || 3.0;
      const comissao = roundMoney(valorVP * (taxa / 100));
      totalComissao = roundMoney(totalComissao + comissao);
      totalLiquidoProdutor = roundMoney(totalLiquidoProdutor + (valorVP - comissao));
    }

    // Contas a pagar (Compras de produtores)
    let totalAPagar = 0;
    for (const p of purchases) {
      if (p.paymentStatus === 'A Pagar' || !p.paymentStatus) {
        totalAPagar = roundMoney(totalAPagar + (Number(p.total) || 0));
      }
    }

    res.json({
      totalAReceber: totalAReceberNF, // R$ 1.054.406,28
      totalAReceberNF,
      totalAReceberVP,               // R$ 1.186.046,72
      totalAPagar,
      totalRecebido,
      vencidos: totalVencido,
      totalFunrural,                 // R$ 17.186,82
      totalPrevidencia,
      totalRat,
      totalSenar,
      totalComissao,
      totalLiquidoProdutor,
      salesCount: sales.length
    });
  } catch (err) {
    console.error('Erro ao calcular fluxo financeiro:', err);
    res.status(500).json({ error: 'Erro ao obter dados financeiros' });
  }
});

module.exports = router;
