import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Download, 
  UploadCloud, 
  CheckCircle2, 
  AlertCircle, 
  Server, 
  FileText, 
  ShieldCheck, 
  RefreshCw, 
  HardDrive, 
  FolderArchive,
  ArrowRight
} from 'lucide-react';
import { formatNumber } from '../utils/formatters';

export default function BackupRestore({ setCurrentPage }) {
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreFile, setRestoreFile] = useState(null);
  const [restoreResult, setRestoreResult] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const res = await fetch('/api/backup/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Erro ao buscar estatísticas:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleExportBackup = async () => {
    setExporting(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const res = await fetch('/api/backup/export');
      if (!res.ok) throw new Error('Erro ao gerar arquivo de backup');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const timestamp = new Date().toISOString().split('T')[0];
      a.download = `agrovenda_backup_completo_${timestamp}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccessMessage('Backup completo gerado e baixado com sucesso!');
    } catch (err) {
      console.error(err);
      setErrorMessage(`Falha no backup: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  const handleRestoreSubmit = async (e) => {
    e.preventDefault();
    if (!restoreFile) {
      setErrorMessage('Por favor, selecione o arquivo de backup (.json) para restaurar.');
      return;
    }

    if (!window.confirm('ATENÇÃO: A restauração irá substituir os dados atuais pelos dados contidos no arquivo de backup. Deseja continuar?')) {
      return;
    }

    setRestoring(true);
    setErrorMessage('');
    setSuccessMessage('');
    setRestoreResult(null);

    try {
      const formData = new FormData();
      formData.append('backupFile', restoreFile);

      const res = await fetch('/api/backup/restore', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setRestoreResult(data.restoredStats);
        setSuccessMessage('Sistema restaurado com sucesso no novo servidor!');
        fetchStats();
      } else {
        throw new Error(data.error || 'Erro ao processar arquivo de restauração');
      }
    } catch (err) {
      console.error(err);
      setErrorMessage(`Falha na restauração: ${err.message}`);
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-[1600px] mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <div className="text-xs font-bold text-[#091b2e] tracking-wider uppercase flex items-center gap-1.5">
            <Database className="w-4 h-4 text-[#df7b1b]" />
            <span>AGROVENDA — SISTEMA & INFRAESTRUTURA</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 mt-1">
            Backup & Restauração Completa
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Exporte toda a base de dados (Vendas, Clientes, Produtos, Notas e PDFs anexados) para migração para VPS ou segurança.
          </p>
        </div>

        <button
          onClick={fetchStats}
          className="bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 text-xs font-semibold px-3 py-2 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-gray-500 ${loadingStats ? 'animate-spin' : ''}`} />
          Atualizar Status
        </button>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-3 rounded-lg flex items-center gap-2 text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="bg-red-50 border border-red-300 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2 text-sm">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Grid: Estatísticas do Banco */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-gray-500 text-[11px] block font-bold uppercase">Vendas Registradas</span>
          <span className="text-xl font-black text-gray-900">{stats?.salesCount ?? '-'}</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-gray-500 text-[11px] block font-bold uppercase">Clientes / Lojas</span>
          <span className="text-xl font-black text-gray-900">{stats?.clientsCount ?? '-'}</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-gray-500 text-[11px] block font-bold uppercase">Produtos & Grãos</span>
          <span className="text-xl font-black text-gray-900">{stats?.productsCount ?? '-'}</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-gray-500 text-[11px] block font-bold uppercase">Romaneios / Pesagem</span>
          <span className="text-xl font-black text-gray-900">{stats?.slipsCount ?? '-'}</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-gray-500 text-[11px] block font-bold uppercase">Arquivos (PDF/XML)</span>
          <span className="text-xl font-black text-emerald-800">{stats?.filesCount ?? '-'}</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-gray-500 text-[11px] block font-bold uppercase">Tamanho em Disco</span>
          <span className="text-xl font-black text-blue-900">{stats?.totalUploadsSizeMB ?? '0'} MB</span>
        </div>
      </div>

      {/* Seção Principal: 2 Colunas (Exportar vs Restaurar) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Card 1: EXPORTAR BACKUP */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
              <Download className="w-5 h-5 text-emerald-700" />
              <h2 className="text-base font-bold text-gray-900">1. Gerar & Baixar Backup Completo</h2>
            </div>
            
            <p className="text-xs text-gray-600 leading-relaxed">
              Gera um arquivo portátil <strong>.JSON consolidado</strong> contendo 100% dos dados do sistema:
            </p>

            <ul className="text-xs text-gray-700 space-y-1.5 bg-gray-50 p-3.5 rounded-lg border border-gray-200">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Todas as <strong>34 Vendas</strong> com pesos, notas, cotações e cálculos de FUNRURAL</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Cadastros completos de <strong>Clientes, Produtores e Produtos</strong></span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Todos os arquivos de <strong>DANFE PDF e XMLs anexados</strong> codificados</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Romaneios, pesagens e histórico financeiro</span>
              </li>
            </ul>
          </div>

          <button
            onClick={handleExportBackup}
            disabled={exporting}
            className="w-full bg-[#091b2e] hover:bg-[#132c4a] text-white font-bold text-xs py-3.5 rounded-lg shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{exporting ? 'Empacotando Backup...' : 'Baixar Arquivo de Backup Completo (.JSON)'}</span>
          </button>
        </div>

        {/* Card 2: RESTAURAR BACKUP NA VPS */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4 flex flex-col justify-between">
          <form onSubmit={handleRestoreSubmit} className="space-y-3">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
              <UploadCloud className="w-5 h-5 text-blue-700" />
              <h2 className="text-base font-bold text-gray-900">2. Restaurar Base de Dados no VPS</h2>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Selecione o arquivo de backup gerado anteriormente para recriar todo o banco de dados e arquivos no novo servidor:
            </p>

            <div className="border-2 border-dashed border-gray-300 hover:border-emerald-500 rounded-xl p-6 text-center cursor-pointer transition-colors bg-gray-50/50">
              <input
                type="file"
                accept=".json"
                id="backup-file-input"
                onChange={(e) => setRestoreFile(e.target.files[0])}
                className="hidden"
              />
              <label htmlFor="backup-file-input" className="cursor-pointer block space-y-2">
                <FolderArchive className="w-8 h-8 text-emerald-700 mx-auto" />
                <span className="text-xs font-bold text-gray-800 block">
                  {restoreFile ? restoreFile.name : 'Clique para selecionar o arquivo .json de backup'}
                </span>
                <span className="text-[11px] text-gray-400 block">
                  {restoreFile ? `${(restoreFile.size / 1024).toFixed(1)} KB` : 'Suporta arquivos agrovenda_backup_*.json'}
                </span>
              </label>
            </div>

            {restoreResult && (
              <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200 text-xs text-emerald-950 space-y-1">
                <strong>Resultado da Restauração:</strong>
                <div className="grid grid-cols-3 gap-1 text-[11px] text-emerald-800">
                  <span>Vendas: {restoreResult.sales}</span>
                  <span>Clientes: {restoreResult.clients}</span>
                  <span>Produtos: {restoreResult.products}</span>
                  <span>Arquivos: {restoreResult.files}</span>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={restoring || !restoreFile}
              className="w-full bg-blue-700 hover:bg-blue-800 disabled:bg-gray-300 text-white font-bold text-xs py-3.5 rounded-lg shadow-md transition-all flex items-center justify-center gap-2"
            >
              <UploadCloud className="w-4 h-4" />
              <span>{restoring ? 'Restaurando no MongoDB...' : 'Restaurar Backup no Sistema'}</span>
            </button>
          </form>
        </div>
      </div>

      {/* Card 3: Instruções Passo a Passo para Subir na VPS */}
      <div className="bg-[#11311f] text-white p-6 rounded-xl shadow-md space-y-3">
        <div className="flex items-center gap-2 border-b border-[#1b432d] pb-2">
          <Server className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-black uppercase tracking-wider text-emerald-300">
            Como Migrar para sua VPS em 3 Passos Simples:
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-[#163e27] p-3.5 rounded-lg border border-[#1f5435] space-y-1">
            <span className="font-extrabold text-emerald-300 block">1. Baixar o Backup Local</span>
            <p className="text-gray-300 text-[11px]">
              Clique no botão verde acima para fazer o download do arquivo <code>agrovenda_backup_*.json</code> na sua máquina.
            </p>
          </div>

          <div className="bg-[#163e27] p-3.5 rounded-lg border border-[#1f5435] space-y-1">
            <span className="font-extrabold text-emerald-300 block">2. Subir o Docker na VPS</span>
            <p className="text-gray-300 text-[11px]">
              Na VPS, clone o projeto e execute <code>docker compose up -d --build</code> para iniciar os containers.
            </p>
          </div>

          <div className="bg-[#163e27] p-3.5 rounded-lg border border-[#1f5435] space-y-1">
            <span className="font-extrabold text-emerald-300 block">3. Restaurar pelo Navegador</span>
            <p className="text-gray-300 text-[11px]">
              Acesse o sistema na VPS pelo navegador, abra esta tela e faça o upload do arquivo baixado no passo 1.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
