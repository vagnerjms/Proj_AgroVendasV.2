# Dicionário de Dados — AgroVenda

Glossário canônico de identificadores e valores usados na UI e no banco.  
**Atualizado:** outubro/2026 · **Versão app:** 2.0.0

| Label UI | Campo / código | Significado |
|----------|----------------|-------------|
| **Nº VP** | `Sale.id` | Identificador único da venda (`VP001`, `VP023`…). Não reutiliza após cancelamento. |
| **Nº Romaneio** | `Sale.romaneioNumber` | Canhoto / planilha (`09733`), 5 dígitos. **Não** é pesagem nem código VP. |
| **Nº NF** | derivado de `nfFile` / `nfeKey` | Só dígitos da nota (ex. `28042894`). Nunca nome de arquivo. |
| **Valor negociado** | `valorTotalVP` | Cotação comercial — base a receber da loja. |
| **Valor NF** | `totalOperation` | Valor faturado na NF — FUNRURAL e repasse ao produtor. |
| **FUNRURAL** | `funruralTotal` (+ breakdown) | 1,63% **só sobre Valor NF**. Tela Apuração FUNRURAL. |
| **Saldo a receber** | Valor negociado − `paidAmount` (− descontos de baixa, se houver) | Ledger loja **sem** FUNRURAL. |
| **Desconto na baixa** | `discountAmount` (parcela / settle) | Desconto manual na liquidação da loja; **não** altera VP/NF gravados na venda. |
| **Comprovante(s)** | `paymentProofFile` / `paymentProofFiles[]` | Um ou vários CPs da mesma VP (ledger multi-CP: `09733-CP01-….pdf`). |
| **Pátio** | `patioSlipId` | Id do canhoto registrado em `/m`, vinculado à venda. |
| **Pesagem** | `WeighingSlip.id` (`PSG-…`) | Romaneio de balança. Separado do canhoto `097xxx`. |
| **Quantidade** | `totalVolumes` / `items.quantity` | Volume comercial; unidade do produto (`Caixas`, `Sacas`, …). |
| **Peso (kg)** | `totalKg` / pesos de balança | Massa em kg. |
| **Pasta Drive** | `driveFolder.suggestedPath` | `AgroVenda/{tenant}/{loja}/{saleId}`. |

## Nomes canônicos de anexo (Drive / pacote)

| Tipo | Padrão |
|------|--------|
| NF | `{romaneio}-NF-{nfDigits}.pdf` |
| Pedido | `{romaneio}-Pedido….jpeg\|pdf` |
| CP | `{romaneio}-CP{nn}-{nf\|disp}.pdf\|jpeg` |

## Regras rápidas

1. **Receber loja** = Valor negociado (cotação), sem FUNRURAL; desconto opcional só na baixa.
2. **Pagar produtor** = Valor NF (quando houver NF).
3. **FUNRURAL** = só na Apuração FUNRURAL, base NF.
4. Romaneio canhoto (`09733`) ≠ VP (`VP023`) ≠ Pesagem (`PSG-001`) ≠ pátio (`patioSlipId`).
5. CPs parciais distintos **não** se sobrescrevem no Drive (dedup só NF/Pedido legados).
6. Colunas de volume = **Quantidade**; colunas de massa = **Peso (kg)**.
