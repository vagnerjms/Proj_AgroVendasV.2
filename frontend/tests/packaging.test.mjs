import { describe, it, expect } from 'vitest';
import {
  resolveCanonicalPackaging,
  normalizeProductPackagingFields,
  roundQty2,
  formatQtyInput
} from '../src/utils/packaging.js';
import { formatQuantity } from '../src/utils/dataHelpers.js';

describe('packaging canonical', () => {
  it('batata → 25 kg / Sacas (25kg)', () => {
    const p = resolveCanonicalPackaging('Batata Especial');
    expect(p.boxWeightKg).toBe(25);
    expect(p.unit).toBe('Sacas (25kg)');
    expect(p.unitKg).toBe(25);
  });

  it('cenoura → 29 kg', () => {
    const p = resolveCanonicalPackaging('Cenoura');
    expect(p.boxWeightKg).toBe(29);
    expect(p.unit).toBe('Caixas (29kg)');
  });

  it('cebola e alho → granel 1 kg', () => {
    expect(resolveCanonicalPackaging('Cebola Nacional').boxWeightKg).toBe(1);
    expect(resolveCanonicalPackaging('Alho Roxo').unit).toBe('Granel (kg)');
  });

  it('normalizeProductPackagingFields força batata 25', () => {
    const n = normalizeProductPackagingFields({
      name: 'Batata Primeira',
      unitKg: 50,
      defaultUnit: 'Sacas (50kg)'
    });
    expect(n.unitKg).toBe(25);
    expect(n.defaultUnit).toBe('Sacas (25kg)');
  });

  it('quantidade com 2 casas', () => {
    expect(roundQty2(566.456)).toBe(566.46);
    expect(formatQtyInput(10)).toMatch(/10[,.]00/);
    expect(formatQuantity(12.5, '', 2)).toMatch(/12[,.]50/);
  });
});
