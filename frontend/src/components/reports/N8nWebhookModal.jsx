import React from 'react';
import { Settings, X } from 'lucide-react';

export default function N8nWebhookModal({ 
  show, 
  onClose, 
  webhookUrl, 
  setWebhookUrl, 
  onSave 
}) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 print:hidden backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-gray-100">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2 text-gray-900">
            <Settings className="w-5 h-5 text-[#df7b1b]" />
            <h3 className="text-base font-bold">Configurar Webhook do n8n</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSave} className="space-y-3">
          <p className="text-xs text-gray-600">
            Insira a URL do Webhook do seu n8n para que o botão <b>"Salvar no Drive"</b> envie os relatórios automaticamente:
          </p>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              URL do Webhook do n8n (POST):
            </label>
            <input
              type="url"
              required
              placeholder="https://n8n.seusite.com/webhook/salvar-relatorio-drive"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#091b2e] font-mono"
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-[11px] text-blue-900 space-y-1">
            <span className="font-bold block">💡 Dica de Integração:</span>
            <span>O sistema enviará para o n8n o relatório filtrado em planilha Excel (.xls base64), loja, período e totais consolidados via POST.</span>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-[#091b2e] hover:bg-[#132c4a] text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer transition-all shadow-xs"
            >
              Salvar Configuração
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
