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

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      // Check localStorage first (1-year persistent session)
      const savedLocal = localStorage.getItem('agrovenda_user');
      if (savedLocal) {
        const parsed = JSON.parse(savedLocal);
        if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
          localStorage.removeItem('agrovenda_user');
        } else {
          return parsed.user || parsed;
        }
      }
      // Fallback to sessionStorage (transient browser session)
      const savedSession = sessionStorage.getItem('agrovenda_user');
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        return parsed.user || parsed;
      }
      return null;
    } catch (e) {
      return null;
    }
  });

  const [currentPage, setCurrentPage] = useState('dashboard');
  const [editingSale, setEditingSale] = useState(null);

  const handleLogin = (user, rememberMe = true) => {
    setCurrentUser(user);
    try {
      const oneYearMs = 365 * 24 * 60 * 60 * 1000;
      const sessionPayload = {
        user,
        rememberMe,
        savedAt: Date.now(),
        expiresAt: rememberMe ? (Date.now() + oneYearMs) : null
      };

      if (rememberMe) {
        localStorage.setItem('agrovenda_user', JSON.stringify(sessionPayload));
        sessionStorage.removeItem('agrovenda_user');
      } else {
        sessionStorage.setItem('agrovenda_user', JSON.stringify(sessionPayload));
        localStorage.removeItem('agrovenda_user');
      }
    } catch (e) {
      console.error('Erro ao salvar sessão:', e);
    }
    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('agrovenda_user');
      sessionStorage.removeItem('agrovenda_user');
    } catch (e) {
      console.error(e);
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
        return <WeighingSlips initialStatus="all" setCurrentPage={setCurrentPage} />;
      case 'new-purchase':
        return <Purchases mode="new" setCurrentPage={setCurrentPage} />;
      case 'purchases-history':
        return <Purchases mode="history" setCurrentPage={setCurrentPage} />;
      case 'alerts':
        return <AgendaAlerts setCurrentPage={setCurrentPage} />;
      case 'reports':
        return <Reports view="reports" setCurrentPage={setCurrentPage} />;
      case 'financial':
        return <Financial view="overview" setCurrentPage={setCurrentPage} />;
      case 'financial-funrural':
        return <Financial view="funrural" setCurrentPage={setCurrentPage} />;
      case 'cadastros-clients':
        return <Cadastros tab="clients" setCurrentPage={setCurrentPage} />;
      case 'cadastros-products':
        return <Cadastros tab="products" setCurrentPage={setCurrentPage} />;
      case 'cadastros-users':
        return <UserManagement setCurrentPage={setCurrentPage} />;
      case 'backup-restore':
        return <BackupRestore setCurrentPage={setCurrentPage} />;
      default:
        return <Dashboard setCurrentPage={setCurrentPage} />;
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
