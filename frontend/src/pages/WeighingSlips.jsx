import React, { useState, useEffect } from 'react';
import { 
  Scale, 
  AlertTriangle, 
  CheckCircle2, 
  Plus, 
  Search, 
  Filter, 
  Check, 
  X,
  Truck,
  FileSpreadsheet,
  Edit,
  Trash2
} from 'lucide-react';
import { formatNumber, formatDate } from '../utils/formatters';

export default function WeighingSlips({ initialStatus = 'all', setCurrentPage }) {
  const [slips, setSlips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [search, setSearch] = useState('');
  
  // Resolution modal state
  const [resolvingSlip, setResolvingSlip] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [submittingResolution, setSubmittingResolution] = useState(false);

  // Edit Slip Modal State
  const [editingSlip, setEditingSlip] = useState(null);
  const [editForm, setEditForm] = useState({
    client: '',
    truckPlate: '',
    driverName: '',
    originWeightKg: 0,
    destWeightKg: 0,
    humidityPct: 14.0,
    impurityPct: 1.0,
    status: 'Divergente'
  });

  // New Romaneio Modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [newForm, setNewForm] = useState({
    client: 'Cooperativa Agrícola do Centro-Oeste',
    product: 'Soja Grão Comercial',
    truckPlate: '',
    driverName: '',
    originWeightKg: 45000,
    destWeightKg: 44600,
    humidityPct: 14.0,
    impurityPct: 1.0,
    tolerancePct: 0.25
  });

  const fetchSlips = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (search) params.append('search', search);

      const res = await fetch(`/api/weighings?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setSlips(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlips();
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchSlips();
  };

  const handleResolve = async (action) => {
    if (!resolvingSlip) return;
    setSubmittingResolution(true);
    try {
      const res = await fetch(`/api/weighings/${resolvingSlip.id}/resolve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: action,
          resolutionNotes: resolutionNotes || `Divergência tratada e ${action.toLowerCase()} via auditoria comercial.`
        })
      });

      if (res.ok) {
        setResolvingSlip(null);
        setResolutionNotes('');
        fetchSlips();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingResolution(false);
    }
  };

  const handleOpenEdit = (slip) => {
    setEditingSlip(slip);
    setEditForm({
      client: slip.client,
      truckPlate: slip.truckPlate,
      driverName: slip.driverName || '',
      originWeightKg: slip.originWeightKg,
      destWeightKg: slip.destWeightKg,
      humidityPct: slip.humidityPct || 14.0,
      impurityPct: slip.impurityPct || 1.0,
      status: slip.status || 'Divergente'
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingSlip) return;
    try {
      const res = await fetch(`/api/weighings/${editingSlip.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      if (res.ok) {
        setEditingSlip(null);
        fetchSlips();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSlip = async (slip) => {
    if (!window.confirm(`Deseja excluir o romaneio ${slip.id} (${slip.truckPlate})?`)) return;
    try {
      const res = await fetch(`/api/weighings/${slip.id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchSlips();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateSlip = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/weighings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newForm)
      });
      if (res.ok) {
        setShowNewModal(false);
        fetchSlips();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const pendingDivergences = slips.filter(s => s.status === 'Divergente').length;

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-[#173e27] uppercase">
            <span className="hover:underline cursor-pointer" onClick={() => setCurrentPage('dashboard')}>INICIO</span> / PESAGEM
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 mt-1">
            Romaneios de Pesagem & Divergências de Carga
          </h1>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="bg-[#173e27] hover:bg-[#1f5435] text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow flex items-center gap-1.5 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Lançar Romaneio
        </button>
      </div>

      {/* Overview Alert */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-orange-600 shrink-0" />
            <div>
              <span className="text-xs font-bold text-orange-950 uppercase">Divergências Pendentes</span>
              <span className="text-xl font-extrabold text-orange-900 block">{pendingDivergences} cargas</span>
            </div>
          </div>
          <button
            onClick={() => setStatusFilter('Divergente')}
            className="text-xs font-bold bg-orange-200/80 hover:bg-orange-200 text-orange-900 px-3 py-1.5 rounded-lg"
          >
            Filtrar
          </button>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
          <div>
            <span className="text-xs font-bold text-emerald-950 uppercase">Tolerância Contratual Padrão</span>
            <span className="text-sm font-semibold text-emerald-900 block">Até 0,25% (Quebra técnica de transporte)</span>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
          <Scale className="w-6 h-6 text-blue-600 shrink-0" />
          <div>
            <span className="text-xs font-bold text-blue-950 uppercase">Total de Romaneios Auditados</span>
            <span className="text-xl font-extrabold text-blue-900 block">{slips.length} romaneios</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[280px] relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Buscar por código, placa, motorista ou cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#1d5a37]"
          />
        </form>

        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-gray-300 text-xs rounded-lg px-3 py-2 outline-none font-semibold text-gray-700"
          >
            <option value="all">Todos os Status</option>
            <option value="Divergente">Somente Divergentes</option>
            <option value="Ajustado">Ajustados / Compensados</option>
            <option value="Aprovado">Aprovados (Sem Divergência)</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase text-[10px]">
              <tr>
                <th className="py-3 px-4">Romaneio / Data</th>
                <th className="py-3 px-4">Veículo / Motorista</th>
                <th className="py-3 px-4">Cliente / Produto</th>
                <th className="py-3 px-4 text-right">Peso Origem</th>
                <th className="py-3 px-4 text-right">Peso Destino</th>
                <th className="py-3 px-4 text-right">Quebra (Diferença)</th>
                <th className="py-3 px-4 text-center">Classificação</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-gray-400">
                    Carregando romaneios...
                  </td>
                </tr>
              ) : slips.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-14 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-2">
                      <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-1">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <span className="font-bold text-gray-900 text-sm">
                        {statusFilter === 'Divergente' 
                          ? 'Nenhuma divergência pendente de pesagem!' 
                          : 'Nenhum romaneio encontrado'}
                      </span>
                      <p className="text-xs text-gray-500 text-center leading-relaxed">
                        {statusFilter === 'Divergente'
                          ? 'Todas as cargas recebidas estão em conformidade com as notas e limites de tolerância contratual.'
                          : 'Tente alterar os termos de busca ou o filtro de status selecionado.'}
                      </p>
                      {statusFilter !== 'all' && (
                        <button
                          type="button"
                          onClick={() => setStatusFilter('all')}
                          className="mt-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition-colors"
                        >
                          Limpar Filtros e Ver Todos
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                slips.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-gray-900">{s.id}</div>
                      <div className="text-gray-400 text-[11px]">{formatDate(s.date)}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-gray-800 flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-gray-400" />
                        <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-[11px] font-bold">{s.truckPlate}</span>
                      </div>
                      <div className="text-gray-500 text-[11px] mt-0.5">{s.driverName}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900">{s.client}</div>
                      <div className="text-gray-400 text-[11px]">{s.product}</div>
                    </td>

                    <td className="py-3 px-4 text-right font-medium text-gray-700">
                      {formatNumber(s.originWeightKg, 0)} kg
                    </td>

                    <td className="py-3 px-4 text-right font-medium text-gray-900">
                      {formatNumber(s.destWeightKg, 0)} kg
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className={`font-bold ${s.weightDifferenceKg > (s.originWeightKg * (s.tolerancePct / 100)) ? 'text-orange-600' : 'text-gray-800'}`}>
                        -{formatNumber(s.weightDifferenceKg, 0)} kg
                      </div>
                      <div className="text-[10px] text-gray-400">
                        {s.weightDifferencePct}% (tol: {s.tolerancePct}%)
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center text-[11px] text-gray-600">
                      <span>U: {s.humidityPct}% • I: {s.impurityPct}%</span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        s.status === 'Divergente'
                          ? 'bg-orange-100 text-orange-800 border border-orange-200'
                          : (s.status === 'Ajustado' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800')
                      }`}>
                        {s.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {s.status === 'Divergente' && (
                          <button
                            onClick={() => {
                              setResolvingSlip(s);
                              setResolutionNotes(`Diferença de ${s.weightDifferenceKg} kg aceita com desconto proporcional em conta gráfica.`);
                            }}
                            className="bg-[#173e27] hover:bg-[#1f5435] text-white text-[11px] font-semibold px-2 py-1 rounded transition-colors"
                          >
                            Tratar
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenEdit(s)}
                          className="text-gray-600 hover:text-emerald-700 p-1 rounded hover:bg-gray-100"
                          title="Editar romaneio"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteSlip(s)}
                          className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-red-50"
                          title="Excluir romaneio"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Editar Romaneio */}
      {editingSlip && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <form onSubmit={handleSaveEdit} className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">Editar Romaneio {editingSlip.id}</h3>
              <button type="button" onClick={() => setEditingSlip(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Cliente</label>
              <input
                type="text"
                required
                value={editForm.client}
                onChange={e => setEditForm({ ...editForm, client: e.target.value })}
                className="w-full border border-gray-300 rounded-lg p-2 text-xs outline-none focus:ring-2 focus:ring-[#1d5a37]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Placa</label>
                <input
                  type="text"
                  required
                  value={editForm.truckPlate}
                  onChange={e => setEditForm({ ...editForm, truckPlate: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2 text-xs uppercase outline-none focus:ring-2 focus:ring-[#1d5a37]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Motorista</label>
                <input
                  type="text"
                  value={editForm.driverName}
                  onChange={e => setEditForm({ ...editForm, driverName: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2 text-xs outline-none focus:ring-2 focus:ring-[#1d5a37]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Peso Origem (kg)</label>
                <input
                  type="number"
                  value={editForm.originWeightKg}
                  onChange={e => setEditForm({ ...editForm, originWeightKg: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2 text-xs outline-none focus:ring-2 focus:ring-[#1d5a37]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Peso Destino (kg)</label>
                <input
                  type="number"
                  value={editForm.destWeightKg}
                  onChange={e => setEditForm({ ...editForm, destWeightKg: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2 text-xs outline-none focus:ring-2 focus:ring-[#1d5a37]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
              <select
                value={editForm.status}
                onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                className="w-full border border-gray-300 rounded-lg p-2 text-xs outline-none focus:ring-2 focus:ring-[#1d5a37]"
              >
                <option value="Divergente">Divergente</option>
                <option value="Ajustado">Ajustado</option>
                <option value="Aprovado">Aprovado</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setEditingSlip(null)}
                className="px-4 py-2 text-xs text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="bg-[#173e27] hover:bg-[#1f5435] text-white text-xs font-semibold px-4 py-2 rounded-lg"
              >
                Salvar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Resolver Divergência */}
      {resolvingSlip && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <span className="text-xs font-bold text-orange-600 uppercase">Tratamento de Divergência</span>
                <h3 className="text-base font-bold text-gray-900">Romaneio {resolvingSlip.id} ({resolvingSlip.truckPlate})</h3>
              </div>
              <button onClick={() => setResolvingSlip(null)} className="text-gray-400 hover:text-gray-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-xs space-y-1 text-orange-900">
              <div className="flex justify-between"><span>Peso Origem:</span><strong>{formatNumber(resolvingSlip.originWeightKg, 0)} kg</strong></div>
              <div className="flex justify-between"><span>Peso Destino:</span><strong>{formatNumber(resolvingSlip.destWeightKg, 0)} kg</strong></div>
              <div className="flex justify-between font-bold text-red-700">
                <span>Quebra Detectada:</span>
                <span>-{resolvingSlip.weightDifferenceKg} kg ({resolvingSlip.weightDifferencePct}%)</span>
              </div>
              <div className="flex justify-between text-gray-500 text-[10px]">
                <span>Tolerância Contratual:</span>
                <span>{resolvingSlip.tolerancePct}% (~{Math.round(resolvingSlip.originWeightKg * 0.0025)} kg)</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Justificativa / Parecer Comercial:
              </label>
              <textarea
                rows={3}
                value={resolutionNotes}
                onChange={e => setResolutionNotes(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2 text-xs outline-none focus:ring-2 focus:ring-[#1d5a37]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setResolvingSlip(null)}
                className="px-4 py-2 text-xs text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={submittingResolution}
                onClick={() => handleResolve('Ajustado')}
                className="bg-[#173e27] hover:bg-[#1f5435] text-white text-xs font-semibold px-4 py-2 rounded-lg"
              >
                Ajustar e Compensar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Lançar Novo Romaneio */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateSlip} className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-gray-900">Novo Romaneio de Pesagem</h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Placa do Veículo</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: RVE-9B12"
                  value={newForm.truckPlate}
                  onChange={e => setNewForm({ ...newForm, truckPlate: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2 text-xs uppercase outline-none focus:ring-2 focus:ring-[#1d5a37]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Motorista</label>
                <input
                  type="text"
                  placeholder="Nome do motorista"
                  value={newForm.driverName}
                  onChange={e => setNewForm({ ...newForm, driverName: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2 text-xs outline-none focus:ring-2 focus:ring-[#1d5a37]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Peso Origem (kg)</label>
                <input
                  type="number"
                  required
                  value={newForm.originWeightKg}
                  onChange={e => setNewForm({ ...newForm, originWeightKg: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2 text-xs outline-none focus:ring-2 focus:ring-[#1d5a37]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Peso Destino (kg)</label>
                <input
                  type="number"
                  required
                  value={newForm.destWeightKg}
                  onChange={e => setNewForm({ ...newForm, destWeightKg: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2 text-xs outline-none focus:ring-2 focus:ring-[#1d5a37]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="px-4 py-2 text-xs text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="bg-[#173e27] text-white text-xs font-semibold px-4 py-2 rounded-lg"
              >
                Salvar Romaneio
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
