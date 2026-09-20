import React from 'react';
import { X, Camera, Paperclip, Eye } from 'lucide-react';

export default function WeighingNewModal({
  isOpen = false,
  onClose,
  onSubmit,
  newForm,
  setNewForm,
  uploadingTicket,
  handleTicketUpload,
  handleRemoveTicketImage,
  submittingSlip
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <form onSubmit={onSubmit} className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
        <div className="flex justify-between items-center border-b border-gray-100 pb-2">
          <h3 className="text-base font-bold text-gray-900">Novo Romaneio de Pesagem</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Placa do Veículo</label>
            <input
              type="text"
              required
              placeholder="Ex: RVE-9B12"
              value={newForm.truckPlate}
              onChange={e => setNewForm({ ...newForm, truckPlate: e.target.value })}
              className="w-full border border-gray-300 rounded-lg p-2 text-xs uppercase outline-none focus:ring-2 focus:ring-[#091b2e]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Motorista</label>
            <input
              type="text"
              placeholder="Nome do motorista"
              value={newForm.driverName}
              onChange={e => setNewForm({ ...newForm, driverName: e.target.value })}
              className="w-full border border-gray-300 rounded-lg p-2 text-xs outline-none focus:ring-2 focus:ring-[#091b2e]"
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
              className="w-full border border-gray-300 rounded-lg p-2 text-xs outline-none focus:ring-2 focus:ring-[#091b2e]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Peso Destino (kg)</label>
            <input
              type="number"
              required
              value={newForm.destWeightKg}
              onChange={e => setNewForm({ ...newForm, destWeightKg: e.target.value })}
              className="w-full border border-gray-300 rounded-lg p-2 text-xs outline-none focus:ring-2 focus:ring-[#091b2e]"
            />
          </div>
        </div>

        {/* Upload da Imagem do Romaneio */}
        <div className="space-y-1.5 pt-1">
          <label className="block text-xs font-semibold text-gray-700">
            📸 Imagem do Romaneio / Ticket de Balança
          </label>

          {newForm.ticketImage ? (
            <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="flex items-center gap-2.5 overflow-hidden">
                {newForm.ticketImage.match(/\.(jpg|jpeg|png|webp|gif)$/i) ? (
                  <img 
                    src={`/uploads/${newForm.ticketImage}`} 
                    alt="Romaneio" 
                    className="w-10 h-10 object-cover rounded-lg border border-emerald-300 shadow-xs cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => window.open(`/uploads/${newForm.ticketImage}`, '_blank')}
                    title="Clique para ampliar"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-800 shrink-0">
                    <Paperclip className="w-5 h-5" />
                  </div>
                )}
                <div className="truncate text-xs">
                  <div className="font-bold text-emerald-950 truncate max-w-[220px]">
                    {newForm.ticketImage}
                  </div>
                  <button
                    type="button"
                    onClick={() => window.open(`/uploads/${newForm.ticketImage}`, '_blank')}
                    className="text-[10px] text-emerald-700 hover:underline flex items-center gap-1 mt-0.5 font-medium cursor-pointer"
                  >
                    <Eye className="w-3 h-3" />
                    Visualizar imagem
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleRemoveTicketImage(false)}
                className="text-red-500 hover:text-red-700 hover:bg-red-100 p-1.5 rounded-full transition-colors cursor-pointer shrink-0"
                title="Excluir imagem do romaneio"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="border-2 border-dashed border-gray-300 hover:border-emerald-600 bg-gray-50/70 hover:bg-emerald-50/20 rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer transition-all group text-center">
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => handleTicketUpload(e, false)}
                disabled={uploadingTicket}
                className="hidden"
              />
              {uploadingTicket ? (
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 py-1">
                  <div className="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                  <span>Enviando imagem...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-gray-600 group-hover:text-emerald-800 font-semibold">
                  <Camera className="w-4 h-4 text-gray-400 group-hover:text-emerald-700" />
                  <span>Clique para anexar imagem do romaneio</span>
                </div>
              )}
              <span className="text-[10px] text-gray-400 mt-0.5">Formatos: JPG, PNG, WEBP ou PDF</span>
            </label>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
          <button
            type="button"
            disabled={submittingSlip}
            onClick={onClose}
            className="px-4 py-2 text-xs text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submittingSlip}
            className="bg-[#091b2e] hover:bg-[#132c4a] disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer transition-all flex items-center gap-2"
          >
            {submittingSlip && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            <span>{submittingSlip ? 'Gravando...' : 'Salvar Romaneio'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
