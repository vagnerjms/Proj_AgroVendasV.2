import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
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

function MainApp() {
  const { currentUser, login, logout } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [editingSale, setEditingSale] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleEditSale = (sale) => {
    setEditingSale(sale);
    setCurrentPage('new-sale');
  };

  const handleNavigate = (page) => {
    if (page === 'new-sale' && editingSale) {
      setEditingSale(null);
    }
    setCurrentPage(page);
    setMobileMenuOpen(false); // Auto close mobile drawer on navigation
  };

  const handleNavigateFromNotification = (targetPage, targetTab, entityId) => {
    if (targetTab) {
      sessionStorage.setItem('agrovenda_agenda_tab', targetTab);
    }
    if (entityId) {
      sessionStorage.setItem('agrovenda_filter_entity', entityId);
    }
    handleNavigate(targetPage || 'dashboard');
  };

  // If user is not authenticated, render Login Screen
  if (!currentUser) {
    return <Login onLogin={(user, rememberMe) => { login(user, rememberMe); setCurrentPage('dashboard'); }} />;
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
        onLogout={logout}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main App Area */}
      <div className="flex-1 flex flex-col min-w-0 w-full overflow-x-hidden">
        <Navbar 
          currentUser={currentUser} 
          onLogout={logout}
          mobileOpen={mobileMenuOpen}
          onToggleMobileMenu={() => setMobileMenuOpen(prev => !prev)}
          onNavigate={handleNavigateFromNotification}
        />
        <main className="flex-1 overflow-y-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
