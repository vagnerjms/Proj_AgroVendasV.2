const mongoose = require('mongoose');

async function migrate() {
  await mongoose.connect('mongodb://agrovenda-v2-mongodb:27017/agrovenda');
  const Sale = mongoose.model('Sale', new mongoose.Schema({ id: String, saleDate: String, client: String }, { strict: false }));
  
  const sales = await Sale.find();
  sales.sort((a, b) => {
    const numA = parseInt(a.id.replace(/\D/g, '')) || 0;
    const numB = parseInt(b.id.replace(/\D/g, '')) || 0;
    return numA - numB;
  });

  console.log(`Migrando ${sales.length} vendas para o padrão VP001 em diante:`);
  for (let i = 0; i < sales.length; i++) {
    const s = sales[i];
    const newCode = `VP${String(i + 1).padStart(3, '0')}`;
    console.log(`${s.id} -> ${newCode} (${s.client})`);
    await Sale.updateOne({ _id: s._id }, { $set: { id: newCode } });
  }

  console.log('Migração concluída com sucesso!');
  process.exit(0);
}

migrate().catch(err => {
  console.error(err);
  process.exit(1);
});
