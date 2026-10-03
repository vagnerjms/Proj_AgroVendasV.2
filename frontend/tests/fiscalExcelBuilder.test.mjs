/**
 * Unit tests — export Excel exclusivo do Fiscal (Contas/Fluxos).
 */
import { describe, it, expect } from 'vitest';
import { buildFiscalExcelHtml } from '../src/utils/fiscalExcelBuilder.js';

const sampleSale = {
  id: 'VP0100',
  saleDate: '2025-08-01',
  client: 'Loja Alpha',
  origin: 'Bruno Peres (Ibiá/MG)',
  totalOperation: 40000,
  valorTotalVP: 50000,
  paidAmount: 49586.21,
  paymentStatus: 'Parcial',
  dueDate: '2025-09-01',
  totalKg: 2900,
  totalVolumes: 100,
  notes: 'Venda de Cenoura | Planilha VP: 9733 | Ajuste acerto manual',
  evidenceFile: '09733-pedido.jpeg',
  nfFile: 'NF-001.pdf',
  paymentProofFile: 'cp-001.pdf',
  items: [{ product: 'Cenoura', quantity: 100, kg: 2900, valorTotalVP: 50000 }],
  paymentHistory: [
    {
      amount: 49586.21,
      discountAmount: 413.79,
      paymentMethod: 'Cheque',
      notes: 'Gap cheque vs VP−FUNRURAL(NF)'
    }
  ]
};

describe('buildFiscalExcelHtml', () => {
  it('inclui colunas do Fiscal, Observações, desconto e totais do filtro', () => {
    const html = buildFiscalExcelHtml(
      [sampleSale],
      { vp: 50000, nf: 40000, recebido: 49586.21, saldo: 413.79, caixas: 100 },
      {
        statusFilter: 'PARTIAL',
        selectedStores: ['Loja Alpha'],
        selectedProducts: ['Cenoura'],
        selectedProducers: ['Bruno Peres'],
        searchTerm: 'VP0100'
      }
    );

    expect(html).toMatch(/FISCAL \(CONTAS \/ FLUXOS\)/i);
    expect(html).toMatch(/Observações/i);
    expect(html).toMatch(/Obs\. desconto/i);
    expect(html).toMatch(/Desconto/i);
    expect(html).toMatch(/Valor Recebido/i);
    expect(html).toMatch(/Saldo a receber/i);
    expect(html).toMatch(/Forma pgto/i);
    expect(html).toContain('VP0100');
    expect(html).toContain('Loja Alpha');
    expect(html).toContain('Bruno Peres');
    expect(html).toContain('Cenoura');
    expect(html).toContain('Ajuste acerto manual');
    expect(html).toMatch(/Gap cheque vs VP/);
    expect(html).toContain('Cheque');
    expect(html).toMatch(/Pedido:.*09733-pedido/i);
    expect(html).toMatch(/TOTAL \(filtro\)/i);
    expect(html).toMatch(/Status:\s*<b>Parcial<\/b>/i);
    expect(html).not.toMatch(/>\s*Ações\s*</i);
  });

  it('escapa HTML nas observações e lista vazia sem quebrar', () => {
    const html = buildFiscalExcelHtml(
      [{
        ...sampleSale,
        id: 'VP0101',
        notes: '<script>alert(1)</script> & teste',
        paymentHistory: []
      }],
      { vp: 0, nf: 0, recebido: 0, saldo: 0, caixas: 0 },
      {}
    );
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&amp; teste');
    expect(html).not.toContain('<script>alert');

    const empty = buildFiscalExcelHtml([], {}, {});
    expect(empty).toMatch(/Nenhum título no filtro/i);
  });
});
