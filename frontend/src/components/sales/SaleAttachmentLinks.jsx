import React from 'react';
import { Paperclip, FileText, Receipt } from 'lucide-react';
import { authorizedUploadUrl } from '../../utils/dataHelpers';

/**
 * Links autenticados de anexos da venda: Pedido/canhoto, NF, Comprovante.
 * onPreviewProof: se informado, CP abre modal em vez de nova aba.
 */
export default function SaleAttachmentLinks({
  sale = {},
  onPreviewProof,
  className = ''
}) {
  const evidence = sale.evidenceFile || sale.rawEvidenceFile;
  const nf = sale.nfFile || sale.rawNfFile;
  const proof = sale.paymentProofFile;

  const hasEvidence = evidence && evidence !== '-' && String(evidence).trim();
  const hasNf = nf && nf !== '-' && nf !== 'SEM NF' && nf !== 'Pendente' && String(nf).trim();
  const hasProof = proof && String(proof).trim();

  if (!hasEvidence && !hasNf && !hasProof) {
    return <span className="text-gray-400 text-[10px]">-</span>;
  }

  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      {hasEvidence && (
        <a
          href={authorizedUploadUrl(evidence)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded transition-colors max-w-[140px] truncate"
          title={`Pedido/Romaneio: ${evidence}`}
        >
          <Paperclip className="w-3 h-3 shrink-0" />
          <span className="truncate">Pedido</span>
        </a>
      )}
      {hasNf && (
        <a
          href={authorizedUploadUrl(nf)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded transition-colors max-w-[140px] truncate"
          title={`NF: ${nf}`}
        >
          <FileText className="w-3 h-3 shrink-0" />
          <span className="truncate">NF</span>
        </a>
      )}
      {hasProof && (
        onPreviewProof ? (
          <button
            type="button"
            onClick={() => onPreviewProof(proof)}
            className="inline-flex items-center gap-1 text-[10px] font-bold text-violet-800 bg-violet-50 hover:bg-violet-100 border border-violet-200 px-2 py-0.5 rounded transition-colors cursor-pointer"
            title={`Comprovante: ${proof}`}
          >
            <Receipt className="w-3 h-3 shrink-0" />
            <span>CP</span>
          </button>
        ) : (
          <a
            href={authorizedUploadUrl(proof)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[10px] font-bold text-violet-800 bg-violet-50 hover:bg-violet-100 border border-violet-200 px-2 py-0.5 rounded transition-colors"
            title={`Comprovante: ${proof}`}
          >
            <Receipt className="w-3 h-3 shrink-0" />
            <span>CP</span>
          </a>
        )
      )}
    </div>
  );
}
