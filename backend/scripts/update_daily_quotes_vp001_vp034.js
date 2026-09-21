const mongoose = require('mongoose');

// Mapeamento oficial extraído do Relatório de Fechamento (Detalhamento por Loja - VPs)
const vpQuotesData = [
  { vpId: "VP001", nf: "27957662", client: "HORTIFRUTI RUBI LTDA", cotacao: 45.00 },
  { vpId: "VP002", nf: "27957664", client: "HORTIFRUTI RUBI LTDA", cotacao: 45.00 },
  { vpId: "VP003", nf: "27957569", client: "COMERCIAL DE VERDURAS WD LTDA", cotacao: 45.00 },
  { vpId: "VP004", nf: "27967571", client: "MARCELO KATSUMI HARADA", cotacao: 45.00 },
  { vpId: "VP005", nf: "27970582", client: "HORTIFRUTI RUBI LTDA", cotacao: 42.00 },
  { vpId: "VP006", nf: "27977672", client: "HORTIFRUTI RUBI LTDA", cotacao: 40.00 },
  { vpId: "VP007", nf: "27980429", client: "W & A DISTRIBUIDORA DE VERDURAS LTDA", cotacao: 40.00 },
  { vpId: "VP008", nf: "27980432", client: "BADIN FAVILLA HORTIFRUTI LTDA", cotacao: 40.00 },
  { vpId: "VP009", nf: "27999696", client: "COMERCIAL DE VERDURAS WD LTDA", cotacao: 45.00 },
  { vpId: "VP010", nf: "27999635", client: "BADIN FAVILLA HORTIFRUTI LTDA", cotacao: 45.00 },
  { vpId: "VP011", nf: "27998942", client: "W & A DISTRIBUIDORA DE VERDURAS LTDA", cotacao: 45.00 },
  { vpId: "VP012", nf: "28008239", client: "MARCELO KATSUMI HARADA", cotacao: 55.00 },
  { vpId: "VP013", nf: "28003902", client: "HORTIFRUTI RUBI LTDA", cotacao: 55.00 },
  { vpId: "VP014", nf: "28007928", client: "W & A DISTRIBUIDORA DE VERDURAS LTDA", cotacao: 55.00 },
  { vpId: "VP015", nf: "28042638", client: "HORTIFRUTI RUBI LTDA", cotacao: 55.00 },
  { vpId: "VP016", nf: "28017525", client: "COMERCIAL DE VERDURAS AZEVEDO LTDA", cotacao: 55.00 },
  { vpId: "VP017", nf: "28017539", client: "W & A DISTRIBUIDORA DE VERDURAS LTDA", cotacao: 55.00 },
  { vpId: "VP018", nf: "28024828", client: "BADIN FAVILLA HORTIFRUTI LTDA", cotacao: 55.00 },
  { vpId: "VP019", nf: "28021552", client: "HORTIFRUTI RUBI LTDA", cotacao: 55.00 },
  { vpId: "VP020", nf: "28033001", client: "W & A DISTRIBUIDORA DE VERDURAS LTDA", cotacao: 62.00 },
  { vpId: "VP021", nf: "28042907", client: "COMERCIAL DE VERDURAS WD LTDA", cotacao: 65.00 },
  { vpId: "VP022", nf: "28042900", client: "BADIN FAVILLA HORTIFRUTI LTDA", cotacao: 65.00 },
  { vpId: "VP023", nf: "28042894", client: "W & A DISTRIBUIDORA DE VERDURAS LTDA", cotacao: 60.00 },
  { vpId: "VP024", nf: "Pendente", date: "2026-08-01", client: "HORTIFRUTI RUBI LTDA", cotacao: 65.00 },
  { vpId: "VP025", nf: "28047798", client: "HORTIFRUTI RUBI LTDA", cotacao: 65.00 },
  { vpId: "VP026", nf: "28053397", client: "W & A DISTRIBUIDORA DE VERDURAS LTDA", cotacao: 65.00 },
  { vpId: "VP027", nf: "28053399", client: "COMERCIAL DE VERDURAS AZEVEDO LTDA", cotacao: 65.00 },
  { vpId: "VP028", nf: "28058820", client: "MARCELO KATSUMI HARADA", cotacao: 65.00 },
  { vpId: "VP029", nf: "28059766", client: "HORTIFRUTI RUBI LTDA", cotacao: 65.00 },
  { vpId: "VP030", nf: "28067709", client: "HORTIFRUTI RUBI LTDA", cotacao: 65.00 },
  { vpId: "VP031", nf: "28069150", client: "W & A DISTRIBUIDORA DE VERDURAS LTDA", cotacao: 65.00 },
  { vpId: "VP032", nf: "28069166", client: "HORT BOM ALIMENTOS LTDA", cotacao: 65.00 },
  { vpId: "VP033", nf: "Pendente", date: "2026-08-06", client: "W & A DISTRIBUIDORA DE VERDURAS LTDA", cotacao: 65.00 },
  { vpId: "VP034", nf: "Pendente", date: "2026-08-08", client: "W & A DISTRIBUIDORA DE VERDURAS LTDA", cotacao: 45.00 }
];

