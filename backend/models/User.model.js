const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'Operador Comercial' },
  phone: { type: String, default: '' },
  status: { type: String, default: 'Ativo' },
  permissions: {
    dashboard: { type: Boolean, default: true },
    comercial_compras: { type: Boolean, default: true },
    comercial_vendas: { type: Boolean, default: true },
    romaneios_pesagem: { type: Boolean, default: true },
    agenda_alertas: { type: Boolean, default: true },
    relatorios: { type: Boolean, default: true },
    financeiro_fiscal: { type: Boolean, default: true },
    cadastros_clients: { type: Boolean, default: true },
    cadastros_products: { type: Boolean, default: true },
    cadastros_users: { type: Boolean, default: false },
    backup_sistema: { type: Boolean, default: false }
  },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);

module.exports = { UserSchema, User };
