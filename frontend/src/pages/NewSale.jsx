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

  // Product Selection, Unit Type & Dynamic Pricings (INITIALIZED BLANK)
  const [selectedProduct, setSelectedProduct] = useState('');
  const [unitType, setUnitType] = useState('Caixas (29kg)');
  const [totalWeightKg, setTotalWeightKg] = useState('');
  const [boxWeightKg, setBoxWeightKg] = useState('');
  const [pricePerKg, setPricePerKg] = useState('');
  const [totalNfValue, setTotalNfValue] = useState('');
  const [dailyQuote, setDailyQuote] = useState('');

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
    setSelectedProduct('');
    setUnitType('Caixas (29kg)');
    setTotalWeightKg('');
    setBoxWeightKg('');
    setPricePerKg('');
    setTotalNfValue('');
    setDailyQuote('');
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

      const prodName = editingSale.items?.[0]?.product || 'Cenoura (Caixa 29kg)';
      setSelectedProduct(prodName);
      setTotalWeightKg(editingSale.totalKg ? String(editingSale.totalKg) : '');

      const prodUnit = editingSale.items?.[0]?.unit || (prodName.includes('Granel') || prodName.includes('(kg)') ? 'Granel (kg)' : 'Caixas (29kg)');
      setUnitType(prodUnit);

      let bWeight = 29;
      if (prodUnit.includes('Granel') || prodName.includes('Granel') || prodName.includes('(kg)')) {
        bWeight = 1;
      } else if (editingSale.totalVolumes > 0 && editingSale.totalKg > 0) {
        bWeight = Number((editingSale.totalKg / editingSale.totalVolumes).toFixed(0));
      }
      setBoxWeightKg(bWeight || 29);

      if (editingSale.totalOperation) {
        setTotalNfValue(String(editingSale.totalOperation));
        if (editingSale.totalKg > 0) {
          setPricePerKg((editingSale.totalOperation / editingSale.totalKg).toFixed(4));
        }
      }

      // Extract daily quote from field, notes or fallback
      if (editingSale.dailyQuote) {
        setDailyQuote(String(editingSale.dailyQuote));
      } else if (editingSale.notes) {
        const m = editingSale.notes.match(/Cotação:?\s*R\$\s*([\d,.]+)/i);
        if (m) setDailyQuote(m[1].replace(',', '.'));
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

  const applyProductData = (prod) => {
    if (!prod) return;
    setSelectedProduct(prod.name);
    const defUnit = prod.defaultUnit || 'Caixas (29kg)';
    setUnitType(defUnit);

    let uKg = prod.unitKg || 29;
    if (defUnit.includes('Granel') || defUnit.includes('(kg)')) {
      uKg = 1;
    } else if (defUnit.includes('29kg')) {
      uKg = 29;
    } else if (defUnit.includes('20kg')) {
      uKg = 20;
    } else if (defUnit.includes('60kg')) {
      uKg = 60;
    } else if (defUnit.includes('1000kg')) {
      uKg = 1000;
    }
    setBoxWeightKg(uKg);
  };

  const handleProductSelect = (productName) => {
    if (!productName) {
      setSelectedProduct('');
      setBoxWeightKg('');
      return;
    }
    const prod = products.find(p => p.name === productName);
    if (prod) {
      applyProductData(prod);
    }
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

  // Unit Characteristics & Flags
  const isGranel = unitType.includes('Granel') || unitType.includes('(kg)') || selectedProduct.includes('Granel') || selectedProduct.includes('(kg)') || Number(boxWeightKg) === 1;
  const isSacas = !isGranel && (unitType.includes('Sacas') || unitType.includes('60kg') || unitType.includes('40kg') || selectedProduct.includes('Sacas') || selectedProduct.includes('60kg'));
  const isToneladas = !isGranel && !isSacas && (unitType.includes('Toneladas') || unitType.includes('1000kg'));
  const isCaixas = !isGranel && !isSacas && !isToneladas;

  const getUnitShortLabel = () => {
    if (isGranel) return 'kg';
    if (isSacas) return 'sc';
    if (isToneladas) return 'ton';
    return 'cx';
  };

  const getVolumeLabel = () => {
    if (isGranel) return 'Peso Total Faturado (kg)';
    if (isSacas) return `Sacas Calculadas (${boxWeightKg || 60}kg)`;
    if (isToneladas) return 'Toneladas Calculadas (ton)';
    return `Caixas Calculadas (${boxWeightKg || 29}kg)`;
  };

  // Numeric values for calculation
  const numWeight = Number(totalWeightKg) || 0;
  const numBoxWeight = Number(boxWeightKg) || 1;
  const numPriceKg = Number(pricePerKg) || 0;
  const numQuote = Number(dailyQuote) || 0;

  // Handlers for bidirectional edits (Price/Kg <-> Total NF Value <-> Weight)
  const handleWeightChange = (newWeightStr) => {
    setTotalWeightKg(newWeightStr);
    const w = Number(newWeightStr) || 0;
    if (w > 0 && numPriceKg > 0) {
      setTotalNfValue((w * numPriceKg).toFixed(2));
    } else if (w > 0 && Number(totalNfValue) > 0) {
      setPricePerKg((Number(totalNfValue) / w).toFixed(4));
    }
  };

  const handlePricePerKgChange = (newPriceStr) => {
    setPricePerKg(newPriceStr);
    const p = Number(newPriceStr) || 0;
    if (numWeight > 0) {
      setTotalNfValue((numWeight * p).toFixed(2));
    }
  };

  const handleTotalNfValueChange = (newTotalNfStr) => {
    setTotalNfValue(newTotalNfStr);
    const tot = Number(newTotalNfStr) || 0;
    if (numWeight > 0 && tot >= 0) {
      setPricePerKg((tot / numWeight).toFixed(4));
    }
  };

  // Calculated Volumes
  const calculatedVolumes = isGranel 
    ? numWeight 
    : (numBoxWeight > 0 ? (numWeight / numBoxWeight) : 0);

  // Effective Total NF Value
  const effectiveTotalNF = totalNfValue !== '' 
    ? Number(totalNfValue) 
    : (numPriceKg > 0 ? (numWeight * numPriceKg) : 0);

  const funrural = calculateFunrural(effectiveTotalNF);
  const liquidoAReceber = Math.max(0, effectiveTotalNF - funrural.funruralTotal);
  
  const isQuotePerKg = (numQuote > 0 && numQuote <= 10.0) || isGranel;
  const valorTotalVP = isQuotePerKg 
    ? (numWeight * numQuote) 
    : (calculatedVolumes * numQuote);

  const totalCommission = feeType === 'Porcentagem (%)' 
    ? (valorTotalVP * (Number(feeValue) / 100))
    : (feeType === 'Valor Fixo por Saca/Volume' ? calculatedVolumes * Number(feeValue) : Number(feeValue));

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
          setProducerRegisteredNotice('');
        }
      }

      if (data.totalKg && data.totalKg > 0) {
        setTotalWeightKg(String(data.totalKg));
        if (data.totalOperation && data.totalOperation > 0) {
          setTotalNfValue(Number(data.totalOperation).toFixed(2));
          setPricePerKg(Number((data.totalOperation / data.totalKg).toFixed(4)));
        }
      } else if (data.totalOperation && data.totalOperation > 0) {
        setTotalNfValue(Number(data.totalOperation).toFixed(2));
      }

      // Auto-match product from XML items if available
      if (data.items && data.items.length > 0) {
        const xProd = (data.items[0].product || '').toLowerCase();
        const matchedProd = products.find(p => 
          xProd.includes(p.name.toLowerCase()) || 
          p.name.toLowerCase().includes(xProd) ||
          (xProd.includes('cenoura') && p.name.includes('Cenoura')) ||
          (xProd.includes('cebola') && p.name.includes('Cebola')) ||
          (xProd.includes('soja') && p.name.includes('Soja')) ||
          (xProd.includes('milho') && p.name.includes('Milho'))
        );
        if (matchedProd) {
          applyProductData(matchedProd);
        }
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

    if (!selectedProduct) {
      setErrorMessage('Por favor, selecione o produto da venda.');
      setSubmitting(false);
      return;
    }

    if (!totalWeightKg || Number(totalWeightKg) <= 0) {
      setErrorMessage('Por favor, informe o peso total da carga em kg.');
      setSubmitting(false);
      return;
    }

    try {
      const unitDescription = isGranel ? 'Granel (kg)' : (isSacas ? `Sacas (${boxWeightKg}kg)` : `Caixas (${boxWeightKg}kg)`);
      const payload = {
        operationType,
        saleDate,
        client: selectedClient,
        clientDocument,
        origin: origin || 'Produtor Rural',
        destCity: destCity || 'São Paulo',
        destUF: destUF || 'SP',
        notes: `Venda de ${selectedProduct} | Pesagem: ${totalWeightKg} kg (${calculatedVolumes.toFixed(2)} ${getUnitShortLabel()}) | NF: R$ ${effectiveTotalNF.toFixed(2)} | Cotação: R$ ${dailyQuote}/${getUnitShortLabel()} | Vencimento: ${dueDate ? dueDate.split('-').reverse().join('/') : ''} (${Number(paymentTermDays) === 0 ? 'À Vista' : `${paymentTermDays} dias`})`,
        nfFile,
        nfeKey,
        evidenceFile,
        paymentTerms: Number(paymentTermDays) === 0 ? 'À Vista' : `${paymentTermDays} dias`,
        paymentTermDays: Number(paymentTermDays) || 0,
        dueDate,
        dailyQuote: Number(dailyQuote) || 0,
        valorTotalVP: Number(valorTotalVP) || 0,
        freightType,
        carrierName,
        truckPlate,
        driverName,
        driverCPF,
        items: [
          {
            product: selectedProduct,
            kg: numWeight,
            quantity: calculatedVolumes,
            unit: unitDescription,
            price: isGranel ? numPriceKg : (numPriceKg * numBoxWeight),
            pricePerKg: numPriceKg,
            total: effectiveTotalNF
          }
        ],
        feeType,
        feeValue,
        totalVolumes: calculatedVolumes,
        totalKg: numWeight,
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
          
          {/* Card: Seleção de Produto e Precificação Adaptativa */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-700" />
                <div>
                  <h2 className="text-sm font-bold text-gray-900">Produto & Precificação Adaptativa</h2>
                  <span className="text-[11px] text-gray-500">
                    O formulário adapta automaticamente os campos de acordo com a unidade do produto e permite edição direta do valor da NF.
                  </span>
                </div>
              </div>
              {selectedProduct && (
                <span className="text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-lg">
                  Tipo: {isGranel ? 'Granel (kg)' : (isSacas ? 'Sacas' : 'Caixas')}
                </span>
              )}
            </div>

            {/* SELETOR DO PRODUTO E CLIENTE */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1">
                    Produto / Commodity Agrícola *
                  </label>
                  <select
                    required
                    value={selectedProduct}
                    onChange={(e) => handleProductSelect(e.target.value)}
                    className="w-full bg-white border border-gray-300 text-xs rounded-lg px-3 py-2.5 font-semibold text-gray-900 outline-none focus:ring-2 focus:ring-[#1d5a37] shadow-sm"
                  >
                    <option value="">-- Selecione o Produto --</option>
                    {!products.some(p => p.name === selectedProduct) && selectedProduct && (
                      <option value={selectedProduct}>{selectedProduct} (Importado da NF-e)</option>
                    )}
                    {products.map(p => (
                      <option key={p.id || p.name} value={p.name}>
                        {p.name} — {p.defaultUnit || `${p.unitKg}kg`} ({p.category})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
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
              </div>
            </div>

            {/* GRID DE PESAGEM E COTAÇÃO DINÂMICA */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-emerald-50/40 p-4 rounded-xl border border-emerald-100">
              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1">
                  1. Peso Total (kg) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="Ex: 25000"
                  value={totalWeightKg}
                  onChange={(e) => handleWeightChange(e.target.value)}
                  className="w-full bg-white border border-emerald-300 text-xs rounded-lg px-3 py-2 font-extrabold text-gray-900 outline-none focus:ring-2 focus:ring-emerald-600"
                />
                <span className="text-[10px] text-gray-400 mt-0.5 block">Peso balança / NF</span>
              </div>

              {/* Peso da Caixa/Embalagem */}
              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1">
                  2. {isGranel ? 'Embalagem' : (isSacas ? 'Peso da Saca (kg)' : 'Peso da Caixa (kg)')}
                </label>
                <input
                  type="number"
                  step="0.1"
                  disabled={isGranel || !selectedProduct}
                  placeholder={isGranel ? '1' : (isSacas ? '60' : '29')}
                  value={boxWeightKg}
                  onChange={(e) => setBoxWeightKg(e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 text-xs font-bold outline-none ${
                    isGranel ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white border-emerald-300 text-gray-900'
                  }`}
                />
                <span className="text-[10px] text-gray-400 mt-0.5 block">
                  {isGranel ? 'Granel (1 kg = 1 unidade)' : (isSacas ? 'Padrão saca: 60kg' : 'Padrão caixa: 29kg')}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1">
                  3. Preço Unit. NF (R$/kg)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  placeholder="Ex: 1,30"
                  value={pricePerKg}
                  onChange={(e) => handlePricePerKgChange(e.target.value)}
                  className="w-full bg-white border border-emerald-300 text-xs rounded-lg px-3 py-2 font-bold text-gray-900 outline-none"
                />
                <span className="text-[10px] text-gray-400 mt-0.5 block">Calcula ou deduz do total NF</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1">
                  4. Cotação Dia (R$/{getUnitShortLabel()})
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 45,00"
                  value={dailyQuote}
                  onChange={(e) => setDailyQuote(e.target.value)}
                  className="w-full bg-white border border-emerald-300 text-xs rounded-lg px-3 py-2 font-bold text-emerald-900 outline-none"
                />
                <span className="text-[10px] text-gray-400 mt-0.5 block">
                  Cotação comercial VP
                </span>
              </div>
            </div>

            {/* SEGUNDA LINHA: RESUMO + VALOR TOTAL DA NF EDITÁVEL */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs pt-1">
              
              {/* Volume / Caixas / Kilos */}
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 flex flex-col justify-center">
                <span className="text-gray-500 text-[10px] block font-semibold">{getVolumeLabel()}:</span>
                <span className="font-extrabold text-gray-900 text-sm mt-0.5">
                  {formatNumber(calculatedVolumes, isGranel ? 0 : 2)} {getUnitShortLabel()}
                </span>
              </div>

              {/* VALOR TOTAL DA NF EDITÁVEL (CAMPO DIRETO) */}
              <div className="bg-emerald-50/50 p-3 rounded-xl border-2 border-emerald-400/80 shadow-sm relative group">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-emerald-950 text-[10px] font-extrabold flex items-center gap-1">
                    <Edit3 className="w-3 h-3 text-emerald-700" />
                    <span>Valor Total da NF (R$) *</span>
                  </label>
                  <span className="text-[9px] bg-emerald-200/60 text-emerald-900 px-1.5 py-0.2 rounded font-bold">
                    Editável
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-2.5 top-1.5 text-xs font-bold text-emerald-900">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={totalNfValue}
                    onChange={(e) => handleTotalNfValueChange(e.target.value)}
                    className="w-full bg-white border border-emerald-400 text-xs rounded-lg pl-8 pr-2 py-1.5 font-black text-emerald-950 outline-none focus:ring-2 focus:ring-emerald-600 shadow-inner"
                  />
                </div>
                <span className="text-[9px] text-emerald-700 mt-1 block">
                  Altere livremente o valor fiscal da nota
                </span>
              </div>

              {/* FUNRURAL CALCULADO SOBRE O VALOR DA NF */}
              <div className="bg-red-50/60 p-3 rounded-xl border border-red-200 flex flex-col justify-center">
                <span className="text-red-700 text-[10px] block font-semibold">(-) FUNRURAL (1,63%):</span>
                <span className="font-extrabold text-red-600 text-sm mt-0.5">
                  -{formatCurrency(funrural.funruralTotal)}
                </span>
              </div>

              {/* LÍQUIDO A RECEBER */}
              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 flex flex-col justify-center">
                <span className="text-emerald-800 text-[10px] block font-semibold">(=) Líquido a Receber:</span>
                <span className="font-extrabold text-emerald-950 text-sm mt-0.5">
                  {formatCurrency(liquidoAReceber)}
                </span>
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
                  <option value="Valor Fixo por Saca/Volume">Valor Fixo por {isGranel ? 'kg' : (isSacas ? 'Saca' : 'Caixa')}</option>
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
                <span>Produto:</span>
                <span className="font-bold text-gray-900">{selectedProduct || 'Não selecionado'}</span>
              </div>

              <div className="flex justify-between text-gray-600">
                <span>Peso Total em Kilos:</span>
                <span className="font-bold text-gray-900">{formatNumber(numWeight, 0)} kg</span>
              </div>

              <div className="flex justify-between text-gray-600">
                <span>{getVolumeLabel()}:</span>
                <span className="font-bold text-gray-900">
                  {formatNumber(calculatedVolumes, isGranel ? 0 : 2)} {getUnitShortLabel()}
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

              {/* VALOR TOTAL VP EM EVIDÊNCIA */}
              <div className="flex justify-between items-center text-blue-950 font-black text-sm border border-blue-200 bg-blue-50/60 p-2.5 rounded-xl shadow-xs">
                <span className="text-blue-900 font-bold">
                  Valor Total VP {numQuote > 0 ? `(R$ ${numQuote}/${getUnitShortLabel()})` : ''}:
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
