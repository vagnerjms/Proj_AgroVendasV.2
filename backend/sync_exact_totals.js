const { connectDB, Sale, WeighingSlip } = require('./db');

async function syncExactTotals() {
  await connectDB();

  // Atualiza as vendas sem NF (09743, 09744 de W&A e 09734 de Rubi) para refletir o status Pendente NF com valor NF aguardando emissão
  
  // 1. W&A 09743
  await Sale.findOneAndUpdate(
    { id: "VP-09743" },
    {
      totalOperation: 0,
      funruralTotal: 0,
      previdenciaSocial: 0,
      rat: 0,
      senar: 0,
      status: "Pendente NF",
      notes: "Rastreio VP 09743 | 19.190 kg (661,72 cx) | Cotação R$ 65,00/cx | Valor VP: R$ 43.012,07 | NF Pendente de emissão pelo produtor"
    }
  );

  // 2. W&A 09744
  await Sale.findOneAndUpdate(
    { id: "VP-09744" },
    {
      totalOperation: 0,
      funruralTotal: 0,
      previdenciaSocial: 0,
      rat: 0,
      senar: 0,
      status: "Pendente NF",
      notes: "Rastreio VP 09744 | 8.790 kg (303,10 cx) | Cotação R$ 45,00/cx | Valor VP: R$ 13.639,66 | NF Pendente de emissão pelo produtor"
    }
  );

  // 3. Rubi 09734
  await Sale.findOneAndUpdate(
    { id: "VP-09734" },
    {
      totalOperation: 0,
      funruralTotal: 0,
      previdenciaSocial: 0,
      rat: 0,
      senar: 0,
      status: "Pendente NF",
      notes: "Rastreio VP 09734 | 21.470 kg (740,34 cx) | Cotação R$ 65,00/cx | Valor VP: R$ 48.122,41 | NF Pendente de emissão pelo produtor"
    }
  );

  console.log('✅ Sincronização exata das planilhas concluída!');
  process.exit(0);
}

syncExactTotals().catch(console.error);
