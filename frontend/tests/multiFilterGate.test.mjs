/**
 * Gate multi-select pós-init — evita tabela zerada antes da init (Financial).
 */
import { describe, expect, it } from 'vitest';
import { matchesAfterInit } from '../src/utils/multiFilterGate.js';

describe('matchesAfterInit', () => {
  it('antes da init com selected vazio passa (não zera a tabela)', () => {
    expect(matchesAfterInit({ initialized: false, selected: [], value: 'Loja A' })).toBe(true);
  });

  it('após init com selected vazio bloqueia (emptyMeansNone)', () => {
    expect(matchesAfterInit({ initialized: true, selected: [], value: 'Loja A' })).toBe(false);
  });

  it('após init com valor na lista passa', () => {
    expect(matchesAfterInit({
      initialized: true,
      selected: ['Loja A', 'Loja B'],
      value: 'Loja A'
    })).toBe(true);
  });

  it('após init com valor fora da lista bloqueia', () => {
    expect(matchesAfterInit({
      initialized: true,
      selected: ['Loja A'],
      value: 'Loja B'
    })).toBe(false);
  });

  it('trata selected não-array como vazio após init', () => {
    expect(matchesAfterInit({ initialized: true, selected: null, value: 'X' })).toBe(false);
  });

  it('cobre eixos loja / produto / produtor com o mesmo helper', () => {
    const axes = [
      { value: 'Mercado X', selected: ['Mercado X'] },
      { value: 'Cenoura', selected: ['Cenoura', 'Cebola'] },
      { value: 'Produtor Y', selected: ['Produtor Y'] }
    ];
    for (const { value, selected } of axes) {
      expect(matchesAfterInit({ initialized: false, selected: [], value })).toBe(true);
      expect(matchesAfterInit({ initialized: true, selected: [], value })).toBe(false);
      expect(matchesAfterInit({ initialized: true, selected, value })).toBe(true);
    }
  });
});
