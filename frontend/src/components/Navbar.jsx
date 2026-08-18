import React from 'react';
import { LogOut, User, Shield, Menu, X, Sprout } from 'lucide-react';

export default function Navbar({ title, currentUser, onLogout, mobileOpen, onToggleMobileMenu }) {
  const userName = currentUser?.name || 'Administrador AgroVenda';
  const userRole = currentUser?.role || 'Administrador Geral';
  
  // Calculate initials (e.g. "Vagner Moraes" -> "VM")
  const initials = userName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(n => n[0].toUpperCase())
    .join('') || 'AG';

  return (
    <header className="h-16 bg-white border-b border-gray-200 px-4 sm:px-8 flex items-center justify-between shrink-0 sticky top-0 z-30 shadow-xs">
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger Button */}
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="md:hidden p-2 -ml-1 text-gray-700 hover:text-[#091b2e] hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          title="Menu de Navegação"
          aria-label="Menu de Navegação"
        >
          {mobileOpen ? <X className="w-5 h-5 text-[#091b2e]" /> : <Menu className="w-5 h-5 text-[#091b2e]" />}
        </button>

        <div className="flex items-center gap-2">
          <div className="md:hidden w-7 h-7 rounded bg-teal-600/20 flex items-center justify-center border border-teal-600/40">
            <Sprout className="w-4 h-4 text-teal-700" />
          </div>
          <h1 className="text-sm sm:text-lg font-bold text-gray-900 tracking-tight truncate max-w-[160px] sm:max-w-none">
            {title || `Olá, ${userName.split(' ')[0]}`}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {/* User Profile Pill */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#091b2e] text-white flex items-center justify-center font-bold text-xs sm:text-sm shadow-sm shrink-0 border border-[#162e4a]">
            {initials}
          </div>
          <div className="flex flex-col">
            <span className="text-xs sm:text-sm font-semibold text-gray-800 leading-tight truncate max-w-[100px] sm:max-w-[160px]">
              {userName}
            </span>
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline text-[10px] text-gray-400 font-medium truncate max-w-[120px]">
                {userRole}
              </span>
              <button 
                onClick={onLogout}
                className="text-[11px] text-[#c84b31] hover:text-red-700 transition-colors text-left font-bold flex items-center gap-1 cursor-pointer"
                title="Encerrar sessão e voltar ao login"
              >
                <LogOut className="w-3 h-3" />
                <span>Sair</span>
              </button>
            </div>
          </div>
        </div>

        {/* Encerrar Sessão Button */}
        {onLogout && (
          <button
            onClick={onLogout}
            className="hidden sm:flex bg-[#c84b31] hover:bg-[#b03f27] text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-sm items-center gap-1.5 transition-colors cursor-pointer ml-2"
            title="Encerrar sessão de trabalho"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Encerrar Sessão</span>
          </button>
        )}
      </div>
    </header>
  );
}
