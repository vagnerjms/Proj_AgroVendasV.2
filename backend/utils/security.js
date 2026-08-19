/**
 * Security & Sanitization Utilities for AgroVenda V2 Backend
 */

/**
 * Escapes special regular expression characters to prevent ReDoS (Regex Denial of Service)
 * and SyntaxErrors when parsing user search queries.
 */
function escapeRegex(text) {
  if (!text || typeof text !== 'string') return '';
  return text.trim().replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

/**
 * Sanitizes generic user text inputs (prevents null-byte and trims whitespace).
 */
function sanitizeInput(str, maxLength = 255) {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/\0/g, '').trim().substring(0, maxLength);
}

module.exports = {
  escapeRegex,
  sanitizeInput
};
