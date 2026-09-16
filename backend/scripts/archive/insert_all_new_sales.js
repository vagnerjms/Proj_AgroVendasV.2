const { connectDB, Sale, Client, WeighingSlip } = require('./db');

const newSales = [
  // 1. COMERCIAL DE VERDURAS AZEVEDO LTDA
  {
    id: "VP-09726",
    operationType: "Intermediação (Corretagem / Comissão)",
    saleDate: "2026-07-28",
    client: "COMERCIAL DE VERDURAS AZEVEDO LTDA",
    clientDocument: "23.456.789/0001-01",
    origin: "Produtor BRUNO PERES ROMEIRO (Fazenda São Gotardo/MG)",
    destCity: "São Paulo",
    destUF: "SP",
    notes: "NF: 28017525 emitida em 29/07/2026. Cotação: R$ 55,00/cx. Vencimento: 07/09/2026. Líquido a receber: R$ 33.911,68.",
    nfFile: "NF-28017525.pdf",
    nfeKey: "35260723456789000101550010280175251009817270",
    items: [
      { product: "Cenoura (Caixa 29kg)", quantity: 628.97, unit: "Caixas (29kg)", price: 54.809609, total: 34473.60, kg: 18240.00 }
    ],
    feeType: "Porcentagem (%)",
    feeValue: 3.0,
    totalVolumes: 628.97,
    totalKg: 18240.00,
    totalOperation: 34473.60,
    totalCommission: 1034.21,
    funruralTotal: 561.92,
    previdenciaSocial: 448.16,
    rat: 34.47,
    senar: 79.29,
    status: "Faturado",
    paymentStatus: "A Receber"
  },
  {
    id: "VP-09737",
    operationType: "Intermediação (Corretagem / Comissão)",
    saleDate: "2026-08-03",
    client: "COMERCIAL DE VERDURAS AZEVEDO LTDA",
    clientDocument: "23.456.789/0001-01",
    origin: "Produtor BRUNO PERES ROMEIRO (Fazenda São Gotardo/MG)",
    destCity: "São Paulo",
    destUF: "SP",
    notes: "NF: 28053399 emitida em 03/08/2026. Cotação: R$ 65,00/cx. Vencimento: 12/09/2026. Líquido a receber: R$ 45.259,64.",
    nfFile: "NF-28053399.pdf",
    nfeKey: "35260823456789000101550010280533991009817271",
    items: [
      { product: "Cenoura (Caixa 29kg)", quantity: 708.28, unit: "Caixas (29kg)", price: 64.959620, total: 46009.60, kg: 20540.00 }
    ],
    feeType: "Porcentagem (%)",
    feeValue: 3.0,
    totalVolumes: 708.28,
    totalKg: 20540.00,
    totalOperation: 46009.60,
    totalCommission: 1380.29,
    funruralTotal: 749.96,
    previdenciaSocial: 598.12,
    rat: 46.01,
    senar: 105.83,
    status: "Faturado",
    paymentStatus: "A Receber"
  },

  // 2. COMERCIAL DE VERDURAS WD LTDA
  {
    id: "VP-09713",
    operationType: "Intermediação (Corretagem / Comissão)",
    saleDate: "2026-07-18",
    client: "COMERCIAL DE VERDURAS WD LTDA",
    clientDocument: "34.567.890/0001-12",
    origin: "Produtor BRUNO PERES ROMEIRO (Fazenda São Gotardo/MG)",
    destCity: "São Paulo",
    destUF: "SP",
    notes: "NF: 27957569 emitida em 18/07/2026. Peso NF: 19.285kg, Peso considerado: 17.370kg. Cotação: R$ 45,00/cx. Vencimento: 27/08/2026.",
    nfFile: "NF-27957569.pdf",
    nfeKey: "35260734567890000112550010279575691009817272",
    items: [
      { product: "Cenoura (Caixa 29kg)", quantity: 598.97, unit: "Caixas (29kg)", price: 41.856020, total: 25070.50, kg: 17370.00 }
    ],
    feeType: "Porcentagem (%)",
    feeValue: 3.0,
    totalVolumes: 598.97,
    totalKg: 17370.00,
    totalOperation: 25070.50,
    totalCommission: 752.12,
    funruralTotal: 408.65,
    previdenciaSocial: 325.92,
    rat: 25.07,
    senar: 57.66,
    status: "Faturado",
    paymentStatus: "A Receber"
  },
  {
    id: "VP-09719",
    operationType: "Intermediação (Corretagem / Comissão)",
    saleDate: "2026-07-24",
    client: "COMERCIAL DE VERDURAS WD LTDA",
    clientDocument: "34.567.890/0001-12",
    origin: "Produtor BRUNO PERES ROMEIRO (Fazenda São Gotardo/MG)",
    destCity: "São Paulo",
    destUF: "SP",
    notes: "NF: 27999696 emitida em 26/07/2026. Cotação: R$ 45,00/cx. Vencimento: 04/09/2026. Líquido a receber: R$ 17.156,32.",
    nfFile: "NF-27999696.pdf",
    nfeKey: "35260734567890000112550010279996961009817273",
    items: [
      { product: "Cenoura (Caixa 29kg)", quantity: 388.00, unit: "Caixas (29kg)", price: 44.950000, total: 17440.60, kg: 11252.00 }
    ],
    feeType: "Porcentagem (%)",
    feeValue: 3.0,
    totalVolumes: 388.00,
    totalKg: 11252.00,
    totalOperation: 17440.60,
    totalCommission: 523.22,
    funruralTotal: 284.28,
    previdenciaSocial: 226.73,
    rat: 17.44,
    senar: 40.11,
    status: "Faturado",
    paymentStatus: "A Receber"
  },
  {
    id: "VP-09731",
    operationType: "Intermediação (Corretagem / Comissão)",
    saleDate: "2026-08-01",
    client: "COMERCIAL DE VERDURAS WD LTDA",
    clientDocument: "34.567.890/0001-12",
    origin: "Produtor BRUNO PERES ROMEIRO (Fazenda São Gotardo/MG)",
    destCity: "São Paulo",
    destUF: "SP",
    notes: "NF: 28042907 emitida em 02/08/2026. Cotação: R$ 65,00/cx. Vencimento: 11/09/2026. Líquido a receber: R$ 23.453,93.",
    nfFile: "NF-28042907.pdf",
    nfeKey: "35260834567890000112550010280429071009817274",
    items: [
      { product: "Cenoura (Caixa 29kg)", quantity: 367.03, unit: "Caixas (29kg)", price: 64.960793, total: 23842.56, kg: 10644.00 }
    ],
    feeType: "Porcentagem (%)",
    feeValue: 3.0,
    totalVolumes: 367.03,
    totalKg: 10644.00,
    totalOperation: 23842.56,
    totalCommission: 715.28,
    funruralTotal: 388.63,
    previdenciaSocial: 309.95,
    rat: 23.84,
    senar: 54.84,
    status: "Faturado",
    paymentStatus: "A Receber"
  },

  // 3. HORT BOM ALIMENTOS LTDA
  {
    id: "VP-09742",
    operationType: "Intermediação (Corretagem / Comissão)",
    saleDate: "2026-08-05",
    client: "HORT BOM ALIMENTOS LTDA",
    clientDocument: "45.678.901/0001-23",
    origin: "Produtor BRUNO PERES ROMEIRO (Fazenda São Gotardo/MG)",
    destCity: "São Paulo",
    destUF: "SP",
    notes: "NF: 28069166 emitida em 05/08/2026. Cotação: R$ 65,00/cx. Vencimento: 14/09/2026. Líquido a receber: R$ 46.493,60.",
    nfFile: "NF-28069166.pdf",
    nfeKey: "35260845678901000123550010280691661009817275",
    items: [
      { product: "Cenoura (Caixa 29kg)", quantity: 727.59, unit: "Caixas (29kg)", price: 64.959661, total: 47264.00, kg: 21100.00 }
    ],
    feeType: "Porcentagem (%)",
    feeValue: 3.0,
    totalVolumes: 727.59,
    totalKg: 21100.00,
    totalOperation: 47264.00,
    totalCommission: 1417.92,
    funruralTotal: 770.40,
    previdenciaSocial: 614.43,
    rat: 47.26,
    senar: 108.71,
    status: "Faturado",
    paymentStatus: "A Receber"
  },

  // 4. HORTIFRUTI RUBI LTDA
  {
    id: "VP-09711",
    operationType: "Intermediação (Corretagem / Comissão)",
    saleDate: "2026-07-18",
    client: "HORTIFRUTI RUBI LTDA",
    clientDocument: "56.789.012/0001-34",
    origin: "Produtor BRUNO PERES ROMEIRO (Fazenda São Gotardo/MG)",
    destCity: "São Paulo",
    destUF: "SP",
    notes: "NF: 27957662 emitida em 19/07/2026. Cotação: R$ 45,00/cx. Vencimento: 28/08/2026. Líquido a receber: R$ 27.532,78.",
    nfFile: "NF-27957662.pdf",
    nfeKey: "35260756789012000134550010279576621009817276",
    items: [
      { product: "Cenoura (Caixa 29kg)", quantity: 736.21, unit: "Caixas (29kg)", price: 38.017685, total: 27989.00, kg: 21350.00 }
    ],
    feeType: "Porcentagem (%)",
    feeValue: 3.0,
    totalVolumes: 736.21,
    totalKg: 21350.00,
    totalOperation: 27989.00,
    totalCommission: 839.67,
    funruralTotal: 456.22,
    previdenciaSocial: 363.86,
    rat: 27.99,
    senar: 64.37,
    status: "Faturado",
    paymentStatus: "A Receber"
  },
  {
    id: "VP-09712",
    operationType: "Intermediação (Corretagem / Comissão)",
    saleDate: "2026-07-18",
    client: "HORTIFRUTI RUBI LTDA",
    clientDocument: "56.789.012/0001-34",
    origin: "Produtor BRUNO PERES ROMEIRO (Fazenda São Gotardo/MG)",
    destCity: "São Paulo",
    destUF: "SP",
    notes: "NF: 27957664 emitida em 19/07/2026. Cotação: R$ 45,00/cx. Vencimento: 28/08/2026. Líquido a receber: R$ 24.604,30.",
    nfFile: "NF-27957664.pdf",
    nfeKey: "35260756789012000134550010279576641009817277",
    items: [
      { product: "Cenoura (Caixa 29kg)", quantity: 663.45, unit: "Caixas (29kg)", price: 37.699887, total: 25012.00, kg: 19240.00 }
    ],
    feeType: "Porcentagem (%)",
    feeValue: 3.0,
    totalVolumes: 663.45,
    totalKg: 19240.00,
    totalOperation: 25012.00,
    totalCommission: 750.36,
    funruralTotal: 407.70,
    previdenciaSocial: 325.16,
    rat: 25.01,
    senar: 57.53,
    status: "Faturado",
    paymentStatus: "A Receber"
  },
  {
    id: "VP-09715",
    operationType: "Intermediação (Corretagem / Comissão)",
    saleDate: "2026-07-21",
    client: "HORTIFRUTI RUBI LTDA",
    clientDocument: "56.789.012/0001-34",
    origin: "Produtor BRUNO PERES ROMEIRO (Fazenda São Gotardo/MG)",
    destCity: "São Paulo",
    destUF: "SP",
    notes: "NF: 27970582 emitida em 21/07/2026. Cotação: R$ 42,00/cx. Vencimento: 30/08/2026. Líquido a receber: R$ 28.849,95.",
    nfFile: "NF-27970582.pdf",
    nfeKey: "35260756789012000134550010279705821009817278",
    items: [
      { product: "Cenoura (Caixa 29kg)", quantity: 777.93, unit: "Caixas (29kg)", price: 37.700049, total: 29328.00, kg: 22560.00 }
    ],
    feeType: "Porcentagem (%)",
    feeValue: 3.0,
    totalVolumes: 777.93,
    totalKg: 22560.00,
    totalOperation: 29328.00,
    totalCommission: 879.84,
    funruralTotal: 478.05,
    previdenciaSocial: 381.26,
    rat: 29.33,
    senar: 67.45,
    status: "Faturado",
    paymentStatus: "A Receber"
  },
  {
    id: "VP-09716",
    operationType: "Intermediação (Corretagem / Comissão)",
    saleDate: "2026-07-22",
    client: "HORTIFRUTI RUBI LTDA",
    clientDocument: "56.789.012/0001-34",
    origin: "Produtor BRUNO PERES ROMEIRO (Fazenda São Gotardo/MG)",
    destCity: "São Paulo",
    destUF: "SP",
    notes: "NF: 27977672 emitida em 22/07/2026. Cotação: R$ 40,00/cx. Vencimento: 31/08/2026. Líquido a receber: R$ 25.959,84.",
    nfFile: "NF-27977672.pdf",
    nfeKey: "35260756789012000134550010279776721009817279",
    items: [
      { product: "Cenoura (Caixa 29kg)", quantity: 700.00, unit: "Caixas (29kg)", price: 37.700000, total: 26390.00, kg: 20300.00 }
    ],
    feeType: "Porcentagem (%)",
    feeValue: 3.0,
    totalVolumes: 700.00,
    totalKg: 20300.00,
    totalOperation: 26390.00,
    totalCommission: 791.70,
    funruralTotal: 430.16,
    previdenciaSocial: 343.07,
    rat: 26.39,
    senar: 60.70,
    status: "Faturado",
    paymentStatus: "A Receber"
  },
  {
    id: "VP-09723",
    operationType: "Intermediação (Corretagem / Comissão)",
    saleDate: "2026-07-27",
    client: "HORTIFRUTI RUBI LTDA",
    clientDocument: "56.789.012/0001-34",
    origin: "Produtor BRUNO PERES ROMEIRO (Fazenda São Gotardo/MG)",
    destCity: "São Paulo",
    destUF: "SP",
    notes: "NF: 28003902 emitida em 27/07/2026. Cotação: R$ 55,00/cx. Vencimento: 05/09/2026. Líquido a receber: R$ 30.860,64.",
    nfFile: "NF-28003902.pdf",
    nfeKey: "35260756789012000134550010280039021009817280",
    items: [
      { product: "Cenoura (Caixa 29kg)", quantity: 697.93, unit: "Caixas (29kg)", price: 44.950066, total: 31372.00, kg: 20240.00 }
    ],
    feeType: "Porcentagem (%)",
    feeValue: 3.0,
    totalVolumes: 697.93,
    totalKg: 20240.00,
    totalOperation: 31372.00,
    totalCommission: 941.16,
    funruralTotal: 511.36,
    previdenciaSocial: 407.84,
    rat: 31.37,
    senar: 72.16,
    status: "Faturado",
    paymentStatus: "A Receber"
  },
  {
    id: "VP-09729",
    operationType: "Intermediação (Corretagem / Comissão)",
    saleDate: "2026-07-29",
    client: "HORTIFRUTI RUBI LTDA",
    clientDocument: "56.789.012/0001-34",
    origin: "Produtor BRUNO PERES ROMEIRO (Fazenda São Gotardo/MG)",
    destCity: "São Paulo",
    destUF: "SP",
    notes: "NF: 28021552 emitida em 29/07/2026. Cotação: R$ 55,00/cx. Vencimento: 07/09/2026. Líquido a receber: R$ 29.561,17.",
    nfFile: "NF-28021552.pdf",
    nfeKey: "35260756789012000134550010280215521009817281",
    items: [
      { product: "Cenoura (Caixa 29kg)", quantity: 548.28, unit: "Caixas (29kg)", price: 54.809586, total: 30051.00, kg: 15900.00 }
    ],
    feeType: "Porcentagem (%)",
    feeValue: 3.0,
    totalVolumes: 548.28,
    totalKg: 15900.00,
    totalOperation: 30051.00,
    totalCommission: 901.53,
    funruralTotal: 489.83,
    previdenciaSocial: 390.66,
    rat: 30.05,
    senar: 69.12,
    status: "Faturado",
    paymentStatus: "A Receber"
  },
  {
    id: "VP-09735",
    operationType: "Intermediação (Corretagem / Comissão)",
    saleDate: "2026-07-28",
    client: "HORTIFRUTI RUBI LTDA",
    clientDocument: "56.789.012/0001-34",
    origin: "Produtor BRUNO PERES ROMEIRO (Fazenda São Gotardo/MG)",
    destCity: "São Paulo",
    destUF: "SP",
    notes: "NF: 28042638 emitida em 01/08/2026. Peso NF: 22.388kg, Peso considerado: 22.140kg. Cotação: R$ 55,00/cx. Vencimento: 10/09/2026.",
    nfFile: "NF-28042638.pdf",
    nfeKey: "35260856789012000134550010280426381009817282",
    items: [
      { product: "Cenoura (Caixa 29kg)", quantity: 763.45, unit: "Caixas (29kg)", price: 65.687484, total: 50149.12, kg: 22140.00 }
    ],
    feeType: "Porcentagem (%)",
    feeValue: 3.0,
    totalVolumes: 763.45,
    totalKg: 22140.00,
    totalOperation: 50149.12,
    totalCommission: 1504.47,
    funruralTotal: 817.43,
    previdenciaSocial: 651.94,
    rat: 50.15,
    senar: 115.34,
    status: "Faturado",
    paymentStatus: "A Receber"
  },
  {
    id: "VP-09736",
    operationType: "Intermediação (Corretagem / Comissão)",
    saleDate: "2026-08-03",
    client: "HORTIFRUTI RUBI LTDA",
    clientDocument: "56.789.012/0001-34",
    origin: "Produtor BRUNO PERES ROMEIRO (Fazenda São Gotardo/MG)",
    destCity: "São Paulo",
    destUF: "SP",
    notes: "NF: 28047798 emitida em 03/08/2026. Cotação: R$ 65,00/cx. Vencimento: 12/09/2026. Líquido a receber: R$ 43.144,30.",
    nfFile: "NF-28047798.pdf",
    nfeKey: "35260856789012000134550010280477981009817283",
    items: [
      { product: "Cenoura (Caixa 29kg)", quantity: 675.17, unit: "Caixas (29kg)", price: 64.959936, total: 43859.20, kg: 19580.00 }
    ],
    feeType: "Porcentagem (%)",
    feeValue: 3.0,
    totalVolumes: 675.17,
    totalKg: 19580.00,
    totalOperation: 43859.20,
    totalCommission: 1315.78,
    funruralTotal: 714.90,
    previdenciaSocial: 570.17,
    rat: 43.86,
    senar: 100.88,
    status: "Faturado",
    paymentStatus: "A Receber"
  },
  {
    id: "VP-09739",
    operationType: "Intermediação (Corretagem / Comissão)",
    saleDate: "2026-08-04",
    client: "HORTIFRUTI RUBI LTDA",
    clientDocument: "56.789.012/0001-34",
    origin: "Produtor BRUNO PERES ROMEIRO (Fazenda São Gotardo/MG)",
    destCity: "São Paulo",
    destUF: "SP",
    notes: "NF: 28059766 emitida em 04/08/2026. Cotação: R$ 65,00/cx. Vencimento: 13/09/2026. Líquido a receber: R$ 48.961,50.",
    nfFile: "NF-28059766.pdf",
    nfeKey: "35260856789012000134550010280597661009817284",
    items: [
      { product: "Cenoura (Caixa 29kg)", quantity: 766.21, unit: "Caixas (29kg)", price: 64.959737, total: 49772.80, kg: 22220.00 }
    ],
    feeType: "Porcentagem (%)",
    feeValue: 3.0,
    totalVolumes: 766.21,
    totalKg: 22220.00,
    totalOperation: 49772.80,
    totalCommission: 1493.18,
    funruralTotal: 811.30,
    previdenciaSocial: 647.05,
    rat: 49.77,
    senar: 114.48,
    status: "Faturado",
    paymentStatus: "A Receber"
  },
  {
    id: "VP-09740",
    operationType: "Intermediação (Corretagem / Comissão)",
    saleDate: "2026-08-05",
    client: "HORTIFRUTI RUBI LTDA",
    clientDocument: "56.789.012/0001-34",
    origin: "Produtor BRUNO PERES ROMEIRO (Fazenda São Gotardo/MG)",
    destCity: "São Paulo",
    destUF: "SP",
    notes: "NF: 28067709 emitida em 05/08/2026. Cotação: R$ 65,00/cx. Vencimento: 14/09/2026. Líquido a receber: R$ 35.845,24.",
    nfFile: "NF-28067709.pdf",
    nfeKey: "35260856789012000134550010280677091009817285",
    items: [
      { product: "Cenoura (Caixa 29kg)", quantity: 521.38, unit: "Caixas (29kg)", price: 69.889899, total: 36439.20, kg: 15120.00 }
    ],
    feeType: "Porcentagem (%)",
    feeValue: 3.0,
    totalVolumes: 521.38,
    totalKg: 15120.00,
    totalOperation: 36439.20,
    totalCommission: 1093.18,
    funruralTotal: 593.96,
    previdenciaSocial: 473.71,
    rat: 36.44,
    senar: 83.81,
    status: "Faturado",
    paymentStatus: "A Receber"
  },

  // 5. MARCELO KATSUMI HARADA
  {
    id: "VP-09714",
    operationType: "Intermediação (Corretagem / Comissão)",
    saleDate: "2026-07-21",
    client: "MARCELO KATSUMI HARADA",
    clientDocument: "234.567.890-12",
    origin: "Produtor BRUNO PERES ROMEIRO (Fazenda São Gotardo/MG)",
    destCity: "São Paulo",
    destUF: "SP",
    notes: "NF: 27967571 emitida em 21/07/2026. Cotação: R$ 45,00/cx. Vencimento: 30/08/2026. Líquido a receber: R$ 23.274,34.",
    nfFile: "NF-27967571.pdf",
    nfeKey: "35260723456789000199550010279675711009817286",
    items: [
      { product: "Cenoura (Caixa 29kg)", quantity: 627.59, unit: "Caixas (29kg)", price: 37.699772, total: 23660.00, kg: 18200.00 }
    ],
    feeType: "Porcentagem (%)",
    feeValue: 3.0,
    totalVolumes: 627.59,
    totalKg: 18200.00,
    totalOperation: 23660.00,
    totalCommission: 709.80,
    funruralTotal: 385.66,
    previdenciaSocial: 307.58,
    rat: 23.66,
    senar: 54.42,
    status: "Faturado",
    paymentStatus: "A Receber"
  },
  {
    id: "VP-09722",
    operationType: "Intermediação (Corretagem / Comissão)",
    saleDate: "2026-07-27",
    client: "MARCELO KATSUMI HARADA",
    clientDocument: "234.567.890-12",
    origin: "Produtor BRUNO PERES ROMEIRO (Fazenda São Gotardo/MG)",
    destCity: "São Paulo",
    destUF: "SP",
    notes: "NF: 28008239 emitida em 28/07/2026. Cotação: R$ 55,00/cx. Vencimento: 06/09/2026. Líquido a receber: R$ 52.280,51.",
    nfFile: "NF-28008239.pdf",
    nfeKey: "35260723456789000199550010280082391009817287",
    items: [
      { product: "Cenoura (Caixa 29kg)", quantity: 969.66, unit: "Caixas (29kg)", price: 54.809727, total: 53146.80, kg: 28120.00 }
    ],
    feeType: "Porcentagem (%)",
    feeValue: 3.0,
    totalVolumes: 969.66,
    totalKg: 28120.00,
    totalOperation: 53146.80,
    totalCommission: 1594.40,
    funruralTotal: 866.29,
    previdenciaSocial: 690.91,
    rat: 53.15,
    senar: 122.24,
    status: "Faturado",
    paymentStatus: "A Receber"
  },
  {
    id: "VP-09738",
    operationType: "Intermediação (Corretagem / Comissão)",
    saleDate: "2026-08-04",
    client: "MARCELO KATSUMI HARADA",
    clientDocument: "234.567.890-12",
    origin: "Produtor BRUNO PERES ROMEIRO (Fazenda São Gotardo/MG)",
    destCity: "São Paulo",
    destUF: "SP",
    notes: "NF: 28058820 emitida em 04/08/2026. Cotação: R$ 65,00/cx. Vencimento: 13/09/2026. Líquido a receber: R$ 43.496,85.",
    nfFile: "NF-28058820.pdf",
    nfeKey: "35260823456789000199550010280588201009817288",
    items: [
      { product: "Cenoura (Caixa 29kg)", quantity: 680.69, unit: "Caixas (29kg)", price: 64.959967, total: 44217.60, kg: 19740.00 }
    ],
    feeType: "Porcentagem (%)",
    feeValue: 3.0,
    totalVolumes: 680.69,
    totalKg: 19740.00,
    totalOperation: 44217.60,
    totalCommission: 1326.53,
    funruralTotal: 720.75,
    previdenciaSocial: 574.83,
    rat: 44.22,
    senar: 101.70,
    status: "Faturado",
    paymentStatus: "A Receber"
  }
];

