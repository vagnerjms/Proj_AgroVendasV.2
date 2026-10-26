/**
 * Gate de multi-select pós-init (padrão Agenda / Fiscal).
 * Antes da init: não exclui. Após init: lista vazia = nenhum resultado (emptyMeansNone).
 */
export function matchesAfterInit({ initialized, selected, value }) {
  if (!initialized) return true;
  const list = Array.isArray(selected) ? selected : [];
  if (list.length === 0) return false;
  return list.includes(value);
}
