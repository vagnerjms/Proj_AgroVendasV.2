/**
 * Resolve nomes de anexos no disco quando o Mongo aponta para um alias
 * (ex.: "VP012 - NF-28008239.pdf" vs "1790...-NF-28008239.pdf").
 */
const fs = require('fs');
const path = require('path');
const { uploadDir } = require('../middlewares/upload');
const { formatNfNumber } = require('./dataHelpers');

function stripUploadPrefix(name) {
  return String(name || '')
    .replace(/^\/?uploads\//i, '')
    .replace(/^\d+(?:-\d+)?-/, '');
}

/**
 * Basename seguro: sem path traversal.
 * @param {string} requested
 * @returns {string}
 */
function safeBasename(requested) {
  if (!requested) return '';
  let decoded = String(requested);
  try {
    decoded = decodeURIComponent(decoded);
  } catch (_) {
    // keep raw
  }
  const base = path.basename(decoded.replace(/\\/g, '/'));
  if (!base || base === '.' || base === '..' || base.includes('..')) return '';
  return base;
}

/**
 * Encontra o ficheiro no disco correspondente ao nome pedido.
 * Ordem: igualdade → endsWith → basename limpo → NF digits / NF-XXXXX.
 *
 * @param {string} requestedName - nome da URL ou campo da venda
 * @param {{ dir?: string, diskFiles?: string[] }} [opts]
 * @returns {{ filename: string, absolutePath: string } | null}
 */
function resolveUploadFile(requestedName, opts = {}) {
  const dir = opts.dir || uploadDir;
  const target = safeBasename(requestedName);
  if (!target) return null;

  if (!fs.existsSync(dir)) return null;

  const diskFiles = Array.isArray(opts.diskFiles)
    ? opts.diskFiles
    : fs.readdirSync(dir);

  const targetLower = target.toLowerCase();
  const cleanTarget = stripUploadPrefix(target).toLowerCase();
  const nfDigits = formatNfNumber(target);

  let match = diskFiles.find((df) => df === target);

  if (!match) {
    match = diskFiles.find((df) => df.endsWith(target) || target.endsWith(df));
  }
  if (!match && cleanTarget.length > 4) {
    match = diskFiles.find((df) => {
      const cleanDisk = stripUploadPrefix(df).toLowerCase();
      return (
        cleanDisk === cleanTarget
        || df.toLowerCase().includes(cleanTarget)
        || cleanTarget.includes(cleanDisk)
      );
    });
  }

  if (!match && nfDigits && nfDigits.length >= 6) {
    const nfToken = `nf-${nfDigits}`.toLowerCase();
    const nfHits = diskFiles.filter((df) => {
      const lower = df.toLowerCase();
      const clean = stripUploadPrefix(df).toLowerCase();
      return (
        lower.includes(nfToken)
        || clean.includes(nfToken)
        || formatNfNumber(df) === nfDigits
      );
    });
    if (nfHits.length === 1) {
      match = nfHits[0];
    } else if (nfHits.length > 1) {
      // Preferência: contém o basename pedido ou o VP prefix se houver
      const vpMatch = target.match(/^(VP\d+)/i);
      if (vpMatch) {
        const byVp = nfHits.find((df) => df.toUpperCase().includes(vpMatch[1].toUpperCase()));
        if (byVp) match = byVp;
      }
      if (!match) {
        match = nfHits.find((df) => stripUploadPrefix(df).toLowerCase().includes(targetLower.replace(/\s+/g, '')))
          || nfHits[0];
      }
    }
  }

  if (!match) return null;

  const absolutePath = path.join(dir, match);
  try {
    if (!fs.statSync(absolutePath).isFile()) return null;
  } catch (_) {
    return null;
  }

  return { filename: match, absolutePath };
}

/**
 * Versão async (readdir) para serviços que já leem o diretório.
 * @param {string} requestedName
 * @param {{ dir?: string }} [opts]
 */
async function resolveUploadFileAsync(requestedName, opts = {}) {
  const dir = opts.dir || uploadDir;
  const target = safeBasename(requestedName);
  if (!target || !fs.existsSync(dir)) return null;
  const diskFiles = await fs.promises.readdir(dir);
  return resolveUploadFile(target, { dir, diskFiles });
}

module.exports = {
  resolveUploadFile,
  resolveUploadFileAsync,
  safeBasename,
  stripUploadPrefix
};
