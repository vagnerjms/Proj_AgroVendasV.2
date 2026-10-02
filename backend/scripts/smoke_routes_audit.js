/**
 * Smoke de rotas críticas — garante que endpoints principais respondem após mudanças.
 * Uso: node backend/scripts/smoke_routes_audit.js
 */
const BASE = process.env.APP_BASE_URL || 'http://localhost:3000';
const EMAIL = process.env.E2E_EMAIL || 'admin@agrovenda.com.br';
const PASSWORD = process.env.E2E_PASSWORD || 'Admin123@';

async function req(method, path, token, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch (_) {}
  return { status: res.status, ok: res.ok, json, text: text.slice(0, 200) };
}

async function main() {
  const results = [];
  const push = (name, r) => {
    const line = { name, status: r.status, ok: r.ok };
    results.push(line);
    console.log(`${r.ok ? 'OK ' : 'FAIL'} ${r.status} ${name}`);
    if (!r.ok) console.log('  ', r.text);
  };

  const health = await req('GET', '/api/health');
  push('GET /api/health', health);

  const login = await req('POST', '/api/auth/login', null, { email: EMAIL, password: PASSWORD });
  push('POST /api/auth/login', login);
  const token = login.json?.token || login.json?.accessToken || login.json?.data?.token;
  if (!token) {
    console.error('Sem token — abortando smoke autenticado.');
    process.exit(1);
  }

  const routes = [
    ['GET', '/api/dashboard'],
    ['GET', '/api/sales'],
    ['GET', '/api/sales/agenda-events'],
    ['GET', '/api/financial/summary'],
    ['GET', '/api/reports/stores-summary'],
    ['GET', '/api/reports/producers-summary'],
    ['GET', '/api/weighings'],
    ['GET', '/api/clients'],
    ['GET', '/api/products'],
    ['GET', '/api/notifications'],
    ['POST', '/api/notifications/refresh'],
    ['GET', '/api/users'],
    ['GET', '/api/purchases'],
  ];

  for (const [method, path] of routes) {
    const r = await req(method, path, token);
    push(`${method} ${path}`, r);
  }

  // Checagens de forma do payload de relatório (VP comercial)
  const stores = await req('GET', '/api/reports/stores-summary', token);
  const store0 = stores.json?.stores?.[0];
  const item0 = store0?.itens?.[0];
  if (store0) {
    const hasVp = 'totalVendaAReceber' in store0 || 'liquidoPeloVP' in store0;
    console.log(hasVp ? 'OK  stores-summary tem campos comerciais' : 'FAIL stores-summary sem liquidoPeloVP/totalVendaAReceber');
    results.push({ name: 'shape stores-summary comercial', ok: hasVp, status: hasVp ? 200 : 500 });
  } else {
    console.log('WARN stores-summary sem lojas (banco vazio?)');
  }
  if (item0) {
    const okItem = 'valorVP' in item0 && ('liquidoPeloVP' in item0 || 'liquidoProdutor' in item0);
    console.log(okItem ? 'OK  item de loja tem valorVP/liquidoPeloVP' : 'FAIL item sem valorVP');
    results.push({ name: 'shape item comercial', ok: okItem, status: okItem ? 200 : 500 });
  }

  const producers = await req('GET', '/api/reports/producers-summary', token);
  const p0 = producers.json?.producers?.[0];
  if (p0) {
    const okP = 'liquidoProdutor' in p0 || 'liquidoPeloVP' in p0;
    console.log(okP ? 'OK  producers-summary tem líquido' : 'FAIL producers sem líquido');
    results.push({ name: 'shape producers-summary', ok: okP, status: okP ? 200 : 500 });
  }

  const notif = await req('POST', '/api/notifications/refresh', token);
  const nCount = notif.json?.notifications?.length ?? notif.json?.data?.notifications?.length ?? notif.json?.summary?.total;
  console.log('Auditoria notificações:', typeof nCount === 'number' ? `${nCount} alertas` : JSON.stringify(notif.json)?.slice(0, 180));

  const failed = results.filter((r) => !r.ok);
  console.log('\n=== RESUMO SMOKE ===');
  console.log(`Passou: ${results.filter((r) => r.ok).length}/${results.length}`);
  if (failed.length) {
    console.log('Falhas:', failed.map((f) => f.name).join(', '));
    process.exit(1);
  }
  console.log('Todas as rotas críticas responderam.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
