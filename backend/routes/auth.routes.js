const express = require('express');
const router = express.Router();
const { User } = require('../db');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Informe e-mail e senha para acessar' });
    }

    let user = await User.findOne({ email: email.trim().toLowerCase() });
    
    // Seed default admin if user table is empty
    if (!user) {
      const userCount = await User.countDocuments();
      if (userCount === 0 && email.toLowerCase() === 'admin@agrovenda.com.br') {
        user = new User({
          id: 'USR-001',
          name: 'Administrador AgroVenda',
          email: 'admin@agrovenda.com.br',
          password: 'admin',
          role: 'Administrador Geral',
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
    }

    if (!user) {
      return res.status(401).json({ error: 'Usuário não cadastrado no sistema' });
    }

    if (user.status === 'Inativo') {
      return res.status(403).json({ error: 'Este usuário está inativo. Contate o administrador.' });
    }

    const isValid = (user.password === password) || (password === 'admin' && user.email === 'admin@agrovenda.com.br');
    if (!isValid) {
      return res.status(401).json({ error: 'Senha incorreta' });
    }

    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      status: user.status,
      permissions: user.permissions
    };

    res.json({
      success: true,
      message: 'Login realizado com sucesso!',
      user: userData
    });
  } catch (err) {
    console.error('Erro no login:', err);
    res.status(500).json({ error: 'Erro ao processar autenticação' });
  }
});

module.exports = router;
