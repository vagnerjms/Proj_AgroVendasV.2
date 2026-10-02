/**
 * Helpers canônicos: NF só dígitos, romaneio 097xxx, URL autenticada de uploads.
 */

/**
 * Extrai apenas dígitos do número da NF a partir do arquivo ou chave.
 * Modelos docs/*.zip: "28042894 - SAMUEL.pdf", "NF-28042894.pdf",
 * upload: "1789943047705-537708083-28003902_-_RUBI_-_LANCADA.pdf"
 */
export function formatNfNumber(nfFileOrKey) {
  if (!nfFileOrKey) return '';
  const raw = String(nfFileOrKey).trim();
  if (!raw) return '';

  // Chave de acesso NFe (44 dígitos): nº NF = posições 26–34 (9 dígitos)
  const digitsOnly = raw.replace(/\D/g, '');
  if (digitsOnly.length === 44) {
    return digitsOnly.slice(25, 34).replace(/^0+/, '') || digitsOnly.slice(25, 34);
  }

  const base = raw.split(/[/\\]/).pop().replace(/\.[a-zA-Z]{2,5}$/i, '');

  // NF-28042894 ou NFA-053.020.514 (só se NF- seguido de dígitos, não NFA-e genérico)
  const fromNfDash = base.match(/^NF-(\d{6,12})\b/i);
  if (fromNfDash) return fromNfDash[1];

  // Modelo ZIP: "28042894 - SAMUEL - LANCADA"
  const leading = base.match(/^(\d{7,9})\s*[-_ ]/);
  if (leading) return leading[1];

  // NFA-053.020.514… → 053020514
  const nfaDots = base.match(/^NFA-([\d.]+)/i);
  if (nfaDots) {
    const n = nfaDots[1].replace(/\D/g, '');
    if (n.length >= 6 && n.length <= 12) return n;
  }

  // Upload com timestamp: strip prefixos longos e segmentos intermediários
  let stripped = base;
  while (/^\d{10,}-/.test(stripped)) {
    stripped = stripped.replace(/^\d{10,}-/, '');
  }
  while (/^\d{9,}-(?=\d{7,9})/.test(stripped)) {
    stripped = stripped.replace(/^\d{9,}-/, '');
  }

  // ZIP / upload: "28042894 - LOJA" ou "28003902_-_RUBI"
  const withLabel = stripped.match(/(\d{7,9})(?:\s*[-–]\s*|_+_?)[A-Za-zÀ-ú]/);
  if (withLabel) return withLabel[1];

  const afterStrip = stripped.match(/^(\d{7,9})(?:\b|_|-|\s)/);
  if (afterStrip) return afterStrip[1];
  const embedded = stripped.match(/(?:^|[-_])(\d{7,9})(?:[-_\s]|$)/);
  if (embedded) return embedded[1];

  // Nome só com dígitos / pontuação (ex. 12.345.678)
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

  // Fallback curto (4–5 dígitos) — casos legados
  if (digitsOnly.length >= 4 && digitsOnly.length <= 12) return digitsOnly;
  const seq4 = base.match(/(\d{4,5})/);
  return seq4 ? seq4[1] : '';
}

/**
 * Normaliza romaneio canhoto/planilha para 5 dígitos (09733).
 */
export function formatRomaneioNumber(value) {
  if (value === null || value === undefined || value === '') return '';
  const digits = String(value).replace(/\D/g, '');
  if (!digits) return '';
  return digits.padStart(5, '0');
}

/**
 * Extrai romaneio do nome do anexo de pedido (ex.: 09733-01082026.jpeg).
 */
export function extractRomaneioFromFilename(filename) {
  if (!filename) return '';
  const base = String(filename).split(/[/\\]/).pop();
  const m = base.match(/^0*(\d{3,6})[-_.]/);
  if (m) return formatRomaneioNumber(m[1]);
  const any = base.match(/\b0*(\d{4,6})\b/);
  return any ? formatRomaneioNumber(any[1]) : '';
}

/**
 * Extrai romaneio de notes com stamp "Planilha VP: NNNN".
 */
export function extractRomaneioFromNotes(notes) {
  if (!notes) return '';
  const m = String(notes).match(/Planilha\s*VP:\s*(\d+)/i);
  return m ? formatRomaneioNumber(m[1]) : '';
}

/**
 * Resolve romaneio de uma venda (campo → notes → evidence filename).
 */
export function resolveRomaneioNumber(sale = {}) {
  if (sale.romaneioNumber) return formatRomaneioNumber(sale.romaneioNumber);
  const fromNotes = extractRomaneioFromNotes(sale.notes);
  if (fromNotes) return fromNotes;
  return extractRomaneioFromFilename(sale.evidenceFile);
}

/**
 * Monta URL de /uploads com JWT em query (auth aceita ?token=).
 */
