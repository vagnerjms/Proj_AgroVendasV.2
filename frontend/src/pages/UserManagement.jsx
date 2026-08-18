import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  ShieldAlert, 
  Edit, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  X, 
  Lock, 
  Key, 
  LayoutDashboard, 
  ShoppingBag, 
  Scale, 
  Calendar, 
  BarChart3, 
  DollarSign, 
  Boxes, 
  Database, 
  Shield,
  Eye,
  EyeOff
} from 'lucide-react';

const MODULES_CONFIG = [
  { id: 'dashboard', label: 'Dashboard & Indicadores', icon: LayoutDashboard, category: 'Geral', desc: 'Acesso aos cards e gráficos executivos' },
  { id: 'comercial_compras', label: 'Compras de Commodities', icon: ShoppingBag, category: 'Comercial', desc: 'Lançamento e histórico de compras' },
  { id: 'comercial_vendas', label: 'Vendas & Emissão de VPs', icon: ShoppingBag, category: 'Comercial', desc: 'Lançamento de vendas e importação de NFs' },
  { id: 'romaneios_pesagem', label: 'Romaneios & Pesagem', icon: Scale, category: 'Operacional', desc: 'Balança, pesagem e divergências de peso' },
  { id: 'agenda_alertas', label: 'Agenda & Alertas de Recebimento', icon: Calendar, category: 'Comercial', desc: 'Cronograma de vencimentos e prazos por loja' },
  { id: 'relatorios', label: 'Relatórios & Fechamentos', icon: BarChart3, category: 'Comercial', desc: 'Relatório geral e fechamento com comissões' },
  { id: 'financeiro_fiscal', label: 'Financeiro & Apuração FUNRURAL', icon: DollarSign, category: 'Financeiro', desc: 'Fluxo de caixa, recebimentos e tributos' },
  { id: 'cadastros_clients', label: 'Clientes & Produtores', icon: Users, category: 'Cadastros', desc: 'Cadastro de parceiros comerciais' },
  { id: 'cadastros_products', label: 'Produtos & Grãos', icon: Boxes, category: 'Cadastros', desc: 'Catálogo de commodities e embalagens' },
  { id: 'cadastros_users', label: 'Gestão de Usuários & Permissões', icon: Shield, category: 'Segurança', desc: 'Adicionar e alterar acessos dos operadores' },
  { id: 'backup_sistema', label: 'Backup & Restauração', icon: Database, category: 'Sistema', desc: 'Exportar e restaurar base na VPS' }
];

