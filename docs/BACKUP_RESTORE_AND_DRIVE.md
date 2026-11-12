# Backup, restore e Google Drive (SaaS)

**Atualizado:** 12 de novembro de 2026  
**Versão app:** 2.0.0

Runbook operacional. Detalhes de teste: [TESTING.md](./TESTING.md). E2E/n8n: [E2E_CRITICAL_FLOWS.md](./E2E_CRITICAL_FLOWS.md).

---

## 1. Pacote de restore canônico

| Uso | Arquivo (local, **fora do git**) |
|-----|----------------------------------|
| **Restore VPS / produção** | `backups/agrovenda_backup_reconciliado_rotas_2026-11-03.json` |
| Fonte bruta (não restaurar direto) | `backups/agrovenda_backup_completo_2026-11-03 (1).json` |
| Histórico 23/10 | `backups/agrovenda_backup_reconciliado_rotas_2026-10-23.json` |
| Pipeline antigo (zerado, 01/10) | Ver [RECONCILIACAO_BACKUP_2026-10-01.md](./RECONCILIACAO_BACKUP_2026-10-01.md) — histórico |

**Limite de upload na UI:** restore aceita até **100 MB** (`backupUpload`). Anexos do dia a dia continuam em 15 MB. Pacote atual ~24 MB.

Validação local:

```bash
npm run validate:restore -- backups/agrovenda_backup_reconciliado_rotas_2026-11-03.json
```

Esperado (nov/2026): Rubi quitada (VP 409.890,35 / pagos 396.475,25); Badin/W&A conforme pacote.

### Scripts

| Script | Função |
|--------|--------|
| `backend/scripts/reconcile_backup_routes_20261023.js` | Normaliza rotas/nomes canônicos + transferência Badin→W&A |
| `backend/scripts/patch_badin_ledger_restore.js` | Realoca ledger Badin (8 CPs Sicoob) |
| `backend/scripts/validate_restore_backup.js` | Gate `npm run validate:restore` |
| `backend/tests/restore.backup.integrity.test.js` | Testes de integridade do pacote |

### UI de restore

Em `BackupRestore.jsx`: confirmação tipada + ack de possível perda/alteração de baixas antes de importar. Não pule a validação prévia.

---

## 2. Regras Badin / W&A (pacote 23/10)

- **Badin Favilla:** 8 CPs Sicoob/PIX = R$ 104.809,95; saldo **R$ 7.510,58** só no romaneio **09718** (VP008); 09720 / 09728 / 09732 quitados.
- **Transferência:** PIX R$ 33.902,40 (05/10/2026) removido de Badin VP022 → baixa definitiva em W&A **VP023** (`09733-CP01-28042894.pdf`).
- Log detalhado (local): `backups/RECONCILIACAO_ROTAS_2026-10-23.md`.

---

## 3. Path Google Drive (SaaS)

Padrão canônico (código + webhook):

```text
AgroVenda/{tenantSlug}/{storeFolder}/{saleId}
```

Exemplo: `AgroVenda/default/BADIN_FAVILLA_HORTIFRUTI_LTDA/VP008`

| Item | ID / valor |
|------|------------|
| Root compartilhado | [`1QKum1pz3NW3ZDo1eKyu2_08B4KDLaIro`](https://drive.google.com/drive/folders/1QKum1pz3NW3ZDo1eKyu2_08B4KDLaIro) |
| Tenant `default` | `139EdJ1P2DdUqyj0He1w41eBjE8PKCxq9` |
| Fontes CP | `FAVILLA-ATUAL`, `RUBI-ATUAL` (não apagar) |

Nomes de arquivo: `{romaneio}-NF-{nf}.pdf`, `{romaneio}-CP{nn}-….pdf|jpeg`, `{romaneio}-Pedido….` (ver `buildDriveAttachmentName`).

### Lixeira de clones flat

Pastas antigas `VP### - LOJA (YYYY-MM)` duplicadas no root: o MCP Drive **não** consegue lixeirar (403 `appNotAuthorizedToFile`). Checklist local: `backups/LIMPEZA_DRIVE_DUPLICATAS_2026-10-23.md` e pasta Drive `_CLONES_PARA_LIXEIRA`. Manter keepers newest + `default` + ATUAL.

---

## 4. n8n

Arquivo: [`n8n_agrovenda_webhook_pastas_drive.json`](../n8n_agrovenda_webhook_pastas_drive.json)

1. Reimportar no n8n (UTF-8 sem BOM); desative fluxo antigo no mesmo path `agrovenda-sale`.
2. Fluxo atual: busca pasta da **loja** sob `default` → busca pasta **saleId** → cria só se faltar → dedup NF/Pedido (CPs parciais preservados).
3. `agroVendaRootId` = root compartilhado acima; `defaultTenantId` = pasta `default`.
4. Backend: `N8N_WEBHOOK_URL=…/webhook/agrovenda-sale`.

Smoke: [E2E_CRITICAL_FLOWS.md](./E2E_CRITICAL_FLOWS.md) § Checklist ops — n8n Drive.

---

## 5. Ordem sugerida na VPS

1. Deploy do código (branch) + rebuild do container app:
   ```bash
   git pull
   docker compose build app && docker compose up -d app
   ```
2. **Nginx** (se estiver na frente do app): garantir `client_max_body_size 100m;` no `server`/`location` da API — senão o proxy corta o JSON ~24 MB antes do Node.
3. Restore pela UI (Configurações → Restaurar) com `agrovenda_backup_reconciliado_rotas_2026-11-03.json` — arquivo fica **fora do git**; selecione no navegador a partir da máquina local.
4. Alternativa sem UI: `BACKUP_PATH=... MONGO_URI=... ALLOW_REMOTE_RESTORE=1 node backend/scripts/restore_from_docs_backup.js` (dentro do host/container com volume de uploads).
5. Conferir Rubi/Badin/W&A e pastas `default/{loja}/{VP}`.
6. Lixeira manual dos clones flat no Drive (se ainda houver).
