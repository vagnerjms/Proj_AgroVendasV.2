const { User } = require('../models');
const { recalibrateCounters } = require('./sequence.service');
const { hashPassword } = require('../middlewares/auth');

/**
 * Executa tarefas de inicialização pós-conexão com o banco de dados:
 * 1. Auto-seed do Administrador Padrão (se não existir nenhum)
 * 2. Recalibração de contadores atômicos para evitar colisões de ID
 * 3. Sincronização inicial de catálogo de produtos com base nas vendas
 */
async function initializeDatabase() {
  // 1. Auto-seed default Administrator if missing
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
        password: await hashPassword('Admin123!'),
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
      console.log('🌾 [MongoDB] Administrador padrão inicializado com sucesso (admin@agrovenda.com.br / Admin123!)');
    }

    // 2. Auto-recalibrate atomic counters on startup to avoid collision
    await recalibrateCounters();

    // 3. Auto-sincroniza todos os produtos das vendas existentes para o catálogo de Produtos
    try {
      const { syncAllSalesProducts } = require('./product.service');
      await syncAllSalesProducts();
    } catch (prodSyncErr) {
      console.warn('Aviso ao sincronizar catálogo de produtos:', prodSyncErr.message);
    }
  } catch (seedErr) {
    console.warn('Aviso: erro ao executar bootstrap inicial:', seedErr.message);
  }
}

module.exports = {
  initializeDatabase
};
