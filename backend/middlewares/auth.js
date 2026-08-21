const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'agrovenda_super_secure_jwt_secret_2026_agro_v2';

/**
 * Generates a signed JWT for an authenticated user (valid for 7 days).
 */
function generateToken(user) {
  const payload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    permissions: user.permissions || {}
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

/**
 * Hashes a plaintext password using bcrypt (10 rounds).
 */
function hashPassword(plainPassword) {
  if (!plainPassword) return '';
  if (plainPassword.startsWith('$2a$') || plainPassword.startsWith('$2b$')) {
    return plainPassword; // Already hashed
  }
  return bcrypt.hashSync(plainPassword, 10);
}

/**
 * Compares plaintext password with stored password (bcrypt or legacy plaintext).
 */
function comparePassword(plainPassword, storedPassword) {
  if (!plainPassword || !storedPassword) return false;
  if (storedPassword.startsWith('$2a$') || storedPassword.startsWith('$2b$')) {
    return bcrypt.compareSync(plainPassword, storedPassword);
  }
  // Fallback for legacy plain text entries during transition
  return plainPassword === storedPassword;
}

/**
 * Middleware: Enforces strict JWT Bearer authentication on protected endpoints.
 * Returns 401 if missing, 403 if invalid or expired.
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = (authHeader && authHeader.startsWith('Bearer ')) 
    ? authHeader.split(' ')[1] 
    : req.query.token;

  if (!token) {
    return res.status(401).json({ error: 'Acesso não autorizado. Faça login para continuar.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Sessão expirada ou token inválido. Por favor, faça login novamente.' });
    }
    req.user = user;
    next();
  });
}

// Backward-compatible alias
const authenticateToken = requireAuth;

/**
 * Middleware: Enforces Granular Role-Based Access Control (RBAC).
 */
function requirePermission(permissionKey) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuário não autenticado.' });
    }
    // Administrador Geral has unrestricted access
    if (req.user.role === 'Administrador Geral') {
      return next();
    }
    if (req.user.permissions && req.user.permissions[permissionKey] === true) {
      return next();
    }
    return res.status(403).json({ 
      error: `Acesso negado. Seu perfil de usuário não possui autorização para o módulo: ${permissionKey}` 
    });
  };
}

/**
 * Middleware: Enforces strictly Administrador Geral role.
 */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'Administrador Geral') {
    return res.status(403).json({ error: 'Acesso negado. Ação restrita ao Administrador Geral.' });
  }
  next();
}

module.exports = {
  JWT_SECRET,
  generateToken,
  hashPassword,
  comparePassword,
  requireAuth,
  authenticateToken,
  requirePermission,
  requireAdmin
};
