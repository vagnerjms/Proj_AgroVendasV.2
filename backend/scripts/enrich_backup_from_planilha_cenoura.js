/**
 * Enriquece backup com a planilha docs/valores_por_carga_cenoura.xlsx
 * (aba Valores por carga).
 *
 * - Match por NF (exato, fuzzy 1 dígito) e fallback por romaneio (coluna VP)
 * - romaneioNumber = coluna VP da planilha (9712 → 09712)
 * - Aplica valor negociado VP, kg, caixas, cotação, valor NF, vencimento, notes
 * - Preserva baixas de loja/produtor já lançadas (não zera)
 *
 * Uso:
 *   node backend/scripts/enrich_backup_from_planilha_cenoura.js
 *
 * Env:
 *   BACKUP_PATH, OUT_PATH, PLANILHA_PATH
 */
const path = require('path');
const fs = require('fs');
const { formatRomaneioNumber, formatNfNumber } = require('../utils/dataHelpers');
const { roundMoney, calculateFiscalDeductions } = require('../utils/money');

const ROOT = path.resolve(__dirname, '../..');
const XLSX_PATH = path.join(ROOT, 'node_modules', 'xlsx');
const SHEET_PATH = process.env.PLANILHA_PATH
  || path.join(ROOT, 'docs', 'valores_por_carga_cenoura.xlsx');
const BASE_PATH = process.env.BACKUP_PATH
  || path.join(ROOT, 'docs', 'agrovenda_backup_completo_2026-10-02.json');
const OUT_PATH = process.env.OUT_PATH
  || path.join(ROOT, 'docs', 'agrovenda_backup_reconciliado_vp_2026-10-02.json');

const BOX_KG = 29;

function canonicalNf(v) {
  const d = String(v || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.length <= 9) return d;
  const named = String(v || '').match(/NF[-_]?(\d{6,12})/i);
  if (named) return named[1].replace(/\D/g, '');
  if (d.length === 44) return d.slice(25, 34).replace(/^0+/, '') || d.slice(25, 34);
  return d.slice(-8);
}

function saleNfKey(sale) {
  const fromNotes = (sale.notes || '').match(/NF:\s*([\d.]+)/i);
  if (fromNotes) {
    const k = canonicalNf(fromNotes[1]);
    if (k.length >= 6) return k;
  }
  const fromFile = formatNfNumber(sale.nfFile) || canonicalNf(sale.nfFile);
  if (fromFile.length >= 6) return fromFile;
  const fromKey = formatNfNumber(sale.nfeKey) || canonicalNf(sale.nfeKey);
  if (fromKey.length >= 6) return fromKey;
  return fromFile || fromKey || '';
}

function saleRomDigits(sale) {
  const fromField = String(sale.romaneioNumber || '').replace(/\D/g, '');
  if (fromField) return String(Number(fromField));
  const fromNotes = (sale.notes || '').match(/Planilha VP:\s*(\d+)/i)
    || (sale.notes || '').match(/Rastreio VP\s*0*(\d+)/i)
    || (sale.notes || '').match(/Romaneio:?\s*0*(\d+)/i);
  if (fromNotes) return String(Number(fromNotes[1]));
  return '';
}

function nfDistance(a, b) {
  if (!a || !b || a.length !== b.length) return 99;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) diff += 1;
  return diff;
}

function excelSerialToIso(n) {
  if (typeof n === 'number' && n > 20000) {
    const d = new Date(Date.UTC(1899, 11, 30) + Math.round(n) * 86400000);
    return d.toISOString().slice(0, 10);
  }
  if (typeof n === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(n.trim())) {
    const [dd, mm, yyyy] = n.trim().split('/');
    return `${yyyy}-${mm}-${dd}`;
  }
  if (typeof n === 'string' && /^\d{4}-\d{2}-\d{2}/.test(n)) return n.slice(0, 10);
  return '';
}

