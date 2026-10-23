/**
 * Parse best-effort de comprovantes de pagamento (PDF texto / heurística).
 * OCR de imagem (tesseract) fica opcional — se não instalado, retorna confidence baixa.
 */
const fs = require('fs');
const path = require('path');

let pdfParseLib = null;
try {
  pdfParseLib = require('pdf-parse');
} catch (e) {
  /* optional */
}

async function extractTextFromPdf(filePath) {
  if (!pdfParseLib || !filePath) return '';
  const dataBuffer = await fs.promises.readFile(filePath);
  try {
    if (typeof pdfParseLib === 'function') {
      const res = await pdfParseLib(dataBuffer);
      return res?.text || '';
    }
    if (pdfParseLib?.default && typeof pdfParseLib.default === 'function') {
      const res = await pdfParseLib.default(dataBuffer);
      return res?.text || '';
    }
  } catch (e) {
    return '';
  }
  return '';
}

function parseMoneyBr(text) {
  if (!text) return null;
  const patterns = [
    /R\$\s*([\d.]+,\d{2})/i,
    /valor(?:\s+total)?[:\s]+R?\$?\s*([\d.]+,\d{2})/i,
    /\b([\d.]+,\d{2})\b/
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      const n = Number(String(m[1]).replace(/\./g, '').replace(',', '.'));
      if (Number.isFinite(n) && n > 0) return Math.round((n + Number.EPSILON) * 100) / 100;
    }
  }
  return null;
}

function parseDateBr(text) {
  if (!text) return null;
  const m = text.match(/(\d{2})[\/\-.](\d{2})[\/\-.](\d{2,4})/);
  if (!m) return null;
  let y = m[3];
  if (y.length === 2) y = `20${y}`;
  return `${y}-${m[2]}-${m[1]}`;
}

function detectMethod(text) {
  const t = String(text || '').toUpperCase();
  if (/\bPIX\b|E2E|END\s*TO\s*END|TXID/i.test(t)) return 'PIX';
  if (/\bTED\b|\bDOC\b|TRANSFER/i.test(t)) return 'TED/DOC';
  if (/\bCHEQUE\b|\bCHEQUES\b/i.test(t)) return 'Cheque';
  return null;
}

function extractTxid(text) {
  const m = String(text || '').match(/(?:E2E|TXID|ID)[:\s]*([A-Z0-9]{8,64})/i);
  return m ? m[1] : '';
}

/**
 * @param {string|null} filePath
 * @param {string} originalName
 * @param {{ remainingBalance?: number }} ctx
 */
async function parse(filePath, originalName = 'proof.pdf', ctx = {}) {
  const ext = path.extname(originalName || filePath || '').toLowerCase();
  let text = '';
  let source = 'filename_only';

  if (ext === '.pdf' && filePath) {
    text = await extractTextFromPdf(filePath);
    if (text && text.trim().length > 20) source = 'text_pdf';
  }

  // Imagem: tentativa OCR só se tesseract.js estiver disponível
  if ((!text || text.trim().length < 20) && filePath && /\.(jpe?g|png|webp)$/i.test(ext)) {
    try {
      const Tesseract = require('tesseract.js');
      const result = await Tesseract.recognize(filePath, 'por+eng', { logger: () => {} });
      text = result?.data?.text || '';
      if (text.trim().length > 20) source = 'ocr_image';
    } catch (e) {
      /* OCR não disponível — segue sem valor inventado */
    }
  }

  const paidAmount = parseMoneyBr(text);
  const paymentDate = parseDateBr(text);
  const paymentMethod = detectMethod(text);
  const txid = extractTxid(text);
  const remaining = Number(ctx.remainingBalance);
  let suggestedAmount = paidAmount;
  if (suggestedAmount != null && Number.isFinite(remaining) && remaining > 0 && suggestedAmount > remaining + 0.05) {
    suggestedAmount = null;
  }

  let confidence = 'none';
  if (source === 'text_pdf' && (suggestedAmount != null || paymentMethod)) confidence = 'high';
  else if (source === 'ocr_image' && suggestedAmount != null) confidence = 'medium';
  else if (paymentMethod || paymentDate) confidence = 'low';

  return {
    filename: path.basename(filePath || originalName || ''),
    originalName,
    suggested: {
      paidAmount: suggestedAmount,
      paymentDate: paymentDate || null,
      paymentMethod: paymentMethod || null,
      checkNumber: '',
      checkBank: '',
      notes: txid ? `TXID ${txid}` : ''
    },
    confidence,
    source,
    rawHints: { textLength: text.length }
  };
}

module.exports = { parse, parseMoneyBr, parseDateBr, detectMethod };
