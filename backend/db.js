const mongoose = require('mongoose');
const {
  Sale,
  SaleSchema,
  Client,
  ClientSchema,
  Product,
  ProductSchema,
  WeighingSlip,
  WeighingSlipSchema,
  Purchase,
  PurchaseSchema,
  User,
  UserSchema,
  Counter,
  CounterSchema,
  FinancialSummary,
  FinancialSummarySchema
} = require('./models');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongodb:27017/agrovenda';

/**
 * Atomically increments and returns the next sequential integer for a given domain.
 * Initializes from existing max IDs on first run to avoid collisions.
 */
async function getNextSequence(sequenceName, initModel = null, idPrefix = '') {
  let counter = await Counter.findById(sequenceName);

  if (!counter && initModel) {
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

    // Auto-sincroniza todos os produtos das vendas existentes para o catálogo de Produtos
    try {
      const { syncAllSalesProducts } = require('./services/product.service');
      await syncAllSalesProducts();
    } catch (prodSyncErr) {
      console.warn('Aviso ao sincronizar catálogo de produtos:', prodSyncErr.message);
    }
  } catch (seedErr) {
    console.warn('Aviso: erro ao verificar administrador padrão:', seedErr.message);
  }
}

module.exports = {
  connectDB,
  Sale,
  SaleSchema,
  WeighingSlip,
  WeighingSlipSchema,
  Purchase,
  PurchaseSchema,
  Client,
  ClientSchema,
  Product,
  ProductSchema,
  FinancialSummary,
  FinancialSummarySchema,
  User,
  UserSchema,
  Counter,
  CounterSchema,
  getNextSequence,
  recalibrateCounters
};
