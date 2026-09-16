const mongoose = require('mongoose');
const { Sale, Client, Purchase } = require('../db');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongodb:27017/agrovenda';

async function run() {
  console.log('🔄 Conectando ao MongoDB:', MONGO_URI);
  await mongoose.connect(MONGO_URI);
  console.log('✅ Conectado com sucesso!');

  const newOrigin = 'BRUNO PERES ROMEIRO (Campo Alegre de Goiás/GO)';

  // 1. Atualizar Sales
  const sales = await Sale.find({
    $or: [
      { origin: { $regex: /S[ãa]o Gotardo/i } },
      { origin: { $regex: /BRUNO PERES/i } },
      { notes: { $regex: /S[ãa]o Gotardo/i } }
    ]
  });

  console.log(`📋 Encontradas ${sales.length} vendas candidatas.`);

  let updatedSalesCount = 0;
  for (const s of sales) {
    let changed = false;

    if (s.origin && (s.origin.includes('São Gotardo') || s.origin.includes('Sao Gotardo') || s.origin.includes('Gotardo') || s.origin.trim() === 'BRUNO PERES ROMEIRO' || s.origin.includes('Produtor BRUNO PERES ROMEIRO'))) {
      s.origin = newOrigin;
      changed = true;
    }

    if (s.notes && (s.notes.includes('São Gotardo') || s.notes.includes('Sao Gotardo'))) {
      s.notes = s.notes
        .replace(/BRUNO PERES ROMEIRO \(Fazenda São Gotardo\/MG\)/g, newOrigin)
        .replace(/Produtor BRUNO PERES ROMEIRO \(Fazenda São Gotardo\/MG\)/g, newOrigin)
        .replace(/Fazenda São Gotardo\/MG/g, 'Campo Alegre de Goiás/GO')
        .replace(/Fazenda Sao Gotardo\/MG/g, 'Campo Alegre de Goiás/GO');
      changed = true;
    }

    if (changed) {
      await Sale.updateOne({ id: s.id }, { $set: { origin: s.origin, notes: s.notes } });
      updatedSalesCount++;
      console.log(`  ✓ Venda ${s.id} atualizada com nova origem: ${s.origin}`);
    }
  }

  // 2. Atualizar Clients (caso haja cadastro de produtor)
  const clients = await Client.find({
    name: { $regex: /BRUNO PERES/i }
  });

  for (const c of clients) {
    if (c.name.includes('São Gotardo') || c.name.includes('Sao Gotardo')) {
      await Client.updateOne({ id: c.id }, { $set: { name: newOrigin } });
      console.log(`  ✓ Cliente/Produtor ${c.id} atualizado para ${newOrigin}`);
    }
  }

  // 3. Atualizar Purchases se houver
  const purchases = await Purchase.find({
    producer: { $regex: /BRUNO PERES/i }
  });

  for (const p of purchases) {
    if (p.producer.includes('São Gotardo') || p.producer.includes('Sao Gotardo')) {
      await Purchase.updateOne({ id: p.id }, { $set: { producer: newOrigin } });
      console.log(`  ✓ Compra ${p.id} atualizada para ${newOrigin}`);
    }
  }

  console.log(`\n🎉 Processo concluído com sucesso! Total de vendas atualizadas: ${updatedSalesCount}`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Erro na migração:', err);
  process.exit(1);
});
