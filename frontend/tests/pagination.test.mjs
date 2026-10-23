/**
 * Clamp de paginação — evita tabela vazia com filtro (Financial).
 */
import { describe, expect, it } from 'vitest';
import { clampPage, slicePage } from '../src/utils/pagination.js';

describe('clampPage / slicePage', () => {
  it('mantém página 1 com lista vazia', () => {
    expect(clampPage(5, 0, 15)).toEqual({
      totalPages: 1,
      safePage: 1,
      startIndex: 0,
      pageSize: 15
    });
  });

  it('evita tbody vazio quando currentPage fica além do filtro', () => {
    const { safePage, pageItems, totalPages } = slicePage(
      Array.from({ length: 27 }, (_, i) => i),
      3,
      15
    );
    expect(totalPages).toBe(2);
    expect(safePage).toBe(2);
    expect(pageItems).toHaveLength(12);
  });

  it('com 10 itens na página 2 (fora) volta para página 1 com 10 linhas', () => {
    const { safePage, pageItems } = slicePage(
      Array.from({ length: 10 }, (_, i) => i),
      2,
      15
    );
    expect(safePage).toBe(1);
    expect(pageItems).toHaveLength(10);
  });
});
