import React, { useState, useEffect, useRef } from 'react';
import { 
  Bell, 
  AlertCircle, 
  AlertTriangle, 
  CheckCircle2, 
  DollarSign, 
  FileText, 
  Scale, 
  RefreshCw, 
  ArrowRight, 
  X,
  Clock
} from 'lucide-react';
import { api } from '../../services/api';
import { formatCurrency } from '../../utils/formatters';

export default function NotificationBell({ onNavigate }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    summary: { total: 0, critical: 0, warning: 0, byCategory: { financeiro: 0, fiscal: 0, romaneios: 0 } },
    notifications: []
  });
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'critical' | 'financeiro' | 'fiscal' | 'romaneios'
  const dropdownRef = useRef(null);

  const fetchNotifications = async (force = false) => {
    try {
      setLoading(true);
      const res = force 
        ? await api.post('/api/notifications/refresh')
        : await api.get('/api/notifications');
      if (res && res.summary) {
        setData(res);
      }
    } catch (err) {
      console.error('Erro ao carregar notificações:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Polling a cada 60 segundos
    const interval = setInterval(() => {
      fetchNotifications();
    }, 60000);

    // Atualiza ao focar na janela do navegador
    const handleFocus = () => fetchNotifications();
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Fechar ao clicar fora
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const { summary, notifications } = data;
  const hasCritical = summary?.critical > 0;
  const hasWarning = summary?.warning > 0;
  const totalCount = summary?.total || 0;

  // Filtragem da lista
  const filteredNotifications = notifications.filter(item => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'critical') return item.severity === 'critical';
    return item.category === activeFilter;
  });

  const handleItemClick = (item) => {
    setOpen(false);
    if (onNavigate && item.targetPage) {
      onNavigate(item.targetPage, item.targetTab, item.entityId);
    }
  };

  const getCategoryIcon = (category, severity) => {
    if (severity === 'critical') return <AlertCircle className="w-4 h-4 text-red-600" />;
    switch (category) {
      case 'financeiro':
        return <DollarSign className="w-4 h-4 text-amber-600" />;
      case 'fiscal':
        return <FileText className="w-4 h-4 text-blue-600" />;
      case 'romaneios':
        return <Scale className="w-4 h-4 text-purple-600" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botão do Sininho */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`relative p-2 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
          open 
            ? 'bg-gray-100 text-[#091b2e]' 
            : 'text-gray-600 hover:text-[#091b2e] hover:bg-gray-100'
        }`}
        title="Central de Notificações e Inconsistências"
        aria-label="Central de Notificações"
      >
        <Bell className={`w-5 h-5 ${hasCritical ? 'text-red-600 animate-swing' : ''}`} />
        
        {totalCount > 0 && (
          <span className={`absolute -top-1 -right-1 flex h-5 min-w-[20px] px-1 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-sm ring-2 ring-white ${
            hasCritical 
              ? 'bg-red-600 animate-pulse' 
              : 'bg-amber-500'
          }`}>
            {totalCount > 99 ? '99+' : totalCount}
          </span>
        )}
      </button>

      {/* Popover / Dropdown Menu */}
      {open && (
        <div className="absolute right-0 mt-2.5 w-[340px] sm:w-[420px] bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-150">
          
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-200 font-bold">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 leading-tight">
                  Central de Notificações
                </h3>
                <p className="text-[11px] text-gray-500">
                  Auditoria de processos e inconsistências
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => fetchNotifications(true)}
                disabled={loading}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                title="Recalcular auditoria agora"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-teal-600' : ''}`} />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Abas Rápidas de Filtro */}
          <div className="px-3 pt-2.5 pb-1 bg-white border-b border-gray-100 flex items-center gap-1.5 overflow-x-auto text-xs font-semibold no-scrollbar">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-[#091b2e] text-white shadow-xs'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Todas ({summary.total})
            </button>

            {summary.critical > 0 && (
              <button
                onClick={() => setActiveFilter('critical')}
                className={`px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                  activeFilter === 'critical'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'text-red-700 bg-red-50 hover:bg-red-100'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                Críticas ({summary.critical})
              </button>
            )}

            {summary.byCategory.financeiro > 0 && (
              <button
                onClick={() => setActiveFilter('financeiro')}
                className={`px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  activeFilter === 'financeiro'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Repasses ({summary.byCategory.financeiro})
              </button>
            )}

            {summary.byCategory.fiscal > 0 && (
              <button
                onClick={() => setActiveFilter('fiscal')}
                className={`px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  activeFilter === 'fiscal'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Fiscais ({summary.byCategory.fiscal})
              </button>
            )}

            {summary.byCategory.romaneios > 0 && (
              <button
                onClick={() => setActiveFilter('romaneios')}
                className={`px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  activeFilter === 'romaneios'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Romaneios ({summary.byCategory.romaneios})
              </button>
            )}
          </div>

          {/* Lista de Notificações */}
          <div className="overflow-y-auto max-h-[380px] divide-y divide-gray-100 p-2 space-y-1.5">
            {filteredNotifications.length === 0 ? (
              <div className="py-10 text-center px-4">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3 border border-emerald-200">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-gray-800">
                  Tudo em conformidade!
                </h4>
                <p className="text-xs text-gray-500 mt-1 max-w-[260px] mx-auto">
                  Nenhuma inconsistência, repasse retido ou quebra de romaneio encontrada.
                </p>
              </div>
            ) : (
              filteredNotifications.map((notif) => {
                const isCrit = notif.severity === 'critical';
                return (
                  <div
                    key={notif.id}
                    className={`p-3 rounded-xl border transition-all text-left flex gap-3 ${
                      isCrit
                        ? 'bg-red-50/40 border-red-200 hover:bg-red-50/70'
                        : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50/70'
                    }`}
                  >
                    {/* Ícone de Categoria */}
                    <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center mt-0.5 border ${
                      isCrit 
                        ? 'bg-red-100/70 border-red-200 text-red-700' 
                        : 'bg-gray-100 border-gray-200 text-gray-700'
                    }`}>
                      {getCategoryIcon(notif.category, notif.severity)}
                    </div>

                    {/* Conteúdo */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                          isCrit
                            ? 'bg-red-600 text-white'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {isCrit ? 'Crítico' : 'Atenção'}
                        </span>
                        
                        {notif.date && (
                          <span className="text-[10px] text-gray-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {notif.date.split('-').reverse().join('/')}
                          </span>
                        )}
                      </div>

                      <h4 className="text-xs font-bold text-gray-900 leading-snug">
                        {notif.title}
                      </h4>

                      <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                        {notif.description}
                      </p>

                      {notif.amount > 0 && (
                        <div className="mt-2 text-xs font-bold text-gray-900 bg-white/80 border border-gray-200 rounded-md px-2 py-1 inline-block">
                          Valor: <span className={isCrit ? 'text-red-700' : 'text-gray-900'}>{formatCurrency(notif.amount)}</span>
                        </div>
                      )}

                      {/* Botão de Ação Direta */}
                      <div className="mt-2.5 flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => handleItemClick(notif)}
                          className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                            isCrit
                              ? 'bg-red-600 hover:bg-red-700 text-white'
                              : 'bg-[#091b2e] hover:bg-[#132c4a] text-white'
                          }`}
                        >
                          <span>{notif.actionLabel || 'Resolver'}</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Auditoria em tempo real
            </span>
            <button
              type="button"
              onClick={() => fetchNotifications(true)}
              className="text-[#df7b1b] hover:underline font-semibold cursor-pointer"
            >
              Recalcular Tudo
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
