import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Printer, 
  Building2, 
  FileSpreadsheet, 
  CheckCircle2, 
  DollarSign, 
  BadgePercent, 
  Calendar, 
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
  Package,
  Filter
} from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { api } from '../services/api';
import { buildExcelReportHtml, buildBrokerExcelReportHtml } from '../utils/reportExcelBuilder';
import { calculateLiquidation, cleanProductName, getValorTotalVP, roundMoney } from '../utils/calculations';
import { DATA_LABELS } from '../constants/dataLabels';

// Subcomponentes modulares
import StoreSummaryTable from '../components/reports/StoreSummaryTable';
import StoreDetailList from '../components/reports/StoreDetailList';
import BrokerProfitTable from '../components/reports/BrokerProfitTable';
import N8nWebhookModal from '../components/reports/N8nWebhookModal';
import MultiStoreSelect from '../components/reports/MultiStoreSelect';
import MultiProductSelect from '../components/reports/MultiProductSelect';

export default function Reports({ setCurrentPage }) {
  // Abas: 'lojas' (Prestação unificada) | 'corretor' (Resultado / comissões)
  const [activeTab, setActiveTab] = useState('lojas');
  
  // Filtros Avançados
  const [selectedStores, setSelectedStores] = useState([]); // [] após init = nenhuma; inicia preenchido com todas
  const storesInitRef = React.useRef(false);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const productsInitRef = React.useRef(false);
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

  // Inicializa filtro multi-loja com todas as lojas (1x)
  useEffect(() => {
    if (!storesInitRef.current && stores.length > 0) {
      setSelectedStores(stores.map(s => s.loja).filter(Boolean));
      storesInitRef.current = true;
    }
  }, [stores]);

  // Rótulo do TOTAL: só nome da loja se filtro = 1 loja; senão TOTAL GERAL
  const selectedLoja = selectedStores.length === 1 ? selectedStores[0] : 'ALL';

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

  useEffect(() => {
    if (!productsInitRef.current && availableProducts.length > 0) {
      setSelectedProducts(availableProducts);
      productsInitRef.current = true;
    }
  }, [availableProducts]);

  const isAllProductsSelected =
    availableProducts.length > 0 &&
    selectedProducts.length === availableProducts.length &&
    availableProducts.every(p => selectedProducts.includes(p));

  // Compat: string única quando exatamente 1 produto; 'ALL' quando todos; 'NONE' quando vazio
  const selectedProduct = !productsInitRef.current || isAllProductsSelected
    ? 'ALL'
    : (selectedProducts.length === 0 ? 'NONE' : (selectedProducts.length === 1 ? selectedProducts[0] : selectedProducts));

  // Lista de produtores disponíveis para filtro
  const availableProducers = (reportData.producers && reportData.producers.length > 0)
    ? reportData.producers
    : (producersData.producers || []).map(p => p.producer);

  // --- Funções Auxiliares de Filtragem e Cálculo ---
  const isStoreMatch = (storeName) => {
    if (!selectedStores || selectedStores.length === 0) return false;
    return selectedStores.includes(storeName);
  };

  const isProducerMatch = (it, targetProducer) => {
    if (!targetProducer || targetProducer === 'ALL') return true;
    return (it.producer === targetProducer || it.origin === targetProducer);
  };

  const isItemProductMatch = (it, targetProduct) => {
    if (targetProduct === 'NONE') return false;
    if (!targetProduct || targetProduct === 'ALL') return true;

    const targets = Array.isArray(targetProduct) ? targetProduct : [targetProduct];

    const matchesOne = (name) => {
      const clean = cleanProductName(name || '').toLowerCase();
      const raw = (name || '').toLowerCase();
      return targets.some(t => {
        const cleanTarget = String(t).toLowerCase().trim();
        return raw.includes(cleanTarget) || clean === cleanTarget;
      });
    };

    if (it.items && Array.isArray(it.items) && it.items.length > 0) {
      if (it.items.some(sub => matchesOne(sub.product))) return true;
    }
    return matchesOne(it.product);
  };

  // Extrai e recalcula métricas específicas quando o usuário filtra por produto(s)
  const getFilteredItemMetrics = (it, targetProduct) => {
    if (targetProduct === 'NONE') return null;
    if (!targetProduct || targetProduct === 'ALL') {
      return it;
    }
    const targets = Array.isArray(targetProduct) ? targetProduct : [targetProduct];

    const matchesOne = (name) => {
      const clean = cleanProductName(name || '').toLowerCase();
      const raw = (name || '').toLowerCase();
      return targets.some(t => {
        const cleanTarget = String(t).toLowerCase().trim();
        return raw.includes(cleanTarget) || clean === cleanTarget;
      });
    };

    if (it.items && Array.isArray(it.items) && it.items.length > 0) {
      const matchingSubs = it.items.filter(sub => matchesOne(sub.product));

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
      const itemComissão = roundMoney(Number(it.comissao) * ratio);
      const itemSpread = roundMoney(Math.max(0, subVP - itemValorNF));
      const itemLucro = roundMoney(itemComissão + itemSpread);
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
        comissao: itemComissão,
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
      const totalComissão = matchingItens.reduce((acc, it) => acc + (Number(it.comissao) || 0), 0);
      const totalLiquidoProdutor = matchingItens.reduce((acc, it) => acc + (Number(it.liquidoProdutor) || 0), 0);
      const totalSpreadComercial = matchingItens.reduce((acc, it) => acc + (Number(it.spreadComercial) || 0), 0);
      const totalLucroCorretor = matchingItens.reduce((acc, it) => acc + (Number(it.lucroCorretor) || 0), 0);
      
      const valorLiquidado = matchingItens.reduce((acc, it) => acc + (Number(it.valorLiquidado ?? calculateLiquidation(it).valorLiquidado) || 0), 0);
      const valorALiquidar = matchingItens.reduce((acc, it) => acc + (Number(it.valorALiquidar ?? calculateLiquidation(it).valorALiquidar) || 0), 0);
      const liquidoPeloVP = matchingItens.reduce((acc, it) => acc + (Number(it.liquidoPeloVP ?? it.liquidoProdutor) || 0), 0);
      const liquidoPelaNF = matchingItens.reduce((acc, it) => {
        const v = it.liquidoPelaNF;
        if (v == null || !(Number(it.valorNF) > 0)) return acc;
        return acc + (Number(v) || 0);
      }, 0);
      const frete = matchingItens.reduce((acc, it) => acc + (Number(it.frete) || 0), 0);
      const comissaoDesconto = matchingItens.reduce((acc, it) => acc + (Number(it.comissaoDesconto) || 0), 0);

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
        frete,
        comissaoDesconto,
        totalVendaAReceber,
        liquidoNF: liquidoPelaNF,
        liquidoPeloVP,
        liquidoPelaNF,
        totalComissão,
        totalLiquidoProdutor: liquidoPeloVP,
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

      const nfs = matchingItens.filter(it => it.nf && it.nf !== 'Pendente' && it.nf !== 'SEM NF').length;
      const pesoNF = matchingItens.reduce((acc, it) => acc + (Number(it.pesoNF) || 0), 0);
      const cxsVendidas = matchingItens.reduce((acc, it) => acc + (Number(it.cxs) || 0), 0);
      const valorTotalNF = matchingItens.reduce((acc, it) => acc + (Number(it.valorNF) || 0), 0);
      const valorTotalVP = matchingItens.reduce((acc, it) => acc + (Number(it.valorVP) || 0), 0);
      const funrural = matchingItens.reduce((acc, it) => acc + (Number(it.funrural) || 0), 0);
      const liquidoProdutor = matchingItens.reduce((acc, it) => acc + (Number(it.liquidoPeloVP ?? it.liquidoProdutor) || 0), 0);
      const liquidoPelaNF = matchingItens.reduce((acc, it) => {
        if (!(Number(it.valorNF) > 0)) return acc;
        return acc + (Number(it.liquidoPelaNF ?? it.liquidoNF) || 0);
      }, 0);
      const frete = matchingItens.reduce((acc, it) => acc + (Number(it.frete) || 0), 0);
      const repassesPagos = matchingItens.reduce((acc, it) => acc + (Number(it.repassado) || 0), 0);
      const saldoAPagar = matchingItens.reduce((acc, it) => acc + (Number(it.saldo) || 0), 0);

      return {
        ...p,
        nfs,
        pedidos: matchingItens.length,
        pesoNF,
        cxsVendidas: Number(cxsVendidas.toFixed(2)),
        valorTotalNF,
        valorTotalVP,
        funrural,
        frete,
        liquidoProdutor,
        liquidoPeloVP: liquidoProdutor,
        liquidoPelaNF,
        repassesPagos,
        saldoAPagar,
        status: saldoAPagar <= 0.01 && liquidoProdutor > 0 ? 'Quitado' : (repassesPagos > 0 ? 'Parcial' : 'A Pagar'),
        itens: matchingItens
      };
    })
    .filter(Boolean);

  // Indica se qualquer filtro ativo está alterando o universo de dados
  const isAnyFilterActive = (selectedStores.length > 0 && selectedStores.length < stores.length) || selectedProducer !== 'ALL' || !isAllProductsSelected;

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
        valorTotalVP: acc.valorTotalVP + (p.valorTotalVP || 0),
        funrural: acc.funrural + (p.funrural || 0),
        frete: acc.frete + (p.frete || 0),
        liquidoProdutor: acc.liquidoProdutor + (p.liquidoProdutor || 0),
        liquidoPeloVP: acc.liquidoPeloVP + (p.liquidoPeloVP || p.liquidoProdutor || 0),
        liquidoPelaNF: acc.liquidoPelaNF + (p.liquidoPelaNF || 0),
        repassesPagos: acc.repassesPagos + (p.repassesPagos || 0),
        saldoAPagar: acc.saldoAPagar + (p.saldoAPagar || 0)
      }), {
        produtoresCount: 0,
        pedidos: 0,
        nfs: 0,
        pesoNF: 0,
        cxsVendidas: 0,
        valorTotalNF: 0,
        valorTotalVP: 0,
        funrural: 0,
        frete: 0,
        liquidoProdutor: 0,
        liquidoPeloVP: 0,
        liquidoPelaNF: 0,
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
        frete: acc.frete + (row.frete || 0),
        comissaoDesconto: acc.comissaoDesconto + (row.comissaoDesconto || 0),
        totalVendaAReceber: acc.totalVendaAReceber + (row.totalVendaAReceber || 0),
        liquidoNF: acc.liquidoNF + (row.liquidoNF || 0),
        liquidoPeloVP: acc.liquidoPeloVP + (row.liquidoPeloVP || 0),
        liquidoPelaNF: acc.liquidoPelaNF + (row.liquidoPelaNF || 0),
        totalComissão: acc.totalComissão + (row.totalComissão || 0),
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
        frete: 0,
        comissaoDesconto: 0,
        totalVendaAReceber: 0,
        liquidoNF: 0,
        liquidoPeloVP: 0,
        liquidoPelaNF: 0,
        totalComissão: 0,
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

  const datesFetchReadyRef = useRef(false);
  useEffect(() => {
    fetchLiveReport();
    datesFetchReadyRef.current = true;
  }, []);

  // Datas / produtor: recarrega automaticamente (sem botão Atualizar)
  useEffect(() => {
    if (!datesFetchReadyRef.current) return;
    const t = setTimeout(() => {
      fetchLiveReport(startDate, endDate, selectedProducer);
    }, 350);
    return () => clearTimeout(t);
  }, [startDate, endDate, selectedProducer]);

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

  const validateN8nWebhookUrl = (rawUrl) => {
    const trimmed = String(rawUrl || '').trim();
    if (!trimmed) return { ok: false, message: 'Informe a URL do webhook do n8n.' };
    let parsed;
    try {
      parsed = new URL(trimmed);
    } catch {
      return { ok: false, message: 'URL inválida. Use um endereço completo (http/https).' };
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { ok: false, message: 'A URL deve começar com http:// ou https://.' };
    }
    if (!/webhook/i.test(parsed.pathname || '')) {
      return { ok: false, message: 'A URL deve conter o path do webhook (ex.: /webhook/salvar-relatorio).' };
    }
    return { ok: true, url: trimmed };
  };

  const saveWebhookConfig = (e) => {
    e.preventDefault();
    setDriveNotification('');
    setDriveError('');
    const check = validateN8nWebhookUrl(webhookUrl);
    if (!check.ok) {
      setDriveError(check.message);
      return;
    }
    localStorage.setItem('agrovenda_n8n_drive_webhook', check.url);
    setWebhookUrl(check.url);
    setShowWebhookModal(false);
    setDriveNotification('Webhook n8n salvo e validado com sucesso!');
    setTimeout(() => setDriveNotification(''), 5000);
  };

  // Limpeza rápida de todos os filtros ativos (restaura universo completo)
  const handleClearAllFilters = () => {
    setSelectedStores(stores.map(s => s.loja).filter(Boolean).sort());
    setSelectedProducts(availableProducts.length ? [...availableProducts] : []);
    setSelectedProducer('ALL');
  };

  // Constrói o HTML correspondente à   aba ativa
  const buildCurrentExcelContent = () => {
    const filterMeta = { 
      startDate, 
      endDate, 
      selectedStores,
      selectedLoja, 
      selectedProducer,
      selectedProduct
    };
    if (activeTab === 'corretor') {
      return buildBrokerExcelReportHtml(filteredLojas, currentTotal, filterMeta);
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

    const check = validateN8nWebhookUrl(activeUrl);
    if (!check.ok) {
      setDriveError(check.message);
      setShowWebhookModal(true);
      return;
    }

    setSavingDrive(true);
    setDriveNotification('');
    setDriveError('');
    try {
      const excelHtml = buildCurrentExcelContent();
      const res = await api.post('/api/reports/trigger-n8n', {
        webhookUrl: check.url,
        startDate: startDate || null,
        endDate: endDate || null,
        selectedLoja,
        selectedStores: selectedStores,
        selectedProduct: selectedProduct,
        selectedProducer: selectedProducer,
        activeTab: activeTab,
        excelHtml: excelHtml,
        filteredStores: filteredLojas,
        currentTotal: currentTotal
      });

      if (res.success) {
        setDriveNotification('Relatório salvo no Google Drive com sucesso!');
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
    let fileName = `Relatório_AgroVenda_${dateStr}.xls`;

    const safeLojaStr = selectedStores.length === 1 
      ? selectedStores[0].replace(/[^a-zA-Z0-9]/g, '_') 
      : (selectedStores.length > 1 ? `${selectedStores.length}_Lojas_Consolidadas` : 'Todas_Lojas');
    const safeProdStr = selectedProducer === 'ALL' ? 'Todos_Produtores' : selectedProducer.replace(/[^a-zA-Z0-9]/g, '_');
    const safeProdTypeStr = isAllProductsSelected || selectedProducts.length === 0
      ? ''
      : `_${selectedProducts.map(p => String(p).replace(/[^a-zA-Z0-9]/g, '_')).join('-')}`;

    if (activeTab === 'produtor') {
      fileName = `Extrato_Produtor_${safeProdStr}${safeProdTypeStr}_${dateStr}.xls`;
    } else if (activeTab === 'corretor') {
      fileName = `Fechamento_Lucros_Corretor_${safeLojaStr}${safeProdTypeStr}_${dateStr}.xls`;
    } else {
      fileName = `Relatório_Lojas_${safeLojaStr}${safeProdTypeStr}_${dateStr}.xls`;
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
            {activeTab === 'lojas' ? (
              <>
                <Building2 className="w-4 h-4 text-blue-700" />
                <span>AGROVENDA — PRESTAÇÃO (VALORES POR CARGA)</span>
              </>
            ) : (
              <>
                <Coins className="w-4 h-4 text-[#F97316]" />
                <span>AGROVENDA — RESULTADO COMERCIAL &amp; LUCROS</span>
              </>
            )}
          </div>
          <h1 className="text-2xl font-black text-gray-900 mt-1">
            {activeTab === 'lojas' && 'Prestação — Valores por carga'}
            {activeTab === 'corretor' && 'Resultado AgroVenda (Spread + Comissão)'}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {activeTab === 'lojas' && 'Uma visão unificada: filtre por loja, produtor e produto. Valor negociado e saldo a receber.'}
            {activeTab === 'corretor' && 'Comissão e lucros da AgroVenda para gestão do resultado.'}
          </p>

          {isAnyFilterActive && (
            <div className="hidden print:block text-[11px] font-semibold text-emerald-900 mt-2 border-t border-gray-200 pt-1">
              <strong>Filtros Aplicados:</strong>{' '}
              {selectedStores.length === 0
                ? 'Nenhuma loja'
                : (selectedStores.length === stores.length
                  ? 'Todas as Lojas'
                  : `Lojas: ${selectedStores.join(', ')}`)} |{' '}
              {selectedProduct !== 'ALL'
                ? `Produto: ${Array.isArray(selectedProduct) ? selectedProduct.join(', ') : selectedProduct}`
                : 'Todos os Produtos'} |{' '}
              {selectedProducer !== 'ALL' ? `Produtor: ${selectedProducer}` : 'Todos os Produtores'}
            </div>
          )}
        </div>

        <div className="flex flex-col items-stretch gap-2 print:hidden min-w-0 md:max-w-[55%]">
        <div className="flex flex-wrap items-center gap-2">
          {/* Seletor Multi-Lojas com Busca e Soma Consolidada */}
          <MultiStoreSelect
            stores={stores}
            selectedStores={selectedStores}
            onChange={setSelectedStores}
          />

          <MultiProductSelect
            products={availableProducts}
            selectedProducts={selectedProducts}
            onChange={setSelectedProducts}
          />

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
            onClick={handleDownloadExcelDirect}
            className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3.5 py-2 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Baixar planilha formatada para Excel (.xls)"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>{activeTab === 'corretor' ? 'Baixar Excel Resultado' : 'Baixar Excel'}</span>
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

        {/* Feedback imediato sob os botões Drive / engrenagem */}
        {(driveNotification || driveError) && (
          <div className="w-full print:hidden space-y-2">
            {driveNotification && (
              <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-xl flex items-center justify-between text-xs font-bold shadow-xs animate-fadeIn">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{driveNotification}</span>
                </div>
                <button type="button" onClick={() => setDriveNotification('')} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            {driveError && (
              <div className="bg-red-50 border border-red-300 text-red-900 px-4 py-3 rounded-xl flex items-center justify-between text-xs font-bold shadow-xs animate-fadeIn">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{driveError}</span>
                </div>
                <button type="button" onClick={() => setDriveError('')} className="text-red-700 hover:text-red-900 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
        </div>
      </div>

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
            <Calendar className="w-4 h-4 text-[#F97316]" />
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

      {isAnyFilterActive && (
        <div className="bg-emerald-50/90 border border-emerald-300/80 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-end gap-3 text-xs shadow-xs print:hidden">
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

      {/* Abas: Prestação unificada | Resultado AgroVenda */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 border-b border-gray-200 pb-1 print:hidden">
        <button
          onClick={() => setActiveTab('lojas')}
          className={`flex items-center gap-2.5 px-5 py-3 rounded-t-xl font-bold text-xs transition-all border-b-2 cursor-pointer ${
            activeTab === 'lojas'
              ? 'border-blue-700 text-blue-950 bg-white shadow-sm font-black'
              : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100/60'
          }`}
        >
          <Building2 className="w-4 h-4 text-blue-700 shrink-0" />
          <span>Prestação (Valores por carga)</span>
        </button>

        <button
          onClick={() => setActiveTab('corretor')}
          className={`flex items-center gap-2.5 px-5 py-3 rounded-t-xl font-bold text-xs transition-all border-b-2 cursor-pointer ${
            activeTab === 'corretor'
              ? 'border-[#091b2e] text-[#091b2e] bg-white shadow-sm font-black'
              : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100/60'
          }`}
        >
          <Coins className="w-4 h-4 text-[#F97316] shrink-0" />
          <span>Resultado AgroVenda</span>
        </button>
      </div>

      {activeTab === 'lojas' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-white p-4 rounded-xl border border-blue-200 bg-blue-50/20 shadow-sm space-y-1">
              <div className="text-xs font-bold text-blue-900 uppercase">{DATA_LABELS.valorNegociadoVP}</div>
              <div className="text-xl font-black text-blue-950">{formatCurrency(currentTotal.totalVendaAReceber)}</div>
              <span className="text-[11px] text-blue-700">{currentTotal.pedidosVenda || 0} cargas no filtro</span>
            </div>
            <div className="bg-white p-4 rounded-xl border-2 border-emerald-500 bg-emerald-50/30 shadow-sm space-y-1">
              <div className="text-xs font-black text-emerald-900 uppercase">Já liquidado</div>
              <div className="text-xl font-black text-emerald-800">{formatCurrency(currentTotal.valorTotalLiquidado)}</div>
              <span className="text-[11px] text-emerald-800">Recebido das lojas</span>
            </div>
            <div className="bg-white p-4 rounded-xl border-2 border-amber-400 bg-amber-50/30 shadow-sm space-y-1">
              <div className="text-xs font-black text-amber-900 uppercase">Saldo a receber</div>
              <div className="text-xl font-black text-amber-950">{formatCurrency(currentTotal.valorTotalALiquidar)}</div>
              <span className="text-[11px] text-amber-800">VP - já recebido</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-1">
              <div className="text-xs font-bold text-gray-500 uppercase">Valor NF</div>
              <div className="text-xl font-black text-gray-900">{formatCurrency(currentTotal.valorTotalNF)}</div>
              <span className="text-[11px] text-gray-400">Referência fiscal</span>
            </div>
          </div>
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

      {activeTab === 'corretor' && (
        <div className="space-y-6">
          <BrokerProfitTable
            stores={filteredLojas}
            currentTotal={currentTotal}
            selectedLoja={selectedLoja}
          />
        </div>
      )}

    </div>
  );
}
