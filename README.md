# AgroVenda V2

Sistema de gestão e vendas agrícolas (React + Node.js + MongoDB), com Docker Compose, webhooks n8n (Google Drive / Calendar) e backup/restore JSON.

**Versão:** 2.0.0 (`package.json`)

---

## Documentação

| Documento | Conteúdo |
|-----------|----------|
| [docs/FUNCIONALIDADES_DO_SISTEMA.md](docs/FUNCIONALIDADES_DO_SISTEMA.md) | Manual de módulos (UI / ops) |
| [docs/FLUXO_GERAL_E_FUNCIONALIDADES_DO_SISTEMA.md](docs/FLUXO_GERAL_E_FUNCIONALIDADES_DO_SISTEMA.md) | Fluxo mestre e regras de negócio |
| [docs/BACKUP_RESTORE_AND_DRIVE.md](docs/BACKUP_RESTORE_AND_DRIVE.md) | Restore, rotas Drive SaaS, n8n, Badin/W&A |
| [docs/TESTING.md](docs/TESTING.md) | Jest, Vitest, Playwright, validate:restore |
| [docs/E2E_CRITICAL_FLOWS.md](docs/E2E_CRITICAL_FLOWS.md) | Gate E2E e checklist n8n |
| [docs/DATA_DICTIONARY.md](docs/DATA_DICTIONARY.md) | Labels UI ↔ campos |
| [docs/DOCUMENTACAO_ARQUITETURA_ROTAS_E_BANCO_DE_DADOS.md](docs/DOCUMENTACAO_ARQUITETURA_ROTAS_E_BANCO_DE_DADOS.md) | Rotas e schemas |
| [docs/ARQUITETURA_SERVICOS_E_CONTRATOS_API.md](docs/ARQUITETURA_SERVICOS_E_CONTRATOS_API.md) | Serviços e contratos API |

Pacotes JSON de restore ficam em `backups/` (**não entram no git**). Na VPS, use a tela Backup/Restore ou a API — ver runbook.

---

## Funcionalidades (resumo)

- Dashboard com KPIs, alertas e últimas vendas
- Nova Venda (4 tipos de operação), NF-e, FUNRURAL informativo
- Histórico, Agenda (receber loja / pagar produtor), Relatórios e Excel fiscal
- Financeiro (Contas / Fluxos) com filtros e paginação estável
- Pesagens + módulo pátio `/m` (motorista) e ledger multi-CP
- Backup/restore com confirmação; webhooks Drive `AgroVenda/{tenant}/{loja}/{VP}`

---

## Docker

| Serviço | Descrição | Porta típica |
|---------|-----------|--------------|
| `app` | Frontend + API | `3000` |
| `mongodb` | MongoDB 7 | `27017` |
| `mongo-express` | UI Mongo (se habilitado) | `8081` |

```bash
# Na raiz do repositório clonado
docker compose up -d --build
```

- App: http://localhost:3000  
- Mongo Express (se ativo): http://localhost:8081  

```bash
docker compose down
```

Desenvolvimento local (sem Docker da app): ver [docs/E2E_CRITICAL_FLOWS.md](docs/E2E_CRITICAL_FLOWS.md) e [docs/TESTING.md](docs/TESTING.md).

---

## Scripts úteis (raiz)

```bash
npm run test:backend
npm run test:frontend
npm run test:e2e
npm run validate:restore -- backups/agrovenda_backup_reconciliado_rotas_2026-10-23.json
```
