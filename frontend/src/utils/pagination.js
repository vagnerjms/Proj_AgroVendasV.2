/**
 * Clamp de página para tabelas filtradas (evita tbody vazio com contagem > 0).
 */
export function clampPage(currentPage, totalItems, pageSize = 15) {
  const size = Math.max(1, Number(pageSize) || 15);
  const totalPages = Math.max(1, Math.ceil((Number(totalItems) || 0) / size) || 1);
  const safePage = Math.min(Math.max(1, Number(currentPage) || 1), totalPages);
  const startIndex = (safePage - 1) * size;
  return { totalPages, safePage, startIndex, pageSize: size };
}

export function slicePage(items, currentPage, pageSize = 15) {
  const list = Array.isArray(items) ? items : [];
  const { safePage, startIndex, pageSize: size, totalPages } = clampPage(currentPage, list.length, pageSize);
  return {
    totalPages,
    safePage,
    pageItems: list.slice(startIndex, startIndex + size)
  };
}
