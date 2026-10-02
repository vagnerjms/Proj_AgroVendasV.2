process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_agrovenda_ci_2026';

const { User } = require('../models');
const { hashPassword, generateToken } = require('../middlewares/auth');

const ADMIN_PERMS = {
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
};

async function ensureAdmin(overrides = {}) {
  const email = overrides.email || 'admin@agrovenda.com.br';
  let user = await User.findOne({ email });
  if (user) return user;
  user = await User.create({
    id: overrides.id || 'USR-001',
    name: overrides.name || 'Administrador AgroVenda',
    email,
    password: await hashPassword(overrides.password || 'Admin123!'),
    role: overrides.role || 'Administrador Geral',
    phone: '(62) 99999-0001',
    status: overrides.status || 'Ativo',
    permissions: overrides.permissions || ADMIN_PERMS
  });
  return user;
}

async function authHeader(userOverrides = {}) {
  const user = await ensureAdmin(userOverrides);
  const token = generateToken({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    permissions: user.permissions || ADMIN_PERMS
  });
  return {
    headers: { Authorization: `Bearer ${token}` },
    Authorization: `Bearer ${token}`,
    user,
    token
  };
}

function mockRes() {
  const res = {
    statusCode: 200,
    body: null,
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    setHeader() {
      return this;
    }
  };
  return res;
}

module.exports = {
  ADMIN_PERMS,
  ensureAdmin,
  authHeader,
  mockRes
};
