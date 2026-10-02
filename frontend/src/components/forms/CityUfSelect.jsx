import React, { useEffect, useState } from 'react';
import { fetchEstados, fetchMunicipiosByUf } from '../../services/ibgeLocalidades';

/**
 * Selects controlados de UF + Cidade (API IBGE).
 * onChange({ uf, city })
 */
export default function CityUfSelect({
  uf = '',
  city = '',
  onChange,
  cityLabel = 'Cidade',
  ufLabel = 'UF',
  cityPlaceholder = 'Selecione a cidade',
  className = ''
}) {
  const [ufs, setUfs] = useState([]);
  const [municipios, setMunicipios] = useState([]);
  const [loadingUfs, setLoadingUfs] = useState(false);
  const [loadingMun, setLoadingMun] = useState(false);
  const [error, setError] = useState('');

  const ufNorm = String(uf || '').trim().toUpperCase();
  const cityNorm = String(city || '').trim();

  useEffect(() => {
    let cancelled = false;
    setLoadingUfs(true);
    fetchEstados()
      .then((list) => {
        if (!cancelled) setUfs(list);
      })
      .catch(() => {
        if (!cancelled) setError('Falha ao carregar UFs');
      })
      .finally(() => {
        if (!cancelled) setLoadingUfs(false);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!ufNorm) {
      setMunicipios([]);
      return undefined;
    }
    setLoadingMun(true);
    setError('');
    fetchMunicipiosByUf(ufNorm)
      .then((list) => {
        if (!cancelled) setMunicipios(list);
      })
      .catch(() => {
        if (!cancelled) {
          setMunicipios([]);
          setError('Falha ao carregar cidades');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingMun(false);
      });
    return () => { cancelled = true; };
  }, [ufNorm]);

  const cityInList = municipios.some(
    (m) => m.nome.localeCompare(cityNorm, 'pt-BR', { sensitivity: 'accent' }) === 0
  );
  const cityOptions = cityNorm && !cityInList && !loadingMun
    ? [{ id: 'custom', nome: cityNorm }, ...municipios]
    : municipios;

  return (
    <div className={`grid grid-cols-3 gap-2 ${className}`}>
      <div className="col-span-2">
        <label className="block text-xs font-semibold text-gray-700 mb-1">{cityLabel}</label>
        <select
          value={cityNorm}
          disabled={!ufNorm || loadingMun}
          onChange={(e) => onChange?.({ uf: ufNorm, city: e.target.value })}
          className="w-full bg-white border border-gray-300 text-gray-800 text-xs rounded-lg px-3 py-2.5 outline-none disabled:bg-gray-50 disabled:text-gray-400"
        >
          <option value="">
            {!ufNorm ? 'Selecione a UF primeiro' : (loadingMun ? 'Carregando…' : cityPlaceholder)}
          </option>
          {cityOptions.map((m) => (
            <option key={`${m.id}-${m.nome}`} value={m.nome}>{m.nome}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">{ufLabel}</label>
        <select
          value={ufNorm}
          disabled={loadingUfs}
          onChange={(e) => {
            const nextUf = e.target.value.toUpperCase();
            onChange?.({ uf: nextUf, city: '' });
          }}
          className="w-full bg-white border border-gray-300 text-gray-800 text-xs rounded-lg px-3 py-2.5 uppercase outline-none disabled:bg-gray-50"
        >
          <option value="">{loadingUfs ? '…' : 'UF'}</option>
          {ufs.map((e) => (
            <option key={e.sigla} value={e.sigla}>{e.sigla}</option>
          ))}
        </select>
      </div>
      {error ? (
        <p className="col-span-3 text-[10px] text-amber-700">{error}</p>
      ) : null}
    </div>
  );
}
