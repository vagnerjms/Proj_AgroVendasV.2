import { describe, it, expect } from 'vitest';
import { buildFiscalPdfHtml, groupMarcioSalesByLoja } from '../src/utils/fiscalPdfBuilder.js';

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

describe('fiscal PDF Contas layout', () => {
  it('contém page-break-before e colunas Contas', () => {
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

  it('usa título genérico sem rótulo Márcio', () => {
    const html = buildFiscalPdfHtml(sampleSales, {}, {});
    expect(html).toContain('Fiscal Contas —');
    expect(html).toContain('AGROVENDA — FISCAL · CONTAS — LOJA POR LOJA');
    expect(html).not.toContain('TEMPLATE MÁRCIO');
    expect(html).not.toContain('Fiscal Márcio');
  });

  it('calcula fundo rural 1,63% sobre VP', () => {
    const html = buildFiscalPdfHtml(sampleSales, {}, {});
    expect(html).toMatch(/Fundo Rural/);
    expect(html).toContain('1,63%');
  });

  it('inclui Frete nas observações quando freightCost > 0', () => {
    const withFrete = sampleSales.map((s, i) => (i === 0 ? { ...s, freightCost: 1500 } : s));
    const html = buildFiscalPdfHtml(withFrete, {}, {});
    expect(html).toMatch(/Frete:\s*R\$\s*1\.500,00/);
  });

  it('ordena itens da loja por saleDate crescente', () => {
    const sameLoja = [
      {
        ...sampleSales[0],
        id: '10190',
        client: 'MAGALUSI',
        saleDate: '2026-11-11',
        romaneioNumber: '10190',
        valorTotalVP: 1000
      },
      {
        ...sampleSales[0],
        id: '10170',
        client: 'MAGALUSI',
        saleDate: '2026-10-15',
        romaneioNumber: '10170',
        valorTotalVP: 2000
      },
      {
        ...sampleSales[0],
        id: '10185',
        client: 'MAGALUSI',
        saleDate: '2026-11-01',
        romaneioNumber: '10185',
        valorTotalVP: 3000
      }
    ];
    const groups = groupMarcioSalesByLoja(sameLoja);
    const mag = groups.find((g) => g.loja === 'MAGALUSI');
    expect(mag.itens.map((r) => r.saleDateRaw)).toEqual([
      '2026-10-15',
      '2026-11-01',
      '2026-11-11'
    ]);

    const html = buildFiscalPdfHtml(sameLoja, {}, {});
    const idx15 = html.indexOf('>10170<');
    const idx01 = html.indexOf('>10185<');
    const idx11 = html.indexOf('>10190<');
    expect(idx15).toBeGreaterThan(-1);
    expect(idx01).toBeGreaterThan(idx15);
    expect(idx11).toBeGreaterThan(idx01);
  });
});
