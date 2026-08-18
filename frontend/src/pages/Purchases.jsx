import React, { useState, useEffect } from 'react';
import { Plus, ShoppingCart, CheckCircle2, AlertCircle, Edit, Trash2, X, Search } from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/formatters';

export default function Purchases({ mode = 'new', setCurrentPage }) {
  const [purchases, setPurchases] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  // Form states (Create)
  const [producer, setProducer] = useState('');
  const [product, setProduct] = useState('');
  const [date, setDate] = useState('2026-08-17');
  const [quantity, setQuantity] = useState(500);
  const [unit, setUnit] = useState('Sacas (60kg)');
  const [unitPrice, setUnitPrice] = useState(55.00);
  const [success, setSuccess] = useState('');

  // Edit Purchase Modal State
  const [editingPurchase, setEditingPurchase] = useState(null);
  const [editForm, setEditForm] = useState({
    producer: '',
    product: '',
    quantity: 0,
    unit: 'Sacas (60kg)',
    unitPrice: 0,
    status: 'Recebido',
    paymentStatus: 'A Pagar'
  });

  const fetchPurchases = () => {
    fetch('/api/purchases')
      .then(res => res.json())
      .then(setPurchases)
      .catch(console.error);
  };

  useEffect(() => {
    fetchPurchases();

    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        setProducts(data);
        if (data.length > 0) setProduct(data[0].name);
      })
      .catch(console.error);
  }, []);

  const total = Number(quantity) * Number(unitPrice);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          producer,
          product,
          date,
          quantity,
          unit,
          unitPrice,
          total
        })
      });
      if (res.ok) {
        setSuccess('Contrato de compra registrado com sucesso no MongoDB!');
        setTimeout(() => {
          setCurrentPage('purchases-history');
        }, 1000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdit = (p) => {
    setEditingPurchase(p);
    setEditForm({
      producer: p.producer,
      product: p.product,
      quantity: p.quantity,
      unit: p.unit || 'Sacas (60kg)',
      unitPrice: p.unitPrice,
      status: p.status || 'Recebido',
      paymentStatus: p.paymentStatus || 'A Pagar'
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingPurchase) return;
    try {
      const editTotal = Number(editForm.quantity) * Number(editForm.unitPrice);
      const res = await fetch(`/api/purchases/${editingPurchase.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editForm,
          total: editTotal
        })
      });
      if (res.ok) {
        setEditingPurchase(null);
        fetchPurchases();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeletePurchase = async (p) => {
    if (!window.confirm(`Deseja realmente cancelar e excluir o contrato de compra ${p.id}?`)) return;
    try {
      const res = await fetch(`/api/purchases/${p.id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchPurchases();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredPurchases = purchases.filter(p => 
    p.id.toLowerCase().includes(search.toLowerCase()) ||
    p.producer.toLowerCase().includes(search.toLowerCase()) ||
    p.product.toLowerCase().includes(search.toLowerCase())
  );

  if (mode === 'history') {
    return (
      <div className="p-4 sm:p-6 md:p-8 max-w-[1600px] mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-xs font-bold text-[#091b2e] uppercase">INICIO / COMPRAS</div>
            <h1 className="text-2xl font-extrabold text-gray-900 mt-1">Histórico de Compras de Grãos</h1>
          </div>
          <button
            onClick={() => setCurrentPage('new-purchase')}
            className="bg-[#091b2e] hover:bg-[#132c4a] text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Nova Compra
          </button>
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <input
            type="text"
            placeholder="Buscar por código, produtor ou produto..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-2 text-xs outline-none focus:ring-2 focus:ring-[#091b2e]"
          />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase text-[10px]">
              <tr>
                <th className="py-3 px-4">Cód / Data</th>
                <th className="py-3 px-4">Produtor / Fornecedor</th>
                <th className="py-3 px-4">Produto</th>
                <th className="py-3 px-4 text-right">Quantidade</th>
                <th className="py-3 px-4 text-right">Preço Unit.</th>
                <th className="py-3 px-4 text-right">Valor Total</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPurchases.map(p => (
                <tr key={p.id} className="hover:bg-gray-50/80">
                  <td className="py-3 px-4 font-bold text-gray-900">{p.id} <span className="block font-normal text-gray-400 text-[11px]">{formatDate(p.date)}</span></td>
                  <td className="py-3 px-4 font-semibold text-gray-800">{p.producer}</td>
                  <td className="py-3 px-4 text-gray-700">{p.product}</td>
                  <td className="py-3 px-4 text-right font-medium text-gray-900">{p.quantity} {p.unit}</td>
                  <td className="py-3 px-4 text-right text-gray-700">{formatCurrency(p.unitPrice)}</td>
                  <td className="py-3 px-4 text-right font-bold text-gray-900">{formatCurrency(p.total)}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      p.paymentStatus === 'Pago' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {p.status} ({p.paymentStatus || 'A Pagar'})
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(p)}
                        className="text-emerald-700 hover:bg-emerald-50 p-1.5 rounded transition-colors"
                        title="Editar compra"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeletePurchase(p)}
                        className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded transition-colors"
                        title="Excluir compra"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Modal: Editar Compra */}
        {editingPurchase && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <form onSubmit={handleSaveEdit} className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <h3 className="text-base font-bold text-gray-900">Editar Compra {editingPurchase.id}</h3>
                <button type="button" onClick={() => setEditingPurchase(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Produtor / Vendedor</label>
                <input
                  type="text"
                  required
                  value={editForm.producer}
                  onChange={e => setEditForm({ ...editForm, producer: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#1d5a37]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Quantidade</label>
                  <input
                    type="number"
                    value={editForm.quantity}
                    onChange={e => setEditForm({ ...editForm, quantity: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#1d5a37]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Preço Unitário (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.unitPrice}
                    onChange={e => setEditForm({ ...editForm, unitPrice: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#1d5a37]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Status Operacional</label>
                  <select
                    value={editForm.status}
                    onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#1d5a37]"
                  >
                    <option value="Recebido">Recebido</option>
                    <option value="Em Trânsito">Em Trânsito</option>
                    <option value="Cancelado">Cancelado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Pagamento</label>
                  <select
                    value={editForm.paymentStatus}
                    onChange={e => setEditForm({ ...editForm, paymentStatus: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#1d5a37]"
                  >
                    <option value="A Pagar">A Pagar</option>
                    <option value="Pago">Pago</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingPurchase(null)}
                  className="px-4 py-2 text-xs text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-[#df7b1b] hover:bg-[#c86e18] text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-[1000px] mx-auto space-y-6">
      <div>
        <div className="text-xs font-bold text-[#091b2e] uppercase">INICIO / COMPRAS</div>
        <h1 className="text-2xl font-extrabold text-gray-900 mt-1">Nova Compra de Grãos (Produtor)</h1>
      </div>

      {success && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-3 rounded-lg flex items-center gap-2 text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Produtor / Vendedor</label>
            <input
              type="text"
              required
              placeholder="Ex: João Batista (Fazenda Boa Esperança)"
              value={producer}
              onChange={(e) => setProducer(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-[#091b2e]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Data da Compra</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-[#091b2e]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Produto / Cultura</label>
            <select
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-[#091b2e]"
            >
              {products.map(p => (
                <option key={p.id} value={p.name}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Quantidade</label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-[#091b2e]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Preço Unitário (R$)</label>
            <input
              type="number"
              step="0.01"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-[#091b2e]"
            />
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">Valor Total do Contrato:</span>
          <span className="text-xl font-extrabold text-gray-900">{formatCurrency(total)}</span>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#091b2e] hover:bg-[#132c4a] text-white font-bold text-xs py-3.5 rounded-lg shadow-md transition-all cursor-pointer"
        >
          {loading ? 'Gravando...' : 'Confirmar Compra'}
        </button>
      </form>
    </div>
  );
}
