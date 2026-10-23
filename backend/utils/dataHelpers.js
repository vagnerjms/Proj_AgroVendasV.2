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
 * CP → {romaneio|SEMROM}-CP{seq}-{nfDigits|disp}{ext}  (seq 01, 02…)
 * CP produtor → …-CPProd{seq}-…
 * Pátio → Patio-NF-{nf}{ext} | Patio-RomaneioBalanca{ext}
 *
 * @param {'nf'|'pedido'|'cp'|'cpprod'|'patio_nf'|'patio_romaneio'|string} kind
 * @param {{ romaneioNumber?: string, nfNumber?: string, ext?: string, originalName?: string, seq?: number }} opts
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

  const seqNum = Math.max(1, Number(opts.seq) || 1);
  const seqPad = String(seqNum).padStart(2, '0');

  const k = String(kind || '').toLowerCase();
  if (k === 'nf' || k === 'nfe' || k === 'nota') {
    return `${rom}-NF-${nf}${ext === '.pdf' || ext === '.xml' ? ext : '.pdf'}`;
  }
  if (k === 'pedido' || k === 'evidence' || k === 'canhoto' || k === 'romaneio') {
    return `${rom}-Pedido${ext}`;
  }
  if (k === 'cpprod' || k === 'cp_prod' || k === 'comprovante_produtor' || k === 'producer_proof') {
    return `${rom}-CPProd${seqPad}-${nf}${ext}`;
  }
  if (k === 'cp' || k === 'comprovante' || k === 'payment' || k === 'paymentproof') {
    return `${rom}-CP${seqPad}-${nf}${ext}`;
  }
  if (k === 'patio_nf' || k === 'patio-nf') {
    return `Patio-NF-${nf}${ext}`;
  }
  if (k === 'patio_romaneio' || k === 'patio-romaneio' || k === 'patio_balanca') {
    return `Patio-RomaneioBalanca${ext}`;
  }
  const safe = String(opts.originalName || 'anexo')
    .split(/[/\\]/)
    .pop()
    .replace(/[^\w.\-]+/g, '_')
    .slice(0, 80);
  return `${rom}-${safe}`;
}

/**
 * Classifica um arquivo de venda (nf / pedido / cp / patio_*) a partir do nome ou campo.
 */
function classifySaleAttachment(targetName, sale = {}) {
  const name = String(targetName || '').toLowerCase();
  if (/^patio-nf/i.test(name) || name.includes('patio-nf')) return 'patio_nf';
  if (/patio-romaneiobalanca|patio_romaneio|romaneio.?balanca/i.test(name)) return 'patio_romaneio';
  if (sale.nfFile && (targetName === sale.nfFile || name.includes(String(sale.nfFile).toLowerCase()))) {
    return 'nf';
  }
  if (sale.evidenceFile && (targetName === sale.evidenceFile || name.includes(String(sale.evidenceFile).toLowerCase()))) {
    return 'pedido';
  }
  if (sale.paymentProofFile && (targetName === sale.paymentProofFile || name.includes(String(sale.paymentProofFile).toLowerCase()))) {
    return 'cp';
  }
  if (sale.producerPaymentProofFile && (targetName === sale.producerPaymentProofFile || name.includes(String(sale.producerPaymentProofFile).toLowerCase()))) {
    return 'cpprod';
  }
  const hist = Array.isArray(sale.paymentHistory) ? sale.paymentHistory : [];
  for (const p of hist) {
    const files = [
      p?.paymentProofFile,
      ...(Array.isArray(p?.paymentProofFiles) ? p.paymentProofFiles : [])
    ].filter(Boolean);
    if (files.some((f) => f === targetName || name.includes(String(f).toLowerCase()))) return 'cp';
  }
  const ph = Array.isArray(sale.producerPaymentHistory) ? sale.producerPaymentHistory : [];
  for (const p of ph) {
    const files = [
      p?.paymentProofFile,
      ...(Array.isArray(p?.paymentProofFiles) ? p.paymentProofFiles : [])
    ].filter(Boolean);
    if (files.some((f) => f === targetName || name.includes(String(f).toLowerCase()))) return 'cpprod';
  }
  if (/(\bnf[-_]|nota|nfe|lancada)/i.test(name) || /^vp\d+\s*-\s*nf-/i.test(name)) return 'nf';
  if (/(pedido|canhoto|romaneio)/i.test(name)) return 'pedido';
  if (/(cpprod|comprovante.?prod|repasse)/i.test(name)) return 'cpprod';
  if (/(comprovante|\bcp\d*[-_]|pix|recibo)/i.test(name)) return 'cp';
  if (sale.nfFile && String(sale.nfFile).includes(String(targetName || '').replace(/^\d+-\d+-/, ''))) return 'nf';
  return 'pedido';
}

/**
 * Coleta todos os anexos rastreáveis de uma venda (fonte da verdade para webhook/backup).
 */
function collectSaleAttachmentTargets(sale = {}) {
  const clientProofs = [];
  const producerProofs = [];
  const seen = new Set();

  const pushUnique = (arr, file) => {
    if (!file || seen.has(file)) return;
    seen.add(file);
    arr.push(file);
  };

  const hist = Array.isArray(sale.paymentHistory) ? sale.paymentHistory : [];
  hist.forEach((p) => {
    pushUnique(clientProofs, p?.paymentProofFile);
    (Array.isArray(p?.paymentProofFiles) ? p.paymentProofFiles : []).forEach((f) => pushUnique(clientProofs, f));
  });
  pushUnique(clientProofs, sale.paymentProofFile);

  const ph = Array.isArray(sale.producerPaymentHistory) ? sale.producerPaymentHistory : [];
  ph.forEach((p) => {
    pushUnique(producerProofs, p?.paymentProofFile);
    (Array.isArray(p?.paymentProofFiles) ? p.paymentProofFiles : []).forEach((f) => pushUnique(producerProofs, f));
  });
  pushUnique(producerProofs, sale.producerPaymentProofFile);

  return {
    nf: sale.nfFile || null,
    evidence: sale.evidenceFile || null,
    clientProofs,
    producerProofs,
    patioRefs: []
  };
}

/**
 * Path Drive SaaS: AgroVenda/{tenant}/{loja}/{VP}
 */
function buildDriveSuggestedPath(opts = {}) {
  let tenant = String(opts.tenantSlug || process.env.TENANT_SLUG || 'default')
    .trim()
    .replace(/[^\w.\-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);
  if (!tenant) tenant = 'default';
  let store = String(opts.storeName || opts.client || 'Sem_Loja')
    .trim()
    .replace(/[^\w.\-À-ú ]+/gi, '_')
    .replace(/\s+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);
  if (!store) store = 'Sem_Loja';
  const saleId = String(opts.saleId || 'SEMVP').trim() || 'SEMVP';
  return {
    productRoot: 'AgroVenda',
    tenantSlug: tenant,
    storeFolder: store,
    saleFolder: saleId,
    suggestedPath: `AgroVenda/${tenant}/${store}/${saleId}`,
    suggestedFolder: `${saleId} - ${String(opts.client || store).trim()} (${opts.monthFolder || ''})`.replace(/\(\s*\)$/, '').trim()
  };
}

module.exports = {
  formatNfNumber,
  formatRomaneioNumber,
  extractRomaneioFromFilename,
  extractRomaneioFromNotes,
  resolveRomaneioNumber,
  buildDriveAttachmentName,
  classifySaleAttachment,
  collectSaleAttachmentTargets,
  buildDriveSuggestedPath
};
