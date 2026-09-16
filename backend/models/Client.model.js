const mongoose = require('mongoose');

const ClientSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  document: { type: String, default: '' },
  ie: { type: String, default: '' },
  type: { type: String, default: 'Comprador' },
  city: { type: String, default: '' },
  uf: { type: String, default: '' },
  address: { type: String, default: '' },
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
  bankName: { type: String, default: '' },
  agency: { type: String, default: '' },
  account: { type: String, default: '' },
  pixKey: { type: String, default: '' }
});

ClientSchema.index({ name: 1 });
ClientSchema.index({ document: 1 });

const Client = mongoose.models.Client || mongoose.model('Client', ClientSchema);

module.exports = { ClientSchema, Client };
