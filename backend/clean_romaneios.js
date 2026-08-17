const { connectDB, WeighingSlip } = require('./db');

async function cleanSimulatedSlips() {
  await connectDB();

  // Delete all slips
  const del = await WeighingSlip.deleteMany({});
  console.log(`Romaneios excluídos: ${del.deletedCount}`);

  // Insert only real romaneios from the Badin Favilla VP spreadsheet
  const realSlips = [
    {
      id: "ROM-VP-09718",
      saleId: "VP-09718",
      client: "BADIN FAVILLA HORTIFRUTI LTDA",
      product: "Cenoura (Caixa 29kg)",
      truckPlate: "NF-27980432",
      driverName: "Transportador Bruno Peres Romeiro",
      date: "2026-07-22",
      originWeightKg: 15810,
      destWeightKg: 15810,
      humidityPct: 14.0,
      impurityPct: 1.0,
      discountKg: 0,
      netWeightKg: 15810,
      weightDifferenceKg: 0,
      weightDifferencePct: 0.0,
      tolerancePct: 0.25,
      status: "Aprovado",
      resolutionNotes: "Romaneio real com peso de origem e destino 100% conferido (545,17 caixas de 29kg)."
    },
    {
      id: "ROM-VP-09720",
      saleId: "VP-09720",
      client: "BADIN FAVILLA HORTIFRUTI LTDA",
      product: "Cenoura (Caixa 29kg)",
      truckPlate: "NF-27999635",
      driverName: "Transportador Bruno Peres Romeiro",
      date: "2026-07-24",
      originWeightKg: 15998,
      destWeightKg: 15998,
      humidityPct: 14.0,
      impurityPct: 1.0,
      discountKg: 0,
      netWeightKg: 15998,
      weightDifferenceKg: 0,
      weightDifferencePct: 0.0,
      tolerancePct: 0.25,
      status: "Aprovado",
      resolutionNotes: "Romaneio real com peso de origem e destino 100% conferido (551,66 caixas de 29kg)."
    },
    {
      id: "ROM-VP-09728",
      saleId: "VP-09728",
      client: "BADIN FAVILLA HORTIFRUTI LTDA",
      product: "Cenoura (Caixa 29kg)",
      truckPlate: "NF-28024828",
      driverName: "Transportador Bruno Peres Romeiro",
      date: "2026-07-29",
      originWeightKg: 16750,
      destWeightKg: 16750,
      humidityPct: 14.0,
      impurityPct: 1.0,
      discountKg: 0,
      netWeightKg: 16750,
      weightDifferenceKg: 0,
      weightDifferencePct: 0.0,
      tolerancePct: 0.25,
      status: "Aprovado",
      resolutionNotes: "Romaneio real com peso de origem e destino 100% conferido (577,59 caixas de 29kg)."
    },
    {
      id: "ROM-VP-09732",
      saleId: "VP-09732",
      client: "BADIN FAVILLA HORTIFRUTI LTDA",
      product: "Cenoura (Caixa 29kg)",
      truckPlate: "NF-28042900",
      driverName: "Transportador Bruno Peres Romeiro",
      date: "2026-08-01",
      originWeightKg: 15135,
      destWeightKg: 15135,
      humidityPct: 14.0,
      impurityPct: 1.0,
      discountKg: 0,
      netWeightKg: 15135,
      weightDifferenceKg: 0,
      weightDifferencePct: 0.0,
      tolerancePct: 0.25,
      status: "Aprovado",
      resolutionNotes: "Romaneio real com peso de origem e destino 100% conferido (521,90 caixas de 29kg)."
    }
  ];

  await WeighingSlip.insertMany(realSlips);
  console.log(`✅ ${realSlips.length} Romaneios reais inseridos com sucesso!`);
  process.exit(0);
}

cleanSimulatedSlips().catch(console.error);
