import React, { useState, useEffect, useMemo } from 'react';
import { 
  Printer, 
  Building2, 
  FileSpreadsheet, 
  RefreshCw, 
  CheckCircle2, 
  DollarSign, 
  BadgePercent, 
  Calendar, 
  Filter, 
  X, 
  CloudUpload, 
  FileDown, 
  Settings, 
  AlertTriangle, 
  Clock,
  Tractor,
  Coins,
  TrendingUp,
  ShieldCheck,
  Package
} from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { api } from '../services/api';
import { buildExcelReportHtml, buildProducerExcelReportHtml } from '../utils/reportExcelBuilder';
import { calculateLiquidation, cleanProductName, getValorTotalVP, roundMoney } from '../utils/calculations';

// Subcomponentes modulares
import StoreSummaryTable from '../components/reports/StoreSummaryTable';
import StoreDetailList from '../components/reports/StoreDetailList';
import CommissionsTable from '../components/reports/CommissionsTable';
import ProducerSummaryTable from '../components/reports/ProducerSummaryTable';
import ProducerDetailList from '../components/reports/ProducerDetailList';
import BrokerProfitTable from '../components/reports/BrokerProfitTable';
import N8nWebhookModal from '../components/reports/N8nWebhookModal';
import MultiStoreSelect from '../components/reports/MultiStoreSelect';