function stampPlanilhaVp(notes, planilhaVp, valorVp) {
  const tag = `Planilha VP: ${planilhaVp}`;
  let n = String(notes || '');
  if (/Planilha VP:\s*\d+/i.test(n)) {
    n = n.replace(/Planilha VP:\s*\d+/i, tag);
  } else {
    n = n ? `${n} | ${tag}` : tag;
  }
  if (/Valor VP:\s*R\$\s*[\d.,]+/i.test(n)) {
    n = n.replace(/Valor VP:\s*R\$\s*[\d.,]+/i, `Valor VP: R$ ${roundMoney(valorVp || 0).toFixed(2)}`);
  } else {
    n = `${n} | Valor VP: R$ ${roundMoney(valorVp || 0).toFixed(2)}`;
  }
  return n;
}

function syncClientPaymentStatus(sale, valorVp) {
  const paid = roundMoney(Number(sale.paidAmount) || 0);
  if (paid <= 0 && !(Array.isArray(sale.paymentHistory) && sale.paymentHistory.length > 0)) {
    if (sale.paymentStatus === 'Recebido' || sale.paymentStatus === 'Parcial') {
      return sale.paymentStatus;
    }
    return valorVp > 0 && Number(sale.totalOperation) <= 0 && !sale.nfFile
      ? (sale.paymentStatus === 'Pendente' ? 'Pendente' : 'A Receber')
      : (sale.paymentStatus || 'A Receber');
  }
  if (valorVp > 0 && paid >= valorVp - 0.05) return 'Recebido';
  if (paid > 0) return 'Parcial';
  return sale.paymentStatus || 'A Receber';
}

function syncProducerPaymentStatus(sale, valorNf) {
  const paid = roundMoney(Number(sale.producerPaidAmount) || 0);
  if (paid <= 0 && !(Array.isArray(sale.producerPaymentHistory) && sale.producerPaymentHistory.length > 0)) {
    return sale.producerPaymentStatus || (valorNf > 0 ? 'A Pagar' : sale.producerPaymentStatus || 'A Pagar');
  }
  if (valorNf > 0 && paid >= valorNf - 0.05) return 'Pago';
  if (paid > 0) return 'Parcial';
  return sale.producerPaymentStatus || 'A Pagar';
}

function loadSheetRows() {
  if (!fs.existsSync(XLSX_PATH)) {
    throw new Error(`Pacote xlsx não encontrado em ${XLSX_PATH}`);
  }
  if (!fs.existsSync(SHEET_PATH)) {
    throw new Error(`Planilha não encontrada: ${SHEET_PATH}`);
  }
  // eslint-disable-next-line import/no-dynamic-require, global-require
  const XLSX = require(XLSX_PATH);
  const wb = XLSX.readFile(SHEET_PATH);
  const sheet = wb.Sheets['Valores por carga'];
  if (!sheet) throw new Error('Aba "Valores por carga" ausente');
  const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  const rows = [];
  for (let i = 8; i < raw.length; i += 1) {
    const r = raw[i];
    const planilhaVp = r[4];
    if (planilhaVp === '' || planilhaVp === null || planilhaVp === undefined) continue;
    const nfRaw = r[6];
    const semNf = !nfRaw || String(nfRaw).toUpperCase().includes('SEM');
    rows.push({
      planilhaVp: Number(planilhaVp) || planilhaVp,
      loja: String(r[5] || '').trim(),
      nfRaw,
      nfKey: semNf ? '' : canonicalNf(nfRaw),
      semNf,
      pesoColheita: Number(r[7]) || 0,
      pesoVp: Number(r[8]) || Number(r[7]) || 0,
      pesoNf: semNf ? 0 : (Number(r[9]) || 0),
      caixas: Number(r[11]) || 0,
      cotacao: Number(r[12]) || 0,
      valorVp: Number(r[13]) || 0,
      precoNfKg: Number(r[14]) || 0,
      valorNf: semNf ? 0 : (Number(r[15]) || 0),
      placa: String(r[1] || '').replace(/\s+/g, '').trim(),
      dataColheita: excelSerialToIso(r[0]),
      vencimento: excelSerialToIso(r[23]),
      obs: String(r[24] || '')
    });
  }
  return rows;
}

