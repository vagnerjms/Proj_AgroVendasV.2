import React, { useState } from 'react';
import { 
  DollarSign, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  Paperclip, 
  Upload, 
  Coins,
  History,
  RotateCcw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Building2,
  Tractor,
  Zap,
  FileText,
  Landmark
} from 'lucide-react';
import { formatCurrency, formatDate, getCleanFileName } from '../../utils/formatters';
import { calculateLiquidation, parseMoneyInput } from '../../utils/calculations';
import { api } from '../../services/api';

export default function SettleModal({ isOpen, sale, target = 'client', onClose, onSuccess, onSettled }) {
  if (!sale || (isOpen !== undefined && !isOpen)) return null;

  const isProducer = target === 'producer';
  const summary = calculateLiquidation(sale);

  // Valores calculados dependendo do target (Loja / Comprador ou Produtor Rural)
  const totalNF = Number(sale.totalOperation) || 0;
  const funrural = Number(sale.funruralTotal) || (totalNF * 0.0163);
  const liquidoProdutor = Math.max(0, totalNF - funrural);

  // O Valor da quitação total para o produtor deve ser o valor total da nota
  const netTargetTotal = isProducer ? totalNF : summary.totalLiquido;
  const alreadyPaid = isProducer ? (Number(sale.producerPaidAmount) || 0) : (Number(sale.paidAmount) || 0);
  const remainingBalance = Math.max(0, netTargetTotal - alreadyPaid);
  const historyList = isProducer ? (sale.producerPaymentHistory || []) : (sale.paymentHistory || []);

  const [settleType, setSettleType] = useState('full'); // 'full' | 'partial'
  const [partialAmount, setPartialAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('PIX'); // 'PIX' | 'Cheque' | 'TED/DOC'
  const [checkNumber, setCheckNumber] = useState('');
  const [checkBank, setCheckBank] = useState('');
  const [checkDueDate, setCheckDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reverting, setReverting] = useState(false);
  const [error, setError] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const parsedCurrentPartial = parseMoneyInput(partialAmount);

  const handleFileChange = (e) => {
    if (e.target.files?.[0]) {
      setProofFile(e.target.files[0]);
    }
  };

  const handleCallback = (msg) => {
    onSuccess?.(msg);
    onSettled?.(msg);
    onClose?.();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    let paidVal = remainingBalance;
    if (settleType === 'partial') {
      paidVal = parseMoneyInput(partialAmount);
      if (isNaN(paidVal) || paidVal <= 0) {
        setError(`Informe um valor de ${isProducer ? 'repasse' : 'liquidação'} parcial válido maior que zero.`);
        return;
      }
      if (paidVal > remainingBalance + 0.05) {
        setError(`O valor parcial (${formatCurrency(paidVal)}) não pode ser maior que o saldo em aberto (${formatCurrency(remainingBalance)}).`);
        return;
      }
    }

    setLoading(true);
    try {
      let uploadedFilename = null;
      if (proofFile) {
        const formData = new FormData();
        formData.append('file', proofFile);
        const upRes = await api.upload('/api/upload', formData);
        uploadedFilename = upRes?.filename || proofFile.name;
      }

      const endpoint = isProducer 
        ? `/api/sales/${sale.id}/settle-producer`
        : `/api/sales/${sale.id}/settle`;

      await api.post(endpoint, {
        paidAmount: paidVal,
        isPartial: settleType === 'partial',
        paymentProofFile: uploadedFilename,
        paymentDate,
        paymentMethod,
        checkNumber: paymentMethod === 'Cheque' ? checkNumber : '',
        checkBank: paymentMethod === 'Cheque' ? checkBank : '',
        checkDueDate: paymentMethod === 'Cheque' ? checkDueDate : '',
        notes
      });

      handleCallback(
        isProducer
          ? `Repasse ao produtor da venda ${sale.id} registrado com sucesso!`
          : `Recebimento da loja da venda ${sale.id} registrado com sucesso!`
      );
    } catch (err) {
      console.error('Erro ao registrar:', err);
      setError(err.message || 'Erro ao processar.');
    } finally {
      setLoading(false);
    }
  };

  const handleUnsettleLast = async () => {
    const entityLabel = isProducer ? 'ao produtor' : 'da loja';
    if (!window.confirm(`Deseja estornar a última parcela ${entityLabel} da venda ${sale.id}?`)) return;
    setReverting(true);
    setError('');
    try {
      const endpoint = isProducer 
        ? `/api/sales/${sale.id}/unsettle-producer`
        : `/api/sales/${sale.id}/unsettle`;

      await api.post(endpoint, { mode: 'last' });
      handleCallback(`Última parcela da venda ${sale.id} estornada com sucesso!`);
    } catch (err) {
      console.error('Erro ao estornar parcela:', err);
      setError(err.message || 'Erro ao estornar parcela.');
    } finally {
      setReverting(false);
    }
  };

  const handleUnsettleAll = async () => {
    const entityLabel = isProducer ? 'os repasses ao produtor' : 'as liquidações da loja';
    if (!window.confirm(`Deseja reverter integralmente ${entityLabel} da venda ${sale.id} e retornar para "${isProducer ? 'A Pagar' : 'A Receber'}"?`)) return;
    setReverting(true);
    setError('');
    try {
      const endpoint = isProducer 
        ? `/api/sales/${sale.id}/unsettle-producer`
        : `/api/sales/${sale.id}/unsettle`;

      await api.post(endpoint, { mode: 'all' });
      handleCallback(`Reversão da venda ${sale.id} executada com sucesso!`);
    } catch (err) {
      console.error('Erro ao reverter:', err);
      setError(err.message || 'Erro ao reverter.');
    } finally {
      setReverting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-gray-100 max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2 text-gray-900">
            <div className={`w-8 h-8 rounded-lg ${isProducer ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'} border flex items-center justify-center`}>
              {isProducer ? <Tractor className="w-4 h-4" /> : <DollarSign className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                {isProducer ? 'Repasse ao Produtor Rural' : 'Liquidação Financeira — Loja'}
              </h3>
              <p className="text-[11px] text-gray-500 font-medium">
                Venda: <b>{sale.id}</b> • {isProducer ? `Produtor: ${sale.origin || 'Produtor Rural'}` : `Loja: ${sale.client}`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resumo do Saldo */}
        {isProducer ? (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2 bg-gray-50 p-2.5 rounded-xl border border-gray-200 text-center text-[11px]">
              <div>
                <span className="text-[10px] text-gray-500 font-bold uppercase block">Total da NF</span>
                <span className="text-xs font-black text-gray-900">{formatCurrency(totalNF)}</span>
              </div>
              <div>
                <span className="text-[10px] text-red-600 font-bold uppercase block">(-) FUNRURAL (1,63%)</span>
                <span className="text-xs font-black text-red-700">-{formatCurrency(funrural)}</span>
              </div>
              <div>
                <span className="text-[10px] text-emerald-700 font-bold uppercase block">Líquido Produtor</span>
                <span className="text-xs font-black text-emerald-900">{formatCurrency(liquidoProdutor)}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 bg-amber-50/50 p-2.5 rounded-xl border border-amber-200 text-center">
              <div>
                <span className="text-[10px] text-emerald-800 font-bold uppercase block">Já Repassado</span>
                <span className="text-xs font-black text-emerald-800">{formatCurrency(alreadyPaid)}</span>
              </div>
              <div>
                <span className="text-[10px] text-amber-800 font-bold uppercase block">Saldo a Pagar</span>
                <span className="text-xs font-black text-amber-950">{formatCurrency(remainingBalance)}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 bg-gray-50 p-3 rounded-xl border border-gray-200 text-center">
            <div>
              <span className="text-[10px] text-gray-500 font-bold uppercase block">Total Comercial</span>
              <span className="text-xs font-black text-blue-950">{formatCurrency(netTargetTotal)}</span>
            </div>
            <div>
              <span className="text-[10px] text-emerald-700 font-bold uppercase block">Já Recebido</span>
              <span className="text-xs font-black text-emerald-800">{formatCurrency(alreadyPaid)}</span>
            </div>
            <div>
              <span className="text-[10px] text-amber-700 font-bold uppercase block">Saldo a Receber</span>
              <span className="text-xs font-black text-amber-900">{formatCurrency(remainingBalance)}</span>
            </div>
          </div>
        )}

        {/* Histórico de Parcelas Pagas se existirem */}
        {historyList && historyList.length > 0 && (
          <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50/50">
            <button
              type="button"
              onClick={() => setShowHistory(prev => !prev)}
              className="w-full flex items-center justify-between p-2.5 text-xs font-bold text-gray-700 hover:bg-gray-100/70 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-blue-600" />
                <span>Extrato de {isProducer ? 'Repasses' : 'Recebimentos'} ({historyList.length} parcela{historyList.length > 1 ? 's' : ''})</span>
              </div>
              {showHistory ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>

            {showHistory && (
              <div className="p-3 border-t border-gray-200 space-y-2 bg-white text-xs">
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {historyList.map((ph, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg border border-gray-100 text-[11px]">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-gray-900">{formatCurrency(ph.amount)}</span>
                          {/* Badge do Tipo de Pagamento */}
                          {ph.paymentMethod === 'Cheque' ? (
                            <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                              <FileText className="w-2.5 h-2.5 text-blue-600" />
                              <span>Cheque {ph.checkNumber ? `Nº ${ph.checkNumber}` : ''}</span>
                            </span>
                          ) : ph.paymentMethod === 'TED/DOC' ? (
                            <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-800 border border-purple-200 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                              <Landmark className="w-2.5 h-2.5 text-purple-600" />
                              <span>TED/DOC</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                              <Zap className="w-2.5 h-2.5 text-emerald-600" />
                              <span>PIX</span>
                            </span>
                          )}
                        </div>
                        <div className="text-gray-500 text-[10px] flex flex-wrap items-center gap-1.5 mt-0.5">
                          <span>📅 {formatDate(ph.date)}</span>
                          {ph.checkBank && <span>• Banco: <b>{ph.checkBank}</b></span>}
                          {ph.checkDueDate && <span>• Bom p/: <b>{formatDate(ph.checkDueDate)}</b></span>}
                          {ph.notes && <span>• {ph.notes}</span>}
                        </div>
                      </div>
                      {ph.paymentProofFile && (
                        <a
                          href={`/uploads/${ph.paymentProofFile}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-700 hover:text-blue-900 font-bold flex items-center gap-1 text-[10px] bg-blue-50 px-2 py-0.5 rounded border border-blue-200"
                        >
                          <Paperclip className="w-3 h-3" />
                          <span>Comprovante</span>
                        </a>
                      )}
                    </div>
                  ))}
                </div>

                {/* Ações de Estorno */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    disabled={reverting}
                    onClick={handleUnsettleLast}
                    className="text-amber-800 hover:text-amber-900 hover:bg-amber-50 px-2.5 py-1 text-[11px] font-bold rounded-lg border border-amber-200 cursor-pointer transition-colors flex items-center gap-1 disabled:opacity-50"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Estornar Última Parcela</span>
                  </button>
                  <button
                    type="button"
                    disabled={reverting}
                    onClick={handleUnsettleAll}
                    className="text-red-700 hover:text-red-900 hover:bg-red-50 px-2.5 py-1 text-[11px] font-bold rounded-lg border border-red-200 cursor-pointer transition-colors flex items-center gap-1 disabled:opacity-50"
                  >
                    <X className="w-3 h-3" />
                    <span>Zerar {isProducer ? 'Repasses' : 'Liquidações'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded-lg text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Seleção do Tipo de Liquidação */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700">Tipo de Liquidação:</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSettleType('full')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  settleType === 'full'
                    ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-900">⚡ Quitação Total</span>
                  {settleType === 'full' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                </div>
                <span className="text-[11px] font-black text-emerald-800 block mt-1">
                  {formatCurrency(remainingBalance)}
                </span>
                <span className="text-[10px] text-gray-500 block">Quita 100% do saldo restante</span>
              </button>

              <button
                type="button"
                onClick={() => setSettleType('partial')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  settleType === 'partial'
                    ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-900">💵 Pagamento Parcial</span>
                  {settleType === 'partial' && <Coins className="w-4 h-4 text-blue-600" />}
                </div>
                <span className="text-[11px] font-black text-blue-800 block mt-1">
                  Valor Avulso
                </span>
                <span className="text-[10px] text-gray-500 block">Abate parte do saldo em aberto</span>
              </button>
            </div>
          </div>

          {/* Campo de Valor Parcial se selecionado */}
          {settleType === 'partial' && (
            <div className="space-y-1 bg-blue-50/40 p-3 rounded-xl border border-blue-200">
              <label className="block text-xs font-bold text-blue-950">
                Valor Recebido Neste Pagamento (R$):
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-bold text-gray-400">R$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  placeholder="0,00"
                  value={partialAmount}
                  onChange={(e) => {
                    setError('');
                    setPartialAmount(e.target.value);
                  }}
                  className="w-full bg-white border border-blue-300 rounded-lg py-2 pl-9 pr-3 text-xs font-black text-blue-950 outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              {parsedCurrentPartial > 0 && (
                <span className="text-[10px] text-gray-500 font-semibold block pt-0.5">
                  Saldo que continuará em aberto: <b>{formatCurrency(Math.max(0, remainingBalance - parsedCurrentPartial))}</b>
                </span>
              )}
            </div>
          )}

          {/* Seleção do Tipo / Forma de Pagamento */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700">
              Forma de {isProducer ? 'Repasse' : 'Recebimento'}:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('PIX')}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                  paymentMethod === 'PIX'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold ring-2 ring-emerald-500/20'
                    : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                }`}
              >
                <Zap className={`w-4 h-4 ${paymentMethod === 'PIX' ? 'text-emerald-600' : 'text-gray-400'}`} />
                <span className="text-xs">PIX</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('Cheque')}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                  paymentMethod === 'Cheque'
                    ? 'border-blue-600 bg-blue-50 text-blue-950 font-bold ring-2 ring-blue-500/20'
                    : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                }`}
              >
                <FileText className={`w-4 h-4 ${paymentMethod === 'Cheque' ? 'text-blue-600' : 'text-gray-400'}`} />
                <span className="text-xs">Cheque</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('TED/DOC')}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                  paymentMethod === 'TED/DOC'
                    ? 'border-purple-600 bg-purple-50 text-purple-950 font-bold ring-2 ring-purple-500/20'
                    : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                }`}
              >
                <Landmark className={`w-4 h-4 ${paymentMethod === 'TED/DOC' ? 'text-purple-600' : 'text-gray-400'}`} />
                <span className="text-xs">TED / DOC</span>
              </button>
            </div>
          </div>

          {/* Dados Específicos do Cheque (Condicional) */}
          {paymentMethod === 'Cheque' && (
            <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-3 space-y-2 animate-fadeIn">
              <div className="text-[11px] font-bold text-blue-950 flex items-center gap-1.5 uppercase tracking-wide">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>Dados do Cheque</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 mb-0.5">Nº do Cheque:</label>
                  <input
                    type="text"
                    placeholder="Ex: 000452"
                    value={checkNumber}
                    onChange={(e) => setCheckNumber(e.target.value)}
                    className="w-full bg-white border border-blue-300 rounded-lg p-1.5 text-xs text-gray-900 outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 mb-0.5">Banco / Emitente:</label>
                  <input
                    type="text"
                    placeholder="Ex: Bradesco / Loja"
                    value={checkBank}
                    onChange={(e) => setCheckBank(e.target.value)}
                    className="w-full bg-white border border-blue-300 rounded-lg p-1.5 text-xs text-gray-900 outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 mb-0.5">Bom Para (Compensação):</label>
                  <input
                    type="date"
                    value={checkDueDate}
                    onChange={(e) => setCheckDueDate(e.target.value)}
                    className="w-full bg-white border border-blue-300 rounded-lg p-1.5 text-xs text-gray-900 outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Data do Pagamento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Data do {isProducer ? 'Repasse' : 'Recebimento'}:
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2 text-xs font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            {/* Comprovante */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Comprovante (Opcional):
              </label>
              <label className="flex items-center gap-1.5 border border-dashed border-gray-300 hover:border-emerald-600 bg-gray-50 rounded-lg p-2 cursor-pointer text-xs text-gray-600 transition-colors truncate">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Paperclip className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate text-[11px] font-semibold">
                  {proofFile ? proofFile.name : 'Anexar PIX/TED'}
                </span>
              </label>
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Observações / Identificação do Depósito:
            </label>
            <input
              type="text"
              placeholder="Ex: Depósito Bradesco ref. 1ª parcela"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 text-xs text-gray-800 outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer transition-all shadow-xs flex items-center gap-1.5"
            >
              {loading ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              <span>Confirmar Liquidação</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}

