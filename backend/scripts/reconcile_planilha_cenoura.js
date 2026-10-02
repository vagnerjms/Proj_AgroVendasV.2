/**
 * Reconcilia vendas Bruno (cenoura) com docs/valores_por_carga_cenoura.xlsx.
 * Match por NF (dígitos). Zera baixas cliente/produtor — você lança depois.
 *
 * Uso (Mongo local):
 *   node backend/scripts/reconcile_planilha_cenoura.js           # dry-run
 *   node backend/scripts/reconcile_planilha_cenoura.js --apply   # grava
 */
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const { Sale } = require('../models');
const { roundMoney, calculateFiscalDeductions } = require('../utils/money');

const ROOT = path.resolve(__dirname, '../..');
const XLSX_PATH = path.join(ROOT, 'node_modules', 'xlsx');
const SHEET_PATH = process.env.PLANILHA_PATH
  || path.join(ROOT, 'docs', 'valores_por_carga_cenoura.xlsx');
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/agrovenda';
const APPLY = process.argv.includes('--apply');

const TARGET_VP = 1186046.72;
const TARGET_NF = 1054406.28;
const BOX_KG = 29;

function info(msg, data) {
  console.log(data !== undefined ? `${msg} ${JSON.stringify(data)}` : msg);
}

function nfDigits(v) {
  const d = String(v || '').replace(/\D/g, '');
  return d || '';
}

/** Extrai NF comercial (em geral 7–9 dígitos); se a string for a chave SEFAZ/arquivo longo, usa os últimos 8. */
function canonicalNf(v) {
  const d = nfDigits(v);
  if (!d) return '';
  if (d.length <= 9) return d;
  // Preferir sequência após "NF" no nome do arquivo
  const named = String(v || '').match(/NF[-_]?(\d{6,12})/i);
  if (named) return nfDigits(named[1]);
  return d.slice(-8);
}

function saleNfKey(sale) {
  const fromFile = canonicalNf(sale.nfFile);
  if (fromFile.length >= 6) return fromFile;
  const fromNotes = (sale.notes || '').match(/NF:\s*([\d.]+)/i);
  if (fromNotes) {
    const k = canonicalNf(fromNotes[1]);
    if (k.length >= 6) return k;
  }
  const fromKey = canonicalNf(sale.nfeKey);
  if (fromKey.length >= 6) return fromKey;
  return fromFile || fromKey;
}

function nfDistance(a, b) {
  if (!a || !b || a.length !== b.length) return 99;
  let diff = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) diff++;
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

function normalizeLoja(name) {
  return String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function isBrunoCenoura(sale) {
  if (!/bruno/i.test(sale.origin || '')) return false;
  const blob = `${JSON.stringify(sale.items || [])} ${sale.notes || ''} ${sale.items?.[0]?.product || ''}`;
  return !/cebola/i.test(blob);
}

function loadSheetRows() {
  if (!fs.existsSync(XLSX_PATH)) {
    throw new Error(`Pacote xlsx não encontrado em ${XLSX_PATH}. Rode npm install xlsx na raiz.`);
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
  // header na linha 8 (index 7)
  const rows = [];
  for (let i = 8; i < raw.length; i++) {
    const r = raw[i];
    const planilhaVp = r[4];
    if (!planilhaVp && planilhaVp !== 0) continue;
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
      funruralSheet: Number(r[17]) || 0,
      placa: String(r[1] || '').replace(/\s+/g, '').trim(),
      dataColheita: excelSerialToIso(r[0]),
      vencimento: excelSerialToIso(r[23]),
      obs: String(r[24] || '')
    });
  }
  return rows;
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
  }
  return n;
}

