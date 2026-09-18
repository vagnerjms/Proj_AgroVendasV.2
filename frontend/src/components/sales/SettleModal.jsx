import React, { useState } from 'react';
import { 
  DollarSign, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  Paperclip, 
  Upload, 
  Coins 
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { calculateLiquidation } from '../../utils/calculations';
import { api } from '../../services/api';

export default function SettleModal({ sale, onClose, onSuccess }) {
  if (!sale) return null;

  const summary = calculateLiquidation(sale);
  const remainingBalance = summary.valorALiquidar;

  const [settleType, setSettleType] = useState('full'); // 'full' | 'partial'
  const [partialAmount, setPartialAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    if (e.target.files?.[0]) {
      setProofFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    let paidVal = remainingBalance;
    if (settleType === 'partial') {
      paidVal = parseFloat(String(partialAmount).replace(/\./g, '').replace(',', '.'));
      if (isNaN(paidVal) || paidVal <= 0) {
        setError('Informe um valor de liquidação parcial válido maior que zero.');
        return;
      }
      if (paidVal > remainingBalance + 0.01) {
        setError(`O valor parcial (R$ ${paidVal.toFixed(2)}) não pode ser maior que o saldo em aberto (${formatCurrency(remainingBalance)}).`);
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

      await api.post(`/api/sales/${sale.id}/settle`, {
        paidAmount: paidVal,
        isPartial: settleType === 'partial',
        paymentProofFile: uploadedFilename,
        paymentDate,
        notes
      });

      onSuccess?.(`Liquidação da venda ${sale.id} registrada com sucesso!`);
      onClose?.();
    } catch (err) {
      console.error('Erro ao liquidar:', err);
      setError(err.message || 'Erro ao processar liquidação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-gray-100">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2 text-gray-900">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Liquidação Financeira</h3>
              <p className="text-[11px] text-gray-500 font-medium">
                Venda: <b>{sale.id}</b> • {sale.client}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resumo do Saldo */}
        <div className="grid grid-cols-3 gap-2 bg-gray-50 p-3 rounded-xl border border-gray-200 text-center">
          <div>
            <span className="text-[10px] text-gray-500 font-bold uppercase block">Total Líquido</span>
            <span className="text-xs font-black text-gray-900">{formatCurrency(summary.totalLiquido)}</span>
          </div>
          <div>
            <span className="text-[10px] text-emerald-700 font-bold uppercase block">Já Liquidado</span>
            <span className="text-xs font-black text-emerald-800">{formatCurrency(summary.valorLiquidado)}</span>
          </div>
          <div>
            <span className="text-[10px] text-amber-700 font-bold uppercase block">Saldo em Aberto</span>
            <span className="text-xs font-black text-amber-900">{formatCurrency(remainingBalance)}</span>
          </div>
        </div>

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
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  max={remainingBalance}
                  value={partialAmount}
                  onChange={(e) => setPartialAmount(e.target.value)}
                  className="w-full bg-white border border-blue-300 rounded-lg py-2 pl-9 pr-3 text-xs font-black text-blue-950 outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              {partialAmount > 0 && (
                <span className="text-[10px] text-gray-500 font-semibold block pt-0.5">
                  Saldo que continuará em aberto: <b>{formatCurrency(Math.max(0, remainingBalance - Number(partialAmount)))}</b>
                </span>
              )}
            </div>
          )}

          {/* Data do Pagamento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Data do Recebimento:
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
