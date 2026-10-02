/**
 * Reconcilia docs/agrovenda_backup_completo_*.json:
 * - Relatório MD + CSV (checklist por VP)
 * - JSON limpo com pagamentos zerados + romaneio/NF/anexos normalizados
 *
 * Uso:
 *   node backend/scripts/reconcile_docs_backup.js
 *   BACKUP_PATH=docs/foo.json node backend/scripts/reconcile_docs_backup.js
 */
const path = require('path');
const fs = require('fs');
const {
  formatNfNumber,
  extractRomaneioFromFilename,
  formatRomaneioNumber,
  extractRomaneioFromNotes,
  resolveRomaneioNumber,
  buildDriveAttachmentName
} = require('../utils/dataHelpers');

const ROOT = path.resolve(__dirname, '../..');
const DEFAULT_BACKUP = path.join(ROOT, 'docs', 'agrovenda_backup_completo_2026-10-01.json');
const BACKUP_PATH = process.env.BACKUP_PATH
  ? path.resolve(process.cwd(), process.env.BACKUP_PATH)
  : DEFAULT_BACKUP;

const OUT_JSON = path.join(ROOT, 'docs', 'agrovenda_backup_reconciliado_zerado.json');
const OUT_MD = path.join(ROOT, 'docs', 'RECONCILIACAO_BACKUP_2026-10-01.md');
const OUT_CSV = path.join(ROOT, 'docs', 'RECONCILIACAO_BACKUP_2026-10-01.csv');

function extOf(name) {
  const m = String(name || '').match(/(\.[a-zA-Z0-9]{2,5})$/);
  return m ? m[1].toLowerCase() : '.bin';
}

function stripVpPrefix(name) {
  return String(name || '').replace(/^VP\d+\s*-\s*/i, '').trim();
}

function classifyFile(filename, sale) {
  const base = stripVpPrefix(filename);
  const lower = base.toLowerCase();
  if (/cp[-_]|comprovante|sicoob|pix-cp|pagamento|cheque/i.test(lower)) return 'CP';
  if (/^nf[-_]|nfa[-_]|lancada|\d{7,9}\s*[-_].*\.pdf$/i.test(lower) || formatNfNumber(base)) {
    if (extractRomaneioFromFilename(base) && /\.(jpe?g|png|webp)$/i.test(lower)) return 'PEDIDO';
    if (/\.pdf$/i.test(lower) || /^nf/i.test(lower) || /nfa/i.test(lower) || /lancada/i.test(lower)) return 'NF';
  }
  if (extractRomaneioFromFilename(base) || /\.(jpe?g|png|webp)$/i.test(lower)) return 'PEDIDO';
  if (sale?.nfFile && (filename.includes(sale.nfFile) || sale.nfFile.includes(path.basename(filename)))) return 'NF';
  if (sale?.evidenceFile && (filename.includes(sale.evidenceFile) || sale.evidenceFile.includes(path.basename(filename)))) {
    return 'PEDIDO';
  }
  if (sale?.paymentProofFile && filename.includes(String(sale.paymentProofFile))) return 'CP';
  return 'OUTRO';
}

function productOf(sale) {
  return sale.items?.[0]?.product || sale.product || '';
}

function unitOf(sale) {
  return sale.items?.[0]?.unit || '';
}

function nfValor(sale) {
  return Number(sale.totalOperation ?? sale.valorTotalNF ?? sale.valorNF ?? 0) || 0;
}

