/**
 * Upsert de parceiros a partir de vendas (comprador / produtor).
 */
const { Client, Sale, getNextSequence } = require('../db');
const { escapeRegex } = require('../utils/security');

function bareName(raw = '') {
  return String(raw || '')
    .replace(/\s*\([^)]*\)\s*$/, '')
    .replace(/\s*\(Importado da NF-e\)\s*$/i, '')
    .trim();
}

function parseCityUf(raw = '') {
  const m = String(raw || '').match(/\(([^/)]+)(?:[/ -]+([A-Za-z]{2}))?\)\s*$/);
  if (!m) return { city: '', uf: '' };
  return {
    city: (m[1] || '').trim(),
    uf: (m[2] || '').trim().toUpperCase()
  };
}

function mergeType(existingType, wanted) {
  const a = String(existingType || '').trim();
  const b = String(wanted || '').trim();
  if (!a) return b || 'Comprador';
  if (!b || a === b) return a;
  if (a === 'Ambos' || b === 'Ambos') return 'Ambos';
  if ((a === 'Comprador' && /produtor/i.test(b)) || (/produtor/i.test(a) && b === 'Comprador')) {
    return 'Ambos';
  }
  return a;
}

async function findExisting({ name, document }) {
  const doc = String(document || '').trim();
  if (doc) {
    const byDoc = await Client.findOne({ document: doc });
    if (byDoc) return byDoc;
  }
  const n = bareName(name);
  if (!n || n.length < 2) return null;
  const regex = new RegExp(`^${escapeRegex(n)}$`, 'i');
  return Client.findOne({ name: regex });
}

/**
 * @param {{ name: string, document?: string, type?: string, city?: string, uf?: string }} partner
 */
async function upsertPartner(partner = {}) {
  const name = bareName(partner.name);
  if (!name || name.length < 2) return null;
  if (/^produtor rural$/i.test(name) || /^cliente geral$/i.test(name)) return null;

  const document = String(partner.document || '').trim();
  const wantedType = partner.type || 'Comprador';
  const city = (partner.city || '').trim();
  const uf = (partner.uf || '').trim().toUpperCase();

  const existing = await findExisting({ name, document });
  if (existing) {
    const patch = {
      type: mergeType(existing.type, wantedType)
    };
    if (document && !existing.document) patch.document = document;
    if (city && !existing.city) patch.city = city;
    if (uf && !existing.uf) patch.uf = uf;
    if (existing.name !== name && name.length > existing.name.length) patch.name = name;
    await Client.updateOne({ id: existing.id }, { $set: patch });
    return { id: existing.id, name, created: false };
  }

  const seq = await getNextSequence('client_id', Client, 'CLI-');
  const created = new Client({
    id: `CLI-${seq}`,
    name,
    document,
    type: wantedType,
    city,
    uf,
    ie: '',
    address: '',
    email: '',
    phone: ''
  });
  await created.save();
  return { id: created.id, name, created: true };
}

async function upsertPartnersFromSale(saleLike = {}) {
  const results = [];
  const clientName = saleLike.client;
  if (clientName) {
    const r = await upsertPartner({
      name: clientName,
      document: saleLike.clientDocument || '',
      type: 'Comprador',
      city: saleLike.destCity || '',
      uf: saleLike.destUF || ''
    });
    if (r) results.push(r);
  }

  const origin = saleLike.origin || '';
  const bare = bareName(origin);
  if (bare) {
    const { city, uf } = parseCityUf(origin);
    const r = await upsertPartner({
      name: bare,
      type: 'Produtor',
      city,
      uf
    });
    if (r) results.push(r);
  }
  return results;
}

function typeMatchesFilter(clientType, filterType) {
  if (!filterType || filterType === 'all') return true;
  const t = String(clientType || '');
  if (t === filterType) return true;
  if (t === 'Ambos' && (filterType === 'Comprador' || filterType === 'Produtor' || /produtor/i.test(filterType))) {
    return true;
  }
  return false;
}

async function reconcileFromSales({ apply = false } = {}) {
  const [clientNames, origins, existing] = await Promise.all([
    Sale.distinct('client'),
    Sale.distinct('origin'),
    Client.find({}).select('id name document type').lean()
  ]);

  const existingKeys = new Set(
    existing.flatMap((c) => {
      const keys = [bareName(c.name).toLowerCase()];
      if (c.document) keys.push(`doc:${String(c.document).trim()}`);
      return keys;
    })
  );

  const missing = [];
  for (const raw of clientNames) {
    const name = bareName(raw);
    if (!name || existingKeys.has(name.toLowerCase())) continue;
    missing.push({ name, type: 'Comprador', source: 'client' });
  }
  for (const raw of origins) {
    const name = bareName(raw);
    if (!name || existingKeys.has(name.toLowerCase())) continue;
    const { city, uf } = parseCityUf(raw);
    missing.push({ name, type: 'Produtor', city, uf, source: 'origin' });
  }

  // dedupe by name
  const byName = new Map();
  for (const m of missing) {
    const k = m.name.toLowerCase();
    if (!byName.has(k)) byName.set(k, m);
    else {
      const prev = byName.get(k);
      byName.set(k, { ...prev, type: mergeType(prev.type, m.type), city: prev.city || m.city, uf: prev.uf || m.uf });
    }
  }
  const list = [...byName.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  const created = [];
  if (apply) {
    for (const m of list) {
      const r = await upsertPartner(m);
      if (r?.created) created.push(r);
    }
  }

  return { missing: list, missingCount: list.length, created, applied: !!apply };
}

module.exports = {
  bareName,
  upsertPartner,
  upsertPartnersFromSale,
  reconcileFromSales,
  typeMatchesFilter
};
