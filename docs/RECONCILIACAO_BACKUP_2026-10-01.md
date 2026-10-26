# Reconciliação Backup — AgroVenda

> **HISTÓRICO / SUPERSEDIDO (out/2026).**  
> Pacote e runbook atuais: [BACKUP_RESTORE_AND_DRIVE.md](./BACKUP_RESTORE_AND_DRIVE.md)  
> (`backups/agrovenda_backup_reconciliado_rotas_2026-10-23.json` + `npm run validate:restore`).  
> Este documento descreve o pipeline **zerado de 01/10/2026** e permanece só como arquivo.

Fonte: `docs\agrovenda_backup_completo_2026-10-01.json`
Exportado em: 2026-10-01T20:55:36.958Z
Gerado em: 2026-10-02T18:58:26.831Z

## Objetivo

- Checklist do que a UI deve mostrar após restore do JSON **reconciliado zerado**.
- Pagamentos loja/produtor **zerados** — baixas serão refeitas manualmente.
- Romaneio, NF, valores, quantidades e anexos com nomes estáveis para rastreabilidade.

## Resumo

| Métrica | Valor |
|---------|-------|
| Vendas (VP) | 48 |
| Tinham baixa loja | 14 |
| Tinham repasse produtor | 17 |
| Sem NF | VP024, VP033, VP034 |
| Sem pedido/canhoto | 25 |
| Valor negociado = 0 | VP006, VP007, VP009, VP010, VP011, VP012, VP015, VP016, VP018, VP019, VP020, VP021, VP022, VP025, VP026, VP027, VP028, VP029, VP030, VP031, VP032 |
| Arquivos órfãos (sem saleId) | 25 |

## Restore

```bash
# Local / Docker host Mongo
BACKUP_PATH=docs/agrovenda_backup_reconciliado_zerado.json \
  MONGO_URI=mongodb://127.0.0.1:27017/agrovenda \
  node backend/scripts/restore_from_docs_backup.js
```

CSV completo: [`RECONCILIACAO_BACKUP_2026-10-01.csv`](./RECONCILIACAO_BACKUP_2026-10-01.csv)

## Checklist por VP

