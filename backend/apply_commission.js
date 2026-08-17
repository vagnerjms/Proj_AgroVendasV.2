const { connectDB, Sale } = require('./db');

async function updateCommission() {
  await connectDB();

  const updates = [
    { total: 20553.00, feeValue: 3.0, feeType: 'Porcentagem (%)', totalCommission: 616.59 },
    { total: 24796.90, feeValue: 3.0, feeType: 'Porcentagem (%)', totalCommission: 743.91 },
    { total: 31657.50, feeValue: 3.0, feeType: 'Porcentagem (%)', totalCommission: 949.73 },
    { total: 33902.40, feeValue: 3.0, feeType: 'Porcentagem (%)', totalCommission: 1017.07 }
  ];

  for (const u of updates) {
    const res = await Sale.updateMany(
      { client: 'BADIN FAVILLA HORTIFRUTI LTDA', totalOperation: u.total },
      { 
        $set: { 
          feeType: 'Porcentagem (%)', 
          feeValue: 3.0, 
          totalCommission: u.totalCommission,
          operationType: 'Intermediação (Corretagem / Comissão)'
        } 
      }
    );
    console.log(`Atualizadas vendas de R$ ${u.total}:`, res.modifiedCount);
  }

  console.log('✅ Comissão de 3% (Corretagem) aplicada com sucesso em todas as vendas!');
  process.exit(0);
}

updateCommission().catch(console.error);