function applySheetToSale(sale, row) {
  const peso = row.pesoVp || row.pesoColheita || Number(sale.totalKg) || 0;
  const caixas = row.caixas > 0
    ? row.caixas
    : (peso > 0 ? Number((peso / BOX_KG).toFixed(6)) : Number(sale.totalVolumes) || 0);
  const valorVp = roundMoney(row.valorVp);
  const valorNf = roundMoney(row.valorNf);
  const fiscalNf = calculateFiscalDeductions(valorNf > 0 ? valorNf : 0);
  const fiscalVp = calculateFiscalDeductions(valorVp);
  const funrural = valorNf > 0 ? fiscalNf.funruralTotal : fiscalVp.funruralTotal;

  const romaneioNumber = formatRomaneioNumber(row.planilhaVp);

  const next = {
    ...sale,
    romaneioNumber,
    valorTotalVP: valorVp,
    dailyQuote: row.cotacao || Number(sale.dailyQuote) || 0,
    totalKg: peso,
    totalVolumes: caixas,
    totalOperation: valorNf,
    funruralTotal: funrural,
    previdenciaSocial: valorNf > 0 ? fiscalNf.previdencia : fiscalVp.previdencia,
    rat: valorNf > 0 ? fiscalNf.rat : fiscalVp.rat,
    senar: valorNf > 0 ? fiscalNf.senar : fiscalVp.senar,
    notes: stampPlanilhaVp(sale.notes, row.planilhaVp, valorVp),
    // Preserva baixas já lançadas
    paidAmount: roundMoney(Number(sale.paidAmount) || 0),
    paymentHistory: Array.isArray(sale.paymentHistory) ? sale.paymentHistory : [],
    producerPaidAmount: roundMoney(Number(sale.producerPaidAmount) || 0),
    producerPaymentHistory: Array.isArray(sale.producerPaymentHistory)
      ? sale.producerPaymentHistory
      : []
  };

  next.paymentStatus = syncClientPaymentStatus(next, valorVp);
  next.producerPaymentStatus = syncProducerPaymentStatus(next, valorNf);

  if (row.vencimento) next.dueDate = row.vencimento;
  if (row.placa && (!sale.truckPlate || sale.truckPlate === 'SEM PLACA')) {
    next.truckPlate = row.placa;
  }
  if (valorNf <= 0 && !sale.nfFile) {
    next.status = 'Pendente NF';
  }

  if (Array.isArray(sale.items) && sale.items.length > 0) {
    next.items = sale.items.map((it, idx) => {
      const item = { ...it };
      if (idx === 0) {
        item.kg = peso;
        item.quantity = caixas;
        item.dailyQuote = row.cotacao || item.dailyQuote || 0;
        item.valorTotalVP = valorVp;
        item.boxWeightKg = BOX_KG;
        if (valorNf > 0) {
          item.total = valorNf;
          if (peso > 0 && row.precoNfKg > 0) item.price = roundMoney(row.precoNfKg * BOX_KG);
        } else {
          item.total = 0;
        }
      }
      return item;
    });
  }

  return next;
}

