import React from 'react';
import { X, Check, CheckCircle2, Camera, Paperclip, Eye } from 'lucide-react';
import { formatNumber } from '../../utils/formatters';

export default function WeighingEditModal({
  isOpen = false,
  editingSlip = null,
  onClose,
  onSubmit,
  editForm,
  setEditForm,
  uploadingTicket,
  handleTicketUpload,
  handleRemoveTicketImage,
  submittingSlip
}) {
  if (!isOpen || !editingSlip) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <form onSubmit={onSubmit} className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
          <div>
            <span className="text-xs font-bold text-emerald-700 uppercase">Romaneio de Pesagem</span>
            <h3 className="text-base font-bold text-gray-900">Editar Romaneio {editingSlip.id}</h3>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer">
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
              onChange={e => setEditForm({ ...editForm, originWeightKg: Number(e.target.value) })}
              className="w-full border border-gray-300 rounded-lg p-2 text-xs outline-none focus:ring-2 focus:ring-[#1d5a37]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Peso Destino (kg)</label>
            <input
              type="number"
              value={editForm.destWeightKg}
              onChange={e => setEditForm({ ...editForm, destWeightKg: Number(e.target.value) })}
              className="w-full border border-gray-300 rounded-lg p-2 text-xs outline-none focus:ring-2 focus:ring-[#1d5a37]"
            />
          </div>
        </div>

        {/* Opções de Ajuste de Peso na Venda */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
            ⚖️ Opção de Ajuste de Peso na Venda
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setEditForm({ ...editForm, weightChoice: 'origin', destWeightKg: editForm.originWeightKg, status: 'Ajustado' })}
              className={`p-3 rounded-lg border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                editForm.weightChoice === 'origin'
                  ? 'bg-blue-50 border-blue-600 ring-2 ring-blue-500/20 text-blue-950 font-bold'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-600">Considerar Peso Origem</span>
                <input type="radio" checked={editForm.weightChoice === 'origin'} readOnly className="text-blue-600" />
              </div>
              <span className="text-sm font-extrabold text-slate-900">{formatNumber(editForm.originWeightKg, 0)} kg</span>
              <span className="text-[10px] text-slate-500">~{Math.round((editForm.originWeightKg || 0) / 29)} caixas</span>
            </button>

            <button
              type="button"
              onClick={() => setEditForm({ ...editForm, weightChoice: 'dest', originWeightKg: editForm.destWeightKg, status: 'Ajustado' })}
              className={`p-3 rounded-lg border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                editForm.weightChoice === 'dest'
                  ? 'bg-emerald-50 border-emerald-600 ring-2 ring-emerald-500/20 text-emerald-950 font-bold'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-600">Considerar Peso Destino</span>
                <input type="radio" checked={editForm.weightChoice === 'dest'} readOnly className="text-emerald-600" />
              </div>
              <span className="text-sm font-extrabold text-slate-900">{formatNumber(editForm.destWeightKg, 0)} kg</span>
              <span className="text-[10px] text-slate-500">~{Math.round((editForm.destWeightKg || 0) / 29)} caixas</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-200 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>
              Ao salvar, a venda vinculada (<b>{editingSlip.saleId || editingSlip.id.replace('ROM-', '')}</b>) será ajustada para <b>{formatNumber(editForm.weightChoice === 'origin' ? editForm.originWeightKg : editForm.destWeightKg, 0)} kg</b>.
            </span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
          <select
            value={editForm.status}
            onChange={e => setEditForm({ ...editForm, status: e.target.value })}
            className="w-full border border-gray-300 rounded-lg p-2 text-xs outline-none focus:ring-2 focus:ring-[#1d5a37]"
          >
            <option value="Ajustado">Ajustado (Reconciliado)</option>
            <option value="Divergente">Divergente</option>
            <option value="Aprovado">Aprovado</option>
          </select>
        </div>

        {/* Upload da Imagem do Romaneio */}
        <div className="space-y-1.5 pt-1">
          <label className="block text-xs font-semibold text-gray-700">
            📸 Imagem do Romaneio / Ticket de Balança
          </label>

          {editForm.ticketImage ? (
            <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="flex items-center gap-2.5 overflow-hidden">
                {editForm.ticketImage.match(/\.(jpg|jpeg|png|webp|gif)$/i) ? (
                  <img 
                    src={`/uploads/${editForm.ticketImage}`} 
                    alt="Romaneio" 
                    className="w-11 h-11 object-cover rounded-lg border border-emerald-300 shadow-xs cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => window.open(`/uploads/${editForm.ticketImage}`, '_blank')}
                    title="Clique para ampliar"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-800 shrink-0">
                    <Paperclip className="w-5 h-5" />
                  </div>
                )}
                <div className="truncate text-xs">
                  <div className="font-bold text-emerald-950 truncate max-w-[240px]">
                    {editForm.ticketImage}
                  </div>
                  <button
                    type="button"
                    onClick={() => window.open(`/uploads/${editForm.ticketImage}`, '_blank')}
                    className="text-[11px] text-emerald-700 hover:underline flex items-center gap-1 mt-0.5 font-medium cursor-pointer"
                  >
                    <Eye className="w-3 h-3" />
                    Visualizar imagem
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleRemoveTicketImage(true)}
                className="text-red-500 hover:text-red-700 hover:bg-red-100 p-1.5 rounded-full transition-colors cursor-pointer"
                title="Excluir anexo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="border-2 border-dashed border-gray-300 hover:border-emerald-600 bg-gray-50/70 hover:bg-emerald-50/20 rounded-xl p-3.5 flex flex-col items-center justify-center cursor-pointer transition-all group text-center">
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => handleTicketUpload(e, true)}
                disabled={uploadingTicket}
                className="hidden"
              />
              {uploadingTicket ? (
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 py-1">
                  <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                  <span>Enviando imagem do romaneio...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-gray-600 group-hover:text-emerald-800 font-semibold">
                  <Camera className="w-4 h-4 text-gray-400 group-hover:text-emerald-700" />
                  <span>Clique para anexar a foto do romaneio</span>
                </div>
              )}
              <span className="text-[10px] text-gray-400 mt-1">Formatos aceitos: JPG, PNG, WEBP ou PDF</span>
            </label>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submittingSlip}
            className="bg-[#091b2e] hover:bg-[#132c4a] text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer transition-all flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{submittingSlip ? 'Ajustando...' : 'Ajustar & Salvar'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