export default function Reports({ setCurrentPage }) {
  // Controle de Abas: 'produtor' (Prestação de contas NF) | 'corretor' (Lucros AgroVendas) | 'lojas' (Faturamento Lojas)
  const [activeTab, setActiveTab] = useState('produtor');
  
  // Filtros Avançados
  const [selectedStores, setSelectedStores] = useState([]); // Array vazio = todas as lojas
  const [selectedProduct, setSelectedProduct] = useState('ALL'); // 'ALL' = todos os produtos
  const [selectedProducer, setSelectedProducer] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [periodPreset, setPeriodPreset] = useState('ALL');
  const [loading, setLoading] = useState(true);

  // Catálogo de produtos cadastrados no sistema
  const [productsCatalog, setProductsCatalog] = useState([]);

  // Dados das Lojas e Corretor
  const [reportData, setReportData] = useState({ stores: [], totalGeral: {}, producers: [] });
  const [expandedLojas, setExpandedLojas] = useState({});

  // Dados dos Produtores Rurais (Base NF)
  const [producersData, setProducersData] = useState({ producers: [], totalGeral: {} });
  const [expandedProducers, setExpandedProducers] = useState({});

  // Integração com Google Drive / n8n Webhook
  const [savingDrive, setSavingDrive] = useState(false);
  const [driveNotification, setDriveNotification] = useState('');
  const [driveError, setDriveError] = useState('');
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState(() => localStorage.getItem('agrovenda_n8n_drive_webhook') || '');

  const stores = reportData.stores || [];
  const rawTotalGeral = reportData.totalGeral || {};

  // Compatibilidade legada para subcomponentes que esperam string única
  const selectedLoja = selectedStores.length === 1 ? selectedStores[0] : (selectedStores.length > 1 ? selectedStores.join(', ') : 'ALL');

  // Busca catálogo de produtos do backend
  useEffect(() => {
    api.get('/api/products')
      .then(res => {
        if (Array.isArray(res)) setProductsCatalog(res);
      })
      .catch(err => console.error('Erro ao buscar catálogo de produtos:', err));
  }, []);

  // Lista dinâmica e unificada de produtos disponíveis para o filtro
  const availableProducts = useMemo(() => {
    const pSet = new Set();

    // 1. Produtos do catálogo
    (productsCatalog || []).forEach(p => {
      const name = typeof p === 'string' ? p : p?.name;
      const clean = cleanProductName(name || '');
      if (clean && clean !== 'Produto') pSet.add(clean);
    });

    // 2. Produtos nos itens de lojas
    (reportData.stores || []).forEach(s => {
      (s.itens || []).forEach(it => {
        if (it.items && Array.isArray(it.items) && it.items.length > 0) {
          it.items.forEach(sub => {
            const clean = cleanProductName(sub.product || '');
            if (clean && clean !== 'Produto') pSet.add(clean);
          });
        }
        if (it.product) {
          const clean = cleanProductName(it.product);
          if (clean && clean !== 'Produto' && !clean.includes('+')) pSet.add(clean);
        }
      });
    });

    // 3. Produtos nos itens de produtores
    (producersData.producers || []).forEach(p => {
      (p.itens || []).forEach(it => {
        if (it.items && Array.isArray(it.items) && it.items.length > 0) {
          it.items.forEach(sub => {
            const clean = cleanProductName(sub.product || '');
            if (clean && clean !== 'Produto') pSet.add(clean);
          });
        }
        if (it.product) {
          const clean = cleanProductName(it.product);
          if (clean && clean !== 'Produto' && !clean.includes('+')) pSet.add(clean);
        }
      });
    });

    const list = Array.from(pSet).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    return list.length > 0 ? list : ['Cenoura', 'Batata', 'Cebola', 'Beterraba', 'Repolho'];
  }, [productsCatalog, reportData.stores, producersData.producers]);

  // Lista de produtores disponíveis para filtro
  const availableProducers = (reportData.producers && reportData.producers.length > 0)
    ? reportData.producers
    : (producersData.producers || []).map(p => p.producer);

  // --- Funções Auxiliares de Filtragem e Cálculo ---
  const isStoreMatch = (storeName) => {
    if (!selectedStores || selectedStores.length === 0) return true;
    return selectedStores.includes(storeName);
  };

  const isProducerMatch = (it, targetProducer) => {
    if (!targetProducer || targetProducer === 'ALL') return true;
    return (it.producer === targetProducer || it.origin === targetProducer);
  };

  const isItemProductMatch = (it, targetProduct) => {
    if (!targetProduct || targetProduct === 'ALL') return true;
    const cleanTarget = targetProduct.toLowerCase().trim();

    if (it.items && Array.isArray(it.items) && it.items.length > 0) {
      const matchSub = it.items.some(sub => {
        const subName = (sub.product || '').toLowerCase();
        const cleanSub = cleanProductName(sub.product || '').toLowerCase();
        return subName.includes(cleanTarget) || cleanSub === cleanTarget;
      });
      if (matchSub) return true;
    }

    const mainProd = (it.product || '').toLowerCase();
    const cleanMain = cleanProductName(it.product || '').toLowerCase();
    return mainProd.includes(cleanTarget) || cleanMain === cleanTarget;
  };

  // Extrai e recalcula métricas específicas quando o usuário filtra por um tipo de produto
  const getFilteredItemMetrics = (it, targetProduct) => {
    if (!targetProduct || targetProduct === 'ALL') {
      return it;
    }
    const cleanTarget = targetProduct.toLowerCase().trim();

    if (it.items && Array.isArray(it.items) && it.items.length > 0) {
      const matchingSubs = it.items.filter(sub => {
        const subName = (sub.product || '').toLowerCase();
        const cleanSub = cleanProductName(sub.product || '').toLowerCase();
        return subName.includes(cleanTarget) || cleanSub === cleanTarget;
      });

      if (matchingSubs.length === 0) return null;

      // Se todos os sub-itens correspondem, retorna integral
      if (matchingSubs.length === it.items.length) {
        return it;
      }

      // Romaneio misto: calcula proporção exata do produto filtrado
      const totalItensKg = it.items.reduce((acc, sub) => acc + (Number(sub.kg) || 0), 0) || Number(it.pesoNF) || 1;
      const subKg = matchingSubs.reduce((acc, sub) => acc + (Number(sub.kg) || 0), 0);
      const subCxs = matchingSubs.reduce((acc, sub) => acc + (Number(sub.quantity) || 0), 0);
      const ratio = totalItensKg > 0 ? (subKg / totalItensKg) : 1;

      const subVP = getValorTotalVP({ items: matchingSubs });

      const itemValorNF = roundMoney(Number(it.valorNF) * ratio);
      const itemFunrural = roundMoney(Number(it.funrural) * ratio);
      const itemLiquidoProdutor = roundMoney(Number(it.liquidoProdutor) * ratio);
      const itemComissao = roundMoney(Number(it.comissao) * ratio);
      const itemSpread = roundMoney(Math.max(0, subVP - itemValorNF));
      const itemLucro = roundMoney(itemComissao + itemSpread);
      const itemValorLiquidado = roundMoney(Number(it.valorLiquidado ?? it.liquido ?? 0) * ratio);
      const itemValorALiquidar = roundMoney(Number(it.valorALiquidar ?? 0) * ratio);
      const itemRepassado = roundMoney(Number(it.repassado ?? it.valorLiquidado ?? 0) * ratio);
      const itemSaldo = roundMoney(Math.max(0, itemValorNF - itemRepassado));

      return {
        ...it,
        product: matchingSubs.map(s => s.product || 'Item').join(' + '),
        items: matchingSubs,
        pesoNF: subKg,
        pesoColheita: subKg,
        cxs: subCxs || Number((subKg / 29).toFixed(2)),
        valorNF: itemValorNF,
        funrural: itemFunrural,
        valorVP: subVP > 0 ? subVP : roundMoney(Number(it.valorVP) * ratio),
        liquidoNF: roundMoney(itemValorNF - itemFunrural),
        comissao: itemComissao,
        liquidoProdutor: itemLiquidoProdutor,
        spreadComercial: itemSpread,
        lucroCorretor: itemLucro,
        valorLiquidado: itemValorLiquidado,
        valorALiquidar: itemValorALiquidar,
        repassado: itemRepassado,
        saldo: itemSaldo
      };
    }

    if (isItemProductMatch(it, targetProduct)) {
      return it;
    }

    return null;
  };

  // Filtragem dinâmica das Lojas (Aplicando Lojas selecionadas, Produtor e Produto)
  const filteredLojas = stores
    .filter(l => isStoreMatch(l.loja))
    .map(store => {
      const matchingItens = (store.itens || [])
        .filter(it => isProducerMatch(it, selectedProducer))
        .map(it => getFilteredItemMetrics(it, selectedProduct))
        .filter(Boolean);

      if ((selectedProducer !== 'ALL' || selectedProduct !== 'ALL') && matchingItens.length === 0) {
        return null;
      }

      const nfs = matchingItens.filter(it => it.status === 'Faturado' || (it.nf && it.nf !== 'Pendente')).length;
      const pedidosSemNF = matchingItens.length - nfs;
      const pesoNF = matchingItens.reduce((acc, it) => acc + (Number(it.pesoNF) || 0), 0);
      const cxsVendidas = matchingItens.reduce((acc, it) => acc + (Number(it.cxs) || 0), 0);
      const valorTotalNF = matchingItens.reduce((acc, it) => acc + (Number(it.valorNF) || 0), 0);
      const funrural = matchingItens.reduce((acc, it) => acc + (Number(it.funrural) || 0), 0);
      const totalVendaAReceber = matchingItens.reduce((acc, it) => acc + (Number(it.valorVP) || 0), 0);
      const totalComissao = matchingItens.reduce((acc, it) => acc + (Number(it.comissao) || 0), 0);
      const totalLiquidoProdutor = matchingItens.reduce((acc, it) => acc + (Number(it.liquidoProdutor) || 0), 0);
      const totalSpreadComercial = matchingItens.reduce((acc, it) => acc + (Number(it.spreadComercial) || 0), 0);
      const totalLucroCorretor = matchingItens.reduce((acc, it) => acc + (Number(it.lucroCorretor) || 0), 0);
      
      const valorLiquidado = matchingItens.reduce((acc, it) => acc + (Number(it.valorLiquidado ?? calculateLiquidation(it).valorLiquidado) || 0), 0);
      const valorALiquidar = matchingItens.reduce((acc, it) => acc + (Number(it.valorALiquidar ?? calculateLiquidation(it).valorALiquidar) || 0), 0);

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
        totalSpreadComercial,
        totalLucroCorretor,
        valorLiquidado,
        valorALiquidar,
        itens: matchingItens
      };
    })
    .filter(Boolean);

  // Filtragem dinâmica dos Produtores Rurais (Aplicando Lojas selecionadas, Produtor e Produto)
  const rawProducersList = producersData.producers || [];
  const filteredProducers = rawProducersList
    .filter(p => selectedProducer === 'ALL' || p.producer === selectedProducer)
    .map(p => {
      const matchingItens = (p.itens || [])
        .filter(it => isStoreMatch(it.lojaDestino))
        .map(it => getFilteredItemMetrics(it, selectedProduct))
        .filter(Boolean);

      if ((selectedStores.length > 0 || selectedProduct !== 'ALL') && matchingItens.length === 0) {
        return null;
      }

      const nfs = matchingItens.filter(it => it.nf && it.nf !== 'Pendente').length;
      const pesoNF = matchingItens.reduce((acc, it) => acc + (Number(it.pesoNF) || 0), 0);
      const cxsVendidas = matchingItens.reduce((acc, it) => acc + (Number(it.cxs) || 0), 0);
      const valorTotalNF = matchingItens.reduce((acc, it) => acc + (Number(it.valorNF) || 0), 0);
      const funrural = matchingItens.reduce((acc, it) => acc + (Number(it.funrural) || 0), 0);
      const liquidoProdutor = matchingItens.reduce((acc, it) => acc + (Number(it.liquidoProdutor) || 0), 0);
      const repassesPagos = matchingItens.reduce((acc, it) => acc + (Number(it.repassado) || 0), 0);
      const saldoAPagar = matchingItens.reduce((acc, it) => acc + (Number(it.saldo) || 0), 0);

      return {
        ...p,
        nfs,
        pedidos: matchingItens.length,
        pesoNF,
        cxsVendidas: Number(cxsVendidas.toFixed(2)),
        valorTotalNF,
        funrural,
        liquidoProdutor,
        repassesPagos,
        saldoAPagar,
        status: saldoAPagar <= 0.01 && valorTotalNF > 0 ? 'Quitado' : (repassesPagos > 0 ? 'Parcial' : 'A Pagar'),
        itens: matchingItens
      };
    })
    .filter(Boolean);

  // Indica se qualquer filtro ativo está alterando o universo de dados
  const isAnyFilterActive = selectedStores.length > 0 || selectedProducer !== 'ALL' || selectedProduct !== 'ALL';

  // Totais consolidados de Produtores (Calculados sobre os dados filtrados em tempo real)
  const producersTotal = !isAnyFilterActive
    ? (producersData.totalGeral || {})
    : filteredProducers.reduce((acc, p) => ({
        produtoresCount: acc.produtoresCount + 1,
        pedidos: acc.pedidos + (p.pedidos || 0),
        nfs: acc.nfs + (p.nfs || 0),
        pesoNF: acc.pesoNF + (p.pesoNF || 0),
        cxsVendidas: acc.cxsVendidas + (p.cxsVendidas || 0),
        valorTotalNF: acc.valorTotalNF + (p.valorTotalNF || 0),
        funrural: acc.funrural + (p.funrural || 0),
        liquidoProdutor: acc.liquidoProdutor + (p.liquidoProdutor || 0),
        repassesPagos: acc.repassesPagos + (p.repassesPagos || 0),
        saldoAPagar: acc.saldoAPagar + (p.saldoAPagar || 0)
      }), {
        produtoresCount: 0,
        pedidos: 0,
        nfs: 0,
        pesoNF: 0,
        cxsVendidas: 0,
        valorTotalNF: 0,
        funrural: 0,
        liquidoProdutor: 0,
        repassesPagos: 0,
        saldoAPagar: 0
      });

  // Dynamic totals para Lojas e Corretor (Soma das lojas selecionadas / produto filtrado)
  const currentTotal = !isAnyFilterActive
    ? rawTotalGeral
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
        totalSpreadComercial: acc.totalSpreadComercial + (row.totalSpreadComercial || 0),
        totalLucroCorretor: acc.totalLucroCorretor + (row.totalLucroCorretor || 0),
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
        totalSpreadComercial: 0,
        totalLucroCorretor: 0,
        valorTotalLiquidado: 0,
        valorTotalALiquidar: 0
      });

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
      
      const queryStr = params.toString() ? `?${params.toString()}` : '';

      // Busca dados de lojas/corretor e dados exclusivos de produtores com resiliência
      const [resStoresResult, resProducersResult] = await Promise.allSettled([
        api.get(`/api/reports/stores-summary${queryStr}`),
        api.get(`/api/reports/producers-summary${queryStr}`)
      ]);

      if (resStoresResult.status === 'fulfilled' && resStoresResult.value) {
        setReportData(resStoresResult.value);
        const initExpand = {};
        (resStoresResult.value.stores || []).forEach(s => { initExpand[s.loja] = true; });
        setExpandedLojas(initExpand);
      } else if (resStoresResult.status === 'rejected') {
        console.error('Erro ao buscar stores-summary:', resStoresResult.reason);
      }

      if (resProducersResult.status === 'fulfilled' && resProducersResult.value) {
        setProducersData(resProducersResult.value);
        const initExpandProd = {};
        (resProducersResult.value.producers || []).forEach(p => { initExpandProd[p.producer] = true; });
        setExpandedProducers(initExpandProd);
      } else if (resProducersResult.status === 'rejected') {
        console.error('Erro ao buscar producers-summary:', resProducersResult.reason);
      }
    } catch (err) {
      console.error('Erro ao buscar relatórios no MongoDB:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveReport();
  }, []);

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

  const saveWebhookConfig = (e) => {
    e.preventDefault();
    localStorage.setItem('agrovenda_n8n_drive_webhook', webhookUrl);
    setShowWebhookModal(false);
    setDriveNotification('URL do Webhook do n8n salva com sucesso!');
    setTimeout(() => setDriveNotification(''), 4000);
  };

  // Limpeza rápida de todos os filtros ativos
  const handleClearAllFilters = () => {
    setSelectedStores([]);
    setSelectedProduct('ALL');
    setSelectedProducer('ALL');
  };

  // Constrói o HTML correspondente à aba ativa
  const buildCurrentExcelContent = () => {
    const filterMeta = { 
      startDate, 
      endDate, 
      selectedStores,
      selectedLoja: selectedStores.length === 1 ? selectedStores[0] : (selectedStores.length > 1 ? selectedStores.join(', ') : 'ALL'), 
      selectedProducer,
      selectedProduct
    };
    if (activeTab === 'produtor') {
      return buildProducerExcelReportHtml(filteredProducers, producersTotal, filterMeta);
    }
    return buildExcelReportHtml(filteredLojas, currentTotal, filterMeta);
  };

  // Disparo para Google Drive via n8n
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
      const excelHtml = buildCurrentExcelContent();
      const res = await api.post('/api/reports/trigger-n8n', {
        webhookUrl: activeUrl,
        startDate: startDate || null,
        endDate: endDate || null,
        selectedLoja: selectedStores.length === 1 ? selectedStores[0] : (selectedStores.length > 1 ? selectedStores.join(', ') : 'ALL'),
        selectedStores: selectedStores,
        selectedProduct: selectedProduct,
        selectedProducer: selectedProducer,
        activeTab: activeTab,
        excelHtml: excelHtml,
        filteredStores: filteredLojas,
        currentTotal: currentTotal
      });

      if (res.success) {
        setDriveNotification('✅ Relatório enviado e salvo com sucesso no Google Drive!');
      } else {
        setDriveError(res.message || 'Erro ao processar no n8n.');
      }
    } catch (err) {
      console.error(err);
      setDriveError(err.message || 'Falha ao conectar com o n8n.');
    } finally {
      setSavingDrive(false);
      setTimeout(() => {
        setDriveNotification('');
        setDriveError('');
      }, 6000);
    }
  };

  // Download direto de planilha Excel
  const handleDownloadExcelDirect = () => {
    const excelContent = buildCurrentExcelContent();
    const dateStr = new Date().toISOString().split('T')[0];
    let fileName = `Relatorio_AgroVenda_${dateStr}.xls`;

    const safeLojaStr = selectedStores.length === 1 
      ? selectedStores[0].replace(/[^a-zA-Z0-9]/g, '_') 
      : (selectedStores.length > 1 ? `${selectedStores.length}_Lojas_Consolidadas` : 'Todas_Lojas');
    const safeProdStr = selectedProducer === 'ALL' ? 'Todos_Produtores' : selectedProducer.replace(/[^a-zA-Z0-9]/g, '_');
    const safeProdTypeStr = selectedProduct === 'ALL' ? '' : `_${selectedProduct.replace(/[^a-zA-Z0-9]/g, '_')}`;

    if (activeTab === 'produtor') {
      fileName = `Extrato_Produtor_${safeProdStr}${safeProdTypeStr}_${dateStr}.xls`;
    } else if (activeTab === 'corretor') {
      fileName = `Fechamento_Lucros_Corretor_${safeLojaStr}${safeProdTypeStr}_${dateStr}.xls`;
    } else {
      fileName = `Relatorio_Lojas_${safeLojaStr}${safeProdTypeStr}_${dateStr}.xls`;
    }

    const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toggleExpandLoja = (lojaName) => {
    setExpandedLojas(prev => ({ ...prev, [lojaName]: !prev[lojaName] }));
  };

  const toggleExpandProducer = (prodName) => {
    setExpandedProducers(prev => ({ ...prev, [prodName]: !prev[prodName] }));
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-[1700px] mx-auto space-y-6">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <div className="text-xs font-bold text-[#091b2e] tracking-wider uppercase flex items-center gap-1.5">
            {activeTab === 'produtor' ? (
              <>
                <Tractor className="w-4 h-4 text-emerald-700" />
                <span>AGROVENDA — PRESTAÇÃO DE CONTAS DO PRODUTOR (BASE NOTA FISCAL)</span>
              </>
            ) : activeTab === 'corretor' ? (
              <>
                <Coins className="w-4 h-4 text-[#df7b1b]" />
                <span>AGROVENDA — RESULTADO COMERCIAL & LUCROS DO CORRETOR</span>
              </>
            ) : (
              <>
                <Building2 className="w-4 h-4 text-blue-700" />
                <span>AGROVENDA — FATURAMENTO & RECEBIMENTOS POR LOJA</span>
              </>
            )}
          </div>
          <h1 className="text-2xl font-black text-gray-900 mt-1">
            {activeTab === 'produtor' && 'Extrato & Prestação de Contas do Produtor Rural'}
            {activeTab === 'corretor' && 'Fechamento de Lucros do Corretor (AgroVendas)'}
            {activeTab === 'lojas' && 'Relatório Geral — Faturamento e Vendas por Loja'}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {activeTab === 'produtor' && 'Valores apurados estritamente sobre a Nota Fiscal do Produtor com dedução oficial do FUNRURAL (1,63%). Zero exposição de cotação da loja.'}
            {activeTab === 'corretor' && 'Confronto entre o que o corretor recebe da loja (VP Comercial) e o que paga ao produtor (Valor NF), apurando o lucro e spread líquido.'}
            {activeTab === 'lojas' && 'Acompanhamento consolidado e analítico de entregas, cotações e liquidação agrupados por rede compradora.'}
          </p>

          {isAnyFilterActive && (
            <div className="hidden print:block text-[11px] font-semibold text-emerald-900 mt-2 border-t border-gray-200 pt-1">
              <strong>Filtros Aplicados:</strong>{' '}
              {selectedStores.length > 0 ? `Lojas: ${selectedStores.join(', ')}` : 'Todas as Lojas'} |{' '}
              {selectedProduct !== 'ALL' ? `Produto: ${selectedProduct}` : 'Todos os Produtos'} |{' '}
              {selectedProducer !== 'ALL' ? `Produtor: ${selectedProducer}` : 'Todos os Produtores'}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 print:hidden">
          {/* Seletor Multi-Lojas com Busca e Soma Consolidada */}
          <MultiStoreSelect
            stores={stores}
            selectedStores={selectedStores}
            onChange={setSelectedStores}
          />

          {/* Seletor de Tipo de Produto */}
          <div className="relative inline-flex items-center">
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className={`bg-white border text-xs rounded-lg pl-8 pr-3 py-2 outline-none font-semibold transition-all shadow-sm cursor-pointer ${
                selectedProduct !== 'ALL'
                  ? 'border-emerald-600 ring-2 ring-emerald-600/20 text-emerald-950 bg-emerald-50/30'
                  : 'border-gray-300 text-gray-800 hover:bg-gray-50'
              }`}
              title="Filtrar por tipo de produto"
            >
              <option value="ALL">Todos os Produtos ({availableProducts.length})</option>
              {availableProducts.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <Package className={`w-3.5 h-3.5 absolute left-2.5 pointer-events-none ${selectedProduct !== 'ALL' ? 'text-emerald-700' : 'text-gray-400'}`} />
          </div>

          {/* Seletor de Produtor */}
          <div className="relative inline-flex items-center">
            <select
              value={selectedProducer}
              onChange={(e) => setSelectedProducer(e.target.value)}
              className={`bg-white border text-xs rounded-lg pl-8 pr-3 py-2 outline-none font-semibold transition-all shadow-sm cursor-pointer ${
                selectedProducer !== 'ALL'
                  ? 'border-emerald-600 ring-2 ring-emerald-600/20 text-emerald-950 bg-emerald-50/30'
                  : 'border-gray-300 text-gray-800 hover:bg-gray-50'
              }`}
              title="Filtrar por produtor rural"
            >
              <option value="ALL">Todos os Produtores ({availableProducers.length})</option>
              {availableProducers.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <Tractor className={`w-3.5 h-3.5 absolute left-2.5 pointer-events-none ${selectedProducer !== 'ALL' ? 'text-emerald-700' : 'text-gray-400'}`} />
          </div>

          <button
            onClick={() => fetchLiveReport(startDate, endDate)}
            className="bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 text-xs font-bold px-3 py-2 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Atualizar dados do MongoDB"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>

          {/* Botão Baixar Excel */}
          <button
            onClick={handleDownloadExcelDirect}
            className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3.5 py-2 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Baixar planilha formatada para Excel (.xls)"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>{activeTab === 'produtor' ? 'Baixar Excel Produtor' : 'Baixar Excel'}</span>
          </button>

          {/* Botão Salvar no Google Drive */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleTriggerDrive}
              disabled={savingDrive}
              className="bg-[#0e3b5e] hover:bg-[#134d7a] disabled:opacity-50 text-white text-xs font-bold px-3.5 py-2 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Disparar fluxo do n8n para salvar relatório no Google Drive"
            >
              <CloudUpload className={`w-3.5 h-3.5 ${savingDrive ? 'animate-bounce' : ''}`} />
              <span>{savingDrive ? 'Enviando...' : 'Salvar no Drive'}</span>
            </button>
            <button
              onClick={() => setShowWebhookModal(true)}
              className="p-2 border border-gray-300 bg-white hover:bg-gray-100 text-gray-600 rounded-lg shadow-sm cursor-pointer"
              title="Configurar Webhook do n8n"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Botão Imprimir / PDF */}
          <button
            onClick={() => window.print()}
            className="bg-[#091b2e] hover:bg-[#132c4a] text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir / PDF</span>
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
      <N8nWebhookModal
        show={showWebhookModal}
        onClose={() => setShowWebhookModal(false)}
        webhookUrl={webhookUrl}
        setWebhookUrl={setWebhookUrl}
        onSave={saveWebhookConfig}
      />

      {/* Barra de Filtro de Período (Oculta na Impressão) */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-4 print:hidden">
        
        {/* Form de Seleção de Datas */}
        <form onSubmit={handleFilterDateSubmit} className="flex flex-wrap items-center gap-2.5 sm:gap-3">
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
            <span>Filtrar</span>
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
        <div className="flex flex-wrap items-center gap-1.5 pt-1 xl:pt-0">
          <span className="text-[11px] font-semibold text-gray-400 mr-1">Atalhos:</span>
          
          <button
            type="button"
            onClick={() => handleApplyPreset('ALL')}
            className={`text-xs font-bold px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer ${
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
            className={`text-xs font-bold px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer ${
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
            className={`text-xs font-bold px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer ${
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
            className={`text-xs font-bold px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer ${
              periodPreset === 'SAFRA_AGO26'
                ? 'bg-emerald-100 text-emerald-950 border-emerald-300 font-black'
                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
            }`}
          >
            Agosto/2026
          </button>
        </div>

      </div>

      {/* Banner de Filtros Avançados Ativos (Consolidação Multi-Lojas e Produto) */}
      {isAnyFilterActive && (
        <div className="bg-emerald-50/90 border border-emerald-300/80 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs print:hidden animate-fadeIn">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-black text-emerald-950 flex items-center gap-1.5 uppercase tracking-wide text-[11px]">
              <Filter className="w-3.5 h-3.5 text-emerald-700" />
              <span>Filtros Ativos:</span>
            </span>

            {selectedStores.length > 0 && (
              <span className="inline-flex items-center gap-1.5 bg-white border border-emerald-300 text-emerald-900 font-bold px-2.5 py-1 rounded-lg text-xs shadow-2xs">
                <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                <span>
                  {selectedStores.length === 1 ? selectedStores[0] : `${selectedStores.length} Lojas (${selectedStores.join(', ')})`}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedStores([])}
                  className="hover:text-emerald-950 p-0.5 rounded cursor-pointer ml-1 text-gray-400 hover:text-gray-700"
                  title="Remover filtro de lojas"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedProduct !== 'ALL' && (
              <span className="inline-flex items-center gap-1.5 bg-white border border-emerald-300 text-emerald-900 font-bold px-2.5 py-1 rounded-lg text-xs shadow-2xs">
                <Package className="w-3.5 h-3.5 text-emerald-700" />
                <span>Produto: {selectedProduct}</span>
                <button
                  type="button"
                  onClick={() => setSelectedProduct('ALL')}
                  className="hover:text-emerald-950 p-0.5 rounded cursor-pointer ml-1 text-gray-400 hover:text-gray-700"
                  title="Remover filtro de produto"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedProducer !== 'ALL' && (
              <span className="inline-flex items-center gap-1.5 bg-white border border-emerald-300 text-emerald-900 font-bold px-2.5 py-1 rounded-lg text-xs shadow-2xs">
                <Tractor className="w-3.5 h-3.5 text-emerald-700" />
                <span>Produtor: {selectedProducer}</span>
                <button
                  type="button"
                  onClick={() => setSelectedProducer('ALL')}
                  className="hover:text-emerald-950 p-0.5 rounded cursor-pointer ml-1 text-gray-400 hover:text-gray-700"
                  title="Remover filtro de produtor"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleClearAllFilters}
            className="text-emerald-900 hover:text-white hover:bg-emerald-700 font-bold text-xs px-3 py-1.5 rounded-lg border border-emerald-300 bg-white transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <X className="w-3.5 h-3.5" />
            <span>Limpar Todos os Filtros</span>
          </button>
        </div>
      )}

      {/* Seletor de Abas Principais */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 border-b border-gray-200 pb-1 print:hidden">
        
        {/* ABA 1: PRODUTOR */}
        <button
          onClick={() => setActiveTab('produtor')}
          className={`flex items-center gap-2.5 px-5 py-3 rounded-t-xl font-bold text-xs transition-all border-b-2 cursor-pointer ${
            activeTab === 'produtor'
              ? 'border-emerald-700 text-emerald-950 bg-white shadow-sm font-black'
              : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100/60'
          }`}
        >
          <Tractor className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>Extrato do Produtor (Prestação de Contas Base NF)</span>
        </button>

        {/* ABA 2: CORRETOR */}
        <button
          onClick={() => setActiveTab('corretor')}
          className={`flex items-center gap-2.5 px-5 py-3 rounded-t-xl font-bold text-xs transition-all border-b-2 cursor-pointer ${
            activeTab === 'corretor'
              ? 'border-[#091b2e] text-[#091b2e] bg-white shadow-sm font-black'
              : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100/60'
          }`}
        >
          <Coins className="w-4 h-4 text-[#df7b1b] shrink-0" />
          <span>Lucros do Corretor (Fechamento AgroVendas)</span>
        </button>

        {/* ABA 3: LOJAS */}
        <button
          onClick={() => setActiveTab('lojas')}
          className={`flex items-center gap-2.5 px-5 py-3 rounded-t-xl font-bold text-xs transition-all border-b-2 cursor-pointer ${
            activeTab === 'lojas'
              ? 'border-blue-700 text-blue-950 bg-white shadow-sm font-black'
              : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100/60'
          }`}
        >
          <Building2 className="w-4 h-4 text-blue-700 shrink-0" />
          <span>Visão por Lojas (Vendas e Faturamento)</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* CONTEÚDO DA ABA 1: EXTRATO DO PRODUTOR (BASE NF)          */}
      {/* ======================================================== */}
      {activeTab === 'produtor' && (
        <div className="space-y-6">
          <ProducerSummaryTable 
            producers={filteredProducers} 
            totalGeral={producersTotal} 
            selectedProducer={selectedProducer} 
          />
          <ProducerDetailList 
            producers={filteredProducers} 
            expandedProducers={expandedProducers} 
            toggleExpandProducer={toggleExpandProducer} 
          />
        </div>
      )}

      {/* ======================================================== */}
      {/* CONTEÚDO DA ABA 2: LUCROS DO CORRETOR (AGROVENDAS)       */}
      {/* ======================================================== */}
      {activeTab === 'corretor' && (
        <div className="space-y-6">
          <BrokerProfitTable 
            stores={filteredLojas} 
            currentTotal={currentTotal} 
            selectedLoja={selectedLoja} 
          />
        </div>
      )}

      {/* ======================================================== */}
      {/* CONTEÚDO DA ABA 3: VISÃO POR LOJAS                       */}
      {/* ======================================================== */}
      {activeTab === 'lojas' && (
        <div className="space-y-6">
          <StoreSummaryTable 
            stores={filteredLojas} 
            currentTotal={currentTotal} 
            selectedLoja={selectedLoja} 
          />
          <StoreDetailList 
            stores={filteredLojas} 
            expandedLojas={expandedLojas} 
            toggleExpand={toggleExpandLoja} 
            showCommissions={false}
          />
        </div>
      )}

    </div>
  );
}