function buildPatch(sale, row) {
  const peso = row.pesoVp || row.pesoColheita || Number(sale.totalKg) || 0;
  const caixas = row.caixas > 0 ? row.caixas : (peso > 0 ? Number((peso / BOX_KG).toFixed(6)) : Number(sale.totalVolumes) || 0);
  const valorVp = roundMoney(row.valorVp);
  const valorNf = roundMoney(row.valorNf);
  const fiscal = calculateFiscalDeductions(valorNf > 0 ? valorNf : 0);
  // SEM NF: planilha estima FUNRURAL no VP — gravamos funruralTotal estimado para relatório,
  // mas totalOperation=0 (ledger produtor SEM NF)
  const funrural = valorNf > 0
    ? fiscal.funruralTotal
    : calculateFiscalDeductions(valorVp).funruralTotal;

  const patch = {
    valorTotalVP: valorVp,
    dailyQuote: row.cotacao || Number(sale.dailyQuote) || 0,
    totalKg: peso,
    totalVolumes: caixas,
    totalOperation: valorNf,
    funruralTotal: funrural,
    previdenciaSocial: valorNf > 0 ? fiscal.previdencia : calculateFiscalDeductions(valorVp).previdencia,
    rat: valorNf > 0 ? fiscal.rat : calculateFiscalDeductions(valorVp).rat,
    senar: valorNf > 0 ? fiscal.senar : calculateFiscalDeductions(valorVp).senar,
    notes: stampPlanilhaVp(sale.notes, row.planilhaVp, valorVp),
    // reset baixas
    paidAmount: 0,
    paymentHistory: [],
    paymentStatus: 'A Receber',
    producerPaidAmount: 0,
    producerPaymentHistory: [],
    producerPaymentStatus: 'A Pagar'
  };

  if (row.vencimento) patch.dueDate = row.vencimento;
  if (row.placa && (!sale.truckPlate || sale.truckPlate === 'SEM PLACA')) {
    patch.truckPlate = row.placa;
  }
  if (valorNf <= 0) {
    patch.status = sale.nfFile ? sale.status : 'Pendente NF';
  }

  // items
  if (Array.isArray(sale.items) && sale.items.length > 0) {
    patch.items = sale.items.map((it, idx) => {
      const next = typeof it.toObject === 'function' ? it.toObject() : { ...it };
      if (idx === 0) {
        next.kg = peso;
        next.quantity = caixas;
        next.dailyQuote = row.cotacao || next.dailyQuote || 0;
        next.valorTotalVP = valorVp;
        if (valorNf > 0) {
          next.total = valorNf;
          if (peso > 0 && row.precoNfKg > 0) next.price = roundMoney(row.precoNfKg * BOX_KG);
        } else {
          next.total = 0;
        }
      }
      return next;
    });
  }

  return patch;
}

function diffSummary(sale, patch) {
  return {
    id: sale.id,
    planilhaVp: (patch.notes.match(/Planilha VP:\s*(\d+)/i) || [])[1],
    vpBefore: roundMoney(sale.valorTotalVP),
    vpAfter: patch.valorTotalVP,
    nfBefore: roundMoney(sale.totalOperation),
    nfAfter: patch.totalOperation,
    kgBefore: Number(sale.totalKg) || 0,
    kgAfter: patch.totalKg,
    paidBefore: roundMoney(sale.paidAmount),
    producerPaidBefore: roundMoney(sale.producerPaidAmount)
  };
}

