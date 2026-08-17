import React from 'react';
import { Printer, X, ShieldCheck, FileText } from 'lucide-react';
import { formatCurrency, formatDate, formatKg } from '../utils/formatters';

export default function ContractModal({ sale, onClose }) {
  if (!sale) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full p-8 space-y-6 shadow-2xl relative my-8 text-gray-800 font-sans print:p-0 print:shadow-none print:m-0">
        {/* Modal Top Actions (Hidden on Print) */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-4 print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#173e27]" />
            <h2 className="text-base font-bold text-gray-900">
              Confirmação de Negociação & Contrato Agrícola ({sale.id})
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="bg-[#173e27] hover:bg-[#1f5435] text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow"
            >
              <Printer className="w-4 h-4" />
              Imprimir Contrato
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PRINTABLE CONTRACT CONTENT */}
        <div className="space-y-6 text-xs leading-relaxed text-gray-800 bg-white">
          {/* Header */}
          <div className="text-center border-b-2 border-gray-900 pb-4">
            <h1 className="text-lg font-extrabold uppercase tracking-wide text-gray-900">
              AGROVENDA COMÉRCIO E CORRETAGEM DE COMMODITIES LTDA
            </h1>
            <p className="text-[11px] text-gray-600 mt-1">
              CNPJ: 45.890.123/0001-00 • Inscrição Estadual: 10.982.736-1 • Rio Verde / GO
            </p>
            <div className="mt-2 inline-block bg-gray-100 px-3 py-1 rounded font-bold text-xs">
              CONFIRMAÇÃO DE NEGÓCIO Nº {sale.id} • MODALIDADE: {sale.operationType.toUpperCase()}
            </div>
          </div>

          {/* Parties */}
          <div className="grid grid-cols-2 gap-4 border border-gray-300 p-4 rounded bg-gray-50/50">
            <div>
              <span className="font-bold uppercase text-[10px] text-gray-500 block">VENDEDOR / ORIGEM:</span>
              <p className="font-bold text-sm text-gray-900 mt-0.5">{sale.origin || 'Produtor Rural Parceiro'}</p>
              <p className="text-gray-600">Local de Embarque: {sale.origin || 'Fazenda de Origem'}</p>
            </div>
            <div>
              <span className="font-bold uppercase text-[10px] text-gray-500 block">COMPRADOR / DESTINO:</span>
              <p className="font-bold text-sm text-gray-900 mt-0.5">{sale.client}</p>
              <p className="text-gray-600">Destino: {sale.destCity || 'Destino'} - {sale.destUF || 'UF'}</p>
              <p className="text-gray-600">Documento: {sale.clientDocument || 'Inscrito na SEFAZ'}</p>
            </div>
          </div>

          {/* Product & Volume Specs */}
          <div>
            <h3 className="font-bold text-xs uppercase border-b border-gray-300 pb-1 mb-2 text-gray-900">
              1. OBJETO DO CONTRATO E ESPECIFICAÇÕES
            </h3>
            <table className="w-full text-left border border-gray-200">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="p-2 border border-gray-200">Produto / Cultura</th>
                  <th className="p-2 border border-gray-200 text-right">Volume</th>
                  <th className="p-2 border border-gray-200 text-right">Peso Estimado (kg)</th>
                  <th className="p-2 border border-gray-200 text-right">Preço Unitário</th>
                  <th className="p-2 border border-gray-200 text-right">Valor Total</th>
                </tr>
              </thead>
              <tbody>
                {sale.items?.map((item, i) => (
                  <tr key={i}>
                    <td className="p-2 border border-gray-200 font-semibold">{item.product}</td>
                    <td className="p-2 border border-gray-200 text-right">{item.quantity} {item.unit}</td>
                    <td className="p-2 border border-gray-200 text-right">{formatKg(item.kg || (item.quantity * 60))}</td>
                    <td className="p-2 border border-gray-200 text-right">{formatCurrency(item.price)}</td>
                    <td className="p-2 border border-gray-200 text-right font-bold">{formatCurrency(item.quantity * item.price)}</td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-bold">
                  <td colSpan={4} className="p-2 border border-gray-200 text-right">TOTAL GERAL DA OPERAÇÃO:</td>
                  <td className="p-2 border border-gray-200 text-right text-sm">{formatCurrency(sale.totalOperation)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Quality Specifications */}
          <div>
            <h3 className="font-bold text-xs uppercase border-b border-gray-300 pb-1 mb-2 text-gray-900">
              2. PADRÃO OFICIAL DE QUALIDADE (ANEC / MAPA)
            </h3>
            <p className="text-gray-700">
              O produto entregue deverá obedecer rigorosamente ao padrão de exportação e consumo nacional:
            </p>
            <ul className="list-disc pl-5 mt-1 space-y-0.5 text-gray-700">
              <li><strong>Umidade Máxima:</strong> 14,0% (descontos conforme tabela oficial acima deste percentual).</li>
              <li><strong>Impurezas e Matérias Estranhas Máximas:</strong> 1,0%.</li>
              <li><strong>Grãos Avariados / Ardidos Máximos:</strong> 8,0% (tolerância máxima 1% de ardidos).</li>
              <li><strong>Grãos Quebrados Máximos:</strong> 8,0%. Livre de odores estranhos e insetos vivos.</li>
            </ul>
          </div>

          {/* Logistics & Taxes */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-bold text-xs uppercase border-b border-gray-300 pb-1 mb-2 text-gray-900">
                3. FRETE E TRANSPORTE
              </h3>
              <p><strong>Modalidade:</strong> {sale.freightType || 'FOB (Retira na Origem)'}</p>
              <p><strong>Transportadora:</strong> {sale.carrierName || 'A definir / Indicada pelo Comprador'}</p>
              <p><strong>Placa Veículo:</strong> {sale.truckPlate || '-'}</p>
              <p><strong>Motorista:</strong> {sale.driverName || '-'} {sale.driverCPF ? `(CPF: ${sale.driverCPF})` : ''}</p>
            </div>

            <div>
              <h3 className="font-bold text-xs uppercase border-b border-gray-300 pb-1 mb-2 text-gray-900">
                4. TRIBUTOS & FUNRURAL (1,63%)
              </h3>
              <p><strong>Total FUNRURAL Retido:</strong> {formatCurrency(sale.funruralTotal)}</p>
              <p>• Previdência Social (1,30%): {formatCurrency(sale.previdenciaSocial)}</p>
              <p>• RAT / GILRAT (0,10%): {formatCurrency(sale.rat)}</p>
              <p>• SENAR (0,23%): {formatCurrency(sale.senar)}</p>
              {sale.totalCommission > 0 && (
                <p className="mt-1 font-bold text-emerald-800">
                  Comissão de Corretagem AgroVenda: {formatCurrency(sale.totalCommission)}
                </p>
              )}
            </div>
          </div>

          {/* Document Key */}
          {sale.nfeKey && (
            <div className="p-2 bg-gray-100 rounded text-[11px] font-mono break-all">
              <strong>Chave de Acesso NF-e SEFAZ:</strong> {sale.nfeKey}
            </div>
          )}

          {/* Signatures */}
          <div className="pt-8 border-t border-gray-300 grid grid-cols-3 gap-6 text-center text-[11px]">
            <div>
              <div className="border-t border-gray-800 pt-2 font-bold">VENDEDOR / ORIGEM</div>
              <span className="text-gray-500 text-[10px]">Produtor Rural / Emitente</span>
            </div>
            <div>
              <div className="border-t border-gray-800 pt-2 font-bold">AGROVENDA INTERMEDIAÇÃO</div>
              <span className="text-gray-500 text-[10px]">Corretora Intermediadora</span>
            </div>
            <div>
              <div className="border-t border-gray-800 pt-2 font-bold">COMPRADOR / DESTINO</div>
              <span className="text-gray-500 text-[10px]">{sale.client}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
