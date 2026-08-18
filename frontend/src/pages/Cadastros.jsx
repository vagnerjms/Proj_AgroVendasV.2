import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Boxes, 
  Plus, 
  Building, 
  Phone, 
  Mail, 
  MapPin, 
  Edit, 
  Trash2, 
  Search, 
  X, 
  CheckCircle2, 
  AlertTriangle,
  Layers,
  DollarSign
} from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

export default function Cadastros({ tab = 'clients' }) {
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [activeTab, setActiveTab] = useState(tab);
  const [search, setSearch] = useState('');
  const [clientTypeFilter, setClientTypeFilter] = useState('all');

  // Client Modal States
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [clientForm, setClientForm] = useState({
    name: '',
    document: '',
    type: 'Comprador',
    city: '',
    uf: 'MT',
    email: '',
    phone: ''
  });

  // Product Modal States
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    name: '',
    category: 'Grãos',
    defaultUnit: 'Sacas (60kg)',
    unitKg: 60,
    currentStock: 0,
    averageCost: 0
  });

  // Feedback notifications
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [submittingClient, setSubmittingClient] = useState(false);
  const [submittingProduct, setSubmittingProduct] = useState(false);

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/clients');
      if (res.ok) {
        const data = await res.json();
        setClients(data);
      }
    } catch (err) {
      console.error('Erro ao buscar clientes:', err);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (err) {
      console.error('Erro ao buscar produtos:', err);
    }
  };

  useEffect(() => {
    fetchClients();
    fetchProducts();
  }, []);

  const showNotification = (msg) => {
    setSuccessMsg(msg);
    setErrorMsg('');
    const timer = setTimeout(() => setSuccessMsg(''), 3500);
    return () => clearTimeout(timer);
  };

  const showErrorNotification = (msg) => {
    setErrorMsg(msg);
    setSuccessMsg('');
    const timer = setTimeout(() => setErrorMsg(''), 4500);
    return () => clearTimeout(timer);
  };

  // --- CLIENT HANDLERS ---
  const handleOpenClientModal = (client = null) => {
    if (client) {
      setEditingClient(client);
      setClientForm({
        name: client.name,
        document: client.document || '',
        ie: client.ie || '',
        type: client.type || 'Comprador',
        city: client.city || '',
        uf: client.uf || 'MG',
        email: client.email || '',
        phone: client.phone || ''
      });
    } else {
      setEditingClient(null);
      setClientForm({
        name: '',
        document: '',
        ie: '',
        type: 'Produtor',
        city: '',
        uf: 'MG',
        email: '',
        phone: ''
      });
    }
    setClientModalOpen(true);
  };

  const handleSaveClient = async (e) => {
    e.preventDefault();
    if (submittingClient) return;
    setSubmittingClient(true);
    try {
      const url = editingClient ? `/api/clients/${editingClient.id}` : '/api/clients';
      const method = editingClient ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientForm)
      });
      const data = await res.json();
      if (res.ok) {
        showNotification(editingClient ? `Cadastro de ${clientForm.name} atualizado com sucesso!` : `Novo parceiro ${clientForm.name} cadastrado com sucesso!`);
        setClientModalOpen(false);
        fetchClients();
      } else {
        showErrorNotification(data.error || 'Falha ao salvar parceiro comercial.');
      }
    } catch (err) {
      console.error(err);
      showErrorNotification('Erro de conexão ao salvar parceiro.');
    } finally {
      setSubmittingClient(false);
    }
  };

  const handleDeleteClient = async (client) => {
    if (!window.confirm(`Tem certeza que deseja excluir o cadastro de "${client.name}"?`)) return;
    try {
      const res = await fetch(`/api/clients/${client.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        showNotification(`Cadastro de ${client.name} excluído.`);
        fetchClients();
      } else {
        showErrorNotification(data.error || 'Não foi possível excluir o parceiro.');
      }
    } catch (err) {
      console.error(err);
      showErrorNotification('Erro de rede ao tentar excluir parceiro.');
    }
  };

  // --- PRODUCT HANDLERS ---
  const handleOpenProductModal = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setProductForm({
        name: product.name,
        category: product.category || 'Grãos',
        defaultUnit: product.defaultUnit || 'Sacas (60kg)',
        unitKg: product.unitKg || 60,
        currentStock: product.currentStock || 0,
        averageCost: product.averageCost || 0
      });
    } else {
      setEditingProduct(null);
      setProductForm({
        name: '',
        category: 'Grãos',
        defaultUnit: 'Sacas (60kg)',
        unitKg: 60,
        currentStock: 0,
        averageCost: 0
      });
    }
    setProductModalOpen(true);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (submittingProduct) return;
    setSubmittingProduct(true);
    try {
      const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products';
      const method = editingProduct ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productForm)
      });
      const data = await res.json();
      if (res.ok) {
        showNotification(editingProduct ? `Produto ${productForm.name} atualizado com sucesso!` : `Produto ${productForm.name} cadastrado com sucesso!`);
        setProductModalOpen(false);
        fetchProducts();
      } else {
        showErrorNotification(data.error || 'Falha ao salvar produto.');
      }
    } catch (err) {
      console.error(err);
      showErrorNotification('Erro de conexão ao salvar produto.');
    } finally {
      setSubmittingProduct(false);
    }
  };

  const handleDeleteProduct = async (product) => {
    if (!window.confirm(`Tem certeza que deseja excluir o produto "${product.name}"?`)) return;
    try {
      const res = await fetch(`/api/products/${product.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        showNotification(`Produto ${product.name} excluído com sucesso.`);
        fetchProducts();
      } else {
        showErrorNotification(data.error || 'Não foi possível excluir o produto.');
      }
    } catch (err) {
      console.error(err);
      showErrorNotification('Erro de rede ao tentar excluir produto.');
    }
  };

  // Filtered lists
  const filteredClients = clients.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || (c.document && c.document.includes(search)) || (c.city && c.city.toLowerCase().includes(search.toLowerCase()));
    const matchType = clientTypeFilter === 'all' || c.type === clientTypeFilter;
    return matchSearch && matchType;
  });

  const filteredProducts = products.filter(p => {
    return p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-[#091b2e] uppercase">INICIO / CADASTROS GERAIS</div>
          <h1 className="text-2xl font-extrabold text-gray-900 mt-1">
            {activeTab === 'clients' ? 'Gestão de Clientes & Produtores' : 'Gestão de Produtos & Grãos'}
          </h1>
        </div>

        <div className="flex gap-2">
          {activeTab === 'clients' ? (
            <button
              onClick={() => handleOpenClientModal()}
              className="bg-[#091b2e] hover:bg-[#132c4a] text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Novo Parceiro (Cliente / Produtor)
            </button>
          ) : (
            <button
              onClick={() => handleOpenProductModal()}
              className="bg-[#091b2e] hover:bg-[#132c4a] text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Novo Produto / Commodity
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-3 rounded-lg flex items-center gap-2 text-sm shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-50 border border-red-300 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2 text-sm shadow-xs">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('clients')}
          className={`pb-3 flex items-center gap-2 cursor-pointer transition-colors ${activeTab === 'clients' ? 'border-b-2 border-[#df7b1b] text-[#df7b1b]' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <Users className="w-4 h-4" />
          Clientes & Produtores ({clients.length})
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`pb-3 flex items-center gap-2 cursor-pointer transition-colors ${activeTab === 'products' ? 'border-b-2 border-[#df7b1b] text-[#df7b1b]' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <Boxes className="w-4 h-4" />
          Produtos, Culturas & Estoque ({products.length})
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex-1 min-w-[280px] relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder={activeTab === 'clients' ? "Buscar por nome, CNPJ/CPF ou cidade..." : "Buscar por produto ou categoria..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#1d5a37]"
          />
        </div>

        {activeTab === 'clients' && (
          <div className="flex items-center gap-3">
            <select
              value={clientTypeFilter}
              onChange={(e) => setClientTypeFilter(e.target.value)}
              className="bg-white border border-gray-300 text-xs rounded-lg px-3 py-2 outline-none font-semibold text-gray-700"
            >
              <option value="all">Todos os Tipos de Parceiro</option>
              <option value="Comprador">Compradores</option>
              <option value="Produtor">Produtores / Vendedores</option>
              <option value="Ambos">Ambos</option>
            </select>
          </div>
        )}
      </div>

      {/* Content depending on Active Tab */}
      {activeTab === 'clients' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredClients.map(c => (
            <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-3 hover:border-gray-300 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                      c.type === 'Produtor' ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    }`}>
                      {c.type || 'Comprador'}
                    </span>
                    <div className="font-bold text-sm text-gray-900 mt-1">{c.name}</div>
                  </div>
                  <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">{c.id}</span>
                </div>
                
                <div className="space-y-1.5 text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <Building className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span className="font-medium text-gray-700">{c.document || 'Doc não informado'}</span>
                    {c.ie && (
                      <span className="text-[11px] text-gray-500">· IE: <strong className="text-gray-800">{c.ie}</strong></span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span>{c.city ? `${c.city} - ${c.uf}` : 'Local não informado'}</span>
                  </div>
                  {c.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      <span>{c.phone}</span>
                    </div>
                  )}
                  {c.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      <span className="truncate">{c.email}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-3 border-t border-gray-100 flex justify-end gap-2">
                <button
                  onClick={() => handleOpenClientModal(c)}
                  className="text-gray-600 hover:text-emerald-700 hover:bg-emerald-50 px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <Edit className="w-3.5 h-3.5" />
                  Editar
                </button>
                <button
                  onClick={() => handleDeleteClient(c)}
                  className="text-gray-400 hover:text-red-600 hover:bg-red-50 px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProducts.map(p => (
            <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-3 hover:border-gray-300 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                      {p.category}
                    </span>
                    <div className="font-bold text-sm text-gray-900 mt-1">{p.name}</div>
                  </div>
                  <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">
                    {p.defaultUnit}
                  </span>
                </div>

                <div className="pt-3 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs mt-3">
                  <div>
                    <span className="text-gray-400 block text-[10px]">Estoque Silo/Armazém:</span>
                    <span className="font-bold text-gray-900 text-sm">
                      {p.currentStock.toLocaleString('pt-BR')} un
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-gray-400 block text-[10px]">Custo Médio:</span>
                    <span className="font-bold text-[#173e27] text-sm">
                      {formatCurrency(p.averageCost)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-3 border-t border-gray-100 flex justify-end gap-2">
                <button
                  onClick={() => handleOpenProductModal(p)}
                  className="text-gray-600 hover:text-emerald-700 hover:bg-emerald-50 px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <Edit className="w-3.5 h-3.5" />
                  Editar
                </button>
                <button
                  onClick={() => handleDeleteProduct(p)}
                  className="text-gray-400 hover:text-red-600 hover:bg-red-50 px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: CRIAR / EDITAR CLIENTE */}
      {clientModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <form onSubmit={handleSaveClient} className="bg-white rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">
                {editingClient ? `Editar Parceiro: ${editingClient.name}` : 'Novo Cadastro de Parceiro'}
              </h3>
              <button type="button" onClick={() => setClientModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Razão Social / Nome</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Cooperativa Agrícola Central"
                  value={clientForm.name}
                  onChange={e => setClientForm({ ...clientForm, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#1d5a37]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Tipo</label>
                <select
                  value={clientForm.type}
                  onChange={e => setClientForm({ ...clientForm, type: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#1d5a37] font-semibold"
                >
                  <option value="Comprador">Comprador</option>
                  <option value="Produtor">Produtor</option>
                  <option value="Ambos">Ambos</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">CNPJ / CPF</label>
                <input
                  type="text"
                  placeholder="00.000.000/0000-00"
                  value={clientForm.document}
                  onChange={e => setClientForm({ ...clientForm, document: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#1d5a37]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Inscrição Estadual (IE)</label>
                <input
                  type="text"
                  placeholder="Ex: 000.000.000.000 ou ISENTO"
                  value={clientForm.ie}
                  onChange={e => setClientForm({ ...clientForm, ie: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#1d5a37]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Telefone / WhatsApp</label>
                <input
                  type="text"
                  placeholder="(34) 99876-1122"
                  value={clientForm.phone}
                  onChange={e => setClientForm({ ...clientForm, phone: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#1d5a37]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">E-mail Comercial</label>
                <input
                  type="email"
                  placeholder="contato@empresa.com.br"
                  value={clientForm.email}
                  onChange={e => setClientForm({ ...clientForm, email: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#1d5a37]"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Cidade</label>
                <input
                  type="text"
                  placeholder="Ex: São Gotardo"
                  value={clientForm.city}
                  onChange={e => setClientForm({ ...clientForm, city: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#1d5a37]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">UF</label>
                <input
                  type="text"
                  maxLength={2}
                  placeholder="MG"
                  value={clientForm.uf}
                  onChange={e => setClientForm({ ...clientForm, uf: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#1d5a37] uppercase"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                disabled={submittingClient}
                onClick={() => setClientModalOpen(false)}
                className="px-4 py-2 text-xs text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submittingClient}
                className="bg-[#091b2e] hover:bg-[#132c4a] disabled:opacity-50 text-white text-xs font-bold px-5 py-2 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
              >
                {submittingClient && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                <span>{submittingClient ? 'Gravando...' : (editingClient ? 'Salvar Alterações' : 'Cadastrar Parceiro')}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: CRIAR / EDITAR PRODUTO */}
      {productModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <form onSubmit={handleSaveProduct} className="bg-white rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">
                {editingProduct ? `Editar Produto: ${editingProduct.name}` : 'Novo Cadastro de Produto / Grão'}
              </h3>
              <button type="button" onClick={() => setProductModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nome do Produto</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Soja Grão Comercial Safra 25/26"
                  value={productForm.name}
                  onChange={e => setProductForm({ ...productForm, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#091b2e]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Categoria</label>
                <select
                  value={productForm.category}
                  onChange={e => setProductForm({ ...productForm, category: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#091b2e] font-semibold"
                >
                  <option value="Hortifruti">Hortifruti</option>
                  <option value="Grãos">Grãos</option>
                  <option value="Legumes & Verduras">Legumes & Verduras</option>
                  <option value="Frutas">Frutas</option>
                  <option value="Insumos">Insumos</option>
                  <option value="Sementes">Sementes</option>
                  <option value="Café">Café</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Tipo de Embalagem / Unidade</label>
                <select
                  value={productForm.defaultUnit}
                  onChange={e => {
                    const u = e.target.value;
                    let kg = productForm.unitKg;
                    if (u === 'Caixas (cx)') kg = 29;
                    else if (u === 'Sacas (sc)') kg = 60;
                    else if (u === 'Granel (kg)') kg = 1;
                    else if (u === 'Toneladas (ton)') kg = 1000;
                    else if (u === 'Bins (bin)') kg = 400;
                    else if (u === 'Fardos / Pacotes (fd)') kg = 10;
                    else if (u === 'Paletes (pal)') kg = 800;
                    setProductForm({ ...productForm, defaultUnit: u, unitKg: kg });
                  }}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#091b2e] font-semibold text-gray-800"
                >
                  <option value="Caixas (cx)">Caixas (cx)</option>
                  <option value="Sacas (sc)">Sacas (sc)</option>
                  <option value="Granel (kg)">Granel (kg)</option>
                  <option value="Toneladas (ton)">Toneladas (ton)</option>
                  <option value="Bins (bin)">Bins (bin)</option>
                  <option value="Fardos / Pacotes (fd)">Fardos / Pacotes (fd)</option>
                  <option value="Paletes (pal)">Paletes (pal)</option>
                  <option value="Outro (Personalizado)">Outro (Personalizado)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Peso Unitário (kg) *</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  placeholder="Ex: 29, 60, 20..."
                  value={productForm.unitKg}
                  onChange={e => setProductForm({ ...productForm, unitKg: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#091b2e] font-bold text-gray-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Estoque Inicial (unidades)</label>
                <input
                  type="number"
                  value={productForm.currentStock}
                  onChange={e => setProductForm({ ...productForm, currentStock: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#091b2e]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Custo Médio Ponderado (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={productForm.averageCost}
                  onChange={e => setProductForm({ ...productForm, averageCost: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#091b2e]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                disabled={submittingProduct}
                onClick={() => setProductModalOpen(false)}
                className="px-4 py-2 text-xs text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submittingProduct}
                className="bg-[#091b2e] hover:bg-[#132c4a] disabled:opacity-50 text-white text-xs font-bold px-5 py-2 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
              >
                {submittingProduct && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                <span>{submittingProduct ? 'Gravando...' : (editingProduct ? 'Salvar Alterações' : 'Cadastrar Produto')}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