function findSheetRow(sale, sheetRows, usedIndexes) {
  const nfKey = saleNfKey(sale);
  if (nfKey) {
    for (let i = 0; i < sheetRows.length; i += 1) {
      if (usedIndexes.has(i)) continue;
      if (sheetRows[i].nfKey && sheetRows[i].nfKey === nfKey) {
        return { row: sheetRows[i], index: i, match: 'exact', nfKey };
      }
    }
    for (let i = 0; i < sheetRows.length; i += 1) {
      if (usedIndexes.has(i)) continue;
      if (sheetRows[i].nfKey && nfDistance(sheetRows[i].nfKey, nfKey) === 1) {
        return { row: sheetRows[i], index: i, match: 'fuzzy', nfKey };
      }
    }
  }

  const rom = saleRomDigits(sale);
  if (rom) {
    for (let i = 0; i < sheetRows.length; i += 1) {
      if (usedIndexes.has(i)) continue;
      if (String(Number(sheetRows[i].planilhaVp)) === rom) {
        return { row: sheetRows[i], index: i, match: 'romaneio', nfKey: nfKey || '' };
      }
    }
  }

  return null;
}

function isCenouraSale(sale) {
  const blob = `${JSON.stringify(sale.items || [])} ${sale.notes || ''}`;
  return /cenoura/i.test(blob);
}

