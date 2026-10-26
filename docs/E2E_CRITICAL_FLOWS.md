# E2E — fluxos críticos AgroVenda

Gate de fechamento: `npm run test:backend` (Jest `test:ci` ≥ limiar) + Vitest frontend + Playwright (`npm run test:e2e`).

## Pré-requisitos locais

1. MongoDB em `mongodb://127.0.0.1:27017/agrovenda`
   - Sem Docker: `node backend/scripts/e2e_memory_mongo.js`
   - Com Docker Compose: exporte `MONGO_URI=mongodb://mongodb:27017/agrovenda`
   - Default em `db.js`: se `NODE_ENV !== 'production'` e `MONGO_URI` ausente → `127.0.0.1`; em production sem env → host Docker `mongodb`
2. Backend: `PORT=3001 JWT_SECRET=ci_e2e_jwt_secret_agrovenda_2026 DISABLE_AUTH_RATE_LIMIT=1 node server.js` (em `backend/`)
3. Frontend build + preview com proxy: `npm run build` e `npx vite preview --port 3000` (em `frontend/`)
4. Credenciais: `admin@agrovenda.com.br` / `Admin123!` (bootstrap)

```bash
# Terminal A — Mongo em memória (se não houver Docker/Mongo local)
node backend/scripts/e2e_memory_mongo.js

# Terminal B — API
cd backend
$env:PORT='3001'; $env:JWT_SECRET='ci_e2e_jwt_secret_agrovenda_2026'; $env:DISABLE_AUTH_RATE_LIMIT='1'; node server.js

# Terminal C — UI
cd frontend
npm run build
npx vite preview --host 127.0.0.1 --port 3000

# Terminal D — Playwright (raiz)
$env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:3000'
$env:E2E_EMAIL='admin@agrovenda.com.br'
$env:E2E_PASSWORD='Admin123!'
npm run test:e2e
```

## Mapa dos testes

| # | Spec | O que valida |
|---|------|----------------|
| 8–12 | `critical.spec.js` | FUNRURAL, romaneios, produtos, label Quantidade, logout |
| 13–18 | `critical.spec.js` | Agenda chips, uploads 404, modal CP, Forma pgto, Relatórios, Excel |
| 19 | `traceability.spec.js` | SPA `/m` módulo motorista/pátio |
| 20 | `traceability.spec.js` | API pátio → venda com `patioSlipId` → 2 baixas parciais (CP01/CP02) |
| 21 | `traceability.spec.js` | Barra de filtros Fiscal estável + Nova Venda |

## Regras de produto cobertas indiretamente

- Soft-cancel e ledger multi-CP: cobertos no Jest (`sale.service` / settle).
- Webhook Drive `suggestedPath` + nomes CP: Jest + fixture n8n.
- Conciliação pátio×NF: Jest `patio.reconcile.test.js` + E2E #20.
- Excel Fiscal abas Resumo / Ledger_Baixas / Ledger_Repasses: Vitest `fiscalExcelBuilder.test.mjs`.

## Checklist ops — n8n Drive

Arquivo: `n8n_agrovenda_webhook_pastas_drive.json`

- [ ] Reimportar workflow no n8n de produção/staging
- [ ] Smoke: venda com 2 CPs parciais → pasta Drive mantém ambos; nenhum trash de CP por romaneio
- [ ] Smoke: NF/Pedido legado ainda deduplica
- [ ] Confirmar `suggestedPath` SaaS (`AgroVenda/{tenant}/{loja}/{VP}`)

Owner: ________________  Data: ________
