import { describe, it, expect } from 'vitest';
import { freightOf, formatFreightMoney } from '../src/utils/freight.js';

describe('freightOf', () => {
  it('usa freightCost absoluto', () => {
    expect(freightOf({ freightCost: 1500 })).toBe(1500);
  });

  it('prioriza preço por unidade × volumes', () => {
    expect(freightOf({ freightPricePerUnit: 2, totalVolumes: 100, freightCost: 10 })).toBe(200);
  });

  it('formatFreightMoney', () => {
    expect(formatFreightMoney(1500)).toMatch(/1\.500,00/);
    expect(formatFreightMoney(0)).toBe('');
  });
});