async function updateDailyQuotes() {
  const urisToTry = [
    process.env.MONGO_URI,
    'mongodb://mongodb:27017/agrovenda',
    'mongodb://agrovenda-v2-mongodb:27017/agrovenda',
    'mongodb://127.0.0.1:27017/agrovenda',
    'mongodb://localhost:27017/agrovenda'
  ].filter(Boolean);

  let connected = false;
  for (const uri of urisToTry) {
    try {
      console.log(`🔌 Conectando ao MongoDB em: ${uri}...`);
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 4000 });
      console.log(`✅ Conectado com sucesso ao MongoDB!`);
      connected = true;
      break;
    } catch (e) {
      console.warn(`⚠️ Falha ao conectar em ${uri} (${e.message}). Tentando próximo...`);
    }
  }

  if (!connected) {
    throw new Error('Não foi possível conectar a nenhuma instância do MongoDB.');
  }

  // Obter modelo de Sale sem restrições de schema para atualização cirúrgica
  const Sale = mongoose.models.Sale || mongoose.model('Sale', new mongoose.Schema({}, { strict: false }));

  console.log('\n=============================================================');
  console.log('  ATUALIZAÇÃO DE COTAÇÃO CAIXA (VP001 a VP034)');
  console.log('  REGRA: Modificar EXCLUSIVAMENTE o campo de Cotação');
  console.log('=============================================================\n');

  let updatedCount = 0;
  let notFoundCount = 0;

  for (const item of vpQuotesData) {
    // 1. Localizar a venda: pelo ID direto (VP001, VP-001) ou por número
    let sale = await Sale.findOne({
      $or: [
        { id: item.vpId },
        { id: item.vpId.replace('VP', 'VP-') },
        { id: item.vpId.replace(/^VP0+/, 'VP') }
      ]
    });

    // Se não encontrou pelo ID e tem NF definida, busca pela chave, arquivo ou observações
    if (!sale && item.nf && item.nf !== 'Pendente') {
      sale = await Sale.findOne({
        $or: [
          { nfeKey: new RegExp(item.nf) },
          { nfFile: new RegExp(item.nf) },
          { notes: new RegExp(item.nf) }
        ]
      });
    }

    // Se ainda não encontrou e é pendente, busca por cliente e data aproximada
    if (!sale && item.nf === 'Pendente') {
      sale = await Sale.findOne({
        client: new RegExp(item.client.split(' ')[0], 'i'),
        saleDate: item.date
      });
    }

    if (!sale) {
      console.log(`❌ [NÃO ENCONTRADO] ${item.vpId} | Loja: ${item.client} | NF: ${item.nf}`);
      notFoundCount++;
      continue;
    }

    const currentQuoteDoc = Number(sale.dailyQuote) || 0;
    const currentQuoteItem = Number(sale.items?.[0]?.dailyQuote) || 0;

    // Constrói o update estritamente para o campo de cotação
    const updateSet = {
      dailyQuote: item.cotacao
    };

    // Atualiza dailyQuote em cada item do array items, sem tocar em nenhum outro campo
    if (Array.isArray(sale.items) && sale.items.length > 0) {
      for (let i = 0; i < sale.items.length; i++) {
        updateSet[`items.${i}.dailyQuote`] = item.cotacao;
      }
    }

    // Executa update atômico no MongoDB ($set cirúrgico)
    await Sale.updateOne({ _id: sale._id }, { $set: updateSet });

    console.log(`✅ [ATUALIZADO] ${item.vpId} (ID real: ${sale.id}) | Loja: ${sale.client}`);
    console.log(`   └─ Cotação anterior: R$ ${currentQuoteDoc.toFixed(2)}/cx (item: R$ ${currentQuoteItem.toFixed(2)}) -> Nova Cotação: R$ ${item.cotacao.toFixed(2)}/cx`);
    updatedCount++;
  }

  console.log('\n=============================================================');
  console.log(`🎉 Resumo da Operação:`);
  console.log(`   - Vendas atualizadas com sucesso: ${updatedCount} de ${vpQuotesData.length}`);
  console.log(`   - Vendas não encontradas: ${notFoundCount}`);
  console.log('=============================================================\n');

  await mongoose.disconnect();
  console.log('Conexão com o banco finalizada.');
  process.exit(0);
}

updateDailyQuotes().catch(err => {
  console.error('❌ Erro fatal ao atualizar cotações:', err);
  process.exit(1);
});
