import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  Building2, 
  ChevronDown, 
  ChevronUp, 
  FileSpreadsheet, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Percent, 
  DollarSign, 
  TrendingUp, 
  Scale, 
  BadgePercent, 
  Wallet,
  Calendar,
  Filter,
  X,
  CloudUpload,
  FileDown,
  Settings,
  AlertTriangle,
  Clock,
  Paperclip
} from 'lucide-react';
import { formatCurrency, formatNumber } from '../utils/formatters';
import { api } from '../services/api';

export default function Reports({ setCurrentPage }) {
  const [activeTab, setActiveTab] = useState('geral'); // 'geral' | 'comissoes'
  const [selectedLoja, setSelectedLoja] = useState('ALL');
  const [selectedProducer, setSelectedProducer] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [periodPreset, setPeriodPreset] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState({ stores: [], totalGeral: {}, producers: [] });
  const [expandedLojas, setExpandedLojas] = useState({});

  // Integração com Google Drive / n8n Webhook
  const [savingDrive, setSavingDrive] = useState(false);
  const [driveNotification, setDriveNotification] = useState('');
  const [driveError, setDriveError] = useState('');
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState(() => localStorage.getItem('agrovenda_n8n_drive_webhook') || '');

  const stores = reportData.stores || [];
  const rawTotalGeral = reportData.totalGeral || {
    nfs: 0,
    pedidosVenda: 0,
    pedidosSemNF: 0,
    pesoNF: 0,
    pesoColheita: 0,
    cxsVendidas: 0,
    valorTotalNF: 0,
    funrural: 0,
    totalVendaAReceber: 0,
    liquidoNF: 0,
    totalComissao: 0,
    totalLiquidoProdutor: 0
  };

  // Lista de produtores disponíveis para filtro
  const availableProducers = (reportData.producers && reportData.producers.length > 0)
    ? reportData.producers
    : [...new Set(stores.flatMap(s => (s.itens || []).map(it => it.producer || it.origin)).filter(Boolean))].sort();

  // Filtragem dinâmica por Loja e por Produtor
  const filteredLojas = stores
    .filter(l => selectedLoja === 'ALL' || l.loja === selectedLoja)
    .map(store => {
      if (selectedProducer === 'ALL') return store;
      const matchingItens = (store.itens || []).filter(it => (it.producer === selectedProducer || it.origin === selectedProducer));
      if (matchingItens.length === 0) return null;

      const nfs = matchingItens.filter(it => it.status === 'Faturado' || (it.nf && it.nf !== 'Pendente')).length;
      const pedidosSemNF = matchingItens.length - nfs;
      const pesoNF = matchingItens.reduce((acc, it) => acc + (Number(it.pesoNF) || 0), 0);
      const cxsVendidas = matchingItens.reduce((acc, it) => acc + (Number(it.cxs) || 0), 0);
      const valorTotalNF = matchingItens.reduce((acc, it) => acc + (Number(it.valorNF) || 0), 0);
      const funrural = matchingItens.reduce((acc, it) => acc + (Number(it.funrural) || 0), 0);
      const totalVendaAReceber = matchingItens.reduce((acc, it) => acc + (Number(it.valorVP) || 0), 0);
      const totalComissao = matchingItens.reduce((acc, it) => acc + (Number(it.comissao) || 0), 0);
      const totalLiquidoProdutor = matchingItens.reduce((acc, it) => acc + (Number(it.liquidoProdutor) || 0), 0);
      const valorLiquidado = matchingItens.filter(it => it.paymentStatus === 'Recebido' || it.status === 'Concluído' || it.status === 'Recebido').reduce((acc, it) => acc + (Number(it.valorVP) || 0), 0);
      const valorALiquidar = matchingItens.filter(it => it.paymentStatus !== 'Recebido' && it.status !== 'Concluído' && it.status !== 'Recebido').reduce((acc, it) => acc + (Number(it.valorVP) || 0), 0);

      return {
        ...store,
        pedidosVenda: matchingItens.length,
        nfs,
        pedidosSemNF,
        pesoNF,
        pesoColheita: pesoNF,
        cxsVendidas: Number(cxsVendidas.toFixed(2)),
        valorTotalNF,
        funrural,
        totalVendaAReceber,
        liquidoNF: valorTotalNF - funrural,
        totalComissao,
        totalLiquidoProdutor,
        valorLiquidado,
        valorALiquidar,
        itens: matchingItens
      };
    })
    .filter(Boolean);

  // Métricas Consolidadas de Liquidação Financeira
  const allFilteredItens = filteredLojas.flatMap(s => s.itens || []);
  const valorTotalGeralVP = allFilteredItens.reduce((acc, it) => acc + (Number(it.valorVP) || 0), 0) || rawTotalGeral.totalVendaAReceber;
  const valorTotalLiquidado = allFilteredItens
    .filter(it => it.paymentStatus === 'Recebido' || it.status === 'Concluído' || it.status === 'Recebido')
    .reduce((acc, it) => acc + (Number(it.valorVP) || 0), 0);
  const valorTotalALiquidar = allFilteredItens
    .filter(it => it.paymentStatus !== 'Recebido' && it.status !== 'Concluído' && it.status !== 'Recebido')
    .reduce((acc, it) => acc + (Number(it.valorVP) || 0), 0);
  const totalVPsLiquidadas = allFilteredItens.filter(it => it.paymentStatus === 'Recebido' || it.status === 'Concluído' || it.status === 'Recebido').length;
  const totalVPsALiquidar = allFilteredItens.filter(it => it.paymentStatus !== 'Recebido' && it.status !== 'Concluído' && it.status !== 'Recebido').length;

  // Dynamic totals: recalculates based on filteredLojas
  const currentTotal = (selectedLoja === 'ALL' && selectedProducer === 'ALL')
    ? {
        ...rawTotalGeral,
        valorTotalLiquidado: rawTotalGeral.valorTotalLiquidado ?? valorTotalLiquidado,
        valorTotalALiquidar: rawTotalGeral.valorTotalALiquidar ?? valorTotalALiquidar
      }
    : filteredLojas.reduce((acc, row) => ({
        nfs: acc.nfs + (row.nfs || 0),
        pedidosVenda: acc.pedidosVenda + (row.pedidosVenda || 0),
        pedidosSemNF: acc.pedidosSemNF + (row.pedidosSemNF || 0),
        pesoNF: acc.pesoNF + (row.pesoNF || 0),
        pesoColheita: acc.pesoColheita + (row.pesoColheita || 0),
        cxsVendidas: acc.cxsVendidas + (row.cxsVendidas || 0),
        valorTotalNF: acc.valorTotalNF + (row.valorTotalNF || 0),
        funrural: acc.funrural + (row.funrural || 0),
        totalVendaAReceber: acc.totalVendaAReceber + (row.totalVendaAReceber || 0),
        liquidoNF: acc.liquidoNF + (row.liquidoNF || 0),
        totalComissao: acc.totalComissao + (row.totalComissao || 0),
        totalLiquidoProdutor: acc.totalLiquidoProdutor + (row.totalLiquidoProdutor || 0),
        valorTotalLiquidado: acc.valorTotalLiquidado + (row.valorLiquidado || 0),
        valorTotalALiquidar: acc.valorTotalALiquidar + (row.valorALiquidar || 0)
      }), {
        nfs: 0,
        pedidosVenda: 0,
        pedidosSemNF: 0,
        pesoNF: 0,
        pesoColheita: 0,
        cxsVendidas: 0,
        valorTotalNF: 0,
        funrural: 0,
        totalVendaAReceber: 0,
        liquidoNF: 0,
        totalComissao: 0,
        totalLiquidoProdutor: 0,
        valorTotalLiquidado: 0,
        valorTotalALiquidar: 0
      });

  const saveWebhookConfig = (e) => {
    e.preventDefault();
    localStorage.setItem('agrovenda_n8n_drive_webhook', webhookUrl);
    setShowWebhookModal(false);
    setDriveNotification('URL do Webhook do n8n salva com sucesso!');
    setTimeout(() => setDriveNotification(''), 4000);
  };

  const handleTriggerDrive = async () => {
    const activeUrl = webhookUrl || localStorage.getItem('agrovenda_n8n_drive_webhook');
    if (!activeUrl) {
      setShowWebhookModal(true);
      return;
    }

    setSavingDrive(true);
    setDriveNotification('');
    setDriveError('');
    try {
      const excelHtml = buildExcelContent();
      const res = await api.post('/api/reports/trigger-n8n', {
        webhookUrl: activeUrl,
        startDate: startDate || null,
        endDate: endDate || null,
        selectedLoja: selectedLoja,
        selectedProducer: selectedProducer,
        activeTab: activeTab,
        excelHtml: excelHtml,
        filteredStores: filteredLojas,
        currentTotal: currentTotal
      });

      if (res.success) {
        setDriveNotification('✅ Relatório filtrado enviado e salvo com sucesso no Google Drive!');
      } else {
        setDriveError(res.message || 'Erro ao processar no n8n.');
      }
    } catch (err) {
      console.error(err);
      setDriveError(err.message || 'Falha ao conectar com o n8n. Verifique se o n8n está rodando.');
    } finally {
      setSavingDrive(false);
      setTimeout(() => {
        setDriveNotification('');
        setDriveError('');
      }, 6000);
    }
  };

  // Gerador do HTML/Excel com o layout EXATO do modelo corporativo (Cabeçalhos coloridos, 5 Classificações, Cotações e Financeiro)
  const buildExcelContent = () => {
    const stores = filteredLojas;
    const total = currentTotal;
    const hojeFormatado = new Date().toLocaleDateString('pt-BR');
    const formatMoeda = (v) => {
      const num = Number(v) || 0;
      return num > 0 ? 'R$ ' + num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';
    };
    const formatMoedaTotal = (v) => 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const formatQty = (v) => {
      const num = Math.round(Number(v) || 0);
      return num > 0 ? String(num) : '';
    };

    // Extrai quantidades e cotações de forma universal para QUALQUER produto (Batata, Cenoura, Cebola, Beterraba, etc.)
    const extractClassifications = (it) => {
      const res = {
        qtd: { esp: 0, prim: 0, div: 0, bol: 0, flo: 0 },
        val: { esp: 0, prim: 0, div: 0, bol: 0, flo: 0 }
      };

      const classifyName = (name) => {
        const p = (name || '').toLowerCase();
        // 1. Bolinha / Miúda / Baby (4ª coluna)
        if (p.includes('bolinha') || p.includes('bol') || p.includes('baby') || p.includes('miuda') || p.includes('miúda') || p.includes('pequena') || p.includes('tipo 4') || p.includes('tipo4')) {
          return 'bol';
        }
        // 2. Primeira X / 1X (2ª coluna)
        if (p.includes('primeira') || p.includes('1x') || p.includes('prim') || p.includes('tipo 2') || p.includes('tipo2')) {
          return 'prim';
        }
        // 3. Diversa / Média (3ª coluna)
        if (p.includes('diversa') || p.includes('div') || p.includes('media') || p.includes('média') || p.includes('tipo 3') || p.includes('tipo3') || p.includes('caixa 3') || p.includes('cx3')) {
          return 'div';
        }
        // 4. Florão / Descarte / Refugo (5ª coluna)
        if (p.includes('florao') || p.includes('florão') || p.includes('flo') || p.includes('descarte') || p.includes('refugo') || p.includes('g2') || p.includes('tipo 5') || p.includes('tipo5')) {
          return 'flo';
        }
        // 5. Especial / G1 / Padrão (1ª coluna)
        return 'esp';
      };

      const rawItems = it.items && Array.isArray(it.items) && it.items.length > 0 ? it.items : null;

      if (rawItems && rawItems.length > 1) {
        rawItems.forEach(item => {
          const slot = classifyName(item.product);
          const p = (item.product || '').toLowerCase();
          const bw = Number(item.boxWeightKg) || (p.includes('batata') ? 25 : (p.includes('granel') ? 1 : 29));
          const q = Number(item.quantity) || (Number(item.kg) > 0 && bw > 0 ? Math.round(Number(item.kg) / bw) : 0);
          const quote = Number(item.dailyQuote) || Number(item.price) || (q > 0 && Number(item.valorTotalVP) > 0 ? Number(item.valorTotalVP) / q : (q > 0 && Number(item.total) > 0 ? Number(item.total) / q : Number(it.cotacao) || 0));

          res.qtd[slot] += q;
          if (quote > 0) res.val[slot] = quote;
        });
      } else if (rawItems && rawItems.length === 1) {
        const item = rawItems[0];
        const slot = classifyName(item.product);
        const p = (item.product || '').toLowerCase();
        const bw = Number(item.boxWeightKg) || (p.includes('batata') ? 25 : (p.includes('granel') ? 1 : 29));
        const q = Number(item.quantity) || (Number(item.kg) > 0 && bw > 0 ? Math.round(Number(item.kg) / bw) : (Number(it.cxs) || (Number(it.pesoNF) > 0 ? Math.round(Number(it.pesoNF) / bw) : 0)));
        const quote = Number(item.dailyQuote) || Number(item.price) || (q > 0 && Number(item.valorTotalVP) > 0 ? Number(item.valorTotalVP) / q : (q > 0 && Number(item.total) > 0 ? Number(item.total) / q : Number(it.cotacao) || 0));

        res.qtd[slot] += q;
        if (quote > 0) res.val[slot] = quote;
      } else if (it.product && it.product.includes('+')) {
        // Fallback: divide string composta como "Batata Especial (600 sc) + Batata Miúda Lavada (120 sc)"
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
        // Venda de item único
        const slot = classifyName(it.product);
        const q = Number(it.cxs) || (Number(it.pesoNF) > 0 ? Math.round(Number(it.pesoNF) / 29) : 0);
        const quote = Number(it.cotacao) || 0;
        res.qtd[slot] = q;
        res.val[slot] = quote;
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
          .cell-qty { mso-number-format: "\\#\\,\\#\\#0"; text-align: right; }
          .cell-price { mso-number-format: "\\0022R\\$\\0022\\\\ \\#\\,\\#\\#0\\.00"; text-align: right; }
          .cell-money { mso-number-format: "\\0022R\\$\\0022\\\\ \\#\\,\\#\\#0\\.00"; text-align: right; font-weight: bold; }
          .row-subtotal { background-color: #ffffff; font-weight: bold; border-top: 2px solid #000000; border-bottom: 2px solid #000000; }
          .grand-volume { text-align: center; font-size: 18pt; font-weight: bold; color: #000000; margin-top: 10px; margin-bottom: 35px; mso-number-format: "\\#\\,\\#\\#0"; }
        </style>
      </head>
      <body>
    `;

    for (const s of stores) {
      let storeQtdEsp = 0;
      let storeQtdPrim = 0;
      let storeQtdDiv = 0;
      let storeQtdBol = 0;
      let storeQtdFlo = 0;
      let storeValParticular = 0;
      let storeValAReceber = 0;
      let storeValFunrural = 0;
      let storeValNF = 0;

      const items = s.itens || [];

      excelContent += `
        <!-- Badge Data Superior Esquerdo -->
        <table style="border: none; margin-bottom: 10px;">
          <tr>
            <td colspan="3" style="background-color: #001f3f; color: #ffffff; font-weight: bold; font-size: 13pt; text-align: center; padding: 6px 16px; border: 1px solid #001f3f; font-style: italic; mso-number-format: '\\@';">
              ${hojeFormatado}
            </td>
            <td colspan="16" style="border: none;"></td>
          </tr>
        </table>

        <!-- Tabela Principal da Loja -->
        <table>
          <thead>
            <!-- Linha de Super-Grupos (QUANTIDADE | VALOR | FINANCEIRO) -->
            <tr style="height: 28px;">
              <th colspan="5" style="border: 1px solid #000000; background-color: #ffffff;"></th>
              <th colspan="5" class="hdr-grp-qtd">QUANTIDADE</th>
              <th colspan="5" class="hdr-grp-val">VALOR</th>
              <th colspan="4" class="hdr-grp-fin">FINANCEIRO</th>
            </tr>
            <!-- Linha de Colunas -->
            <tr style="height: 22px;">
              <th class="hdr-col" style="width: 55px;">Part.</th>
              <th class="hdr-col" style="width: 80px;">DATA</th>
              <th class="hdr-col" style="width: 110px;">PRODUTOR</th>
              <th class="hdr-col" style="width: 120px;">DESTINATARIO</th>
              <th class="hdr-col" style="width: 35px;">UF</th>
              <th class="hdr-col" style="width: 60px;">Especial</th>
              <th class="hdr-col" style="width: 70px;">Primeira X</th>
              <th class="hdr-col" style="width: 60px;">Diversa</th>
              <th class="hdr-col" style="width: 80px;">Bolinha / Miúda</th>
              <th class="hdr-col" style="width: 55px;">Florao</th>
              <th class="hdr-col" style="width: 65px;">Esp.</th>
              <th class="hdr-col" style="width: 65px;">Prim. X</th>
              <th class="hdr-col" style="width: 65px;">Div.</th>
              <th class="hdr-col" style="width: 75px;">Bol. / Miúda</th>
              <th class="hdr-col" style="width: 65px;">Flo.</th>
              <th class="hdr-col" style="width: 105px;">Total Particular</th>
              <th class="hdr-col" style="width: 105px;">Total a Receber</th>
              <th class="hdr-col" style="width: 85px;">FUNRURAL</th>
              <th class="hdr-col" style="width: 105px;">Valor Nfe's</th>
            </tr>
          </thead>
          <tbody>
      `;

      for (const item of items) {
        const c = extractClassifications(item);
        const partNumber = item.vp ? item.vp.replace(/^VP-?/i, '') : '-';
        const cleanProducer = (item.producer || item.origin || 'PRODUTOR').replace(/\s*\(.*\)/, '').trim().toUpperCase();
        const cleanDest = (s.loja || item.client || 'DESTINATARIO').toUpperCase();
        const uf = item.uf || (s.loja?.includes('RJ') ? 'RJ' : (s.loja?.includes('SP') ? 'SP' : 'MG'));

        const valParticular = Number(item.valorVP) || 0;
        const valAReceber = Number(item.liquidoProdutor) || Number(item.valorVP) || 0;
        const valFunrural = Number(item.funrural) || 0;
        const valNF = Number(item.valorNF) || 0;

        storeQtdEsp += c.qtd.esp;
        storeQtdPrim += c.qtd.prim;
        storeQtdDiv += c.qtd.div;
        storeQtdBol += c.qtd.bol;
        storeQtdFlo += c.qtd.flo;
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
            <!-- Quantidades em formato numérico nativo para evitar que 1800 vire 1.8 -->
            <td class="cell-qty">${formatQty(c.qtd.esp)}</td>
            <td class="cell-qty">${formatQty(c.qtd.prim)}</td>
            <td class="cell-qty">${formatQty(c.qtd.div)}</td>
            <td class="cell-qty">${formatQty(c.qtd.bol)}</td>
            <td class="cell-qty">${formatQty(c.qtd.flo)}</td>
            <!-- Preços Unitários -->
            <td class="cell-price">${formatMoeda(c.val.esp)}</td>
            <td class="cell-price">${formatMoeda(c.val.prim)}</td>
            <td class="cell-price">${formatMoeda(c.val.div)}</td>
            <td class="cell-price">${formatMoeda(c.val.bol)}</td>
            <td class="cell-price">${formatMoeda(c.val.flo)}</td>
            <!-- Financeiro -->
            <td class="cell-money">${formatMoedaTotal(valParticular)}</td>
            <td class="cell-money">${formatMoedaTotal(valAReceber)}</td>
            <td class="cell-price">${formatMoedaTotal(valFunrural)}</td>
            <td class="cell-price">${formatMoedaTotal(valNF)}</td>
          </tr>
        `;
      }

      const storeTotalVolumes = storeQtdEsp + storeQtdPrim + storeQtdDiv + storeQtdBol + storeQtdFlo;

      // Linha de Subtotal da Loja
      excelContent += `
          <tr class="row-subtotal" style="height: 22px;">
            <td colspan="5" style="border-top: 2px solid #000000; border-bottom: 2px solid #000000;"></td>
            <td class="cell-qty" style="border-top: 2px solid #000000; border-bottom: 2px solid #000000; font-weight: bold;">${formatQty(storeQtdEsp)}</td>
            <td class="cell-qty" style="border-top: 2px solid #000000; border-bottom: 2px solid #000000; font-weight: bold;">${formatQty(storeQtdPrim)}</td>
            <td class="cell-qty" style="border-top: 2px solid #000000; border-bottom: 2px solid #000000; font-weight: bold;">${formatQty(storeQtdDiv)}</td>
            <td class="cell-qty" style="border-top: 2px solid #000000; border-bottom: 2px solid #000000; font-weight: bold;">${formatQty(storeQtdBol)}</td>
            <td class="cell-qty" style="border-top: 2px solid #000000; border-bottom: 2px solid #000000; font-weight: bold;">${formatQty(storeQtdFlo)}</td>
            <td colspan="5" style="border-top: 2px solid #000000; border-bottom: 2px solid #000000;"></td>
            <td class="cell-money" style="border-top: 2px solid #000000; border-bottom: 2px solid #000000;">${formatMoedaTotal(storeValParticular)}</td>
            <td class="cell-money" style="border-top: 2px solid #000000; border-bottom: 2px solid #000000;">${formatMoedaTotal(storeValAReceber)}</td>
            <td class="cell-price" style="border-top: 2px solid #000000; border-bottom: 2px solid #000000; font-weight: bold;">${formatMoedaTotal(storeValFunrural)}</td>
            <td class="cell-price" style="border-top: 2px solid #000000; border-bottom: 2px solid #000000; font-weight: bold;">${formatMoedaTotal(storeValNF)}</td>
          </tr>
        </tbody>
        </table>

        <!-- Totalizador Geral de Caixas Destacado no Rodapé -->
        <table style="border: none; width: 100%; margin-top: 10px; margin-bottom: 30px;">
          <tr>
            <td colspan="19" class="cell-qty" style="border: none; text-align: center; font-size: 18pt; font-weight: bold; color: #000000; mso-number-format: '\\#\\,\\#\\#0';">
              ${formatQty(storeTotalVolumes || Number(s.cxsVendidas) || 0)}
            </td>
          </tr>
        </table>
        <br/>
      `;
    }

    excelContent += `</body></html>`;
    return excelContent;
  };

  // Download direto do Excel no navegador
  const handleDownloadExcelDirect = () => {
    const excelContent = buildExcelContent();
    const safeLoja = selectedLoja === 'ALL' ? 'Geral' : selectedLoja.replace(/[^a-zA-Z0-9]/g, '_');
    const safeProd = selectedProducer === 'ALL' ? '' : `_${selectedProducer.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Relatorio_AgroVenda_${safeLoja}${safeProd}_${new Date().toISOString().split('T')[0]}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const fetchLiveReport = async (sDate = startDate, eDate = endDate, prod = selectedProducer) => {
    const finalStart = (typeof sDate === 'string') ? sDate : (typeof startDate === 'string' ? startDate : '');
    const finalEnd = (typeof eDate === 'string') ? eDate : (typeof endDate === 'string' ? endDate : '');
    const finalProd = (typeof prod === 'string') ? prod : (typeof selectedProducer === 'string' ? selectedProducer : '');
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (finalStart) params.append('startDate', finalStart);
      if (finalEnd) params.append('endDate', finalEnd);
      if (finalProd && finalProd !== 'ALL') params.append('producer', finalProd);
      const url = `/api/reports/stores-summary${params.toString() ? `?${params.toString()}` : ''}`;
      
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setReportData(data);
        // Expand all stores by default
        const initExpand = {};
        (data.stores || []).forEach(s => {
          initExpand[s.loja] = true;
        });
        setExpandedLojas(initExpand);
      }
    } catch (err) {
      console.error('Erro ao buscar relatório em tempo real do MongoDB:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyPreset = (preset) => {
    setPeriodPreset(preset);
    const now = new Date();
    let s = '';
    let e = '';

    if (preset === 'THIS_MONTH') {
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      s = `${y}-${m}-01`;
      const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
      e = `${y}-${m}-${String(lastDay).padStart(2, '0')}`;
    } else if (preset === 'LAST_30') {
      const past = new Date();
      past.setDate(now.getDate() - 30);
      s = past.toISOString().split('T')[0];
      e = now.toISOString().split('T')[0];
    } else if (preset === 'SAFRA_JUL26') {
      s = '2026-07-01';
      e = '2026-07-31';
    } else if (preset === 'SAFRA_AGO26') {
      s = '2026-08-01';
      e = '2026-08-31';
    } else {
      // ALL
      s = '';
      e = '';
    }

    setStartDate(s);
    setEndDate(e);
    fetchLiveReport(s, e);
  };

  const handleFilterDateSubmit = (e) => {
    if (e) e.preventDefault();
    setPeriodPreset('CUSTOM');
    fetchLiveReport(startDate, endDate);
  };

  const handleClearPeriod = () => {
    setPeriodPreset('ALL');
    setStartDate('');
    setEndDate('');
    fetchLiveReport('', '');
  };

  useEffect(() => {
    fetchLiveReport();
  }, []);

  const toggleExpand = (lojaName) => {
    setExpandedLojas(prev => ({
      ...prev,
      [lojaName]: !prev[lojaName]
    }));
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-[1700px] mx-auto space-y-6">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <div className="text-xs font-bold text-[#091b2e] tracking-wider uppercase flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-[#df7b1b]" />
            <span>AGROVENDA — RELATÓRIOS E FECHAMENTOS (BASE REAL MONGODB)</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 mt-1">
            {activeTab === 'geral' ? 'Relatório Geral — NFs e VPs por Loja' : 'Relatório Completo — Fechamento com Comissões'}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Agregação dinâmica em tempo real das {currentTotal.pedidosVenda || 0} vendas {selectedLoja !== 'ALL' ? `de ${selectedLoja}` : ''} {selectedProducer !== 'ALL' ? `• Produtor: ${selectedProducer}` : ''} {selectedLoja === 'ALL' && selectedProducer === 'ALL' ? 'cadastradas no banco de dados' : ''}.
          </p>
          {(startDate || endDate) && (
            <div className="hidden print:block text-xs font-bold text-gray-800 mt-1">
              Período do Relatório: {startDate ? startDate.split('-').reverse().join('/') : 'Início'} até {endDate ? endDate.split('-').reverse().join('/') : 'Atual'}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 print:hidden">
          {/* Seletor de Loja */}
          <select
            value={selectedLoja}
            onChange={(e) => setSelectedLoja(e.target.value)}
            className="bg-white border border-gray-300 text-xs rounded-lg px-3 py-2 outline-none font-semibold text-gray-800 shadow-sm"
          >
            <option value="ALL">Todas as {stores.length} Lojas ({rawTotalGeral.pedidosVenda || 0} Pedidos)</option>
            {stores.map(l => (
              <option key={l.loja} value={l.loja}>{l.loja} ({l.pedidosVenda} Pedidos)</option>
            ))}
          </select>

          {/* Seletor de Produtor */}
          <select
            value={selectedProducer}
            onChange={(e) => setSelectedProducer(e.target.value)}
            className="bg-white border border-gray-300 text-xs rounded-lg px-3 py-2 outline-none font-semibold text-gray-800 shadow-sm"
          >
            <option value="ALL">Todos os Produtores ({availableProducers.length})</option>
            {availableProducers.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          <button
            onClick={() => fetchLiveReport(startDate, endDate)}
            className="bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 text-xs font-bold px-3 py-2 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Atualizar dados do MongoDB"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>

          {/* Botão Baixar Excel Direto */}
          <button
            onClick={handleDownloadExcelDirect}
            className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3.5 py-2 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Baixar planilha formatada para Excel (.xls)"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Baixar Excel</span>
          </button>

          {/* Botão Salvar no Google Drive via n8n */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleTriggerDrive}
              disabled={savingDrive}
              className="bg-[#0e3b5e] hover:bg-[#134d7a] disabled:opacity-50 text-white text-xs font-bold px-3.5 py-2 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Disparar fluxo do n8n para salvar planilha formatada no Google Drive"
            >
              <CloudUpload className={`w-3.5 h-3.5 ${savingDrive ? 'animate-bounce' : ''}`} />
              <span>{savingDrive ? 'Enviando ao Drive...' : 'Salvar no Drive'}</span>
            </button>
            <button
              onClick={() => setShowWebhookModal(true)}
              className="p-2 border border-gray-300 bg-white hover:bg-gray-100 text-gray-600 rounded-lg shadow-sm cursor-pointer"
              title="Configurar Webhook do n8n"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={() => window.print()}
            className="hidden sm:flex bg-[#091b2e] hover:bg-[#132c4a] text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm items-center gap-2 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Imprimir / PDF
          </button>
        </div>
      </div>

      {/* Notificações do Google Drive / n8n */}
      {driveNotification && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-xl flex items-center justify-between text-xs font-bold shadow-xs animate-fadeIn print:hidden">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{driveNotification}</span>
          </div>
          <button onClick={() => setDriveNotification('')} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {driveError && (
        <div className="bg-red-50 border border-red-300 text-red-900 px-4 py-3 rounded-xl flex items-center justify-between text-xs font-bold shadow-xs animate-fadeIn print:hidden">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{driveError}</span>
          </div>
          <button onClick={() => setDriveError('')} className="text-red-700 hover:text-red-900 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Modal de Configuração do Webhook do n8n */}
      {showWebhookModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2 text-gray-900">
                <Settings className="w-5 h-5 text-[#df7b1b]" />
                <h3 className="text-base font-bold">Configurar Webhook do n8n</h3>
              </div>
              <button onClick={() => setShowWebhookModal(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={saveWebhookConfig} className="space-y-3">
              <p className="text-xs text-gray-600">
                Insira a URL do Webhook do seu n8n para que o botão <b>"Salvar no Drive"</b> envie os relatórios automaticamente:
              </p>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  URL do Webhook do n8n (POST):
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://n8n.seusite.com/webhook/salvar-relatorio-drive"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#091b2e] font-mono"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-[11px] text-blue-900 space-y-1">
                <span className="font-bold block">💡 Dica de Integração:</span>
                <span>O sistema enviará para o n8n o período filtrado, a loja e o usuário solicitante em formato JSON via POST.</span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowWebhookModal(false)}
                  className="px-4 py-2 text-xs text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-[#091b2e] hover:bg-[#132c4a] text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer transition-all"
                >
                  Salvar Configuração
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Barra de Filtro de Período (Oculta na Impressão) */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4 print:hidden">
        
        {/* Form de Seleção de Datas */}
        <form onSubmit={handleFilterDateSubmit} className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-800">
            <Calendar className="w-4 h-4 text-[#df7b1b]" />
            <span>Período do Relatório:</span>
          </div>

          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1.5">
            <span className="text-[11px] font-semibold text-gray-500">De:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-xs font-bold text-gray-800 outline-none cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1.5">
            <span className="text-[11px] font-semibold text-gray-500">Até:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-xs font-bold text-gray-800 outline-none cursor-pointer"
            />
          </div>

          <button
            type="submit"
            className="bg-[#091b2e] hover:bg-[#132c4a] text-white text-xs font-bold px-3.5 py-2 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filtrar Período</span>
          </button>

          {(startDate || endDate) && (
            <button
              type="button"
              onClick={handleClearPeriod}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold px-2.5 py-2 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
              title="Limpar filtro de período"
            >
              <X className="w-3.5 h-3.5 text-gray-500" />
              <span>Ver Todo o Período</span>
            </button>
          )}
        </form>

        {/* Atalhos Rápidos de Safra / Período */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-semibold text-gray-400 mr-1">Atalhos:</span>
          
          <button
            type="button"
            onClick={() => handleApplyPreset('ALL')}
            className={`text-xs font-bold px-2.5 py-1.5 rounded-lg border transition-colors ${
              periodPreset === 'ALL' && !startDate && !endDate
                ? 'bg-emerald-100 text-emerald-950 border-emerald-300 font-black'
                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
            }`}
          >
            Todo o Histórico
          </button>

          <button
            type="button"
            onClick={() => handleApplyPreset('THIS_MONTH')}
            className={`text-xs font-bold px-2.5 py-1.5 rounded-lg border transition-colors ${
              periodPreset === 'THIS_MONTH'
                ? 'bg-emerald-100 text-emerald-950 border-emerald-300 font-black'
                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
            }`}
          >
            Mês Atual
          </button>

          <button
            type="button"
            onClick={() => handleApplyPreset('SAFRA_JUL26')}
            className={`text-xs font-bold px-2.5 py-1.5 rounded-lg border transition-colors ${
              periodPreset === 'SAFRA_JUL26'
                ? 'bg-emerald-100 text-emerald-950 border-emerald-300 font-black'
                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
            }`}
          >
            Julho/2026
          </button>

          <button
            type="button"
            onClick={() => handleApplyPreset('SAFRA_AGO26')}
            className={`text-xs font-bold px-2.5 py-1.5 rounded-lg border transition-colors ${
              periodPreset === 'SAFRA_AGO26'
                ? 'bg-emerald-100 text-emerald-950 border-emerald-300 font-black'
                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
            }`}
          >
            Agosto/2026
          </button>
        </div>

      </div>

      {/* Cards de Resumo Financeiro & Status de Liquidação */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 print:grid-cols-3">
        {/* Card Valor Total */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-blue-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider block">
              Valor Total Comercial (VP)
            </span>
            <span className="text-xl sm:text-2xl font-black text-blue-950 mt-1 block">
              {formatCurrency(valorTotalGeralVP)}
            </span>
            <span className="text-[10px] text-gray-500 font-medium">
              {allFilteredItens.length} vendas (VPs) no filtro
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-800 shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Card Valor Liquidado */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-emerald-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
              Valor Total Liquidado
            </span>
            <span className="text-xl sm:text-2xl font-black text-emerald-800 mt-1 block">
              {formatCurrency(valorTotalLiquidado)}
            </span>
            <span className="text-[10px] text-emerald-700 font-medium">
              {totalVPsLiquidadas} VPs recebidas / quitadas
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Card Valor a Liquidar */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-amber-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
              Valor a Liquidar (Em Aberto)
            </span>
            <span className="text-xl sm:text-2xl font-black text-amber-900 mt-1 block">
              {formatCurrency(valorTotalALiquidar)}
            </span>
            <span className="text-[10px] text-amber-700 font-medium">
              {totalVPsALiquidar} VPs pendentes de recebimento
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-1 print:hidden">
        <button
          onClick={() => setActiveTab('geral')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-t-lg font-bold text-xs transition-all border-b-2 ${
            activeTab === 'geral'
              ? 'border-emerald-700 text-emerald-950 bg-white shadow-sm'
              : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100/60'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
          <span>Relatório Geral (NFs e VPs por Loja)</span>
        </button>

        <button
          onClick={() => setActiveTab('comissoes')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-t-lg font-bold text-xs transition-all border-b-2 ${
            activeTab === 'comissoes'
              ? 'border-blue-700 text-blue-950 bg-white shadow-sm'
              : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100/60'
          }`}
        >
          <BadgePercent className="w-4 h-4 text-blue-700" />
          <span>Relatório Completo (com Comissões & Fechamento)</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* ABA 1: RELATÓRIO GERAL (PADRÃO PLANILHA)                                   */}
      {/* ========================================================================= */}
      {activeTab === 'geral' && (
        <div className="space-y-6">
          {/* Tabela Principal: Resumo Geral por Loja (Folha 1 na Impressão) */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden space-y-3 page-break-after print:shadow-none print:border-none">
            <div className="bg-[#1b4363] text-white px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-sky-200" />
                <span className="text-xs font-black uppercase tracking-wider">
                  ResumoLojas — Relatório geral - NFs e VPs por loja
                </span>
              </div>
              <span className="text-[11px] font-semibold text-sky-100 bg-sky-900/40 px-2.5 py-0.5 rounded">
                Fórmulas 100% Conciliadas em Tempo Real
              </span>
            </div>

            <div className="overflow-x-auto p-4 pt-1">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#245b85] text-white font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Loja</th>
                    <th className="py-2.5 px-2 text-center">NFs</th>
                    <th className="py-2.5 px-2 text-center">Pedidos Venda</th>
                    <th className="py-2.5 px-2 text-center">Pedidos sem NF</th>
                    <th className="py-2.5 px-3 text-right">Peso NF (kg)</th>
                    <th className="py-2.5 px-3 text-right">Peso total baseado na colheita (kg)</th>
                    <th className="py-2.5 px-3 text-right">CXS Vendidas</th>
                    <th className="py-2.5 px-3 text-right">Valor Total NF (R$)</th>
                    <th className="py-2.5 px-3 text-right">FUNRURAL (R$)</th>
                    <th className="py-2.5 px-3 text-right bg-[#1a4364]">Total Comercial (VP)</th>
                    <th className="py-2.5 px-3 text-right bg-[#166534]">Valor Liquidado (R$)</th>
                    <th className="py-2.5 px-3 text-right bg-[#b45309]">Valor a Liquidar (R$)</th>
                    <th className="py-2.5 px-3 text-right bg-[#143753]">Líquido NF (R$)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredLojas.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-3 font-bold text-gray-900 flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-[#245b85]" />
                        {row.loja}
                      </td>
                      <td className="py-3 px-2 text-center font-medium text-gray-700">{row.nfs}</td>
                      <td className="py-3 px-2 text-center font-bold text-gray-900">{row.pedidosVenda}</td>
                      <td className="py-3 px-2 text-center text-amber-700 font-medium">
                        {row.pedidosSemNF > 0 ? (
                          <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded text-[10px] font-bold">
                            {row.pedidosSemNF}
                          </span>
                        ) : (
                          '0'
                        )}
                      </td>
                      <td className="py-3 px-3 text-right text-gray-700 font-medium">{formatNumber(row.pesoNF, 2)}</td>
                      <td className="py-3 px-3 text-right font-bold text-gray-900">{formatNumber(row.pesoColheita, 2)}</td>
                      <td className="py-3 px-3 text-right font-semibold text-gray-800">{formatNumber(row.cxsVendidas, 2)}</td>
                      <td className="py-3 px-3 text-right font-bold text-gray-900">{formatCurrency(row.valorTotalNF)}</td>
                      <td className="py-3 px-3 text-right text-red-600 font-medium">-{formatCurrency(row.funrural)}</td>
                      <td className="py-3 px-3 text-right font-black text-[#1a4364] bg-sky-50/40">
                        {formatCurrency(row.totalVendaAReceber)}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-emerald-800 bg-emerald-50/60">
                        {formatCurrency(row.valorLiquidado)}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-amber-900 bg-amber-50/60">
                        {formatCurrency(row.valorALiquidar)}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-emerald-950 bg-emerald-50/40">
                        {formatCurrency(row.liquidoNF)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-[#bfe2a5] font-black text-xs text-gray-950 border-t-2 border-emerald-800">
                  <tr>
                    <td className="py-3 px-3 uppercase font-black text-gray-950">
                      {selectedLoja === 'ALL' ? 'TOTAL GERAL' : `TOTAL (${selectedLoja})`}
                    </td>
                    <td className="py-3 px-2 text-center font-black">{currentTotal.nfs}</td>
                    <td className="py-3 px-2 text-center font-black">{currentTotal.pedidosVenda}</td>
                    <td className="py-3 px-2 text-center font-black text-amber-950">{currentTotal.pedidosSemNF}</td>
                    <td className="py-3 px-3 text-right font-black">{formatNumber(currentTotal.pesoNF, 2)}</td>
                    <td className="py-3 px-3 text-right font-black bg-[#9dd07b]">{formatNumber(currentTotal.pesoColheita, 2)}</td>
                    <td className="py-3 px-3 text-right font-black">{formatNumber(currentTotal.cxsVendidas, 2)}</td>
                    <td className="py-3 px-3 text-right font-black">{formatCurrency(currentTotal.valorTotalNF)}</td>
                    <td className="py-3 px-3 text-right font-black text-red-900">-{formatCurrency(currentTotal.funrural)}</td>
                    <td className="py-3 px-3 text-right font-black text-green-950 bg-[#83c457]">
                      {formatCurrency(currentTotal.totalVendaAReceber)}
                    </td>
                    <td className="py-3 px-3 text-right font-black text-emerald-950 bg-[#a7f3d0]">
                      {formatCurrency(currentTotal.valorTotalLiquidado)}
                    </td>
                    <td className="py-3 px-3 text-right font-black text-amber-950 bg-[#fde68a]">
                      {formatCurrency(currentTotal.valorTotalALiquidar)}
                    </td>
                    <td className="py-3 px-3 text-right font-black text-emerald-950 bg-[#aedb8e]">
                      {formatCurrency(currentTotal.liquidoNF)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Seção 2: Detalhamento Individual de Cada Loja (Folhas Seguintes) */}
          <div className="space-y-4 pt-2 print:space-y-6">
            <h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider flex items-center gap-2 print:text-xs">
              <span>Detalhamento Individual das Vendas por Loja (VPs)</span>
            </h2>

            {filteredLojas.map((lojaGroup, lIdx) => {
              const isExpanded = expandedLojas[lojaGroup.loja];
              return (
                <div key={lIdx} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden page-break-avoid print:border print:border-gray-300 print:shadow-none print:mb-4">
                  <div 
                    onClick={() => toggleExpand(lojaGroup.loja)}
                    className="bg-gray-50 hover:bg-gray-100/80 p-4 flex items-center justify-between cursor-pointer border-b border-gray-200 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Building2 className="w-4 h-4 text-[#173e27]" />
                      <span className="text-xs font-black text-gray-900 uppercase tracking-wide">
                        {lojaGroup.loja}
                      </span>
                      <span className="text-[11px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                        {lojaGroup.itens?.length || 0} VPs
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-gray-500">
                        NF: <strong className="text-gray-900">{formatCurrency(lojaGroup.valorTotalNF)}</strong>
                      </span>
                      <span className="text-gray-500">
                        VP: <strong className="text-blue-900">{formatCurrency(lojaGroup.totalVendaAReceber)}</strong>
                      </span>
                      <span className="text-gray-500">
                        Liquidado: <strong className="text-emerald-800">{formatCurrency(lojaGroup.valorLiquidado)}</strong>
                      </span>
                      <span className="text-gray-500">
                        A Liquidar: <strong className="text-amber-800">{formatCurrency(lojaGroup.valorALiquidar)}</strong>
                      </span>
                      <span className="print:hidden">
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                      </span>
                    </div>
                  </div>

                  <div className={`overflow-x-auto p-4 pt-2 ${isExpanded ? 'block' : 'hidden print:block'}`}>
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-100 text-gray-700 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="py-2 px-3">Nº VP</th>
                          <th className="py-2 px-2">Data VP</th>
                          <th className="py-2 px-3">Nº NF</th>
                          <th className="py-2 px-2">Data NF</th>
                          <th className="py-2 px-3 text-right">Peso NF (kg)</th>
                          <th className="py-2 px-3 text-right">Peso Colheita (kg)</th>
                          <th className="py-2 px-3 text-right">Volumes / Caixas</th>
                          <th className="py-2 px-3 text-right">Preço/kg NF</th>
                          <th className="py-2 px-3 text-right">Valor Total NF</th>
                          <th className="py-2 px-3 text-right">FUNRURAL (1,63%)</th>
                          <th className="py-2 px-3 text-right">Cotação Dia</th>
                          <th className="py-2 px-3 text-right">Valor Total VP</th>
                          <th className="py-2 px-3 text-right bg-emerald-50 text-emerald-950 font-bold">Valor Liquidado</th>
                          <th className="py-2 px-3 text-right bg-amber-50 text-amber-950 font-bold">Valor a Liquidar</th>
                          <th className="py-2 px-3 text-right">Líquido da NF</th>
                          <th className="py-2 px-3 text-center">Vencimento</th>
                          <th className="py-2 px-3 text-center">Status</th>
                          <th className="py-2 px-3 text-center">Anexo / Imagem</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {lojaGroup.itens?.map((it, rIdx) => {
                          const isSettled = it.paymentStatus === 'Recebido' || it.status === 'Concluído' || it.status === 'Recebido';
                          const itLiquidado = isSettled ? (Number(it.valorVP) || 0) : 0;
                          const itALiquidar = !isSettled ? (Number(it.valorVP) || 0) : 0;
                          return (
                            <tr key={rIdx} className="hover:bg-gray-50/70 transition-colors">
                              <td className="py-2 px-3">
                                <div className="font-bold text-[#173e27]">{it.vp}</div>
                                <div className="text-[10px] text-gray-600 font-semibold truncate max-w-[220px]" title={it.product}>
                                  {it.product}
                                </div>
                                <div className="text-[10px] text-blue-800 font-medium truncate max-w-[220px]" title={`Produtor: ${it.producer || it.origin}`}>
                                  🌾 {it.producer || it.origin || 'Produtor Rural'}
                                </div>
                              </td>
                              <td className="py-2 px-2 text-gray-600">{it.dataVP}</td>
                              <td className="py-2 px-3 font-semibold text-gray-800">{it.nf}</td>
                              <td className="py-2 px-2 text-gray-600">{it.dataNF}</td>
                              <td className="py-2 px-3 text-right text-gray-600">{formatNumber(it.pesoNF, 0)} kg</td>
                              <td className="py-2 px-3 text-right font-bold text-gray-900">{formatNumber(it.pesoColheita, 0)} kg</td>
                              <td className="py-2 px-3 text-right font-bold text-gray-900">
                                {formatNumber(it.cxs, 2)} {it.unit?.toLowerCase().includes('saca') || it.product?.toLowerCase().includes('batata') ? 'sc' : 'cx'}
                              </td>
                              <td className="py-2 px-3 text-right text-gray-700">{it.precoKg > 0 ? `R$ ${it.precoKg.toFixed(2)}` : '-'}</td>
                              <td className="py-2 px-3 text-right font-bold text-gray-900">{formatCurrency(it.valorNF)}</td>
                              <td className="py-2 px-3 text-right text-red-600">-{formatCurrency(it.funrural)}</td>
                              <td className="py-2 px-3 text-right font-semibold text-blue-900">
                                R$ {it.cotacao.toFixed(2)}/{it.cotacao <= 10.0 ? 'kg' : (it.unit?.includes('Sacas') ? 'sc' : 'cx')}
                              </td>
                              <td className="py-2 px-3 text-right font-black text-blue-950 bg-blue-50/30">{formatCurrency(it.valorVP)}</td>
                              <td className="py-2 px-3 text-right font-black text-emerald-800 bg-emerald-50/40">
                                {itLiquidado > 0 ? formatCurrency(itLiquidado) : <span className="text-gray-400 font-normal">-</span>}
                              </td>
                              <td className="py-2 px-3 text-right font-black text-amber-900 bg-amber-50/40">
                                {itALiquidar > 0 ? formatCurrency(itALiquidar) : <span className="text-gray-400 font-normal">-</span>}
                              </td>
                              <td className="py-2 px-3 text-right font-black text-emerald-950 bg-emerald-50/30">{formatCurrency(it.liquido)}</td>
                              <td className="py-2 px-3 text-center text-gray-600">{it.venc}</td>
                              <td className="py-2 px-3 text-center">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  isSettled ? 'bg-emerald-100 text-emerald-800' : (it.status === 'Faturado' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-900')
                                }`}>
                                  {isSettled ? 'Liquidado' : it.status}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-center">
                                {it.evidenceFile && it.evidenceFile !== '-' ? (
                                  <a
                                    href={`/uploads/${it.rawEvidenceFile || it.evidenceFile}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded transition-colors max-w-[130px] truncate"
                                    title={it.evidenceFile}
                                  >
                                    <Paperclip className="w-3 h-3 text-blue-600 shrink-0" />
                                    <span className="truncate">{it.evidenceFile}</span>
                                  </a>
                                ) : (
                                  <span className="text-gray-400 text-[10px]">-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-gray-100 font-bold text-xs border-t-2 border-gray-300">
                        <tr>
                          <td colSpan={4} className="py-2.5 px-3 uppercase text-gray-700 font-extrabold">
                            TOTAL {lojaGroup.loja.split(' ')[0]}
                          </td>
                          <td className="py-2.5 px-3 text-right text-gray-700 font-bold">{formatNumber(lojaGroup.pesoNF, 2)}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-gray-900">{formatNumber(lojaGroup.pesoColheita, 2)}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-gray-900">{formatNumber(lojaGroup.cxsVendidas, 2)}</td>
                          <td className="py-2.5 px-3 text-right text-gray-400">-</td>
                          <td className="py-2.5 px-3 text-right font-black text-gray-900">{formatCurrency(lojaGroup.valorTotalNF)}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-red-600">-{formatCurrency(lojaGroup.funrural)}</td>
                          <td className="py-2.5 px-3 text-right text-gray-400">-</td>
                          <td className="py-2.5 px-3 text-right font-black text-blue-900 bg-blue-100/60">{formatCurrency(lojaGroup.totalVendaAReceber)}</td>
                          <td className="py-2.5 px-3 text-right font-black text-emerald-950 bg-emerald-100/60">{formatCurrency(lojaGroup.valorLiquidado)}</td>
                          <td className="py-2.5 px-3 text-right font-black text-amber-950 bg-amber-100/60">{formatCurrency(lojaGroup.valorALiquidar)}</td>
                          <td className="py-2.5 px-3 text-right font-black text-emerald-950 bg-emerald-100/60">{formatCurrency(lojaGroup.liquidoNF)}</td>
                          <td colSpan={3} className="py-2.5 px-3 text-center text-gray-600 font-bold text-[10px]">
                            {lojaGroup.itens?.filter(it => it.paymentStatus === 'Recebido' || it.status === 'Concluído' || it.status === 'Recebido').length} / {lojaGroup.itens?.length || 0} Pagos
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: RELATÓRIO COMPLETO COM COMISSÕES & FECHAMENTO                       */}
      {/* ========================================================================= */}
      {activeTab === 'comissoes' && (
        <div className="space-y-6">
          
          {/* Cards de Resumo Consolidado com Comissões */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-1">
              <span className="text-gray-500 text-xs font-bold uppercase block">Total Comercial (VP)</span>
              <span className="text-2xl font-black text-blue-950">{formatCurrency(currentTotal.totalVendaAReceber)}</span>
              <span className="text-[11px] text-gray-400 block">{currentTotal.pedidosVenda} Pedidos de Venda</span>
            </div>

            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-1">
              <span className="text-gray-500 text-xs font-bold uppercase block">Total Faturado NF</span>
              <span className="text-2xl font-black text-gray-900">{formatCurrency(currentTotal.valorTotalNF)}</span>
              <span className="text-[11px] text-gray-400 block">{currentTotal.nfs} Notas Emitidas</span>
            </div>

            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-1">
              <span className="text-gray-500 text-xs font-bold uppercase block">(-) FUNRURAL (1,63%)</span>
              <span className="text-2xl font-black text-red-600">-{formatCurrency(currentTotal.funrural)}</span>
              <span className="text-[11px] text-gray-400 block">Dedução tributária</span>
            </div>

            <div className="bg-white p-5 rounded-xl border border-blue-200 bg-blue-50/20 shadow-sm space-y-1">
              <span className="text-blue-800 text-xs font-bold uppercase block">Comissão AgroVenda (3%)</span>
              <span className="text-2xl font-black text-blue-900">{formatCurrency(currentTotal.totalComissao)}</span>
              <span className="text-[11px] text-blue-600 block font-semibold">Taxa média 3,0%</span>
            </div>

            <div className="bg-white p-5 rounded-xl border border-emerald-200 bg-emerald-50/30 shadow-sm space-y-1">
              <span className="text-emerald-800 text-xs font-bold uppercase block">(=) Líquido Produtor</span>
              <span className="text-2xl font-black text-emerald-950">{formatCurrency(currentTotal.totalLiquidoProdutor)}</span>
              <span className="text-[11px] text-emerald-700 block font-semibold">Saldo a repassar</span>
            </div>

          </div>

          {/* Matriz Geral por Loja com Comissões (Folha 1 na Impressão) */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden space-y-3 page-break-after print:shadow-none print:border-none">
            <div className="bg-[#173e27] text-white px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BadgePercent className="w-4 h-4 text-emerald-200" />
                <span className="text-xs font-black uppercase tracking-wider">
                  Fechamento por Loja com Comissões & Repasse Líquido
                </span>
              </div>
              <span className="text-[11px] font-semibold text-emerald-100 bg-emerald-900/40 px-2.5 py-0.5 rounded">
                Base Comercial VP + Comissão 3,0%
              </span>
            </div>

            <div className="overflow-x-auto p-4 pt-1">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#1e5234] text-white font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Loja / Comprador</th>
                    <th className="py-2.5 px-2 text-center">NFs</th>
                    <th className="py-2.5 px-2 text-center">VPs</th>
                    <th className="py-2.5 px-3 text-right">CXS (29kg)</th>
                    <th className="py-2.5 px-3 text-right">Valor Total NF</th>
                    <th className="py-2.5 px-3 text-right">FUNRURAL</th>
                    <th className="py-2.5 px-3 text-right bg-[#173e27]">Total Comercial (VP)</th>
                    <th className="py-2.5 px-3 text-right bg-[#14532d]">Valor Liquidado (R$)</th>
                    <th className="py-2.5 px-3 text-right bg-[#92400e]">Valor a Liquidar (R$)</th>
                    <th className="py-2.5 px-2 text-center">Taxa (%)</th>
                    <th className="py-2.5 px-3 text-right bg-blue-900/80">Comissão (R$)</th>
                    <th className="py-2.5 px-3 text-right bg-emerald-900/90">Líquido Produtor (R$)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredLojas.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-3 font-bold text-gray-900 flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-emerald-800" />
                        {row.loja}
                      </td>
                      <td className="py-3 px-2 text-center font-medium text-gray-700">{row.nfs}</td>
                      <td className="py-3 px-2 text-center font-bold text-gray-900">{row.pedidosVenda}</td>
                      <td className="py-3 px-3 text-right font-semibold text-gray-800">{formatNumber(row.cxsVendidas, 2)}</td>
                      <td className="py-3 px-3 text-right font-bold text-gray-900">{formatCurrency(row.valorTotalNF)}</td>
                      <td className="py-3 px-3 text-right text-red-600 font-medium">-{formatCurrency(row.funrural)}</td>
                      <td className="py-3 px-3 text-right font-black text-blue-950 bg-blue-50/40">
                        {formatCurrency(row.totalVendaAReceber)}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-emerald-800 bg-emerald-50/50">
                        {formatCurrency(row.valorLiquidado)}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-amber-900 bg-amber-50/50">
                        {formatCurrency(row.valorALiquidar)}
                      </td>
                      <td className="py-3 px-2 text-center font-bold text-blue-800">3,0%</td>
                      <td className="py-3 px-3 text-right font-black text-blue-900 bg-blue-50/60">
                        {formatCurrency(row.totalComissao)}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-emerald-950 bg-emerald-50/60">
                        {formatCurrency(row.totalLiquidoProdutor)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-[#bfe2a5] font-black text-xs text-gray-950 border-t-2 border-emerald-800">
                  <tr>
                    <td className="py-3 px-3 uppercase font-black text-gray-950">
                      {selectedLoja === 'ALL' ? 'TOTAL GERAL' : `TOTAL (${selectedLoja})`}
                    </td>
                    <td className="py-3 px-2 text-center font-black">{currentTotal.nfs}</td>
                    <td className="py-3 px-2 text-center font-black">{currentTotal.pedidosVenda}</td>
                    <td className="py-3 px-3 text-right font-black">{formatNumber(currentTotal.cxsVendidas, 2)}</td>
                    <td className="py-3 px-3 text-right font-black">{formatCurrency(currentTotal.valorTotalNF)}</td>
                    <td className="py-3 px-3 text-right font-black text-red-900">-{formatCurrency(currentTotal.funrural)}</td>
                    <td className="py-3 px-3 text-right font-black text-blue-950 bg-sky-200">
                      {formatCurrency(currentTotal.totalVendaAReceber)}
                    </td>
                    <td className="py-3 px-3 text-right font-black text-emerald-950 bg-[#a7f3d0]">
                      {formatCurrency(currentTotal.valorTotalLiquidado)}
                    </td>
                    <td className="py-3 px-3 text-right font-black text-amber-950 bg-[#fde68a]">
                      {formatCurrency(currentTotal.valorTotalALiquidar)}
                    </td>
                    <td className="py-3 px-2 text-center font-black">3,0%</td>
                    <td className="py-3 px-3 text-right font-black text-blue-950 bg-blue-200">
                      {formatCurrency(currentTotal.totalComissao)}
                    </td>
                    <td className="py-3 px-3 text-right font-black text-emerald-950 bg-emerald-200">
                      {formatCurrency(currentTotal.totalLiquidoProdutor)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Detalhamento Individual com Comissões por VP (Folhas Seguintes) */}
          <div className="space-y-4 pt-2 print:space-y-6">
            <h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider flex items-center gap-2 print:text-xs">
              <span>Detalhamento de Comissões por Venda / Loja (VPs)</span>
            </h2>

            {filteredLojas.map((lojaGroup, lIdx) => {
              const isExpanded = expandedLojas[lojaGroup.loja];
              return (
                <div key={lIdx} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden page-break-avoid print:border print:border-gray-300 print:shadow-none print:mb-4">
                  <div 
                    onClick={() => toggleExpand(lojaGroup.loja)}
                    className="bg-gray-50 hover:bg-gray-100/80 p-4 flex items-center justify-between cursor-pointer border-b border-gray-200 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Building2 className="w-4 h-4 text-[#173e27]" />
                      <span className="text-xs font-black text-gray-900 uppercase tracking-wide">
                        {lojaGroup.loja}
                      </span>
                      <span className="text-[11px] font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                        {lojaGroup.itens?.length || 0} VPs
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-gray-500">
                        Total VP: <strong className="text-blue-900">{formatCurrency(lojaGroup.totalVendaAReceber)}</strong>
                      </span>
                      <span className="text-gray-500">
                        Liquidado: <strong className="text-emerald-800">{formatCurrency(lojaGroup.valorLiquidado)}</strong>
                      </span>
                      <span className="text-gray-500">
                        A Liquidar: <strong className="text-amber-800">{formatCurrency(lojaGroup.valorALiquidar)}</strong>
                      </span>
                      <span className="text-gray-500">
                        Comissão (3%): <strong className="text-blue-700">{formatCurrency(lojaGroup.totalComissao)}</strong>
                      </span>
                      <span className="text-gray-500">
                        Líquido Produtor: <strong className="text-emerald-800">{formatCurrency(lojaGroup.totalLiquidoProdutor)}</strong>
                      </span>
                      <span className="print:hidden">
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                      </span>
                    </div>
                  </div>

                  <div className={`overflow-x-auto p-4 pt-2 ${isExpanded ? 'block' : 'hidden print:block'}`}>
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-100 text-gray-700 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="py-2 px-3">Nº VP</th>
                          <th className="py-2 px-2">Data</th>
                          <th className="py-2 px-3">Nº NF</th>
                          <th className="py-2 px-3 text-right">Caixas (29kg)</th>
                          <th className="py-2 px-3 text-right">Cotação Dia</th>
                          <th className="py-2 px-3 text-right">Valor Total VP</th>
                          <th className="py-2 px-3 text-right bg-emerald-50 text-emerald-950 font-bold">Valor Liquidado</th>
                          <th className="py-2 px-3 text-right bg-amber-50 text-amber-950 font-bold">Valor a Liquidar</th>
                          <th className="py-2 px-3 text-center">Taxa Com.</th>
                          <th className="py-2 px-3 text-right bg-blue-50/50 font-bold text-blue-900">Comissão (R$)</th>
                          <th className="py-2 px-3 text-right bg-emerald-50/50 font-bold text-emerald-950">Líquido Produtor (R$)</th>
                          <th className="py-2 px-3 text-center">Vencimento</th>
                          <th className="py-2 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {lojaGroup.itens?.map((it, rIdx) => {
                          const isSettled = it.paymentStatus === 'Recebido' || it.status === 'Concluído' || it.status === 'Recebido';
                          const itLiquidado = isSettled ? (Number(it.valorVP) || 0) : 0;
                          const itALiquidar = !isSettled ? (Number(it.valorVP) || 0) : 0;
                          return (
                            <tr key={rIdx} className="hover:bg-gray-50/70 transition-colors">
                              <td className="py-2 px-3">
                                <div className="font-bold text-[#173e27]">{it.vp}</div>
                                <div className="text-[10px] text-gray-500 font-medium truncate max-w-[140px]" title={it.product}>
                                  {it.product}
                                </div>
                                <div className="text-[10px] text-blue-800 font-medium truncate max-w-[140px]" title={`Produtor: ${it.producer || it.origin}`}>
                                  🌾 {it.producer || it.origin || 'Produtor Rural'}
                                </div>
                              </td>
                              <td className="py-2 px-2 text-gray-600">{it.dataVP}</td>
                              <td className="py-2 px-3 font-semibold text-gray-800">{it.nf}</td>
                              <td className="py-2 px-3 text-right font-bold text-gray-900">
                                {formatNumber(it.cxs, 2)} {it.unit?.includes('Granel') ? 'kg' : (it.unit?.includes('Sacas') ? 'sc' : 'cx')}
                              </td>
                              <td className="py-2 px-3 text-right font-semibold text-blue-900">
                                R$ {it.cotacao.toFixed(2)}/{it.unit?.includes('Granel') ? 'kg' : (it.unit?.includes('Sacas') ? 'sc' : 'cx')}
                              </td>
                              <td className="py-2 px-3 text-right font-black text-blue-950">{formatCurrency(it.valorVP)}</td>
                              <td className="py-2 px-3 text-right font-black text-emerald-800 bg-emerald-50/40">
                                {itLiquidado > 0 ? formatCurrency(itLiquidado) : <span className="text-gray-400 font-normal">-</span>}
                              </td>
                              <td className="py-2 px-3 text-right font-black text-amber-900 bg-amber-50/40">
                                {itALiquidar > 0 ? formatCurrency(itALiquidar) : <span className="text-gray-400 font-normal">-</span>}
                              </td>
                              <td className="py-2 px-3 text-center font-semibold text-gray-700">{it.taxaComissao.toFixed(1)}%</td>
                              <td className="py-2 px-3 text-right font-black text-blue-900 bg-blue-50/30">
                                {formatCurrency(it.comissao)}
                              </td>
                              <td className="py-2 px-3 text-right font-black text-emerald-950 bg-emerald-50/30">
                                {formatCurrency(it.liquidoProdutor)}
                              </td>
                              <td className="py-2 px-3 text-center text-gray-600">{it.venc}</td>
                              <td className="py-2 px-3 text-center">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  isSettled ? 'bg-emerald-100 text-emerald-800' : (it.status === 'Faturado' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-900')
                                }`}>
                                  {isSettled ? 'Liquidado' : it.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-gray-100 font-bold text-xs border-t-2 border-gray-300">
                        <tr>
                          <td colSpan={3} className="py-2.5 px-3 uppercase text-gray-700 font-extrabold">
                            TOTAL {lojaGroup.loja.split(' ')[0]}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-gray-900">{formatNumber(lojaGroup.cxsVendidas, 2)}</td>
                          <td className="py-2.5 px-3 text-right text-gray-400">-</td>
                          <td className="py-2.5 px-3 text-right font-black text-blue-900">{formatCurrency(lojaGroup.totalVendaAReceber)}</td>
                          <td className="py-2.5 px-3 text-right font-black text-emerald-950 bg-emerald-100/60">{formatCurrency(lojaGroup.valorLiquidado)}</td>
                          <td className="py-2.5 px-3 text-right font-black text-amber-950 bg-amber-100/60">{formatCurrency(lojaGroup.valorALiquidar)}</td>
                          <td className="py-2.5 px-3 text-center">3,0%</td>
                          <td className="py-2.5 px-3 text-right font-black text-blue-950 bg-blue-100">{formatCurrency(lojaGroup.totalComissao)}</td>
                          <td className="py-2.5 px-3 text-right font-black text-emerald-950 bg-emerald-100">{formatCurrency(lojaGroup.totalLiquidoProdutor)}</td>
                          <td colSpan={2} className="py-2.5 px-3 text-center text-gray-600 font-bold text-[10px]">
                            {lojaGroup.itens?.filter(it => it.paymentStatus === 'Recebido' || it.status === 'Concluído' || it.status === 'Recebido').length} / {lojaGroup.itens?.length || 0} Pagos
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

    </div>
  );
}
