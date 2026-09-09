const express = require('express');
const router = express.Router();
const { User, getNextSequence } = require('../db');
const { hashPassword, requireAuth, requirePermission } = require('../middlewares/auth');

// Protect all user management endpoints with authentication and RBAC
router.use(requireAuth);
router.use(requirePermission('cadastros_users'));

// Sanitizador para nunca expor senhas na saída JSON
const sanitizeUser = (u) => {
  const obj = u && u.toObject ? u.toObject() : { ...u };
  if (obj) delete obj.password;
  return obj;
};

// GET /api/users
router.get('/', async (req, res) => {
  try {
    let users = await User.find({}, '-password').sort({ createdAt: -1 }).lean();
    if (users.length === 0) {
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
      users = [sanitizeUser(defaultAdmin)];
    }
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar usuários' });
  }
});

// POST /api/users
router.post('/', async (req, res) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ error: 'O e-mail é obrigatório.' });

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: `O e-mail ${email} já está em uso por outro colaborador.` });
    }

    const nextSeq = await getNextSequence('user_id', User, 'USR-');
    const newUser = new User({
      id: `USR-${String(nextSeq).padStart(3, '0')}`,
      name: req.body.name,
      email: email,
      password: await hashPassword(req.body.password || 'Agro@2026'),
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
    res.status(201).json(sanitizeUser(newUser));
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
    } else {
      updateData.password = await hashPassword(updateData.password);
    }
    if (updateData.email) {
      updateData.email = updateData.email.trim().toLowerCase();
    }

    const updated = await User.findOneAndUpdate(
      { id: req.params.id },
      updateData,
      { new: true, select: '-password' }
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
    const target = await User.findOne({ id: req.params.id });
    if (!target) return res.status(404).json({ error: 'Usuário não encontrado.' });

    // Proteção contra auto-exclusão
    if (req.user && req.user.id === target.id) {
      return res.status(400).json({ error: 'Não é permitido excluir o próprio usuário logado.' });
    }

    // Proteção para não apagar o último Administrador Geral ativo
    if (target.role === 'Administrador Geral') {
      const adminCount = await User.countDocuments({ role: 'Administrador Geral', status: 'Ativo' });
      if (adminCount <= 1) {
        return res.status(400).json({ error: 'Não é permitido excluir o único Administrador Geral ativo do sistema.' });
      }
    }

    await User.deleteOne({ id: req.params.id });
    res.json({ success: true, message: 'Usuário excluído com sucesso', id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir usuário.' });
  }
});

module.exports = router;
