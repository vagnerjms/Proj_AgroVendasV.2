/**
 * Utilitário de Geração de Planilhas HTML/Excel Corporativas para Relatórios AgroVenda V2
 * Espelha fielmente o layout em PDF/Tela do Relatório Geral:
 * 1. ResumoLojas (NFs e VPs por Loja)
 * 2. Detalhamento Individual das Vendas por Loja (VPs)
 * Exclui expressamente as colunas "Total Comercial" e "Valor Total VP".
 */

export function buildExcelReportHtml(stores = [], customTotal = null, filters = {}) {
  const hojeFormatado = new Date().toLocaleDateString('pt-BR');
  const periodoStr = (filters.startDate || filters.endDate) 
    ? `${filters.startDate ? filters.startDate.split('-').reverse().join('/') : 'Início'} até ${filters.endDate ? filters.endDate.split('-').reverse().join('/') : 'Atual'}`
    : 'Todo o Histórico';

  const formatMoeda = (v) => {
    const num = Number(v) || 0;
    return 'R$ ' + num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatNumero = (v, decimals = 2) => {
    const num = Number(v) || 0;
    return num.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  };

  // Calcular totais gerais consolidados caso não venham prontos
  const totalGeral = customTotal || stores.reduce((acc, row) => ({
    nfs: acc.nfs + (Number(row.nfs) || 0),
    pedidosVenda: acc.pedidosVenda + (Number(row.pedidosVenda) || 0),
    pedidosSemNF: acc.pedidosSemNF + (Number(row.pedidosSemNF) || 0),
    pesoNF: acc.pesoNF + (Number(row.pesoNF) || 0),
    pesoColheita: acc.pesoColheita + (Number(row.pesoColheita) || 0),
    cxsVendidas: acc.cxsVendidas + (Number(row.cxsVendidas) || 0),
    valorTotalNF: acc.valorTotalNF + (Number(row.valorTotalNF) || 0),
    funrural: acc.funrural + (Number(row.funrural) || 0),
    valorTotalLiquidado: acc.valorTotalLiquidado + (Number(row.valorLiquidado) || 0),
    valorTotalALiquidar: acc.valorTotalALiquidar + (Number(row.valorALiquidar) || 0),
    liquidoNF: acc.liquidoNF + (Number(row.liquidoNF) || 0)
  }), {
    nfs: 0,
    pedidosVenda: 0,
    pedidosSemNF: 0,
    pesoNF: 0,
    pesoColheita: 0,
    cxsVendidas: 0,
    valorTotalNF: 0,
    funrural: 0,
    valorTotalLiquidado: 0,
    valorTotalALiquidar: 0,
    liquidoNF: 0
  });

  return `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, Calibri, sans-serif; font-size: 9pt; color: #1e293b; margin: 20px; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 25px; font-family: Arial, Calibri, sans-serif; }
        th, td { border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 8.5pt; }
        
        .hdr-main { background-color: #1b4363; color: #ffffff; font-weight: bold; font-size: 11pt; padding: 8px 12px; text-align: left; }
        .hdr-sub { background-color: #245b85; color: #ffffff; font-weight: bold; font-size: 8.5pt; text-align: center; }
        .hdr-loja { background-color: #f1f5f9; color: #0f172a; font-weight: bold; font-size: 9.5pt; padding: 6px 10px; border-bottom: 2px solid #94a3b8; }
        
        .cell-left { text-align: left; mso-number-format: "\\@"; }
        .cell-center { text-align: center; mso-number-format: "\\@"; }
        .cell-right { text-align: right; }
        .cell-num { text-align: right; mso-number-format: "\\#\\,\\#\\#0\\.00"; }
        .cell-num-int { text-align: center; mso-number-format: "\\#\\,\\#\\#0"; }
        .cell-money { text-align: right; mso-number-format: "\\0022R\\$\\0022\\\\ \\#\\,\\#\\#0\\.00"; font-weight: bold; }
        .cell-money-normal { text-align: right; mso-number-format: "\\0022R\\$\\0022\\\\ \\#\\,\\#\\#0\\.00"; }
        .cell-funrural { text-align: right; mso-number-format: "\\-\\0022R\\$\\0022\\\\ \\#\\,\\#\\#0\\.00"; color: #b91c1c; }
        
        .badge-kpi { border: 1px solid #cbd5e1; background-color: #f8fafc; padding: 8px; font-weight: bold; }
        .row-total-geral { background-color: #bfe2a5; font-weight: bold; font-size: 9pt; border-top: 2px solid #166534; border-bottom: 2px solid #166534; }
        .row-subtotal-loja { background-color: #f1f5f9; font-weight: bold; border-top: 2px solid #cbd5e1; border-bottom: 2px solid #cbd5e1; }
        
        .bg-liquidado { background-color: #ecfdf5; color: #065f46; font-weight: bold; }
        .bg-aliquidar { background-color: #fffbeb; color: #92400e; font-weight: bold; }
        .bg-liquido-nf { background-color: #f0fdf4; color: #14532d; font-weight: bold; }
      </style>
    </head>
    <body>

      <!-- CABEÇALHO DO RELATÓRIO -->
      <table style="border: none; margin-bottom: 15px;">
        <tr>
          <td colspan="12" style="border: none; padding: 0;">
            <div style="font-size: 14pt; font-weight: bold; color: #091b2e;">AGROVENDA — RELATÓRIO GERAL (NFS E VPS POR LOJA)</div>
            <div style="font-size: 9pt; color: #64748b; margin-top: 3px;">
              Data de Emissão: <b>${hojeFormatado}</b> | Período: <b>${periodoStr}</b> | Total de Lojas: <b>${stores.length}</b> | Total de Vendas: <b>${totalGeral.pedidosVenda || 0}</b>
            </div>
          </td>
        </tr>
      </table>

      <!-- CARDS DE RESUMO FINANCEIRO -->
      <table style="margin-bottom: 20px; border: 1px solid #cbd5e1;">
        <tr style="height: 28px;">
          <td colspan="3" class="badge-kpi" style="border-right: 1px solid #cbd5e1;">
            <div style="font-size: 8pt; color: #64748b; text-transform: uppercase;">Total Faturado NF</div>
            <div style="font-size: 12pt; color: #0f172a; font-weight: bold;">${formatMoeda(totalGeral.valorTotalNF)}</div>
          </td>
          <td colspan="3" class="badge-kpi" style="border-right: 1px solid #cbd5e1;">
            <div style="font-size: 8pt; color: #b91c1c; text-transform: uppercase;">(-) FUNRURAL (1,63%)</div>
            <div style="font-size: 12pt; color: #b91c1c; font-weight: bold;">-${formatMoeda(totalGeral.funrural)}</div>
          </td>
          <td colspan="3" class="badge-kpi" style="border-right: 1px solid #cbd5e1; background-color: #ecfdf5;">
            <div style="font-size: 8pt; color: #065f46; text-transform: uppercase;">Valor Total Liquidado</div>
            <div style="font-size: 12pt; color: #065f46; font-weight: bold;">${formatMoeda(totalGeral.valorTotalLiquidado)}</div>
          </td>
          <td colspan="3" class="badge-kpi" style="background-color: #fffbeb;">
            <div style="font-size: 8pt; color: #92400e; text-transform: uppercase;">Valor a Liquidar (Em Aberto)</div>
            <div style="font-size: 12pt; color: #92400e; font-weight: bold;">${formatMoeda(totalGeral.valorTotalALiquidar)}</div>
          </td>
        </tr>
      </table>

      <!-- ========================================================================= -->
      <!-- TABELA 1: RESUMOLOJAS — RELATÓRIO GERAL - NFS E VPS POR LOJA             -->
      <!-- ========================================================================= -->
      <table style="margin-bottom: 30px;">
        <thead>
          <tr>
            <th colspan="12" class="hdr-main">
              RESUMOLOJAS — RELATÓRIO GERAL - NFS E VPS POR LOJA
            </th>
          </tr>
          <tr style="height: 25px;">
            <th class="hdr-sub" style="text-align: left; width: 230px;">LOJA</th>
            <th class="hdr-sub" style="width: 45px;">NFS</th>
            <th class="hdr-sub" style="width: 65px;">PEDIDOS VENDA</th>
            <th class="hdr-sub" style="width: 65px;">PEDIDOS SEM NF</th>
            <th class="hdr-sub" style="width: 95px;">PESO NF (KG)</th>
            <th class="hdr-sub" style="width: 110px;">PESO BASEADO NA COLHEITA (KG)</th>
            <th class="hdr-sub" style="width: 90px;">CXS VENDIDAS</th>
            <th class="hdr-sub" style="width: 115px;">VALOR TOTAL NF (R$)</th>
            <th class="hdr-sub" style="width: 95px;">FUNRURAL (R$)</th>
            <th class="hdr-sub" style="width: 115px; background-color: #166534;">VALOR LIQUIDADO (R$)</th>
            <th class="hdr-sub" style="width: 115px; background-color: #b45309;">VALOR A LIQUIDAR (R$)</th>
            <th class="hdr-sub" style="width: 115px; background-color: #143753;">LÍQUIDO NF (R$)</th>
          </tr>
        </thead>
        <tbody>
          ${stores.map(row => `
            <tr style="height: 22px;">
              <td class="cell-left" style="font-weight: bold; color: #0f172a;">${row.loja}</td>
              <td class="cell-num-int">${row.nfs || 0}</td>
              <td class="cell-num-int" style="font-weight: bold;">${row.pedidosVenda || 0}</td>
              <td class="cell-num-int" style="color: ${row.pedidosSemNF > 0 ? '#b45309' : '#64748b'}; font-weight: ${row.pedidosSemNF > 0 ? 'bold' : 'normal'};">
                ${row.pedidosSemNF || 0}
              </td>
              <td class="cell-num">${formatNumero(row.pesoNF, 2)}</td>
              <td class="cell-num" style="font-weight: bold;">${formatNumero(row.pesoColheita, 2)}</td>
              <td class="cell-num" style="font-weight: bold;">${formatNumero(row.cxsVendidas, 2)}</td>
              <td class="cell-money-normal">${formatMoeda(row.valorTotalNF)}</td>
              <td class="cell-funrural">-${formatMoeda(row.funrural)}</td>
              <td class="cell-money bg-liquidado">${formatMoeda(row.valorLiquidado)}</td>
              <td class="cell-money bg-aliquidar">${formatMoeda(row.valorALiquidar)}</td>
              <td class="cell-money bg-liquido-nf">${formatMoeda(row.liquidoNF)}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr class="row-total-geral" style="height: 26px;">
            <td class="cell-left" style="font-weight: bold;">TOTAL GERAL</td>
            <td class="cell-num-int" style="font-weight: bold;">${totalGeral.nfs}</td>
            <td class="cell-num-int" style="font-weight: bold;">${totalGeral.pedidosVenda}</td>
            <td class="cell-num-int" style="font-weight: bold;">${totalGeral.pedidosSemNF}</td>
            <td class="cell-num" style="font-weight: bold;">${formatNumero(totalGeral.pesoNF, 2)}</td>
            <td class="cell-num" style="font-weight: bold;">${formatNumero(totalGeral.pesoColheita, 2)}</td>
            <td class="cell-num" style="font-weight: bold;">${formatNumero(totalGeral.cxsVendidas, 2)}</td>
            <td class="cell-money" style="font-weight: bold;">${formatMoeda(totalGeral.valorTotalNF)}</td>
            <td class="cell-funrural" style="font-weight: bold; color: #7f1d1d;">-${formatMoeda(totalGeral.funrural)}</td>
            <td class="cell-money" style="font-weight: bold; background-color: #a7f3d0; color: #064e3b;">${formatMoeda(totalGeral.valorTotalLiquidado)}</td>
            <td class="cell-money" style="font-weight: bold; background-color: #fde68a; color: #78350f;">${formatMoeda(totalGeral.valorTotalALiquidar)}</td>
            <td class="cell-money" style="font-weight: bold; background-color: #aedb8e; color: #064e3b;">${formatMoeda(totalGeral.liquidoNF)}</td>
          </tr>
        </tfoot>
      </table>

      <!-- ========================================================================= -->
      <!-- TABELA 2: DETALHAMENTO INDIVIDUAL DAS VENDAS POR LOJA (VPS)              -->
      <!-- ========================================================================= -->
      <table style="margin-bottom: 10px;">
        <tr>
          <td colspan="15" style="border: none; padding: 8px 0;">
            <div style="font-size: 12pt; font-weight: bold; color: #0f172a; text-transform: uppercase;">
              Detalhamento Individual das Vendas por Loja (VPs)
            </div>
          </td>
        </tr>
      </table>

      ${stores.map(lojaGroup => {
        const items = lojaGroup.itens || [];
        return `
          <table style="margin-bottom: 25px;">
            <thead>
              <!-- Barra de Cabeçalho da Loja -->
              <tr>
                <th colspan="15" class="hdr-loja">
                  <span style="font-size: 10pt; text-transform: uppercase;">${lojaGroup.loja}</span>
                  <span style="font-size: 8.5pt; font-weight: normal; color: #475569; margin-left: 10px;">(${items.length} VPs)</span>
                  <span style="float: right; font-size: 8.5pt; font-weight: normal; color: #334155;">
                    NF: <b>${formatMoeda(lojaGroup.valorTotalNF)}</b> | 
                    Liquidado: <b style="color: #065f46;">${formatMoeda(lojaGroup.valorLiquidado)}</b> | 
                    A Liquidar: <b style="color: #92400e;">${formatMoeda(lojaGroup.valorALiquidar)}</b>
                  </span>
                </th>
              </tr>
              <!-- Colunas de Detalhamento -->
              <tr style="height: 22px;">
                <th class="hdr-sub" style="width: 60px;">Nº VP</th>
                <th class="hdr-sub" style="width: 140px; text-align: left;">PRODUTO / PRODUTOR</th>
                <th class="hdr-sub" style="width: 75px;">DATA VP</th>
                <th class="hdr-sub" style="width: 110px;">Nº NF</th>
                <th class="hdr-sub" style="width: 75px;">DATA NF</th>
                <th class="hdr-sub" style="width: 80px;">PESO NF (KG)</th>
                <th class="hdr-sub" style="width: 85px;">PESO COLHEITA</th>
                <th class="hdr-sub" style="width: 85px;">VOLUMES</th>
                <th class="hdr-sub" style="width: 75px;">PREÇO/KG</th>
                <th class="hdr-sub" style="width: 105px;">VALOR TOTAL NF</th>
                <th class="hdr-sub" style="width: 90px;">FUNRURAL (1,63%)</th>
                <th class="hdr-sub" style="width: 85px;">COTAÇÃO DIA</th>
                <th class="hdr-sub" style="width: 105px; background-color: #166534;">VALOR LIQUIDADO</th>
                <th class="hdr-sub" style="width: 105px; background-color: #b45309;">VALOR A LIQUIDAR</th>
                <th class="hdr-sub" style="width: 105px; background-color: #143753;">LÍQUIDO DA NF</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(it => {
                const isSettled = it.paymentStatus === 'Recebido' || it.status === 'Concluído' || it.status === 'Recebido';
                const itLiquidoValor = Number(it.liquido) > 0 ? Number(it.liquido) : Math.max(0, (Number(it.valorVP) || 0) - (Number(it.funrural) || 0));
                const itLiquidado = isSettled ? itLiquidoValor : 0;
                const itALiquidar = !isSettled ? itLiquidoValor : 0;
                const itLiquidoNF = Number(it.liquidoNF) > 0 ? Number(it.liquidoNF) : Math.max(0, (Number(it.valorNF) || 0) - (Number(it.funrural) || 0));
                const unitAbbr = it.unit?.toLowerCase().includes('saca') || it.product?.toLowerCase().includes('batata') ? 'sc' : 'cx';
                const cotacaoUnit = it.cotacao <= 10.0 ? 'kg' : unitAbbr;

                return `
                  <tr style="height: 20px;">
                    <td class="cell-center" style="font-weight: bold; color: #173e27;">${it.vp || '-'}</td>
                    <td class="cell-left">
                      <div style="font-weight: bold; color: #0f172a;">${it.product || 'Produto'}</div>
                      <div style="font-size: 7.5pt; color: #2563eb;">${it.producer || it.origin || 'Produtor Rural'}</div>
                    </td>
                    <td class="cell-center">${it.dataVP || '-'}</td>
                    <td class="cell-left" style="font-weight: bold;">${it.nf || '-'}</td>
                    <td class="cell-center">${it.dataNF || '-'}</td>
                    <td class="cell-num">${formatNumero(it.pesoNF, 0)} kg</td>
                    <td class="cell-num" style="font-weight: bold;">${formatNumero(it.pesoColheita, 0)} kg</td>
                    <td class="cell-num" style="font-weight: bold;">${formatNumero(it.cxs, 2)} ${unitAbbr}</td>
                    <td class="cell-right">${it.precoKg > 0 ? 'R$ ' + formatNumero(it.precoKg, 2) : '-'}</td>
                    <td class="cell-money-normal">${formatMoeda(it.valorNF)}</td>
                    <td class="cell-funrural">-${formatMoeda(it.funrural)}</td>
                    <td class="cell-right" style="color: #1e40af; font-weight: bold;">
                      ${it.cotacao > 0 ? 'R$ ' + formatNumero(it.cotacao, 2) + '/' + cotacaoUnit : '-'}
                    </td>
                    <td class="cell-money bg-liquidado">
                      ${itLiquidado > 0 ? formatMoeda(itLiquidado) : '-'}
                    </td>
                    <td class="cell-money bg-aliquidar">
                      ${itALiquidar > 0 ? formatMoeda(itALiquidar) : '-'}
                    </td>
                    <td class="cell-money bg-liquido-nf">${formatMoeda(itLiquidoNF)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
            <tfoot>
              <!-- Subtotal da Loja -->
              <tr class="row-subtotal-loja" style="height: 24px;">
                <td colspan="5" class="cell-left" style="font-weight: bold; text-transform: uppercase;">
                  TOTAL ${lojaGroup.loja.split(' ')[0]}
                </td>
                <td class="cell-num" style="font-weight: bold;">${formatNumero(lojaGroup.pesoNF, 2)} kg</td>
                <td class="cell-num" style="font-weight: bold;">${formatNumero(lojaGroup.pesoColheita, 2)} kg</td>
                <td class="cell-num" style="font-weight: bold;">${formatNumero(lojaGroup.cxsVendidas, 2)}</td>
                <td class="cell-center">-</td>
                <td class="cell-money" style="font-weight: bold;">${formatMoeda(lojaGroup.valorTotalNF)}</td>
                <td class="cell-funrural" style="font-weight: bold;">-${formatMoeda(lojaGroup.funrural)}</td>
                <td class="cell-center">-</td>
                <td class="cell-money" style="font-weight: bold; background-color: #d1fae5; color: #064e3b;">
                  ${formatMoeda(lojaGroup.valorLiquidado)}
                </td>
                <td class="cell-money" style="font-weight: bold; background-color: #fef3c7; color: #78350f;">
                  ${formatMoeda(lojaGroup.valorALiquidar)}
                </td>
                <td class="cell-money" style="font-weight: bold; background-color: #dcfce7; color: #064e3b;">
                  ${formatMoeda(lojaGroup.liquidoNF)}
                </td>
              </tr>
            </tfoot>
          </table>
        `;
      }).join('')}

    </body>
    </html>
  `;
}

