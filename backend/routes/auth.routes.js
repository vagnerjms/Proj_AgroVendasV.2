const express = require('express');
const router = express.Router();
const { User } = require('../db');
const { generateToken, hashPassword, comparePassword } = require('../middlewares/auth');

// Simple in-memory rate limiting map for login protection
const loginAttempts = new Map();

// POST /api/auth/login (Robust VPS & Local Login with bcrypt & JWT)
router.post('/login', async (req, res) => {
  try {
    const rawEmail = (req.body.email || '').trim().toLowerCase();
    const password = (req.body.password || '').trim();
    const ip = req.ip || req.connection.remoteAddress || 'unknown';

    // Rate limiting: Max 10 attempts per minute per IP
    const now = Date.now();
    const attempts = loginAttempts.get(ip) || [];
    const recentAttempts = attempts.filter(t => now - t < 60000);
    if (recentAttempts.length >= 10) {
      return res.status(429).json({ error: 'Muitas tentativas de login consecutivas. Aguarde 1 minuto.' });
    }
    recentAttempts.push(now);
    loginAttempts.set(ip, recentAttempts);

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
        password: hashPassword(password || 'Admin123!'),
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

    // Password validation with bcrypt + legacy fallback
    const defaultFactoryPasswords = ['admin', 'Admin123!', 'admin123', 'Agro@2026', ''];
    let isValid = comparePassword(password, user.password);

    if (!isValid && defaultFactoryPasswords.includes(user.password)) {
      isValid = defaultFactoryPasswords.includes(password);
    }

    if (!isValid) {
      return res.status(401).json({ error: 'Senha incorreta. Verifique e tente novamente.' });
    }

    // Auto-upgrade plain-text passwords to bcrypt hash upon successful login
    if (user.password && !user.password.startsWith('$2a$') && !user.password.startsWith('$2b$')) {
      user.password = hashPassword(password);
      await user.save();
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

    // Generate signed JWT Token
    const token = generateToken(userData);

    res.json({
      success: true,
      message: 'Login realizado com sucesso!',
      token: token,
      user: userData
    });
  } catch (err) {
    console.error('Erro no login:', err);
    res.status(500).json({ error: `Erro ao processar autenticação: ${err.message}` });
  }
});

module.exports = router;
