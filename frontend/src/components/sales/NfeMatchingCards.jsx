import React from 'react';
import { Store, UserCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import QuickClientModal from './QuickClientModal';
import QuickProducerModal from './QuickProducerModal';

export default function NfeMatchingCards({
  matchedClient,
  unmatchedClient,
  registeringClient,
  clientRegisteredNotice,
  handleQuickRegisterClient,
  matchedProducer,
  unmatchedProducer,
  registeringProducer,
  producerRegisteredNotice,
  handleQuickRegisterProducer,
  duplicateWarning
}) {
  return (
    <div className="space-y-3">
      {/* Confirmação de Cadastro Rápido do Produtor */}
      {producerRegisteredNotice && (
        <div className="bg-emerald-100 border border-emerald-400 text-emerald-950 px-4 py-3 rounded-lg flex items-center gap-2 text-xs font-bold shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{producerRegisteredNotice}</span>
        </div>
      )}

      {/* Confirmação de Cadastro Rápido do Cliente Comprador */}
      {clientRegisteredNotice && (
        <div className="bg-emerald-100 border border-emerald-400 text-emerald-950 px-4 py-3 rounded-lg flex items-center gap-2 text-xs font-bold shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{clientRegisteredNotice}</span>
        </div>
      )}

      {/* 🏪 CARD DE VÍNCULO INTELIGENTE DO CLIENTE / COMPRADOR */}
      {matchedClient && (
        <div className="bg-blue-50/90 border-2 border-blue-400 p-4 rounded-xl shadow-sm space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Store className="w-5 h-5 text-blue-700 shrink-0" />
              <span className="text-xs font-extrabold text-blue-950 uppercase tracking-wider">
                Cliente / Comprador Vinculado com Sucesso (Cadastro Ativo)
              </span>
            </div>
            <span className="text-[11px] font-extrabold bg-blue-200 text-blue-950 px-2.5 py-0.5 rounded-full border border-blue-300 w-fit">
              {matchedClient.type || 'Comprador'}
            </span>
          </div>
          
          <div className="text-sm font-black text-gray-900 flex flex-wrap items-center gap-2">
            <span>🏪 {matchedClient.name}</span>
            {matchedClient.document && (
              <span className="text-xs font-bold text-gray-600 bg-white px-2 py-0.5 rounded border border-blue-200">
                CNPJ/CPF: {matchedClient.document}
              </span>
            )}
            {matchedClient.ie && (
              <span className="text-xs font-bold text-gray-600 bg-white px-2 py-0.5 rounded border border-blue-200">
                IE: {matchedClient.ie}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-1">
            <div className="bg-white p-2.5 rounded-lg border border-blue-200 shadow-2xs">
              <span className="block text-[10px] font-bold text-gray-500 uppercase">Município / Estado</span>
              <span className="font-bold text-gray-900">{matchedClient.city || 'São Paulo'}/{matchedClient.uf || matchedClient.state || 'SP'}</span>
            </div>

            <div className="bg-white p-2.5 rounded-lg border border-blue-200 shadow-2xs">
              <span className="block text-[10px] font-bold text-gray-500 uppercase">Endereço Comercial</span>
              <span className="font-bold text-gray-900 truncate block" title={matchedClient.address || 'Loja / Galpão Principal'}>
                {matchedClient.address || 'Loja / Galpão Principal'}
              </span>
            </div>

            <div className="bg-white p-2.5 rounded-lg border border-blue-200 shadow-2xs">
              <span className="block text-[10px] font-bold text-gray-500 uppercase">Contato / Telefone</span>
              <span className="font-bold text-gray-900 truncate block" title={matchedClient.phone || matchedClient.email || 'Cadastrado'}>
                {matchedClient.phone ? `📞 ${matchedClient.phone}` : (matchedClient.email ? `✉️ ${matchedClient.email}` : 'ℹ️ Cadastro Regular')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ⚠️ AVISO DE NOVO CLIENTE DETECTADO NA NF-E */}
      <QuickClientModal
        unmatchedClient={unmatchedClient}
        matchedClient={matchedClient}
        registeringClient={registeringClient}
        onQuickRegister={handleQuickRegisterClient}
      />

      {/* 🌾 CARD DE VÍNCULO INTELIGENTE DO PRODUTOR */}
      {matchedProducer && (
        <div className="bg-emerald-50/90 border-2 border-emerald-400 p-4 rounded-xl shadow-sm space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-700 shrink-0" />
              <span className="text-xs font-extrabold text-emerald-950 uppercase tracking-wider">
                Produtor Vinculado com Sucesso (Cadastro Ativo)
              </span>
            </div>
            <span className="text-[11px] font-extrabold bg-emerald-200 text-emerald-950 px-2.5 py-0.5 rounded-full border border-emerald-300 w-fit">
              {matchedProducer.type || 'Produtor'}
            </span>
          </div>
          
          <div className="text-sm font-black text-gray-900 flex flex-wrap items-center gap-2">
            <span>🌾 {matchedProducer.name}</span>
            {matchedProducer.document && (
              <span className="text-xs font-bold text-gray-600 bg-white px-2 py-0.5 rounded border border-emerald-200">
                Doc: {matchedProducer.document}
              </span>
            )}
            {matchedProducer.ie && (
              <span className="text-xs font-bold text-gray-600 bg-white px-2 py-0.5 rounded border border-emerald-200">
                IE: {matchedProducer.ie}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-1">
            <div className="bg-white p-2.5 rounded-lg border border-emerald-200 shadow-2xs">
              <span className="block text-[10px] font-bold text-gray-500 uppercase">Município / Estado</span>
              <span className="font-bold text-gray-900">{matchedProducer.city || 'Campo Alegre'}/{matchedProducer.uf || matchedProducer.state || 'GO'}</span>
            </div>

            <div className="bg-white p-2.5 rounded-lg border border-emerald-200 shadow-2xs">
              <span className="block text-[10px] font-bold text-gray-500 uppercase">Endereço / Fazenda</span>
              <span className="font-bold text-gray-900 truncate block" title={matchedProducer.address || 'Fazenda Principal'}>
                {matchedProducer.address || 'Fazenda / Sede Principal'}
              </span>
            </div>

            <div className="bg-white p-2.5 rounded-lg border border-emerald-200 shadow-2xs">
              <span className="block text-[10px] font-bold text-gray-500 uppercase">Dados Bancários / Pix</span>
              <span className="font-bold text-gray-900 truncate block" title={matchedProducer.pixKey || matchedProducer.bankName || 'Pendente de preenchimento'}>
                {matchedProducer.pixKey ? `🔑 Pix: ${matchedProducer.pixKey}` : (matchedProducer.bankName ? `🏦 ${matchedProducer.bankName} Ag:${matchedProducer.agency || '-'}` : 'ℹ️ Pendente no cadastro')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ⚠️ AVISO DE NOVO PRODUTOR DETECTADO NA NF-E */}
      <QuickProducerModal
        unmatchedProducer={unmatchedProducer}
        matchedProducer={matchedProducer}
        registeringProducer={registeringProducer}
        onQuickRegister={handleQuickRegisterProducer}
      />

      {/* Alerta de NF-e Duplicada */}
      {duplicateWarning && (
        <div className="bg-amber-50 border-2 border-amber-400 p-4 rounded-xl flex items-start gap-3 shadow-sm">
          <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-950 leading-relaxed">
            <strong className="font-bold block text-sm mb-1 text-amber-900">Atenção: NF-e já identificada no sistema</strong>
            <span>{duplicateWarning}</span>
          </div>
        </div>
      )}
    </div>
  );
}
