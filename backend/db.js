const mongoose = require('mongoose');
const models = require('./models');
const { getNextSequence, recalibrateCounters } = require('./services/sequence.service');
const { initializeDatabase } = require('./services/bootstrap.service');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongodb:27017/agrovenda';

/**
 * Conexão resiliente ao MongoDB com retentativas automáticas
 */
async function connectDB() {
  const options = {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10000,
    autoIndex: false
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
  await initializeDatabase();
}

module.exports = {
  connectDB,
  mongoose,
  getNextSequence,
  recalibrateCounters,
  // Re-exportação limpa de todos os modelos para manter total retrocompatibilidade
  ...models
};
