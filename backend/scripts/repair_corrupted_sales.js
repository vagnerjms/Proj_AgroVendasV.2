const { connectDB, Sale, WeighingSlip } = require('../db');
const { calculateFiscalDeductions, calculateCommission } = require('../utils/money');

function roundMoney(v) {
  return Math.round((Number(v) || 0) * 100) / 100;
}

async function repairCorruptedSales() {
  console.log('🔄 Conectando ao MongoDB para auditoria e reparo de vendas...');
  await connectDB();

  const sales = await Sale.find({});
  console.log(`📊 Total de vendas encontradas no banco: ${sales.length}`);

  let fixedCount = 0;

  for (const sale of sales) {
    let needsUpdate = false;
    let newItems = [];
    let calculatedTotalNF = 0;
    let calculatedTotalVP = 0;

    // Verificar itens da venda
    if (sale.items && sale.items.length > 0) {
      newItems = sale.items.map(it => {
        let kg = Number(it.kg) || 0;
        let pKg = Number(it.pricePerKg) || 0;
        let total = Number(it.total) || 0;
        let bw = Number(it.boxWeightKg) || 29;
        let q = Number(it.dailyQuote) || 0;
        let vp = Number(it.valorTotalVP) || 0;

        // Se o total do item for desproporcional (> 500.000 ou 100x/1000x o valor esperado de kg * pKg)
        const expectedTotal = kg * pKg;
        if (expectedTotal > 0 && total > 500000 && (total / expectedTotal >= 90)) {
          console.log(`⚠️ Venda ${sale.id} item ${it.product}: corrigindo total de R$ ${total} para R$ ${expectedTotal}`);
          total = expectedTotal;
          needsUpdate = true;
        } else if (expectedTotal > 0 && total === 0) {
          total = expectedTotal;
        }

        // Se a cotação gerou VP distorcido
        const isGr = (it.unit && it.unit.includes('Granel')) || (it.product && it.product.toLowerCase().includes('cebola')) || bw === 1;
        const vol = isGr ? kg : (bw > 0 ? (kg / bw) : 0);
        const isQKg = (q > 0 && q <= 10.0) || isGr;
        const expectedVP = q > 0 ? (isQKg ? (kg * q) : (vol * q)) : total;

        if (vp > 500000 && expectedVP > 0 && (vp / expectedVP >= 90)) {
          console.log(`⚠️ Venda ${sale.id} item ${it.product}: corrigindo VP de R$ ${vp} para R$ ${expectedVP}`);
          vp = expectedVP;
          needsUpdate = true;
        } else if (expectedVP > 0 && (!vp || vp === 0)) {
          vp = expectedVP;
        }

        calculatedTotalNF += total;
        calculatedTotalVP += (vp > 0 ? vp : total);

        return {
          ...(it.toObject ? it.toObject() : it),
          kg: roundMoney(kg),
          pricePerKg: pKg,
          total: roundMoney(total),
          valorTotalVP: roundMoney(vp)
        };
      });
    }

    // Verificar se o totalOperation está desproporcional
    let currentTotalOp = Number(sale.totalOperation) || 0;
    let finalTotalOp = currentTotalOp;

    if (calculatedTotalNF > 0 && (currentTotalOp > 500000 || currentTotalOp === 0 || Math.abs(currentTotalOp - calculatedTotalNF) > 100000)) {
      console.log(`🚨 Venda ${sale.id}: corrigindo totalOperation de R$ ${currentTotalOp} para R$ ${calculatedTotalNF}`);
      finalTotalOp = calculatedTotalNF;
      needsUpdate = true;
    } else if (currentTotalOp > 500000) {
      console.log(`🚨 Venda ${sale.id}: totalOperation R$ ${currentTotalOp} excessivo, normalizando...`);
      finalTotalOp = currentTotalOp / 1000;
      needsUpdate = true;
    }

    let finalValorVP = Number(sale.valorTotalVP) || 0;
    if (calculatedTotalVP > 0 && (finalValorVP > 500000 || finalValorVP === 0 || Math.abs(finalValorVP - calculatedTotalVP) > 100000)) {
      finalValorVP = calculatedTotalVP;
      needsUpdate = true;
    }

    if (needsUpdate) {
      const fiscal = calculateFiscalDeductions(finalTotalOp);
      const commission = calculateCommission(finalValorVP > 0 ? finalValorVP : finalTotalOp, sale.feeValue || 3);

      const updateData = {
        totalOperation: roundMoney(finalTotalOp),
        valorTotalVP: roundMoney(finalValorVP),
        funruralTotal: fiscal.funruralTotal,
        previdenciaSocial: fiscal.previdencia,
        rat: fiscal.rat,
        senar: fiscal.senar,
        totalCommission: commission.comissao
      };

      if (newItems.length > 0) {
        updateData.items = newItems;
      }

      if (sale.paidAmount && (sale.paidAmount > 500000 || sale.paymentStatus === 'Recebido')) {
        updateData.paidAmount = roundMoney(finalTotalOp);
      }

      await Sale.updateOne({ _id: sale._id }, { $set: updateData });
      console.log(`✅ Venda ${sale.id} reparada com sucesso! NF: R$ ${finalTotalOp} | VP: R$ ${finalValorVP} | FUNRURAL: R$ ${fiscal.funruralTotal}`);
      fixedCount++;
    }
  }

  console.log(`\n🎉 Processamento concluído! Total de vendas corrigidas: ${fixedCount}`);
  process.exit(0);
}

if (require.main === module) {
  repairCorruptedSales().catch(err => {
    console.error('Erro ao executar reparo de vendas:', err);
    process.exit(1);
  });
}

module.exports = { repairCorruptedSales };
