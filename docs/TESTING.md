# Testes e cobertura — AgroVenda

Tracking: [#1 chore(test): meta ≥95% coverage](https://github.com/vagnerjms/Proj_AgroVendasV.2/issues/1)

Ops de backup/Drive: [BACKUP_RESTORE_AND_DRIVE.md](./BACKUP_RESTORE_AND_DRIVE.md).

## Backend (Jest)

```bash
cd backend
npm test                 # suite sem coverage
npm run test:coverage    # com relatório
npm run test:ci          # CI: --coverage + thresholds
```

Relatório em `backend/coverage/` (HTML em `coverage/lcov-report/index.html`).

### Thresholds (global) — `backend/jest.config.js`

| Métrica | Meta CI |
|---------|---------|
| statements | ≥ 95% |
| lines | ≥ 95% |
| functions | **100%** |
| branches | ≥ **88,9%** (meta aspiracional 90%; residual catch/pátio) |

### Exclusões do collectCoverageFrom

Documentadas e temporárias até PRs dedicados (Refs #1):

- `services/nfeParser.service.js` — parser PDF/XML pesado
- `services/backup.service.js` — I/O de dump/restore
- `services/audit.service.js` — cache/side-effects
- `services/cleanup.service.js` — scheduler
- `services/bootstrap.service.js` — seed/inicialização

`scripts/` one-off não entram no coverage. Integridade de pacote: `tests/restore.backup.integrity.test.js`.

## Frontend (Vitest)

```bash
cd frontend
npm test
```

Inclui `tests/pagination.test.mjs` (paginação financeira estável) e builders de Excel fiscal.

## E2E (Playwright)

Inventário e runbook local: [E2E_CRITICAL_FLOWS.md](./E2E_CRITICAL_FLOWS.md)

```bash
# App Docker ou local em :3000
PLAYWRIGHT_BASE_URL=http://localhost:3000 npx playwright test
# opcional: E2E_EMAIL / E2E_PASSWORD
```

Login único em `e2e/auth.setup.js` (storageState). Backend: `DISABLE_AUTH_RATE_LIMIT=1` e `JWT_SECRET` definido (CI/E2E).

## Backup / restore / validação (out/2026)

Pacote canônico (local, gitignored): `backups/agrovenda_backup_reconciliado_rotas_2026-10-23.json`.

```bash
# Gate de integridade (rotas, Badin, W&A)
npm run validate:restore -- backups/agrovenda_backup_reconciliado_rotas_2026-10-23.json

# Regenerar pacote (dev) a partir do completo + regras Badin
node backend/scripts/reconcile_backup_routes_20261023.js
node backend/scripts/patch_badin_ledger_restore.js
```

Restore na VPS: UI Backup/Restore com confirmação tipada — ver [BACKUP_RESTORE_AND_DRIVE.md](./BACKUP_RESTORE_AND_DRIVE.md).

> Pipeline **01/10** (`reconcile_docs_backup.js` → JSON zerado em `docs/`) está **arquivado**: [RECONCILIACAO_BACKUP_2026-10-01.md](./RECONCILIACAO_BACKUP_2026-10-01.md).

## n8n — reimport e smoke (Drive / Calendar)

Workflows no root do repo (UTF-8 **sem BOM**; reimporte após pull):

| Arquivo | Path webhook | Uso |
|---------|--------------|-----|
| `n8n_agrovenda_webhook_pastas_drive.json` | `POST /webhook/agrovenda-sale` | Venda → pasta Drive SaaS + Calendar |
| `n8n_agrovenda_google_calendar.json` | `POST /webhook/agrovenda-sale` | Calendar anti-duplicidade (não ative junto do fluxo pastas) |
| `n8n_agrovenda_salvar_relatorio_drive.json` | `POST /webhook/salvar-relatorio` | Excel Relatórios → Drive |
| `n8n_agrovenda_google_drive_backup.json` | (manual/schedule) | Backup export → Drive |

### Reimport no n8n

1. **Workflows → Import from File** e escolha cada JSON.
2. Desative/delete o antigo no mesmo path `agrovenda-sale` para não duplicar.
3. Credenciais Google Drive / Calendar (OAuth da instância).
4. Ative só **um** fluxo em `agrovenda-sale` (recomendado: pastas Drive + Calendar).
5. Backend:

```bash
N8N_WEBHOOK_URL=http://n8n_application:5678/webhook/agrovenda-sale
# ou: http://127.0.0.1:5678/webhook/agrovenda-sale
```

### Payload canônico (venda)

`backend/services/webhook.service.js` envia:

- `saleId`, `romaneioNumber`, `nfNumber`
- `files[]` com nomes canônicos + `contentBase64`
- `driveFolder.suggestedPath` = `AgroVenda/{tenant}/{loja}/{VP}`
- `driveFolder.storeFolder`, `saleFolder`, `calendar.*`

### Smoke checklist

1. **Venda → Drive:** VP com NF → pasta `AgroVenda/default/{LOJA}/{saleId}` com PDF canônico (não mais `VP### - Cliente (YYYY-MM)` como layout alvo).
2. **CPs parciais:** dois CPs distintos permanecem; dedup só NF/Pedido legados.
3. **Calendar:** evento no vencimento com `VP:`, `Romaneio:`, `Nº NF:`.
4. **Relatório → Drive:** “Salvar no Drive” → pasta Relatórios.
5. Detalhes: [E2E_CRITICAL_FLOWS.md](./E2E_CRITICAL_FLOWS.md) + [BACKUP_RESTORE_AND_DRIVE.md](./BACKUP_RESTORE_AND_DRIVE.md).
