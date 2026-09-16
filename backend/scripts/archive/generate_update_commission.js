const updateScript = `
const { connectDB, Sale } = require('./db');

async function updateCommission() {
  await connectDB();

  const updates = [
    { id: 'VP-09718', total: 20553.00, feeValue: 3.0, feeType: 'Porcentagem (%)', totalCommission: 616.59 },
    { id: 'VP-09720', total: 24796.90, feeValue: 3.0, feeType: 'Porcentagem (%)', totalCommission: 743.91 },
    { id: 'VP-09728', total: 31657.50, feeValue: 3.0, feeType: 'Porcentagem (%)', totalCommission: 949.73 },
    { id: 'VP-09732', total: 33902.40, feeValue: 3.0, feeType: 'Porcentagem (%)', totalCommission: 1017.07 },
    { id: 'VEN-2026-001', total: 20553.00, feeValue: 3.0, feeType: 'Porcentagem (%)', totalCommission: 616.59 },
    { id: 'VEN-2026-002', total: 24796.90, feeValue: 3.0, feeType: 'Porcentagem (%)', totalCommission: 743.91 },
    { id: 'VEN-2026-003', total: 31657.50, feeValue: 3.0, feeType: 'Porcentagem (%)', totalCommission: 949.73 },
    { id: 'VEN-2026-004', total: 33902.40, feeValue: 3.0, feeType: 'Porcentagem (%)', totalCommission: 1017.07 }
  ];

  for (const u of updates) {
    await Sale.updateMany(
      { $or: [{ id: u.id }, { notes: new RegExp(u.id, 'i') }, { client: 'BADIN FAVILLA HORTIFRUTI LTDA', totalOperation: u.total }] },
      { 
        $set: { 
          feeType: 'Porcentagem (%)', 
          feeValue: 3.0, 
          totalCommission: u.totalCommission,
          operationType: 'Intermediação (Corretagem / Comissão)'
        } 
      }
    );
  }

  console.log('✅ Comissão de 3% (Corretagem) aplicada com sucesso em todas as vendas da Badin Favilla!');
  process.exit(0);
}

updateCommission().catch(console.error);
`;

require('fs').writeFileSync(__dirname + '/apply_commission.js', updateScript);
