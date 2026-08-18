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
      <aside className={`fixed md:sticky top-0 inset-y-0 left-0 z-50 w-64 h-screen bg-[#091b2e] text-white flex flex-col shrink-0 select-none shadow-2xl md:shadow-xl print:hidden transition-transform duration-300 ease-in-out ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        {/* Brand Header */}
        <div className="p-4 sm:p-5 flex items-center justify-between border-b border-[#162e4a]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-teal-500/20 flex items-center justify-center border border-teal-400/30 shadow-xs">
              <Sprout className="w-5 h-5 text-teal-300" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">AgroVenda</span>
          </div>

          {/* Close drawer button for mobile */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="md:hidden text-[#8fa3bf] hover:text-white p-1 rounded-lg hover:bg-[#132c4a] transition-colors"
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
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-all ${
            currentPage === 'dashboard'
              ? 'bg-[#df7b1b] text-white font-bold shadow-sm'
              : 'text-[#8fa3bf] hover:bg-[#132c4a] hover:text-white'
          }`}
        >
          <LayoutDashboard className={`w-4 h-4 ${currentPage === 'dashboard' ? 'text-white' : 'text-[#8fa3bf]'}`} />
          <span>Dashboard</span>
        </button>

        {/* Comercial Accordion */}
        <div className="pt-1">
          <button
            onClick={() => setComercialOpen(!comercialOpen)}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-[#8fa3bf] hover:bg-[#132c4a] hover:text-white transition-colors"
          >
            <div className="flex items-center gap-3">
              <ShoppingBag className="w-4 h-4 text-[#8fa3bf]" />
              <span>Comercial</span>
            </div>
            {comercialOpen ? <ChevronDown className="w-4 h-4 text-[#8fa3bf]" /> : <ChevronRight className="w-4 h-4 text-[#8fa3bf]" />}
          </button>

          {comercialOpen && (
            <div className="pl-6 pr-1 py-1 space-y-1">
              <button
                onClick={() => navigateTo('new-purchase')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs transition-colors ${
                  currentPage === 'new-purchase' ? 'bg-[#df7b1b] text-white font-bold' : 'text-[#8fa3bf] hover:bg-[#132c4a] hover:text-white'
                }`}
              >
                <PlusCircle className={`w-3.5 h-3.5 ${currentPage === 'new-purchase' ? 'text-white' : 'text-[#8fa3bf]'}`} />
                <span>Nova Compra</span>
              </button>

              <button
                onClick={() => navigateTo('new-sale')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs transition-colors ${
                  currentPage === 'new-sale' ? 'bg-[#df7b1b] text-white font-bold' : 'text-[#8fa3bf] hover:bg-[#132c4a] hover:text-white'
                }`}
              >
                <PlusCircle className={`w-3.5 h-3.5 ${currentPage === 'new-sale' ? 'text-white' : 'text-[#8fa3bf]'}`} />
                <span>Nova Venda</span>
              </button>

              <button
                onClick={() => navigateTo('purchases-history')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs transition-colors ${
                  currentPage === 'purchases-history' ? 'bg-[#df7b1b] text-white font-bold' : 'text-[#8fa3bf] hover:bg-[#132c4a] hover:text-white'
                }`}
              >
                <History className={`w-3.5 h-3.5 ${currentPage === 'purchases-history' ? 'text-white' : 'text-[#8fa3bf]'}`} />
                <span>Hist. Compras</span>
              </button>

              <button
                onClick={() => navigateTo('sales-history')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs transition-colors ${
                  currentPage === 'sales-history' ? 'bg-[#df7b1b] text-white font-bold' : 'text-[#8fa3bf] hover:bg-[#132c4a] hover:text-white'
                }`}
              >
                <History className={`w-3.5 h-3.5 ${currentPage === 'sales-history' ? 'text-white' : 'text-[#8fa3bf]'}`} />
                <span>Hist. Vendas</span>
              </button>

              {/* Romaneios & Pesagem */}
              <button
                onClick={() => navigateTo('weighing-slips')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs transition-colors ${
                  currentPage === 'weighing-slips' ? 'bg-[#df7b1b] text-white font-bold' : 'text-[#8fa3bf] hover:bg-[#132c4a] hover:text-white'
                }`}
              >
                <Scale className={`w-3.5 h-3.5 ${currentPage === 'weighing-slips' ? 'text-white' : 'text-[#8fa3bf]'}`} />
                <span>Romaneios & Pesagem</span>
              </button>

              <button
                onClick={() => navigateTo('alerts')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs transition-colors ${
                  currentPage === 'alerts' ? 'bg-[#df7b1b] text-white font-bold' : 'text-[#8fa3bf] hover:bg-[#132c4a] hover:text-white'
                }`}
              >
                <BellRing className={`w-3.5 h-3.5 ${currentPage === 'alerts' ? 'text-white' : 'text-[#8fa3bf]'}`} />
                <span>Agenda & Alertas</span>
              </button>

              <button
                onClick={() => navigateTo('reports')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs transition-colors ${
                  currentPage === 'reports' ? 'bg-[#df7b1b] text-white font-bold' : 'text-[#8fa3bf] hover:bg-[#132c4a] hover:text-white'
                }`}
              >
                <BarChart3 className={`w-3.5 h-3.5 ${currentPage === 'reports' ? 'text-white' : 'text-[#8fa3bf]'}`} />
                <span>Relatórios</span>
              </button>
            </div>
          )}
        </div>

        {/* Financeiro & Fiscal Accordion */}
        <div className="pt-1">
          <button
            onClick={() => setFinanceiroOpen(!financeiroOpen)}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-[#8fa3bf] hover:bg-[#132c4a] hover:text-white transition-colors"
          >
            <div className="flex items-center gap-3">
              <DollarSign className="w-4 h-4 text-[#8fa3bf]" />
              <span>Financeiro & Fiscal</span>
            </div>
            {financeiroOpen ? <ChevronDown className="w-4 h-4 text-[#8fa3bf]" /> : <ChevronRight className="w-4 h-4 text-[#8fa3bf]" />}
          </button>

          {financeiroOpen && (
            <div className="pl-6 pr-1 py-1 space-y-1">
              <button
                onClick={() => navigateTo('financial')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs transition-colors ${
                  currentPage === 'financial' ? 'bg-[#df7b1b] text-white font-bold' : 'text-[#8fa3bf] hover:bg-[#132c4a] hover:text-white'
                }`}
              >
                <DollarSign className={`w-3.5 h-3.5 ${currentPage === 'financial' ? 'text-white' : 'text-[#8fa3bf]'}`} />
                <span>Contas e Fluxo</span>
              </button>
              <button
                onClick={() => navigateTo('financial-funrural')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs transition-colors ${
                  currentPage === 'financial-funrural' ? 'bg-[#df7b1b] text-white font-bold' : 'text-[#8fa3bf] hover:bg-[#132c4a] hover:text-white'
                }`}
              >
                <FileText className={`w-3.5 h-3.5 ${currentPage === 'financial-funrural' ? 'text-white' : 'text-[#8fa3bf]'}`} />
                <span>Apuração FUNRURAL</span>
              </button>
            </div>
          )}
        </div>

        {/* Cadastros Accordion */}
        <div className="pt-1">
          <button
            onClick={() => setCadastrosOpen(!cadastrosOpen)}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-[#8fa3bf] hover:bg-[#132c4a] hover:text-white transition-colors"
          >
            <div className="flex items-center gap-3">
              <Users className="w-4 h-4 text-[#8fa3bf]" />
              <span>Cadastros</span>
            </div>
            {cadastrosOpen ? <ChevronDown className="w-4 h-4 text-[#8fa3bf]" /> : <ChevronRight className="w-4 h-4 text-[#8fa3bf]" />}
          </button>

          {cadastrosOpen && (
            <div className="pl-6 pr-1 py-1 space-y-1">
              <button
                onClick={() => navigateTo('cadastros-clients')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs transition-colors ${
                  currentPage === 'cadastros-clients' ? 'bg-[#df7b1b] text-white font-bold' : 'text-[#8fa3bf] hover:bg-[#132c4a] hover:text-white'
                }`}
              >
                <Users className={`w-3.5 h-3.5 ${currentPage === 'cadastros-clients' ? 'text-white' : 'text-[#8fa3bf]'}`} />
                <span>Clientes & Produtores</span>
              </button>
              <button
                onClick={() => navigateTo('cadastros-products')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs transition-colors ${
                  currentPage === 'cadastros-products' ? 'bg-[#df7b1b] text-white font-bold' : 'text-[#8fa3bf] hover:bg-[#132c4a] hover:text-white'
                }`}
              >
                <Boxes className={`w-3.5 h-3.5 ${currentPage === 'cadastros-products' ? 'text-white' : 'text-[#8fa3bf]'}`} />
                <span>Produtos & Grãos</span>
              </button>
              <button
                onClick={() => navigateTo('cadastros-users')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs transition-colors ${
                  currentPage === 'cadastros-users' ? 'bg-[#df7b1b] text-white font-bold' : 'text-[#8fa3bf] hover:bg-[#132c4a] hover:text-white'
                }`}
              >
                <ShieldCheck className={`w-3.5 h-3.5 ${currentPage === 'cadastros-users' ? 'text-white' : 'text-[#8fa3bf]'}`} />
                <span>Usuários & Permissões</span>
              </button>
              <button
                onClick={() => navigateTo('backup-restore')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs transition-colors ${
                  currentPage === 'backup-restore' ? 'bg-[#df7b1b] text-white font-bold' : 'text-[#8fa3bf] hover:bg-[#132c4a] hover:text-white'
                }`}
              >
                <Database className={`w-3.5 h-3.5 ${currentPage === 'backup-restore' ? 'text-white' : 'text-[#8fa3bf]'}`} />
                <span>Backup & Restauração</span>
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Bottom Status & Logout Footer */}
      <div className="p-4 border-t border-[#162e4a] space-y-3">
        <div className="flex items-center justify-between text-xs text-[#8fa3bf]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
            <span>Docker + Mongo</span>
          </div>
          <span className="bg-[#0e3838] text-[#34d399] border border-[#164e4e] px-2 py-0.5 rounded text-[10px] font-semibold">v2.0.0</span>
        </div>

        {onLogout && (
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-red-950/30 hover:bg-red-900/50 text-red-300 hover:text-red-100 text-xs font-bold transition-all border border-red-900/40 cursor-pointer"
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
