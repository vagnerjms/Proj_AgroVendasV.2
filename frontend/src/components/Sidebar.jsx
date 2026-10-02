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
  History, 
  BellRing, 
  BarChart3,
  Boxes,
  Sprout,
  Scale,
  Database,
  ShieldCheck,
  LogOut,
  X,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';

export default function Sidebar({
  currentPage,
  setCurrentPage,
  currentUser,
  onLogout,
  mobileOpen,
  onCloseMobile,
  collapsed = false,
  onToggleCollapse
}) {
  const [comercialOpen, setComercialOpen] = useState(true);
  const [financeiroOpen, setFinanceiroOpen] = useState(false);
  const [cadastrosOpen, setCadastrosOpen] = useState(false);

  const perms = currentUser?.permissions || {};
  const isAdmin = currentUser?.role === 'Administrador Geral';

  const navigateTo = (page) => {
    setCurrentPage(page);
    onCloseMobile?.();
  };

  const activeCls = 'bg-[#F97316] text-white font-bold shadow-sm';
  const idleCls = 'text-[#8fa3bf] hover:bg-[#132c4a] hover:text-white';

  const NavBtn = ({ page, icon: Icon, label, nested = false }) => (
    <button
      onClick={() => navigateTo(page)}
      title={collapsed ? label : undefined}
      className={`w-full flex items-center ${collapsed && !mobileOpen ? 'justify-center px-2' : nested ? 'gap-2.5 px-3' : 'gap-3 px-3.5'} ${nested ? 'py-2 rounded-md text-xs' : 'py-2.5 rounded-lg'} transition-all ${
        currentPage === page ? activeCls : idleCls
      }`}
    >
      <Icon className={`shrink-0 ${nested ? 'w-3.5 h-3.5' : 'w-4 h-4'} ${currentPage === page ? 'text-white' : 'text-[#8fa3bf]'}`} />
      {(!collapsed || mobileOpen) && <span className="truncate">{label}</span>}
    </button>
  );

  const SectionToggle = ({ open, setOpen, icon: Icon, label }) => (
    <button
      onClick={() => {
        if (collapsed && !mobileOpen) {
          onToggleCollapse?.();
          setOpen(true);
          return;
        }
        setOpen(!open);
      }}
      title={collapsed ? label : undefined}
      className={`w-full flex items-center ${collapsed && !mobileOpen ? 'justify-center px-2' : 'justify-between px-3.5'} py-2.5 rounded-lg text-[#8fa3bf] hover:bg-[#132c4a] hover:text-white transition-colors`}
    >
      <div className={`flex items-center ${collapsed && !mobileOpen ? '' : 'gap-3'}`}>
        <Icon className="w-4 h-4 text-[#8fa3bf] shrink-0" />
        {(!collapsed || mobileOpen) && <span>{label}</span>}
      </div>
      {(!collapsed || mobileOpen) && (open ? <ChevronDown className="w-4 h-4 text-[#8fa3bf]" /> : <ChevronRight className="w-4 h-4 text-[#8fa3bf]" />)}
    </button>
  );

  const showLabels = !collapsed || mobileOpen;

  return (
    <>
      {mobileOpen && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-xs transition-opacity" 
          aria-hidden="true"
        />
      )}

      <aside className={`fixed md:sticky top-0 inset-y-0 left-0 z-50 h-screen bg-[#091b2e] text-white flex flex-col shrink-0 select-none shadow-2xl md:shadow-xl print:hidden transition-all duration-300 ease-in-out ${
        collapsed && !mobileOpen ? 'w-[4.5rem]' : 'w-64'
      } ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        <div className={`p-4 sm:p-5 flex items-center border-b border-[#162e4a] ${showLabels ? 'justify-between' : 'justify-center'}`}>
          <div className={`flex items-center ${showLabels ? 'gap-3' : ''}`}>
            <div className="w-9 h-9 rounded-lg bg-teal-500/20 flex items-center justify-center border border-teal-400/30 shadow-xs shrink-0">
              <Sprout className="w-5 h-5 text-teal-300" />
            </div>
            {showLabels && <span className="text-xl font-bold tracking-tight text-white">AgroVenda</span>}
          </div>

          <button
            type="button"
            onClick={onCloseMobile}
            className="md:hidden text-[#8fa3bf] hover:text-white p-1 rounded-lg hover:bg-[#132c4a] transition-colors"
            title="Fechar menu"
          >
            <X className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden md:inline-flex text-[#8fa3bf] hover:text-white p-1 rounded-lg hover:bg-[#132c4a] transition-colors"
            title={collapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto text-sm font-medium">
        {perms.dashboard !== false && (
          <NavBtn page="dashboard" icon={LayoutDashboard} label="Dashboard" />
        )}

        <div className="pt-1">
          <SectionToggle open={comercialOpen} setOpen={setComercialOpen} icon={ShoppingBag} label="Comercial" />
          {comercialOpen && showLabels && (
            <div className="pl-6 pr-1 py-1 space-y-1">
              {perms.comercial_compras !== false && <NavBtn page="new-purchase" icon={PlusCircle} label="Nova Compra" nested />}
              {perms.comercial_vendas !== false && <NavBtn page="new-sale" icon={PlusCircle} label="Nova Venda" nested />}
              {perms.comercial_compras !== false && <NavBtn page="purchases-history" icon={History} label="Hist. Compras" nested />}
              {perms.comercial_vendas !== false && <NavBtn page="sales-history" icon={History} label="Hist. Vendas" nested />}
              {perms.romaneios_pesagem !== false && <NavBtn page="weighing-slips" icon={Scale} label="Romaneios & Pesagem" nested />}
              {perms.agenda_alertas !== false && <NavBtn page="alerts" icon={BellRing} label="Agenda & Alertas" nested />}
              {perms.relatorios !== false && <NavBtn page="reports" icon={BarChart3} label="Relatórios" nested />}
            </div>
          )}
          {collapsed && !mobileOpen && (
            <div className="py-1 space-y-1">
              {perms.comercial_vendas !== false && <NavBtn page="new-sale" icon={PlusCircle} label="Nova Venda" />}
              {perms.comercial_vendas !== false && <NavBtn page="sales-history" icon={History} label="Hist. Vendas" />}
              {perms.romaneios_pesagem !== false && <NavBtn page="weighing-slips" icon={Scale} label="Romaneios" />}
              {perms.agenda_alertas !== false && <NavBtn page="alerts" icon={BellRing} label="Agenda" />}
              {perms.relatorios !== false && <NavBtn page="reports" icon={BarChart3} label="Relatórios" />}
            </div>
          )}
        </div>

        {perms.financeiro_fiscal !== false && (
          <div className="pt-1">
            <SectionToggle open={financeiroOpen} setOpen={setFinanceiroOpen} icon={DollarSign} label="Financeiro & Fiscal" />
            {financeiroOpen && showLabels && (
              <div className="pl-6 pr-1 py-1 space-y-1">
                <NavBtn page="financial" icon={DollarSign} label="Contas e Fluxo" nested />
                <NavBtn page="financial-funrural" icon={FileText} label="Apuração FUNRURAL" nested />
              </div>
            )}
            {collapsed && !mobileOpen && (
              <div className="py-1 space-y-1">
                <NavBtn page="financial" icon={DollarSign} label="Contas e Fluxo" />
                <NavBtn page="financial-funrural" icon={FileText} label="FUNRURAL" />
              </div>
            )}
          </div>
        )}

        <div className="pt-1">
          <SectionToggle open={cadastrosOpen} setOpen={setCadastrosOpen} icon={Users} label="Cadastros" />
          {cadastrosOpen && showLabels && (
            <div className="pl-6 pr-1 py-1 space-y-1">
              {perms.cadastros_clients !== false && <NavBtn page="cadastros-clients" icon={Users} label="Clientes & Produtores" nested />}
              {perms.cadastros_products !== false && <NavBtn page="cadastros-products" icon={Boxes} label="Produtos & Grãos" nested />}
              {(isAdmin || perms.cadastros_users === true) && <NavBtn page="cadastros-users" icon={ShieldCheck} label="Gestão de Usuários" nested />}
              {(isAdmin || perms.backup_sistema === true) && <NavBtn page="backup" icon={Database} label="Backup & Restauração" nested />}
            </div>
          )}
          {collapsed && !mobileOpen && (
            <div className="py-1 space-y-1">
              {perms.cadastros_clients !== false && <NavBtn page="cadastros-clients" icon={Users} label="Clientes" />}
              {perms.cadastros_products !== false && <NavBtn page="cadastros-products" icon={Boxes} label="Produtos" />}
            </div>
          )}
        </div>
      </nav>

      <div className={`p-4 border-t border-[#162e4a] space-y-3 ${collapsed && !mobileOpen ? 'px-2' : ''}`}>
        {showLabels && (
          <div className="flex items-center justify-between text-xs text-[#8fa3bf]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
              <span>Docker + Mongo</span>
            </div>
            <span className="bg-[#0e3838] text-[#34d399] border border-[#164e4e] px-2 py-0.5 rounded text-[10px] font-semibold">v2.0.0</span>
          </div>
        )}

        {onLogout && (
          <button
            onClick={onLogout}
            className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-red-950/30 hover:bg-red-900/50 text-red-300 hover:text-red-100 text-xs font-bold transition-all border border-red-900/40 cursor-pointer`}
            title="Encerrar sessão de trabalho"
          >
            <LogOut className="w-3.5 h-3.5" />
            {showLabels && <span>Encerrar Sessão</span>}
          </button>
        )}
      </div>
    </aside>
    </>
  );
}
