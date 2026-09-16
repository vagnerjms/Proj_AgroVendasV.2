const { connectDB, Purchase } = require('./db');

async function removeSimulatedPurchases() {
  await connectDB();

  const del = await Purchase.deleteMany({});
  console.log(`Compras/Contas a pagar excluídas: ${del.deletedCount}`);

  console.log('✅ Todas as contas a pagar simuladas foram removidas com sucesso!');
  process.exit(0);
}

removeSimulatedPurchases().catch(console.error);
