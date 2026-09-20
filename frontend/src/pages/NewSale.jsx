import React, { useState, useEffect } from 'react';
import { 
  Paperclip, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  UploadCloud, 
  FileCode, 
  Truck, 
  Sparkles, 
  ShieldCheck, 
  Scale, 
  Calculator, 
  Package, 
  UserCheck, 
  RotateCcw,
  Edit3,
  Calendar,
  Clock,
  Store
} from 'lucide-react';
import { formatCurrency, formatKg, formatNumber, getCleanFileName } from '../utils/formatters';
import { calculateSummary, calculateFunrural } from '../utils/calculations';
import { api } from '../services/api';
import SaleItemsTable from '../components/sales/SaleItemsTable';
import SaleFiscalSummary from '../components/sales/SaleFiscalSummary';
import NfeMatchingCards from '../components/sales/NfeMatchingCards';
import SaleCommissionCard from '../components/sales/SaleCommissionCard';

export default function NewSale({ setCurrentPage, onSaleCreated, editingSale, onCancelEdit }) {
  // Operation types
  const operationTypes = [
    'Intermediação (Corretagem / Comissão)',
    'Venda Particular / Repasse Direto',
    'Revenda Padrão (Compra e Venda)',
    'Venda de Estoque Próprio'
  ];

  // Form states (Editable)
  const [operationType, setOperationType] = useState('Intermediação (Corretagem / Comissão)');
  const [saleDate, setSaleDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentTermDays, setPaymentTermDays] = useState(30);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [customTermMode, setCustomTermMode] = useState(false);
  const [selectedClient, setSelectedClient] = useState('');
  const [clientDocument, setClientDocument] = useState('');
  const [origin, setOrigin] = useState('');
  const [destCity, setDestCity] = useState('');
  const [destUF, setDestUF] = useState('');
  const [notes, setNotes] = useState('');
  
  // Freight & Transport
  const [freightType, setFreightType] = useState('FOB (Retira na Origem)');
  const [carrierName, setCarrierName] = useState('');
  const [truckPlate, setTruckPlate] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverCPF, setDriverCPF] = useState('');

  // Brokerage Fee
  const [feeType, setFeeType] = useState('Porcentagem (%)');
  const [feeValue, setFeeValue] = useState(3.0);

  // Files & XML Data
  const [nfFile, setNfFile] = useState(null);
  const [nfeKey, setNfeKey] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState('');
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [xmlParsing, setXmlParsing] = useState(false);
  const [xmlSuccess, setXmlSuccess] = useState(false);

  // Vínculo Inteligente de Produtores (Emitente da NF-e)
  const [matchedProducer, setMatchedProducer] = useState(null);
  const [unmatchedProducer, setUnmatchedProducer] = useState(null);
  const [registeringProducer, setRegisteringProducer] = useState(false);
  const [producerRegisteredNotice, setProducerRegisteredNotice] = useState('');

  // Vínculo Inteligente de Clientes / Compradores (Destinatário da NF-e)
  const [matchedClient, setMatchedClient] = useState(null);
  const [unmatchedClient, setUnmatchedClient] = useState(null);
  const [registeringClient, setRegisteringClient] = useState(false);
  const [clientRegisteredNotice, setClientRegisteredNotice] = useState('');

  // Helper for empty item
  const createEmptyItem = () => ({
    id: Date.now() + Math.random(),
    product: '',
    unit: 'Caixas (29kg)',
    boxWeightKg: 29,
    totalKg: '',
    pricePerKg: '',
    totalNf: '',
    dailyQuote: ''
  });

  // Dynamic Array of Products in the Sale
  const [saleItems, setSaleItems] = useState([createEmptyItem()]);

  // Clients & Products options from backend
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Calculate Due Date automatically when saleDate or paymentTermDays changes
  useEffect(() => {
    if (saleDate && paymentTermDays !== '' && paymentTermDays !== null && !isNaN(Number(paymentTermDays))) {
      const d = new Date(saleDate + 'T12:00:00');
      d.setDate(d.getDate() + Number(paymentTermDays));
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      setDueDate(`${yyyy}-${mm}-${dd}`);
    }
  }, [saleDate, paymentTermDays]);

  const handleDueDateChange = (newDateStr) => {
    setDueDate(newDateStr);
    if (saleDate && newDateStr) {
      const d1 = new Date(saleDate + 'T12:00:00');
      const d2 = new Date(newDateStr + 'T12:00:00');
      const diffTime = d2 - d1;
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays >= 0) {
        setPaymentTermDays(diffDays);
        const commonPresets = [0, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60];
        setCustomTermMode(!commonPresets.includes(diffDays));
      }
    }
  };

  // Reset form to blank state
  const resetForm = () => {
    setOperationType('Intermediação (Corretagem / Comissão)');
    const today = new Date().toISOString().split('T')[0];
    setSaleDate(today);
    setPaymentTermDays(30);
    setCustomTermMode(false);
    const defaultDue = new Date();
    defaultDue.setDate(defaultDue.getDate() + 30);
    setDueDate(defaultDue.toISOString().split('T')[0]);
    setSelectedClient('');
    setClientDocument('');
    setOrigin('');
    setDestCity('');
    setDestUF('');
    setNotes('');
    setSaleItems([createEmptyItem()]);
    setNfFile(null);
    setNfeKey('');
    setEvidenceFile(null);
    setXmlSuccess(false);
    setMatchedProducer(null);
    setUnmatchedProducer(null);
    setProducerRegisteredNotice('');
    setMatchedClient(null);
    setUnmatchedClient(null);
    setClientRegisteredNotice('');
    setErrorMessage('');
    setSuccessMessage('');
  };

  // Prefill when in edit mode
  useEffect(() => {
    if (editingSale) {
      setOperationType(editingSale.operationType || 'Intermediação (Corretagem / Comissão)');
      setSaleDate(editingSale.saleDate || new Date().toISOString().split('T')[0]);
      
      if (editingSale.paymentTermDays !== undefined) {
        setPaymentTermDays(editingSale.paymentTermDays);
        const commonPresets = [0, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60];
        if (!commonPresets.includes(Number(editingSale.paymentTermDays))) {
          setCustomTermMode(true);
        }
      }
      if (editingSale.dueDate) {
        setDueDate(editingSale.dueDate);
      }

      setSelectedClient(editingSale.client || '');
      setClientDocument(editingSale.clientDocument || '');
      setOrigin(editingSale.origin || '');
      setDestCity(editingSale.destCity || '');
      setDestUF(editingSale.destUF || '');
      setNotes(editingSale.notes || '');
      setFreightType(editingSale.freightType || 'FOB (Retira na Origem)');
      setCarrierName(editingSale.carrierName || '');
      setTruckPlate(editingSale.truckPlate || '');
      setDriverName(editingSale.driverName || '');
      setDriverCPF(editingSale.driverCPF || '');
      setFeeType(editingSale.feeType || 'Porcentagem (%)');
      setFeeValue(editingSale.feeValue || 3.0);
      setNfFile(editingSale.nfFile || null);
      setNfeKey(editingSale.nfeKey || '');
      setEvidenceFile(editingSale.evidenceFile || null);

      if (editingSale.items && editingSale.items.length > 0) {
        const loaded = editingSale.items.map((it, idx) => {
          const rawProd = it.product || 'Cenoura';
          const isGr = rawProd.toLowerCase().includes('cebola') || rawProd.toLowerCase().includes('granel') || it.unit?.includes('Granel');
          const isBatata = rawProd.toLowerCase().includes('batata') || it.unit?.toLowerCase().includes('saca') || it.unit?.includes('25kg');
          const bw = it.boxWeightKg || (isGr ? 1 : (isBatata ? 25 : 29));
          const kg = it.kg || (it.quantity ? it.quantity * bw : 0);
          const pKg = it.pricePerKg || (kg > 0 && it.total ? (it.total / kg) : (it.price || 0));
          return {
            id: Date.now() + idx,
            product: rawProd,
            unit: it.unit || (isGr ? 'Granel (kg)' : (isBatata ? 'Sacas (25kg)' : 'Caixas (29kg)')),
            boxWeightKg: bw,
            totalKg: kg ? String(kg) : '',
            pricePerKg: pKg ? Number(Number(pKg).toFixed(4)).toString() : '',
            totalNf: it.total ? Number(Number(it.total).toFixed(2)).toString() : '',
            dailyQuote: it.dailyQuote ? String(it.dailyQuote) : (editingSale.dailyQuote ? String(editingSale.dailyQuote) : '')
          };
        });
        setSaleItems(loaded);
      } else {
        const rawProd = 'Cenoura';
        setSaleItems([{
          id: Date.now(),
          product: rawProd,
          unit: 'Caixas (29kg)',
          boxWeightKg: 29,
          totalKg: editingSale.totalKg ? String(editingSale.totalKg) : '',
          pricePerKg: editingSale.totalKg > 0 && editingSale.totalOperation ? Number((editingSale.totalOperation / editingSale.totalKg).toFixed(4)).toString() : '',
          totalNf: editingSale.totalOperation ? String(editingSale.totalOperation) : '',
          dailyQuote: editingSale.dailyQuote ? String(editingSale.dailyQuote) : ''
        }]);
      }
    }
  }, [editingSale]);

  useEffect(() => {
    api.get('/api/clients')
      .then(data => setClients(data || []))
      .catch(console.error);

    api.get('/api/products')
      .then(data => setProducts(data || []))
      .catch(console.error);
  }, []);

  // Helper to safely parse numbers with comma or dot (handles Brazilian and standard JS decimals)
  const parseNum = (val) => {
    if (val === '' || val === null || val === undefined) return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    let str = String(val).trim().replace(/R\$\s?/, '').replace(/\s+/g, '');
    if (str === '') return 0;

    // Se possui pontos e vírgulas: formato brasileiro "68.000,00" ou "1.250.000,50"
    if (str.includes('.') && str.includes(',')) {
      const clean = str.replace(/\./g, '').replace(',', '.');
      const n = parseFloat(clean);
      return isNaN(n) ? 0 : n;
    }

    // Se possui apenas vírgula: "68000,00" ou "3,40"
    if (str.includes(',')) {
      const n = parseFloat(str.replace(',', '.'));
      return isNaN(n) ? 0 : n;
    }

    // Se possui ponto como separador de milhar brasileiro: "20.000", "68.000", "56.360", "28.180" (blocos de 3 dígitos)
    if (/^\d{1,3}(\.\d{3})+$/.test(str)) {
      const clean = str.replace(/\./g, '');
      const n = parseFloat(clean);
      return isNaN(n) ? 0 : n;
    }

    // Se possui apenas ponto decimal: "68000.00" ou "3.4000" ou "20000"
    const n = parseFloat(str);
    return isNaN(n) ? 0 : n;
  };

  // Multi-item manipulation handlers
  const handleAddItem = () => {
    setSaleItems(prev => [...prev, createEmptyItem()]);
  };

  const handleRemoveItem = (index) => {
    if (saleItems.length <= 1) {
      setSaleItems([createEmptyItem()]);
      return;
    }
    setSaleItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleItemProductSelect = (index, prodName) => {
    setSaleItems(prev => {
      const copy = [...prev];
      const it = { ...copy[index], product: prodName };
      const catalogProd = products.find(p => p.name === prodName);
      if (catalogProd) {
        const defUnit = catalogProd.defaultUnit || (catalogProd.unitKg === 1 ? 'Granel (kg)' : (catalogProd.name.toLowerCase().includes('batata') ? 'Sacas (25kg)' : 'Caixas (29kg)'));
        it.unit = defUnit;
        it.boxWeightKg = defUnit.includes('Granel') || defUnit.includes('(kg)') || catalogProd.unitKg === 1 ? 1 : (catalogProd.unitKg || (catalogProd.name.toLowerCase().includes('batata') ? 25 : 29));
      } else {
        const nameL = prodName.toLowerCase();
        const isCebola = nameL.includes('cebola') || nameL.includes('granel');
        const isBatata = nameL.includes('batata');
        it.unit = isCebola ? 'Granel (kg)' : (isBatata ? 'Sacas (25kg)' : 'Caixas (29kg)');
        it.boxWeightKg = isCebola ? 1 : (isBatata ? 25 : 29);
      }
      const kg = parseNum(it.totalKg);
      const p = parseNum(it.pricePerKg);
      if (kg > 0 && p > 0) {
        it.totalNf = (kg * p).toFixed(2);
      }
      copy[index] = it;
      return copy;
    });
  };

  const handleItemFieldChange = (index, field, value) => {
    setSaleItems(prev => {
      const copy = [...prev];
      const it = { ...copy[index], [field]: value };
      const kg = parseNum(field === 'totalKg' ? value : it.totalKg);
      const p = parseNum(field === 'pricePerKg' ? value : it.pricePerKg);
      const nf = parseNum(field === 'totalNf' ? value : it.totalNf);

      if (field === 'totalKg') {
        if (kg > 0 && p > 0) {
          const tot = Number((kg * p).toFixed(2));
          it.totalNf = tot > 0 ? tot.toFixed(2) : '';
        } else if (kg > 0 && nf > 0) {
          const unitP = Number((nf / kg).toFixed(4));
          it.pricePerKg = unitP > 0 ? unitP.toString() : '';
        }
      } else if (field === 'pricePerKg') {
        if (kg > 0 && p > 0) {
          const tot = Number((kg * p).toFixed(2));
          it.totalNf = tot > 0 ? tot.toFixed(2) : '';
        }
      } else if (field === 'totalNf') {
        if (kg > 0 && nf > 0) {
          const unitP = Number((nf / kg).toFixed(4));
          it.pricePerKg = unitP > 0 ? unitP.toString() : '';
        }
      } else if (field === 'unit') {
        if (value.includes('Granel') || value.includes('(kg)')) {
          it.boxWeightKg = 1;
        } else if (value.includes('50kg')) {
          it.boxWeightKg = 50;
        } else if (value.includes('25kg')) {
          it.boxWeightKg = 25;
        } else if (value.includes('20kg')) {
          it.boxWeightKg = 20;
        } else if (value.includes('29kg')) {
          it.boxWeightKg = 29;
        } else if (value.includes('60kg')) {
          it.boxWeightKg = 60;
        }
      } else if (field === 'boxWeightKg') {
        it.boxWeightKg = parseNum(value) || 1;
      }
      copy[index] = it;
      return copy;
    });
  };

  const handleClientSelect = (clientName) => {
    setSelectedClient(clientName);
    const cli = clients.find(c => c.name === clientName);
    if (cli) {
      setClientDocument(cli.document || '');
      if (cli.city) setDestCity(cli.city);
      if (cli.state || cli.uf) setDestUF(cli.state || cli.uf);
    } else {
      setClientDocument('');
      setDestCity('');
      setDestUF('');
    }
  };

  // Aggregated totals across all items
  const totalWeightKg = saleItems.reduce((acc, it) => acc + parseNum(it.totalKg), 0);
  
  const totalVolumes = saleItems.reduce((acc, it) => {
    const kg = parseNum(it.totalKg);
    const bw = parseNum(it.boxWeightKg) || (it.unit?.includes('Granel') ? 1 : (it.unit?.includes('25kg') || it.product?.toLowerCase().includes('batata') ? 25 : 29));
    const isGr = (it.unit && it.unit.includes('Granel')) || (it.product && it.product.toLowerCase().includes('cebola')) || bw === 1;
    return acc + (isGr ? kg : (bw > 0 ? (kg / bw) : 0));
  }, 0);

  const totalCaixas29kg = saleItems.reduce((acc, it) => {
    const kg = parseNum(it.totalKg);
    const bw = parseNum(it.boxWeightKg) || (it.unit?.includes('Granel') ? 1 : (it.unit?.includes('25kg') || it.product?.toLowerCase().includes('batata') ? 25 : 29));
    const isGr = (it.unit && it.unit.includes('Granel')) || (it.product && it.product.toLowerCase().includes('cebola')) || bw === 1;
    return acc + (isGr ? (kg / 29) : (bw > 0 ? (kg / bw) : 0));
  }, 0);

  const effectiveTotalNF = saleItems.reduce((acc, it) => {
    const kg = parseNum(it.totalKg);
    const p = parseNum(it.pricePerKg);
    const nf = it.totalNf !== '' && it.totalNf !== undefined ? parseNum(it.totalNf) : (kg * p);
    return acc + nf;
  }, 0);

  const valorTotalVP = saleItems.reduce((acc, it) => {
    const kg = parseNum(it.totalKg);
    const bw = parseNum(it.boxWeightKg) || (it.unit?.includes('Granel') ? 1 : 29);
    const isGr = (it.unit && it.unit.includes('Granel')) || (it.product && it.product.toLowerCase().includes('cebola')) || bw === 1;
    const vol = isGr ? kg : (bw > 0 ? (kg / bw) : 0);
    const q = parseNum(it.dailyQuote);
    if (q <= 0) {
      const p = parseNum(it.pricePerKg);
      const nf = it.totalNf !== '' && it.totalNf !== undefined ? parseNum(it.totalNf) : (kg * p);
      return acc + nf;
    }
    const isQKg = (q > 0 && q <= 10.0) || isGr;
    return acc + (isQKg ? (kg * q) : (vol * q));
  }, 0);

  const funrural = calculateFunrural(effectiveTotalNF);
  const baseComercial = valorTotalVP > 0 ? valorTotalVP : effectiveTotalNF;
  const liquidoAReceber = Math.max(0, baseComercial - funrural.funruralTotal);
  const totalCommission = feeType === 'Porcentagem (%)' 
    ? (baseComercial * (Number(feeValue) / 100))
    : (feeType === 'Valor Fixo por Saca/Volume' ? totalVolumes * Number(feeValue) : Number(feeValue));

  // Dynamic Title
  const getPageTitle = () => {
    if (editingSale) {
      return `Editar Venda ${editingSale.id}`;
    }
    switch (operationType) {
      case 'Intermediação (Corretagem / Comissão)':
        return 'Venda por Corretagem / Intermediação';
      case 'Revenda Padrão (Compra e Venda)':
        return 'Venda por Revenda Padrão (Compra e Venda)';
      case 'Venda Particular / Repasse Direto':
        return 'Venda Particular / Repasse Direto (VP)';
      case 'Venda de Estoque Próprio':
        return 'Venda de Estoque Próprio';
      default:
        return 'Nova Venda Agrícola';
    }
  };

  const handleXmlUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setNfFile(file.name);
    setXmlParsing(true);
    setErrorMessage('');
    setXmlSuccess(false);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const data = await api.upload('/api/nfe/parse', formData);
      setNfeKey(data?.nfeKey || '');
      setNfFile(data.filename || file.name);
      if (data.saleDate) setSaleDate(data.saleDate);
      if (data.notes && !notes) setNotes(data.notes);

      // 🏪 VÍNCULO INTELIGENTE DO CLIENTE / COMPRADOR (DESTINATÁRIO DA NOTA FISCAL)
      if (data.dest?.name || data.dest?.document) {
        const rawDestDoc = (data.dest.document || '').replace(/\D/g, '');
        const destNameClean = (data.dest.name || '').trim().toLowerCase();

        const foundCli = clients.find(c => {
          const cDoc = (c.document || '').replace(/\D/g, '');
          const cName = (c.name || '').trim().toLowerCase();
          const docMatch = rawDestDoc && cDoc && rawDestDoc === cDoc;
          const nameMatch = destNameClean && cName && (cName === destNameClean || cName.includes(destNameClean) || destNameClean.includes(cName));
          return docMatch || nameMatch;
        });

        if (foundCli) {
          setMatchedClient(foundCli);
          setUnmatchedClient(null);
          setClientRegisteredNotice('');
          setSelectedClient(foundCli.name);
          setClientDocument(foundCli.document || data.dest.document || '');
          setDestCity(foundCli.city || data.dest.city || '');
          setDestUF(foundCli.uf || foundCli.state || data.dest.uf || '');
        } else {
          setMatchedClient(null);
          setUnmatchedClient({
            name: data.dest.name || 'Cliente Comprador',
            document: data.dest.document || '',
            ie: data.dest.ie || '',
            city: data.dest.city || '',
            uf: data.dest.uf || '',
            address: data.dest.address || ''
          });
          setClientRegisteredNotice('');
          setSelectedClient(data.dest.name || '');
          setClientDocument(data.dest.document || '');
          setDestCity(data.dest.city || '');
          setDestUF(data.dest.uf || '');
        }
      }

      if (data.emit?.originText) {
        setOrigin(data.emit.originText);
      }

      // 🌾 VÍNCULO INTELIGENTE DO PRODUTOR (EMITENTE DA NOTA FISCAL)
      if (data.emit?.name || data.emit?.document) {
        const rawDoc = (data.emit.document || '').replace(/\D/g, '');
        const emitNameClean = (data.emit.name || '').trim().toLowerCase();

        const foundProd = clients.find(c => {
          const cDoc = (c.document || '').replace(/\D/g, '');
          const cName = (c.name || '').trim().toLowerCase();
          const docMatch = rawDoc && cDoc && rawDoc === cDoc;
          const nameMatch = emitNameClean && cName && (cName === emitNameClean || cName.includes(emitNameClean) || emitNameClean.includes(cName));
          return docMatch || nameMatch;
        });

        if (foundProd) {
          setMatchedProducer(foundProd);
          setUnmatchedProducer(null);
          setProducerRegisteredNotice('');
          if (!origin || origin.toLowerCase().includes('fazenda') || origin.toLowerCase().includes('silo')) {
            setOrigin(foundProd.name + (foundProd.city ? ` (${foundProd.city}/${foundProd.uf || foundProd.state || 'GO'})` : ''));
          }
        } else {
          setMatchedProducer(null);
          setUnmatchedProducer({
            name: data.emit.name || 'Produtor Rural',
            document: data.emit.document || '',
            ie: data.emit.ie || '',
            city: data.emit.city || '',
            uf: data.emit.uf || '',
            address: data.emit.address || ''
          });
        }
      }

      if (data.truckPlate) setTruckPlate(data.truckPlate);
      if (data.carrierName) setCarrierName(data.carrierName);

      // Multi-Item XML/PDF Mapping
      if (data.items && data.items.length > 0) {
        const importedItems = data.items.map((it, idx) => {
          const rawName = (it.product || '').toLowerCase();
          const matchedCatalogProd = products.find(p => {
            const pL = p.name.toLowerCase();
            return pL === rawName ||
              (rawName.includes('especial') && pL.includes('especial')) ||
              (rawName.includes('miuda') && pL.includes('miuda')) ||
              (rawName.includes('miúda') && pL.includes('miúda')) ||
              (rawName.includes('cenoura') && pL.includes('cenoura')) ||
              (rawName.includes('cebola') && pL.includes('cebola')) ||
              (rawName.includes('beterraba') && pL.includes('beterraba'));
          });

          const resolvedProdName = matchedCatalogProd?.name || it.product || 'Batata Especial';
          const resolvedUnit = it.unit || matchedCatalogProd?.defaultUnit || 'Sacas (25kg)';
          const boxW = it.boxWeightKg || matchedCatalogProd?.unitKg || (resolvedUnit.includes('25kg') ? 25 : (resolvedUnit.includes('20kg') ? 20 : (resolvedUnit.includes('Granel') ? 1 : 29)));
          const itemKg = it.kg || (it.quantity ? it.quantity * boxW : 0);
          const rawPrice = it.pricePerKg ? Number(it.pricePerKg) : (itemKg > 0 && it.total ? (Number(it.total) / itemKg) : (it.price ? Number(it.price) : 0));
          const itemPricePerKg = rawPrice > 0 ? Number(rawPrice.toFixed(4)).toString() : '';
          const itemTotNf = it.total ? Number(Number(it.total).toFixed(2)).toString() : (itemKg > 0 && rawPrice > 0 ? (itemKg * rawPrice).toFixed(2) : '');

          return {
            id: Date.now() + idx,
            product: resolvedProdName,
            unit: resolvedUnit,
            boxWeightKg: boxW,
            totalKg: itemKg ? String(itemKg) : '',
            pricePerKg: itemPricePerKg,
            totalNf: itemTotNf,
            dailyQuote: ''
          };
        });

        setSaleItems(importedItems);
      } else if (data.totalKg && data.totalKg > 0) {
        setSaleItems([{
          id: Date.now(),
          product: 'Cenoura',
          unit: 'Caixas (29kg)',
          boxWeightKg: 29,
          totalKg: String(data.totalKg),
          pricePerKg: data.totalOperation ? (data.totalOperation / data.totalKg).toFixed(4) : '',
          totalNf: data.totalOperation ? Number(data.totalOperation).toFixed(2) : '',
          dailyQuote: ''
        }]);
      }

      // Check if this NF-e was already imported in another sale
      if (data.nfeKey) {
        try {
          const chkData = await api.get(`/api/sales/check-nfe/${data.nfeKey}`);
          if (chkData && chkData.exists && (!editingSale || editingSale.id !== chkData.saleId)) {
            setDuplicateWarning(`Atenção: Esta NF-e (Chave final ...${data.nfeKey.slice(-8)}) já foi cadastrada na venda ${chkData.saleId} (${chkData.client}).`);
          } else {
            setDuplicateWarning('');
          }
        } catch (e) {
          console.error(e);
        }
      }

      setXmlSuccess(true);
    } catch (err) {
      console.error(err);
      setErrorMessage(`Erro ao importar NF-e XML: ${err.message}`);
    } finally {
      setXmlParsing(false);
    }
  };

  const handleQuickRegisterProducer = async () => {
    if (!unmatchedProducer) return;
    setRegisteringProducer(true);
    setErrorMessage('');
    try {
      const newProd = await api.post('/api/clients', {
        name: unmatchedProducer.name,
        document: unmatchedProducer.document,
        ie: unmatchedProducer.ie,
        type: 'Produtor',
        city: unmatchedProducer.city,
        uf: unmatchedProducer.uf,
        address: unmatchedProducer.address
      });

      setClients(prev => [...prev, newProd]);
      setMatchedProducer(newProd);
      setUnmatchedProducer(null);
      setProducerRegisteredNotice(`Produtor "${newProd.name}" cadastrado e vinculado com sucesso!`);
      setOrigin(newProd.name + (newProd.city ? ` (${newProd.city}/${newProd.uf})` : ''));
    } catch (err) {
      console.error(err);
      setErrorMessage(`Erro ao cadastrar produtor: ${err.message}`);
    } finally {
      setRegisteringProducer(false);
    }
  };

  const handleQuickRegisterClient = async () => {
    if (!unmatchedClient) return;
    setRegisteringClient(true);
    setErrorMessage('');
    try {
      const newCli = await api.post('/api/clients', {
        name: unmatchedClient.name,
        document: unmatchedClient.document,
        ie: unmatchedClient.ie,
        type: 'Comprador',
        city: unmatchedClient.city,
        uf: unmatchedClient.uf,
        address: unmatchedClient.address
      });

      setClients(prev => [...prev, newCli]);
      setMatchedClient(newCli);
      setUnmatchedClient(null);
      setClientRegisteredNotice(`Cliente Comprador "${newCli.name}" cadastrado e vinculado com sucesso!`);
      setSelectedClient(newCli.name);
      setClientDocument(newCli.document || '');
      setDestCity(newCli.city || '');
      setDestUF(newCli.uf || '');
    } catch (err) {
      console.error(err);
      setErrorMessage(`Erro ao cadastrar cliente comprador: ${err.message}`);
    } finally {
      setRegisteringClient(false);
    }
  };

  const handleEvidenceUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const data = await api.upload('/api/upload', formData);
      setEvidenceFile(data?.filename || file.name);
      setSuccessMessage('Comprovante/Anexo da venda carregado com sucesso!');
      setTimeout(() => setSuccessMessage(''), 3500);
    } catch (err) {
      console.error(err);
      setEvidenceFile(file.name);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    if (!selectedClient) {
      setErrorMessage('Por favor, selecione ou informe o cliente comprador.');
      setSubmitting(false);
      return;
    }

    const hasEmptyProduct = saleItems.some(it => !it.product || !it.product.trim());
    if (hasEmptyProduct) {
      setErrorMessage('Por favor, selecione o produto para todos os itens da venda.');
      setSubmitting(false);
      return;
    }

    const hasInvalidWeight = saleItems.some(it => !it.totalKg || Number(it.totalKg) <= 0);
    if (hasInvalidWeight) {
      setErrorMessage('Por favor, informe o peso (kg) válido para todos os itens da venda.');
      setSubmitting(false);
      return;
    }

    try {
      const formattedItems = saleItems.map(it => {
        const kg = parseNum(it.totalKg);
        const bw = parseNum(it.boxWeightKg) || (it.unit?.includes('Granel') ? 1 : (it.unit?.includes('25kg') || it.product?.toLowerCase().includes('batata') ? 25 : 29));
        const isGr = (it.unit && it.unit.includes('Granel')) || (it.product && it.product.toLowerCase().includes('cebola')) || bw === 1;
        const vol = isGr ? kg : (bw > 0 ? (kg / bw) : 0);
        const p = parseNum(it.pricePerKg);
        const itNf = it.totalNf !== '' && it.totalNf !== undefined ? parseNum(it.totalNf) : (kg * p);
        const q = parseNum(it.dailyQuote);
        const isQKg = (q > 0 && q <= 10.0) || isGr;
        const itVP = q > 0 ? (isQKg ? (kg * q) : (vol * q)) : itNf;

        return {
          product: it.product || 'Produto Agrícola',
          unit: it.unit || (isGr ? 'Granel (kg)' : (it.product?.toLowerCase().includes('batata') ? 'Sacas (25kg)' : 'Caixas (29kg)')),
          boxWeightKg: bw,
          kg: kg,
          quantity: vol,
          price: isGr ? p : (p * bw),
          pricePerKg: p,
          total: itNf,
          dailyQuote: q,
          valorTotalVP: itVP
        };
      });

      const productNamesSummary = saleItems.map(it => it.product).filter(Boolean).join(' + ');
      const autoSummary = `Venda de ${productNamesSummary || 'Produtos'} | Pesagem: ${totalWeightKg.toLocaleString('pt-BR')} kg (${totalVolumes.toFixed(0)} vol) | NF: R$ ${effectiveTotalNF.toFixed(2)} | Vencimento: ${dueDate ? dueDate.split('-').reverse().join('/') : ''}`;
      const finalNotes = notes && notes.trim() ? notes.trim() : autoSummary;

      const payload = {
        operationType,
        saleDate,
        client: selectedClient,
        clientDocument,
        origin: origin || 'Produtor Rural',
        destCity: destCity || 'São Paulo',
        destUF: destUF || 'SP',
        notes: finalNotes,
        nfFile,
        nfeKey,
        evidenceFile,
        paymentTerms: Number(paymentTermDays) === 0 ? 'À Vista' : `${paymentTermDays} dias`,
        paymentTermDays: Number(paymentTermDays) || 0,
        dueDate,
        dailyQuote: saleItems[0]?.dailyQuote ? Number(saleItems[0].dailyQuote) : 0,
        valorTotalVP: Number(valorTotalVP) || 0,
        freightType,
        carrierName,
        truckPlate,
        driverName,
        driverCPF,
        items: formattedItems,
        feeType,
        feeValue,
        totalVolumes: totalVolumes,
        totalKg: totalWeightKg,
        totalOperation: effectiveTotalNF,
        totalCommission: totalCommission,
        funruralTotal: funrural.funruralTotal,
        previdenciaSocial: funrural.previdencia,
        rat: funrural.rat,
        senar: funrural.senar
      };

      let result;
      if (editingSale) {
        result = await api.put(`/api/sales/${editingSale.id}`, payload);
      } else {
        result = await api.post('/api/sales', payload);
      }

      const msg = editingSale ? `Venda ${editingSale.id} atualizada com sucesso!` : `Venda ${result?.id || ''} gravada com sucesso!`;
      setSuccessMessage(msg);
      setTimeout(() => {
        if (onSaleCreated) onSaleCreated();
        setCurrentPage('sales-history');
      }, 1000);
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || (editingSale ? 'Erro ao atualizar a venda.' : 'Erro ao registrar a venda.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-[#091b2e] tracking-wider uppercase">
            <span className="hover:underline cursor-pointer" onClick={() => setCurrentPage('dashboard')}>INICIO</span> / <span className="hover:underline cursor-pointer" onClick={() => setCurrentPage('sales-history')}>VENDAS</span>
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 mt-1">
            {getPageTitle()}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {editingSale ? `Editando todos os dados da operação ${editingSale.id}. Altere os valores desejados e salve.` : 'Preencha os dados da operação ou importe via XML de NF-e. O Valor Total da NF é livremente editável.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {editingSale ? (
            <button
              type="button"
              onClick={onCancelEdit || (() => setCurrentPage('sales-history'))}
              className="bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 text-xs font-semibold px-3.5 py-2 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            >
              Cancelar Edição
            </button>
          ) : (
            <button
              type="button"
              onClick={resetForm}
              className="bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 text-xs font-semibold px-3.5 py-2 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Limpar todos os campos do formulário"
            >
              <RotateCcw className="w-3.5 h-3.5 text-gray-500" />
              Limpar Formulário
            </button>
          )}

          <button
            type="button"
            onClick={() => setCurrentPage('sales-history')}
            className="bg-[#091b2e] hover:bg-[#132c4a] text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            Ver Histórico de Vendas
          </button>
        </div>
      </div>

      {/* XML Alert */}
      {xmlSuccess && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-lg flex items-center justify-between text-xs shadow-sm">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
            <span><strong>Parser de NF-e concluído!</strong> Pesos, valores da NF e destinatário importados com sucesso.</span>
          </div>
        </div>
      )}

      {/* Vínculos Inteligentes de NF-e, Cadastro Rápido e Alerta de Duplicidade (Modular) */}
      <NfeMatchingCards
        matchedClient={matchedClient}
        unmatchedClient={unmatchedClient}
        registeringClient={registeringClient}
        clientRegisteredNotice={clientRegisteredNotice}
        handleQuickRegisterClient={handleQuickRegisterClient}
        matchedProducer={matchedProducer}
        unmatchedProducer={unmatchedProducer}
        registeringProducer={registeringProducer}
        producerRegisteredNotice={producerRegisteredNotice}
        handleQuickRegisterProducer={handleQuickRegisterProducer}
        duplicateWarning={duplicateWarning}
      />

      {/* Notifications */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-3 rounded-lg flex items-center gap-2 text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="bg-red-50 border border-red-300 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2 text-sm">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Form (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Card: Seleção de Cliente e Grade de Produtos Multi-Item (Modular) */}
          <SaleItemsTable
            saleItems={saleItems}
            clients={clients}
            products={products}
            selectedClient={selectedClient}
            onClientSelect={handleClientSelect}
            onAddItem={handleAddItem}
            onRemoveItem={handleRemoveItem}
            onItemProductSelect={handleItemProductSelect}
            onItemFieldChange={handleItemFieldChange}
            totalWeightKg={totalWeightKg}
            totalVolumes={totalVolumes}
            valorTotalVP={valorTotalVP}
            funrural={funrural}
            liquidoAReceber={liquidoAReceber}
            effectiveTotalNF={effectiveTotalNF}
          />

          {/* Card: Dados Gerais da Emissão */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-3 gap-2">
              <h2 className="text-sm font-bold text-gray-900">Dados da Emissão & Faturamento</h2>
              
              <div className="flex flex-wrap items-center gap-2">
                {/* Botão 1: Importar NF-e (XML/PDF) */}
                {nfFile ? (
                  <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-300 px-2.5 py-1 rounded-lg text-xs" title={`Arquivo: ${getCleanFileName(nfFile)}`}>
                    <FileText className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span className="font-bold text-emerald-950 max-w-[180px] truncate" title={getCleanFileName(nfFile)}>{getCleanFileName(nfFile)}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setNfFile(null);
                        setNfeKey('');
                        setXmlSuccess(false);
                      }}
                      className="ml-1 text-red-600 hover:text-red-800 p-0.5 rounded transition-colors font-bold cursor-pointer"
                      title="Excluir / Desanexar Nota Fiscal"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-[#091b2e] hover:underline cursor-pointer bg-slate-100 px-3 py-1 rounded-lg border border-slate-300 hover:bg-slate-200 transition-colors">
                    <Paperclip className="w-3.5 h-3.5 text-[#091b2e]" />
                    <span>Importar NF-e (XML/PDF)</span>
                    <input type="file" accept=".pdf,.xml" onChange={handleXmlUpload} className="hidden" />
                  </label>
                )}

                {/* Botão 2: Anexo Venda (Comprovantes, Canhotos, Fotos) */}
                {evidenceFile ? (
                  <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-300 px-2.5 py-1 rounded-lg text-xs" title={`Anexo: ${getCleanFileName(evidenceFile)}`}>
                    <Paperclip className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                    <span className="font-bold text-blue-950 max-w-[180px] truncate" title={getCleanFileName(evidenceFile)}>{getCleanFileName(evidenceFile)}</span>
                    <button
                      type="button"
                      onClick={() => setEvidenceFile(null)}
                      className="ml-1 text-red-600 hover:text-red-800 p-0.5 rounded transition-colors font-bold cursor-pointer"
                      title="Remover anexo da venda"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-[#091b2e] hover:underline cursor-pointer bg-slate-50 px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors" title="Anexar foto de canhoto, comprovante ou romaneio">
                    <Paperclip className="w-3.5 h-3.5 text-[#091b2e]" />
                    <span>Anexo Venda</span>
                    <input type="file" accept="image/*,.pdf" onChange={handleEvidenceUpload} className="hidden" />
                  </label>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Tipo de Operação</label>
                <select
                  value={operationType}
                  onChange={(e) => setOperationType(e.target.value)}
                  className="w-full bg-white border border-gray-300 text-gray-800 text-xs rounded-lg px-3 py-2.5 outline-none font-semibold focus:ring-2 focus:ring-[#091b2e]"
                >
                  {operationTypes.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Data da Operação (VP / Emissão)</label>
                <input
                  type="date"
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                  className="w-full bg-white border border-gray-300 text-gray-800 text-xs rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#091b2e]"
                />
              </div>
            </div>

            {/* Prazo de Recebimento & Data Prevista de Vencimento */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-emerald-50/40 p-3.5 rounded-xl border border-emerald-100">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-gray-800 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Prazo de Recebimento da Venda *</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setCustomTermMode(!customTermMode)}
                    className="text-[11px] text-emerald-800 hover:underline font-semibold cursor-pointer"
                  >
                    {customTermMode ? 'Ver opções padrão' : 'Digitar dias livre'}
                  </button>
                </div>

                {customTermMode ? (
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="365"
                      placeholder="Ex: 30"
                      value={paymentTermDays}
                      onChange={(e) => setPaymentTermDays(e.target.value)}
                      className="w-full bg-white border border-gray-300 text-gray-800 text-xs rounded-lg px-3 py-2.5 outline-none font-bold focus:ring-2 focus:ring-[#091b2e]"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-semibold">dias</span>
                  </div>
                ) : (
                  <select
                    value={paymentTermDays}
                    onChange={(e) => {
                      if (e.target.value === 'custom') {
                        setCustomTermMode(true);
                      } else {
                        setPaymentTermDays(Number(e.target.value));
                      }
                    }}
                    className="w-full bg-white border border-gray-300 text-gray-800 text-xs rounded-lg px-3 py-2.5 outline-none font-bold focus:ring-2 focus:ring-[#091b2e] cursor-pointer"
                  >
                    <option value={0}>À Vista (0 dias)</option>
                    <option value={10}>10 dias</option>
                    <option value={15}>15 dias</option>
                    <option value={20}>20 dias</option>
                    <option value={25}>25 dias</option>
                    <option value={30}>30 dias (Padrão Agro)</option>
                    <option value={35}>35 dias</option>
                    <option value={40}>40 dias</option>
                    <option value={45}>45 dias</option>
                    <option value={50}>50 dias</option>
                    <option value={60}>60 dias</option>
                    <option value="custom">Outro Prazo (Personalizado)...</option>
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Data Prevista de Vencimento</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => handleDueDateChange(e.target.value)}
                    className="w-full bg-white border border-gray-300 text-gray-800 text-xs rounded-lg px-3 py-2.5 outline-none font-bold focus:ring-2 focus:ring-[#091b2e]"
                  />
                  <div className="shrink-0 bg-emerald-100 text-emerald-950 px-2.5 py-2 rounded-lg text-[11px] font-bold text-center border border-emerald-300">
                    {Number(paymentTermDays) === 0 ? 'À Vista' : `+${paymentTermDays} dias`}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-gray-700">Remetente (Produtor Rural)</label>
                  <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                    Padronização Automática
                  </span>
                </div>
                <input
                  type="text"
                  list="producers-datalist"
                  placeholder="Selecione ou digite o Produtor Rural..."
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  className="w-full bg-white border border-gray-300 text-gray-800 text-xs rounded-lg px-3 py-2.5 outline-none font-semibold focus:ring-2 focus:ring-[#091b2e]"
                />
                <datalist id="producers-datalist">
                  <option value="BRUNO PERES ROMEIRO (Campo Alegre de Goiás/GO)" />
                  <option value="CARLOS CESAR CANTELE (NOVA PONTE/MG)" />
                  {clients
                    .filter(c => (c.type || '').toLowerCase().includes('produtor') || c.type === 'Produtor Rural')
                    .map(c => {
                      const formatted = `${c.name}${c.city ? ` (${c.city}/${c.uf || c.state || 'MG'})` : ''}`;
                      return <option key={c.id || c._id} value={formatted} />;
                    })}
                </datalist>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  <button
                    type="button"
                    onClick={() => setOrigin('BRUNO PERES ROMEIRO (Campo Alegre de Goiás/GO)')}
                    className={`text-[10px] px-2 py-0.5 rounded font-bold transition-all border ${origin.includes('BRUNO PERES') ? 'bg-[#091b2e] text-white border-[#091b2e]' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300'}`}
                  >
                    🌾 Bruno Peres Romeiro
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrigin('CARLOS CESAR CANTELE (NOVA PONTE/MG)')}
                    className={`text-[10px] px-2 py-0.5 rounded font-bold transition-all border ${origin.includes('CANTELE') ? 'bg-[#091b2e] text-white border-[#091b2e]' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300'}`}
                  >
                    🌾 Carlos Cesar Cantele
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Cidade Destino</label>
                  <input
                    type="text"
                    placeholder="Ex: São Paulo"
                    value={destCity}
                    onChange={(e) => setDestCity(e.target.value)}
                    className="w-full bg-white border border-gray-300 text-gray-800 text-xs rounded-lg px-3 py-2.5 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">UF</label>
                  <input
                    type="text"
                    maxLength={2}
                    placeholder="SP"
                    value={destUF}
                    onChange={(e) => setDestUF(e.target.value)}
                    className="w-full bg-white border border-gray-300 text-gray-800 text-xs rounded-lg px-3 py-2.5 uppercase outline-none"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Observações da Negociação</label>
              <textarea
                rows={2}
                placeholder="Observações complementares, dados de pagamento, frete ou vencimento..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-white border border-gray-300 text-xs rounded-lg p-2.5 outline-none"
              />
            </div>
          </div>

          {/* Card: Comissão de Corretagem (Modular) */}
          <SaleCommissionCard
            feeType={feeType}
            setFeeType={setFeeType}
            feeValue={feeValue}
            setFeeValue={setFeeValue}
          />
        </div>

        {/* Right Sidebar: Resumo Financeiro Consolidado (Modular) */}
        <div className="lg:col-span-4 space-y-6">
          <SaleFiscalSummary
            saleItems={saleItems}
            totalWeightKg={totalWeightKg}
            totalVolumes={totalVolumes}
            effectiveTotalNF={effectiveTotalNF}
            funrural={funrural}
            liquidoAReceber={liquidoAReceber}
            valorTotalVP={valorTotalVP}
            feeValue={feeValue}
            totalCommission={totalCommission}
            submitting={submitting}
          />
        </div>
      </form>
    </div>
  );
}
