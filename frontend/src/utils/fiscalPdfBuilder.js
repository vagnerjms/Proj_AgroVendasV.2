/**
 * PDF Fiscal — template Márcio aprovado (A4 paisagem).
 * Capa com KPIs + resumo por loja; detalhe 1 loja por página.
 * Colunas: Data | Romaneio | NF | qty/preço por tipo | Valor romaneio | Fundo Rural | Valor a pagar
 */
import { formatDate } from './formatters';
import { calculateFunrural, calculateLiquidation, getValorTotalVP } from './calculations';
import {
  nfDisplayLabel,
  resolveRomaneioNumber
} from './dataHelpers';

const TIPOS = [
  { key: 'especial', label: 'Batata Esp.', match: /especial/i },
  { key: 'primeira', label: 'Batata Prim.', match: /primeira/i },
  { key: 'diversa', label: 'Batata Div.', match: /diversa/i },
  { key: 'bolinha', label: 'Batata Bol.', match: /bolinha/i }
];

const UNIDADE_QTD = 'sacos';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function br(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '—';
  return Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function money(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n)) || Number(n) === 0) return '—';
  return 'R$ ' + br(n);
}

function filterMeta(filters = {}) {
  const statusLabels = {
    ALL: 'Todos',
    PENDING: 'A Receber',
    PARTIAL: 'Parcial',
    RECEIVED: 'Recebidos'
  };
  return {
    statusStr: statusLabels[filters.statusFilter] || 'Todos',
    lojasStr: filters.selectedStores?.length ? `${filters.selectedStores.length} loja(s)` : 'Todas',
    produtosStr: filters.selectedProducts?.length ? `${filters.selectedProducts.length} produto(s)` : 'Todos',
    produtoresStr: filters.selectedProducers?.length ? `${filters.selectedProducers.length} produtor(es)` : 'Todos',
    buscaStr: (filters.searchTerm || '').trim() || '—'
  };
}

function splitTiposFromSale(sale) {
  const out = {};
  for (const t of TIPOS) out[t.key] = { qty: 0, unit: null };
  const items = Array.isArray(sale?.items) ? sale.items : [];
  for (const it of items) {
    const nome = String(it.product || '');
    const tipo = TIPOS.find((x) => x.match.test(nome));
    if (!tipo) continue;
    out[tipo.key].qty = round2((out[tipo.key].qty || 0) + (Number(it.quantity) || 0));
    const quote = Number(it.dailyQuote);
    if (quote > 0) out[tipo.key].unit = quote;
  }
  // Fallback: um único produto batata sem tipo → Especial se só houver qty total
  const hasAny = TIPOS.some((t) => out[t.key].qty > 0);
  if (!hasAny && items.length) {
    const batata = items.filter((it) => /batata/i.test(String(it.product || '')));
    if (batata.length === 1) {
      out.especial.qty = Number(batata[0].quantity) || 0;
      out.especial.unit = Number(batata[0].dailyQuote) || null;
    } else if (batata.length > 1) {
      // Sem match de tipo: soma no primeiro bucket como Diversa
      for (const it of batata) {
        out.diversa.qty = round2(out.diversa.qty + (Number(it.quantity) || 0));
      }
    }
  }
  return out;
}

function deriveProduto(sales = []) {
  for (const s of sales) {
    for (const it of s.items || []) {
      const nome = String(it.product || '').trim();
      if (!nome) continue;
      const base = nome.replace(/\s+(Especial|Primeira|Diversa|Bolinha|Florão)\s*$/i, '').trim();
      if (base) return base;
    }
  }
  return 'Batata';
}

function enrichSaleMarcio(sale) {
  const valorRomaneio = round2(getValorTotalVP(sale) || calculateLiquidation(sale).valorVP || 0);
  const fiscal = calculateFunrural(valorRomaneio);
  const tipos = splitTiposFromSale(sale);
  const quantidadeSacos = TIPOS.reduce((a, t) => a + (tipos[t.key].qty || 0), 0);
  const semNf = !sale.nfFile;
  const obsParts = [];
  if (sale.notes) {
    const first = String(sale.notes).split(/(?<=\.)\s+/)[0] || String(sale.notes);
    obsParts.push(first.length > 110 ? first.slice(0, 107) + '…' : first);
  }
  return {
    sale,
    data: formatDate(sale.saleDate),
    rom: resolveRomaneioNumber(sale) || '—',
    nfLabel: semNf ? 'SEM NF' : nfDisplayLabel(sale),
    tipos,
    quantidadeSacos,
    valorRomaneio,
    fundoRural: fiscal.funruralTotal,
    valorAPagar: round2(Math.max(0, valorRomaneio - fiscal.funruralTotal)),
    valorNf: semNf ? 0 : (Number(sale.totalOperation) || 0),
    semNf,
    destinatario: (sale.client || 'Sem loja').trim() || 'Sem loja',
    obsResumo: obsParts.length ? `Rom. ${resolveRomaneioNumber(sale) || '—'}: ${obsParts[0]}` : null
  };
}

