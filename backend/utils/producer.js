const producerService = require('../services/producer.service');

/**
 * Mapeamentos canônicos e utilitários de produtor rural.
 * Mantido para compatibilidade retroativa; a lógica de domínio reside em producer.service.js.
 */
module.exports = {
  CANONICAL_PRODUCERS: producerService.CANONICAL_PRODUCERS,
  normalizeProducerOrigin: producerService.normalizeProducerOrigin
};
