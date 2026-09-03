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
import { formatCurrency, formatKg, formatNumber } from '../utils/formatters';
import { calculateSummary, calculateFunrural } from '../utils/calculations';

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
          const bw = it.boxWeightKg || (isGr ? 1 : 29);
          const kg = it.kg || (it.quantity ? it.quantity * bw : 0);
          const pKg = it.pricePerKg || (kg > 0 && it.total ? (it.total / kg) : (it.price || 0));
          return {
            id: Date.now() + idx,
            product: rawProd,
            unit: it.unit || (isGr ? 'Granel (kg)' : 'Caixas (29kg)'),
            boxWeightKg: bw,
            totalKg: kg ? String(kg) : '',
            pricePerKg: pKg ? Number(pKg).toFixed(4) : '',
            totalNf: it.total ? Number(it.total).toFixed(2) : '',
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
          pricePerKg: editingSale.totalKg > 0 && editingSale.totalOperation ? (editingSale.totalOperation / editingSale.totalKg).toFixed(4) : '',
          totalNf: editingSale.totalOperation ? String(editingSale.totalOperation) : '',
          dailyQuote: editingSale.dailyQuote ? String(editingSale.dailyQuote) : ''
        }]);
      }
    }
  }, [editingSale]);

  useEffect(() => {
    fetch('/api/clients')
      .then(res => res.json())
      .then(data => setClients(data))
      .catch(console.error);

    fetch('/api/products')
      .then(res => res.json())
      .then(data => setProducts(data))
      .catch(console.error);
  }, []);

  // Helper to safely parse numbers with comma or dot
  const parseNum = (val) => {
    if (val === '' || val === null || val === undefined) return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    const clean = String(val).trim().replace(/\./g, '').replace(',', '.');
    const n = parseFloat(clean);
    if (!isNaN(n)) return n;
    const direct = parseFloat(String(val).replace(',', '.'));
    return isNaN(direct) ? 0 : direct;
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
        const defUnit = catalogProd.defaultUnit || (catalogProd.unitKg === 1 ? 'Granel (kg)' : (catalogProd.name.toLowerCase().includes('batata') ? 'Sacas (50kg)' : 'Caixas (29kg)'));
        it.unit = defUnit;
        it.boxWeightKg = defUnit.includes('Granel') || defUnit.includes('(kg)') || catalogProd.unitKg === 1 ? 1 : (catalogProd.unitKg || (catalogProd.name.toLowerCase().includes('batata') ? 50 : 29));
      } else {
        const nameL = prodName.toLowerCase();
        const isCebola = nameL.includes('cebola') || nameL.includes('granel');
        const isBatata = nameL.includes('batata');
        it.unit = isCebola ? 'Granel (kg)' : (isBatata ? 'Sacas (50kg)' : 'Caixas (29kg)');
        it.boxWeightKg = isCebola ? 1 : (isBatata ? 50 : 29);
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
          it.totalNf = (kg * p).toFixed(2);
        } else if (kg > 0 && nf > 0) {
          it.pricePerKg = (nf / kg).toFixed(4);
        }
      } else if (field === 'pricePerKg') {
        if (kg > 0) {
          it.totalNf = (kg * p).toFixed(2);
        }
      } else if (field === 'totalNf') {
        if (kg > 0 && nf >= 0) {
          it.pricePerKg = (nf / kg).toFixed(4);
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
    const bw = parseNum(it.boxWeightKg) || (it.unit?.includes('Granel') ? 1 : 29);
    const isGr = (it.unit && it.unit.includes('Granel')) || (it.product && it.product.toLowerCase().includes('cebola')) || bw === 1;
    return acc + (isGr ? kg : (bw > 0 ? (kg / bw) : 0));
  }, 0);

  const totalCaixas29kg = saleItems.reduce((acc, it) => {
    const kg = parseNum(it.totalKg);
    const bw = parseNum(it.boxWeightKg) || (it.unit?.includes('Granel') ? 1 : 29);
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
  const liquidoAReceber = Math.max(0, effectiveTotalNF - funrural.funruralTotal);
  const totalCommission = feeType === 'Porcentagem (%)' 
    ? (valorTotalVP * (Number(feeValue) / 100))
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

      const res = await fetch('/api/nfe/parse', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        throw new Error('Falha ao interpretar arquivo XML');
      }

      const data = await res.json();
      setNfeKey(data.nfeKey || '');
      setNfFile(data.filename || file.name);
      if (data.saleDate) setSaleDate(data.saleDate);

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
          const matchedCatalogProd = products.find(p => 
            rawName.includes(p.name.toLowerCase()) || 
            p.name.toLowerCase().includes(rawName) ||
            (rawName.includes('cenoura') && p.name.includes('Cenoura')) ||
            (rawName.includes('cebola') && p.name.includes('Cebola')) ||
            (rawName.includes('beterraba') && p.name.includes('Beterraba')) ||
            (rawName.includes('batata') && p.name.includes('Batata'))
          );

          const resolvedProdName = matchedCatalogProd?.name || it.product || 'Produto Agrícola';
          const resolvedUnit = matchedCatalogProd?.defaultUnit || it.unit || 'Caixas (29kg)';
          const boxW = matchedCatalogProd?.unitKg || it.boxWeightKg || (resolvedUnit.includes('Granel') ? 1 : 29);
          const itemKg = it.kg || (it.quantity ? it.quantity * boxW : 0);
          const itemPrice = it.price ? Number(it.price).toFixed(4) : '';
          const itemTotNf = it.total ? Number(it.total).toFixed(2) : (itemKg > 0 && itemPrice ? (itemKg * Number(itemPrice)).toFixed(2) : '');

          return {
            id: Date.now() + idx,
            product: resolvedProdName,
            unit: resolvedUnit,
            boxWeightKg: boxW,
            totalKg: itemKg ? String(itemKg) : '',
            pricePerKg: itemPrice,
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
          const chkRes = await fetch(`/api/sales/check-nfe/${data.nfeKey}`);
          if (chkRes.ok) {
            const chkData = await chkRes.json();
            if (chkData.exists && (!editingSale || editingSale.id !== chkData.saleId)) {
              setDuplicateWarning(`Atenção: Esta NF-e (Chave final ...${data.nfeKey.slice(-8)}) já foi cadastrada na venda ${chkData.saleId} (${chkData.client}).`);
            } else {
              setDuplicateWarning('');
            }
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
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: unmatchedProducer.name,
          document: unmatchedProducer.document,
          ie: unmatchedProducer.ie,
          type: 'Produtor',
          city: unmatchedProducer.city,
          uf: unmatchedProducer.uf,
          address: unmatchedProducer.address
        })
      });

      if (!res.ok) {
        throw new Error('Erro ao salvar produtor no banco de dados');
      }

      const newProd = await res.json();
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
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: unmatchedClient.name,
          document: unmatchedClient.document,
          ie: unmatchedClient.ie,
          type: 'Comprador',
          city: unmatchedClient.city,
          uf: unmatchedClient.uf,
          address: unmatchedClient.address
        })
      });

      if (!res.ok) {
        throw new Error('Erro ao salvar cliente no banco de dados');
      }

      const newCli = await res.json();
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
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        setEvidenceFile(data.filename || file.name);
        setSuccessMessage('Comprovante/Anexo da venda carregado com sucesso!');
        setTimeout(() => setSuccessMessage(''), 3500);
      } else {
        setEvidenceFile(file.name);
      }
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
        const kg = Number(it.totalKg) || 0;
        const bw = Number(it.boxWeightKg) || (it.unit?.includes('Granel') ? 1 : 29);
        const isGr = (it.unit && it.unit.includes('Granel')) || (it.product && it.product.toLowerCase().includes('cebola')) || bw === 1;
        const vol = isGr ? kg : (bw > 0 ? (kg / bw) : 0);
        const p = Number(it.pricePerKg) || 0;
        const itNf = it.totalNf !== '' ? Number(it.totalNf) : (kg * p);
        const q = Number(it.dailyQuote) || 0;
        const isQKg = (q > 0 && q <= 10.0) || isGr;
        const itVP = q > 0 ? (isQKg ? (kg * q) : (vol * q)) : itNf;

        return {
          product: it.product || 'Produto Agrícola',
          unit: it.unit || 'Caixas (29kg)',
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

      const payload = {
        operationType,
        saleDate,
        client: selectedClient,
        clientDocument,
        origin: origin || 'Produtor Rural',
        destCity: destCity || 'São Paulo',
        destUF: destUF || 'SP',
        notes: `Venda de ${productNamesSummary || 'Produtos'} | Pesagem: ${totalWeightKg.toLocaleString('pt-BR')} kg (${totalVolumes.toFixed(0)} vol) | NF: R$ ${effectiveTotalNF.toFixed(2)} | Vencimento: ${dueDate ? dueDate.split('-').reverse().join('/') : ''}`,
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

      const url = editingSale ? `/api/sales/${editingSale.id}` : '/api/sales';
      const method = editingSale ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const result = await res.json();
        const msg = editingSale ? `Venda ${editingSale.id} atualizada com sucesso!` : `Venda ${result.id} gravada com sucesso!`;
        setSuccessMessage(msg);
        setTimeout(() => {
          if (onSaleCreated) onSaleCreated();
          setCurrentPage('sales-history');
        }, 1000);
      } else {
        setErrorMessage(editingSale ? 'Erro ao atualizar a venda.' : 'Erro ao registrar a venda.');
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('Falha na comunicação com o servidor.');
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

      {/* Confirmação de Cadastro Rápido do Produtor */}
      {producerRegisteredNotice && (
        <div className="bg-emerald-100 border border-emerald-400 text-emerald-950 px-4 py-3 rounded-lg flex items-center gap-2 text-xs font-bold shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{producerRegisteredNotice}</span>
        </div>
      )}

      {/* Confirmação de Cadastro Rápido do Cliente Comprador */}
      {clientRegisteredNotice && (
        <div className="bg-emerald-100 border border-emerald-400 text-emerald-950 px-4 py-3 rounded-lg flex items-center gap-2 text-xs font-bold shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{clientRegisteredNotice}</span>
        </div>
      )}

      {/* 🏪 CARD DE VÍNCULO INTELIGENTE DO CLIENTE / COMPRADOR */}
      {matchedClient && (
        <div className="bg-blue-50/90 border-2 border-blue-400 p-4 rounded-xl shadow-sm space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Store className="w-5 h-5 text-blue-700 shrink-0" />
              <span className="text-xs font-extrabold text-blue-950 uppercase tracking-wider">
                Cliente / Comprador Vinculado com Sucesso (Cadastro Ativo)
              </span>
            </div>
            <span className="text-[11px] font-extrabold bg-blue-200 text-blue-950 px-2.5 py-0.5 rounded-full border border-blue-300 w-fit">
              {matchedClient.type || 'Comprador'}
            </span>
          </div>
          
          <div className="text-sm font-black text-gray-900 flex flex-wrap items-center gap-2">
            <span>🏪 {matchedClient.name}</span>
            {matchedClient.document && (
              <span className="text-xs font-bold text-gray-600 bg-white px-2 py-0.5 rounded border border-blue-200">
                CNPJ/CPF: {matchedClient.document}
              </span>
            )}
            {matchedClient.ie && (
              <span className="text-xs font-bold text-gray-600 bg-white px-2 py-0.5 rounded border border-blue-200">
                IE: {matchedClient.ie}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-1">
            <div className="bg-white p-2.5 rounded-lg border border-blue-200 shadow-2xs">
              <span className="block text-[10px] font-bold text-gray-500 uppercase">Município / Estado</span>
              <span className="font-bold text-gray-900">{matchedClient.city || 'São Paulo'}/{matchedClient.uf || matchedClient.state || 'SP'}</span>
            </div>

            <div className="bg-white p-2.5 rounded-lg border border-blue-200 shadow-2xs">
              <span className="block text-[10px] font-bold text-gray-500 uppercase">Endereço Comercial</span>
              <span className="font-bold text-gray-900 truncate block" title={matchedClient.address || 'Loja / Galpão Principal'}>
                {matchedClient.address || 'Loja / Galpão Principal'}
              </span>
            </div>

            <div className="bg-white p-2.5 rounded-lg border border-blue-200 shadow-2xs">
              <span className="block text-[10px] font-bold text-gray-500 uppercase">Contato / Telefone</span>
              <span className="font-bold text-gray-900 truncate block" title={matchedClient.phone || matchedClient.email || 'Cadastrado'}>
                {matchedClient.phone ? `📞 ${matchedClient.phone}` : (matchedClient.email ? `✉️ ${matchedClient.email}` : 'ℹ️ Cadastro Regular')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ⚠️ AVISO DE NOVO CLIENTE DETECTADO NA NF-E */}
      {unmatchedClient && !matchedClient && (
        <div className="bg-amber-50/95 border-2 border-amber-400 p-4 rounded-xl shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <span className="text-xs font-black text-amber-950 uppercase tracking-wider">
                Novo Cliente / Destinatário Identificado na NF-e
              </span>
            </div>
            <span className="text-[11px] font-bold bg-amber-200 text-amber-900 px-2.5 py-0.5 rounded-full border border-amber-300 w-fit">
              Não Cadastrado na Base
            </span>
          </div>

          <div className="text-xs text-amber-950">
            O destinatário comprador identificado na nota fiscal <strong className="text-gray-950 font-black text-sm">"{unmatchedClient.name}"</strong> (CNPJ/CPF: <strong>{unmatchedClient.document || 'Não informado'}</strong> {unmatchedClient.ie ? `· IE: ${unmatchedClient.ie}` : ''} · {unmatchedClient.city}/{unmatchedClient.uf}) ainda não possui cadastro no sistema.
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
            <button
              type="button"
              disabled={registeringClient}
              onClick={handleQuickRegisterClient}
              className="bg-[#091b2e] hover:bg-[#132c4a] text-white text-xs font-extrabold px-4 py-2.5 rounded-lg shadow flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              {registeringClient ? 'Salvando Cliente no Banco...' : 'Cadastrar Cliente Comprador no Sistema (1 clique)'}
            </button>
            <span className="text-[11px] text-amber-900 font-medium">
              ✨ Salva automaticamente na tabela de Clientes & Produtores como Comprador.
            </span>
          </div>
        </div>
      )}

      {/* 🌾 CARD DE VÍNCULO INTELIGENTE DO PRODUTOR */}
      {matchedProducer && (
        <div className="bg-emerald-50/90 border-2 border-emerald-400 p-4 rounded-xl shadow-sm space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-700 shrink-0" />
              <span className="text-xs font-extrabold text-emerald-950 uppercase tracking-wider">
                Produtor Vinculado com Sucesso (Cadastro Ativo)
              </span>
            </div>
            <span className="text-[11px] font-extrabold bg-emerald-200 text-emerald-950 px-2.5 py-0.5 rounded-full border border-emerald-300 w-fit">
              {matchedProducer.type || 'Produtor'}
            </span>
          </div>
          
          <div className="text-sm font-black text-gray-900 flex flex-wrap items-center gap-2">
            <span>🌾 {matchedProducer.name}</span>
            {matchedProducer.document && (
              <span className="text-xs font-bold text-gray-600 bg-white px-2 py-0.5 rounded border border-emerald-200">
                Doc: {matchedProducer.document}
              </span>
            )}
            {matchedProducer.ie && (
              <span className="text-xs font-bold text-gray-600 bg-white px-2 py-0.5 rounded border border-emerald-200">
                IE: {matchedProducer.ie}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-1">
            <div className="bg-white p-2.5 rounded-lg border border-emerald-200 shadow-2xs">
              <span className="block text-[10px] font-bold text-gray-500 uppercase">Município / Estado</span>
              <span className="font-bold text-gray-900">{matchedProducer.city || 'Campo Alegre'}/{matchedProducer.uf || matchedProducer.state || 'GO'}</span>
            </div>

            <div className="bg-white p-2.5 rounded-lg border border-emerald-200 shadow-2xs">
              <span className="block text-[10px] font-bold text-gray-500 uppercase">Endereço / Fazenda</span>
              <span className="font-bold text-gray-900 truncate block" title={matchedProducer.address || 'Fazenda Principal'}>
                {matchedProducer.address || 'Fazenda / Sede Principal'}
              </span>
            </div>

            <div className="bg-white p-2.5 rounded-lg border border-emerald-200 shadow-2xs">
              <span className="block text-[10px] font-bold text-gray-500 uppercase">Dados Bancários / Pix</span>
              <span className="font-bold text-gray-900 truncate block" title={matchedProducer.pixKey || matchedProducer.bankName || 'Pendente de preenchimento'}>
                {matchedProducer.pixKey ? `🔑 Pix: ${matchedProducer.pixKey}` : (matchedProducer.bankName ? `🏦 ${matchedProducer.bankName} Ag:${matchedProducer.agency || '-'}` : 'ℹ️ Pendente no cadastro')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ⚠️ AVISO DE NOVO PRODUTOR DETECTADO NA NF-E */}
      {unmatchedProducer && !matchedProducer && (
        <div className="bg-amber-50/95 border-2 border-amber-400 p-4 rounded-xl shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <span className="text-xs font-black text-amber-950 uppercase tracking-wider">
                Novo Produtor Identificado na NF-e
              </span>
            </div>
            <span className="text-[11px] font-bold bg-amber-200 text-amber-900 px-2.5 py-0.5 rounded-full border border-amber-300 w-fit">
              Não Cadastrado na Base
            </span>
          </div>

          <div className="text-xs text-amber-950">
            O emitente identificado na nota fiscal <strong className="text-gray-950 font-black text-sm">"{unmatchedProducer.name}"</strong> (CPF/CNPJ: <strong>{unmatchedProducer.document || 'Não informado'}</strong> {unmatchedProducer.ie ? `· IE: ${unmatchedProducer.ie}` : ''} · {unmatchedProducer.city}/{unmatchedProducer.uf}) ainda não possui cadastro no sistema.
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
            <button
              type="button"
              disabled={registeringProducer}
              onClick={handleQuickRegisterProducer}
              className="bg-[#091b2e] hover:bg-[#132c4a] text-white text-xs font-extrabold px-4 py-2.5 rounded-lg shadow flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              {registeringProducer ? 'Salvando Produtor no Banco...' : 'Cadastrar Produtor no Sistema (1 clique)'}
            </button>
            <span className="text-[11px] text-amber-900 font-medium">
              ✨ Salva automaticamente na tabela de Clientes & Produtores com todos os dados fiscais da nota.
            </span>
          </div>
        </div>
      )}

      {/* Alerta de NF-e Duplicada */}
      {duplicateWarning && (
        <div className="bg-amber-50 border border-amber-300 text-amber-900 px-4 py-3 rounded-lg flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="font-bold">{duplicateWarning}</span>
          </div>
        </div>
      )}

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
          
          {/* Card: Seleção de Cliente e Grade de Produtos Multi-Item */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-3 gap-3">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-700" />
                <div>
                  <h2 className="text-sm font-extrabold text-gray-900">Itens da Venda & Produtos (Carga Mista)</h2>
                  <span className="text-[11px] text-gray-500">
                    Adicione um ou múltiplos produtos para a mesma operação/nota fiscal. O sistema consolida pesos, caixas e totais fiscais e comerciais.
                  </span>
                </div>
              </div>
            </div>

            {/* SELETOR DE CLIENTE COMPRADOR */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
              <label className="block text-xs font-bold text-gray-800 mb-1">
                Cliente / Destinatário Comprador *
              </label>
              <select
                required
                value={selectedClient}
                onChange={(e) => handleClientSelect(e.target.value)}
                className="w-full bg-white border border-gray-300 text-xs rounded-lg px-3 py-2.5 font-semibold text-gray-900 outline-none focus:ring-2 focus:ring-[#1d5a37] shadow-sm"
              >
                <option value="">-- Selecione o Cliente Comprador --</option>
                {!clients.some(c => c.name === selectedClient) && selectedClient && (
                  <option value={selectedClient}>{selectedClient} (Importado da NF-e)</option>
                )}
                {clients.map(c => (
                  <option key={c.id || c.name} value={c.name}>
                    {c.name} {c.city ? `(${c.city}/${c.state || c.uf || 'SP'})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* LISTA DE PRODUTOS DA VENDA */}
            <div className="space-y-4">
              {saleItems.map((item, index) => {
                const isItemGranel = (item.unit && (item.unit.includes('Granel') || item.unit.includes('(kg)'))) || (item.product && (item.product.toLowerCase().includes('cebola') || item.product.includes('Granel') || item.product.includes('(kg)'))) || Number(item.boxWeightKg) === 1;
                const isItemSacas = !isItemGranel && (item.unit?.toLowerCase().includes('saca') || item.unit?.toLowerCase().includes('sc') || item.product?.toLowerCase().includes('batata'));
                const unitShort = isItemGranel ? 'kg' : (isItemSacas ? 'sc' : 'cx');
                const itemKg = parseNum(item.totalKg);
                const boxW = parseNum(item.boxWeightKg) || (isItemGranel ? 1 : 29);
                const itemVol = isItemGranel ? itemKg : (boxW > 0 ? (itemKg / boxW) : 0);
                const itemP = parseNum(item.pricePerKg);
                const itemNfVal = item.totalNf !== '' && item.totalNf !== undefined ? parseNum(item.totalNf) : (itemKg * itemP);
                const itemQuote = parseNum(item.dailyQuote);
                const isQuoteKg = (itemQuote > 0 && itemQuote <= 10.0) || isItemGranel;
                const itemVPVal = itemQuote > 0 ? (isQuoteKg ? (itemKg * itemQuote) : (itemVol * itemQuote)) : itemNfVal;

                return (
                  <div 
                    key={item.id || index}
                    className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 space-y-3 transition-all hover:border-emerald-300"
                  >
                    {/* Header do Item */}
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded-md">
                          Item #{index + 1}
                        </span>
                        <span className="text-xs font-bold text-gray-800">
                          {item.product || 'Selecione o Produto'}
                        </span>
                        <span className="text-[10px] text-gray-600 font-semibold bg-white px-2 py-0.5 rounded border border-gray-200">
                          {item.unit || 'Embalagem'} ({item.boxWeightKg || 29}kg)
                        </span>
                      </div>

                      {saleItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded-md transition-colors text-xs font-semibold flex items-center gap-1 cursor-pointer"
                          title="Excluir este produto da venda"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remover</span>
                        </button>
                      )}
                    </div>

                    {/* Linha 1: Seleção de Produto e Unidade */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">
                          Produto / Commodity *
                        </label>
                        <select
                          required
                          value={item.product}
                          onChange={(e) => handleItemProductSelect(index, e.target.value)}
                          className="w-full bg-white border border-gray-300 text-xs rounded-lg px-2.5 py-2 font-semibold text-gray-900 outline-none focus:ring-2 focus:ring-[#1d5a37]"
                        >
                          <option value="">-- Escolha o Produto --</option>
                          {!products.some(p => p.name === item.product) && item.product && (
                            <option value={item.product}>{item.product} (Importado)</option>
                          )}
                          {products.map(p => (
                            <option key={p.id || p.name} value={p.name}>
                              {p.name} — {p.defaultUnit || `${p.unitKg}kg`}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">
                          Embalagem / Padrão
                        </label>
                        <select
                          value={item.unit}
                          onChange={(e) => handleItemFieldChange(index, 'unit', e.target.value)}
                          className="w-full bg-white border border-gray-300 text-xs rounded-lg px-2.5 py-2 font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-[#1d5a37]"
                        >
                          <option value="Caixas (29kg)">Caixas (29kg) — Cenoura / Padrão</option>
                          <option value="Caixas (20kg)">Caixas / Sacos (20kg) — Beterraba</option>
                          <option value="Sacas (50kg)">Sacas (50kg) — Batata Especial</option>
                          <option value="Sacas (25kg)">Sacas (25kg) — Batata / Cebola</option>
                          <option value="Sacas (60kg)">Sacas (60kg) — Grãos / Soja / Milho</option>
                          <option value="Granel (kg)">Granel (kg) — Raízes / Granel</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">
                          Peso Padrão Embalagem (kg)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          disabled={isItemGranel}
                          value={item.boxWeightKg}
                          onChange={(e) => handleItemFieldChange(index, 'boxWeightKg', e.target.value)}
                          className={`w-full border rounded-lg px-2.5 py-2 text-xs font-bold outline-none ${
                            isItemGranel ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white border-gray-300 text-gray-900'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Linha 2: Pesos, Preços e Cotações */}
                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 bg-white p-3 rounded-lg border border-slate-200">
                      
                      {/* Peso Total do Item */}
                      <div>
                        <label className="block text-[10px] font-bold text-gray-700 mb-0.5">
                          1. Peso Total (kg) *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: 17400"
                          value={item.totalKg}
                          onChange={(e) => handleItemFieldChange(index, 'totalKg', e.target.value)}
                          className="w-full bg-emerald-50/40 border border-emerald-300 text-xs rounded-lg px-2 py-1.5 font-extrabold text-gray-900 outline-none focus:ring-2 focus:ring-emerald-600"
                        />
                      </div>

                      {/* Caixas Calculadas */}
                      <div>
                        <label className="block text-[10px] font-bold text-gray-700 mb-0.5">
                          2. Volumes ({unitShort})
                        </label>
                        <div className="w-full bg-gray-50 border border-gray-200 text-xs rounded-lg px-2 py-1.5 font-extrabold text-gray-900 truncate">
                          {formatNumber(itemVol, isItemGranel ? 0 : 2)} {unitShort}
                        </div>
                      </div>

                      {/* Preço Unitário NF (R$/kg) */}
                      <div>
                        <label className="block text-[10px] font-bold text-gray-700 mb-0.5">
                          3. Preço NF (R$/kg)
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: 1,41"
                          value={item.pricePerKg}
                          onChange={(e) => handleItemFieldChange(index, 'pricePerKg', e.target.value)}
                          className="w-full bg-white border border-gray-300 text-xs rounded-lg px-2 py-1.5 font-bold text-gray-900 outline-none"
                        />
                      </div>

                      {/* Cotação do Dia Comercial */}
                      <div>
                        <label className="block text-[10px] font-bold text-emerald-900 mb-0.5">
                          4. Cotação (R$/{unitShort})
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: 45,00"
                          value={item.dailyQuote}
                          onChange={(e) => handleItemFieldChange(index, 'dailyQuote', e.target.value)}
                          className="w-full bg-blue-50/40 border border-blue-300 text-xs rounded-lg px-2 py-1.5 font-bold text-blue-950 outline-none"
                        />
                      </div>

                      {/* Subtotal NF */}
                      <div>
                        <label className="block text-[10px] font-bold text-gray-700 mb-0.5">
                          Subtotal NF (R$)
                        </label>
                        <input
                          type="text"
                          placeholder="0,00"
                          value={item.totalNf}
                          onChange={(e) => handleItemFieldChange(index, 'totalNf', e.target.value)}
                          className="w-full bg-white border border-emerald-400 text-xs rounded-lg px-2 py-1.5 font-extrabold text-emerald-950 outline-none"
                        />
                      </div>

                      {/* Subtotal Comercial VP */}
                      <div>
                        <label className="block text-[10px] font-bold text-blue-900 mb-0.5">
                          Subtotal VP (R$)
                        </label>
                        <div className="w-full bg-blue-50 border border-blue-200 text-xs rounded-lg px-2 py-1.5 font-black text-blue-950 truncate">
                          {formatCurrency(itemVPVal)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* BOTÃO ADICIONAR OUTRO PRODUTO */}
            <div className="flex justify-center pt-1">
              <button
                type="button"
                onClick={handleAddItem}
                className="bg-white hover:bg-slate-100 border border-dashed border-slate-300 hover:border-emerald-600 text-slate-700 hover:text-emerald-800 text-xs font-bold px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer w-full justify-center shadow-2xs"
              >
                <Plus className="w-4 h-4 text-emerald-700" />
                <span>Adicionar Outro Produto na Mesma Venda / Carga Mista</span>
              </button>
            </div>

            {/* BARRA DE TOTAIS CONSOLIDADOS DA VENDA */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 bg-emerald-50/80 p-3.5 rounded-xl border border-emerald-200 text-xs">
              <div className="min-w-0">
                <span className="block text-[10px] font-bold text-emerald-800 uppercase truncate">Peso Total Carga</span>
                <span className="text-sm font-black text-gray-900 truncate block" title={`${formatNumber(totalWeightKg, 0)} kg`}>{formatNumber(totalWeightKg, 0)} kg</span>
              </div>
              <div className="min-w-0">
                <span className="block text-[10px] font-bold text-emerald-800 uppercase truncate">Total Volumes</span>
                <span className="text-sm font-black text-gray-900 truncate block" title={`${formatNumber(totalVolumes, 2)} vol`}>{formatNumber(totalVolumes, 2)} vol</span>
              </div>
              <div className="min-w-0">
                <span className="block text-[10px] font-bold text-emerald-800 uppercase truncate">Valor Total NF</span>
                <span className="text-sm font-black text-[#173e27] truncate block" title={formatCurrency(effectiveTotalNF)}>{formatCurrency(effectiveTotalNF)}</span>
              </div>
              <div className="min-w-0">
                <span className="block text-[10px] font-bold text-red-700 uppercase truncate">(-) FUNRURAL (1,63%)</span>
                <span className="text-sm font-black text-red-600 truncate block" title={formatCurrency(funrural.funruralTotal)}>-{formatCurrency(funrural.funruralTotal)}</span>
              </div>
              <div className="min-w-0">
                <span className="block text-[10px] font-bold text-emerald-800 uppercase truncate">(=) Líquido a Receber</span>
                <span className="text-sm font-black text-emerald-950 truncate block" title={formatCurrency(liquidoAReceber)}>{formatCurrency(liquidoAReceber)}</span>
              </div>
              <div className="bg-blue-50 p-1.5 rounded-lg border border-blue-200 min-w-0">
                <span className="block text-[10px] font-bold text-blue-900 uppercase truncate">Total Comercial</span>
                <span className="text-sm font-black text-blue-950 truncate block" title={formatCurrency(valorTotalVP)}>{formatCurrency(valorTotalVP)}</span>
              </div>
            </div>
          </div>

          {/* Card: Dados Gerais da Emissão */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-3 gap-2">
              <h2 className="text-sm font-bold text-gray-900">Dados da Emissão & Faturamento</h2>
              
              <div className="flex flex-wrap items-center gap-2">
                {/* Botão 1: Importar NF-e (XML/PDF) */}
                {nfFile ? (
                  <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-300 px-2.5 py-1 rounded-lg text-xs">
                    <FileText className="w-3.5 h-3.5 text-emerald-700" />
                    <span className="font-bold text-emerald-950 max-w-[150px] truncate" title={nfFile}>{nfFile}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setNfFile(null);
                        setNfeKey('');
                        setXmlSuccess(false);
                      }}
                      className="ml-1 text-red-600 hover:text-red-800 p-0.5 rounded transition-colors font-bold"
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
                  <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-300 px-2.5 py-1 rounded-lg text-xs">
                    <Paperclip className="w-3.5 h-3.5 text-blue-700" />
                    <span className="font-bold text-blue-950 max-w-[150px] truncate" title={evidenceFile}>{evidenceFile}</span>
                    <button
                      type="button"
                      onClick={() => setEvidenceFile(null)}
                      className="ml-1 text-red-600 hover:text-red-800 p-0.5 rounded transition-colors font-bold"
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
                <label className="block text-xs font-semibold text-gray-700 mb-1">Remetente (Produtor Rural)</label>
                <input
                  type="text"
                  placeholder="Ex: BRUNO PERES ROMEIRO (Fazenda São Gotardo/MG)"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  className="w-full bg-white border border-gray-300 text-gray-800 text-xs rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#091b2e]"
                />
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

          {/* Card: Comissão de Corretagem */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-gray-900">Comissão de Corretagem AgroVenda</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Tipo de Taxa</label>
                <select
                  value={feeType}
                  onChange={(e) => setFeeType(e.target.value)}
                  className="w-full bg-white border border-gray-300 text-xs rounded-lg px-3 py-2 outline-none font-semibold"
                >
                  <option value="Porcentagem (%)">Porcentagem (%)</option>
                  <option value="Valor Fixo por Saca/Volume">Valor Fixo por Volume / Caixa</option>
                  <option value="Valor Fixo Total">Valor Fixo Total</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Taxa / Alíquota</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={feeValue}
                    onChange={(e) => setFeeValue(Number(e.target.value))}
                    className="w-full bg-white border border-gray-300 text-xs rounded-lg px-3 py-2 outline-none font-bold text-gray-900"
                  />
                  <span className="absolute right-3 top-2 text-xs text-gray-400 pointer-events-none">
                    {feeType === 'Porcentagem (%)' ? '%' : 'R$'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Resumo Financeiro Consolidado */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4 sticky top-6">
            <h2 className="text-sm font-extrabold text-gray-900 border-b border-gray-100 pb-3 flex items-center justify-between">
              <span>Resumo da Operação</span>
              <Calculator className="w-4 h-4 text-emerald-700" />
            </h2>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Produtos ({saleItems.length}):</span>
                <span className="font-bold text-gray-900 truncate max-w-[170px]" title={saleItems.map(it => it.product).filter(Boolean).join(', ')}>
                  {saleItems.map(it => it.product).filter(Boolean).join(', ') || 'Nenhum'}
                </span>
              </div>

              <div className="flex justify-between text-gray-600">
                <span>Peso Total Carga:</span>
                <span className="font-bold text-gray-900">{formatNumber(totalWeightKg, 0)} kg</span>
              </div>

              <div className="flex justify-between text-gray-600">
                <span>Total Caixas (29kg eq.):</span>
                <span className="font-bold text-gray-900">
                  {formatNumber(totalCaixas29kg, 2)} cx
                </span>
              </div>

              <div className="flex justify-between text-gray-800 font-bold border-t border-gray-100 pt-2 text-sm">
                <span>Valor Total da NF:</span>
                <span className="text-[#173e27] font-black">{formatCurrency(effectiveTotalNF)}</span>
              </div>

              <div className="flex justify-between text-red-600 font-semibold">
                <span>(-) FUNRURAL Retido (1,63%):</span>
                <span>-{formatCurrency(funrural.funruralTotal)}</span>
              </div>

              <div className="pl-3 text-[11px] text-gray-400 space-y-0.5 border-l-2 border-red-200">
                <div className="flex justify-between"><span>↳ Previdência (1,30%):</span><span>{formatCurrency(funrural.previdencia)}</span></div>
                <div className="flex justify-between"><span>↳ RAT (0,10%):</span><span>{formatCurrency(funrural.rat)}</span></div>
                <div className="flex justify-between"><span>↳ SENAR (0,23%):</span><span>{formatCurrency(funrural.senar)}</span></div>
              </div>

              <div className="flex justify-between text-emerald-950 font-bold bg-emerald-50/50 p-2 rounded-lg border border-emerald-200">
                <span>(=) Líquido a Receber:</span>
                <span className="font-black text-sm">{formatCurrency(liquidoAReceber)}</span>
              </div>

              {/* VALOR TOTAL COMERCIAL (VP) EM EVIDÊNCIA */}
              <div className="flex justify-between items-center text-blue-950 font-black text-sm border border-blue-200 bg-blue-50/70 p-2.5 rounded-xl shadow-xs">
                <span className="text-blue-900 font-bold">
                  Valor Total Comercial:
                </span>
                <span className="text-blue-950 font-black text-base">
                  {formatCurrency(valorTotalVP)}
                </span>
              </div>

              <div className="flex justify-between text-gray-800 font-bold border-t border-gray-100 pt-2">
                <span>Comissão AgroVenda ({feeValue}%):</span>
                <span className="text-sm">{formatCurrency(totalCommission)}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#091b2e] hover:bg-[#132c4a] text-white font-bold text-xs py-3.5 rounded-lg shadow-md transition-all flex items-center justify-center gap-2 mt-4 cursor-pointer"
            >
              {submitting ? 'Gravando no MongoDB...' : 'Confirmar & Gravar Venda'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
