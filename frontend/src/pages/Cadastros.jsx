import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Boxes, 
  Plus, 
  Search, 
  CheckCircle2, 
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';
import ClientsTab from '../components/cadastros/ClientsTab';
import ProductsTab from '../components/cadastros/ProductsTab';
import ClientModal from '../components/cadastros/ClientModal';
import ProductModal from '../components/cadastros/ProductModal';

export default function Cadastros({ tab = 'clients', setCurrentPage }) {
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [activeTab, setActiveTab] = useState(tab);
  const [search, setSearch] = useState('');
  const [clientTypeFilter, setClientTypeFilter] = useState('all');

  // Sync activeTab whenever the tab prop changes from sidebar navigation
  useEffect(() => {
    if (tab) {
      setActiveTab(tab);
    }
  }, [tab]);

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
      const data = await api.get('/api/clients');
      if (Array.isArray(data)) {
        setClients(data);
      }
    } catch (err) {
      console.error('Erro ao buscar clientes:', err);
    }
  };

  const fetchProducts = async () => {
    try {
      const data = await api.get('/api/products');
      if (Array.isArray(data)) {
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
      if (editingClient) {
        await api.put(`/api/clients/${editingClient.id}`, clientForm);
        showNotification(`Cadastro de ${clientForm.name} atualizado com sucesso!`);
      } else {
        await api.post('/api/clients', clientForm);
        showNotification(`Novo parceiro ${clientForm.name} cadastrado com sucesso!`);
      }
      setClientModalOpen(false);
      fetchClients();
    } catch (err) {
      console.error(err);
      showErrorNotification(err.message || 'Falha ao salvar parceiro comercial.');
    } finally {
      setSubmittingClient(false);
    }
  };

  const handleDeleteClient = async (client) => {
    if (!window.confirm(`Tem certeza que deseja excluir o cadastro de "${client.name}"?`)) return;
    try {
      await api.delete(`/api/clients/${client.id}`);
      showNotification(`Cadastro de ${client.name} excluído.`);
      fetchClients();
    } catch (err) {
      console.error(err);
      showErrorNotification(err.message || 'Erro de rede ao tentar excluir parceiro.');
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
      if (editingProduct) {
        await api.put(`/api/products/${editingProduct.id}`, productForm);
        showNotification(`Produto ${productForm.name} atualizado com sucesso!`);
      } else {
        await api.post('/api/products', productForm);
        showNotification(`Produto ${productForm.name} cadastrado com sucesso!`);
      }
      setProductModalOpen(false);
      fetchProducts();
    } catch (err) {
      console.error(err);
      showErrorNotification(err.message || 'Falha ao salvar produto.');
    } finally {
      setSubmittingProduct(false);
    }
  };

  const handleDeleteProduct = async (product) => {
    if (!window.confirm(`Tem certeza que deseja excluir o produto "${product.name}"?`)) return;
    try {
      await api.delete(`/api/products/${product.id}`);
      showNotification(`Produto ${product.name} excluído com sucesso.`);
      fetchProducts();
    } catch (err) {
      console.error(err);
      showErrorNotification(err.message || 'Erro de rede ao tentar excluir produto.');
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
          onClick={() => {
            setActiveTab('clients');
            if (setCurrentPage) setCurrentPage('cadastros-clients');
          }}
          className={`pb-3 flex items-center gap-2 cursor-pointer transition-colors ${activeTab === 'clients' ? 'border-b-2 border-[#df7b1b] text-[#df7b1b]' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <Users className="w-4 h-4" />
          Clientes & Produtores ({clients.length})
        </button>
        <button
          onClick={() => {
            setActiveTab('products');
            if (setCurrentPage) setCurrentPage('cadastros-products');
          }}
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
        <ClientsTab
          clients={filteredClients}
          onEditClient={handleOpenClientModal}
          onDeleteClient={handleDeleteClient}
        />
      ) : (
        <ProductsTab
          products={filteredProducts}
          onEditProduct={handleOpenProductModal}
          onDeleteProduct={handleDeleteProduct}
        />
      )}

      {/* Modal: Cliente / Produtor */}
      <ClientModal
        isOpen={clientModalOpen}
        onClose={() => setClientModalOpen(false)}
        onSubmit={handleSaveClient}
        editingClient={editingClient}
        clientForm={clientForm}
        setClientForm={setClientForm}
        submitting={submittingClient}
      />

      {/* Modal: Produto */}
      <ProductModal
        isOpen={productModalOpen}
        onClose={() => setProductModalOpen(false)}
        onSubmit={handleSaveProduct}
        editingProduct={editingProduct}
        productForm={productForm}
        setProductForm={setProductForm}
        submitting={submittingProduct}
      />
    </div>
  );
}
