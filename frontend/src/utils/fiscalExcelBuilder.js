/**
 * Planilha Excel (.xls HTML) exclusiva do Fiscal — Contas/Fluxos.
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

function extractProductName(sale) {
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

function anexosLabel(sale) {
  const parts = [];
  const evidence = sale.evidenceFile || sale.rawEvidenceFile;
  const nf = sale.nfFile || sale.rawNfFile;
  const proof = sale.paymentProofFile;
  if (evidence) parts.push(`Pedido: ${getCleanFileName(evidence)}`);
  if (nf) parts.push(`NF: ${getCleanFileName(nf)}`);
  if (proof) parts.push(`CP: ${getCleanFileName(proof)}`);
  return parts.length ? parts.join(' | ') : '—';
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

  const rowsHtml = sales.map((s) => {
    const liq = calculateLiquidation(s);
    const disc = settlementDiscountInfo(s);
    const statusText = `${liq.statusLabel || ''}${liq.isPartial && liq.percentPaid ? ` (${liq.percentPaid.toFixed(0)}%)` : ''}`;
    const qtd = formatQuantity(quantityOf(s), resolveProductUnit(s));

    return `
      <tr>
        <td class="cell-center">${escapeHtml(formatDate(s.saleDate))}</td>
        <td class="cell-center" style="font-weight:bold;color:#173e27;">${escapeHtml(s.id || '')}</td>
        <td class="cell-center">${escapeHtml(resolveRomaneioNumber(s) || '—')}</td>
        <td class="cell-center">${escapeHtml(nfDisplayLabel(s))}</td>
        <td class="cell-left">${escapeHtml(s.client || '')}</td>
        <td class="cell-left">${escapeHtml(extractProducerName(s))}</td>
        <td class="cell-left">${escapeHtml(extractProductName(s))}</td>
        <td class="cell-num">${escapeHtml(qtd)}</td>
        <td class="cell-money" style="background-color:#dbeafe;">${formatMoeda(liq.valorVP)}</td>
        <td class="cell-money-normal">${formatMoeda(liq.valorTotalNF)}</td>
        <td class="cell-money bg-liquidado">${liq.valorLiquidado > 0 ? formatMoeda(liq.valorLiquidado) : '—'}</td>
        <td class="cell-money-normal">${disc.totalDiscount > 0 ? formatMoeda(disc.totalDiscount) : '—'}</td>
        <td class="cell-money bg-aliquidar">${liq.valorALiquidar > 0 ? formatMoeda(liq.valorALiquidar) : '—'}</td>
        <td class="cell-center">${escapeHtml(s.dueDate ? formatDate(s.dueDate) : '—')}</td>
        <td class="cell-center">${escapeHtml(statusText)}</td>
        <td class="cell-center">${escapeHtml(paymentMethodLabel(s))}</td>
        <td class="cell-left" style="font-size:7.5pt;">${escapeHtml(anexosLabel(s))}</td>
        <td class="cell-left">${escapeHtml(s.notes || '')}</td>
        <td class="cell-left">${escapeHtml(disc.note || '')}</td>
      </tr>
    `;
  }).join('');

  return `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, Calibri, sans-serif; font-size: 9pt; color: #1e293b; margin: 20px; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
        th, td { border: 1px solid #cbd5e1; padding: 5px 7px; font-size: 8pt; vertical-align: top; }
        .hdr-main { background-color: #091b2e; color: #ffffff; font-weight: bold; font-size: 10pt; padding: 8px 10px; text-align: left; }
        .hdr-sub { background-color: #1b4363; color: #ffffff; font-weight: bold; font-size: 7.5pt; text-align: center; }
        .cell-left { text-align: left; mso-number-format: "\\@"; }
        .cell-center { text-align: center; mso-number-format: "\\@"; }
        .cell-num { text-align: right; }
        .cell-money { text-align: right; font-weight: bold; }
        .cell-money-normal { text-align: right; }
        .bg-liquidado { background-color: #ecfdf5; color: #065f46; }
        .bg-aliquidar { background-color: #fffbeb; color: #92400e; }
        .badge-kpi { border: 1px solid #cbd5e1; background-color: #f8fafc; padding: 8px; }
        .row-total { background-color: #e2e8f0; font-weight: bold; border-top: 2px solid #64748b; }
      </style>
    </head>
    <body>
      <table style="border:none;margin-bottom:12px;">
        <tr>
          <td colspan="19" style="border:none;padding:0;">
            <div style="font-size:14pt;font-weight:bold;color:#091b2e;">AGROVENDA — FISCAL (CONTAS / FLUXOS)</div>
            <div style="font-size:9pt;color:#64748b;margin-top:3px;">
              Emissão: <b>${hojeFormatado}</b> |
              Status: <b>${escapeHtml(statusStr)}</b> |
              Lojas: <b>${escapeHtml(lojasStr)}</b> |
              Produtos: <b>${escapeHtml(produtosStr)}</b> |
              Produtores: <b>${escapeHtml(produtoresStr)}</b> |
              Busca: <b>${escapeHtml(buscaStr)}</b> |
              Registros: <b>${sales.length}</b>
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

      <table>
        <thead>
          <tr>
            <th colspan="19" class="hdr-main">DETALHAMENTO — BAIXAS E COBRANÇA (FILTRO ATUAL)</th>
          </tr>
          <tr>
            <th class="hdr-sub">Data</th>
            <th class="hdr-sub">${DATA_LABELS.vpNumber}</th>
            <th class="hdr-sub">${DATA_LABELS.romaneioNumber}</th>
            <th class="hdr-sub">${DATA_LABELS.nfNumber}</th>
            <th class="hdr-sub">Loja</th>
            <th class="hdr-sub">Produtor</th>
            <th class="hdr-sub">Produto</th>
            <th class="hdr-sub">${DATA_LABELS.quantity}</th>
            <th class="hdr-sub" style="background-color:#1e3a8a;">${DATA_LABELS.valorNegociadoVP}</th>
            <th class="hdr-sub">${DATA_LABELS.valorNF}</th>
            <th class="hdr-sub" style="background-color:#065f46;">Valor Recebido</th>
            <th class="hdr-sub">Desconto</th>
            <th class="hdr-sub" style="background-color:#b45309;">${DATA_LABELS.saldoAReceber}</th>
            <th class="hdr-sub">Vencimento</th>
            <th class="hdr-sub">Status</th>
            <th class="hdr-sub">${DATA_LABELS.formaPagamento}</th>
            <th class="hdr-sub">Anexos</th>
            <th class="hdr-sub">Observações</th>
            <th class="hdr-sub">Obs. desconto</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml || `<tr><td colspan="19" class="cell-center" style="color:#94a3b8;font-style:italic;">Nenhum título no filtro.</td></tr>`}
        </tbody>
        <tfoot>
          <tr class="row-total">
            <td colspan="7" class="cell-left">TOTAL (filtro)</td>
            <td class="cell-num">${escapeHtml(formatQuantity(totals.caixas || 0))}</td>
            <td class="cell-money">${formatMoeda(totals.vp)}</td>
            <td class="cell-money-normal">${formatMoeda(totals.nf)}</td>
            <td class="cell-money bg-liquidado">${formatMoeda(totals.recebido)}</td>
            <td class="cell-center">—</td>
            <td class="cell-money bg-aliquidar">${formatMoeda(totals.saldo)}</td>
            <td colspan="6"></td>
          </tr>
        </tfoot>
      </table>
    </body>
    </html>
  `;
}

export function downloadFiscalExcel(sales, totals, filters = {}) {
  const html = buildFiscalExcelHtml(sales, totals, filters);
  const dateStr = new Date().toISOString().split('T')[0];
  const fileName = `Fiscal_Contas_${dateStr}.xls`;
  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