export function getAuthToken() {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem('agrovenda_token') || localStorage.getItem('token') || null;
}

/**
 * Monta URL de /uploads com JWT em query (auth aceita ?token=).
 */
export function authorizedUploadUrl(filename) {
  if (!filename) return '';
  const name = String(filename).replace(/^\/?uploads\//, '');
  const token = getAuthToken();
  const base = `/uploads/${encodeURIComponent(name).replace(/%2F/gi, '/')}`;
  if (!token) return base;
  return `${base}?token=${encodeURIComponent(token)}`;
}

function looksLikeUploadTimestamp(n) {
  return Boolean(n && String(n).length >= 12);
}

/**
 * Label amigável de NF para tabelas (SEM NF se vazio).
 * Prefere chave SEFAZ quando o nome do arquivo parecer timestamp de upload.
 */
export function nfDisplayLabel(sale = {}) {
  const fromFile = formatNfNumber(sale.nfFile);
  const fromKey = formatNfNumber(sale.nfeKey);
  if (fromKey && (!fromFile || looksLikeUploadTimestamp(fromFile) || (fromFile && fromKey && fromFile !== fromKey && looksLikeUploadTimestamp(fromFile)))) {
    return fromKey;
  }
  if (fromKey && fromFile && fromFile !== fromKey && String(fromFile).length > String(fromKey).length) {
    return fromKey;
  }
  return fromFile || fromKey || 'SEM NF';
}

/**
 * Unidade canônica do item/venda a partir do cadastro (não inventa cx/sc por produto).
 * Prioridade: item.unit → productMap[name].defaultUnit → fallback por boxWeightKg.
 *
 * @param {object} saleOrItem - venda completa ou item isolado
 * @param {Array|{[name:string]:object}} [products] - lista ou mapa de produtos cadastrados
 */
export function resolveProductUnit(saleOrItem = {}, products = null) {
  const item = saleOrItem.items?.[0] || (saleOrItem.product || saleOrItem.unit || saleOrItem.boxWeightKg !== undefined ? saleOrItem : null);
  if (item?.unit && String(item.unit).trim()) return String(item.unit).trim();

  const productName = item?.product || saleOrItem.product || '';
  let catalogUnit = '';
  if (products && productName) {
    if (Array.isArray(products)) {
      const found = products.find(p => p.name === productName || p.name?.toLowerCase() === productName.toLowerCase());
      catalogUnit = found?.defaultUnit || '';
    } else if (typeof products === 'object') {
      catalogUnit = products[productName]?.defaultUnit || products[productName.toLowerCase()]?.defaultUnit || '';
    }
  }
  if (catalogUnit) return String(catalogUnit).trim();

  const bw = Number(item?.boxWeightKg ?? saleOrItem.boxWeightKg) || 0;
  if (bw === 1) return 'Granel (kg)';
  if (bw === 25 || bw === 50) return `Sacas (${bw}kg)`;
  if (bw === 20) return 'Caixas (20kg)';
  if (bw === 60) return `Sacas (60kg)`;
  if (bw > 0) return `Caixas (${bw}kg)`;
  return 'Caixas (29kg)';
}

/**
 * Abrevia unidade para listas (relatórios/agenda): Caixas → cx, Sacas → sc, Granel → kg.
 * Cadastro/detalhe da venda deve continuar com a unidade completa.
 */
export function abbreviateUnit(unit) {
  const u = unit && String(unit).trim() ? String(unit).trim() : '';
  if (!u) return '';
  const lower = u.toLowerCase();
  if (lower.includes('granel') || lower === 'kg') return 'kg';
  if (lower.includes('saca')) return 'sc';
  if (lower.includes('caixa')) return 'cx';
  return u;
}

/**
 * Formata quantidade + unidade do produto (pt-BR).
 * Ex.: formatQuantity(1234.5, 'Caixas (29kg)') → "1.234,50 Caixas (29kg)"
 * Sem unidade: só o número.
 */
export function formatQuantity(value, unit, decimals = 2) {
  const num = Number(value);
  const formatted = (isNaN(num) || !isFinite(num) ? 0 : num).toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
  const u = unit && String(unit).trim() ? String(unit).trim() : '';
  return u ? `${formatted} ${u}` : formatted;
}

/**
 * Quantidade de volumes da venda (totalVolumes ou kg/boxWeight).
 */
export function quantityOf(sale = {}) {
  const vol = Number(sale.totalVolumes) || 0;
  if (vol > 0) return vol;
  const kg = Number(sale.totalKg) || 0;
  const item = sale.items?.[0];
  const bw = Number(item?.boxWeightKg) || (item?.unit?.includes('Granel') || item?.unit?.includes('(kg)') ? 1 : 29);
  return kg > 0 && bw > 0 ? kg / bw : 0;
}
