import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import NewSale from './pages/NewSale';
import SalesHistory from './pages/SalesHistory';
import WeighingSlips from './pages/WeighingSlips';
import Purchases from './pages/Purchases';
import Financial from './pages/Financial';
import Cadastros from './pages/Cadastros';
import Reports from './pages/Reports';
import AgendaAlerts from './pages/AgendaAlerts';
import BackupRestore from './pages/BackupRestore';
import UserManagement from './pages/UserManagement';
import Login from './pages/Login';

// Session Storage Helpers (Multi-storage resilient)
const SESSION_KEY = 'agrovenda_user_v2';
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

function getCookie(name) {
  try {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift());
  } catch (e) {}
  return null;
}

function setCookie(name, value, days) {
  try {
    const expires = days ? `; max-age=${days * 24 * 60 * 60}` : '';
    document.cookie = `${name}=${encodeURIComponent(value || '')}${expires}; path=/; SameSite=Lax`;
  } catch (e) {}
}

function eraseCookie(name) {
  try {
    document.cookie = `${name}=; max-age=0; path=/; SameSite=Lax`;
  } catch (e) {}
}

function getStoredUser() {
  try {
    // 1. Try LocalStorage (Permanent / 1-year)
    const localRaw = localStorage.getItem(SESSION_KEY) || localStorage.getItem('agrovenda_user');
    if (localRaw) {
      const parsed = JSON.parse(localRaw);
      if (parsed) {
        if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
          localStorage.removeItem(SESSION_KEY);
          localStorage.removeItem('agrovenda_user');
        } else {
          return parsed.user || (parsed.id ? parsed : null);
        }
      }
    }

    // 2. Try SessionStorage (Transient browser session)
    const sessionRaw = sessionStorage.getItem(SESSION_KEY) || sessionStorage.getItem('agrovenda_user');
    if (sessionRaw) {
      const parsed = JSON.parse(sessionRaw);
      if (parsed) return parsed.user || (parsed.id ? parsed : null);
    }

    // 3. Try Cookie Fallback
    const cookieRaw = getCookie('agrovenda_session');
    if (cookieRaw) {
      const parsed = JSON.parse(cookieRaw);
      if (parsed) return parsed.user || (parsed.id ? parsed : null);
    }
  } catch (err) {
    console.warn('Erro ao recuperar sessão:', err);
  }
  return null;
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => getStoredUser());
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [editingSale, setEditingSale] = useState(null);

  const handleLogin = (user, rememberMe = true) => {
    setCurrentUser(user);
    try {
      const sessionPayload = {
        user,
        rememberMe,
        savedAt: Date.now(),
        expiresAt: rememberMe ? (Date.now() + ONE_YEAR_MS) : null
      };
      const serialized = JSON.stringify(sessionPayload);

      if (rememberMe) {
        localStorage.setItem(SESSION_KEY, serialized);
        localStorage.setItem('agrovenda_user', JSON.stringify(user));
        sessionStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem('agrovenda_user');
        setCookie('agrovenda_session', serialized, 365);
      } else {
        sessionStorage.setItem(SESSION_KEY, serialized);
        sessionStorage.setItem('agrovenda_user', JSON.stringify(user));
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem('agrovenda_user');
        eraseCookie('agrovenda_session');
      }
    } catch (e) {
      console.error('Erro ao salvar sessão:', e);
    }
    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem('agrovenda_user');
      localStorage.removeItem('agrovenda_token');
      sessionStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem('agrovenda_user');
      eraseCookie('agrovenda_session');
    } catch (e) {
      console.error('Erro ao encerrar sessão:', e);
    }
    setCurrentPage('dashboard');
  };

  const handleEditSale = (sale) => {
    setEditingSale(sale);
    setCurrentPage('new-sale');
  };

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavigate = (page) => {
    if (page === 'new-sale' && editingSale) {
      setEditingSale(null);
    }
    setCurrentPage(page);
    setMobileMenuOpen(false); // Auto close mobile drawer on navigation
  };

  // If user is not authenticated, render Login Screen
  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  const renderContent = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard setCurrentPage={handleNavigate} />;
      case 'new-sale':
        return (
          <NewSale 
            editingSale={editingSale} 
            setCurrentPage={handleNavigate} 
            onCancelEdit={() => { setEditingSale(null); setCurrentPage('sales-history'); }}
          />
        );
      case 'sales-history':
        return <SalesHistory setCurrentPage={handleNavigate} onEditSale={handleEditSale} />;
      case 'weighing-slips':
        return <WeighingSlips initialStatus="all" setCurrentPage={handleNavigate} />;
      case 'new-purchase':
        return <Purchases mode="new" setCurrentPage={handleNavigate} />;
      case 'purchases-history':
        return <Purchases mode="history" setCurrentPage={handleNavigate} />;
      case 'alerts':
        return <AgendaAlerts setCurrentPage={handleNavigate} />;
      case 'reports':
        return <Reports view="reports" setCurrentPage={handleNavigate} />;
      case 'financial':
        return <Financial view="overview" setCurrentPage={handleNavigate} />;
      case 'financial-funrural':
        return <Financial view="funrural" setCurrentPage={handleNavigate} />;
      case 'cadastros-clients':
        return <Cadastros tab="clients" setCurrentPage={handleNavigate} />;
      case 'cadastros-products':
        return <Cadastros tab="products" setCurrentPage={handleNavigate} />;
      case 'cadastros-users':
        return <UserManagement setCurrentPage={handleNavigate} />;
      case 'backup':
      case 'backup-restore':
        return <BackupRestore setCurrentPage={handleNavigate} />;
      default:
        return <Dashboard setCurrentPage={handleNavigate} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f8faf9] relative">
      {/* Left Sidebar (Desktop Fixed + Mobile Responsive Drawer) */}
      <Sidebar 
        currentPage={currentPage} 
        setCurrentPage={handleNavigate} 
        currentUser={currentUser}
        onLogout={handleLogout}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main App Area */}
      <div className="flex-1 flex flex-col min-w-0 w-full overflow-x-hidden">
        <Navbar 
          currentUser={currentUser} 
          onLogout={handleLogout}
          mobileOpen={mobileMenuOpen}
          onToggleMobileMenu={() => setMobileMenuOpen(prev => !prev)}
        />
        <main className="flex-1 overflow-y-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
