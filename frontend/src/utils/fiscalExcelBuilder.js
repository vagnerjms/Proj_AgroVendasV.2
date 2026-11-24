/**
 * Planilha Excel (.xls HTML) exclusiva do Fiscal — Contas/Fluxos.
 * Abas: Resumo (blocos por loja) | Ledger_Baixas | Ledger_Repasses
 * Não altera os exports de Relatórios (reportExcelBuilder).
 */
import { formatDate, getCleanFileName } from './formatters';
import { calculateLiquidation } from './calculations';
import {
  nfDisplayLabel,
  resolveRomaneioNumber,
  quantityOf,
  formatQuantity,
  resolveProductUnit
} from './dataHelpers';
import { DATA_LABELS } from '../constants/dataLabels';
import { freightOf, formatFreightMoney } from './freight';

const COL_DETALHE = 9; // Data|Rom|NF|Produto|Qtd|VP|NF$|Recebido|Saldo

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function paymentMethodLabel(sale) {
  const hist = Array.isArray(sale.paymentHistory) ? sale.paymentHistory : [];
  const paid = Number(sale.paidAmount) > 0;
  const hasHistory = hist.some((h) => h && (h.paymentMethod || Number(h.amount) > 0));
  if (!paid && !hasHistory) return '—';

  const lastWithMethod = [...hist].reverse().find((h) => h?.paymentMethod);
  const method = lastWithMethod?.paymentMethod || '';
  if (!method) return '—';
  return method;
}

function settlementDiscountInfo(sale) {
  const hist = Array.isArray(sale.paymentHistory) ? sale.paymentHistory : [];
  const totalDiscount = hist.reduce((acc, h) => acc + (Number(h?.discountAmount) || 0), 0);
  const lastWithDisc = [...hist].reverse().find((h) => Number(h?.discountAmount) > 0);
  const note = lastWithDisc?.notes || '';
  return {
    totalDiscount: Math.round((totalDiscount + Number.EPSILON) * 100) / 100,
    note: note || ''
  };
}

export function extractProductName(sale) {
  if (sale.items?.[0]?.product) return sale.items[0].product;
  if (sale.product) return sale.product;
  if (sale.notes) {
    const m = sale.notes.match(/(cenoura|cebola|batata|alho|tomate|ab[oó]bora)/i);
    if (m) return m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase();
  }
  return 'Outros';
}

function extractProducerName(sale) {
  const origin = (sale.origin || '').trim();
  if (origin) {
    const bare = origin.replace(/\s*\([^)]*\)\s*$/, '').trim();
    return bare || origin;
  }
  if (sale.producer) return String(sale.producer).trim();
  return 'Sem produtor';
}

function proofFilesFromEvent(p) {
  const list = [];
  const seen = new Set();
  const push = (f) => {
    if (!f || seen.has(f)) return;
    seen.add(f);
    list.push(f);
  };
  push(p?.paymentProofFile);
  (Array.isArray(p?.paymentProofFiles) ? p.paymentProofFiles : []).forEach(push);
  return list;
}

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function enrichSale(sale) {
  const liq = calculateLiquidation(sale);
  const disc = settlementDiscountInfo(sale);
  const unit = resolveProductUnit(sale);
  const qtdRaw = quantityOf(sale);
  const obsParts = [];
  if (sale.notes) obsParts.push(String(sale.notes));
  if (disc.note) obsParts.push(`Desconto: ${disc.note}`);
  const freteLabel = formatFreightMoney(freightOf(sale));
  if (freteLabel) obsParts.push(`Frete: ${freteLabel}`);
  return {
    sale,
    liq,
    disc,
    produto: extractProductName(sale),
    produtor: extractProducerName(sale),
    qtdLabel: formatQuantity(qtdRaw, unit),
    qtdRaw: Number(qtdRaw) || 0,
    unit: unit || '',
    rom: resolveRomaneioNumber(sale) || '—',
    nf: nfDisplayLabel(sale),
    statusText: `${liq.statusLabel || ''}${liq.isPartial && liq.percentPaid ? ` (${liq.percentPaid.toFixed(0)}%)` : ''}`,
    formaPgto: paymentMethodLabel(sale),
    obsResumo: obsParts.length ? obsParts.join(' · ') : null
  };
}

