import React, { useState, useRef, useEffect } from 'react';
import { Package, ChevronDown, Search, X } from 'lucide-react';

/**
 * Multi-produto espelhando MultiStoreSelect.
 * Array vazio = nenhum produto (zero resultados) quando emptyMeansNone=true.
 */
export default function MultiProductSelect({
  products = [],
  selectedProducts = [],
  onChange,
  emptyMeansNone = true
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const productList = products.map(p => {
    if (typeof p === 'string') return { name: p, count: null };
    return { name: p.name || p.product || p, count: p.count ?? null };
  }).filter(p => !!p.name);

  const filteredList = productList.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const isAllSelected =
    productList.length > 0 &&
    selectedProducts.length === productList.length &&
    productList.every(p => selectedProducts.includes(p.name));
  const isNoneSelected = selectedProducts.length === 0;
  const isCustomSelected = !isAllSelected && !isNoneSelected;

  const handleToggle = (name) => {
    if (selectedProducts.includes(name)) {
      onChange(selectedProducts.filter(n => n !== name));
    } else {
      onChange([...selectedProducts, name]);
    }
  };

  const getButtonText = () => {
    if (isNoneSelected) {
      return emptyMeansNone ? 'Nenhum produto' : `Todos os Produtos (${productList.length})`;
    }
    if (isAllSelected) return `Todos os Produtos (${productList.length})`;
    if (selectedProducts.length === 1) return selectedProducts[0];
    return `${selectedProducts.length} Produtos Selecionados`;
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between gap-2 bg-white border text-xs rounded-lg px-3 py-2 outline-none font-semibold transition-all shadow-sm cursor-pointer min-w-[210px] max-w-[320px] ${
          isCustomSelected || isNoneSelected
            ? 'border-emerald-600 ring-2 ring-emerald-600/20 text-emerald-950 bg-emerald-50/30'
            : 'border-gray-300 text-gray-800 hover:bg-gray-50'
        }`}
        title={isCustomSelected ? selectedProducts.join(', ') : 'Filtrar por um ou mais produtos'}
      >
        <div className="flex items-center gap-1.5 truncate">
          <Package className={`w-3.5 h-3.5 shrink-0 ${isCustomSelected || isNoneSelected ? 'text-emerald-700' : 'text-gray-400'}`} />
          <span className="truncate">{getButtonText()}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {isCustomSelected && (
            <span className="bg-emerald-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
              {selectedProducts.length}
            </span>
          )}
          <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden animate-in fade-in duration-100">
          <div className="p-3 bg-gray-50/80 border-b border-gray-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1">
                <Package className="w-3.5 h-3.5 text-emerald-700" />
                <span>Selecionar Produtos</span>
              </span>
              <button type="button" onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600 p-0.5 rounded cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Buscar produto..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg pl-8 pr-7 py-1.5 text-xs text-gray-800 outline-none focus:ring-2 focus:ring-emerald-700"
                autoFocus
              />
            </div>
            <div className="flex items-center justify-between text-[11px] pt-1">
              <button type="button" onClick={() => { onChange(productList.map(p => p.name)); setSearch(''); }} className="text-emerald-800 hover:text-emerald-950 font-bold hover:underline cursor-pointer">
                Marcar Todos
              </button>
              <button type="button" onClick={() => { onChange([]); setSearch(''); }} className="text-gray-500 hover:text-gray-800 font-medium hover:underline cursor-pointer">
                Desmarcar Todos
              </button>
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto divide-y divide-gray-100 p-1">
            {filteredList.length === 0 ? (
              <div className="py-6 text-center text-xs text-gray-400">Nenhum produto encontrado</div>
            ) : (
              filteredList.map((prod) => {
                const isChecked = selectedProducts.includes(prod.name);
                return (
                  <label
                    key={prod.name}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors text-xs select-none ${
                      isChecked ? 'bg-emerald-50/60 font-bold text-gray-900' : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggle(prod.name)}
                        className="w-3.5 h-3.5 text-emerald-700 rounded border-gray-300 focus:ring-emerald-600 cursor-pointer"
                      />
                      <span className="truncate">{prod.name}</span>
                    </div>
                  </label>
                );
              })
            )}
          </div>

          <div className="p-2.5 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs">
            <span className="text-[11px] text-gray-500 font-medium">
              <strong>{selectedProducts.length}</strong> de {productList.length} produtos
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow-xs cursor-pointer transition-colors"
            >
              Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
