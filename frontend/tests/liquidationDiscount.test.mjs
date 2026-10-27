/**
 * Desconto negociado abate saldo a receber (não deixa título parcial).
 */
import { describe, expect, it } from 'vitest';
import { calculateLiquidation, sumClientDiscounts } from '../src/utils/calculations.js';

describe('calculateLiquidation + desconto', () => {
  it('soma descontos do paymentHistory', () => {
    expect(sumClientDiscounts({
      paymentHistory: [{ discountAmount: 100 }, { discountAmount: 34.48 }]
    })).toBeCloseTo(134.48, 2);
  });

  it('pago + desconto = VP → Recebido e saldo 0', () => {
    const liq = calculateLiquidation({
      valorTotalVP: 55800,
      paidAmount: 54665.52,
      paymentStatus: 'Parcial',
      paymentHistory: [{
        amount: 54665.52,
        discountAmount: 1134.48,
        notes: 'Desconto referente ao Fundo Rural'
      }]
    });
    expect(liq.totalDiscount).toBeCloseTo(1134.48, 2);
    expect(liq.isFullySettled).toBe(true);
    expect(liq.isPartial).toBe(false);
    expect(liq.valorALiquidar).toBe(0);
    expect(liq.statusLabel).toBe('Recebido');
  });

  it('desconto parcial que não cobre o VP mantém saldo aberto', () => {
    const liq = calculateLiquidation({
      valorTotalVP: 50000,
      paidAmount: 20000,
      paymentStatus: 'Parcial',
      paymentHistory: [{ amount: 20000, discountAmount: 500 }]
    });
    expect(liq.isFullySettled).toBe(false);
    expect(liq.isPartial).toBe(true);
    expect(liq.valorALiquidar).toBeCloseTo(29500, 2);
  });
});
