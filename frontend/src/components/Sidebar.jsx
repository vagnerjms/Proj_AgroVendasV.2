import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  ChevronDown, 
  ChevronRight, 
  FileText, 
  DollarSign, 
  Users, 
  PlusCircle, 
  ShoppingCart, 
  History, 
  BellRing, 
  BarChart3,
  Boxes,
  Truck,
  Sprout,
  Scale,
  Database,
  ShieldCheck,
  LogOut,
  X
} from 'lucide-react';

export default function Sidebar({ currentPage, setCurrentPage, currentUser, onLogout, mobileOpen, onCloseMobile }) {
  const [comercialOpen, setComercialOpen] = useState(true);
  const [financeiroOpen, setFinanceiroOpen] = useState(false);
  const [cadastrosOpen, setCadastrosOpen] = useState(false);

  const navigateTo = (page) => {
    setCurrentPage(page);
    onCloseMobile?.();
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-xs transition-opacity" 
          aria-hidden="true"
        />
      )}

      {/* Sidebar Drawer */}
      <aside className={`fixed md:sticky top-0 inset-y-0 left-0 z-50 w-64 h-screen bg-[#11311f] text-white flex flex-col shrink-0 select-none shadow-2xl md:shadow-xl print:hidden transition-transform duration-300 ease-in-out ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        {/* Brand Header */}
        <div className="p-4 sm:p-5 flex items-center justify-between border-b border-[#1b432d]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 flex items-center justify-center border border-emerald-500/40">
              <Sprout className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">AgroVenda</span>
          </div>

          {/* Close drawer button for mobile */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="md:hidden text-gray-400 hover:text-white p-1 rounded-lg hover:bg-[#1b432d] transition-colors"
            title="Fechar menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

      {/* Navigation items */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto text-sm font-medium">
        {/* Dashboard Link */}
        <button
          onClick={() => navigateTo('dashboard')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
            currentPage === 'dashboard'
              ? 'bg-[#1e5234] text-white font-semibold shadow-inner'
              : 'text-gray-300 hover:bg-[#163e27] hover:text-white'
          }`}
        >
          <LayoutDashboard className="w-4 h-4 text-emerald-400" />
          <span>Dashboard</span>
        </button>

        {/* Comercial Accordion */}
        <div className="pt-1">
          <button
            onClick={() => setComercialOpen(!comercialOpen)}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-gray-300 hover:bg-[#163e27] hover:text-white transition-colors"
          >
            <div className="flex items-center gap-3">
              <ShoppingBag className="w-4 h-4 text-emerald-400" />
              <span>Comercial</span>
            </div>
            {comercialOpen ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
          </button>

          {comercialOpen && (
            <div className="pl-6 pr-1 py-1 space-y-1">
              <button
                onClick={() => navigateTo('new-purchase')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs transition-colors ${
                  currentPage === 'new-purchase' ? 'bg-[#1e5234] text-white font-semibold' : 'text-gray-300 hover:bg-[#163e27] hover:text-white'
                }`}
              >
                <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>Nova Compra</span>
              </button>

              <button
                onClick={() => navigateTo('new-sale')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs transition-colors ${
                  currentPage === 'new-sale' ? 'bg-[#1e5234] text-white font-semibold' : 'text-gray-300 hover:bg-[#163e27] hover:text-white'
                }`}
              >
                <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>Nova Venda</span>
              </button>

              <button
                onClick={() => navigateTo('purchases-history')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs transition-colors ${
                  currentPage === 'purchases-history' ? 'bg-[#1e5234] text-white font-semibold' : 'text-gray-300 hover:bg-[#163e27] hover:text-white'
                }`}
              >
                <History className="w-3.5 h-3.5 text-emerald-400" />
                <span>Hist. Compras</span>
              </button>

              <button
                onClick={() => navigateTo('sales-history')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs transition-colors ${
                  currentPage === 'sales-history' ? 'bg-[#1e5234] text-white font-semibold' : 'text-gray-300 hover:bg-[#163e27] hover:text-white'
                }`}
              >
                <History className="w-3.5 h-3.5 text-emerald-400" />
                <span>Hist. Vendas</span>
              </button>

              {/* Romaneios & Pesagem */}
              <button
                onClick={() => navigateTo('weighing-slips')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs transition-colors ${
                  currentPage === 'weighing-slips' ? 'bg-[#1e5234] text-white font-semibold' : 'text-gray-300 hover:bg-[#163e27] hover:text-white'
                }`}
              >
                <Scale className="w-3.5 h-3.5 text-emerald-400" />
                <span>Romaneios & Pesagem</span>
              </button>

              <button
                onClick={() => navigateTo('alerts')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs transition-colors ${
                  currentPage === 'alerts' ? 'bg-[#1e5234] text-white font-semibold' : 'text-gray-300 hover:bg-[#163e27] hover:text-white'
                }`}
              >
                <BellRing className="w-3.5 h-3.5 text-emerald-400" />
                <span>Agenda & Alertas</span>
              </button>

              <button
                onClick={() => navigateTo('reports')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs transition-colors ${
                  currentPage === 'reports' ? 'bg-[#1e5234] text-white font-semibold' : 'text-gray-300 hover:bg-[#163e27] hover:text-white'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Relatórios</span>
              </button>
            </div>
          )}
        </div>

        {/* Financeiro & Fiscal Accordion */}
        <div className="pt-1">
          <button
            onClick={() => setFinanceiroOpen(!financeiroOpen)}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-gray-300 hover:bg-[#163e27] hover:text-white transition-colors"
          >
            <div className="flex items-center gap-3">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span>Financeiro & Fiscal</span>
            </div>
            {financeiroOpen ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
          </button>

          {financeiroOpen && (
            <div className="pl-6 pr-1 py-1 space-y-1">
              <button
                onClick={() => navigateTo('financial')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs transition-colors ${
                  currentPage === 'financial' ? 'bg-[#1e5234] text-white font-semibold' : 'text-gray-300 hover:bg-[#163e27] hover:text-white'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                <span>Contas e Fluxo</span>
              </button>
              <button
                onClick={() => navigateTo('financial-funrural')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs transition-colors ${
                  currentPage === 'financial-funrural' ? 'bg-[#1e5234] text-white font-semibold' : 'text-gray-300 hover:bg-[#163e27] hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-emerald-400" />
                <span>Apuração FUNRURAL</span>
              </button>
            </div>
          )}
        </div>

        {/* Cadastros Accordion */}
        <div className="pt-1">
          <button
            onClick={() => setCadastrosOpen(!cadastrosOpen)}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-gray-300 hover:bg-[#163e27] hover:text-white transition-colors"
          >
            <div className="flex items-center gap-3">
              <Users className="w-4 h-4 text-emerald-400" />
              <span>Cadastros</span>
            </div>
            {cadastrosOpen ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
          </button>

          {cadastrosOpen && (
            <div className="pl-6 pr-1 py-1 space-y-1">
              <button
                onClick={() => navigateTo('cadastros-clients')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs transition-colors ${
                  currentPage === 'cadastros-clients' ? 'bg-[#1e5234] text-white font-semibold' : 'text-gray-300 hover:bg-[#163e27] hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                <span>Clientes & Produtores</span>
              </button>
              <button
                onClick={() => navigateTo('cadastros-products')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs transition-colors ${
                  currentPage === 'cadastros-products' ? 'bg-[#1e5234] text-white font-semibold' : 'text-gray-300 hover:bg-[#163e27] hover:text-white'
                }`}
              >
                <Boxes className="w-3.5 h-3.5 text-emerald-400" />
                <span>Produtos & Grãos</span>
              </button>
              <button
                onClick={() => navigateTo('cadastros-users')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs transition-colors ${
                  currentPage === 'cadastros-users' ? 'bg-[#1e5234] text-white font-semibold' : 'text-gray-300 hover:bg-[#163e27] hover:text-white'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Usuários & Permissões</span>
              </button>
              <button
                onClick={() => navigateTo('backup-restore')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs transition-colors ${
                  currentPage === 'backup-restore' ? 'bg-[#1e5234] text-white font-semibold' : 'text-gray-300 hover:bg-[#163e27] hover:text-white'
                }`}
              >
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                <span>Backup & Restauração</span>
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Bottom Status & Logout Footer */}
      <div className="p-4 border-t border-[#1b432d] space-y-3">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Docker + Mongo</span>
          </div>
          <span className="bg-[#1b432d] px-2 py-0.5 rounded text-[10px] text-emerald-300">v2.0.0</span>
        </div>

        {onLogout && (
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-300 hover:text-red-100 text-xs font-bold transition-all border border-red-900/40"
            title="Encerrar sessão de trabalho"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Encerrar Sessão</span>
          </button>
        )}
      </div>
    </aside>
    </>
  );
}
