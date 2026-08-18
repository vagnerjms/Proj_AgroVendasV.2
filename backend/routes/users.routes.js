const express = require('express');
const router = express.Router();
const { User, getNextSequence } = require('../db');

// GET /api/users
router.get('/', async (req, res) => {
  try {
    let users = await User.find().sort({ createdAt: -1 });
    if (users.length === 0) {
      const defaultAdmin = new User({
        id: 'USR-001',
        name: 'Administrador AgroVenda',
        email: 'admin@agrovenda.com.br',
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
      users = [defaultAdmin];
    }
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar usuários' });
  }
});

// POST /api/users
router.post('/', async (req, res) => {
  try {
    const nextSeq = await getNextSequence('user_id', User, 'USR-');
    const newUser = new User({
      id: `USR-${String(nextSeq).padStart(3, '0')}`,
      name: req.body.name,
      email: req.body.email,
      password: req.body.password || 'Agro@2026',
      role: req.body.role || 'Operador Comercial',
      phone: req.body.phone || '',
      status: req.body.status || 'Ativo',
      permissions: req.body.permissions || {
        dashboard: true,
        comercial_compras: true,
        comercial_vendas: true,
        romaneios_pesagem: true,
        agenda_alertas: true,
        relatorios: true,
        financeiro_fiscal: true,
        cadastros_clients: true,
        cadastros_products: true,
        cadastros_users: false,
        backup_sistema: false
      }
    });
    await newUser.save();
    res.status(201).json(newUser);
  } catch (err) {
    res.status(500).json({ error: `Erro ao cadastrar usuário: ${err.message}` });
  }
});

// PUT /api/users/:id
router.put('/:id', async (req, res) => {
  try {
    const updateData = { ...req.body };
    if (!updateData.password) {
      delete updateData.password;
    }
    const updated = await User.findOneAndUpdate(
      { id: req.params.id },
      updateData,
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
});

// DELETE /api/users/:id
router.delete('/:id', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    if (totalUsers <= 1) {
      return res.status(400).json({ error: 'Não é possível excluir o único usuário do sistema.' });
    }
    const deleted = await User.findOneAndDelete({ id: req.params.id });
    if (!deleted) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json({ success: true, message: 'Usuário excluído com sucesso' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir usuário' });
  }
});

module.exports = router;
