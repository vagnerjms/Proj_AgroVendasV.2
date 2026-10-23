/**
 * Reconcilia backups/agrovenda_backup_completo_2026-10-23.json + ZIP Drive:
 * - Alinha nomes de anexos às rotas canônicas do webhook (buildDriveAttachmentName)
 * - Religa sale.*File / paymentHistory → files[].filename
 * - Incorpora arquivos faltantes a partir do ZIP (por pasta VP0xx)
 * - Transferência: PIX R$ 33.902,40 (05/10/2026) desvincula Badin VP022 → baixa definitiva W&A VP023
 *
 * Uso:
 *   node backend/scripts/reconcile_backup_routes_20261023.js
 */
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const yauzl = require('yauzl');
const {
  formatNfNumber,
  formatRomaneioNumber,
  extractRomaneioFromFilename,
  resolveRomaneioNumber,
  buildDriveAttachmentName,
  buildDriveSuggestedPath
} = require('../utils/dataHelpers');

const ROOT = path.resolve(__dirname, '../..');
const BACKUP_PATH = path.join(ROOT, 'backups', 'agrovenda_backup_completo_2026-10-23.json');
const ZIP_PATH = path.join(ROOT, 'backups', 'drive-download-20261023T171554Z-1-001.zip');
const OUT_JSON = path.join(ROOT, 'backups', 'agrovenda_backup_reconciliado_rotas_2026-10-23.json');
const OUT_MD = path.join(ROOT, 'backups', 'RECONCILIACAO_ROTAS_2026-10-23.md');

const WEBHOOK = 'https://n8n.agrovendas.cloud/webhook/agrovenda-sale';
const TRANSFER_AMOUNT = 33902.4;
const TRANSFER_DATE = '2026-10-05';

function extOf(name) {
  const m = String(name || '').match(/(\.[a-zA-Z0-9]{2,5})$/);
  return m ? m[1].toLowerCase() : '.bin';
}

function basename(name) {
  return String(name || '').replace(/\\/g, '/').split('/').pop();
}

function stripMulter(name) {
  let n = basename(name);
  while (/^\d{10,}-\d+-/.test(n)) n = n.replace(/^\d{10,}-\d+-/, '');
  while (/^\d{10,}-/.test(n)) n = n.replace(/^\d{10,}-/, '');
  return n;
}

function stripVpPrefix(name) {
  return stripMulter(name).replace(/^VP\d+\s*-\s*/i, '').trim();
}

function normKey(name) {
  return stripVpPrefix(name)
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[()]/g, '')
    .replace(/_+/g, '_');
}

function md5b64(b64) {
  return crypto.createHash('md5').update(Buffer.from(b64, 'base64')).digest('hex');
}

function looksLikeDateProof(base) {
  // Ex.: 18.09.pdf, 05.10.pdf, 22.09 — comprovantes por data, NÃO nota fiscal
  return /^\d{1,2}[._-]\d{1,2}(\.\w+)?$/i.test(String(base || '').trim());
}

function classifyKind(filename, sale) {
  const base = stripVpPrefix(filename);
  const lower = base.toLowerCase();
  if (/cpprod|comprovante.?prod|repasse/i.test(lower)) return 'cpprod';
  if (/^nf[-_]|nfa[-_]|nota|nfe|lancada/i.test(lower) || /^vp\d+\s*-\s*nf-/i.test(filename)) return 'nf';
  if (/pedido|canhoto|romaneio/i.test(lower)) return 'pedido';
  if (looksLikeDateProof(base.replace(/\.[a-z0-9]+$/i, '') + extOf(base))) return 'cp';
  if (/^\d{1,2}[._-]\d{1,2}\./i.test(lower)) return 'cp';
  if (/\bcp\b|comprovante|pix-cp|sicoob|pagamento|cheque|thais-cp|w_a-cp|favilla|hang-cp|adf-cp/i.test(lower)) return 'cp';
  if (/\.(jpe?g|png|webp)$/i.test(lower) && extractRomaneioFromFilename(base)) return 'pedido';
  if (sale?.paymentProofFile && normKey(filename).includes(normKey(stripMulter(sale.paymentProofFile)).slice(0, 10))) {
    return 'cp';
  }
  if (sale?.nfFile && normKey(filename).includes(normKey(stripMulter(sale.nfFile)).slice(0, 12))) return 'nf';
  if (sale?.evidenceFile && normKey(filename).includes(normKey(stripMulter(sale.evidenceFile)).slice(0, 12))) return 'pedido';
  // NF só com nº de 7–9 dígitos (evita 18.09 → 1809)
  const nfDigits = formatNfNumber(base);
  if (/\.pdf$/i.test(lower) && nfDigits && String(nfDigits).length >= 7) return 'nf';
  return 'outro';
}

