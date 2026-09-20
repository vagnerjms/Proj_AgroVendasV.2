import React, { useState, useRef, useEffect } from 'react';
import { Building2, Check, ChevronDown, Search, X, CheckSquare, Square } from 'lucide-react';

export default function MultiStoreSelect({ 
  stores = [], 
  selectedStores = [], 
  onChange 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef(null);

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Lista normalizada de lojas (suporta array de strings ou array de objetos { loja, pedidosVenda })
  const storeList = stores.map(s => {
    if (typeof s === 'string') return { name: s, count: null };
    return { name: s.loja || s.name, count: s.pedidosVenda ?? s.count ?? null };
  }).filter(s => !!s.name);

  // Lojas filtradas pelo campo de busca
  const filteredList = storeList.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const isAllSelected = selectedStores.length === 0 || selectedStores.length === storeList.length;
  const isCustomSelected = selectedStores.length > 0 && selectedStores.length < storeList.length;

  const handleToggleStore = (storeName) => {
    let nextSelected = [];
    if (isAllSelected) {
      // Se estava tudo marcado e o usuário desmarcou uma, todas menos essa ficam marcadas
      nextSelected = storeList.map(s => s.name).filter(n => n !== storeName);
    } else if (selectedStores.includes(storeName)) {
      nextSelected = selectedStores.filter(n => n !== storeName);
    } else {
      nextSelected = [...selectedStores, storeName];
    }
    onChange(nextSelected);
  };

  const handleSelectAll = () => {
    onChange([]); // Array vazio representa todas
    setSearch('');
  };

  const handleClear = () => {
    onChange([]); // Reset para todas
    setSearch('');
  };

  const getButtonText = () => {
    if (isAllSelected) {
      return `Todas as Lojas (${storeList.length})`;
    }
    if (selectedStores.length === 1) {
      return selectedStores[0];
    }
    return `${selectedStores.length} Lojas Selecionadas`;
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Botão de Disparo do Dropdown */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between gap-2 bg-white border text-xs rounded-lg px-3 py-2 outline-none font-semibold transition-all shadow-sm cursor-pointer min-w-[210px] max-w-[320px] ${
          isCustomSelected 
            ? 'border-emerald-600 ring-2 ring-emerald-600/20 text-emerald-950 bg-emerald-50/30' 
            : 'border-gray-300 text-gray-800 hover:bg-gray-50'
        }`}
        title={isCustomSelected ? selectedStores.join(', ') : 'Filtrar por uma ou mais lojas'}
      >
        <div className="flex items-center gap-1.5 truncate">
          <Building2 className={`w-3.5 h-3.5 shrink-0 ${isCustomSelected ? 'text-emerald-700' : 'text-gray-400'}`} />
          <span className="truncate">{getButtonText()}</span>
        </div>
        
        <div className="flex items-center gap-1 shrink-0">
          {isCustomSelected && (
            <span className="bg-emerald-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
              {selectedStores.length}
            </span>
          )}
          <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Painel Popover de Seleção com Busca e Checkboxes */}
      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden animate-in fade-in duration-100">
          
          {/* Header e Busca */}
          <div className="p-3 bg-gray-50/80 border-b border-gray-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                <span>Selecionar Lojas</span>
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-0.5 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Input de Busca Rápida */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Buscar loja ou rede..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg pl-8 pr-7 py-1.5 text-xs text-gray-800 outline-none focus:ring-2 focus:ring-emerald-700"
                autoFocus
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Ações Rápidas: Marcar Todas e Limpar */}
            <div className="flex items-center justify-between text-[11px] pt-1">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-emerald-800 hover:text-emerald-950 font-bold hover:underline cursor-pointer"
              >
                Marcar Todas
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="text-gray-500 hover:text-gray-800 font-medium hover:underline cursor-pointer"
              >
                Restaurar Todas
              </button>
            </div>
          </div>

          {/* Lista com Rolagem das Lojas */}
          <div className="max-h-60 overflow-y-auto divide-y divide-gray-100 p-1">
            {filteredList.length === 0 ? (
              <div className="py-6 text-center text-xs text-gray-400">
                Nenhuma loja encontrada para "{search}"
              </div>
            ) : (
              filteredList.map((store) => {
                const isChecked = isAllSelected || selectedStores.includes(store.name);
                return (
                  <label
                    key={store.name}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors text-xs select-none ${
                      isChecked ? 'bg-emerald-50/60 font-bold text-gray-900' : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleStore(store.name)}
                        className="w-3.5 h-3.5 text-emerald-700 rounded border-gray-300 focus:ring-emerald-600 cursor-pointer"
                      />
                      <span className="truncate">{store.name}</span>
                    </div>

                    {store.count !== null && (
                      <span className="text-[10px] text-gray-400 font-semibold shrink-0 ml-2">
                        {store.count} VPs
                      </span>
                    )}
                  </label>
                );
              })
            )}
          </div>

          {/* Footer com Contador e Concluir */}
          <div className="p-2.5 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs">
            <span className="text-[11px] text-gray-500 font-medium">
              <strong>{isAllSelected ? storeList.length : selectedStores.length}</strong> de {storeList.length} lojas
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow-xs cursor-pointer transition-colors"
            >
              Aplicar Soma
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
