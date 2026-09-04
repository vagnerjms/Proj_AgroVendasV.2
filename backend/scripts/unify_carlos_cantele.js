const mongoose = require('mongoose');
const { Sale, Client, Purchase, WeighingSlip } = require('../db');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongodb:27017/agrovenda';

async function run() {
  console.log('🔄 Conectando ao MongoDB:', MONGO_URI);
  await mongoose.connect(MONGO_URI);
  console.log('✅ Conectado com sucesso!');

  const targetOrigin = 'CARLOS CESAR CANTELE (NOVA PONTE/MG)';

  // 1. Unificar Sales
  const sales = await Sale.find({
    $or: [
      { origin: { $regex: /CANTELE/i } },
      { notes: { $regex: /CANTELE/i } }
    ]
  });

  console.log(`📋 Encontradas ${sales.length} vendas associadas a Carlos Cesar Cantele.`);

  let updatedSalesCount = 0;
  for (const s of sales) {
    let changed = false;

    // Se origin não é exatamente a forma padronizada
    if (s.origin && s.origin.toUpperCase().includes('CANTELE') && s.origin !== targetOrigin) {
      console.log(`  [Sale ${s.id}] Mudando origin: "${s.origin}" -> "${targetOrigin}"`);
      s.origin = targetOrigin;
      changed = true;
    }

    // Se notes contém o nome antigo sem a cidade ou com formato inconsistente
    if (s.notes && s.notes.toUpperCase().includes('CANTELE')) {
      const oldNotes = s.notes;
      const updatedNotes = s.notes
        .replace(/CARLOS CESAR CANTELE \(NOVA PONTE\s*-\s*MG\)/gi, targetOrigin)
        .replace(/Produtor\s*CARLOS CESAR CANTELE(?!\s*\(NOVA PONTE\/MG\))/gi, `Produtor ${targetOrigin}`)
        .replace(/Produtor:\s*CARLOS CESAR CANTELE(?!\s*\(NOVA PONTE\/MG\))/gi, `Produtor: ${targetOrigin}`);
      
      if (updatedNotes !== oldNotes) {
        s.notes = updatedNotes;
        changed = true;
      }
    }

    if (changed) {
      await Sale.updateOne({ _id: s._id }, { $set: { origin: s.origin, notes: s.notes } });
      updatedSalesCount++;
    }
  }

  // 2. Validar / Atualizar Clients (Produtor)
  const clients = await Client.find({
    name: { $regex: /CANTELE/i }
  });

  let updatedClientsCount = 0;
  for (const c of clients) {
    let changed = false;
    if (c.city && !c.city.toUpperCase().includes('NOVA PONTE')) {
      c.city = 'NOVA PONTE';
      c.uf = 'MG';
      changed = true;
    }
    if (changed) {
      await Client.updateOne({ _id: c._id }, { $set: { city: c.city, uf: c.uf } });
      updatedClientsCount++;
      console.log(`  ✓ Cliente/Produtor ${c.id || c._id} (${c.name}) atualizado.`);
    }
  }

  // 3. Unificar Purchases (Compras) se houver
  const purchases = await Purchase.find({
    producer: { $regex: /CANTELE/i }
  });

  let updatedPurchasesCount = 0;
  for (const p of purchases) {
    if (p.producer !== targetOrigin) {
      await Purchase.updateOne({ _id: p._id }, { $set: { producer: targetOrigin } });
      updatedPurchasesCount++;
      console.log(`  ✓ Compra ${p.id || p._id} atualizada para ${targetOrigin}`);
    }
  }

  console.log(`\n🎉 Processo concluído com sucesso!`);
  console.log(`  - Total de vendas atualizadas: ${updatedSalesCount}`);
  console.log(`  - Total de clientes/produtores verificados: ${clients.length}`);
  console.log(`  - Total de compras atualizadas: ${updatedPurchasesCount}`);

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Erro na migração:', err);
  process.exit(1);
});
