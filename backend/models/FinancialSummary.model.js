const mongoose = require('mongoose');

const FinancialSummarySchema = new mongoose.Schema({
  totalAReceber: { type: Number, default: 1111058.01 },
  totalAPagar: { type: Number, default: 0.00 },
  vencidos: { type: Number, default: 0.00 },
  notasPendentes: { type: Number, default: 0 },
  divergentes: { type: Number, default: 0 }
});

const FinancialSummary = mongoose.models.FinancialSummary || mongoose.model('FinancialSummary', FinancialSummarySchema);

module.exports = { FinancialSummarySchema, FinancialSummary };
