/**
 * Regras canônicas de embalagem (AgroVenda):
 * - Batata → 25 kg / Sacas (25kg)
 * - Cenoura → 29 kg / Caixas (29kg)
 * - Cebola / Alho → 1 kg / Granel (kg)
 */

export function resolveCanonicalPackaging(productName = '', catalogProd = null) {
  const name = String(productName || catalogProd?.name || '').toLowerCase();

  if (/batata/.test(name)) {
    return { unit: 'Sacas (25kg)', boxWeightKg: 25, defaultUnit: 'Sacas (25kg)', unitKg: 25 };
  }
  if (/cebola|alho/.test(name)) {
    return { unit: 'Granel (kg)', boxWeightKg: 1, defaultUnit: 'Granel (kg)', unitKg: 1 };
  }
  if (/cenoura/.test(name)) {
    return { unit: 'Caixas (29kg)', boxWeightKg: 29, defaultUnit: 'Caixas (29kg)', unitKg: 29 };
  }

  if (catalogProd) {
    const unitKg = Number(catalogProd.unitKg) > 0 ? Number(catalogProd.unitKg) : 29;
    const defaultUnit = catalogProd.defaultUnit
      || (unitKg === 1 ? 'Granel (kg)' : (unitKg === 25 ? 'Sacas (25kg)' : 'Caixas (29kg)'));
    const boxWeightKg = /granel|\(kg\)/i.test(defaultUnit) || unitKg === 1 ? 1 : unitKg;
    return {
      unit: /saca/i.test(defaultUnit) && unitKg === 25 ? 'Sacas (25kg)' : defaultUnit.includes('Caixas') ? `Caixas (${unitKg}kg)` : defaultUnit,
      boxWeightKg,
      defaultUnit: unitKg === 25 && /saca|sc/i.test(String(defaultUnit)) ? 'Sacas (25kg)' : defaultUnit,
      unitKg
    };
  }

  return { unit: 'Caixas (29kg)', boxWeightKg: 29, defaultUnit: 'Caixas (29kg)', unitKg: 29 };
}

export function packagingFromUnitLabel(unitLabel = '') {
  const u = String(unitLabel || '');
  if (/granel|\(kg\)/i.test(u) && !/\d+\s*kg/i.test(u.replace(/granel/i, ''))) {
    return 1;
  }
  if (/25\s*kg/i.test(u)) return 25;
  if (/29\s*kg/i.test(u)) return 29;
  if (/20\s*kg/i.test(u)) return 20;
  if (/60\s*kg/i.test(u)) return 60;
  if (/50\s*kg/i.test(u)) return 50;
  return null;
}

/** Normaliza cadastro de produto pelo nome (antes de salvar). */
export function normalizeProductPackagingFields(form = {}) {
  const canon = resolveCanonicalPackaging(form.name || '');
  const name = String(form.name || '').toLowerCase();
  if (/batata|cenoura|cebola|alho/.test(name)) {
    return {
      ...form,
      unitKg: canon.unitKg,
      defaultUnit: canon.defaultUnit
    };
  }
  return form;
}

export function roundQty2(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.round((x + Number.EPSILON) * 100) / 100;
}

export function formatQtyInput(n) {
  return roundQty2(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
