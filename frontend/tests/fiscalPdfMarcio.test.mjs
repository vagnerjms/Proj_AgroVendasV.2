import { describe, it, expect } from 'vitest';
import { buildFiscalPdfHtml } from '../src/utils/fiscalPdfBuilder.js';

const sampleSales = [
  {
    id: '10170',
    client: 'MAGALUSI',
    saleDate: '2026-10-15',
    romaneioNumber: '10170',
    nfFile: 'nf-123.pdf',
    valorTotalVP: 41345,
    totalOperation: 31750,
    items: [
      { product: 'Batata Especial', quantity: 500, dailyQuote: 70, kg: 12500, boxWeightKg: 25, unit: 'Sacas (25kg)' },
      { product: 'Batata Primeira', quantity: 66, dailyQuote: 25, kg: 1650, boxWeightKg: 25, unit: 'Sacas (25kg)' }
    ]
  },
  {
    id: '10185',
    client: 'VENUS',
    saleDate: '2026-11-01',
    romaneioNumber: '10185',
    nfFile: null,
    valorTotalVP: 56005,
    totalOperation: 0,
    items: [
      { product: 'Batata Diversa', quantity: 100, dailyQuote: 55, kg: 2500, boxWeightKg: 25, unit: 'Sacas (25kg)' }
    ]
  }
];

describe('fiscal PDF Márcio template', () => {
  it('contém page-break-before e colunas Márcio', () => {
    const html = buildFiscalPdfHtml(sampleSales, {}, { statusFilter: 'ALL' });
    expect(html).toContain('page-break-before: always');
    expect(html).toContain('Valor romaneio');
    expect(html).toContain('Fundo Rural');
    expect(html).toContain('Valor a pagar');
    expect(html).toContain('Batata Esp.');
    expect(html).toContain('Batata Prim.');
    expect(html).toContain('Batata Div.');
    expect(html).toContain('Batata Bol.');
    expect(html).toContain('SEM NF');
    expect(html).toContain('MAGALUSI');
    expect(html).toContain('VENUS');
    expect(html).toContain('class="loja"');
    expect(html).not.toContain('Saldo a Receber');
  });

  it('calcula fundo rural 1,63% sobre VP', () => {
    const html = buildFiscalPdfHtml(sampleSales, {}, {});
    // 41345 * 1.63% ≈ 673.92 (soma componentes)
    expect(html).toMatch(/Fundo Rural/);
    expect(html).toContain('1,63%');
  });
});
