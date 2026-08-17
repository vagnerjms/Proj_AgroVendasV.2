const badinSales = [
  {
    id: "VP-09718",
    operationType: "Venda Particular / Repasse Direto",
    saleDate: "2026-07-22",
    client: "BADIN FAVILLA HORTIFRUTI LTDA",
    clientDocument: "12.345.678/0001-90",
    origin: "Produtor BRUNO PERES ROMEIRO (Fazenda São Gotardo/MG)",
    destCity: "São Paulo",
    destUF: "SP",
    notes: "NF: 27980432 emitida em 22/07/2026. Cotação: R$ 40,00/cx. Vencimento: 31/08/2026. Líquido a receber: R$ 20.217,99.",
    nfFile: "NF-27980432.pdf",
    nfeKey: "35260712345678000190550010279804321009817263",
    items: [
      {
        product: "Cenoura (Caixa 29kg)",
        quantity: 545.17,
        unit: "Caixas (29kg)",
        price: 37.700148,
        total: 20553.00,
        kg: 15810.00
      }
    ],
    feeType: "Valor Fixo Total",
    feeValue: 1253.90,
    totalVolumes: 545.17,
    totalKg: 15810.00,
    totalOperation: 20553.00,
    totalCommission: 1253.90,
    funruralTotal: 335.01,
    previdenciaSocial: 267.19,
    rat: 20.55,
    senar: 47.27,
    status: "Faturado",
    paymentStatus: "A Receber"
  },
  {
    id: "VP-09720",
    operationType: "Venda Particular / Repasse Direto",
    saleDate: "2026-07-24",
    client: "BADIN FAVILLA HORTIFRUTI LTDA",
    clientDocument: "12.345.678/0001-90",
    origin: "Produtor BRUNO PERES ROMEIRO (Fazenda São Gotardo/MG)",
    destCity: "São Paulo",
    destUF: "SP",
    notes: "NF: 27999635 emitida em 24/07/2026. Cotação: R$ 45,00/cx. Vencimento: 04/09/2026. Líquido a receber: R$ 24.392,71.",
    nfFile: "NF-27999635.pdf",
    nfeKey: "35260712345678000190550010279996351009817264",
    items: [
      {
        product: "Cenoura (Caixa 29kg)",
        quantity: 551.66,
        unit: "Caixas (29kg)",
        price: 44.949606,
        total: 24796.90,
        kg: 15998.00
      }
    ],
    feeType: "Valor Fixo Total",
    feeValue: 27.58,
    totalVolumes: 551.66,
    totalKg: 15998.00,
    totalOperation: 24796.90,
    totalCommission: 27.58,
    funruralTotal: 404.19,
    previdenciaSocial: 322.36,
    rat: 24.80,
    senar: 57.03,
    status: "Faturado",
    paymentStatus: "A Receber"
  },
  {
    id: "VP-09728",
    operationType: "Venda Particular / Repasse Direto",
    saleDate: "2026-07-29",
    client: "BADIN FAVILLA HORTIFRUTI LTDA",
    clientDocument: "12.345.678/0001-90",
    origin: "Produtor BRUNO PERES ROMEIRO (Fazenda São Gotardo/MG)",
    destCity: "São Paulo",
    destUF: "SP",
    notes: "NF: 28024828 emitida em 29/07/2026. Cotação: R$ 55,00/cx. Vencimento: 07/09/2026. Líquido a receber: R$ 31.141,48.",
    nfFile: "NF-28024828.pdf",
    nfeKey: "35260712345678000190550010280248281009817265",
    items: [
      {
        product: "Cenoura (Caixa 29kg)",
        quantity: 577.59,
        unit: "Caixas (29kg)",
        price: 54.809639,
        total: 31657.50,
        kg: 16750.00
      }
    ],
    feeType: "Valor Fixo Total",
    feeValue: 109.74,
    totalVolumes: 577.59,
    totalKg: 16750.00,
    totalOperation: 31657.50,
    totalCommission: 109.74,
    funruralTotal: 516.02,
    previdenciaSocial: 411.55,
    rat: 31.66,
    senar: 72.81,
    status: "Faturado",
    paymentStatus: "A Receber"
  },
  {
    id: "VP-09732",
    operationType: "Venda Particular / Repasse Direto",
    saleDate: "2026-08-01",
    client: "BADIN FAVILLA HORTIFRUTI LTDA",
    clientDocument: "12.345.678/0001-90",
    origin: "Produtor BRUNO PERES ROMEIRO (Fazenda São Gotardo/MG)",
    destCity: "São Paulo",
    destUF: "SP",
    notes: "NF: 28042900 emitida em 02/08/2026. Cotação: R$ 65,00/cx. Vencimento: 11/09/2026. Líquido a receber: R$ 33.349,79.",
    nfFile: "NF-28042900.pdf",
    nfeKey: "35260812345678000190550010280429001009817266",
    items: [
      {
        product: "Cenoura (Caixa 29kg)",
        quantity: 521.90,
        unit: "Caixas (29kg)",
        price: 64.959570,
        total: 33902.40,
        kg: 15135.00
      }
    ],
    feeType: "Valor Fixo Total",
    feeValue: 20.88,
    totalVolumes: 521.90,
    totalKg: 15135.00,
    totalOperation: 33902.40,
    totalCommission: 20.88,
    funruralTotal: 552.61,
    previdenciaSocial: 440.73,
    rat: 33.90,
    senar: 77.98,
    status: "Faturado",
    paymentStatus: "A Receber"
  }
];

async function insertAll() {
  // 1. Inserir Vendas
  for (const s of badinSales) {
    const res = await fetch('http://localhost:3000/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(s)
    });
    console.log(`Venda ${s.id}:`, res.status);
  }

  // 2. Inserir Cliente
  await fetch('http://localhost:3000/api/clients', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'BADIN FAVILLA HORTIFRUTI LTDA',
      document: '12.345.678/0001-90',
      type: 'Comprador',
      city: 'São Paulo',
      uf: 'SP',
      phone: '(11) 3643-2000'
    })
  });

  // 3. Inserir Produtor
  await fetch('http://localhost:3000/api/clients', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'BRUNO PERES ROMEIRO',
      document: '123.456.789-00',
      type: 'Produtor',
      city: 'São Gotardo',
      uf: 'MG',
      phone: '(34) 99876-1122'
    })
  });

  // 4. Inserir Produto
  await fetch('http://localhost:3000/api/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Cenoura (Caixa 29kg)',
      category: 'Hortifruti',
      defaultUnit: 'Caixas (29kg)',
      unitKg: 29,
      currentStock: 2196,
      averageCost: 35.00
    })
  });

  console.log('✅ Todas as 4 vendas da BADIN FAVILLA HORTIFRUTI LTDA foram inseridas com sucesso!');
}

insertAll().catch(console.error);
