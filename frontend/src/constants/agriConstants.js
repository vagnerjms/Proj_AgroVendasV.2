// Centralized Agricultural, Tax & Packaging Constants for AgroVenda V2 Frontend

export const TAX_RATES = {
  PREVIDENCIA: 0.0130, // 1.30%
  RAT: 0.0010,         // 0.10%
  SENAR: 0.0023,       // 0.23%
  FUNRURAL_TOTAL: 0.0163 // 1.63%
};

export const COMMERCIAL_DEFAULTS = {
  COMMISSION_PCT: 3.0,     // 3% comissão padrão
  WEIGHT_TOLERANCE_PCT: 0.25 // 0.25% tolerância de divergência de pesagem
};

export const PACKAGING_WEIGHT_KG = {
  'Caixas (cx)': 29,
  'Sacas (sc)': 60,
  'Granel (kg)': 1,
  'Toneladas (ton)': 1000,
  'Bins (bin)': 400,
  'Fardos / Pacotes (fd)': 10,
  'Paletes (pal)': 800
};

export const DEFAULT_PACKAGING_OPTIONS = [
  { label: 'Caixas (cx) — 29kg', value: 'Caixas (cx)', defaultKg: 29 },
  { label: 'Sacas (sc) — 60kg', value: 'Sacas (sc)', defaultKg: 60 },
  { label: 'Granel (kg) — 1kg', value: 'Granel (kg)', defaultKg: 1 },
  { label: 'Toneladas (ton) — 1.000kg', value: 'Toneladas (ton)', defaultKg: 1000 },
  { label: 'Bins (bin) — 400kg', value: 'Bins (bin)', defaultKg: 400 },
  { label: 'Fardos / Pacotes (fd) — 10kg', value: 'Fardos / Pacotes (fd)', defaultKg: 10 },
  { label: 'Paletes (pal) — 800kg', value: 'Paletes (pal)', defaultKg: 800 },
  { label: 'Outro (Personalizado)', value: 'Outro (Personalizado)', defaultKg: 1 }
];
