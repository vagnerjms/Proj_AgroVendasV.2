import React from 'react';
import { Camera, ExternalLink, X, Paperclip } from 'lucide-react';

export default function TicketPreviewModal({ previewImage = null, onClose }) {
  if (!previewImage) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl max-w-2xl w-full p-4 shadow-2xl overflow-hidden space-y-3"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-emerald-700" />
            <span className="text-xs font-bold text-gray-900">Comprovante de Romaneio do Caminhão</span>
          </div>
          <div className="flex items-center gap-1.5">
            <a
              href={`/uploads/${previewImage}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-emerald-50 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Abrir original</span>
            </a>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-center bg-gray-900/5 rounded-xl p-2 min-h-[260px] max-h-[70vh] overflow-auto">
          {previewImage.match(/\.(jpg|jpeg|png|webp|gif)$/i) ? (
            <img 
              src={`/uploads/${previewImage}`} 
              alt="Romaneio do Caminhão" 
              className="max-h-[65vh] w-auto object-contain rounded-lg shadow-sm"
            />
          ) : (
            <div className="text-center p-6 space-y-2">
              <Paperclip className="w-12 h-12 text-gray-400 mx-auto" />
              <div className="text-xs font-semibold text-gray-700">{previewImage}</div>
              <a
                href={`/uploads/${previewImage}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 bg-[#091b2e] text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Baixar / Abrir Documento</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