function csvEscape(v) {
  const s = String(v ?? '');
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function buildRows(backup) {
  const sales = backup.database?.sales || [];
  const files = Array.isArray(backup.files) ? backup.files : [];
  const filesBySale = {};
  const orphans = [];

  for (const f of files) {
    if (!f.saleId) {
      orphans.push(f);
      continue;
    }
    (filesBySale[f.saleId] = filesBySale[f.saleId] || []).push(f);
  }

  const rows = sales.map((sale) => {
    const pack = filesBySale[sale.id] || [];
    const classified = pack.map((f) => ({
      ...f,
      kind: classifyFile(f.filename, sale)
    }));

    const pedidoFiles = classified.filter((f) => f.kind === 'PEDIDO');
    const nfFiles = classified.filter((f) => f.kind === 'NF');
    const cpFiles = classified.filter((f) => f.kind === 'CP' || f.kind === 'OUTRO');

    const romFromSale = resolveRomaneioNumber(sale);
    const romFromPack = pedidoFiles
      .map((f) => extractRomaneioFromFilename(stripVpPrefix(f.filename)))
      .find(Boolean) || '';
    const romaneio = romFromSale || romFromPack || '';

    const nfCanon =
      formatNfNumber(sale.nfFile) ||
      formatNfNumber(sale.nfeKey) ||
      formatNfNumber(nfFiles[0] ? stripVpPrefix(nfFiles[0].filename) : '') ||
      '';

    const paid = Number(sale.paidAmount) || 0;
    const prodPaid = Number(sale.producerPaidAmount) || 0;
    const vp = Number(sale.valorTotalVP) || 0;
    const vol = Number(sale.totalVolumes) || 0;
    const kg = Number(sale.totalKg) || 0;

    const flags = [];
    if (!nfCanon && !sale.nfFile) flags.push('SEM_NF');
    if (!romaneio && !sale.evidenceFile && pedidoFiles.length === 0) flags.push('SEM_PEDIDO');
    if (vp <= 0) flags.push('VP_ZERADO');
    if (paid > 0) flags.push('TINHA_BAIXA_LOJA');
    if (prodPaid > 0) flags.push('TINHA_REPASSE');
    if (cpFiles.length > 0) flags.push('CP_DISPONIVEL');

    const acoes = [];
    if (flags.includes('SEM_NF')) acoes.push('Anexar NF');
    if (flags.includes('SEM_PEDIDO')) acoes.push('Anexar canhoto/pedido');
    if (flags.includes('VP_ZERADO')) acoes.push('Conferir valor negociado');
    if (flags.includes('TINHA_BAIXA_LOJA')) acoes.push('Refazer Receber (loja) manualmente');
    if (flags.includes('TINHA_REPASSE')) acoes.push('Refazer repasse produtor se aplicável');
    if (flags.includes('CP_DISPONIVEL')) acoes.push('Reassociar CP na baixa');
    if (acoes.length === 0) acoes.push('Conferir na UI e baixar se devido');

    return {
      id: sale.id,
      client: sale.client || '',
      product: productOf(sale),
      unit: unitOf(sale),
      romaneio,
      nfCanon,
      nfFileOrig: sale.nfFile || '',
      evidenceOrig: sale.evidenceFile || '',
      kg,
      vol,
      vp,
      nfVal: nfValor(sale),
      paidBefore: paid,
      prodPaidBefore: prodPaid,
      paymentMethodBefore: sale.paymentMethod || '',
      pedidoNomes: pedidoFiles.map((f) => f.filename).join(' | '),
      nfNomes: nfFiles.map((f) => f.filename).join(' | '),
      cpNomes: cpFiles.map((f) => f.filename).join(' | '),
      flags: flags.join('|'),
      acao: acoes.join('; '),
      _sale: sale,
      _classified: classified
    };
  });

  rows.sort((a, b) => String(a.id).localeCompare(String(b.id), undefined, { numeric: true }));
  return { rows, orphans, filesBySale };
}

function cleanSale(row) {
  const sale = JSON.parse(JSON.stringify(row._sale));
  const romaneio = row.romaneio || '';
  const nfCanon = row.nfCanon || '';

  const pedidoSrc = row._classified.find((f) => f.kind === 'PEDIDO');
  const nfSrc = row._classified.find((f) => f.kind === 'NF')
    || (sale.nfFile
      ? row._classified.find((f) => f.filename.includes(path.basename(String(sale.nfFile))))
      : null);

  let evidenceFile = null;
  if (pedidoSrc || sale.evidenceFile) {
    const srcName = pedidoSrc ? stripVpPrefix(pedidoSrc.filename) : path.basename(String(sale.evidenceFile));
    const ext = extOf(srcName);
    const romPart = romaneio || extractRomaneioFromFilename(srcName) || '';
    evidenceFile = buildDriveAttachmentName('pedido', {
      romaneioNumber: romPart,
      ext,
      originalName: srcName
    });
  }

  let nfFile = null;
  if (nfSrc || sale.nfFile) {
    const srcName = nfSrc ? stripVpPrefix(nfSrc.filename) : path.basename(String(sale.nfFile));
    const ext = extOf(srcName) || '.pdf';
    nfFile = buildDriveAttachmentName('nf', {
      romaneioNumber: romaneio,
      nfNumber: nfCanon || formatNfNumber(srcName),
      ext,
      originalName: srcName
    });
  }

  sale.paidAmount = 0;
  sale.producerPaidAmount = 0;
  sale.paymentHistory = [];
  sale.producerPaymentHistory = [];
  sale.paymentMethod = '';
  sale.paymentProofFile = null;
  sale.producerPaymentProofFile = null;
  if (romaneio) sale.romaneioNumber = formatRomaneioNumber(romaneio);
  sale.evidenceFile = evidenceFile;
  sale.nfFile = nfFile;

  // Status comercial aberto
  if (sale.paymentStatus) sale.paymentStatus = 'Pendente';
  if (sale.status === 'Recebido' || sale.status === 'Concluído' || sale.status === 'Parcial') {
    sale.status = 'Pendente';
  }

  const fileRewrites = [];
  if (pedidoSrc && evidenceFile) {
    fileRewrites.push({
      from: pedidoSrc.filename,
      to: evidenceFile,
      saleId: sale.id,
      contentBase64: pedidoSrc.contentBase64,
      sizeBytes: pedidoSrc.sizeBytes
    });
  }
  if (nfSrc && nfFile) {
    fileRewrites.push({
      from: nfSrc.filename,
      to: nfFile,
      saleId: sale.id,
      contentBase64: nfSrc.contentBase64,
      sizeBytes: nfSrc.sizeBytes
    });
  }

  // CPs ficam disponíveis no pacote com nome estável, sem vincular ao Sale
  for (const cp of row._classified.filter((f) => f.kind === 'CP' || f.kind === 'OUTRO')) {
    const base = stripVpPrefix(cp.filename);
    const ext = extOf(base);
    const baseNoExt = base.replace(/\.[a-zA-Z0-9]{2,5}$/i, '');
    const safe = baseNoExt.replace(/[^\w.\-]+/g, '_').slice(0, 60);
    fileRewrites.push({
      from: cp.filename,
      to: `${sale.id} - CP-disponivel-${safe}${ext}`,
      saleId: sale.id,
      contentBase64: cp.contentBase64,
      sizeBytes: cp.sizeBytes,
      cpAvailable: true
    });
  }

  return { sale, fileRewrites };
}

function writeCsv(rows) {
  const headers = [
    'id', 'client', 'product', 'unit', 'romaneio', 'nfCanon', 'kg', 'vol', 'vp', 'nfVal',
    'paidBefore', 'prodPaidBefore', 'paymentMethodBefore',
    'pedidoNomes', 'nfNomes', 'cpNomes', 'flags', 'acao'
  ];
  const lines = [headers.join(',')];
  for (const r of rows) {
    lines.push(headers.map((h) => csvEscape(r[h])).join(','));
  }
  fs.writeFileSync(OUT_CSV, lines.join('\n'), 'utf8');
}

function writeMd(rows, orphans, backup) {
  const tinhaBaixa = rows.filter((r) => r.flags.includes('TINHA_BAIXA_LOJA'));
  const tinhaRepasse = rows.filter((r) => r.flags.includes('TINHA_REPASSE'));
  const semNf = rows.filter((r) => r.flags.includes('SEM_NF'));
  const semPedido = rows.filter((r) => r.flags.includes('SEM_PEDIDO'));
  const vpZero = rows.filter((r) => r.flags.includes('VP_ZERADO'));

  const lines = [];
  lines.push('# Reconciliação Backup — AgroVenda');
  lines.push('');
  lines.push(`Fonte: \`${path.relative(ROOT, BACKUP_PATH)}\``);
  lines.push(`Exportado em: ${backup.exportedAt || '—'}`);
  lines.push(`Gerado em: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('## Objetivo');
  lines.push('');
  lines.push('- Checklist do que a UI deve mostrar após restore do JSON **reconciliado zerado**.');
  lines.push('- Pagamentos loja/produtor **zerados** — baixas serão refeitas manualmente.');
  lines.push('- Romaneio, NF, valores, quantidades e anexos com nomes estáveis para rastreabilidade.');
  lines.push('');
  lines.push('## Resumo');
  lines.push('');
  lines.push(`| Métrica | Valor |`);
  lines.push(`|---------|-------|`);
  lines.push(`| Vendas (VP) | ${rows.length} |`);
  lines.push(`| Tinham baixa loja | ${tinhaBaixa.length} |`);
  lines.push(`| Tinham repasse produtor | ${tinhaRepasse.length} |`);
  lines.push(`| Sem NF | ${semNf.map((r) => r.id).join(', ') || '—'} |`);
  lines.push(`| Sem pedido/canhoto | ${semPedido.length} |`);
  lines.push(`| Valor negociado = 0 | ${vpZero.map((r) => r.id).join(', ') || '—'} |`);
  lines.push(`| Arquivos órfãos (sem saleId) | ${orphans.length} |`);
  lines.push('');
  lines.push('## Restore');
  lines.push('');
  lines.push('```bash');
  lines.push('# Local / Docker host Mongo');
  lines.push('BACKUP_PATH=docs/agrovenda_backup_reconciliado_zerado.json \\');
  lines.push('  MONGO_URI=mongodb://127.0.0.1:27017/agrovenda \\');
  lines.push('  node backend/scripts/restore_from_docs_backup.js');
  lines.push('```');
  lines.push('');
  lines.push('CSV completo: [`RECONCILIACAO_BACKUP_2026-10-01.csv`](./RECONCILIACAO_BACKUP_2026-10-01.csv)');
  lines.push('');
  lines.push('## Checklist por VP');
  lines.push('');
  lines.push('| VP | Cliente | Produto | Romaneio | Nº NF | Peso | Qtd | Valor neg. | Valor NF | Flags | Ação UI |');
  lines.push('|----|---------|---------|----------|-------|------|-----|------------|----------|-------|---------|');

  for (const r of rows) {
    const qtd = r.unit ? `${r.vol.toFixed(2)} ${r.unit}` : r.vol.toFixed(2);
    lines.push(
      `| ${r.id} | ${String(r.client).replace(/\|/g, '/').slice(0, 28)} | ${String(r.product).slice(0, 16)} | ${r.romaneio || '—'} | ${r.nfCanon || '—'} | ${r.kg || '—'} | ${qtd} | ${r.vp.toFixed(2)} | ${r.nfVal.toFixed(2)} | ${r.flags || '—'} | ${r.acao} |`
    );
  }

  lines.push('');
  lines.push('## Anexos por VP (origem → destino no JSON limpo)');
  lines.push('');
  for (const r of rows) {
    const { sale, fileRewrites } = cleanSale(r);
    lines.push(`### ${r.id}`);
    lines.push(`- Romaneio: \`${sale.romaneioNumber || '—'}\` | NF arquivo: \`${sale.nfFile || '—'}\` | Pedido: \`${sale.evidenceFile || '—'}\``);
    lines.push(`- Antes: paid=${r.paidBefore} / prodPaid=${r.prodPaidBefore} / method=${r.paymentMethodBefore || '—'}`);
    if (fileRewrites.length === 0) {
      lines.push('- Sem arquivos no pacote para este VP');
    } else {
      for (const fr of fileRewrites) {
        const tag = fr.cpAvailable ? 'CP disponivel' : 'anexo';
        lines.push(`- (${tag}) \`${fr.from}\` → \`${fr.to}\``);
      }
    }
    lines.push('');
  }

  lines.push('## Arquivos órfãos (reassociar manualmente se necessário)');
  lines.push('');
  if (orphans.length === 0) {
    lines.push('_Nenhum._');
  } else {
    const uniq = [...new Set(orphans.map((o) => o.filename))];
    for (const name of uniq) {
      lines.push(`- \`${name}\``);
    }
  }
  lines.push('');
  lines.push('## VPs que tinham baixa (refazer na tela Contas e Fluxos)');
  lines.push('');
  lines.push(tinhaBaixa.map((r) => `- **${r.id}** — pago antes R$ ${r.paidBefore.toFixed(2)} (${r.paymentMethodBefore || 'sem método'})`).join('\n') || '_Nenhum._');
  lines.push('');

  fs.writeFileSync(OUT_MD, lines.join('\n'), 'utf8');
}

function buildCleanBackup(backup, rows, orphans) {
  const cleanedSales = [];
  const cleanedFiles = [];
  const seenNames = new Set();

  for (const row of rows) {
    const { sale, fileRewrites } = cleanSale(row);
    cleanedSales.push(sale);
    for (const fr of fileRewrites) {
      if (!fr.contentBase64 || seenNames.has(fr.to)) continue;
      seenNames.add(fr.to);
      cleanedFiles.push({
        filename: fr.to,
        saleId: fr.saleId,
        sizeBytes: fr.sizeBytes || 0,
        contentBase64: fr.contentBase64
      });
    }
  }

  // Órfãos: manter com saleId vazio e prefixo ORPHAO-
  for (const o of orphans) {
    if (!o.contentBase64) continue;
    const name = `ORPHAO - ${stripVpPrefix(o.filename)}`;
    if (seenNames.has(name)) continue;
    seenNames.add(name);
    cleanedFiles.push({
      filename: name,
      saleId: '',
      sizeBytes: o.sizeBytes || 0,
      contentBase64: o.contentBase64
    });
  }

  return {
    system: backup.system || 'AgroVenda V2',
    version: backup.version || '2.0.0',
    exportedAt: new Date().toISOString(),
    reconciledFrom: path.basename(BACKUP_PATH),
    reconciledNote: 'Pagamentos zerados; romaneio/NF/anexos normalizados para baixas manuais.',
    stats: {
      salesCount: cleanedSales.length,
      clientsCount: (backup.database?.clients || []).length,
      productsCount: (backup.database?.products || []).length,
      purchasesCount: (backup.database?.purchases || []).length,
      weighingSlipsCount: (backup.database?.weighingSlips || []).length,
      usersCount: (backup.database?.users || []).length,
      filesCount: cleanedFiles.length
    },
    database: {
      ...backup.database,
      sales: cleanedSales
    },
    files: cleanedFiles
  };
}

function main() {
  if (!fs.existsSync(BACKUP_PATH)) {
    console.error('Backup não encontrado:', BACKUP_PATH);
    process.exit(1);
  }

  console.log('Lendo', BACKUP_PATH);
  const backup = JSON.parse(fs.readFileSync(BACKUP_PATH, 'utf8'));
  const { rows, orphans } = buildRows(backup);

  writeCsv(rows);
  writeMd(rows, orphans, backup);

  const clean = buildCleanBackup(backup, rows, orphans);
  fs.writeFileSync(OUT_JSON, JSON.stringify(clean), 'utf8');

  const paidLeft = clean.database.sales.filter((s) => Number(s.paidAmount) > 0).length;
  const withRom = clean.database.sales.filter((s) => s.romaneioNumber).length;

  console.log('Escrito:', path.relative(ROOT, OUT_MD));
  console.log('Escrito:', path.relative(ROOT, OUT_CSV));
  console.log('Escrito:', path.relative(ROOT, OUT_JSON));
  console.log('VPs:', rows.length, '| TINHA_BAIXA_LOJA:', rows.filter((r) => r.flags.includes('TINHA_BAIXA_LOJA')).length);
  console.log('JSON limpo: paid>0 restantes:', paidLeft, '| com romaneioNumber:', withRom, '| files:', clean.files.length);
}

main();
