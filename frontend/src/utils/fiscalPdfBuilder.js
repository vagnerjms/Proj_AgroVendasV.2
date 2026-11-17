/**
 * PDF print-ready do Fiscal — Contas/Fluxos (A4 paisagem).
 * Mesmo layout loja a loja do Excel Fiscal (métricas VP / NF / Recebido / Saldo).
 */
import { formatDate } from './formatters';
import { formatQuantity } from './dataHelpers';
import { DATA_LABELS } from '../constants/dataLabels';
import { buildFiscalExcelHtml, groupFiscalSalesByLoja } from './fiscalExcelBuilder';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatMoeda(v) {
  const num = Number(v) || 0;
  return 'R$ ' + num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
    lojasStr: filters.selectedStores?.length ? `${filters.selectedStores.length} loja(s)` : 'Nenhuma',
    produtosStr: filters.selectedProducts?.length ? `${filters.selectedProducts.length} produto(s)` : 'Nenhum',
    produtoresStr: filters.selectedProducers?.length ? `${filters.selectedProducers.length} produtor(es)` : 'Nenhum',
    buscaStr: (filters.searchTerm || '').trim() || '—'
  };
}

/**
 * HTML A4 paisagem para impressão / Salvar como PDF.
 */
export function buildFiscalPdfHtml(sales = [], totals = {}, filters = {}) {
  const hoje = new Date().toLocaleString('pt-BR');
  const meta = filterMeta(filters);
  const groups = groupFiscalSalesByLoja(sales);

  const resumoRows = groups.map((g) => `
    <tr>
      <td class="left"><b>${escapeHtml(g.loja)}</b></td>
      <td>${g.totals.n}</td>
      <td>${escapeHtml(formatQuantity(g.totals.qtd))}</td>
      <td class="money">${formatMoeda(g.totals.vp)}</td>
      <td class="money">${formatMoeda(g.totals.nf)}</td>
      <td class="money ok">${formatMoeda(g.totals.recebido)}</td>
      <td class="money warn">${formatMoeda(g.totals.saldo)}</td>
    </tr>`).join('');

  const blocks = groups.map((g) => {
    const nome = String(g.loja || '').toUpperCase();
    const obsList = g.itens
      .map((r) => (r.obsResumo ? `Rom. ${r.rom} (${r.sale.id || '—'}): ${r.obsResumo}` : null))
      .filter(Boolean);

    const rows = g.itens.map((r) => `
      <tr>
        <td>${escapeHtml(formatDate(r.sale.saleDate))}</td>
        <td class="rom">${escapeHtml(r.rom)}</td>
        <td>${escapeHtml(r.nf)}</td>
        <td class="left">${escapeHtml(r.produto)}</td>
        <td>${escapeHtml(r.qtdLabel)}</td>
        <td class="money vp">${formatMoeda(r.liq.valorVP)}</td>
        <td class="money">${formatMoeda(r.liq.valorTotalNF)}</td>
        <td class="money ok">${r.liq.valorLiquidado > 0 ? formatMoeda(r.liq.valorLiquidado) : '—'}</td>
        <td class="money warn">${r.liq.valorALiquidar > 0 ? formatMoeda(r.liq.valorALiquidar) : '—'}</td>
      </tr>`).join('');

    return `
      <section class="loja">
        <div class="loja-bar">
          <span class="loja-nome">${escapeHtml(nome)}</span>
          <span class="loja-meta">(${g.totals.n} carga${g.totals.n === 1 ? '' : 's'})</span>
          <span class="loja-fin">
            VP: <b>${formatMoeda(g.totals.vp)}</b>
            &nbsp;|&nbsp; Recebido: <b>${formatMoeda(g.totals.recebido)}</b>
            &nbsp;|&nbsp; ${escapeHtml(DATA_LABELS.saldoAReceber)}: <b class="pagar">${formatMoeda(g.totals.saldo)}</b>
          </span>
        </div>
        <table class="detalhe">
          <thead>
            <tr>
              <th colspan="3" class="hdr-id">Identificação</th>
              <th colspan="2" class="hdr-qtd">Produto / quantidade</th>
              <th colspan="4" class="hdr-fin">Financeiro</th>
            </tr>
            <tr>
              <th class="hdr-id">Data</th>
              <th class="hdr-id">${escapeHtml(DATA_LABELS.romaneioNumber)}</th>
              <th class="hdr-id">${escapeHtml(DATA_LABELS.nfNumber)}</th>
              <th class="hdr-qtd">Produto</th>
              <th class="hdr-qtd">${escapeHtml(DATA_LABELS.quantity)}</th>
              <th class="hdr-fin">${escapeHtml(DATA_LABELS.valorNegociadoVP)}</th>
              <th class="hdr-fin">${escapeHtml(DATA_LABELS.valorNF)}</th>
              <th class="hdr-fin">Valor Recebido</th>
              <th class="hdr-fin">${escapeHtml(DATA_LABELS.saldoAReceber)}</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr class="subtotal">
              <td colspan="4" class="left">TOTAL ${escapeHtml(nome.split(/\s+/)[0])}</td>
              <td>${escapeHtml(formatQuantity(g.totals.qtd))}</td>
              <td class="money">${formatMoeda(g.totals.vp)}</td>
              <td class="money">${formatMoeda(g.totals.nf)}</td>
              <td class="money ok">${formatMoeda(g.totals.recebido)}</td>
              <td class="money warn">${formatMoeda(g.totals.saldo)}</td>
            </tr>
          </tfoot>
        </table>
        <div class="obs-box">
          <div class="obs-title">Observações</div>
          ${obsList.length
            ? `<ul>${obsList.map((o) => `<li>${escapeHtml(o)}</li>`).join('')}</ul>`
            : '<div class="muted">Nenhuma observação neste bloco.</div>'}
        </div>
      </section>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Fiscal Contas — ${escapeHtml(hoje)}</title>
<style>
  @page { size: A4 landscape; margin: 10mm; }
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
  .kpi.ok { background: #ecfdf5; }
  .kpi.ok .val { color: #065f46; }
  .kpi.warn { background: #fffbeb; }
  .kpi.warn .val { color: #92400e; }
  table { border-collapse: collapse; width: 100%; margin-bottom: 8px; }
  th, td { border: 1px solid #cbd5e1; padding: 3px 4px; text-align: center; vertical-align: middle; }
  .left { text-align: left; }
  .money { text-align: right; white-space: nowrap; }
  .ok { color: #065f46; font-weight: bold; }
  .warn { color: #92400e; font-weight: bold; }
  .hdr-main { background: #091b2e; color: #fff; text-align: left; padding: 6px 8px; font-size: 9pt; }
  .resumo th { background: #1b4363; color: #fff; font-size: 7.5pt; }
  .resumo .total td { background: #e2e8f0; font-weight: bold; }
  /* Uma loja por página (detalhamento completo em página própria). */
  .loja {
    page-break-before: always;
    break-before: page;
    margin-top: 0;
  }
  .detalhe thead { display: table-header-group; }
  .detalhe tr { page-break-inside: avoid; break-inside: avoid; }
  .loja-bar { background: #f1f5f9; border: 1px solid #94a3b8; border-bottom: none; padding: 5px 8px; font-size: 9pt; }
  .loja-nome { font-weight: bold; letter-spacing: 0.03em; }
  .loja-meta { color: #475569; margin-left: 6px; }
  .loja-fin { float: right; font-size: 8pt; color: #334155; }
  .loja-fin .pagar { color: #92400e; }
  .hdr-id { background: #1b4363; color: #fff; font-size: 7.5pt; }
  .hdr-qtd { background: #d7e5dc; color: #1e3a2f; font-size: 7.5pt; }
  .hdr-fin { background: #dde5ef; color: #1e293b; font-size: 7.5pt; }
  .rom { font-weight: bold; color: #173e27; }
  .vp { background: #eff6ff; }
  .subtotal td { background: #f8fafc; font-weight: bold; }
  .obs-box { border: 1px solid #cbd5e1; border-top: none; background: #f8fafc; padding: 5px 8px; font-size: 7.5pt; color: #334155; }
  .obs-title { font-weight: bold; margin-bottom: 2px; }
  .obs-box ul { margin: 0; padding-left: 14px; }
  .muted { color: #64748b; }
  @media print {
    .no-print { display: none !important; }
  }
</style>
</head>
<body>
  <h1>AGROVENDA — FISCAL (CONTAS / FLUXOS)</h1>
  <div class="note">
    Emissão: <b>${escapeHtml(hoje)}</b> ·
    Status: <b>${escapeHtml(meta.statusStr)}</b> ·
    Lojas: <b>${escapeHtml(meta.lojasStr)}</b> ·
    Produtos: <b>${escapeHtml(meta.produtosStr)}</b> ·
    Produtores: <b>${escapeHtml(meta.produtoresStr)}</b> ·
    Busca: <b>${escapeHtml(meta.buscaStr)}</b> ·
    Registros: <b>${sales.length}</b><br/>
    Quantidade na unidade cadastrada do produto. ${escapeHtml(DATA_LABELS.saldoAReceber)} = VP − recebido (descontos).<br/>
    <b>Layout:</b> capa com resumo · cada loja em página própria com o detalhamento.
  </div>

  <div class="kpis">
    <div class="kpi vp"><div class="lbl">${escapeHtml(DATA_LABELS.valorNegociadoVP)}</div><div class="val">${formatMoeda(totals.vp)}</div></div>
    <div class="kpi ok"><div class="lbl">Já Recebido</div><div class="val">${formatMoeda(totals.recebido)}</div></div>
    <div class="kpi warn"><div class="lbl">${escapeHtml(DATA_LABELS.saldoAReceber)}</div><div class="val">${formatMoeda(totals.saldo)}</div></div>
    <div class="kpi"><div class="lbl">${escapeHtml(DATA_LABELS.valorNF)}</div><div class="val">${formatMoeda(totals.nf)}</div></div>
  </div>

  <table class="resumo">
    <thead>
      <tr><th colspan="7" class="hdr-main">RESUMO POR LOJA</th></tr>
      <tr>
        <th>Loja</th><th>Cargas</th><th>${escapeHtml(DATA_LABELS.quantity)}</th>
        <th>${escapeHtml(DATA_LABELS.valorNegociadoVP)}</th><th>${escapeHtml(DATA_LABELS.valorNF)}</th>
        <th>Recebido</th><th>${escapeHtml(DATA_LABELS.saldoAReceber)}</th>
      </tr>
    </thead>
    <tbody>
      ${resumoRows || `<tr><td colspan="7">Nenhum título no filtro.</td></tr>`}
    </tbody>
  </table>

  ${blocks || '<p class="muted">Nenhum título no filtro.</p>'}

  <p class="no-print note" style="margin-top:12px;">
    Use <b>Salvar como PDF</b> na caixa de impressão (orientação paisagem).
  </p>
</body>
</html>`;
}

/**
 * Abre janela de impressão (Salvar como PDF) com o layout Fiscal aprovado.
 */
export function downloadFiscalPdf(sales, totals, filters = {}) {
  const html = buildFiscalPdfHtml(sales, totals, filters);
  const w = window.open('', '_blank', 'noopener,noreferrer,width=1200,height=800');
  if (!w) {
    // Fallback: download HTML print-ready
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Fiscal_Contas_${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => {
    try {
      w.print();
    } catch {
      /* ignore */
    }
  }, 350);
}

/** Reexport para Drive: mesmo HTML Excel do builder. */
export function buildFiscalDriveExcelHtml(sales, totals, filters) {
  return buildFiscalExcelHtml(sales, totals, filters);
}
