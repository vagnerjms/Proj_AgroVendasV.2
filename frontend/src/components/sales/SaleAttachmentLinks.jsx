import React from 'react';
import { Paperclip, FileText, Receipt } from 'lucide-react';
import { authorizedUploadUrl } from '../../utils/dataHelpers';

/**
 * Coleta todos os comprovantes do ledger (paymentHistory) + escalar legado.
 */
export function collectClientProofFiles(sale = {}) {
  const out = [];
  const seen = new Set();
  const push = (f) => {
    const v = f && String(f).trim();
    if (!v || seen.has(v)) return;
    seen.add(v);
    out.push(v);
  };
  (Array.isArray(sale.paymentHistory) ? sale.paymentHistory : []).forEach((p) => {
    push(p?.paymentProofFile);
    (Array.isArray(p?.paymentProofFiles) ? p.paymentProofFiles : []).forEach(push);
  });
  push(sale.paymentProofFile);
  return out;
}

/**
 * Links autenticados de anexos: Pedido/canhoto, NF, Comprovantes (CP1…CPn).
 */
export default function SaleAttachmentLinks({
  sale = {},
  onPreviewProof,
  className = ''
}) {
  const evidence = sale.evidenceFile || sale.rawEvidenceFile;
  const nf = sale.nfFile || sale.rawNfFile;
  const proofs = collectClientProofFiles(sale);

  const hasEvidence = evidence && evidence !== '-' && String(evidence).trim();
  const hasNf = nf && nf !== '-' && nf !== 'SEM NF' && nf !== 'Pendente' && String(nf).trim();
  const hasProof = proofs.length > 0;

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
      {proofs.map((proof, idx) => (
        onPreviewProof ? (
          <button
            key={`${proof}-${idx}`}
            type="button"
            onClick={() => onPreviewProof(proof)}
            className="inline-flex items-center gap-1 text-[10px] font-bold text-violet-800 bg-violet-50 hover:bg-violet-100 border border-violet-200 px-2 py-0.5 rounded transition-colors cursor-pointer"
            title={`Comprovante ${idx + 1}: ${proof}`}
          >
            <Receipt className="w-3 h-3 shrink-0" />
            <span>CP{proofs.length > 1 ? idx + 1 : ''}</span>
          </button>
        ) : (
          <a
            key={`${proof}-${idx}`}
            href={authorizedUploadUrl(proof)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[10px] font-bold text-violet-800 bg-violet-50 hover:bg-violet-100 border border-violet-200 px-2 py-0.5 rounded transition-colors"
            title={`Comprovante ${idx + 1}: ${proof}`}
          >
            <Receipt className="w-3 h-3 shrink-0" />
            <span>CP{proofs.length > 1 ? idx + 1 : ''}</span>
          </a>
        )
      ))}
    </div>
  );
}
