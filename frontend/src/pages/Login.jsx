import React, { useState } from 'react';
import { 
  Sprout, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle,
  Building2,
  Boxes,
  Truck
} from 'lucide-react';
import { api } from '../services/api';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [forgotModalOpen, setForgotModalOpen] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Por favor, informe seu e-mail de acesso.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await api.post('/api/auth/login', { email, password });
      if (data.user) {
        onLogin(data.user, rememberMe);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Credenciais inválidas. Verifique seu e-mail e senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#051322] via-[#091b2e] to-[#0c2440] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      
      {/* Background Decorative Gradient Orbs */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#df7b1b]/15 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#163a63]/40 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-sky-900/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-700/30 relative z-10">
        
        {/* Header Branding */}
        <div className="bg-[#091b2e] text-white p-8 text-center relative border-b border-[#162e4a]">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#df7b1b]/15 text-[#df7b1b] mb-3 border border-[#df7b1b]/30 shadow-xs">
            <Sprout className="w-8 h-8 text-[#df7b1b]" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            AGROVENDA V2
          </h1>
          <p className="text-xs text-[#8fa3bf] mt-1 font-medium">
            Gestão Comercial, Faturamento & Fechamento Agrícola
          </p>
        </div>

        {/* Form Container */}
        <div className="p-8 space-y-6">
          
          <div className="text-center">
            <h2 className="text-lg font-bold text-gray-900">Acesse sua conta</h2>
            <p className="text-xs text-gray-500 mt-0.5">Entre com seu e-mail e senha para continuar</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-start gap-2.5 text-xs animate-shake">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Email Field */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                E-mail de Acesso
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.email@empresa.com.br"
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl pl-10 pr-4 py-2.5 text-xs text-gray-900 outline-none focus:bg-white focus:border-[#091b2e] focus:ring-2 focus:ring-[#091b2e]/20 transition-all font-medium"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-gray-700">
                  Senha
                </label>
                <button
                  type="button"
                  onClick={() => setForgotModalOpen(true)}
                  className="text-[11px] text-gray-400 font-medium cursor-pointer hover:text-[#df7b1b] transition-colors"
                >
                  Esqueceu a senha?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl pl-10 pr-10 py-2.5 text-xs text-gray-900 outline-none focus:bg-white focus:border-[#091b2e] focus:ring-2 focus:ring-[#091b2e]/20 transition-all font-medium font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-gray-400 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer select-none group">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-[#091b2e] focus:ring-[#091b2e] focus:ring-offset-0 cursor-pointer accent-[#091b2e]"
                />
                <span className="text-xs text-gray-600 group-hover:text-gray-900 font-medium">
                  Manter sessão ativa
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#091b2e] hover:bg-[#132c4a] text-white text-xs font-bold py-3.5 rounded-xl shadow-lg shadow-slate-950/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 mt-2 cursor-pointer"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Entrar no Sistema</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

          </form>

        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-100 py-3.5 px-6 text-center text-[11px] text-gray-400 font-medium">
          <span>AgroVenda V2 — Sistema de Gestão Comercial Agrícola</span>
        </div>

      </div>

      {/* Secure Forgot Password Modal */}
      {forgotModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-[#df7b1b] flex items-center justify-center border border-amber-200/60 mx-auto">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1.5">
              <h3 className="text-sm font-bold text-gray-900">Recuperação de Acesso</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Por motivos de segurança, a redefinição de senhas é realizada diretamente pelo <strong>Administrador do Sistema</strong> no painel de <em>Usuários & Permissões</em>.
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-[11px] text-gray-600 text-center">
              Entre em contato com o suporte interno ou o administrador da sua unidade.
            </div>
            <button
              type="button"
              onClick={() => setForgotModalOpen(false)}
              className="w-full bg-[#091b2e] hover:bg-[#132c4a] text-white text-xs font-bold py-2.5 rounded-xl cursor-pointer transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
