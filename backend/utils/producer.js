const { Client } = require('../db');

/**
 * Mapeamentos diretos conhecidos e canônicos de Produtores
 */
const CANONICAL_PRODUCERS = [
  {
    pattern: /CANTELE/i,
    canonical: 'CARLOS CESAR CANTELE (NOVA PONTE/MG)'
  },
  {
    pattern: /BRUNO\s*PERES/i,
    canonical: 'BRUNO PERES ROMEIRO (Campo Alegre de Goiás/GO)'
  }
];

/**
 * Normaliza e padroniza a string de origem/produtor
 * Ex: 'CARLOS CESAR CANTELE' -> 'CARLOS CESAR CANTELE (NOVA PONTE/MG)'
 * Ex: 'carlos cesar cantele (nova ponte - mg)' -> 'CARLOS CESAR CANTELE (NOVA PONTE/MG)'
 */
async function normalizeProducerOrigin(originStr, notesStr = '') {
  if (!originStr || typeof originStr !== 'string') {
    originStr = '';
  }

  let textToAnalyze = originStr.trim();
  if (!textToAnalyze && notesStr) {
    const matchProd = notesStr.match(/Produtor:?\s*([^|]+)/i);
    if (matchProd && matchProd[1]) {
      textToAnalyze = matchProd[1].trim();
    }
  }

  if (!textToAnalyze) return originStr || 'Produtor Rural';

  // 1. Checar mapeamentos canônicos diretos
  for (const item of CANONICAL_PRODUCERS) {
    if (item.pattern.test(textToAnalyze) || (notesStr && item.pattern.test(notesStr))) {
      return item.canonical;
    }
  }

  // 2. Tentar cruzar com a tabela de Clientes/Produtores no Banco
  try {
    const cleanSearch = textToAnalyze.replace(/\s*\(.*\)/, '').trim();
    if (cleanSearch.length >= 3) {
      const regex = new RegExp(cleanSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const foundClient = await Client.findOne({
        name: regex
      }).lean();

      if (foundClient) {
        const nameUpper = (foundClient.name || cleanSearch).trim().toUpperCase();
        const cityUpper = (foundClient.city || '').trim().toUpperCase();
        const ufUpper = (foundClient.uf || foundClient.state || '').trim().toUpperCase();

        if (cityUpper && ufUpper) {
          return `${nameUpper} (${cityUpper}/${ufUpper})`;
        } else if (cityUpper) {
          return `${nameUpper} (${cityUpper})`;
        }
        return nameUpper;
      }
    }
  } catch (e) {
    // Fallback gracioso
  }

  // 3. Se tiver parênteses com cidade/UF, padronizar formatação para (CIDADE/UF) em caixa alta
  const parenMatch = textToAnalyze.match(/^(.+?)\s*\(([^/)]+)(?:[/ -]+([A-Za-z]{2}))?\)$/);
  if (parenMatch) {
    const name = parenMatch[1].trim().toUpperCase();
    const city = parenMatch[2].trim().toUpperCase();
    const uf = (parenMatch[3] || 'MG').trim().toUpperCase();
    return `${name} (${city}/${uf})`;
  }

  return textToAnalyze.toUpperCase();
}

module.exports = {
  CANONICAL_PRODUCERS,
  normalizeProducerOrigin
};
