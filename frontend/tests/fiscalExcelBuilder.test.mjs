/**
 * Unit tests — export Excel exclusivo do Fiscal (Contas/Fluxos).
 */
import { describe, it, expect } from 'vitest';
import { buildFiscalExcelHtml, groupFiscalSalesByLoja } from '../src/utils/fiscalExcelBuilder.js';

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
  items: [{ product: 'Cenoura', quantity: 100, kg: 2900, valorTotalVP: 50000, unit: 'Caixas' }],
  paymentHistory: [
    {
      seq: 1,
      amount: 49586.21,
      discountAmount: 413.79,
      paymentMethod: 'Cheque',
      notes: 'Gap cheque vs VP−FUNRURAL(NF)',
      paymentProofFile: 'cp-001.pdf',
      paymentProofFiles: ['cp-001.pdf']
    }
  ]
};

describe('buildFiscalExcelHtml', () => {
  it('layout loja a loja com produto, unidade, financeiro Fiscal e observações no bloco', () => {
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
    expect(html).toMatch(/RESUMO POR LOJA/i);
    expect(html).toMatch(/Detalhamento por loja/i);
    expect(html).toMatch(/hdr-loja/);
    expect(html).toMatch(/LOJA ALPHA/i);
    expect(html).toContain('Cenoura');
    expect(html).toMatch(/unidade cadastrada/i);
    expect(html).toMatch(/Valor Recebido/i);
    expect(html).toMatch(/Saldo a receber/i);
    expect(html).toMatch(/Valor negociado/i);
    expect(html).toContain('VP0100');
    expect(html).toContain('Loja Alpha');
    expect(html).toContain('Ajuste acerto manual');
    expect(html).toMatch(/Gap cheque vs VP/);
    expect(html).toMatch(/Observações/i);
    expect(html).toMatch(/Status:\s*<b>Parcial<\/b>/i);
    expect(html).toMatch(/TOTAL GERAL/i);
    expect(html).not.toMatch(/>\s*Ações\s*</i);
  });

  it('emite abas Resumo + Ledger_Baixas + Ledger_Repasses', () => {
    const html = buildFiscalExcelHtml(
      [{
        ...sampleSale,
        paidAmount: 3500,
        paymentProofFile: 'b.pdf',
        paymentHistory: [
          {
            seq: 1,
            amount: 2000,
            date: '2025-08-10',
            paymentMethod: 'PIX',
            paymentProofFiles: ['a.pdf'],
            paymentProofFile: 'a.pdf'
          },
          {
            seq: 2,
            amount: 1500,
            date: '2025-08-15',
            paymentMethod: 'TED',
            paymentProofFiles: ['b.pdf'],
            paymentProofFile: 'b.pdf'
          }
        ],
        producerPaymentHistory: [
          {
            seq: 1,
            amount: 1000,
            date: '2025-08-20',
            paymentMethod: 'PIX',
            paymentProofFiles: ['prod.pdf'],
            paymentProofFile: 'prod.pdf'
          }
        ]
      }],
      { vp: 50000, nf: 40000, recebido: 3500, saldo: 46500, caixas: 100 },
      {}
    );

    expect(html).toMatch(/<x:Name>Resumo<\/x:Name>/);
    expect(html).toMatch(/<x:Name>Ledger_Baixas<\/x:Name>/);
    expect(html).toMatch(/<x:Name>Ledger_Repasses<\/x:Name>/);
    expect(html).toMatch(/data-sheet="Resumo"/);
    expect(html).toMatch(/data-sheet="Ledger_Baixas"/);
    expect(html).toMatch(/data-sheet="Ledger_Repasses"/);

    const baixaRows = html.match(/data-ledger-row="Ledger_Baixas"/g) || [];
    expect(baixaRows.length).toBe(2);

    const repasseRows = html.match(/data-ledger-row="Ledger_Repasses"/g) || [];
    expect(repasseRows.length).toBe(1);
    expect(html).toMatch(/CPProd01=/i);
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
    expect(empty).toMatch(/data-sheet="Ledger_Baixas"/);
  });

  it('agrupa vendas por loja', () => {
    const groups = groupFiscalSalesByLoja([
      sampleSale,
      { ...sampleSale, id: 'VP0102', client: 'Loja Beta', items: [{ product: 'Batata', quantity: 10, unit: 'Sacos' }] }
    ]);
    expect(groups.map((g) => g.loja).sort()).toEqual(['Loja Alpha', 'Loja Beta']);
    expect(groups.find((g) => g.loja === 'Loja Alpha').itens[0].produto).toBe('Cenoura');
  });
});