function readZipEntries(zipPath) {
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true, autoClose: true }, (err, zip) => {
      if (err) return reject(err);
      const entries = [];
      zip.readEntry();
      zip.on('entry', (entry) => {
        if (/\/$/.test(entry.fileName)) {
          zip.readEntry();
          return;
        }
        zip.openReadStream(entry, (e2, stream) => {
          if (e2) return reject(e2);
          const chunks = [];
          stream.on('data', (c) => chunks.push(c));
          stream.on('end', () => {
            const buf = Buffer.concat(chunks);
            const full = entry.fileName.replace(/\\/g, '/');
            const base = basename(full);
            const vpMatch = full.match(/^(VP\d{3,})\b/i) || base.match(/^(VP\d{3,})\b/i);
            entries.push({
              fullPath: full,
              filename: base,
              saleId: vpMatch ? vpMatch[1].toUpperCase() : '',
              sizeBytes: buf.length,
              contentBase64: buf.toString('base64'),
              md5: crypto.createHash('md5').update(buf).digest('hex')
            });
            zip.readEntry();
          });
          stream.on('error', reject);
        });
      });
      zip.on('end', () => resolve(entries));
      zip.on('error', reject);
    });
  });
}

function pickBestFile(candidates, preferKind, sale) {
  if (!candidates.length) return null;
  const scored = candidates.map((f) => {
    const kind = classifyKind(f.filename, sale);
    let score = 0;
    if (preferKind && kind === preferKind) score += 50;
    if (f.saleId === sale.id) score += 20;
    if (/^VP\d+/i.test(f.filename)) score += 5;
    // prefer non-duplicate "(1)" copies
    if (/\(\d+\)\./.test(f.filename)) score -= 10;
    score += Math.min(10, Math.log10((f.sizeBytes || 1) + 1));
    return { f, kind, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0];
}

function collectProofRefs(sale) {
  const refs = [];
  const push = (src, name) => {
    if (name) refs.push({ src, name: String(name) });
  };
  push('paymentProofFile', sale.paymentProofFile);
  push('producerPaymentProofFile', sale.producerPaymentProofFile);
  (sale.paymentHistory || []).forEach((p, i) => {
    push(`paymentHistory[${i}].paymentProofFile`, p.paymentProofFile);
    (p.paymentProofFiles || []).forEach((f, j) => push(`paymentHistory[${i}].paymentProofFiles[${j}]`, f));
  });
  (sale.producerPaymentHistory || []).forEach((p, i) => {
    push(`producerPaymentHistory[${i}].paymentProofFile`, p.paymentProofFile);
    (p.paymentProofFiles || []).forEach((f, j) => push(`producerPaymentHistory[${i}].paymentProofFiles[${j}]`, f));
  });
  return refs;
}

function setProofRef(sale, src, newName) {
  if (src === 'paymentProofFile') {
    sale.paymentProofFile = newName;
    return;
  }
  if (src === 'producerPaymentProofFile') {
    sale.producerPaymentProofFile = newName;
    return;
  }
  const m1 = src.match(/^paymentHistory\[(\d+)\]\.paymentProofFile$/);
  if (m1) {
    sale.paymentHistory[Number(m1[1])].paymentProofFile = newName;
    return;
  }
  const m2 = src.match(/^paymentHistory\[(\d+)\]\.paymentProofFiles\[(\d+)\]$/);
  if (m2) {
    sale.paymentHistory[Number(m2[1])].paymentProofFiles[Number(m2[2])] = newName;
    return;
  }
  const m3 = src.match(/^producerPaymentHistory\[(\d+)\]\.paymentProofFile$/);
  if (m3) {
    sale.producerPaymentHistory[Number(m3[1])].paymentProofFile = newName;
    return;
  }
  const m4 = src.match(/^producerPaymentHistory\[(\d+)\]\.paymentProofFiles\[(\d+)\]$/);
  if (m4) {
    sale.producerPaymentHistory[Number(m4[1])].paymentProofFiles[Number(m4[2])] = newName;
  }
}

function findContentForName(name, saleId, pools) {
  const bare = normKey(name);
  const bareStrip = normKey(stripMulter(name));
  const tryMatch = (list) => {
    let hit = list.find((f) => normKey(f.filename) === bare || normKey(f.filename) === bareStrip);
    if (hit) return hit;
    hit = list.find((f) => {
      const fk = normKey(f.filename);
      return fk.includes(bareStrip) || bareStrip.includes(fk) || fk.endsWith(bareStrip) || bareStrip.endsWith(fk);
    });
    return hit || null;
  };

  const bySale = pools.bySale.get(saleId) || [];
  return (
    tryMatch(bySale)
    || tryMatch(pools.allBackup)
    || tryMatch(pools.bySaleZip.get(saleId) || [])
    || tryMatch(pools.allZip)
    || null
  );
}

function applyBadinWaTransfer(sale, filesOut, report) {
  if (sale.id === 'VP022') {
    const before = {
      paidAmount: sale.paidAmount,
      paymentStatus: sale.paymentStatus,
      history: (sale.paymentHistory || []).map((p) => ({ amount: p.amount, date: p.date, proof: p.paymentProofFile }))
    };
    sale.paidAmount = 0;
    sale.paymentHistory = [];
    sale.paymentProofFile = null;
    sale.paymentMethod = '';
    sale.paymentStatus = 'Pendente';
    if (sale.status === 'Recebido' || sale.status === 'Parcial' || sale.status === 'Concluído') {
      sale.status = 'Pendente';
    }
    sale.notes = [
      sale.notes || '',
      `[RECONCILE 2026-10-23] Baixa removida: PIX R$ ${TRANSFER_AMOUNT.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (05/10/2026) desvinculado desta VP (NF coincidia com comprovante W&A). Comprovantes Favilla ficam no pacote para reassociar se legítimos.`
    ].filter(Boolean).join('\n');
    report.transfer.push({
      action: 'UNSETTLE_BADIN_VP022',
      before,
      after: { paidAmount: 0, paymentStatus: 'Pendente' }
    });
    return;
  }

  if (sale.id === 'VP023') {
    const rom = resolveRomaneioNumber(sale) || '09733';
    const nf = formatNfNumber(sale.nfFile) || formatNfNumber(sale.nfeKey) || '28042894';
    const waProof = filesOut.find((f) => f.saleId === 'VP023' && /w_a-cp1/i.test(f.filename))
      || filesOut.find((f) => /w_a-cp1\.pdf$/i.test(f.filename));
    const canonCp = buildDriveAttachmentName('cp', {
      romaneioNumber: rom,
      nfNumber: nf,
      ext: '.pdf',
      seq: 1
    });

    // Garante arquivo canônico
    if (waProof) {
      waProof.filename = canonCp;
      waProof.saleId = 'VP023';
    }

    const vp = Number(sale.valorTotalVP) || 0;
    const rest = Math.round((vp - TRANSFER_AMOUNT) * 100) / 100;
    const oldHistory = Array.isArray(sale.paymentHistory) ? sale.paymentHistory : [];
    const restEntry = oldHistory.find((p) => Math.abs(Number(p.amount) - rest) < 0.05)
      || oldHistory.find((p) => p.date !== TRANSFER_DATE)
      || null;

    sale.paymentHistory = [
      {
        amount: TRANSFER_AMOUNT,
        discountAmount: 0,
        date: TRANSFER_DATE,
        paymentMethod: 'PIX',
        checkNumber: '',
        checkBank: '',
        checkDueDate: '',
        paymentProofFile: canonCp,
        paymentProofFiles: [canonCp],
        notes: `Baixa definitiva — PIX R$ ${TRANSFER_AMOUNT.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em 05/10/2026. Transferido/confirmado para W&A (desvinculado de Badin Favilla VP022, cuja NF era R$ 33.902,40).`,
        createdAt: '2026-10-05T15:21:22.012Z'
      }
    ];

    if (rest > 0.009) {
      sale.paymentHistory.push({
        amount: rest,
        discountAmount: 0,
        date: restEntry?.date || '2026-10-14',
        paymentMethod: restEntry?.paymentMethod || 'PIX',
        checkNumber: '',
        checkBank: '',
        checkDueDate: '',
        paymentProofFile: restEntry?.paymentProofFile || null,
        paymentProofFiles: restEntry?.paymentProofFiles || [],
        notes: restEntry?.notes
          || `Complemento para quitar VP comercial (R$ ${vp.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}).`,
        createdAt: restEntry?.createdAt || '2026-10-14T12:58:39.750Z'
      });
    }

    sale.paidAmount = Math.round(vp * 100) / 100;
    sale.paymentProofFile = canonCp;
    sale.paymentMethod = 'PIX';
    sale.paymentStatus = 'Recebido';
    sale.status = 'Recebido';

    report.transfer.push({
      action: 'SETTLE_WA_VP023_DEFINITIVE',
      amount: TRANSFER_AMOUNT,
      date: TRANSFER_DATE,
      proof: canonCp,
      paidAmount: sale.paidAmount,
      suggestedPath: buildDriveSuggestedPath({
        client: sale.client,
        saleId: sale.id,
        storeName: sale.client
      }).suggestedPath
    });
  }
}

async function main() {
  if (!fs.existsSync(BACKUP_PATH)) {
    console.error('Backup não encontrado:', BACKUP_PATH);
    process.exit(1);
  }

  console.log('Lendo backup...', BACKUP_PATH);
  const backup = JSON.parse(fs.readFileSync(BACKUP_PATH, 'utf8'));
  const sales = backup.database?.sales || [];
  const backupFiles = Array.isArray(backup.files) ? backup.files : [];

  console.log('Lendo ZIP Drive...', ZIP_PATH);
  const zipEntries = fs.existsSync(ZIP_PATH) ? await readZipEntries(ZIP_PATH) : [];
  console.log('ZIP entries:', zipEntries.length);

  const pools = {
    allBackup: backupFiles.map((f) => ({
      filename: f.filename,
      saleId: f.saleId || '',
      sizeBytes: f.sizeBytes || 0,
      contentBase64: f.contentBase64,
      md5: f.contentBase64 ? md5b64(f.contentBase64) : ''
    })),
    allZip: zipEntries,
    bySale: new Map(),
    bySaleZip: new Map()
  };

  for (const f of pools.allBackup) {
    const k = f.saleId || '';
    if (!pools.bySale.has(k)) pools.bySale.set(k, []);
    pools.bySale.get(k).push(f);
  }
  for (const f of zipEntries) {
    const k = f.saleId || '';
    if (!pools.bySaleZip.has(k)) pools.bySaleZip.set(k, []);
    pools.bySaleZip.get(k).push(f);
  }

  const report = {
    webhook: WEBHOOK,
    drivePathPattern: 'AgroVenda/{tenant}/{loja}/{VP}',
    fileRewrites: [],
    missing: [],
    fromZip: [],
    transfer: [],
    suggestedPaths: []
  };

  const filesOut = [];
  const seenHashSale = new Set();
  const pushFile = (saleId, filename, contentBase64, sizeBytes, meta = {}) => {
    if (!contentBase64 || !filename) return null;
    const h = md5b64(contentBase64);
    const key = `${saleId}::${h}`;
    if (seenHashSale.has(key)) return filesOut.find((f) => f.saleId === saleId && md5b64(f.contentBase64) === h);
    // allow same hash on different sales only once per sale
    seenHashSale.add(key);
    const row = {
      filename,
      saleId,
      sizeBytes: sizeBytes || Buffer.from(contentBase64, 'base64').length,
      contentBase64,
      ...meta
    };
    filesOut.push(row);
    return row;
  };

  const cleanedSales = [];

  for (const original of sales) {
    const sale = JSON.parse(JSON.stringify(original));
    const rom = resolveRomaneioNumber(sale) || '';
    if (rom) sale.romaneioNumber = formatRomaneioNumber(rom);
    // stripMulter evita capturar o sufixo aleatório do upload (ex.: …-31781213-27967571 → NF errada)
    const nfCanon =
      formatNfNumber(stripMulter(sale.nfFile))
      || formatNfNumber(sale.nfeKey)
      || formatNfNumber(sale.nfFile)
      || '';

    const drivePath = buildDriveSuggestedPath({
      client: sale.client,
      saleId: sale.id,
      storeName: sale.client
    });
    report.suggestedPaths.push({ saleId: sale.id, client: sale.client, path: drivePath.suggestedPath });

    // —— NF ——
    let nfSrc = null;
    if (sale.nfFile) nfSrc = findContentForName(sale.nfFile, sale.id, pools);
    if (!nfSrc) {
      const cand = [
        ...(pools.bySale.get(sale.id) || []),
        ...(pools.bySaleZip.get(sale.id) || [])
      ].filter((f) => classifyKind(f.filename, sale) === 'nf');
      const best = pickBestFile(cand, 'nf', sale);
      if (best) nfSrc = best.f;
    }
    if (nfSrc) {
      const nfNum = nfCanon
        || formatNfNumber(stripMulter(stripVpPrefix(nfSrc.filename)))
        || formatNfNumber(stripVpPrefix(nfSrc.filename))
        || 'disp';
      const canon = buildDriveAttachmentName('nf', {
        romaneioNumber: sale.romaneioNumber || rom,
        nfNumber: nfNum,
        ext: extOf(nfSrc.filename),
        originalName: stripMulter(nfSrc.filename)
      });
      pushFile(sale.id, canon, nfSrc.contentBase64, nfSrc.sizeBytes, { kind: 'nf' });
      report.fileRewrites.push({ saleId: sale.id, kind: 'nf', from: sale.nfFile || nfSrc.filename, to: canon, source: nfSrc.fullPath ? 'zip' : 'backup' });
      if (nfSrc.fullPath) report.fromZip.push({ saleId: sale.id, file: canon, zip: nfSrc.fullPath });
      sale.nfFile = canon;
    } else if (sale.nfFile) {
      report.missing.push({ saleId: sale.id, kind: 'nf', name: sale.nfFile });
    }

    // —— Pedido ——
    let evSrc = null;
    if (sale.evidenceFile) evSrc = findContentForName(sale.evidenceFile, sale.id, pools);
    if (!evSrc) {
      const cand = [
        ...(pools.bySale.get(sale.id) || []),
        ...(pools.bySaleZip.get(sale.id) || [])
      ].filter((f) => classifyKind(f.filename, sale) === 'pedido');
      const best = pickBestFile(cand, 'pedido', sale);
      if (best) evSrc = best.f;
    }
    // ignora evidence lixo "Pedido-pedido.pdf" sem conteúdo
    if (evSrc) {
      const canon = buildDriveAttachmentName('pedido', {
        romaneioNumber: sale.romaneioNumber || rom || extractRomaneioFromFilename(evSrc.filename),
        ext: extOf(evSrc.filename),
        originalName: evSrc.filename
      });
      pushFile(sale.id, canon, evSrc.contentBase64, evSrc.sizeBytes, { kind: 'pedido' });
      report.fileRewrites.push({ saleId: sale.id, kind: 'pedido', from: sale.evidenceFile || evSrc.filename, to: canon });
      sale.evidenceFile = canon;
    } else if (sale.evidenceFile && !/pedido-pedido/i.test(sale.evidenceFile)) {
      report.missing.push({ saleId: sale.id, kind: 'pedido', name: sale.evidenceFile });
    } else if (/pedido-pedido/i.test(String(sale.evidenceFile || ''))) {
      sale.evidenceFile = null;
    }

    // —— Comprovantes (histórico) ——
    const proofRefs = collectProofRefs(sale);
    let cpSeq = 0;
    const proofCanonByOld = new Map();

    for (const ref of proofRefs) {
      if (proofCanonByOld.has(ref.name)) {
        setProofRef(sale, ref.src, proofCanonByOld.get(ref.name));
        continue;
      }
      const src = findContentForName(ref.name, sale.id, pools);
      if (!src) {
        // tenta pack da venda classificado como CP
        const cand = [
          ...(pools.bySale.get(sale.id) || []),
          ...(pools.bySaleZip.get(sale.id) || [])
        ].filter((f) => classifyKind(f.filename, sale) === 'cp');
        const best = pickBestFile(cand, 'cp', sale);
        if (!best) {
          report.missing.push({ saleId: sale.id, kind: 'cp', name: ref.name, src: ref.src });
          continue;
        }
        cpSeq += 1;
        const kind = /prod|repasse/i.test(ref.src) ? 'cpprod' : 'cp';
        const canon = buildDriveAttachmentName(kind, {
          romaneioNumber: sale.romaneioNumber || rom,
          nfNumber: nfCanon || formatNfNumber(sale.nfFile) || 'disp',
          ext: extOf(best.f.filename),
          seq: cpSeq
        });
        pushFile(sale.id, canon, best.f.contentBase64, best.f.sizeBytes, { kind });
        proofCanonByOld.set(ref.name, canon);
        setProofRef(sale, ref.src, canon);
        report.fileRewrites.push({ saleId: sale.id, kind, from: ref.name, to: canon, via: 'pack-fallback' });
        continue;
      }
      cpSeq += 1;
      const kind = /prod|repasse/i.test(ref.src) ? 'cpprod' : 'cp';
      const canon = buildDriveAttachmentName(kind, {
        romaneioNumber: sale.romaneioNumber || rom,
        nfNumber: nfCanon || formatNfNumber(sale.nfFile) || 'disp',
        ext: extOf(src.filename),
        seq: cpSeq
      });
      pushFile(sale.id, canon, src.contentBase64, src.sizeBytes, { kind });
      proofCanonByOld.set(ref.name, canon);
      setProofRef(sale, ref.src, canon);
      report.fileRewrites.push({ saleId: sale.id, kind, from: ref.name, to: canon });
    }

    // CPs do pack ainda não ligados (disponíveis)
    const packAll = [
      ...(pools.bySale.get(sale.id) || []),
      ...(pools.bySaleZip.get(sale.id) || [])
    ];
    for (const f of packAll) {
      if (classifyKind(f.filename, sale) !== 'cp') continue;
      const h = f.md5 || (f.contentBase64 ? md5b64(f.contentBase64) : '');
      const already = filesOut.some((x) => x.saleId === sale.id && md5b64(x.contentBase64) === h);
      if (already) continue;
      cpSeq += 1;
      const canon = buildDriveAttachmentName('cp', {
        romaneioNumber: sale.romaneioNumber || rom,
        nfNumber: nfCanon || 'disp',
        ext: extOf(f.filename),
        seq: cpSeq
      });
      // Prefixo disponível se não está no histórico
      const linked = collectProofRefs(sale).some((r) => r.name === canon);
      const name = linked ? canon : buildDriveAttachmentName('cp', {
        romaneioNumber: sale.romaneioNumber || rom,
        nfNumber: 'disp',
        ext: extOf(f.filename),
        seq: cpSeq
      });
      pushFile(sale.id, name, f.contentBase64, f.sizeBytes, { kind: 'cp', available: !linked });
      report.fileRewrites.push({ saleId: sale.id, kind: 'cp-pack', from: f.filename, to: name });
    }

    // Consistência: refs sem binário no pacote → limpa ou religa ao único CP disponível
    const saleFiles = () => filesOut.filter((f) => f.saleId === sale.id);
    const hasFile = (name) => saleFiles().some((f) => f.filename === name);

    if (sale.nfFile && !hasFile(sale.nfFile)) {
      report.missing.push({ saleId: sale.id, kind: 'nf-orphan-ref', name: sale.nfFile });
      // mantém nome original na nota; zera campo para não 404 na UI
      sale.notes = [sale.notes || '', `[RECONCILE] NF referenciada sem binário no pacote: ${sale.nfFile}`].filter(Boolean).join('\n');
      sale.nfFile = null;
    }
    if (sale.evidenceFile && !hasFile(sale.evidenceFile)) {
      sale.evidenceFile = null;
    }

    const rebindProof = (oldName) => {
      if (!oldName) return null;
      if (hasFile(oldName)) return oldName;
      const cps = saleFiles().filter((f) => /(-CP\d{2}-|-CPProd)/i.test(f.filename));
      return cps[0]?.filename || null;
    };

    sale.paymentProofFile = rebindProof(sale.paymentProofFile);
    sale.producerPaymentProofFile = rebindProof(sale.producerPaymentProofFile);
    for (const p of sale.paymentHistory || []) {
      p.paymentProofFile = rebindProof(p.paymentProofFile);
      if (Array.isArray(p.paymentProofFiles)) {
        p.paymentProofFiles = p.paymentProofFiles.map((n) => rebindProof(n)).filter(Boolean);
      }
    }
    for (const p of sale.producerPaymentHistory || []) {
      p.paymentProofFile = rebindProof(p.paymentProofFile);
      if (Array.isArray(p.paymentProofFiles)) {
        p.paymentProofFiles = p.paymentProofFiles.map((n) => rebindProof(n)).filter(Boolean);
      }
    }

    cleanedSales.push(sale);
  }

  // Transferência Badin → W&A (depois das rotas, para sobrescrever VP022/VP023)
  for (const sale of cleanedSales) {
    if (sale.id === 'VP022' || sale.id === 'VP023') {
      applyBadinWaTransfer(sale, filesOut, report);
    }
  }

  // Após unsettle VP022, remove paymentProof links órfãos; mantém NF/pedido/CPs no pacote
  // Após settle VP023, garante arquivo do CP definitivo presente
  const vp023 = cleanedSales.find((s) => s.id === 'VP023');
  if (vp023?.paymentProofFile) {
    const has = filesOut.some((f) => f.saleId === 'VP023' && f.filename === vp023.paymentProofFile);
    if (!has) {
      const src = findContentForName('W_A-CP1.pdf', 'VP023', pools)
        || findContentForName('VP023 - W_A-CP1.pdf', 'VP023', pools);
      if (src) {
        pushFile('VP023', vp023.paymentProofFile, src.contentBase64, src.sizeBytes, { kind: 'cp' });
      }
    }
  }

  const out = {
    system: backup.system || 'AgroVenda V2',
    version: backup.version || '2.0.0',
    exportedAt: new Date().toISOString(),
    reconciledFrom: path.basename(BACKUP_PATH),
    reconciledNote: [
      'Rotas de anexos normalizadas (webhook Drive: AgroVenda/{tenant}/{loja}/{VP} + nomes canônicos).',
      `Webhook alvo: ${WEBHOOK}`,
      `Transferência: PIX R$ 33.902,40 (05/10/2026) desvinculado de Badin VP022 → baixa definitiva W&A VP023.`,
      'Demais baixas preservadas; nomes de arquivos realinhados aos campos da venda.'
    ].join(' '),
    webhookUrl: WEBHOOK,
    drivePathPattern: 'AgroVenda/{tenantSlug}/{storeFolder}/{saleId}',
    stats: {
      salesCount: cleanedSales.length,
      clientsCount: (backup.database?.clients || []).length,
      productsCount: (backup.database?.products || []).length,
      purchasesCount: (backup.database?.purchases || []).length,
      weighingSlipsCount: (backup.database?.weighingSlips || []).length,
      usersCount: (backup.database?.users || []).length,
      filesCount: filesOut.length
    },
    database: {
      ...backup.database,
      sales: cleanedSales
    },
    files: filesOut.map(({ filename, saleId, sizeBytes, contentBase64 }) => ({
      filename,
      saleId,
      sizeBytes,
      contentBase64
    }))
  };

  // strip kind meta from files already done above

  fs.writeFileSync(OUT_JSON, JSON.stringify(out), 'utf8');

  const md = [];
  md.push('# Reconciliação de rotas — Backup 2026-10-23');
  md.push('');
  md.push(`Webhook: \`${WEBHOOK}\``);
  md.push(`Padrão Drive: \`AgroVenda/{tenant}/{loja}/{VP}\``);
  md.push(`Gerado: ${out.exportedAt}`);
  md.push('');
  md.push('## Transferência Badin → W&A');
  md.push('');
  md.push('- **Valor:** R$ 33.902,40');
  md.push('- **Data:** 05/10/2026');
  md.push('- **De:** Badin Favilla `VP022` (baixa removida → Pendente; NF era R$ 33.902,40)');
  md.push('- **Para:** W&A Distribuidora `VP023` (baixa definitiva com comprovante canônico)');
  for (const t of report.transfer) {
    md.push(`- \`${t.action}\`: ${JSON.stringify(t)}`);
  }
  md.push('');
  md.push('## Resumo');
  md.push('');
  md.push(`| Métrica | Valor |`);
  md.push(`|---------|-------|`);
  md.push(`| Vendas | ${cleanedSales.length} |`);
  md.push(`| Arquivos no pacote | ${filesOut.length} |`);
  md.push(`| Rewrites | ${report.fileRewrites.length} |`);
  md.push(`| Missing (sem binário) | ${report.missing.length} |`);
  md.push(`| Incorporados do ZIP | ${report.fromZip.length} |`);
  md.push('');
  md.push('## Rewrites (amostra)');
  md.push('');
  for (const r of report.fileRewrites.slice(0, 80)) {
    md.push(`- **${r.saleId}** [${r.kind}] \`${r.from}\` → \`${r.to}\``);
  }
  if (report.fileRewrites.length > 80) md.push(`- … +${report.fileRewrites.length - 80} outros`);
  md.push('');
  md.push('## Missing');
  md.push('');
  if (!report.missing.length) md.push('_Nenhum._');
  else for (const m of report.missing) md.push(`- **${m.saleId}** ${m.kind}: \`${m.name}\``);
  md.push('');
  md.push('## Restore');
  md.push('');
  md.push('```bash');
  md.push('# UI: Configurações → Restaurar backup');
  md.push('# ou:');
  md.push('BACKUP_PATH=backups/agrovenda_backup_reconciliado_rotas_2026-10-23.json \\');
  md.push('  MONGO_URI=mongodb://127.0.0.1:27017/agrovenda \\');
  md.push('  node backend/scripts/restore_from_docs_backup.js');
  md.push('```');
  md.push('');
  md.push('Após restore, sincronizar Drive via webhook (`sale.manual_sync` / batch) para republicar pastas `AgroVenda/...`.');
  md.push('');

  fs.writeFileSync(OUT_MD, md.join('\n'), 'utf8');

  // Validação rápida
  const v22 = cleanedSales.find((s) => s.id === 'VP022');
  const v23 = cleanedSales.find((s) => s.id === 'VP023');
  const broken = [];
  for (const s of cleanedSales) {
    for (const ref of [
      s.nfFile,
      s.evidenceFile,
      s.paymentProofFile,
      ...(s.paymentHistory || []).flatMap((p) => [p.paymentProofFile, ...(p.paymentProofFiles || [])])
    ].filter(Boolean)) {
      if (!filesOut.some((f) => f.saleId === s.id && f.filename === ref)) {
        broken.push(`${s.id}:${ref}`);
      }
    }
  }

  console.log('Escrito:', path.relative(ROOT, OUT_JSON));
  console.log('Escrito:', path.relative(ROOT, OUT_MD));
  console.log('files:', filesOut.length, '| rewrites:', report.fileRewrites.length, '| missing:', report.missing.length);
  console.log('VP022 paid=', v22?.paidAmount, 'status=', v22?.paymentStatus);
  console.log('VP023 paid=', v23?.paidAmount, 'status=', v23?.paymentStatus, 'proof=', v23?.paymentProofFile);
  console.log('VP023 hist amounts=', (v23?.paymentHistory || []).map((p) => p.amount));
  console.log('refs quebradas restantes:', broken.length, broken.slice(0, 15));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
