import { describe, it, expect } from 'vitest';
import { calculateLiquidation, calculateFunrural } from '../src/utils/calculations.js';

describe('FUNRURAL SEM NF = VP', () => {
  it('SEM NF força valorTotalNF=0 mesmo com totalOperation sujo', () => {
    const liq = calculateLiquidation({
      nfFile: null,
      nfPending: true,
      valorTotalVP: 56005,
      totalOperation: 787950
    });
    expect(liq.valorTotalNF).toBe(0);
    expect(liq.valorVP).toBeCloseTo(56005, 2);
  });

  it('SEM NF: FUNRURAL da apuração usa VP', () => {
    const liq = calculateLiquidation({
      nfFile: null,
      valorTotalVP: 56005,
      totalOperation: 787950
    });
    const fr = calculateFunrural(liq.valorVP);
    expect(fr.funruralTotal).toBeCloseTo(912.88, 1); // ~56005 * 1.63%
  });

  it('com NF: FUNRURAL usa NF', () => {
    const liq = calculateLiquidation({
      nfFile: 'nf.pdf',
      valorTotalVP: 33000,
      totalOperation: 32430
    });
    expect(liq.valorTotalNF).toBeCloseTo(32430, 2);
    const fr = calculateFunrural(liq.valorTotalNF);
    expect(fr.funruralTotal).toBeCloseTo(528.61, 1);
  });
});
