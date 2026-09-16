const mongoose = require('mongoose');

const WeighingSlipSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  saleId: { type: String, default: '' },
  client: { type: String, required: true },
  product: { type: String, default: 'Cenoura (Caixa 29kg)' },
  truckPlate: { type: String, required: true },
  driverName: { type: String, default: 'Motorista' },
  date: { type: String, required: true },
  originWeightKg: { type: Number, required: true },
  destWeightKg: { type: Number, required: true },
  humidityPct: { type: Number, default: 14.0 },
  impurityPct: { type: Number, default: 1.0 },
  discountKg: { type: Number, default: 0 },
  netWeightKg: { type: Number, required: true },
  weightDifferenceKg: { type: Number, default: 0 },
  weightDifferencePct: { type: Number, default: 0 },
  tolerancePct: { type: Number, default: 0.25 },
  status: { type: String, default: 'Aprovado' },
  resolutionNotes: { type: String, default: '' },
  resolvedAt: { type: Date, default: null },
  ticketImage: { type: String, default: '' },
  attachment: { type: String, default: '' }
});

WeighingSlipSchema.index({ saleId: 1 });
WeighingSlipSchema.index({ client: 1, date: -1 });
WeighingSlipSchema.index({ status: 1 });

const WeighingSlip = mongoose.models.WeighingSlip || mongoose.model('WeighingSlip', WeighingSlipSchema);

module.exports = { WeighingSlipSchema, WeighingSlip };