async function run() {
  if (!/localhost|127\.0\.0\.1|mongodb:27017/.test(MONGO_URI)) {
    console.error('Abortado: só Mongo local. URI:', MONGO_URI);
    process.exit(1);
  }

  info(APPLY ? '=== APPLY ===' : '=== DRY-RUN ===');
  const sheetRows = loadSheetRows();
  info('Linhas planilha', sheetRows.length);

  await mongoose.connect(MONGO_URI);
  info('Conectado', { MONGO_URI });

  const allSales = await Sale.find({ origin: /bruno/i });
  const sales = allSales.filter(isBrunoCenoura);
  info('Vendas Bruno (cenoura filtrada)', sales.length);

  const byNf = new Map();
  for (const s of sales) {
    const k = saleNfKey(s);
    if (k) {
      if (!byNf.has(k)) byNf.set(k, []);
      byNf.get(k).push(s);
    }
  }

  const matched = [];
  const unmatchedSheet = [];
  const usedSaleIds = new Set();

  for (const row of sheetRows) {
    if (row.semNf) {
      // fallback: peso + loja (tolerância 250 kg — VP9744 sheet 8790 vs DB ~8970)
      let cand = sales.find((s) => {
        if (usedSaleIds.has(s.id)) return false;
        const sameLoja = normalizeLoja(s.client) === normalizeLoja(row.loja);
        const samePeso = Math.abs((Number(s.totalKg) || 0) - row.pesoVp) <= 250;
        const noNf = !saleNfKey(s) || !s.nfFile || /pendente|sem/i.test(String(s.nfFile));
        return sameLoja && samePeso && noNf;
      });
      if (!cand) {
        cand = sales.find((s) => {
          if (usedSaleIds.has(s.id)) return false;
          const sameLoja = normalizeLoja(s.client) === normalizeLoja(row.loja);
          const samePeso = Math.abs((Number(s.totalKg) || 0) - row.pesoVp) <= 250;
          return sameLoja && samePeso;
        });
      }

      if (!cand) {
        unmatchedSheet.push({ planilhaVp: row.planilhaVp, reason: 'SEM NF sem match peso+loja', loja: row.loja, peso: row.pesoVp });
        continue;
      }
      usedSaleIds.add(cand.id);
      matched.push({ sale: cand, row, via: 'sem-nf-peso-loja' });
      continue;
    }

    const list = byNf.get(row.nfKey) || [];
    let cand = list.find((s) => !usedSaleIds.has(s.id));
    let via = 'nf';

    // Fuzzy: 1 dígito de diferença (typos planilha vs DB)
    if (!cand) {
      let best = null;
      let bestDist = 99;
      for (const s of sales) {
        if (usedSaleIds.has(s.id)) continue;
        const k = saleNfKey(s);
        const dist = nfDistance(k, row.nfKey);
        if (dist > 0 && dist <= 1 && dist < bestDist) {
          best = s;
          bestDist = dist;
        }
      }
      if (best) {
        cand = best;
        via = `nf-fuzzy-${bestDist}`;
      }
    }

    if (!cand) {
      unmatchedSheet.push({ planilhaVp: row.planilhaVp, reason: 'NF não encontrada no DB', nf: row.nfKey, loja: row.loja });
      continue;
    }
    usedSaleIds.add(cand.id);
    matched.push({ sale: cand, row, via });
  }

  const unmatchedDb = sales
    .filter((s) => !usedSaleIds.has(s.id))
    .map((s) => ({ id: s.id, client: s.client, nf: saleNfKey(s), vp: s.valorTotalVP, kg: s.totalKg }));

  info('Matched', matched.length);
  info('Unmatched sheet', unmatchedSheet.length);
  info('Unmatched DB', unmatchedDb.length);
  if (unmatchedSheet.length) info('Gaps planilha', unmatchedSheet);
  if (unmatchedDb.length) info('Órfãos DB', unmatchedDb);

  let sumVp = 0;
  let sumNf = 0;
  const diffs = [];

  for (const { sale, row, via } of matched) {
    const patch = buildPatch(sale, row);
    const d = diffSummary(sale, patch);
    d.via = via;
    d.nfKey = row.nfKey || 'SEM NF';
    diffs.push(d);
    sumVp = roundMoney(sumVp + patch.valorTotalVP);
    sumNf = roundMoney(sumNf + patch.totalOperation);

    if (APPLY) {
      Object.assign(sale, patch);
      if (patch.items) sale.items = patch.items;
      sale.markModified('items');
      sale.markModified('paymentHistory');
      sale.markModified('producerPaymentHistory');
      await sale.save();
      info(`[OK] ${sale.id} ← planilha ${row.planilhaVp}`, {
        vp: patch.valorTotalVP,
        nf: patch.totalOperation,
        via
      });
    }
  }

  // Também zerar baixas de Bruno cenoura não matched? Plano diz matched. Só matched.

  console.log('\n=== TOTAIS (matched pós-patch) ===');
  info('Σ VP', { obtido: sumVp, alvo: TARGET_VP, delta: roundMoney(sumVp - TARGET_VP) });
  info('Σ NF', { obtido: sumNf, alvo: TARGET_NF, delta: roundMoney(sumNf - TARGET_NF) });

  if (!APPLY) {
    console.log('\nAmostra diffs (até 8):');
    diffs.slice(0, 8).forEach((d) => info(' ', d));
    console.log('\nRode com --apply para gravar.');
  } else {
    console.log(`\nAplicado em ${matched.length} vendas. Baixas zeradas.`);
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