export function groupFiscalSalesByLoja(sales = []) {
  const map = new Map();
  for (const s of sales) {
    const loja = (s.client || 'Sem loja').trim() || 'Sem loja';
    if (!map.has(loja)) map.set(loja, []);
    map.get(loja).push(enrichSale(s));
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'))
    .map(([loja, itens]) => {
      itens.sort((a, b) => {
        const byDate = String(a.sale?.saleDate || '').localeCompare(String(b.sale?.saleDate || ''));
        if (byDate !== 0) return byDate;
        return String(a.rom || '').localeCompare(String(b.rom || ''));
      });
      const totals = itens.reduce(
        (acc, r) => {
          acc.vp = round2(acc.vp + (r.liq.valorVP || 0));
          acc.nf = round2(acc.nf + (r.liq.valorTotalNF || 0));
          acc.recebido = round2(acc.recebido + (r.liq.valorLiquidado || 0));
          acc.saldo = round2(acc.saldo + (r.liq.valorALiquidar || 0));
          acc.qtd = round2(acc.qtd + (r.qtdRaw || 0));
          acc.n += 1;
          return acc;
        },
        { vp: 0, nf: 0, recebido: 0, saldo: 0, qtd: 0, n: 0 }
      );
      return { loja, itens, totals };
    });
}

function sharedStyles() {
  return `
        body { font-family: Arial, Calibri, sans-serif; font-size: 9pt; color: #1e293b; margin: 20px; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 16px; }
        th, td { border: 1px solid #cbd5e1; padding: 5px 7px; font-size: 8pt; vertical-align: middle; text-align: center; }
        .cell-left { text-align: left; mso-number-format: "\\@"; }
        .cell-center { text-align: center; mso-number-format: "\\@"; }
        .cell-num { text-align: right; }
        .cell-money { text-align: right; font-weight: bold; }
        .cell-money-normal { text-align: right; }
        .hdr-main { background-color: #091b2e; color: #ffffff; font-weight: bold; font-size: 10pt; padding: 8px 10px; text-align: left; }
        .hdr-sub { background-color: #1b4363; color: #ffffff; font-weight: bold; font-size: 7.5pt; text-align: center; }
        .hdr-loja { background-color: #f1f5f9; color: #0f172a; font-weight: bold; font-size: 10pt; padding: 7px 10px; text-align: left; border-bottom: 2px solid #94a3b8; }
        .hdr-id { background-color: #1b4363; color: #ffffff; font-weight: bold; font-size: 7.5pt; }
        .hdr-qtd { background-color: #d7e5dc; color: #1e3a2f; font-weight: bold; font-size: 7.5pt; }
        .hdr-fin { background-color: #dde5ef; color: #1e293b; font-weight: bold; font-size: 7.5pt; }
        .bg-liquidado { background-color: #ecfdf5; color: #065f46; }
        .bg-aliquidar { background-color: #fffbeb; color: #92400e; }
        .badge-kpi { border: 1px solid #cbd5e1; background-color: #f8fafc; padding: 8px; }
        .row-subtotal-loja { background-color: #f8fafc; font-weight: bold; border-top: 2px solid #cbd5e1; }
        .row-total { background-color: #e2e8f0; font-weight: bold; border-top: 2px solid #64748b; }
        .sheet-title { font-size: 12pt; font-weight: bold; color: #091b2e; margin: 24px 0 8px; }
        .sheet-break { page-break-before: always; }
        .obs-box { border: 1px solid #cbd5e1; border-top: none; background: #f8fafc; padding: 6px 8px; font-size: 7.5pt; text-align: left; color: #334155; margin-bottom: 18px; }
        .note { font-size: 8.5pt; color: #64748b; margin: 4px 0 10px; text-align: left; }
        .spacer td { border: none !important; height: 10pt; background: transparent; padding: 0; }
  `;
}

function buildLedgerRows(sales, historyKey, filePrefix) {
  const rows = [];
  for (const s of sales) {
    const hist = Array.isArray(s[historyKey]) ? s[historyKey] : [];
    hist.forEach((p, idx) => {
      const files = proofFilesFromEvent(p);
      const seq = p?.seq || idx + 1;
      const filesLabel = files.length
        ? files.map((f, i) => `${filePrefix}${String(i + 1).padStart(2, '0')}=${getCleanFileName(f)}`).join('; ')
        : '—';
      rows.push({
        saleId: s.id || '',
        client: s.client || '',
        producer: extractProducerName(s),
        date: p?.date || '',
        amount: Number(p?.amount) || 0,
        discount: Number(p?.discountAmount) || 0,
        method: p?.paymentMethod || '—',
        seq,
        filesLabel,
        notes: p?.notes || ''
      });
    });
  }
  return rows;
}

function ledgerTableHtml(title, sheetId, rows, formatMoeda, emptyMsg) {
  const body = rows.map((r) => `
      <tr data-ledger-row="${escapeHtml(sheetId)}">
        <td class="cell-center">${escapeHtml(r.saleId)}</td>
        <td class="cell-left">${escapeHtml(r.client)}</td>
        <td class="cell-left">${escapeHtml(r.producer)}</td>
        <td class="cell-center">${escapeHtml(r.date ? formatDate(r.date) : '—')}</td>
        <td class="cell-center">${escapeHtml(String(r.seq))}</td>
        <td class="cell-money bg-liquidado">${r.amount > 0 ? formatMoeda(r.amount) : '—'}</td>
        <td class="cell-money-normal">${r.discount > 0 ? formatMoeda(r.discount) : '—'}</td>
        <td class="cell-center">${escapeHtml(r.method)}</td>
        <td class="cell-left" style="font-size:7.5pt;">${escapeHtml(r.filesLabel)}</td>
        <td class="cell-left">${escapeHtml(r.notes)}</td>
      </tr>
    `).join('');

  return `
    <div class="sheet-break" id="sheet-${sheetId}" data-sheet="${sheetId}">
      <div class="sheet-title">${escapeHtml(title)}</div>
      <table>
        <thead>
          <tr>
            <th colspan="10" class="hdr-main">${escapeHtml(title)}</th>
          </tr>
          <tr>
            <th class="hdr-sub">${DATA_LABELS.vpNumber}</th>
            <th class="hdr-sub">Loja</th>
            <th class="hdr-sub">Produtor</th>
            <th class="hdr-sub">Data</th>
            <th class="hdr-sub">Seq</th>
            <th class="hdr-sub">Valor</th>
            <th class="hdr-sub">Desconto</th>
            <th class="hdr-sub">${DATA_LABELS.formaPagamento}</th>
            <th class="hdr-sub">Arquivos</th>
            <th class="hdr-sub">Observações</th>
          </tr>
        </thead>
        <tbody>
          ${body || `<tr><td colspan="10" class="cell-center" style="color:#94a3b8;font-style:italic;">${escapeHtml(emptyMsg)}</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
}

function resumoPorLojaTable(groups, formatMoeda) {
  const body = groups.map((g) => `
    <tr>
      <td class="cell-left" style="font-weight:bold;">${escapeHtml(g.loja)}</td>
      <td>${g.totals.n}</td>
      <td class="cell-num">${escapeHtml(formatQuantity(g.totals.qtd))}</td>
      <td class="cell-money" style="background-color:#dbeafe;">${formatMoeda(g.totals.vp)}</td>
      <td class="cell-money-normal">${formatMoeda(g.totals.nf)}</td>
      <td class="cell-money bg-liquidado">${formatMoeda(g.totals.recebido)}</td>
      <td class="cell-money bg-aliquidar">${formatMoeda(g.totals.saldo)}</td>
    </tr>`).join('');

  const geral = groups.reduce(
    (acc, g) => {
      acc.n += g.totals.n;
      acc.qtd = round2(acc.qtd + g.totals.qtd);
      acc.vp = round2(acc.vp + g.totals.vp);
      acc.nf = round2(acc.nf + g.totals.nf);
      acc.recebido = round2(acc.recebido + g.totals.recebido);
      acc.saldo = round2(acc.saldo + g.totals.saldo);
      return acc;
    },
    { n: 0, qtd: 0, vp: 0, nf: 0, recebido: 0, saldo: 0 }
  );

  return `
    <table>
      <thead>
        <tr><th colspan="7" class="hdr-main">RESUMO POR LOJA — ${escapeHtml(DATA_LABELS.saldoAReceber).toUpperCase()}</th></tr>
        <tr>
          <th class="hdr-sub" style="text-align:left;">Loja</th>
          <th class="hdr-sub">Cargas</th>
          <th class="hdr-sub">${DATA_LABELS.quantity}</th>
          <th class="hdr-sub" style="background-color:#1e3a8a;">${DATA_LABELS.valorNegociadoVP}</th>
          <th class="hdr-sub">${DATA_LABELS.valorNF}</th>
          <th class="hdr-sub" style="background-color:#065f46;">Valor Recebido</th>
          <th class="hdr-sub" style="background-color:#b45309;">${DATA_LABELS.saldoAReceber}</th>
        </tr>
      </thead>
      <tbody>
        ${body || `<tr><td colspan="7" class="cell-center" style="color:#94a3b8;font-style:italic;">Nenhum título no filtro.</td></tr>`}
      </tbody>
      <tfoot>
        <tr class="row-total">
          <td class="cell-left">TOTAL GERAL</td>
          <td>${geral.n}</td>
          <td class="cell-num">${escapeHtml(formatQuantity(geral.qtd))}</td>
          <td class="cell-money">${formatMoeda(geral.vp)}</td>
          <td class="cell-money-normal">${formatMoeda(geral.nf)}</td>
          <td class="cell-money bg-liquidado">${formatMoeda(geral.recebido)}</td>
          <td class="cell-money bg-aliquidar">${formatMoeda(geral.saldo)}</td>
        </tr>
      </tfoot>
    </table>`;
}

function detailHeaderRows() {
  return `
    <tr>
      <th colspan="3" class="hdr-id">Identificação</th>
      <th colspan="2" class="hdr-qtd">Produto / quantidade</th>
      <th colspan="4" class="hdr-fin">Financeiro</th>
    </tr>
    <tr>
      <th class="hdr-id">Data</th>
      <th class="hdr-id">${DATA_LABELS.romaneioNumber}</th>
      <th class="hdr-id">${DATA_LABELS.nfNumber}</th>
      <th class="hdr-qtd">Produto</th>
      <th class="hdr-qtd">${DATA_LABELS.quantity}</th>
      <th class="hdr-fin" style="background-color:#1e3a8a;color:#fff;">${DATA_LABELS.valorNegociadoVP}</th>
      <th class="hdr-fin">${DATA_LABELS.valorNF}</th>
      <th class="hdr-fin" style="background-color:#065f46;color:#fff;">Valor Recebido</th>
      <th class="hdr-fin" style="background-color:#b45309;color:#fff;">${DATA_LABELS.saldoAReceber}</th>
    </tr>`;
}

function lojaBlocksHtml(groups, formatMoeda) {
  if (!groups.length) {
    return `<p class="note" style="font-style:italic;">Nenhum título no filtro.</p>`;
  }

  return groups.map((g, idx) => {
    const nome = String(g.loja || '').toUpperCase();
    const obsList = g.itens
      .map((r) => {
        if (!r.obsResumo) return null;
        return `Rom. ${r.rom} (${r.sale.id || '—'}): ${r.obsResumo}`;
      })
      .filter(Boolean);

    const rows = g.itens.map((r) => `
      <tr>
        <td class="cell-center">${escapeHtml(formatDate(r.sale.saleDate))}</td>
        <td class="cell-center" style="font-weight:bold;color:#173e27;">${escapeHtml(r.rom)}</td>
        <td class="cell-center">${escapeHtml(r.nf)}</td>
        <td class="cell-left">${escapeHtml(r.produto)}</td>
        <td class="cell-num">${escapeHtml(r.qtdLabel)}</td>
        <td class="cell-money" style="background-color:#dbeafe;">${formatMoeda(r.liq.valorVP)}</td>
        <td class="cell-money-normal">${formatMoeda(r.liq.valorTotalNF)}</td>
        <td class="cell-money bg-liquidado">${r.liq.valorLiquidado > 0 ? formatMoeda(r.liq.valorLiquidado) : '—'}</td>
        <td class="cell-money bg-aliquidar">${r.liq.valorALiquidar > 0 ? formatMoeda(r.liq.valorALiquidar) : '—'}</td>
      </tr>`).join('');

    const block = `
    <table style="margin-bottom:0;">
      <thead>
        <tr>
          <th colspan="${COL_DETALHE}" class="hdr-loja">
            <span style="text-transform:uppercase;">${escapeHtml(nome)}</span>
            <span style="font-weight:normal;color:#475569;margin-left:8px;font-size:8.5pt;">
              (${g.totals.n} carga${g.totals.n === 1 ? '' : 's'})
            </span>
            <span style="float:right;font-weight:normal;font-size:8.5pt;color:#334155;">
              VP: <b>${formatMoeda(g.totals.vp)}</b>
              &nbsp;|&nbsp; NF: <b>${formatMoeda(g.totals.nf)}</b>
              &nbsp;|&nbsp; Recebido: <b>${formatMoeda(g.totals.recebido)}</b>
              &nbsp;|&nbsp; ${DATA_LABELS.saldoAReceber}: <b>${formatMoeda(g.totals.saldo)}</b>
            </span>
          </th>
        </tr>
        ${detailHeaderRows()}
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr class="row-subtotal-loja">
          <td colspan="4" class="cell-left">TOTAL ${escapeHtml(nome.split(/\s+/)[0])}</td>
          <td class="cell-num">${escapeHtml(formatQuantity(g.totals.qtd))}</td>
          <td class="cell-money">${formatMoeda(g.totals.vp)}</td>
          <td class="cell-money-normal">${formatMoeda(g.totals.nf)}</td>
          <td class="cell-money bg-liquidado">${formatMoeda(g.totals.recebido)}</td>
          <td class="cell-money bg-aliquidar">${formatMoeda(g.totals.saldo)}</td>
        </tr>
      </tfoot>
    </table>
    <div class="obs-box">
      <b>Observações</b>
      ${obsList.length
        ? `<ul style="margin:4px 0 0;padding-left:16px;">${obsList.map((o) => `<li>${escapeHtml(o)}</li>`).join('')}</ul>`
        : '<div style="margin-top:2px;color:#64748b;">Nenhuma observação neste bloco.</div>'}
    </div>`;

    const spacer = idx < groups.length - 1
      ? `<table style="border:none;margin:0;width:100%;"><tr class="spacer"><td colspan="${COL_DETALHE}">&nbsp;</td></tr><tr class="spacer"><td colspan="${COL_DETALHE}">&nbsp;</td></tr></table>`
      : '';
    return block + spacer;
  }).join('');
}

/**
 * @param {object[]} sales - vendas já filtradas (filteredSales)
 * @param {object} totals - totalsFiltered { vp, nf, recebido, saldo, caixas }
 * @param {object} filters - meta do filtro para cabeçalho
 */
export function buildFiscalExcelHtml(sales = [], totals = {}, filters = {}) {
  const hojeFormatado = new Date().toLocaleDateString('pt-BR');
  const statusLabels = {
    ALL: 'Todos',
    PENDING: 'A Receber',
    PARTIAL: 'Parcial',
    RECEIVED: 'Recebidos'
  };
  const statusStr = statusLabels[filters.statusFilter] || 'Todos';
  const lojasStr = filters.selectedStores?.length
    ? `${filters.selectedStores.length} loja(s)`
    : 'Nenhuma';
  const produtosStr = filters.selectedProducts?.length
    ? `${filters.selectedProducts.length} produto(s)`
    : 'Nenhum';
  const produtoresStr = filters.selectedProducers?.length
    ? `${filters.selectedProducers.length} produtor(es)`
    : 'Nenhum';
  const buscaStr = (filters.searchTerm || '').trim() || '—';

  const formatMoeda = (v) => {
    const num = Number(v) || 0;
    return 'R$ ' + num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const groups = groupFiscalSalesByLoja(sales);
  const baixas = buildLedgerRows(sales, 'paymentHistory', 'CP');
  const repasses = buildLedgerRows(sales, 'producerPaymentHistory', 'CPProd');

  const resumoSheet = `
    <div id="sheet-Resumo" data-sheet="Resumo">
      <div class="sheet-title">Resumo</div>
      <table style="border:none;margin-bottom:12px;">
        <tr>
          <td colspan="7" style="border:none;padding:0;">
            <div style="font-size:14pt;font-weight:bold;color:#091b2e;">AGROVENDA — FISCAL (CONTAS / FLUXOS)</div>
            <div class="note">
              Emissão: <b>${hojeFormatado}</b> |
              Status: <b>${escapeHtml(statusStr)}</b> |
              Lojas: <b>${escapeHtml(lojasStr)}</b> |
              Produtos: <b>${escapeHtml(produtosStr)}</b> |
              Produtores: <b>${escapeHtml(produtoresStr)}</b> |
              Busca: <b>${escapeHtml(buscaStr)}</b> |
              Registros: <b>${sales.length}</b><br/>
              Quantidade na <b>unidade cadastrada</b> do produto. Layout loja a loja (filtro atual).
            </div>
          </td>
        </tr>
      </table>

      <table style="margin-bottom:16px;border:1px solid #cbd5e1;">
        <tr>
          <td class="badge-kpi" style="background-color:#eff6ff;">
            <div style="font-size:7.5pt;color:#1e3a8a;text-transform:uppercase;">Valor Negociado</div>
            <div style="font-size:11pt;color:#1e3a8a;font-weight:bold;">${formatMoeda(totals.vp)}</div>
          </td>
          <td class="badge-kpi" style="background-color:#ecfdf5;">
            <div style="font-size:7.5pt;color:#065f46;text-transform:uppercase;">Já Recebido</div>
            <div style="font-size:11pt;color:#065f46;font-weight:bold;">${formatMoeda(totals.recebido)}</div>
          </td>
          <td class="badge-kpi" style="background-color:#fffbeb;">
            <div style="font-size:7.5pt;color:#92400e;text-transform:uppercase;">Saldo a Receber</div>
            <div style="font-size:11pt;color:#92400e;font-weight:bold;">${formatMoeda(totals.saldo)}</div>
          </td>
          <td class="badge-kpi">
            <div style="font-size:7.5pt;color:#64748b;text-transform:uppercase;">Total Faturado NF</div>
            <div style="font-size:11pt;color:#0f172a;font-weight:bold;">${formatMoeda(totals.nf)}</div>
          </td>
        </tr>
      </table>

      ${resumoPorLojaTable(groups, formatMoeda)}

      <div style="font-size:11pt;font-weight:bold;color:#0f172a;margin:16px 0 8px;text-transform:uppercase;">
        Detalhamento por loja
      </div>
      ${lojaBlocksHtml(groups, formatMoeda)}
    </div>
  `;

  return `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>Resumo</x:Name>
              <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
            </x:ExcelWorksheet>
            <x:ExcelWorksheet>
              <x:Name>Ledger_Baixas</x:Name>
              <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
            </x:ExcelWorksheet>
            <x:ExcelWorksheet>
              <x:Name>Ledger_Repasses</x:Name>
              <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <style>
        ${sharedStyles()}
      </style>
    </head>
    <body>
      ${resumoSheet}
      ${ledgerTableHtml('Ledger_Baixas', 'Ledger_Baixas', baixas, formatMoeda, 'Nenhuma baixa no filtro.')}
      ${ledgerTableHtml('Ledger_Repasses', 'Ledger_Repasses', repasses, formatMoeda, 'Nenhum repasse no filtro.')}
    </body>
    </html>
  `;
}

export function downloadFiscalExcel(sales, totals, filters = {}) {
  const html = buildFiscalExcelHtml(sales, totals, filters);
  const dateStr = new Date().toISOString().split('T')[0];
  const fileName = `Fiscal_Contas_${dateStr}.xls`;
  const blob = new Blob(['\ufeff' + html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