function sumRows(rows) {
  const totQty = {};
  for (const t of TIPOS) totQty[t.key] = 0;
  let totRom = 0;
  let totPagar = 0;
  let totFun = 0;
  let totNf = 0;
  let totSacos = 0;
  let semNf = 0;
  for (const r of rows) {
    for (const t of TIPOS) totQty[t.key] += r.tipos[t.key].qty || 0;
    totRom = round2(totRom + r.valorRomaneio);
    totPagar = round2(totPagar + r.valorAPagar);
    totFun = round2(totFun + r.fundoRural);
    if (r.valorNf) totNf = round2(totNf + r.valorNf);
    totSacos += r.quantidadeSacos;
    if (r.semNf) semNf += 1;
  }
  return { totQty, totRom, totPagar, totFun, totNf, totSacos, semNf, n: rows.length };
}

export function groupMarcioSalesByLoja(sales = []) {
  const enriched = (sales || []).map(enrichSaleMarcio);
  const map = new Map();
  for (const r of enriched) {
    const k = r.destinatario;
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(r);
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'))
    .map(([loja, itens]) => ({ loja, itens, totals: sumRows(itens) }));
}

/**
 * HTML A4 paisagem — template Márcio (1 loja por página).
 */
export function buildFiscalPdfHtml(sales = [], totals = {}, filters = {}) {
  const hoje = new Date().toLocaleString('pt-BR');
  const meta = filterMeta(filters);
  const groups = groupMarcioSalesByLoja(sales);
  const geral = sumRows(groups.flatMap((g) => g.itens));
  const produto = deriveProduto(sales);

  const resumoBody = groups.map((g) => `
    <tr>
      <td class="left"><b>${escapeHtml(g.loja)}</b></td>
      <td>${g.totals.n}</td>
      <td>${g.totals.semNf || '—'}</td>
      <td>${g.totals.totSacos || '—'}</td>
      <td class="money">${money(g.totals.totRom)}</td>
      <td class="money">${money(g.totals.totFun)}</td>
      <td class="money highlight">${money(g.totals.totPagar)}</td>
    </tr>`).join('');

  const lojaBlocks = groups.map((g) => {
    const nome = String(g.loja || '').toUpperCase();
    const obsList = g.itens.map((r) => r.obsResumo).filter(Boolean);
    const qtyHeads = TIPOS.map((t) => `<th class="hdr-qtd">${escapeHtml(t.label)}</th>`).join('');
    const body = g.itens.map((r) => {
      const q = TIPOS.map((t) => {
        const x = r.tipos[t.key];
        if (!x.qty) return '<td class="cell-tipo">—</td>';
        return `<td class="cell-tipo"><div class="qtd">${escapeHtml(String(x.qty))} ${escapeHtml(UNIDADE_QTD)}</div><div class="prc">${money(x.unit)}</div></td>`;
      }).join('');
      return `
        <tr>
          <td>${escapeHtml(r.data)}</td>
          <td class="rom">${escapeHtml(r.rom)}</td>
          <td>${escapeHtml(r.nfLabel)}</td>
          ${q}
          <td class="money vp">${money(r.valorRomaneio)}</td>
          <td class="money">${money(r.fundoRural)}</td>
          <td class="money highlight">${money(r.valorAPagar)}</td>
        </tr>`;
    }).join('');
    const totQ = TIPOS.map((t) => `<td>${g.totals.totQty[t.key] || '—'}</td>`).join('');

    return `
      <section class="loja">
        <div class="loja-bar">
          <span class="loja-nome">${escapeHtml(nome)}</span>
          <span class="loja-meta">(${g.totals.n} carga${g.totals.n === 1 ? '' : 's'}) · Produto: <b>${escapeHtml(produto)}</b></span>
          <span class="loja-fin">
            Romaneios: <b>${money(g.totals.totRom)}</b>
            &nbsp;|&nbsp; (−) Fundo Rural: <b>${money(g.totals.totFun)}</b>
            &nbsp;|&nbsp; Valor a pagar: <b class="pagar">${money(g.totals.totPagar)}</b>
          </span>
        </div>
        <table class="detalhe">
          <thead>
            <tr>
              <th colspan="3" class="hdr-id">Identificação</th>
              <th colspan="4" class="hdr-qtd">Quantidade (${escapeHtml(UNIDADE_QTD)}) / preço por saco</th>
              <th colspan="3" class="hdr-fin">Financeiro</th>
            </tr>
            <tr>
              <th class="hdr-id">Data</th>
              <th class="hdr-id">Romaneio</th>
              <th class="hdr-id">NF</th>
              ${qtyHeads}
              <th class="hdr-fin">Valor romaneio</th>
              <th class="hdr-fin">Fundo Rural</th>
              <th class="hdr-fin">Valor a pagar</th>
            </tr>
          </thead>
          <tbody>${body}</tbody>
          <tfoot>
            <tr class="subtotal">
              <td colspan="3" class="left">TOTAL ${escapeHtml(nome.split(/\s+/)[0])}</td>
              ${totQ}
              <td class="money">${money(g.totals.totRom)}</td>
              <td class="money">${money(g.totals.totFun)}</td>
              <td class="money highlight">${money(g.totals.totPagar)}</td>
            </tr>
          </tfoot>
        </table>
        ${obsList.length ? `
          <div class="obs-box">
            <div class="obs-title">Observações (conferência)</div>
            <ul>${obsList.map((o) => `<li>${escapeHtml(o)}</li>`).join('')}</ul>
          </div>` : `
          <div class="obs-box muted">Observações: nenhuma divergência registrada neste bloco.</div>`}
      </section>`;
  }).join('');

  void totals; // filtros já aplicados em sales; KPIs vêm do enrich Márcio

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Fiscal Márcio — ${escapeHtml(hoje)}</title>
<style>
  @page { size: A4 landscape; margin: 10mm 10mm 12mm 10mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 8.5pt; color: #1e293b; margin: 0; }
  h1 { font-size: 13pt; color: #091b2e; margin: 0 0 4px; }
  .note { font-size: 8pt; color: #64748b; margin: 0 0 10px; }
  .kpis { display: flex; gap: 8px; margin-bottom: 10px; }
  .kpi { flex: 1; border: 1px solid #cbd5e1; border-radius: 4px; padding: 6px 8px; background: #f8fafc; }
  .kpi .lbl { font-size: 7pt; text-transform: uppercase; color: #64748b; }
  .kpi .val { font-size: 11pt; font-weight: bold; margin-top: 2px; }
  .kpi.vp { background: #eff6ff; }
  .kpi.vp .val { color: #1e3a8a; }
  .kpi.pagar { background: #fffbeb; }
  .kpi.pagar .val { color: #92400e; }
  table { border-collapse: collapse; width: 100%; margin-bottom: 8px; }
  th, td { border: 1px solid #cbd5e1; padding: 3px 4px; text-align: center; vertical-align: middle; }
  .left { text-align: left; }
  .money { text-align: right; white-space: nowrap; }
  .highlight { font-weight: bold; color: #92400e; }
  .hdr-main { background: #091b2e; color: #fff; text-align: left; padding: 6px 8px; font-size: 9pt; }
  .resumo th { background: #1b4363; color: #fff; font-size: 7.5pt; }
  .resumo .total td { background: #e2e8f0; font-weight: bold; }
  .loja { page-break-before: always; break-before: page; margin-top: 0; }
  .detalhe thead { display: table-header-group; }
  .detalhe tr { page-break-inside: avoid; break-inside: avoid; }
  .loja-bar { background: #f1f5f9; border: 1px solid #94a3b8; border-bottom: none; padding: 5px 8px; font-size: 9pt; }
  .loja-nome { font-weight: bold; letter-spacing: 0.03em; }
  .loja-meta { color: #475569; margin-left: 6px; font-weight: normal; }
  .loja-fin { float: right; font-size: 8pt; color: #334155; }
  .loja-fin .pagar { color: #92400e; font-size: 9pt; }
  .hdr-id { background: #1b4363; color: #fff; font-size: 7.5pt; }
  .hdr-qtd { background: #d7e5dc; color: #1e3a2f; font-size: 7.5pt; }
  .hdr-fin { background: #dde5ef; color: #1e293b; font-size: 7.5pt; }
  .rom { font-weight: bold; color: #173e27; }
  .vp { background: #eff6ff; }
  .cell-tipo { line-height: 1.25; }
  .cell-tipo .qtd { font-weight: bold; }
  .cell-tipo .prc { font-weight: normal; }
  .muted { color: #64748b; }
  .subtotal td { background: #f8fafc; font-weight: bold; }
  .obs-box { border: 1px solid #cbd5e1; border-top: none; background: #f8fafc; padding: 5px 8px; font-size: 7.5pt; color: #334155; }
  .obs-title { font-weight: bold; margin-bottom: 2px; color: #0f172a; }
  .obs-box ul { margin: 0; padding-left: 14px; }
  .obs-box li { margin-bottom: 2px; }
</style>
</head>
<body>
  <h1>AGROVENDA — FISCAL · CONTAS (TEMPLATE MÁRCIO) — LOJA POR LOJA</h1>
  <div class="note">
    Emissão: <b>${escapeHtml(hoje)}</b> · ${sales.length} carga(s) · A4 paisagem.<br/>
    Filtros: Status <b>${escapeHtml(meta.statusStr)}</b> · Lojas <b>${escapeHtml(meta.lojasStr)}</b> ·
    Produtos <b>${escapeHtml(meta.produtosStr)}</b> · Produtores <b>${escapeHtml(meta.produtoresStr)}</b> ·
    Busca <b>${escapeHtml(meta.buscaStr)}</b><br/>
    <b>Produto:</b> ${escapeHtml(produto)} · <b>Unidade:</b> ${escapeHtml(UNIDADE_QTD)} ·
    Valor a pagar = romaneio − Fundo Rural (1,63% s/ VP).<br/>
    <b>Layout:</b> capa com resumo · cada loja em página própria (<code>page-break-before</code>).
  </div>

  <div class="kpis">
    <div class="kpi vp"><div class="lbl">Valor dos romaneios</div><div class="val">${money(geral.totRom)}</div></div>
    <div class="kpi"><div class="lbl">Fundo Rural (1,63%)</div><div class="val">${money(geral.totFun)}</div></div>
    <div class="kpi pagar"><div class="lbl">Valor a pagar</div><div class="val">${money(geral.totPagar)}</div></div>
    <div class="kpi"><div class="lbl">Valor das NFs</div><div class="val">${geral.totNf ? money(geral.totNf) : '—'}</div></div>
  </div>

  <table class="resumo">
    <thead>
      <tr><th colspan="7" class="hdr-main">RESUMO POR LOJA — VALOR A PAGAR</th></tr>
      <tr>
        <th>Destinatário</th>
        <th>Cargas</th>
        <th>Sem NF</th>
        <th>Sacos</th>
        <th>Romaneios</th>
        <th>Fundo Rural</th>
        <th>Valor a pagar</th>
      </tr>
    </thead>
    <tbody>${resumoBody || `<tr><td colspan="7">Nenhum título no filtro.</td></tr>`}</tbody>
    <tfoot>
      <tr class="total">
        <td class="left">TOTAL GERAL</td>
        <td>${geral.n}</td>
        <td>${geral.semNf || '—'}</td>
        <td>${geral.totSacos || '—'}</td>
        <td class="money">${money(geral.totRom)}</td>
        <td class="money">${money(geral.totFun)}</td>
        <td class="money highlight">${money(geral.totPagar)}</td>
      </tr>
    </tfoot>
  </table>

  ${lojaBlocks || '<p class="muted">Nenhum título no filtro.</p>'}
</body>
</html>`;
}

/**
 * Gera .pdf real via POST /api/reports/fiscal-pdf (Playwright).
 * Sem fallback .html.
 */
export async function downloadFiscalPdf(sales, totals, filters = {}) {
  const html = buildFiscalPdfHtml(sales, totals, filters);
  const filename = `Fiscal_Contas_${new Date().toISOString().split('T')[0]}.pdf`;
  const token = typeof window !== 'undefined' ? localStorage.getItem('agrovenda_token') : null;

  const response = await fetch('/api/reports/fiscal-pdf', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ html, filename, landscape: true })
  });

  if (!response.ok) {
    let msg = `Falha ao gerar PDF (${response.status})`;
    try {
      const err = await response.json();
      if (err?.error || err?.message) msg = err.error || err.message;
    } catch { /* ignore */ }
    throw new Error(msg);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Reexport para Drive: Excel Contas permanece no builder Excel. */
export { buildFiscalExcelHtml as buildFiscalDriveExcelHtml } from './fiscalExcelBuilder';
