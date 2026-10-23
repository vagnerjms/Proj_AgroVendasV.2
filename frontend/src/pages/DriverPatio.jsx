import React, { useState } from 'react';
import { Truck, Camera, FileText, CheckCircle2, AlertCircle, LogOut } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Login from './Login';

/**
 * Módulo motorista (/m) — captura de pátio.
 * Placa + scan/chave NF + foto NF + foto romaneio balança.
 * NÃO cria venda; registra WeighingSlip source=patio.
 */
export default function DriverPatio() {
  const { currentUser, login, logout } = useAuth();
  const [truckPlate, setTruckPlate] = useState('');
  const [nfeKey, setNfeKey] = useState('');
  const [nfNumber, setNfNumber] = useState('');
  const [originWeightKg, setOriginWeightKg] = useState('');
  const [destWeightKg, setDestWeightKg] = useState('');
  const [nfPhotoFile, setNfPhotoFile] = useState(null);
  const [scaleFile, setScaleFile] = useState(null);
  const [parsedPreview, setParsedPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#0b1f33] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <p className="text-center text-sky-100 text-sm font-bold mb-4">AgroVenda · Pátio / Motorista</p>
          <Login onLogin={(user, remember) => login(user, remember)} />
        </div>
      </div>
    );
  }

  const uploadOne = async (file) => {
    const fd = new FormData();
    fd.append('file', file);
    const res = await api.upload('/api/upload', fd);
    return res?.filename || file.name;
  };

  const handleNfPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNfPhotoFile(file);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const parsed = await api.upload('/api/nfe/parse', fd);
      setParsedPreview(parsed);
      if (parsed?.nfeKey) setNfeKey(parsed.nfeKey);
      if (parsed?.nNF || parsed?.nfNumber) setNfNumber(String(parsed.nNF || parsed.nfNumber));
      if (parsed?.destinatario || parsed?.client) {
        /* preview only */
      }
      setMessage('NF lida — revise placa e pesos antes de confirmar.');
    } catch (err) {
      setMessage('Foto salva. Não foi possível ler a NF automaticamente — informe a chave/número.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!truckPlate.trim()) {
      setError('Informe a placa do caminhão.');
      return;
    }
    if (!nfPhotoFile && !scaleFile) {
      setError('Anexe a foto da NF e o romaneio da balança.');
      return;
    }
    setLoading(true);
    try {
      let nfPhotoName = '';
      let scaleName = '';
      if (nfPhotoFile) nfPhotoName = await uploadOne(nfPhotoFile);
      if (scaleFile) scaleName = await uploadOne(scaleFile);

      const slip = await api.post('/api/weighings/patio', {
        truckPlate: truckPlate.trim().toUpperCase(),
        nfeKey,
        nfNumber,
        nfPhotoFile: nfPhotoName,
        scaleRomaneioImage: scaleName,
        ticketImage: scaleName,
        originWeightKg: Number(originWeightKg) || 0,
        destWeightKg: Number(destWeightKg) || 0,
        client: parsedPreview?.destinatario || parsedPreview?.client || 'Aguardando vinculação',
        product: parsedPreview?.items?.[0]?.product || 'A definir',
        driverName: currentUser?.name || 'Motorista'
      });

      setMessage(`Romaneio ${slip.id} registrado no pátio. A venda será vinculada depois no escritório.`);
      setTruckPlate('');
      setNfeKey('');
      setNfNumber('');
      setOriginWeightKg('');
      setDestWeightKg('');
      setNfPhotoFile(null);
      setScaleFile(null);
      setParsedPreview(null);
    } catch (err) {
      setError(err.message || 'Falha ao registrar captura.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b1f33] text-white">
      <header className="flex items-center justify-between px-4 py-3 border-b border-sky-900/60">
        <div className="flex items-center gap-2">
          <Truck className="w-5 h-5 text-orange-400" />
          <div>
            <div className="text-sm font-black">AgroVenda · Pátio</div>
            <div className="text-[11px] text-sky-200">{currentUser?.name || 'Motorista'}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={logout}
          className="text-xs font-bold text-sky-200 flex items-center gap-1 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" /> Sair
        </button>
      </header>

      <form onSubmit={handleSubmit} className="p-4 space-y-4 max-w-lg mx-auto">
        <p className="text-[12px] text-sky-100/90">
          1) Placa · 2) Foto/chave da NF · 3) Foto do romaneio da balança. Isso <b>não</b> cria venda — só captura para validar depois.
        </p>

        <label className="block space-y-1">
          <span className="text-xs font-bold text-sky-100">Placa do caminhão *</span>
          <input
            required
            value={truckPlate}
            onChange={(e) => setTruckPlate(e.target.value.toUpperCase())}
            placeholder="ABC1D23"
            className="w-full rounded-xl bg-[#132c4a] border border-sky-800 px-3 py-3 text-base font-black tracking-wider uppercase outline-none focus:ring-2 focus:ring-orange-400"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-bold text-sky-100">Chave NF (44 dígitos) ou número</span>
          <input
            value={nfeKey || nfNumber}
            onChange={(e) => {
              const v = e.target.value.replace(/\s/g, '');
              if (v.length >= 40) setNfeKey(v.replace(/\D/g, ''));
              else setNfNumber(v.replace(/\D/g, ''));
            }}
            placeholder="Scan ou digite a chave / nº da NF"
            className="w-full rounded-xl bg-[#132c4a] border border-sky-800 px-3 py-3 text-sm font-mono outline-none focus:ring-2 focus:ring-orange-400"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1">
            <span className="text-xs font-bold text-sky-100">Peso origem (kg)</span>
            <input
              type="number"
              inputMode="decimal"
              value={originWeightKg}
              onChange={(e) => setOriginWeightKg(e.target.value)}
              className="w-full rounded-xl bg-[#132c4a] border border-sky-800 px-3 py-3 text-sm outline-none"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-bold text-sky-100">Peso destino (kg)</span>
            <input
              type="number"
              inputMode="decimal"
              value={destWeightKg}
              onChange={(e) => setDestWeightKg(e.target.value)}
              className="w-full rounded-xl bg-[#132c4a] border border-sky-800 px-3 py-3 text-sm outline-none"
            />
          </label>
        </div>

        <label className="flex flex-col gap-2 p-4 rounded-2xl border border-dashed border-sky-700 bg-[#132c4a]/cursor-pointer">
          <div className="flex items-center gap-2 text-sm font-bold">
            <FileText className="w-4 h-4 text-emerald-400" />
            Foto da NF (com o motorista)
          </div>
          <input type="file" accept="image/*,.pdf" capture="environment" className="hidden" onChange={handleNfPhoto} />
          <span className="text-[11px] text-sky-200 truncate">
            {nfPhotoFile ? nfPhotoFile.name : 'Toque para fotografar / anexar'}
          </span>
        </label>

        <label className="flex flex-col gap-2 p-4 rounded-2xl border border-dashed border-sky-700 bg-[#132c4a]/cursor-pointer">
          <div className="flex items-center gap-2 text-sm font-bold">
            <Camera className="w-4 h-4 text-orange-400" />
            Romaneio de papel da balança
          </div>
          <input
            type="file"
            accept="image/*,.pdf"
            capture="environment"
            className="hidden"
            onChange={(e) => setScaleFile(e.target.files?.[0] || null)}
          />
          <span className="text-[11px] text-sky-200 truncate">
            {scaleFile ? scaleFile.name : 'Toque para fotografar o ticket da balança'}
          </span>
        </label>

        {parsedPreview && (
          <div className="text-[11px] bg-emerald-950/40 border border-emerald-800 rounded-xl p-3 space-y-1">
            <div className="font-bold text-emerald-300">Prévia da NF</div>
            {parsedPreview.nfeKey && <div>Chave: …{String(parsedPreview.nfeKey).slice(-8)}</div>}
            {(parsedPreview.nNF || parsedPreview.nfNumber) && (
              <div>Nº: {parsedPreview.nNF || parsedPreview.nfNumber}</div>
            )}
            {parsedPreview.items?.[0]?.product && <div>Produto: {parsedPreview.items[0].product}</div>}
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 text-sm text-red-200 bg-red-950/40 border border-red-800 rounded-xl p-3">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            {error}
          </div>
        )}
        {message && (
          <div className="flex items-start gap-2 text-sm text-emerald-100 bg-emerald-950/40 border border-emerald-800 rounded-xl p-3">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 rounded-2xl bg-orange-500 hover:bg-orange-400 text-[#0b1f33] font-black text-sm disabled:opacity-50 cursor-pointer"
        >
          {loading ? 'Registrando…' : 'Confirmar captura de pátio'}
        </button>
      </form>
    </div>
  );
}
