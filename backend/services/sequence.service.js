const { Counter, Sale, Purchase, Client, Product, User, WeighingSlip } = require('../models');

/**
 * Incrementa atomicamente e retorna o próximo número inteiro sequencial para um domínio.
 * Inicializa a partir do maior ID existente no primeiro uso para evitar colisões.
 * 
 * @param {string} sequenceName - Identificador da sequência no Counter (ex: 'sale_vp_id')
 * @param {object} initModel - Modelo Mongoose opcional para calibrar valor inicial
 * @param {string} idPrefix - Prefixo do ID a ser desconsiderado na conversão numérica
 * @returns {Promise<number>} Próximo número sequencial
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
 * Recalibra todos os contadores sequenciais atômicos baseando-se nos maiores IDs
 * existentes em cada coleção. Previne erros E11000 de chave duplicada após restores
 * ou edições manuais no banco de dados.
 */
async function recalibrateCounters() {
  const domains = [
    { name: 'sale_vp_id', model: Sale, prefix: 'VP' },
    { name: 'purchase_id', model: Purchase, prefix: 'CMP-2026-' },
    { name: 'client_id', model: Client, prefix: 'CLI-' },
    { name: 'product_id', model: Product, prefix: 'PROD-' },
    { name: 'user_id', model: User, prefix: 'USR-' },
    { name: 'weighing_slip_id', model: WeighingSlip, prefix: 'ROM-VP' }
  ];

  for (const d of domains) {
    try {
      if (!d.model) continue;
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

module.exports = {
  getNextSequence,
  recalibrateCounters
};
