/**
 * Sobe MongoMemoryServer na porta 27017 para E2E local sem Docker.
 * Uso: node scripts/e2e_memory_mongo.js
 */
const { MongoMemoryServer } = require('mongodb-memory-server');

(async () => {
  const mongod = await MongoMemoryServer.create({
    instance: { port: 27017, dbName: 'agrovenda' }
  });
  const uri = mongod.getUri();
  console.log(`[e2e-mongo] listening ${uri}`);
  const stop = async () => {
    try { await mongod.stop(); } catch (_) { /* ignore */ }
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
})().catch((err) => {
  console.error('[e2e-mongo] failed:', err.message);
  process.exit(1);
});
