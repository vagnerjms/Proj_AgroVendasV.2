# Backup, restore e Google Drive (SaaS)

**Atualizado:** 23 de outubro de 2026  
**Versão app:** 2.0.0

Runbook operacional. Detalhes de teste: [TESTING.md](./TESTING.md). E2E/n8n: [E2E_CRITICAL_FLOWS.md](./E2E_CRITICAL_FLOWS.md).

---

## 1. Pacote de restore canônico

| Uso | Arquivo (local, **fora do git**) |
|-----|----------------------------------|
| **Restore VPS / produção** | `backups/agrovenda_backup_reconciliado_rotas_2026-10-23.json` |
| Fonte bruta (não restaurar direto) | `backups/agrovenda_backup_completo_2026-10-23.json` |
| Pipeline antigo (zerado, 01/10) | Ver [RECONCILIACAO_BACKUP_2026-10-01.md](./RECONCILIACAO_BACKUP_2026-10-01.md) — histórico |

Validação local:

```bash
npm run validate:restore -- backups/agrovenda_backup_reconciliado_rotas_2026-10-23.json
```

Esperado (out/2026): 48 vendas, 0 issues; Badin pago R$ 104.809,95; saldo aberto 09718 (VP008) R$ 7.510,58.

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

1. Deploy do código (PR) + reimport n8n.
2. Copiar o JSON reconciliado para a VPS (scp) — **não** via git.
3. Restore pela UI com confirmação.
4. Conferir Badin/W&A e pastas `default/{loja}/{VP}`.
5. Lixeira manual dos clones flat no Drive.
