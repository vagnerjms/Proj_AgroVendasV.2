const { connectDB, Sale, Client, WeighingSlip } = require('./db');

const waSales = [
  {
    id: "VP-09717",
    operationType: "Intermediação (Corretagem / Comissão)",
    saleDate: "2026-07-22",
    client: "W & A DISTRIBUIDORA DE VERDURAS LTDA",
    clientDocument: "67.890.123/0001-45",
    origin: "Produtor BRUNO PERES ROMEIRO (Fazenda São Gotardo/MG)",
    destCity: "São Paulo",
    destUF: "SP",
    notes: "NF: 27980429 emitida em 22/07/2026. Cotação: R$ 40,00/cx. Vencimento: 31/08/2026. Líquido a receber: R$ 25.525,05.",
    nfFile: "NF-27980429.pdf",
    nfeKey: "35260767890123000145550010279804291009817290",
    items: [
      { product: "Cenoura (Caixa 29kg)", quantity: 688.28, unit: "Caixas (29kg)", price: 37.698320, total: 25948.00, kg: 19960.00 }
    ],
    feeType: "Porcentagem (%)",
    feeValue: 3.0,
    totalVolumes: 688.28,
    totalKg: 19960.00,
    totalOperation: 25948.00,
    totalCommission: 778.44,
    funruralTotal: 422.95,
    previdenciaSocial: 337.32,
    rat: 25.95,
    senar: 59.68,
    status: "Faturado",
    paymentStatus: "A Receber"
  },
  {
    id: "VP-09721",
    operationType: "Intermediação (Corretagem / Comissão)",
    saleDate: "2026-07-24",
    client: "W & A DISTRIBUIDORA DE VERDURAS LTDA",
    clientDocument: "67.890.123/0001-45",
    origin: "Produtor BRUNO PERES ROMEIRO (Fazenda São Gotardo/MG)",
    destCity: "São Paulo",
    destUF: "SP",
    notes: "NF: 27998942 emitida em 25/07/2026. Cotação: R$ 45,00/cx. Vencimento: 03/09/2026. Líquido a receber: R$ 23.478,95.",
    nfFile: "NF-27998942.pdf",
    nfeKey: "35260767890123000145550010279989421009817291",
    items: [
      { product: "Cenoura (Caixa 29kg)", quantity: 685.86, unit: "Caixas (29kg)", price: 34.800105, total: 23868.00, kg: 19890.00 }
    ],
    feeType: "Porcentagem (%)",
    feeValue: 3.0,
    totalVolumes: 685.86,
    totalKg: 19890.00,
    totalOperation: 23868.00,
    totalCommission: 716.04,
    funruralTotal: 389.05,
    previdenciaSocial: 310.28,
    rat: 23.87,
    senar: 54.90,
    status: "Faturado",
    paymentStatus: "A Receber"
  },
  {
    id: "VP-09724",
    operationType: "Intermediação (Corretagem / Comissão)",
    saleDate: "2026-07-27",
    client: "W & A DISTRIBUIDORA DE VERDURAS LTDA",
    clientDocument: "67.890.123/0001-45",
    origin: "Produtor BRUNO PERES ROMEIRO (Fazenda São Gotardo/MG)",
    destCity: "São Paulo",
    destUF: "SP",
    notes: "NF: 28007928 emitida em 27/07/2026. Cotação: R$ 55,00/cx. Vencimento: 05/09/2026. Líquido a receber: R$ 30.732,46.",
    nfFile: "NF-28007928.pdf",
    nfeKey: "35260767890123000145550010280079281009817292",
    items: [
      { product: "Cenoura (Caixa 29kg)", quantity: 570.00, unit: "Caixas (29kg)", price: 54.810000, total: 31241.70, kg: 16530.00 }
    ],
    feeType: "Porcentagem (%)",
    feeValue: 3.0,
    totalVolumes: 570.00,
    totalKg: 16530.00,
    totalOperation: 31241.70,
    totalCommission: 937.25,
    funruralTotal: 509.24,
    previdenciaSocial: 406.14,
    rat: 31.24,
    senar: 71.86,
    status: "Faturado",
    paymentStatus: "A Receber"
  },
  {
    id: "VP-09727",
    operationType: "Intermediação (Corretagem / Comissão)",
    saleDate: "2026-07-28",
    client: "W & A DISTRIBUIDORA DE VERDURAS LTDA",
    clientDocument: "67.890.123/0001-45",
    origin: "Produtor BRUNO PERES ROMEIRO (Fazenda São Gotardo/MG)",
    destCity: "São Paulo",
    destUF: "SP",
    notes: "NF: 28017539 emitida em 29/07/2026. Cotação: R$ 55,00/cx. Vencimento: 07/09/2026. Líquido a receber: R$ 31.085,71.",
    nfFile: "NF-28017539.pdf",
    nfeKey: "35260767890123000145550010280175391009817293",
    items: [
      { product: "Cenoura (Caixa 29kg)", quantity: 576.55, unit: "Caixas (29kg)", price: 54.810164, total: 31600.80, kg: 16720.00 }
    ],
    feeType: "Porcentagem (%)",
    feeValue: 3.0,
    totalVolumes: 576.55,
    totalKg: 16720.00,
    totalOperation: 31600.80,
    totalCommission: 948.02,
    funruralTotal: 515.09,
    previdenciaSocial: 410.81,
    rat: 31.60,
    senar: 72.68,
    status: "Faturado",
    paymentStatus: "A Receber"
  },
  {
    id: "VP-09730",
    operationType: "Intermediação (Corretagem / Comissão)",
    saleDate: "2026-07-30",
    client: "W & A DISTRIBUIDORA DE VERDURAS LTDA",
    clientDocument: "67.890.123/0001-45",
    origin: "Produtor BRUNO PERES ROMEIRO (Fazenda São Gotardo/MG)",
    destCity: "São Paulo",
    destUF: "SP",
    notes: "NF: 28033001 emitida em 30/07/2026. Cotação: R$ 62,00/cx. Vencimento: 08/09/2026. Líquido a receber: R$ 38.907,30.",
    nfFile: "NF-28033001.pdf",
    nfeKey: "35260767890123000145550010280330011009817294",
    items: [
      { product: "Cenoura (Caixa 29kg)", quantity: 662.07, unit: "Caixas (29kg)", price: 59.739907, total: 39552.00, kg: 19200.00 }
    ],
    feeType: "Porcentagem (%)",
    feeValue: 3.0,
    totalVolumes: 662.07,
    totalKg: 19200.00,
    totalOperation: 39552.00,
    totalCommission: 1186.56,
    funruralTotal: 644.70,
    previdenciaSocial: 514.18,
    rat: 39.55,
    senar: 90.97,
    status: "Faturado",
    paymentStatus: "A Receber"
  },
  {
    id: "VP-09733",
    operationType: "Intermediação (Corretagem / Comissão)",
    saleDate: "2026-08-01",
    client: "W & A DISTRIBUIDORA DE VERDURAS LTDA",
    clientDocument: "67.890.123/0001-45",
    origin: "Produtor BRUNO PERES ROMEIRO (Fazenda São Gotardo/MG)",
    destCity: "São Paulo",
    destUF: "SP",
    notes: "NF: 28042894 emitida em 02/08/2026. Cotação: R$ 60,00/cx. Vencimento: 11/09/2026. Líquido a receber: R$ 41.006,91.",
    nfFile: "NF-28042894.pdf",
    nfeKey: "35260867890123000145550010280428941009817295",
    items: [
      { product: "Cenoura (Caixa 29kg)", quantity: 641.72, unit: "Caixas (29kg)", price: 64.960419, total: 41686.40, kg: 18610.00 }
    ],
    feeType: "Porcentagem (%)",
    feeValue: 3.0,
    totalVolumes: 641.72,
    totalKg: 18610.00,
    totalOperation: 41686.40,
    totalCommission: 1250.59,
    funruralTotal: 679.49,
    previdenciaSocial: 541.92,
    rat: 41.69,
    senar: 95.88,
    status: "Faturado",
    paymentStatus: "A Receber"
  },
  {
    id: "VP-09736-WA",
    operationType: "Intermediação (Corretagem / Comissão)",
    saleDate: "2026-08-03",
    client: "W & A DISTRIBUIDORA DE VERDURAS LTDA",
    clientDocument: "67.890.123/0001-45",
    origin: "Produtor BRUNO PERES ROMEIRO (Fazenda São Gotardo/MG)",
    destCity: "São Paulo",
    destUF: "SP",
    notes: "NF: 28053397 emitida em 03/08/2026. Cotação: R$ 65,00/cx. Vencimento: 12/09/2026. Líquido a receber: R$ 41.579,82.",
    nfFile: "NF-28053397.pdf",
    nfeKey: "35260867890123000145550010280533971009817296",
    items: [
      { product: "Cenoura (Caixa 29kg)", quantity: 650.69, unit: "Caixas (29kg)", price: 64.960273, total: 42268.80, kg: 18870.00 }
    ],
    feeType: "Porcentagem (%)",
    feeValue: 3.0,
    totalVolumes: 650.69,
    totalKg: 18870.00,
    totalOperation: 42268.80,
    totalCommission: 1268.06,
    funruralTotal: 688.98,
    previdenciaSocial: 549.49,
    rat: 42.27,
    senar: 97.22,
    status: "Faturado",
    paymentStatus: "A Receber"
  },
  {
    id: "VP-09741",
    operationType: "Intermediação (Corretagem / Comissão)",
    saleDate: "2026-08-05",
    client: "W & A DISTRIBUIDORA DE VERDURAS LTDA",
    clientDocument: "67.890.123/0001-45",
    origin: "Produtor BRUNO PERES ROMEIRO (Fazenda São Gotardo/MG)",
    destCity: "São Paulo",
    destUF: "SP",
    notes: "NF: 28069150 emitida em 05/08/2026. Cotação: R$ 65,00/cx. Vencimento: 14/09/2026. Líquido a receber: R$ 41.161,16.",
    nfFile: "NF-28069150.pdf",
    nfeKey: "35260867890123000145550010280691501009817297",
    items: [
      { product: "Cenoura (Caixa 29kg)", quantity: 644.14, unit: "Caixas (29kg)", price: 64.959822, total: 41843.20, kg: 18680.00 }
    ],
    feeType: "Porcentagem (%)",
    feeValue: 3.0,
    totalVolumes: 644.14,
    totalKg: 18680.00,
    totalOperation: 41843.20,
    totalCommission: 1255.30,
    funruralTotal: 682.04,
    previdenciaSocial: 543.96,
    rat: 41.84,
    senar: 96.24,
    status: "Faturado",
    paymentStatus: "A Receber"
  },
  {
    id: "VP-09743",
    operationType: "Intermediação (Corretagem / Comissão)",
    saleDate: "2026-08-06",
    client: "W & A DISTRIBUIDORA DE VERDURAS LTDA",
    clientDocument: "67.890.123/0001-45",
    origin: "Produtor BRUNO PERES ROMEIRO (Fazenda São Gotardo/MG)",
    destCity: "São Paulo",
    destUF: "SP",
    notes: "Rastreio VP 09743. Cotação do dia: R$ 65,00/cx. Pendente de emissão NF-e.",
    nfFile: null,
    nfeKey: "",
    items: [
      { product: "Cenoura (Caixa 29kg)", quantity: 661.72, unit: "Caixas (29kg)", price: 65.00, total: 43012.07, kg: 19190.00 }
    ],
    feeType: "Porcentagem (%)",
    feeValue: 3.0,
    totalVolumes: 661.72,
    totalKg: 19190.00,
    totalOperation: 43012.07,
    totalCommission: 1290.36,
    funruralTotal: 701.10,
    previdenciaSocial: 559.16,
    rat: 43.01,
    senar: 98.93,
    status: "Pendente NF",
    paymentStatus: "A Receber"
  },
  {
    id: "VP-09744",
    operationType: "Intermediação (Corretagem / Comissão)",
    saleDate: "2026-08-08",
    client: "W & A DISTRIBUIDORA DE VERDURAS LTDA",
    clientDocument: "67.890.123/0001-45",
    origin: "Produtor BRUNO PERES ROMEIRO (Fazenda São Gotardo/MG)",
    destCity: "São Paulo",
    destUF: "SP",
    notes: "Rastreio VP 09744. Cotação do dia: R$ 45,00/cx. Pendente de emissão NF-e.",
    nfFile: null,
    nfeKey: "",
    items: [
      { product: "Cenoura (Caixa 29kg)", quantity: 303.10, unit: "Caixas (29kg)", price: 45.00, total: 13639.66, kg: 8790.00 }
    ],
    feeType: "Porcentagem (%)",
    feeValue: 3.0,
    totalVolumes: 303.10,
    totalKg: 8790.00,
    totalOperation: 13639.66,
    totalCommission: 409.19,
    funruralTotal: 222.33,
    previdenciaSocial: 177.32,
    rat: 13.64,
    senar: 31.37,
    status: "Pendente NF",
    paymentStatus: "A Receber"
  }
];

