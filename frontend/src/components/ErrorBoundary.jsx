import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary capturou uma falha de renderização:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 select-none font-['Inter',sans-serif]">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl border border-gray-200 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-red-100 text-red-700 flex items-center justify-center mx-auto shadow-inner">
              <AlertTriangle className="w-7 h-7" />
            </div>
            
            <div>
              <h2 className="text-xl font-extrabold text-gray-900">Ops! Algo deu errado</h2>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Ocorreu uma falha inesperada na interface. Seus dados e lançamentos no banco de dados continuam 100% seguros.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-[11px] text-gray-600 font-mono text-left max-h-24 overflow-y-auto">
                {this.state.error.message}
              </div>
            )}

            <button
              type="button"
              onClick={this.handleReset}
              className="w-full bg-[#173e27] hover:bg-[#1f5435] text-white text-xs font-bold py-3 rounded-xl shadow-lg shadow-emerald-950/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Recarregar Sistema</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
