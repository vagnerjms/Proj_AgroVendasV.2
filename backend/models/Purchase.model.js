const mongoose = require('mongoose');

const PurchaseSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  producer: { type: String, required: true },
  date: { type: String, required: true },
  product: { type: String, required: true },
  quantity: { type: Number, default: 0 },
  unit: { type: String, default: 'Sacas (60kg)' },
  unitPrice: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  status: { type: String, default: 'Recebido' },
  paymentStatus: { type: String, default: 'A Pagar' },
  paidAmount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

PurchaseSchema.index({ producer: 1, date: -1 });

const Purchase = mongoose.models.Purchase || mongoose.model('Purchase', PurchaseSchema);

module.exports = { PurchaseSchema, Purchase };
