const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongodb:27017/agrovenda';

// --- SCHEMAS ---

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
  isDivergent: { type: Boolean, default: false },
  nfPending: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// Database Performance Indexes (B-Tree)
SaleSchema.index({ client: 1, saleDate: -1 });
SaleSchema.index({ nfeKey: 1 });
SaleSchema.index({ status: 1 });
SaleSchema.index({ paymentStatus: 1 });
SaleSchema.index({ dueDate: 1 });

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

const ProductSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  category: { type: String, default: 'Hortifruti' },
  defaultUnit: { type: String, default: 'Caixas (29kg)' },
  unitKg: { type: Number, default: 29 },
  currentStock: { type: Number, default: 0 },
  averageCost: { type: Number, default: 0 }
});
ProductSchema.index({ name: 1 });

const FinancialSummarySchema = new mongoose.Schema({
  totalAReceber: { type: Number, default: 1111058.01 },
  totalAPagar: { type: Number, default: 0.00 },
  vencidos: { type: Number, default: 0.00 },
  notasPendentes: { type: Number, default: 0 },
  divergentes: { type: Number, default: 0 }
});

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

ClientSchema.index({ document: 1 });

const Sale = mongoose.model('Sale', SaleSchema);
const WeighingSlip = mongoose.model('WeighingSlip', WeighingSlipSchema);
const Purchase = mongoose.model('Purchase', PurchaseSchema);
const Client = mongoose.model('Client', ClientSchema);
const Product = mongoose.model('Product', ProductSchema);
const FinancialSummary = mongoose.model('FinancialSummary', FinancialSummarySchema);
const User = mongoose.model('User', UserSchema);

// Atomic Counter Schema for concurrency-safe sequential IDs
const CounterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 }
});
const Counter = mongoose.model('Counter', CounterSchema);

/**
 * Atomically increments and returns the next sequential integer for a given domain.
 * Initializes from existing max IDs on first run to avoid collisions.
 */
async function getNextSequence(sequenceName, initModel = null, idPrefix = '') {
  let counter = await Counter.findById(sequenceName);

  if (!counter && initModel) {
    // Determine existing max sequence from collection
    const allDocs = await initModel.find({}, { id: 1 }).lean();
    let maxId = 0;
    for (const doc of allDocs) {
      if (doc.id) {
        const cleaned = doc.id.replace(idPrefix, '').replace(/^[^\d]+/, '');
        const num = parseInt(cleaned, 10);
        if (!isNaN(num) && num > maxId) maxId = num;
      }
    }
    counter = await Counter.findByIdAndUpdate(
      sequenceName,
      { $setOnInsert: { seq: maxId } },
      { new: true, upsert: true }
    );
  }

  const updated = await Counter.findByIdAndUpdate(
    sequenceName,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  return updated.seq;
}

/**
 * Recalibrates all atomic sequence counters based on the max existing IDs in each collection.
 * Prevents E11000 duplicate key errors after restores or manual database edits.
 */
async function recalibrateCounters() {
  const domains = [
    { name: 'sale_vp_id', model: Sale, prefix: 'VP' },
    { name: 'purchase_id', model: Purchase, prefix: 'CMP-2026-' },
    { name: 'client_id', model: Client, prefix: 'CLI-' },
    { name: 'product_id', model: Product, prefix: 'PROD-' },
    { name: 'user_id', model: User, prefix: 'USR-' }
  ];

  for (const d of domains) {
    try {
      const allDocs = await d.model.find({}, { id: 1 }).lean();
      let maxId = 0;
      for (const doc of allDocs) {
        if (doc.id) {
          const cleaned = doc.id.replace(d.prefix, '').replace(/^[^\d]+/, '');
          const num = parseInt(cleaned, 10);
          if (!isNaN(num) && num > maxId) maxId = num;
        }
      }
      await Counter.findByIdAndUpdate(
        d.name,
        { seq: maxId },
        { upsert: true, new: true }
      );
    } catch (e) {
      console.warn(`Aviso ao recalibrar contador ${d.name}:`, e.message);
    }
  }
}

async function connectDB() {
  const options = {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10000
  };

  const tryConnect = async (retries = 5, delay = 3000) => {
    for (let i = 0; i < retries; i++) {
      try {
        await mongoose.connect(MONGO_URI, options);
        console.log(`🌾 [MongoDB] Conectado ao MongoDB em ${MONGO_URI}`);
        return;
      } catch (err) {
        console.warn(`⏳ [MongoDB] Tentativa ${i + 1}/${retries} falhou (${err.message}). Tentando novamente em ${delay/1000}s...`);
        await new Promise(res => setTimeout(res, delay));
      }
    }
  };

  await tryConnect();

  // Auto-seed default Administrator if missing
  try {
    const adminExists = await User.findOne({ 
      $or: [
        { email: 'admin@agrovenda.com.br' },
        { role: 'Administrador Geral' }
      ]
    });
    if (!adminExists) {
      const defaultAdmin = new User({
        id: 'USR-001',
        name: 'Administrador AgroVenda',
        email: 'admin@agrovenda.com.br',
        password: 'admin',
        role: 'Administrador Geral',
        phone: '(62) 99999-0001',
        status: 'Ativo',
        permissions: {
          dashboard: true,
          comercial_compras: true,
          comercial_vendas: true,
          romaneios_pesagem: true,
          agenda_alertas: true,
          relatorios: true,
          financeiro_fiscal: true,
          cadastros_clients: true,
          cadastros_products: true,
          cadastros_users: true,
          backup_sistema: true
        }
      });
      await defaultAdmin.save();
      console.log('🌾 [MongoDB] Administrador padrão inicializado com sucesso (admin@agrovenda.com.br / admin)');
    }
    // Auto-recalibrate atomic counters on startup to avoid collision
    await recalibrateCounters();
  } catch (seedErr) {
    console.warn('Aviso: erro ao verificar administrador padrão:', seedErr.message);
  }
}

module.exports = {
  connectDB,
  Sale,
  WeighingSlip,
  Purchase,
  Client,
  Product,
  FinancialSummary,
  User,
  Counter,
  getNextSequence,
  recalibrateCounters
};
