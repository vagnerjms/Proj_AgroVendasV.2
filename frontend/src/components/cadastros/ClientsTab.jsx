import React from 'react';
import { Building, MapPin, Phone, Mail, Edit, Trash2 } from 'lucide-react';

export default function ClientsTab({
  clients,
  onEditClient,
  onDeleteClient
}) {
  if (clients.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500 text-xs">
        Nenhum parceiro encontrado para os filtros selecionados.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {clients.map(c => (
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
              onClick={() => onEditClient(c)}
              className="text-gray-600 hover:text-emerald-700 hover:bg-emerald-50 px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Edit className="w-3.5 h-3.5" />
              Editar
            </button>
            <button
              onClick={() => onDeleteClient(c)}
              className="text-gray-400 hover:text-red-600 hover:bg-red-50 px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Excluir
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
