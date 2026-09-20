import React, { useState, useEffect } from 'react';
import { Plus, Search, CheckCircle2, AlertTriangle } from 'lucide-react';
import { api } from '../services/api';
import WeighingKpiCards from '../components/weighings/WeighingKpiCards';
import WeighingTable from '../components/weighings/WeighingTable';
import WeighingNewModal from '../components/weighings/WeighingNewModal';
import WeighingEditModal from '../components/weighings/WeighingEditModal';
import WeighingResolveModal from '../components/weighings/WeighingResolveModal';
import TicketPreviewModal from '../components/weighings/TicketPreviewModal';

export default function WeighingSlips({ initialStatus = 'all', setCurrentPage }) {
  const [slips, setSlips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [search, setSearch] = useState('');
  
  // Resolution modal state
  const [resolvingSlip, setResolvingSlip] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolveWeightChoice, setResolveWeightChoice] = useState('dest'); // 'dest' | 'origin'
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
    status: 'Divergente',
    weightChoice: 'dest', // 'dest' | 'origin'
    applyWeightToSale: true,
    ticketImage: ''
  });

  // Ticket Image upload and preview states
  const [uploadingTicket, setUploadingTicket] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

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
    tolerancePct: 0.25,
    ticketImage: ''
  });

  const [submittingSlip, setSubmittingSlip] = useState(false);
  const [notification, setNotification] = useState('');
  const [errorNotification, setErrorNotification] = useState('');

  const fetchSlips = async () => {
    setLoading(true);
    try {
      const data = await api.get('/api/weighings', {
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: search || undefined
      });
      setSlips(data || []);
    } catch (err) {
      console.error('Erro ao buscar romaneios:', err);
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

  const showNotification = (msg) => {
    setNotification(msg);
    setErrorNotification('');
    const timer = setTimeout(() => setNotification(''), 4500);
    return () => clearTimeout(timer);
  };

  const showErrorNotification = (msg) => {
    setErrorNotification(msg);
    setNotification('');
    const timer = setTimeout(() => setErrorNotification(''), 4500);
    return () => clearTimeout(timer);
  };

  const handleOpenResolve = (slip) => {
    setResolvingSlip(slip);
    setResolveWeightChoice('dest');
    setResolutionNotes(`Divergência tratada e ajustada considerando peso de destino.`);
  };

  const handleResolve = async (action) => {
    if (!resolvingSlip) return;
    setSubmittingResolution(true);
    try {
      const res = await api.put(`/api/weighings/${resolvingSlip.id}/resolve`, {
        action: action,
        weightChoice: resolveWeightChoice,
        resolutionNotes: resolutionNotes || `Divergência tratada considerando ${resolveWeightChoice === 'origin' ? 'Peso Origem' : 'Peso Destino'}.`
      });
      const saleMsg = res.saleUpdated ? ` e Venda ${res.saleId} recalculada com sucesso` : '';
      showNotification(`Romaneio ${resolvingSlip.id}${saleMsg}!`);
      setResolvingSlip(null);
      setResolutionNotes('');
      fetchSlips();
    } catch (err) {
      console.error('Erro ao resolver divergência:', err);
      showErrorNotification(err.message || 'Erro ao resolver divergência.');
    } finally {
      setSubmittingResolution(false);
    }
  };

  const handleTicketUpload = async (e, isEdit = true) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploadingTicket(true);
    try {
      const data = await api.upload('/api/upload', formData);
      const fname = data?.filename || file.name;
      if (isEdit) {
        setEditForm(prev => ({ ...prev, ticketImage: fname }));
      } else {
        setNewForm(prev => ({ ...prev, ticketImage: fname }));
      }
      showNotification('Imagem do romaneio anexada com sucesso!');
    } catch (err) {
      console.error(err);
      showErrorNotification(err.message || 'Falha ao enviar imagem do romaneio.');
    } finally {
      setUploadingTicket(false);
    }
  };

  const handleRemoveTicketImage = (isEdit = true) => {
    if (isEdit) {
      setEditForm(prev => ({ ...prev, ticketImage: '' }));
    } else {
      setNewForm(prev => ({ ...prev, ticketImage: '' }));
    }
    showNotification('Imagem desanexada.');
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
      status: slip.status,
      weightChoice: slip.weightDifferenceKg === 0 ? 'dest' : (slip.status === 'Ajustado' ? 'dest' : 'dest'),
      applyWeightToSale: true,
      ticketImage: slip.ticketImage || slip.attachment || ''
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingSlip || submittingSlip) return;
    setSubmittingSlip(true);
    try {
      const res = await api.put(`/api/weighings/${editingSlip.id}`, editForm);
      const choiceLabel = editForm.weightChoice === 'origin' ? 'Peso de Origem' : 'Peso de Destino';
      const saleMsg = res.saleUpdated ? ` (Peso ajustado na Venda ${res.saleId})` : '';
      showNotification(`Romaneio ${editingSlip.id} atualizado com ${choiceLabel}${saleMsg}!`);
      setEditingSlip(null);
      fetchSlips();
    } catch (err) {
      console.error(err);
      showErrorNotification(err.message || 'Erro ao atualizar romaneio.');
    } finally {
      setSubmittingSlip(false);
    }
  };

  const handleDeleteSlip = async (slip) => {
    if (!window.confirm(`Deseja excluir o romaneio ${slip.id} (${slip.truckPlate})?`)) return;
    try {
      await api.delete(`/api/weighings/${slip.id}`);
      showNotification(`Romaneio ${slip.id} excluído.`);
      fetchSlips();
    } catch (err) {
      console.error(err);
      showErrorNotification(err.message || 'Não foi possível excluir o romaneio.');
    }
  };

  const handleCreateSlip = async (e) => {
    e.preventDefault();
    if (submittingSlip) return;
    setSubmittingSlip(true);
    try {
      await api.post('/api/weighings', newForm);
      showNotification(`Novo romaneio lançado com sucesso!`);
      setShowNewModal(false);
      fetchSlips();
    } catch (err) {
      console.error(err);
      showErrorNotification(err.message || 'Erro ao lançar romaneio.');
    } finally {
      setSubmittingSlip(false);
    }
  };

  const pendingDivergences = slips.filter(s => s.status === 'Divergente').length;

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-[#091b2e] uppercase">
            <span className="hover:underline cursor-pointer" onClick={() => setCurrentPage && setCurrentPage('dashboard')}>INICIO</span> / PESAGEM
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 mt-1">
            Romaneios de Pesagem & Divergências de Carga
          </h1>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="bg-[#091b2e] hover:bg-[#132c4a] text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Lançar Romaneio
        </button>
      </div>

      {/* Notifications */}
      {notification && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-3 rounded-lg flex items-center gap-2 text-sm shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {errorNotification && (
        <div className="bg-red-50 border border-red-300 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2 text-sm shadow-xs">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{errorNotification}</span>
        </div>
      )}

      {/* KPI Cards (Modular) */}
      <WeighingKpiCards
        pendingDivergences={pendingDivergences}
        slipsCount={slips.length}
        onFilterDivergences={() => setStatusFilter('Divergente')}
      />

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
            className="bg-white border border-gray-300 text-xs rounded-lg px-3 py-2 outline-none font-semibold text-gray-700 cursor-pointer"
          >
            <option value="all">Todos os Status</option>
            <option value="Divergente">Somente Divergentes</option>
            <option value="Ajustado">Ajustados / Compensados</option>
            <option value="Aprovado">Aprovados (Sem Divergência)</option>
          </select>
        </div>
      </div>

      {/* Table (Modular) */}
      <WeighingTable
        slips={slips}
        loading={loading}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        onOpenResolve={handleOpenResolve}
        onOpenEdit={handleOpenEdit}
        onDeleteSlip={handleDeleteSlip}
        onPreviewImage={setPreviewImage}
      />

      {/* Modal: Editar Romaneio (Modular) */}
      <WeighingEditModal
        isOpen={!!editingSlip}
        editingSlip={editingSlip}
        onClose={() => setEditingSlip(null)}
        onSubmit={handleSaveEdit}
        editForm={editForm}
        setEditForm={setEditForm}
        uploadingTicket={uploadingTicket}
        handleTicketUpload={handleTicketUpload}
        handleRemoveTicketImage={handleRemoveTicketImage}
        submittingSlip={submittingSlip}
      />

      {/* Modal: Resolver Divergência (Modular) */}
      <WeighingResolveModal
        resolvingSlip={resolvingSlip}
        onClose={() => setResolvingSlip(null)}
        onResolve={handleResolve}
        resolveWeightChoice={resolveWeightChoice}
        setResolveWeightChoice={setResolveWeightChoice}
        resolutionNotes={resolutionNotes}
        setResolutionNotes={setResolutionNotes}
        submittingResolution={submittingResolution}
      />

      {/* Modal: Lançar Novo Romaneio (Modular) */}
      <WeighingNewModal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        onSubmit={handleCreateSlip}
        newForm={newForm}
        setNewForm={setNewForm}
        uploadingTicket={uploadingTicket}
        handleTicketUpload={handleTicketUpload}
        handleRemoveTicketImage={handleRemoveTicketImage}
        submittingSlip={submittingSlip}
      />

      {/* Modal Lightbox: Visualizar Foto do Romaneio (Modular) */}
      <TicketPreviewModal
        previewImage={previewImage}
        onClose={() => setPreviewImage(null)}
      />
    </div>
  );
}