function main() {
  if (!fs.existsSync(BASE_PATH)) {
    throw new Error(`Backup base não encontrado: ${BASE_PATH}`);
  }

  const sheetRows = loadSheetRows();
  const backup = JSON.parse(fs.readFileSync(BASE_PATH, 'utf8'));
  const sales = backup.database?.sales || [];

  console.log('Base:', BASE_PATH);
  console.log('Planilha:', SHEET_PATH);
  console.log('Planilha linhas:', sheetRows.length);
  console.log('Vendas no backup:', sales.length);

  const usedIndexes = new Set();
  const log = [];
  let exact = 0;
  let fuzzy = 0;
  let romaneioMatch = 0;
  let romFilled = 0;
  let romWasEmpty = 0;

  const enrichedSales = sales.map((sale) => {
    const hit = findSheetRow(sale, sheetRows, usedIndexes);
    if (!hit) {
      return sale;
    }
    usedIndexes.add(hit.index);
    if (hit.match === 'exact') exact += 1;
    else if (hit.match === 'fuzzy') fuzzy += 1;
    else romaneioMatch += 1;

    const beforeRom = sale.romaneioNumber || '';
    const paidBefore = roundMoney(Number(sale.paidAmount) || 0);
    const updated = applySheetToSale(sale, hit.row);
    if (!beforeRom && updated.romaneioNumber) romWasEmpty += 1;
    if (updated.romaneioNumber) romFilled += 1;

    log.push({
      id: sale.id,
      match: hit.match,
      nfSale: hit.nfKey,
      nfSheet: hit.row.nfKey,
      planilhaVp: hit.row.planilhaVp,
      romaneio: updated.romaneioNumber,
      vpBefore: roundMoney(sale.valorTotalVP),
      vpAfter: updated.valorTotalVP,
      nfBefore: roundMoney(sale.totalOperation),
      nfValAfter: updated.totalOperation,
      paidBefore,
      paidAfter: updated.paidAmount,
      paymentStatus: updated.paymentStatus
    });
    return updated;
  });

  const unusedSheet = sheetRows
    .map((r, i) => ({ r, i }))
    .filter(({ i }) => !usedIndexes.has(i))
    .map(({ r }) => ({ planilhaVp: r.planilhaVp, nf: r.nfKey, loja: r.loja }));

  backup.database.sales = enrichedSales;
  backup.exportedAt = new Date().toISOString();
  backup.reconciledNote = [
    backup.reconciledNote || '',
    'Reconciliation VP: valores_por_carga_cenoura.xlsx (VALOR NEGOCIADO VP + NF); baixas preservadas.'
  ].filter(Boolean).join(' ');
  backup.reconciledFromPlanilha = path.basename(SHEET_PATH);
  backup.stats = {
    ...(backup.stats || {}),
    salesCount: enrichedSales.length,
    planilhaMatchedExact: exact,
    planilhaMatchedFuzzy: fuzzy,
    planilhaMatchedRomaneio: romaneioMatch,
    planilhaUnusedRows: unusedSheet.length,
    romaneioFilledFromPlanilha: romFilled,
    romaneioWasEmptyBefore: romWasEmpty
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(backup));

  // Sanity
  const sheetByRom = new Map(
    sheetRows.map((r) => [String(Number(r.planilhaVp)), r])
  );
  const cenoura = enrichedSales.filter(isCenouraSale);
  let vpOk = 0;
  let vpBad = 0;
  const badRows = [];
  for (const s of cenoura) {
    const rom = String(Number(String(s.romaneioNumber || '').replace(/\D/g, '') || 0));
    const row = sheetByRom.get(rom);
    if (!row) {
      vpBad += 1;
      badRows.push({ id: s.id, reason: 'no-sheet-row' });
      continue;
    }
    const dVp = Math.abs(roundMoney(s.valorTotalVP) - roundMoney(row.valorVp));
    const dNf = Math.abs(roundMoney(s.totalOperation) - roundMoney(row.valorNf));
    if (dVp < 0.05 && dNf < 0.05) vpOk += 1;
    else {
      vpBad += 1;
      badRows.push({
        id: s.id,
        rom: s.romaneioNumber,
        saleVp: s.valorTotalVP,
        sheetVp: roundMoney(row.valorVp),
        saleNf: s.totalOperation,
        sheetNf: roundMoney(row.valorNf)
      });
    }
  }

  const paidCenoura = cenoura.filter((s) => (Number(s.paidAmount) || 0) > 0);
  const paidBatata = enrichedSales.filter((s) => !isCenouraSale(s) && (Number(s.paidAmount) || 0) > 0);

  console.log('\n=== Cobertura ===');
  console.log('Match exact:', exact);
  console.log('Match fuzzy:', fuzzy);
  console.log('Match romaneio:', romaneioMatch);
  console.log('Romaneios preenchidos (após enrich):', romFilled);
  console.log('Romaneios que estavam vazios e foram preenchidos:', romWasEmpty);
  console.log('Linhas planilha sem venda:', unusedSheet.length);
  if (unusedSheet.length) console.log(unusedSheet);

  console.log('\nMatched:');
  for (const row of log) {
    const changed = Math.abs(row.vpBefore - row.vpAfter) >= 0.02
      || Math.abs(row.nfBefore - row.nfValAfter) >= 0.02;
    console.log(
      `  ${row.id} [${row.match}] rom ${row.romaneio} | VP ${row.vpBefore}→${row.vpAfter} | NF ${row.nfBefore}→${row.nfValAfter} | paid ${row.paidAfter} (${row.paymentStatus})${changed ? ' *' : ''}`
    );
  }

  console.log('\n=== Sanity ===');
  console.log(`Cenoura VP/NF vs planilha: ${vpOk}/${cenoura.length} ok, ${vpBad} bad`);
  if (badRows.length) console.log(JSON.stringify(badRows, null, 2));
  console.log('Baixas cenoura preservadas:', paidCenoura.map((s) => `${s.id}=${s.paidAmount}`).join(', ') || '—');
  console.log('Baixas não-cenoura:', paidBatata.map((s) => `${s.id}=${s.paidAmount}`).join(', ') || '—');

  const vp034 = enrichedSales.find((s) => s.id === 'VP034');
  const vp004 = enrichedSales.find((s) => s.id === 'VP004');
  if (vp034) {
    console.log('VP034 check:', {
      vp: vp034.valorTotalVP,
      nf: vp034.totalOperation,
      kg: vp034.totalKg,
      quote: vp034.dailyQuote
    });
  }
  if (vp004) {
    console.log('VP004 check:', { vp: vp004.valorTotalVP, nf: vp004.totalOperation });
  }

  console.log('\nJSON escrito:', OUT_PATH);
  console.log('Tamanho bytes:', fs.statSync(OUT_PATH).size);

  if (vpBad > 0) {
    process.exitCode = 1;
  }
}

main();