export default function UserManagement({ setCurrentPage }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [notification, setNotification] = useState('');
  const [errorNotification, setErrorNotification] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'Operador Comercial',
    status: 'Ativo',
    permissions: {
      dashboard: true,
      comercial_compras: true,
      comercial_vendas: true,
      romaneios_pesagem: true,
      agenda_alertas: true,
      relatorios: true,
      financeiro_fiscal: true,
      cadastros_clients: true,
      cadastros_products: true,
      cadastros_users: false,
      backup_sistema: false
    }
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error('Erro ao buscar usuários:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3500);
  };

  const showError = (msg) => {
    setErrorNotification(msg);
    setTimeout(() => setErrorNotification(''), 3500);
  };

  const handleOpenCreate = () => {
    setEditingUser(null);
    setShowPassword(false);
    setFormData({
      name: '',
      email: '',
      password: '',
      phone: '',
      role: 'Operador Comercial',
      status: 'Ativo',
      permissions: {
        dashboard: true,
        comercial_compras: true,
        comercial_vendas: true,
        romaneios_pesagem: true,
        agenda_alertas: true,
        relatorios: true,
        financeiro_fiscal: true,
        cadastros_clients: true,
        cadastros_products: true,
        cadastros_users: false,
        backup_sistema: false
      }
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (user) => {
    setEditingUser(user);
    setShowPassword(false);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      phone: user.phone || '',
      role: user.role || 'Operador Comercial',
      status: user.status || 'Ativo',
      permissions: user.permissions || {}
    });
    setModalOpen(true);
  };

  const handleTogglePermission = (moduleId) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [moduleId]: !prev.permissions[moduleId]
      }
    }));
  };

  // Quick Preset Handlers
  const applyPreset = (presetName) => {
    const newPerms = {};
    MODULES_CONFIG.forEach(m => {
      if (presetName === 'ALL_ADMIN') {
        newPerms[m.id] = true;
      } else if (presetName === 'COMERCIAL') {
        newPerms[m.id] = ['dashboard', 'comercial_compras', 'comercial_vendas', 'romaneios_pesagem', 'agenda_alertas', 'relatorios', 'cadastros_clients', 'cadastros_products'].includes(m.id);
      } else if (presetName === 'FINANCEIRO') {
        newPerms[m.id] = ['dashboard', 'agenda_alertas', 'relatorios', 'financeiro_fiscal', 'cadastros_clients'].includes(m.id);
      } else if (presetName === 'BALANCA') {
        newPerms[m.id] = ['dashboard', 'romaneios_pesagem'].includes(m.id);
      }
    });
    setFormData(prev => ({ ...prev, permissions: newPerms }));
  };

  const [submittingUser, setSubmittingUser] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || submittingUser) {
      showError('Preencha o nome e o e-mail do usuário.');
      return;
    }

    setSubmittingUser(true);
    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
      const method = editingUser ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        showNotification(editingUser ? `Usuário ${editingUser.name} atualizado!` : 'Novo usuário cadastrado com sucesso!');
        setModalOpen(false);
        fetchUsers();
      } else {
        const data = await res.json();
        showError(data.error || 'Erro ao salvar usuário.');
      }
    } catch (err) {
      console.error(err);
      showError('Falha de conexão com o servidor.');
    } finally {
      setSubmittingUser(false);
    }
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`Tem certeza que deseja excluir o usuário ${user.name}?`)) return;
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE' });
      if (res.ok) {
        showNotification('Usuário excluído com sucesso.');
        fetchUsers();
      } else {
        const data = await res.json();
        showError(data.error || 'Erro ao excluir usuário.');
      }
    } catch (err) {
      console.error(err);
      showError('Falha ao excluir usuário.');
    }
  };

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.role?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-[1600px] mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <div className="text-xs font-bold text-[#091b2e] tracking-wider uppercase flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#df7b1b]" />
            <span>AGROVENDA — CONTROLE DE ACESSOS E SEGURANÇA</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 mt-1">
            Usuários & Permissões por Módulo
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Gerencie os operadores do sistema e configure os níveis de acesso a compras, vendas, pesagem, financeiro e relatórios.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="bg-[#091b2e] hover:bg-[#132c4a] text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-sm flex items-center gap-2 transition-all cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Cadastrar Novo Usuário</span>
        </button>
      </div>

      {/* Notifications */}
      {notification && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-3 rounded-lg flex items-center gap-2 text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}
      {errorNotification && (
        <div className="bg-red-50 border border-red-300 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2 text-sm">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{errorNotification}</span>
        </div>
      )}

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por nome, e-mail ou cargo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-50 border border-gray-300 text-xs rounded-lg pl-9 pr-3 py-2 outline-none focus:ring-2 focus:ring-emerald-700"
          />
        </div>

        <span className="text-xs text-gray-500 font-semibold">
          Total de <strong>{filteredUsers.length}</strong> usuários cadastrados
        </span>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-gray-50 text-gray-700 font-bold uppercase text-[10px] tracking-wider border-b border-gray-200">
              <tr>
                <th className="py-3 px-4">Operador / Usuário</th>
                <th className="py-3 px-4">Função / Perfil</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4">Módulos Liberados</th>
                <th className="py-3 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400">Carregando usuários...</td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400">Nenhum usuário encontrado.</td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const allowedCount = Object.values(user.permissions || {}).filter(Boolean).length;
                  const totalCount = MODULES_CONFIG.length;
                  return (
                    <tr key={user.id} className="hover:bg-gray-50/80 transition-colors">
                      
                      {/* Name & Avatar */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center text-xs">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900">{user.name}</div>
                            <div className="text-gray-400 text-[11px]">{user.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-4 font-semibold text-gray-800">
                        <span className="bg-gray-100 text-gray-800 px-2.5 py-1 rounded-md text-[11px] font-bold">
                          {user.role}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          user.status === 'Ativo' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {user.status || 'Ativo'}
                        </span>
                      </td>

                      {/* Allowed Modules Summary */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded ${
                            allowedCount === totalCount 
                              ? 'bg-purple-100 text-purple-900 border border-purple-200' 
                              : 'bg-blue-100 text-blue-900 border border-blue-200'
                          }`}>
                            {allowedCount === totalCount ? 'Acesso Total (Todos os Módulos)' : `${allowedCount} de ${totalCount} Módulos`}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenEdit(user)}
                            className="text-emerald-700 hover:bg-emerald-50 p-1.5 rounded transition-colors"
                            title="Editar permissões do usuário"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(user)}
                            className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded transition-colors"
                            title="Excluir usuário"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Criação / Edição de Usuário & Permissões */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden my-8">
            
            {/* Modal Header */}
            <div className="bg-[#11311f] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h2 className="text-sm font-black uppercase tracking-wider">
                  {editingUser ? `Editar Permissões: ${editingUser.name}` : 'Cadastrar Novo Operador & Permissões'}
                </h2>
              </div>
              <button 
                onClick={() => setModalOpen(false)}
                className="text-gray-300 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              
              {/* Basic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Nome Completo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: João da Silva"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-xs outline-none focus:ring-2 focus:ring-emerald-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">E-mail de Acesso *</label>
                  <input
                    type="email"
                    required
                    placeholder="joao@empresa.com.br"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-xs outline-none focus:ring-2 focus:ring-emerald-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Função / Cargo</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-xs outline-none font-semibold text-gray-800 focus:ring-2 focus:ring-emerald-700"
                  >
                    <option value="Administrador Geral">Administrador Geral</option>
                    <option value="Gerente Comercial">Gerente Comercial</option>
                    <option value="Operador Comercial">Operador Comercial</option>
                    <option value="Operador de Balança / Pesagem">Operador de Balança / Pesagem</option>
                    <option value="Analista Financeiro / Fiscal">Analista Financeiro / Fiscal</option>
                    <option value="Personalizado">Personalizado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Status da Conta</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-xs outline-none font-semibold text-gray-800 focus:ring-2 focus:ring-emerald-700"
                  >
                    <option value="Ativo">Ativo (Acesso Liberado)</option>
                    <option value="Inativo">Inativo (Bloqueado)</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-gray-700 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Senha de Acesso / Login {editingUser ? '(Opcional)' : '*'}</span>
                    </label>
                    {editingUser && (
                      <span className="text-[10px] text-gray-400 font-medium">
                        Deixe em branco para manter a senha atual
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required={!editingUser}
                      placeholder={editingUser ? '•••••••• (Inalterada)' : 'Digite uma senha segura (mínimo 6 caracteres)'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg p-2.5 pr-10 text-xs outline-none focus:ring-2 focus:ring-emerald-700 font-mono tracking-wider"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-700 transition-colors"
                      title={showPassword ? 'Ocultar senha' : 'Ver senha'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Presets Bar */}
              <div className="pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-extrabold text-gray-900 uppercase tracking-wide">
                    Permissões de Acesso aos Módulos
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => applyPreset('ALL_ADMIN')}
                      className="text-[10px] font-bold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 px-2 py-1 rounded border border-emerald-200"
                    >
                      Todos (Admin)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset('COMERCIAL')}
                      className="text-[10px] font-bold bg-blue-50 text-blue-800 hover:bg-blue-100 px-2 py-1 rounded border border-blue-200"
                    >
                      Comercial
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset('FINANCEIRO')}
                      className="text-[10px] font-bold bg-amber-50 text-amber-800 hover:bg-amber-100 px-2 py-1 rounded border border-amber-200"
                    >
                      Financeiro
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset('BALANCA')}
                      className="text-[10px] font-bold bg-gray-100 text-gray-800 hover:bg-gray-200 px-2 py-1 rounded border border-gray-300"
                    >
                      Balança
                    </button>
                  </div>
                </div>

                {/* Modules Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[300px] overflow-y-auto p-1">
                  {MODULES_CONFIG.map((mod) => {
                    const isChecked = !!formData.permissions[mod.id];
                    const Icon = mod.icon;
                    return (
                      <label
                        key={mod.id}
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          isChecked 
                            ? 'bg-emerald-50/70 border-emerald-300 shadow-xs' 
                            : 'bg-gray-50/50 border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleTogglePermission(mod.id)}
                          className="mt-0.5 w-4 h-4 rounded text-emerald-700 focus:ring-emerald-700 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <Icon className={`w-3.5 h-3.5 ${isChecked ? 'text-emerald-800 font-bold' : 'text-gray-400'}`} />
                            <span className={`text-xs font-bold truncate ${isChecked ? 'text-emerald-950' : 'text-gray-700'}`}>
                              {mod.label}
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-500 mt-0.5 leading-tight truncate">
                            {mod.desc}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  disabled={submittingUser}
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingUser}
                  className="bg-[#091b2e] hover:bg-[#132c4a] disabled:opacity-50 text-white text-xs font-bold px-6 py-2.5 rounded-lg shadow-sm transition-all cursor-pointer flex items-center gap-2"
                >
                  {submittingUser && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  <span>{submittingUser ? 'Gravando...' : (editingUser ? 'Salvar Permissões' : 'Criar Usuário')}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