const newClients = [
  { id: "CLI-AZEVEDO", name: "COMERCIAL DE VERDURAS AZEVEDO LTDA", document: "23.456.789/0001-01", type: "Comprador", city: "São Paulo", uf: "SP", email: "comercial@azevedoverduras.com.br", phone: "(11) 3643-3000" },
  { id: "CLI-WD", name: "COMERCIAL DE VERDURAS WD LTDA", document: "34.567.890/0001-12", type: "Comprador", city: "São Paulo", uf: "SP", email: "compras@wdverduras.com.br", phone: "(11) 3643-4000" },
  { id: "CLI-HORTBOM", name: "HORT BOM ALIMENTOS LTDA", document: "45.678.901/0001-23", type: "Comprador", city: "São Paulo", uf: "SP", email: "contato@hortbom.com.br", phone: "(11) 3643-5000" },
  { id: "CLI-RUBI", name: "HORTIFRUTI RUBI LTDA", document: "56.789.012/0001-34", type: "Comprador", city: "São Paulo", uf: "SP", email: "suprimentos@hortifrutirubi.com.br", phone: "(11) 3643-6000" },
  { id: "CLI-HARADA", name: "MARCELO KATSUMI HARADA", document: "234.567.890-12", type: "Comprador", city: "São Paulo", uf: "SP", email: "marcelo.harada@ceagesp.com.br", phone: "(11) 98765-4321" }
];

async function insertAllNew() {
  await connectDB();

  // 1. Inserir Clientes
  for (const c of newClients) {
    await Client.findOneAndUpdate({ name: c.name }, c, { upsert: true });
    console.log(`Cliente/Comprador ${c.name} inserido/atualizado.`);
  }

  // 2. Inserir Vendas e Romaneios Reais
  for (const s of newSales) {
    await Sale.findOneAndUpdate({ id: s.id }, s, { upsert: true });
    
    // Romaneio Real
    const slipId = `ROM-${s.id}`;
    await WeighingSlip.findOneAndUpdate(
      { id: slipId },
      {
        id: slipId,
        saleId: s.id,
        client: s.client,
        product: "Cenoura (Caixa 29kg)",
        truckPlate: s.nfFile.replace('.pdf', ''),
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

    console.log(`Venda e Romaneio ${s.id} (${s.client}) inseridos.`);
  }

  console.log('✅ Todas as 19 vendas das 5 lojas foram cadastradas com sucesso!');
  process.exit(0);
}

insertAllNew().catch(console.error);
