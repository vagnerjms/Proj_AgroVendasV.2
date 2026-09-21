const mongoose = require('mongoose');

const SaleSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  operationType: { type: String, required: true },
  saleDate: { type: String, required: true },
  client: { type: String, required: true },
  clientDocument: { type: String, default: '' },
  origin: { type: String, default: '' },
  destCity: { type: String, default: '' },
  destUF: { type: String, default: '' },
  notes: { type: String, default: '' },
  nfFile: { type: String, default: null },
  nfeKey: { type: String, default: '' },
  nfeDate: { type: String, default: '' },
  evidenceFile: { type: String, default: null },
  paymentProofFile: { type: String, default: null },
  freightType: { type: String, default: 'FOB (Retira na Origem)' },
  carrierName: { type: String, default: '' },
  truckPlate: { type: String, default: '' },
  driverName: { type: String, default: '' },
  driverCPF: { type: String, default: '' },
  freightPricePerUnit: { type: Number, default: 0 },
  qualityStandard: {
    maxHumidity: { type: Number, default: 14.0 },
    maxImpurity: { type: Number, default: 1.0 },
    maxDamaged: { type: Number, default: 8.0 }
  },
  items: [
    {
      product: { type: String, default: '' },
      quantity: { type: Number, default: 0 },
      unit: { type: String, default: 'Caixas (29kg)' },
      boxWeightKg: { type: Number, default: 29 },
      price: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
      kg: { type: Number, default: 0 },
      dailyQuote: { type: Number, default: 0 },
      valorTotalVP: { type: Number, default: 0 }
    }
  ],
  feeType: { type: String, default: 'Porcentagem (%)' },
  feeValue: { type: Number, default: 3.0 },
  dailyQuote: { type: Number, default: 0 },
  valorTotalVP: { type: Number, default: 0 },
  totalVolumes: { type: Number, default: 0 },
  totalKg: { type: Number, default: 0 },
  totalOperation: { type: Number, default: 0 },
  totalCommission: { type: Number, default: 0 },
  funruralTotal: { type: Number, default: 0 },
  previdenciaSocial: { type: Number, default: 0 },
  rat: { type: Number, default: 0 },
  senar: { type: Number, default: 0 },
  status: { type: String, default: 'Faturado' },
  paymentStatus: { type: String, default: 'A Receber' },
  paymentTerms: { type: String, default: '30 dias' },
  paymentTermDays: { type: Number, default: 30 },
  dueDate: { type: String, default: '' },
  paidAmount: { type: Number, default: 0 },
  paymentMethod: { type: String, default: 'PIX' },
  paymentHistory: [
    {
      amount: { type: Number, default: 0 },
      date: { type: String, default: '' },
      paymentMethod: { type: String, default: 'PIX' },
      checkNumber: { type: String, default: '' },
      checkBank: { type: String, default: '' },
      checkDueDate: { type: String, default: '' },
      paymentProofFile: { type: String, default: null },
      notes: { type: String, default: '' },
      createdAt: { type: Date, default: Date.now }
    }
  ],
  producerPaymentStatus: { type: String, default: 'A Pagar' },
  producerPaidAmount: { type: Number, default: 0 },
  producerPaymentMethod: { type: String, default: 'PIX' },
  producerPaymentProofFile: { type: String, default: null },
  producerPaymentHistory: [
    {
      amount: { type: Number, default: 0 },
      date: { type: String, default: '' },
      paymentMethod: { type: String, default: 'PIX' },
      checkNumber: { type: String, default: '' },
      checkBank: { type: String, default: '' },
      checkDueDate: { type: String, default: '' },
      paymentProofFile: { type: String, default: null },
      notes: { type: String, default: '' },
      createdAt: { type: Date, default: Date.now }
    }
  ],
  isDivergent: { type: Boolean, default: false },
  nfPending: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// Database Performance Indexes (B-Tree)
SaleSchema.index({ client: 1, saleDate: -1 });
SaleSchema.index(
  { nfeKey: 1 }, 
  { 
    unique: true, 
    sparse: true, 
    partialFilterExpression: { nfeKey: { $type: 'string', $gt: '' } } 
  }
);
SaleSchema.index({ origin: 1, saleDate: -1 });
SaleSchema.index({ saleDate: -1, status: 1 });
SaleSchema.index({ status: 1 });
SaleSchema.index({ paymentStatus: 1 });
SaleSchema.index({ producerPaymentStatus: 1 });
SaleSchema.index({ dueDate: 1 });

const Sale = mongoose.models.Sale || mongoose.model('Sale', SaleSchema);

module.exports = { SaleSchema, Sale };
