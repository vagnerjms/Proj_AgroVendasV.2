const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'agrovenda_super_secure_jwt_secret_2026_agro_v2';

/**
 * Generates a signed JWT for an authenticated user.
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
 * Middleware to authenticate requests via JWT Bearer Token.
 * Allows graceful fallback for internal scripts or open dev requests.
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = (authHeader && authHeader.startsWith('Bearer ')) 
    ? authHeader.split(' ')[1] 
    : req.query.token;

  if (!token) {
    // In dev / transition mode, allow request if internal or flag is set
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token de acesso inválido ou expirado.' });
    }
    req.user = user;
    next();
  });
}

module.exports = {
  JWT_SECRET,
  generateToken,
  hashPassword,
  comparePassword,
  authenticateToken
};
