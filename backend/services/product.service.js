const { Product, Sale, getNextSequence } = require('../db');

/**
 * Garante que todos os produtos importados de uma NF-e ou incluídos em uma Venda
 * estejam devidamente cadastrados na coleção Product (Catálogo de Produtos).
 */
async function ensureProductsRegistered(items) {
  if (!items || !Array.isArray(items) || items.length === 0) return [];
  const registeredOrFound = [];

  for (const it of items) {
    const rawName = (it.product || it.name || '').trim();
    if (!rawName) continue;

    try {
      // Procura se já existe produto com nome idêntico (case-insensitive)
      let existing = await Product.findOne({
        name: { $regex: new RegExp(`^${rawName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
      });

      if (!existing) {
        const seq = await getNextSequence('product_id', Product, 'PROD-');
        const descLower = rawName.toLowerCase();
        let cat = 'Hortifruti';
        if (descLower.includes('soja') || descLower.includes('milho') || descLower.includes('trigo') || descLower.includes('sorgo')) {
          cat = 'Grãos';
        }

        let defUnit = it.unit || 'Caixas (29kg)';
        let unitW = Number(it.boxWeightKg) || (descLower.includes('batata') ? 25 : (descLower.includes('granel') ? 1 : 29));

        if (descLower.includes('batata')) {
          defUnit = it.unit || 'Sacas (25kg)';
          unitW = Number(it.boxWeightKg) || 25;
        } else if (descLower.includes('cebola')) {
          defUnit = it.unit || 'Granel (kg)';
          unitW = Number(it.boxWeightKg) || 1;
        } else if (descLower.includes('beterraba')) {
          defUnit = it.unit || 'Caixas (20kg)';
          unitW = Number(it.boxWeightKg) || 20;
        }

        const avgPrice = Number(it.price) || Number(it.pricePerKg) || (Number(it.kg) > 0 && Number(it.total) > 0 ? Number(it.total) / Number(it.kg) : 0);

        existing = new Product({
          id: `PROD-${seq}`,
          name: rawName,
          category: cat,
          defaultUnit: defUnit,
          unitKg: unitW,
          currentStock: 0,
          averageCost: Number(avgPrice.toFixed(2)) || 0
        });

        await existing.save();
        console.log(`🌾 [Catálogo de Produtos] Novo produto importado da NF cadastrado: "${rawName}" (${existing.id})`);
      }

      registeredOrFound.push(existing);
    } catch (err) {
      console.warn(`Aviso ao auto-cadastrar produto "${rawName}":`, err.message);
    }
  }

  return registeredOrFound;
}

/**
 * Sincroniza e auto-cadastra retroativamente todos os produtos presentes em vendas existentes.
 */
async function syncAllSalesProducts() {
  try {
    const sales = await Sale.find({}, { items: 1 }).lean();
    const allItems = [];
    for (const s of sales) {
      if (s.items && Array.isArray(s.items)) {
        allItems.push(...s.items);
      }
    }
    if (allItems.length > 0) {
      await ensureProductsRegistered(allItems);
    }
  } catch (err) {
    console.warn('Aviso ao sincronizar catálogo de produtos a partir das vendas:', err.message);
  }
}

module.exports = {
  ensureProductsRegistered,
  syncAllSalesProducts
};
