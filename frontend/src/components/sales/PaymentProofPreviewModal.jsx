import React, { useEffect, useState } from 'react';
import { Paperclip, X, ExternalLink, FileText } from 'lucide-react';
import { authorizedUploadUrl, getAuthToken } from '../../utils/dataHelpers';

/**
 * Modal de comprovante: Abrir original no header + preview inline (PDF/imagem).
 */
export default function PaymentProofPreviewModal({
  filename,
  onClose,
  title = 'Comprovante Financeiro'
}) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [loadError, setLoadError] = useState('');

  const href = authorizedUploadUrl(filename);
  const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(filename || '');
  const isPdf = /\.pdf$/i.test(filename || '');

  useEffect(() => {
    let revoked = false;
    let objectUrl = null;

    async function load() {
      setLoadError('');
      setBlobUrl(null);
      if (!filename || !href) return;

      try {
        const token = getAuthToken();
        const res = await fetch(href, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (!res.ok) {
          throw new Error(res.status === 404 ? 'Arquivo não encontrado' : `Erro ${res.status}`);
        }
        const blob = await res.blob();
        objectUrl = URL.createObjectURL(blob);
        if (!revoked) setBlobUrl(objectUrl);
      } catch (err) {
        if (!revoked) setLoadError(err.message || 'Falha ao carregar anexo');
      }
    }

    load();
    return () => {
      revoked = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [filename, href]);

  if (!filename) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-3xl w-full p-4 shadow-2xl overflow-hidden space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
          <div className="flex items-center gap-2">
            <Paperclip className="w-4 h-4 text-emerald-700" />
            <span className="text-xs font-bold text-gray-900">{title}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <a
              href={href}
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

        <div className="flex items-center justify-center bg-gray-900/5 rounded-xl p-2 min-h-[320px] max-h-[75vh] overflow-auto">
          {loadError ? (
            <div className="text-center p-6 space-y-2">
              <FileText className="w-12 h-12 text-gray-400 mx-auto" />
              <div className="text-xs font-semibold text-red-700">{loadError}</div>
              <div className="text-[11px] text-gray-500 break-all">{filename}</div>
            </div>
          ) : !blobUrl ? (
            <div className="text-xs text-gray-500 font-medium">Carregando preview…</div>
          ) : isImage ? (
            <img
              src={blobUrl}
              alt={title}
              className="max-h-[70vh] w-auto object-contain rounded-lg shadow-sm"
            />
          ) : isPdf ? (
            <iframe
              title={title}
              src={blobUrl}
              className="w-full h-[70vh] rounded-lg border border-gray-200 bg-white"
            />
          ) : (
            <div className="text-center p-6 space-y-2">
              <FileText className="w-12 h-12 text-gray-400 mx-auto" />
              <div className="text-xs font-semibold text-gray-700 break-all">{filename}</div>
              <p className="text-[11px] text-gray-500">Pré-visualização indisponível para este tipo. Use Abrir original.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