| VP | Cliente | Produto | Romaneio | Nº NF | Peso | Qtd | Valor neg. | Valor NF | Flags | Ação UI |
|----|---------|---------|----------|-------|------|-----|------------|----------|-------|---------|
| VP001 | HORTIFRUTI RUBI LTDA | Cenoura (Caixa 2 | 09711 | 27957662 | 21350 | 736.21 Caixas (29kg) | 33129.31 | 27989.00 | TINHA_BAIXA_LOJA|TINHA_REPASSE | Refazer Receber (loja) manualmente; Refazer repasse produtor se aplicável |
| VP002 | HORTIFRUTI RUBI LTDA | Cenoura (Caixa 2 | — | 27957664 | 19240 | 663.45 Caixas (29kg) | 29855.17 | 25012.00 | SEM_PEDIDO | Anexar canhoto/pedido |
| VP003 | COMERCIAL DE VERDURAS WD LTD | Cenoura (Caixa 2 | 09713 | 27957569 | 17370 | 598.97 Caixas (29kg) | 26953.45 | 26910.00 | TINHA_BAIXA_LOJA|TINHA_REPASSE|CP_DISPONIVEL | Refazer Receber (loja) manualmente; Refazer repasse produtor se aplicável; Reassociar CP na baixa |
| VP004 | MARCELO KATSUMI HARADA | Cenoura (Caixa 2 | — | 27967571 | 18200 | 627.59 Caixas (29kg) | 28241.38 | 23660.00 | SEM_PEDIDO|TINHA_BAIXA_LOJA|TINHA_REPASSE | Anexar canhoto/pedido; Refazer Receber (loja) manualmente; Refazer repasse produtor se aplicável |
| VP005 | HORTIFRUTI RUBI LTDA | Cenoura (Caixa 2 | — | 27970582 | 22560 | 777.93 Caixas (29kg) | 29348.69 | 29348.69 | SEM_PEDIDO|TINHA_REPASSE | Anexar canhoto/pedido; Refazer repasse produtor se aplicável |
| VP006 | HORTIFRUTI RUBI LTDA | Cenoura (Caixa 2 | — | 27977672 | 20300 | 700.00 Caixas (29kg) | 0.00 | 26390.00 | SEM_PEDIDO|VP_ZERADO|CP_DISPONIVEL | Anexar canhoto/pedido; Conferir valor negociado; Reassociar CP na baixa |
| VP007 | W & A DISTRIBUIDORA DE VERDU | Cenoura (Caixa 2 | — | 27980429 | 19960 | 688.28 Caixas (29kg) | 0.00 | 25948.00 | VP_ZERADO|TINHA_BAIXA_LOJA|TINHA_REPASSE | Conferir valor negociado; Refazer Receber (loja) manualmente; Refazer repasse produtor se aplicável |
| VP008 | BADIN FAVILLA HORTIFRUTI LTD | Cenoura (Caixa 2 | — | 27980432 | 15810 | 545.17 Caixas (29kg) | 20553.00 | 20553.00 | SEM_PEDIDO|TINHA_REPASSE|CP_DISPONIVEL | Anexar canhoto/pedido; Refazer repasse produtor se aplicável; Reassociar CP na baixa |
| VP009 | COMERCIAL DE VERDURAS WD LTD | Cenoura (Caixa 2 | — | 27999696 | 11252 | 388.00 Caixas (29kg) | 0.00 | 17440.60 | SEM_PEDIDO|VP_ZERADO|TINHA_REPASSE | Anexar canhoto/pedido; Conferir valor negociado; Refazer repasse produtor se aplicável |
| VP010 | BADIN FAVILLA HORTIFRUTI LTD | Cenoura (Caixa 2 | — | 27999635 | 15998 | 551.66 Caixas (29kg) | 0.00 | 24796.90 | SEM_PEDIDO|VP_ZERADO | Anexar canhoto/pedido; Conferir valor negociado |
| VP011 | W & A DISTRIBUIDORA DE VERDU | Cenoura (Caixa 2 | — | 27998942 | 19890 | 685.86 Caixas (29kg) | 0.00 | 23868.00 | VP_ZERADO|TINHA_BAIXA_LOJA|TINHA_REPASSE | Conferir valor negociado; Refazer Receber (loja) manualmente; Refazer repasse produtor se aplicável |
| VP012 | MARCELO KATSUMI HARADA | Cenoura (Caixa 2 | — | 28008239 | 28120 | 969.66 Caixas (29kg) | 0.00 | 53146.80 | SEM_PEDIDO|VP_ZERADO|TINHA_BAIXA_LOJA|TINHA_REPASSE | Anexar canhoto/pedido; Conferir valor negociado; Refazer Receber (loja) manualmente; Refazer repasse produtor se aplicável |
| VP013 | HORTIFRUTI RUBI LTDA | Cenoura (Caixa 2 | 09723 | 28003902 | 20240 | 697.93 Caixas (29kg) | 38386.21 | 31372.00 | TINHA_BAIXA_LOJA|CP_DISPONIVEL | Refazer Receber (loja) manualmente; Reassociar CP na baixa |
| VP014 | W & A DISTRIBUIDORA DE VERDU | Cenoura (Caixa 2 | — | 28007928 | 16530 | 570.00 Caixas (29kg) | 31241.70 | 31241.70 | SEM_PEDIDO|TINHA_BAIXA_LOJA|TINHA_REPASSE|CP_DISPONIVEL | Anexar canhoto/pedido; Refazer Receber (loja) manualmente; Refazer repasse produtor se aplicável; Reassociar CP na baixa |
| VP015 | HORTIFRUTI RUBI LTDA | Cenoura (Caixa 2 | — | 28042638 | 22140 | 763.45 Caixas (29kg) | 0.00 | 50149.12 | SEM_PEDIDO|VP_ZERADO | Anexar canhoto/pedido; Conferir valor negociado |
| VP016 | COMERCIAL DE VERDURAS AZEVED | Cenoura (Caixa 2 | — | 28017525 | 18240 | 628.97 Caixas (29kg) | 0.00 | 34473.60 | SEM_PEDIDO|VP_ZERADO|TINHA_BAIXA_LOJA|TINHA_REPASSE | Anexar canhoto/pedido; Conferir valor negociado; Refazer Receber (loja) manualmente; Refazer repasse produtor se aplicável |
| VP017 | W & A DISTRIBUIDORA DE VERDU | Cenoura (Caixa 2 | — | 28017539 | 16720 | 576.55 Caixas (29kg) | 31600.80 | 31600.80 | SEM_PEDIDO|TINHA_BAIXA_LOJA|TINHA_REPASSE | Anexar canhoto/pedido; Refazer Receber (loja) manualmente; Refazer repasse produtor se aplicável |
| VP018 | BADIN FAVILLA HORTIFRUTI LTD | Cenoura (Caixa 2 | — | 28024828 | 16750 | 577.59 Caixas (29kg) | 0.00 | 31657.50 | SEM_PEDIDO|VP_ZERADO | Anexar canhoto/pedido; Conferir valor negociado |
| VP019 | HORTIFRUTI RUBI LTDA | Cenoura (Caixa 2 | — | 28021552 | 15900 | 548.28 Caixas (29kg) | 0.00 | 30051.00 | SEM_PEDIDO|VP_ZERADO | Anexar canhoto/pedido; Conferir valor negociado |
| VP020 | W & A DISTRIBUIDORA DE VERDU | Cenoura (Caixa 2 | — | 28033001 | 19200 | 662.07 Caixas (29kg) | 0.00 | 39552.00 | SEM_PEDIDO|VP_ZERADO | Anexar canhoto/pedido; Conferir valor negociado |
| VP021 | COMERCIAL DE VERDURAS WD LTD | Cenoura (Caixa 2 | — | 28042907 | 10644 | 367.03 Caixas (29kg) | 0.00 | 23842.56 | SEM_PEDIDO|VP_ZERADO | Anexar canhoto/pedido; Conferir valor negociado |
| VP022 | BADIN FAVILLA HORTIFRUTI LTD | Cenoura (Caixa 2 | — | 28042900 | 15135 | 521.90 Caixas (29kg) | 0.00 | 33902.40 | SEM_PEDIDO|VP_ZERADO | Anexar canhoto/pedido; Conferir valor negociado |
| VP023 | W & A DISTRIBUIDORA DE VERDU | Cenoura | 09733 | 28042894 | 18610 | 641.72 Caixas (29kg) | 38503.45 | 38502.00 | — | Conferir na UI e baixar se devido |
| VP024 | HORTIFRUTI RUBI LTDA | Cenoura (Caixa 2 | 09734 | — | 21470 | 740.34 Caixas (29kg) | 48122.41 | 48122.41 | SEM_NF | Anexar NF |
| VP025 | HORTIFRUTI RUBI LTDA | Cenoura (Caixa 2 | — | 28047798 | 19580 | 675.17 Caixas (29kg) | 0.00 | 43859.20 | SEM_PEDIDO|VP_ZERADO | Anexar canhoto/pedido; Conferir valor negociado |
| VP026 | W & A DISTRIBUIDORA DE VERDU | Cenoura (Caixa 2 | — | 28053397 | 18870 | 650.69 Caixas (29kg) | 0.00 | 42268.80 | SEM_PEDIDO|VP_ZERADO | Anexar canhoto/pedido; Conferir valor negociado |
| VP027 | COMERCIAL DE VERDURAS AZEVED | Cenoura (Caixa 2 | — | 28053399 | 20540 | 708.28 Caixas (29kg) | 0.00 | 46009.60 | SEM_PEDIDO|VP_ZERADO|TINHA_BAIXA_LOJA|TINHA_REPASSE | Anexar canhoto/pedido; Conferir valor negociado; Refazer Receber (loja) manualmente; Refazer repasse produtor se aplicável |
| VP028 | MARCELO KATSUMI HARADA | Cenoura (Caixa 2 | — | 28058820 | 19740 | 680.69 Caixas (29kg) | 0.00 | 44217.60 | SEM_PEDIDO|VP_ZERADO|TINHA_BAIXA_LOJA|TINHA_REPASSE | Anexar canhoto/pedido; Conferir valor negociado; Refazer Receber (loja) manualmente; Refazer repasse produtor se aplicável |
| VP029 | HORTIFRUTI RUBI LTDA | Cenoura (Caixa 2 | — | 28059766 | 22220 | 766.21 Caixas (29kg) | 0.00 | 49772.80 | SEM_PEDIDO|VP_ZERADO | Anexar canhoto/pedido; Conferir valor negociado |
| VP030 | HORTIFRUTI RUBI LTDA | Cenoura (Caixa 2 | — | 28067709 | 15120 | 521.38 Caixas (29kg) | 0.00 | 36439.20 | SEM_PEDIDO|VP_ZERADO | Anexar canhoto/pedido; Conferir valor negociado |
| VP031 | W & A DISTRIBUIDORA DE VERDU | Cenoura (Caixa 2 | — | 28069150 | 18680 | 644.14 Caixas (29kg) | 0.00 | 41843.20 | SEM_PEDIDO|VP_ZERADO | Anexar canhoto/pedido; Conferir valor negociado |
| VP032 | HORT BOM ALIMENTOS LTDA | Cenoura (Caixa 2 | — | 28069166 | 21100 | 727.59 Caixas (29kg) | 0.00 | 47264.00 | SEM_PEDIDO|VP_ZERADO|TINHA_BAIXA_LOJA|TINHA_REPASSE | Anexar canhoto/pedido; Conferir valor negociado; Refazer Receber (loja) manualmente; Refazer repasse produtor se aplicável |
| VP033 | W & A DISTRIBUIDORA DE VERDU | Cenoura (Caixa 2 | 09743 | — | 19190 | 661.72 Caixas (29kg) | 43012.07 | 42965.00 | SEM_NF | Anexar NF |
| VP034 | W & A DISTRIBUIDORA DE VERDU | Cenoura (Caixa 2 | 09744 | — | 8970 | 309.31 Caixas (29kg) | 18558.62 | 18558.62 | SEM_NF | Anexar NF |
| VP036 | DDM DISTRIBUIDORA LTDA | Batata Especial | 09764 | 342576452 | 22500 | 900.00 Sacas (25kg) | 62000.00 | 68000.00 | — | Conferir na UI e baixar se devido |
| VP037 | CEREALISTA HANG LTDA | Cebola | 09747 | 28130423 | 43760 | 43760.00 Granel (kg) | 87520.00 | 87520.00 | TINHA_REPASSE | Refazer repasse produtor se aplicável |
| VP038 | CEREALISTA HANG LTDA | Cebola | 09753 | 28177603 | 36090 | 36090.00 Granel (kg) | 73984.50 | 68571.00 | — | Conferir na UI e baixar se devido |
| VP039 | CEREALISTA HANG LTDA | Cebola | 09749 | 28142125 | 28180 | 28180.00 Granel (kg) | 56360.00 | 56360.00 | — | Conferir na UI e baixar se devido |
| VP040 | CEREALISTA HANG LTDA | Cebola | 09751 | 28177601 | 29340 | 29340.00 Granel (kg) | 58680.00 | 55746.00 | — | Conferir na UI e baixar se devido |
| VP041 | CEREALISTA HANG LTDA | Cebola | 09752 | 28187433 | 42200 | 42200.00 Granel (kg) | 84400.00 | 84400.00 | TINHA_REPASSE | Refazer repasse produtor se aplicável |
| VP042 | ORTAGGI AGRONEGOCIOS LTDA | Batata Especial | 09765 | 825999757 | 20000 | 800.00 Sacas (25kg) | 56000.00 | 60000.00 | — | Conferir na UI e baixar se devido |
| VP043 | HM HORTIFRUTIGRANJEIROS LTDA | Batata Especial | 09766 | 442227526 | 16000 | 640.00 Sacas (25kg) | 45000.00 | 45111.31 | TINHA_BAIXA_LOJA | Refazer Receber (loja) manualmente |
| VP044 | DDM DISTRIBUIDORA LTDA | Batata Especial | 09767 | 106289394 | 22500 | 900.00 Sacas (25kg) | 55800.00 | 55800.00 | — | Conferir na UI e baixar se devido |
| VP045 | NATURAL DA TERRA AGRO COMERC | Batata Especial | 09771 | 687134693 | 20000 | 800.00 Sacas (25kg) | 64000.00 | 64000.00 | — | Conferir na UI e baixar se devido |
| VP046 | ADF - COMERCIAL DE HORTIGRAN | Cebola | 09769 | 28214677 | 13720 | 13720.00 Granel (kg) | 41160.00 | 41160.00 | — | Conferir na UI e baixar se devido |
| VP047 | ADF - COMERCIAL DE HORTIGRAN | Cebola | 09770 | 28217644 | 19820 | 19820.00 Granel (kg) | 59460.00 | 59460.00 | — | Conferir na UI e baixar se devido |
| VP048 | AGROFANHO HORTIFRUTI LTDA | Cebola | 09756 | 28187656 | 30020 | 30020.00 Granel (kg) | 58539.00 | 57038.00 | — | Conferir na UI e baixar se devido |
| VP049 | TREVO X COMERCIO DE PRODUTOS | Batata Especial | 09772 | 403674663 | 20000 | 800.00 Sacas (25kg) | 30000.00 | 30000.00 | — | Conferir na UI e baixar se devido |

## Anexos por VP (origem → destino no JSON limpo)

### VP001
- Romaneio: `09711` | NF arquivo: `VP001 - NF-27957662.pdf` | Pedido: `VP001 - Pedido-09711.jpeg`
- Antes: paid=27543.6 / prodPaid=27543.6 / method=TED/DOC
- (anexo) `VP001 - 09711-18062026.jpeg` → `VP001 - Pedido-09711.jpeg`

### VP002
- Romaneio: `—` | NF arquivo: `VP002 - NF-27957664.pdf` | Pedido: `—`
- Antes: paid=0 / prodPaid=0 / method=PIX
- Sem arquivos no pacote para este VP

### VP003
- Romaneio: `09713` | NF arquivo: `VP003 - NF-27957569.pdf` | Pedido: `VP003 - Pedido-09713.jpeg`
- Antes: paid=25070.5 / prodPaid=26910 / method=PIX
- (anexo) `VP003 - 09713-18072026.jpeg` → `VP003 - Pedido-09713.jpeg`
- (CP disponivel) `VP003 - CP.pdf` → `VP003 - CP-disponivel-CP.pdf`

### VP004
- Romaneio: `—` | NF arquivo: `VP004 - NF-27967571.pdf` | Pedido: `—`
- Antes: paid=23660 / prodPaid=23660 / method=PIX
- Sem arquivos no pacote para este VP

### VP005
- Romaneio: `—` | NF arquivo: `VP005 - NF-27970582.pdf` | Pedido: `—`
- Antes: paid=0 / prodPaid=29348.69 / method=PIX
- Sem arquivos no pacote para este VP

### VP006
- Romaneio: `—` | NF arquivo: `VP006 - NF-27977672.pdf` | Pedido: `—`
- Antes: paid=0 / prodPaid=0 / method=—
- (CP disponivel) `VP006 - CP-Rubi.jpeg` → `VP006 - CP-disponivel-CP-Rubi.jpeg`

### VP007
- Romaneio: `—` | NF arquivo: `VP007 - NF-27980429.pdf` | Pedido: `VP007 - Pedido-pedido.pdf`
- Antes: paid=25948 / prodPaid=25948 / method=PIX
- (anexo) `VP007 - 1788283177276.pdf` → `VP007 - NF-27980429.pdf`

### VP008
- Romaneio: `—` | NF arquivo: `VP008 - NF-27980432.pdf` | Pedido: `—`
- Antes: paid=0 / prodPaid=14296.32 / method=PIX
- (CP disponivel) `VP008 - SICOOB_2026_18_09_10_07_32_PIX-CP.pdf` → `VP008 - CP-disponivel-SICOOB_2026_18_09_10_07_32_PIX-CP.pdf`

### VP009
- Romaneio: `—` | NF arquivo: `VP009 - NF-27999696.pdf` | Pedido: `—`
- Antes: paid=0 / prodPaid=501 / method=PIX
- Sem arquivos no pacote para este VP

### VP010
- Romaneio: `—` | NF arquivo: `VP010 - NF-27999635.pdf` | Pedido: `—`
- Antes: paid=0 / prodPaid=0 / method=—
- Sem arquivos no pacote para este VP

### VP011
- Romaneio: `—` | NF arquivo: `VP011 - NF-27998942.pdf` | Pedido: `VP011 - Pedido-pedido.pdf`
- Antes: paid=23868 / prodPaid=23868 / method=PIX
- (anexo) `VP011 - 1788432527970.pdf` → `VP011 - NF-27998942.pdf`

### VP012
- Romaneio: `—` | NF arquivo: `VP012 - NF-28008239.pdf` | Pedido: `—`
- Antes: paid=53146.8 / prodPaid=53146.8 / method=PIX
- Sem arquivos no pacote para este VP

### VP013
- Romaneio: `09723` | NF arquivo: `VP013 - NF-28003902.pdf` | Pedido: `VP013 - Pedido-09723.jpeg`
- Antes: paid=32580.15 / prodPaid=0 / method=TED/DOC
- (anexo) `VP013 - 09723-27072026.jpeg` → `VP013 - Pedido-09723.jpeg`
- (anexo) `VP013 - 28003902_-_RUBI_-_LANCADA.pdf` → `VP013 - NF-28003902.pdf`
- (CP disponivel) `VP013 - CP-Thais.jpeg` → `VP013 - CP-disponivel-CP-Thais.jpeg`

### VP014
- Romaneio: `—` | NF arquivo: `VP014 - NF-28007928.pdf` | Pedido: `—`
- Antes: paid=31241.7 / prodPaid=31241.7 / method=PIX
- (CP disponivel) `VP014 - CP-Pagamento.pdf` → `VP014 - CP-disponivel-CP-Pagamento.pdf`

### VP015
- Romaneio: `—` | NF arquivo: `VP015 - NF-28042638.pdf` | Pedido: `—`
- Antes: paid=0 / prodPaid=0 / method=—
- Sem arquivos no pacote para este VP

### VP016
- Romaneio: `—` | NF arquivo: `VP016 - NF-28017525.pdf` | Pedido: `—`
- Antes: paid=34473.6 / prodPaid=34473.6 / method=PIX
- Sem arquivos no pacote para este VP

### VP017
- Romaneio: `—` | NF arquivo: `VP017 - NF-28017539.pdf` | Pedido: `—`
- Antes: paid=31600.8 / prodPaid=31600.8 / method=PIX
- (anexo) `VP017 - 1789722382443-CP.pdf` → `VP017 - NF-28017539.pdf`

### VP018
- Romaneio: `—` | NF arquivo: `VP018 - NF-28024828.pdf` | Pedido: `—`
- Antes: paid=0 / prodPaid=0 / method=—
- Sem arquivos no pacote para este VP

### VP019
- Romaneio: `—` | NF arquivo: `VP019 - NF-28021552.pdf` | Pedido: `—`
- Antes: paid=0 / prodPaid=0 / method=—
- Sem arquivos no pacote para este VP

### VP020
- Romaneio: `—` | NF arquivo: `VP020 - NF-28033001.pdf` | Pedido: `—`
- Antes: paid=0 / prodPaid=0 / method=TED/DOC
- Sem arquivos no pacote para este VP

### VP021
- Romaneio: `—` | NF arquivo: `VP021 - NF-28042907.pdf` | Pedido: `—`
- Antes: paid=0 / prodPaid=0 / method=—
- Sem arquivos no pacote para este VP

### VP022
- Romaneio: `—` | NF arquivo: `VP022 - NF-28042900.pdf` | Pedido: `—`
- Antes: paid=0 / prodPaid=0 / method=—
- Sem arquivos no pacote para este VP

### VP023
- Romaneio: `09733` | NF arquivo: `VP023 - NF-28042894.pdf` | Pedido: `VP023 - Pedido-09733.jpeg`
- Antes: paid=0 / prodPaid=0 / method=—
- (anexo) `VP023 - 09733-01082026.jpeg` → `VP023 - Pedido-09733.jpeg`
- (anexo) `VP023 - 28042894_-_SAMUEL_-_LANCADA.pdf` → `VP023 - NF-28042894.pdf`

### VP024
- Romaneio: `09734` | NF arquivo: `—` | Pedido: `VP024 - Pedido-09734.jpeg`
- Antes: paid=0 / prodPaid=0 / method=—
- (anexo) `VP024 - 09734-01082026.jpeg` → `VP024 - Pedido-09734.jpeg`

### VP025
- Romaneio: `—` | NF arquivo: `VP025 - NF-28047798.pdf` | Pedido: `—`
- Antes: paid=0 / prodPaid=0 / method=—
- Sem arquivos no pacote para este VP

### VP026
- Romaneio: `—` | NF arquivo: `VP026 - NF-28053397.pdf` | Pedido: `—`
- Antes: paid=0 / prodPaid=0 / method=—
- Sem arquivos no pacote para este VP

### VP027
- Romaneio: `—` | NF arquivo: `VP027 - NF-28053399.pdf` | Pedido: `—`
- Antes: paid=46009.6 / prodPaid=46009.6 / method=PIX
- Sem arquivos no pacote para este VP

### VP028
- Romaneio: `—` | NF arquivo: `VP028 - NF-28058820.pdf` | Pedido: `—`
- Antes: paid=44217.6 / prodPaid=44217.6 / method=PIX
- Sem arquivos no pacote para este VP

### VP029
- Romaneio: `—` | NF arquivo: `VP029 - NF-28059766.pdf` | Pedido: `—`
- Antes: paid=0 / prodPaid=0 / method=—
- Sem arquivos no pacote para este VP

### VP030
- Romaneio: `—` | NF arquivo: `VP030 - NF-28067709.pdf` | Pedido: `—`
- Antes: paid=0 / prodPaid=0 / method=—
- Sem arquivos no pacote para este VP

### VP031
- Romaneio: `—` | NF arquivo: `VP031 - NF-28069150.pdf` | Pedido: `—`
- Antes: paid=0 / prodPaid=0 / method=—
- Sem arquivos no pacote para este VP

### VP032
- Romaneio: `—` | NF arquivo: `VP032 - NF-28069166.pdf` | Pedido: `—`
- Antes: paid=47264 / prodPaid=47264 / method=PIX
- Sem arquivos no pacote para este VP

### VP033
- Romaneio: `09743` | NF arquivo: `—` | Pedido: `VP033 - Pedido-09743.jpeg`
- Antes: paid=0 / prodPaid=0 / method=—
- (anexo) `VP033 - 09743-06082026.jpeg` → `VP033 - Pedido-09743.jpeg`

### VP034
- Romaneio: `09744` | NF arquivo: `—` | Pedido: `VP034 - Pedido-09744.jpeg`
- Antes: paid=0 / prodPaid=0 / method=—
- (anexo) `VP034 - 09744-06082026.jpeg` → `VP034 - Pedido-09744.jpeg`

### VP036
- Romaneio: `09764` | NF arquivo: `VP036 - NF-342576452.pdf` | Pedido: `VP036 - Pedido-09764.jpeg`
- Antes: paid=0 / prodPaid=0 / method=—
- (anexo) `VP036 - 09764-30082026.jpeg` → `VP036 - Pedido-09764.jpeg`
- (anexo) `VP036 - NFA-053.020.492CARLAOTROCA DE NOTA 30-08.pdf` → `VP036 - NF-342576452.pdf`

### VP037
- Romaneio: `09747` | NF arquivo: `VP037 - NF-28130423.pdf` | Pedido: `VP037 - Pedido-09747.jpeg`
- Antes: paid=0 / prodPaid=76238.08 / method=PIX
- (anexo) `VP037 - 09747-15082026.jpeg` → `VP037 - Pedido-09747.jpeg`
- (anexo) `VP037 - 28130423 - HANG.pdf` → `VP037 - NF-28130423.pdf`

### VP038
- Romaneio: `09753` | NF arquivo: `VP038 - NF-28177603.pdf` | Pedido: `VP038 - Pedido-09753.jpeg`
- Antes: paid=0 / prodPaid=0 / method=—
- (anexo) `VP038 - 09753-22082026.jpeg` → `VP038 - Pedido-09753.jpeg`
- (anexo) `VP038 - 28177603 - HANG.pdf` → `VP038 - NF-28177603.pdf`

### VP039
- Romaneio: `09749` | NF arquivo: `VP039 - NF-28142125.pdf` | Pedido: `VP039 - Pedido-09749.jpeg`
- Antes: paid=0 / prodPaid=0 / method=PIX
- (anexo) `VP039 - 09749-15082026.jpeg` → `VP039 - Pedido-09749.jpeg`
- (anexo) `VP039 - 28142125 - HANG.pdf` → `VP039 - NF-28142125.pdf`

### VP040
- Romaneio: `09751` | NF arquivo: `VP040 - NF-28177601.pdf` | Pedido: `VP040 - Pedido-09751.jpeg`
- Antes: paid=0 / prodPaid=0 / method=—
- (anexo) `VP040 - 09751-21082026.jpeg` → `VP040 - Pedido-09751.jpeg`
- (anexo) `VP040 - 28177601 - HANG.pdf` → `VP040 - NF-28177601.pdf`

### VP041
- Romaneio: `09752` | NF arquivo: `VP041 - NF-28187433.pdf` | Pedido: `VP041 - Pedido-09752.jpeg`
- Antes: paid=0 / prodPaid=84400 / method=PIX
- (anexo) `VP041 - 09752-21082026.jpeg` → `VP041 - Pedido-09752.jpeg`
- (anexo) `VP041 - 28187433  - HANG.pdf` → `VP041 - NF-28187433.pdf`

### VP042
- Romaneio: `09765` | NF arquivo: `VP042 - NF-825999757.pdf` | Pedido: `VP042 - Pedido-09765.jpeg`
- Antes: paid=0 / prodPaid=0 / method=—
- (anexo) `VP042 - 09765-30082026.jpeg` → `VP042 - Pedido-09765.jpeg`
- (anexo) `VP042 - NFA-053.020.514CARLAO STA JULIANA AGORA.pdf` → `VP042 - NF-825999757.pdf`

### VP043
- Romaneio: `09766` | NF arquivo: `VP043 - NF-442227526.pdf` | Pedido: `VP043 - Pedido-09766.jpeg`
- Antes: paid=49600 / prodPaid=0 / method=—
- (anexo) `VP043 - 09766-30082026.jpeg` → `VP043 - Pedido-09766.jpeg`
- (anexo) `VP043 - NFA-053.020.619CARLAOHM HORTI640SCS.pdf` → `VP043 - NF-442227526.pdf`

### VP044
- Romaneio: `09767` | NF arquivo: `VP044 - NF-106289394.pdf` | Pedido: `VP044 - Pedido-09767.jpeg`
- Antes: paid=0 / prodPaid=0 / method=—
- (anexo) `VP044 - 09767-31082026.jpeg` → `VP044 - Pedido-09767.jpeg`
- (anexo) `VP044 - NFA-053.039.298CONTAGEMHJ31-08.pdf` → `VP044 - NF-106289394.pdf`

### VP045
- Romaneio: `09771` | NF arquivo: `VP045 - NF-687134693.pdf` | Pedido: `VP045 - Pedido-09771.jpeg`
- Antes: paid=0 / prodPaid=0 / method=—
- (anexo) `VP045 - 09771-01092026.jpeg` → `VP045 - Pedido-09771.jpeg`
- (anexo) `VP045 - NFA-053.055.416 -Natural da Terra.pdf` → `VP045 - NF-687134693.pdf`

### VP046
- Romaneio: `09769` | NF arquivo: `VP046 - NF-28214677.pdf` | Pedido: `VP046 - Pedido-09769.jpeg`
- Antes: paid=0 / prodPaid=0 / method=—
- (anexo) `VP046 - 09769-28082026.jpeg` → `VP046 - Pedido-09769.jpeg`
- (anexo) `VP046 - 28214677 - ADF.pdf` → `VP046 - NF-28214677.pdf`

### VP047
- Romaneio: `09770` | NF arquivo: `VP047 - NF-28217644.pdf` | Pedido: `VP047 - Pedido-09770.jpeg`
- Antes: paid=0 / prodPaid=0 / method=—
- (anexo) `VP047 - 09770-28082026.jpeg` → `VP047 - Pedido-09770.jpeg`
- (anexo) `VP047 - 28217644 - adf.pdf` → `VP047 - NF-28217644.pdf`

### VP048
- Romaneio: `09756` | NF arquivo: `VP048 - NF-28187656.pdf` | Pedido: `VP048 - Pedido-09756.jpeg`
- Antes: paid=0 / prodPaid=0 / method=—
- (anexo) `VP048 - 09756-24082026.jpeg` → `VP048 - Pedido-09756.jpeg`
- (anexo) `VP048 - 28187656 - FANHO.pdf` → `VP048 - NF-28187656.pdf`

### VP049
- Romaneio: `09772` | NF arquivo: `VP049 - NF-403674663.pdf` | Pedido: `VP049 - Pedido-09772.jpeg`
- Antes: paid=0 / prodPaid=0 / method=—
- (anexo) `VP049 - 09772-02092026.jpeg` → `VP049 - Pedido-09772.jpeg`
- (anexo) `VP049 - NFA-053.072.963CARLAO TREVO RIO DE JANEIRO.pdf` → `VP049 - NF-403674663.pdf`

## Arquivos órfãos (reassociar manualmente se necessário)

- `CP-HANG.jpeg`
- `CP-Thais.jpeg`
- `CP-Pagamento.pdf`
- `THAIS-CP-CHEQUE.pdf`
- `CP-Rubi.jpeg`
- `WhatsApp_Image_2026-09-22_at_13.54.50.jpeg`

## VPs que tinham baixa (refazer na tela Contas e Fluxos)

- **VP001** — pago antes R$ 27543.60 (TED/DOC)
- **VP003** — pago antes R$ 25070.50 (PIX)
- **VP004** — pago antes R$ 23660.00 (PIX)
- **VP007** — pago antes R$ 25948.00 (PIX)
- **VP011** — pago antes R$ 23868.00 (PIX)
- **VP012** — pago antes R$ 53146.80 (PIX)
- **VP013** — pago antes R$ 32580.15 (TED/DOC)
- **VP014** — pago antes R$ 31241.70 (PIX)
- **VP016** — pago antes R$ 34473.60 (PIX)
- **VP017** — pago antes R$ 31600.80 (PIX)
- **VP027** — pago antes R$ 46009.60 (PIX)
- **VP028** — pago antes R$ 44217.60 (PIX)
- **VP032** — pago antes R$ 47264.00 (PIX)
- **VP043** — pago antes R$ 49600.00 (sem método)
