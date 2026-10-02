/**
 * Helpers canônicos backend: NF só dígitos, romaneio 097xxx.
 */

function formatNfNumber(nfFileOrKey) {
  if (!nfFileOrKey) return '';
  const raw = String(nfFileOrKey).trim();
  if (!raw) return '';

  const digitsOnly = raw.replace(/\D/g, '');
  if (digitsOnly.length === 44) {
    return digitsOnly.slice(25, 34).replace(/^0+/, '') || digitsOnly.slice(25, 34);
  }

  const base = raw.split(/[/\\]/).pop().replace(/\.[a-zA-Z]{2,5}$/i, '');

  const fromNfDash = base.match(/^NF-(\d{6,12})\b/i);
  if (fromNfDash) return fromNfDash[1];

  const leading = base.match(/^(\d{7,9})\s*[-_ ]/);
  if (leading) return leading[1];

  const nfaDots = base.match(/^NFA-([\d.]+)/i);
  if (nfaDots) {
    const n = nfaDots[1].replace(/\D/g, '');
    if (n.length >= 6 && n.length <= 12) return n;
  }

  let stripped = base;
  while (/^\d{10,}-/.test(stripped)) {
    stripped = stripped.replace(/^\d{10,}-/, '');
  }
  while (/^\d{9,}-(?=\d{7,9})/.test(stripped)) {
    stripped = stripped.replace(/^\d{9,}-/, '');
  }

  const withLabel = stripped.match(/(\d{7,9})(?:\s*[-–]\s*|_+_?)[A-Za-zÀ-ú]/);
  if (withLabel) return withLabel[1];

  const afterStrip = stripped.match(/^(\d{7,9})(?:\b|_|-|\s)/);
  if (afterStrip) return afterStrip[1];
  const embedded = stripped.match(/(?:^|[-_])(\d{7,9})(?:[-_\s]|$)/);
  if (embedded) return embedded[1];

  const punctOnly = base.replace(/\D/g, '');
  if (punctOnly.length >= 6 && punctOnly.length <= 12 && !/[A-Za-z]/.test(base)) {
    return punctOnly;
  }

  const seq79 = base.match(/(\d{7,9})/g);
  if (seq79 && seq79.length) {
    let preferred = seq79[seq79.length - 1];
    for (let i = 0; i < seq79.length; i += 1) {
      if (seq79[i].length === 8) {
        preferred = seq79[i];
        break;
      }
    }
    return preferred;
  }
  const seq6 = base.match(/(\d{6})/);
  if (seq6) return seq6[1];

  // Fallback curto (4–5 dígitos) — casos legados / testes
  if (digitsOnly.length >= 4 && digitsOnly.length <= 12) return digitsOnly;
  const seq4 = base.match(/(\d{4,5})/);
  return seq4 ? seq4[1] : '';
}

function formatRomaneioNumber(value) {
  if (value === null || value === undefined || value === '') return '';
  const digits = String(value).replace(/\D/g, '');
  if (!digits) return '';
  return digits.padStart(5, '0');
}

function extractRomaneioFromFilename(filename) {
  if (!filename) return '';
  const base = String(filename).split(/[/\\]/).pop();
  const m = base.match(/^0*(\d{3,6})[-_.]/);
  if (m) return formatRomaneioNumber(m[1]);
  const any = base.match(/\b0*(\d{4,6})\b/);
  return any ? formatRomaneioNumber(any[1]) : '';
}

function extractRomaneioFromNotes(notes) {
  if (!notes) return '';
  const m = String(notes).match(/Planilha\s*VP:\s*(\d+)/i);
  return m ? formatRomaneioNumber(m[1]) : '';
}

function resolveRomaneioNumber(sale = {}) {
  if (sale.romaneioNumber) return formatRomaneioNumber(sale.romaneioNumber);
  const fromNotes = extractRomaneioFromNotes(sale.notes);
  if (fromNotes) return fromNotes;
  return extractRomaneioFromFilename(sale.evidenceFile);
}

/**
 * Nome canônico de anexo no Google Drive:
 * NF → {romaneio|SEMROM}-NF-{nfDigits}{ext}
 * Pedido → {romaneio|SEMROM}-Pedido{ext}
 * CP → {romaneio|SEMROM}-CP-{nfDigits|disp}{ext}
 *
 * @param {'nf'|'pedido'|'cp'|string} kind
 * @param {{ romaneioNumber?: string, nfNumber?: string, ext?: string, originalName?: string }} opts
 */
function buildDriveAttachmentName(kind, opts = {}) {
  const rom = formatRomaneioNumber(opts.romaneioNumber) || 'SEMROM';
  const nf = formatNfNumber(opts.nfNumber || opts.nfFile || '') || 'disp';
  let ext = String(opts.ext || '').trim();
  if (!ext && opts.originalName) {
    const m = String(opts.originalName).match(/(\.[a-zA-Z0-9]{2,5})$/);
    ext = m ? m[1] : '';
  }
  if (!ext) ext = '.bin';
  if (!ext.startsWith('.')) ext = `.${ext}`;
  ext = ext.toLowerCase();

  const k = String(kind || '').toLowerCase();
  if (k === 'nf' || k === 'nfe' || k === 'nota') {
    return `${rom}-NF-${nf}${ext === '.pdf' || ext === '.xml' ? ext : '.pdf'}`;
  }
  if (k === 'pedido' || k === 'evidence' || k === 'canhoto' || k === 'romaneio') {
    return `${rom}-Pedido${ext}`;
  }
  if (k === 'cp' || k === 'comprovante' || k === 'payment' || k === 'paymentproof') {
    return `${rom}-CP-${nf}${ext}`;
  }
  const safe = String(opts.originalName || 'anexo')
    .split(/[/\\]/)
    .pop()
    .replace(/[^\w.\-]+/g, '_')
    .slice(0, 80);
  return `${rom}-${safe}`;
}

/**
 * Classifica um arquivo de venda (nf / pedido / cp) a partir do nome ou campo.
 */
function classifySaleAttachment(targetName, sale = {}) {
  const name = String(targetName || '').toLowerCase();
  if (sale.nfFile && (targetName === sale.nfFile || name.includes(String(sale.nfFile).toLowerCase()))) {
    return 'nf';
  }
  if (sale.evidenceFile && (targetName === sale.evidenceFile || name.includes(String(sale.evidenceFile).toLowerCase()))) {
    return 'pedido';
  }
  if (sale.paymentProofFile && (targetName === sale.paymentProofFile || name.includes(String(sale.paymentProofFile).toLowerCase()))) {
    return 'cp';
  }
  if (/(\bnf[-_]|nota|nfe|lancada)/i.test(name) || /^vp\d+\s*-\s*nf-/i.test(name)) return 'nf';
  if (/(pedido|canhoto|romaneio)/i.test(name)) return 'pedido';
  if (/(comprovante|\bcp[-_]|pix|recibo)/i.test(name)) return 'cp';
  if (sale.nfFile && String(sale.nfFile).includes(String(targetName || '').replace(/^\d+-\d+-/, ''))) return 'nf';
  return 'pedido';
}

module.exports = {
  formatNfNumber,
  formatRomaneioNumber,
  extractRomaneioFromFilename,
  extractRomaneioFromNotes,
  resolveRomaneioNumber,
  buildDriveAttachmentName,
  classifySaleAttachment
};
