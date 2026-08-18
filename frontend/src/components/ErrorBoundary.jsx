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
    console.error('🌾 [AgroVenda ErrorBoundary] Falha capturada:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#f8faf9] p-6">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full border border-gray-200 shadow-2xl text-center space-y-4">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto border border-red-100 shadow-inner">
              <AlertTriangle className="w-8 h-8" />
            </div>
            
            <h2 className="text-xl font-extrabold text-gray-900">
              Instabilidade Detectada
            </h2>
            
            <p className="text-xs text-gray-600 leading-relaxed">
              Ocorreu um erro inesperado na visualização desta tela. O restante do sistema e seus dados continuam seguros.
            </p>

            {this.state.error?.message && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-[11px] font-mono text-gray-700 text-left overflow-x-auto max-h-24">
                {this.state.error.message}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 bg-[#091b2e] hover:bg-[#132c4a] text-white font-bold text-xs py-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-md"
              >
                <RefreshCw className="w-4 h-4" />
                Recarregar Página
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
