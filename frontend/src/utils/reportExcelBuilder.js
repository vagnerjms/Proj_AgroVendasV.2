/**
 * Utilitário de Geração de Planilhas HTML/Excel Corporativas para Relatórios AgroVenda V2
 * Suporta modelos multi-loja, batatas com 5 classificações ou hortifrúti genérico com colunas dinâmicas.
 */

export function buildExcelReportHtml(stores = []) {
  const hojeFormatado = new Date().toLocaleDateString('pt-BR');
  
  const formatMoeda = (v) => {
    const num = Number(v) || 0;
    return num > 0 ? 'R$ ' + num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';
  };
  
  const formatMoedaTotal = (v) => 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  
  const formatQty = (v) => {
    const num = Number(v) || 0;
    if (num <= 0) return '';
    return num % 1 === 0 
      ? String(num) 
      : num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const cleanProdName = (name) => {
    if (!name) return 'Produto';
    let n = name.trim();
    n = n.replace(/\s*\(Caixa\s*\d*kg\)/i, '')
         .replace(/\s*\(Sacas?\s*\d*kg\)/i, '')
         .replace(/\s*\(\d+\s*kg\)/i, '')
         .replace(/\s*\(Caixa\)/i, '')
         .replace(/\s*\(Saca\)/i, '')
         .trim();
    return n || name.trim();
  };

  // Classificação clássica de Batata (Especial, 1X, Diversa, Bolinha / Miúda, Florão)
  const extractBatataClassifications = (it) => {
    const res = {
      qtd: { esp: 0, prim: 0, div: 0, bol: 0, flo: 0 },
      val: { esp: 0, prim: 0, div: 0, bol: 0, flo: 0 }
    };

    const classifyName = (name) => {
      const p = (name || '').toLowerCase();
      if (p.includes('bolinha') || p.includes('bol') || p.includes('baby') || p.includes('miuda') || p.includes('miúda') || p.includes('pequena') || p.includes('tipo 4') || p.includes('tipo4')) {
        return 'bol';
      }
      if (p.includes('primeira') || p.includes('1x') || p.includes('prim') || p.includes('tipo 2') || p.includes('tipo2')) {
        return 'prim';
      }
      if (p.includes('diversa') || p.includes('div') || p.includes('media') || p.includes('média') || p.includes('tipo 3') || p.includes('tipo3') || p.includes('caixa 3') || p.includes('cx3')) {
        return 'div';
      }
      if (p.includes('florao') || p.includes('florão') || p.includes('flo') || p.includes('descarte') || p.includes('refugo') || p.includes('g2') || p.includes('tipo 5') || p.includes('tipo5')) {
        return 'flo';
      }
      return 'esp';
    };

    const rawItems = it.items && Array.isArray(it.items) && it.items.length > 0 ? it.items : null;

    if (rawItems && rawItems.length > 1) {
      rawItems.forEach(item => {
        const slot = classifyName(item.product);
        const p = (item.product || '').toLowerCase();
        const bw = Number(item.boxWeightKg) || (p.includes('batata') ? 25 : (p.includes('granel') ? 1 : 29));
        const q = Number(item.quantity) || (Number(item.kg) > 0 && bw > 0 ? Number((Number(item.kg) / bw).toFixed(2)) : 0);
        const quote = Number(item.dailyQuote) || Number(item.price) || (q > 0 && Number(item.valorTotalVP) > 0 ? Number(item.valorTotalVP) / q : (q > 0 && Number(item.total) > 0 ? Number(item.total) / q : Number(it.cotacao) || 0));

        res.qtd[slot] += q;
        if (quote > 0) res.val[slot] = quote;
      });
    } else if (rawItems && rawItems.length === 1) {
      const item = rawItems[0];
      const slot = classifyName(item.product);
      const p = (item.product || '').toLowerCase();
      const bw = Number(item.boxWeightKg) || (p.includes('batata') ? 25 : (p.includes('granel') ? 1 : 29));
      const q = Number(item.quantity) || (Number(item.kg) > 0 && bw > 0 ? Number((Number(item.kg) / bw).toFixed(2)) : (Number(it.cxs) || (Number(it.pesoNF) > 0 ? Number((Number(it.pesoNF) / bw).toFixed(2)) : 0)));
      const quote = Number(item.dailyQuote) || Number(item.price) || (q > 0 && Number(item.valorTotalVP) > 0 ? Number(item.valorTotalVP) / q : (q > 0 && Number(item.total) > 0 ? Number(item.total) / q : Number(it.cotacao) || 0));

      res.qtd[slot] += q;
      if (quote > 0) res.val[slot] = quote;
    } else if (it.product && it.product.includes('+')) {
      const segments = it.product.split('+');
      segments.forEach(seg => {
        const slot = classifyName(seg);
        const qMatch = seg.match(/(\d+[\d.,]*)\s*(sc|cx|kg|saca|caixa)/i) || seg.match(/\((\d+[\d.,]*)/);
        const q = qMatch ? parseFloat(qMatch[1].replace(/\./g, '').replace(',', '.')) : 0;
        const quote = Number(it.cotacao) || 0;

        res.qtd[slot] += q;
        if (quote > 0 && !res.val[slot]) res.val[slot] = quote;
      });
    } else {
      const slot = classifyName(it.product);
      const q = Number(it.cxs) || (Number(it.pesoNF) > 0 ? Number((Number(it.pesoNF) / 29).toFixed(2)) : 0);
      const quote = Number(it.cotacao) || 0;
      res.qtd[slot] = q;
      res.val[slot] = quote;
    }

    return res;
  };

  // Extração para produtos genéricos (Cenoura, Cebola, Beterraba, etc.)
  const extractGenericClassifications = (it, cols) => {
    const res = { qtd: {}, val: {} };
    cols.forEach(c => {
      res.qtd[c.key] = 0;
      res.val[c.key] = 0;
    });

    const rawItems = it.items && Array.isArray(it.items) && it.items.length > 0 ? it.items : null;

    if (rawItems && rawItems.length > 0) {
      rawItems.forEach(sub => {
        const subName = cleanProdName(sub.product || it.product || 'Produto');
        const matchedCol = cols.find(c => c.prodName.toLowerCase() === subName.toLowerCase()) || cols[0];
        const p = (sub.product || '').toLowerCase();
        const bw = Number(sub.boxWeightKg) || (p.includes('granel') ? 1 : 29);
        const q = Number(sub.quantity) || (Number(sub.kg) > 0 && bw > 0 ? Number((Number(sub.kg) / bw).toFixed(2)) : 0);
        const quote = Number(sub.dailyQuote) || Number(sub.price) || (q > 0 && Number(sub.valorTotalVP) > 0 ? Number(sub.valorTotalVP) / q : (q > 0 && Number(sub.total) > 0 ? Number(sub.total) / q : Number(it.cotacao) || 0));

        if (matchedCol) {
          res.qtd[matchedCol.key] += q;
          if (quote > 0) res.val[matchedCol.key] = quote;
        }
      });
    } else if (it.product && it.product.includes('+')) {
      const segments = it.product.split('+');
      segments.forEach(seg => {
        const segName = cleanProdName(seg.replace(/\s*\([^)]*\)/g, ''));
        const matchedCol = cols.find(c => c.prodName.toLowerCase() === segName.toLowerCase()) || cols[0];
        const qMatch = seg.match(/(\d+[\d.,]*)\s*(sc|cx|kg|saca|caixa)/i) || seg.match(/\((\d+[\d.,]*)/);
        const q = qMatch ? parseFloat(qMatch[1].replace(/\./g, '').replace(',', '.')) : 0;
        const quote = Number(it.cotacao) || 0;

        if (matchedCol) {
          res.qtd[matchedCol.key] += q;
          if (quote > 0 && !res.val[matchedCol.key]) res.val[matchedCol.key] = quote;
        }
      });
    } else {
      const pName = cleanProdName(it.product || 'Produto');
      const matchedCol = cols.find(c => c.prodName.toLowerCase() === pName.toLowerCase()) || cols[0];
      const bw = (it.unit && it.unit.includes('25')) ? 25 : 29;
      const q = Number(it.cxs) || (Number(it.pesoNF) > 0 ? Number((Number(it.pesoNF) / bw).toFixed(2)) : 0);
      const quote = Number(it.cotacao) || (q > 0 && Number(it.valorVP) > 0 ? Number(it.valorVP) / q : 0);

      if (matchedCol) {
        res.qtd[matchedCol.key] += q;
        res.val[matchedCol.key] = quote;
      }
    }

    return res;
  };

  let excelContent = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, Calibri, sans-serif; font-size: 9pt; color: #000000; margin: 20px; }
        table { border-collapse: collapse; margin-bottom: 5px; font-family: Arial, Calibri, sans-serif; }
        th, td { border: 1px solid #000000; padding: 4px 6px; font-size: 8.5pt; }
        .hdr-grp-qtd { background-color: #70ad47; color: #000000; font-weight: bold; font-size: 13pt; text-align: center; letter-spacing: 1px; border: 1px solid #000000; }
        .hdr-grp-val { background-color: #ffc000; color: #000000; font-weight: bold; font-size: 13pt; text-align: center; letter-spacing: 1px; border: 1px solid #000000; }
        .hdr-grp-fin { background-color: #d9d9d9; color: #000000; font-weight: bold; font-size: 13pt; text-align: center; letter-spacing: 1px; border: 1px solid #000000; }
        .hdr-col { background-color: #ffffff; color: #000000; font-weight: bold; font-size: 8pt; text-align: center; border: 1px solid #000000; }
        .cell-center { text-align: center; mso-number-format: "\\@"; }
        .cell-left { text-align: left; mso-number-format: "\\@"; }
        .cell-right { text-align: right; }
        .cell-qty { mso-number-format: "\\#\\,\\#\\#0\\.00"; text-align: right; }
        .cell-qty-int { mso-number-format: "\\#\\,\\#\\#0"; text-align: right; }
        .cell-price { mso-number-format: "\\0022R\\$\\0022\\\\ \\#\\,\\#\\#0\\.00"; text-align: right; }
        .cell-money { mso-number-format: "\\0022R\\$\\0022\\\\ \\#\\,\\#\\#0\\.00"; text-align: right; font-weight: bold; }
        .row-subtotal { background-color: #ffffff; font-weight: bold; border-top: 2px solid #000000; border-bottom: 2px solid #000000; }
        .grand-volume { text-align: center; font-size: 18pt; font-weight: bold; color: #000000; margin-top: 10px; margin-bottom: 35px; mso-number-format: "\\#\\,\\#\\#0\\.00"; }
      </style>
    </head>
    <body>
  `;

  for (const s of stores) {
    const items = s.itens || [];

    // Detecta se a loja possui Batata com as 5 classificações clássicas
    const isBatata = items.some(it => {
      const p = (it.product || '').toLowerCase();
      const hasBatataWord = p.includes('batata');
      const hasMultiBatataItems = it.items && it.items.some(sub => (sub.product || '').toLowerCase().includes('batata'));
      const hasBatataClassification = p.includes('bolinha') || p.includes('primeira') || p.includes('diversa') || p.includes('florão') || p.includes('florao');
      return hasBatataWord || hasMultiBatataItems || hasBatataClassification;
    });

    let cols = [];
    if (isBatata) {
      cols = [
        { key: 'esp', labelQtd: 'Especial', labelVal: 'Esp.' },
        { key: 'prim', labelQtd: 'Primeira X', labelVal: 'Prim. X' },
        { key: 'div', labelQtd: 'Diversa', labelVal: 'Div.' },
        { key: 'bol', labelQtd: 'Bolinha / Miúda', labelVal: 'Bol. / Miúda' },
        { key: 'flo', labelQtd: 'Florao', labelVal: 'Flo.' }
      ];
    } else {
      const distinctProds = [];
      for (const it of items) {
        if (it.items && Array.isArray(it.items) && it.items.length > 0) {
          it.items.forEach(sub => {
            const cName = cleanProdName(sub.product || it.product || 'Produto');
            if (cName && !distinctProds.includes(cName)) distinctProds.push(cName);
          });
        } else if (it.product && it.product.includes('+')) {
          it.product.split('+').forEach(seg => {
            const cName = cleanProdName(seg.replace(/\s*\([^)]*\)/g, ''));
            if (cName && !distinctProds.includes(cName)) distinctProds.push(cName);
          });
        } else {
          const cName = cleanProdName(it.product || 'Produto');
          if (cName && !distinctProds.includes(cName)) distinctProds.push(cName);
        }
      }
      if (distinctProds.length === 0) distinctProds.push('Produto');

      cols = distinctProds.map((pName, idx) => ({
        key: `prod_${idx}`,
        prodName: pName,
        labelQtd: pName,
        labelVal: pName
      }));
    }

    const numCols = cols.length;
    const totalTableCols = 5 + numCols + numCols + 3;

    const storeColQtd = {};
    cols.forEach(c => { storeColQtd[c.key] = 0; });
    let storeValParticular = 0;
    let storeValAReceber = 0;
    let storeValFunrural = 0;
    let storeValNF = 0;

    excelContent += `
      <!-- Badge Data Superior Esquerdo -->
      <table style="border: none; margin-bottom: 10px;">
        <tr>
          <td colspan="3" style="background-color: #001f3f; color: #ffffff; font-weight: bold; font-size: 13pt; text-align: center; padding: 6px 16px; border: 1px solid #001f3f; font-style: italic; mso-number-format: '\\@';">
            ${hojeFormatado}
          </td>
          <td colspan="${totalTableCols - 3}" style="border: none;"></td>
        </tr>
      </table>

      <!-- Tabela Principal da Loja -->
      <table>
        <thead>
          <!-- Linha de Super-Grupos (QUANTIDADE | VALOR | FINANCEIRO) -->
          <tr style="height: 28px;">
            <th colspan="5" style="border: 1px solid #000000; background-color: #ffffff;"></th>
            <th colspan="${numCols}" class="hdr-grp-qtd">QUANTIDADE</th>
            <th colspan="${numCols}" class="hdr-grp-val">VALOR</th>
            <th colspan="3" class="hdr-grp-fin">FINANCEIRO</th>
          </tr>
          <!-- Linha de Colunas -->
          <tr style="height: 22px;">
            <th class="hdr-col" style="width: 55px;">Part.</th>
            <th class="hdr-col" style="width: 80px;">DATA</th>
            <th class="hdr-col" style="width: 110px;">PRODUTOR</th>
            <th class="hdr-col" style="width: 120px;">DESTINATARIO</th>
            <th class="hdr-col" style="width: 35px;">UF</th>
            ${cols.map(c => `<th class="hdr-col" style="min-width: 65px;">${c.labelQtd}</th>`).join('')}
            ${cols.map(c => `<th class="hdr-col" style="min-width: 65px;">${c.labelVal}</th>`).join('')}
            <th class="hdr-col" style="width: 105px;">Total a Receber</th>
            <th class="hdr-col" style="width: 85px;">FUNRURAL</th>
            <th class="hdr-col" style="width: 105px;">Valor Nfe's</th>
          </tr>
        </thead>
        <tbody>
    `;

    for (const item of items) {
      const c = isBatata ? extractBatataClassifications(item) : extractGenericClassifications(item, cols);
      const partNumber = item.vp ? item.vp.replace(/^VP-?/i, '') : '-';
      const cleanProducer = (item.producer || item.origin || 'PRODUTOR').replace(/\s*\(.*\)/, '').trim().toUpperCase();
      const cleanDest = (s.loja || item.client || 'DESTINATARIO').toUpperCase();
      const uf = item.uf || (s.loja?.includes('RJ') ? 'RJ' : (s.loja?.includes('SP') ? 'SP' : 'MG'));

      let calculatedParticular = 0;
      cols.forEach(col => {
        calculatedParticular += (c.qtd[col.key] || 0) * (c.val[col.key] || 0);
        storeColQtd[col.key] += (c.qtd[col.key] || 0);
      });

      const valParticular = (Number(item.valorVP) > 0) ? Number(item.valorVP) : (calculatedParticular > 0 ? calculatedParticular : (Number(item.valorNF) || 0));
      const valFunrural = Number(item.funrural) || 0;
      const valNF = Number(item.valorNF) || 0;
      // Regra de Cálculo Oficial: Total a Receber = Total Comercial (Particular) - FUNRURAL (calculado sobre a NF)
      const valAReceber = Math.max(0, valParticular - valFunrural);

      storeValParticular += valParticular;
      storeValAReceber += valAReceber;
      storeValFunrural += valFunrural;
      storeValNF += valNF;

      excelContent += `
        <tr style="height: 20px;">
          <td class="cell-center"><b>${partNumber}</b></td>
          <td class="cell-center">${item.dataVP || item.dataNF || '-'}</td>
          <td class="cell-left">${cleanProducer}</td>
          <td class="cell-left">${cleanDest}</td>
          <td class="cell-center">${uf}</td>
          <!-- Quantidades -->
          ${cols.map(col => {
            const qVal = c.qtd[col.key] || 0;
            const isInt = qVal % 1 === 0;
            return `<td class="${isInt ? 'cell-qty-int' : 'cell-qty'}">${formatQty(qVal)}</td>`;
          }).join('')}
          <!-- Preços Unitários -->
          ${cols.map(col => `<td class="cell-price">${formatMoeda(c.val[col.key])}</td>`).join('')}
          <!-- Financeiro -->
          <td class="cell-money">${formatMoedaTotal(valAReceber)}</td>
          <td class="cell-price">${formatMoedaTotal(valFunrural)}</td>
          <td class="cell-price">${formatMoedaTotal(valNF)}</td>
        </tr>
      `;
    }

    const storeTotalVolumes = Object.values(storeColQtd).reduce((a, b) => a + b, 0);
    const isTotalInt = (storeTotalVolumes % 1 === 0);

    // Linha de Subtotal da Loja
    excelContent += `
        <tr class="row-subtotal" style="height: 22px;">
          <td colspan="5" style="border-top: 2px solid #000000; border-bottom: 2px solid #000000;"></td>
          ${cols.map(col => {
            const qVal = storeColQtd[col.key] || 0;
            const isInt = qVal % 1 === 0;
            return `<td class="${isInt ? 'cell-qty-int' : 'cell-qty'}" style="border-top: 2px solid #000000; border-bottom: 2px solid #000000; font-weight: bold;">${formatQty(qVal)}</td>`;
          }).join('')}
          <td colspan="${numCols}" style="border-top: 2px solid #000000; border-bottom: 2px solid #000000;"></td>
          <td class="cell-money" style="border-top: 2px solid #000000; border-bottom: 2px solid #000000;">${formatMoedaTotal(storeValAReceber)}</td>
          <td class="cell-price" style="border-top: 2px solid #000000; border-bottom: 2px solid #000000; font-weight: bold;">${formatMoedaTotal(storeValFunrural)}</td>
          <td class="cell-price" style="border-top: 2px solid #000000; border-bottom: 2px solid #000000; font-weight: bold;">${formatMoedaTotal(storeValNF)}</td>
        </tr>
      </tbody>
      </table>

      <!-- Totalizador Geral de Caixas Destacado no Rodapé -->
      <table style="border: none; width: 100%; margin-top: 10px; margin-bottom: 30px;">
        <tr>
          <td colspan="${totalTableCols}" class="${isTotalInt ? 'cell-qty-int' : 'cell-qty'}" style="border: none; text-align: center; font-size: 18pt; font-weight: bold; color: #000000;">
            ${formatQty(storeTotalVolumes || Number(s.cxsVendidas) || 0)}
          </td>
        </tr>
      </table>
      <br/>
    `;
  }

  excelContent += `</body></html>`;
  return excelContent;
}
