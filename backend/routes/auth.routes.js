const express = require('express');
const router = express.Router();
const { User } = require('../db');

// POST /api/auth/login (Robust VPS & Local Login)
router.post('/login', async (req, res) => {
  try {
    const rawEmail = (req.body.email || '').trim().toLowerCase();
    const password = (req.body.password || '').trim();

    if (!rawEmail || !password) {
      return res.status(400).json({ error: 'Informe e-mail e senha para acessar' });
    }

    const isAdminAlias = ['admin', 'admin@agrovenda.com.br', 'admin@agrovenda.local'].includes(rawEmail);

    let user = await User.findOne({
      $or: [
        { email: rawEmail },
        ...(isAdminAlias ? [{ email: 'admin@agrovenda.com.br' }, { email: 'admin@agrovenda.local' }, { role: 'Administrador Geral' }] : [])
      ]
    });

    // Auto-seed or repair Default Admin if missing
    if (!user && isAdminAlias) {
      user = new User({
        id: 'USR-001',
        name: 'Administrador AgroVenda',
        email: 'admin@agrovenda.com.br',
        password: password || 'admin',
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
      await user.save();
    }

    if (!user) {
      return res.status(401).json({ error: 'Usuário não cadastrado no sistema.' });
    }

    if (user.status === 'Inativo') {
      return res.status(403).json({ error: 'Este usuário está inativo. Contate o administrador.' });
    }

    // Password validation:
    // If the administrator has configured a custom password, enforce it strictly for security.
    // If the administrator is still using a default factory password, allow the initial setup fallbacks.
    const defaultFactoryPasswords = ['admin', 'Admin123!', 'admin123', 'Agro@2026', ''];
    const isCustomPasswordSet = user.password && !defaultFactoryPasswords.includes(user.password);

    let isValid = false;
    if (isCustomPasswordSet) {
      isValid = (user.password === password);
    } else {
      isValid = (user.password === password) || defaultFactoryPasswords.includes(password);
    }

    if (!isValid) {
      return res.status(401).json({ error: 'Senha incorreta. Verifique e tente novamente.' });
    }

    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      status: user.status,
      permissions: user.permissions || {
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
    };

    res.json({
      success: true,
      message: 'Login realizado com sucesso!',
      user: userData
    });
  } catch (err) {
    console.error('Erro no login:', err);
    res.status(500).json({ error: `Erro ao processar autenticação: ${err.message}` });
  }
});

module.exports = router;
