// Centralized Agricultural & Tax Constants for AgroVenda V2

const TAX_RATES = {
  PREVIDENCIA: 0.0130, // 1.30%
  RAT: 0.0010,         // 0.10%
  SENAR: 0.0023,       // 0.23%
  FUNRURAL_TOTAL: 0.0163 // 1.63%
};

const COMMERCIAL_DEFAULTS = {
  COMMISSION_PCT: 3.0,     // 3% comissão padrão
  WEIGHT_TOLERANCE_PCT: 0.25 // 0.25% quebra técnica aceitável
};

const PACKAGING_WEIGHT_KG = {
  'Caixas (cx)': 29,
  'Sacas (sc)': 60,
  'Granel (kg)': 1,
  'Toneladas (ton)': 1000,
  'Bins (bin)': 400,
  'Fardos / Pacotes (fd)': 10,
  'Paletes (pal)': 800
};

module.exports = {
  TAX_RATES,
  COMMERCIAL_DEFAULTS,
  PACKAGING_WEIGHT_KG
};
