const mongoose = require('mongoose');
const { Sale } = require('../db');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongodb:27017/agrovenda';

async function run() {
  console.log('🔄 Conectando ao MongoDB:', MONGO_URI);
  await mongoose.connect(MONGO_URI);
  console.log('✅ Conectado com sucesso!');

  // Busca todas as vendas que possuem evidenceFile que são comprovantes de pagamento (ex: CP-*)
  const salesWithEvidence = await Sale.find({
    evidenceFile: { $exists: true, $ne: null, $ne: '' }
  });

  console.log(`📋 Encontradas ${salesWithEvidence.length} vendas com evidenceFile.`);

  let migratedCount = 0;
  for (const s of salesWithEvidence) {
    const fname = s.evidenceFile || '';
    
    // Se o nome do arquivo indicar comprovante de pagamento (CP-*, comprovante, etc.)
    const isPaymentProof = fname.includes('CP-') || fname.toLowerCase().includes('comprovante') || fname.toLowerCase().includes('pix') || fname.toLowerCase().includes('recibo');

    if (isPaymentProof) {
      // Move para paymentProofFile se paymentProofFile estiver vazio
      const updateData = {
        paymentProofFile: s.paymentProofFile || s.evidenceFile,
        evidenceFile: null
      };

      await Sale.updateOne({ id: s.id }, { $set: updateData });
      migratedCount++;
      console.log(`  ✓ Venda ${s.id}: ${fname} movido de evidenceFile (Venda) para paymentProofFile (Liquidação).`);
    }
  }

  console.log(`\n🎉 Migração finalizada! Total de comprovantes de pagamento movidos para o campo correto: ${migratedCount}`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Erro na migração:', err);
  process.exit(1);
});
