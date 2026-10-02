/**
 * IBGE localidades (estados + municípios) com cache em memória / sessionStorage.
 */

const IBGE_BASE = 'https://servicodados.ibge.gov.br/api/v1/localidades';
const SS_UFS = 'agrovenda_ibge_ufs_v1';
const SS_MUN_PREFIX = 'agrovenda_ibge_mun_';

const memory = {
  ufs: null,
  municipiosByUf: {}
};

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`IBGE ${res.status}`);
  return res.json();
}

export async function fetchEstados() {
  if (memory.ufs) return memory.ufs;
  try {
    const cached = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(SS_UFS) : null;
    if (cached) {
      memory.ufs = JSON.parse(cached);
      return memory.ufs;
    }
  } catch (_) {}

  const data = await fetchJson(`${IBGE_BASE}/estados?orderBy=nome`);
  const ufs = (data || []).map((e) => ({
    id: e.id,
    sigla: e.sigla,
    nome: e.nome
  }));
  memory.ufs = ufs;
  try {
    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(SS_UFS, JSON.stringify(ufs));
  } catch (_) {}
  return ufs;
}

export async function fetchMunicipiosByUf(ufSigla) {
  const uf = String(ufSigla || '').trim().toUpperCase();
  if (!uf || uf.length !== 2) return [];

  if (memory.municipiosByUf[uf]) return memory.municipiosByUf[uf];
  try {
    const cached = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(SS_MUN_PREFIX + uf) : null;
    if (cached) {
      memory.municipiosByUf[uf] = JSON.parse(cached);
      return memory.municipiosByUf[uf];
    }
  } catch (_) {}

  const data = await fetchJson(`${IBGE_BASE}/estados/${encodeURIComponent(uf)}/municipios?orderBy=nome`);
  const list = (data || []).map((m) => ({
    id: m.id,
    nome: m.nome
  }));
  memory.municipiosByUf[uf] = list;
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(SS_MUN_PREFIX + uf, JSON.stringify(list));
    }
  } catch (_) {}
  return list;
}