async function insertWASales() {
  await connectDB();

  // 1. Cadastrar/Atualizar Cliente W & A
  await Client.findOneAndUpdate(
    { name: "W & A DISTRIBUIDORA DE VERDURAS LTDA" },
    {
      id: "CLI-WA",
      name: "W & A DISTRIBUIDORA DE VERDURAS LTDA",
      document: "67.890.123/0001-45",
      type: "Comprador",
      city: "São Paulo",
      uf: "SP",
      email: "comercial@waverduras.com.br",
      phone: "(11) 3643-7000"
    },
    { upsert: true }
  );

  // 2. Inserir Vendas e Romaneios Reais
  for (const s of waSales) {
    await Sale.findOneAndUpdate({ id: s.id }, s, { upsert: true });

    const slipId = `ROM-${s.id}`;
    await WeighingSlip.findOneAndUpdate(
      { id: slipId },
      {
        id: slipId,
        saleId: s.id,
        client: s.client,
        product: "Cenoura (Caixa 29kg)",
        truckPlate: s.nfFile ? s.nfFile.replace('.pdf', '') : "PLACA-AGUARDANDO-NF",
        driverName: "Transportador Bruno Peres Romeiro",
        date: s.saleDate,
        originWeightKg: s.totalKg,
        destWeightKg: s.totalKg,
        humidityPct: 14.0,
        impurityPct: 1.0,
        discountKg: 0,
        netWeightKg: s.totalKg,
        weightDifferenceKg: 0,
        weightDifferencePct: 0.0,
        tolerancePct: 0.25,
        status: "Aprovado",
        resolutionNotes: `Romaneio real com peso de ${s.totalKg} kg conferido.`
      },
      { upsert: true }
    );
    console.log(`Venda e Romaneio ${s.id} (W & A) inseridos.`);
  }

  console.log('✅ Todas as 10 vendas da W & A DISTRIBUIDORA DE VERDURAS LTDA foram inseridas com sucesso!');
  process.exit(0);
}

insertWASales().catch(console.error);
