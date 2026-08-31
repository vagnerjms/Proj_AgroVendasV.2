# 📑 DOCUMENTAÇÃO TÉCNICA E FUNCIONAL PARA AUDITORIA

**Sistema:** AgroVenda V2  
**Módulo:** Gestão de Pesagem, Romaneios, Precificação Comercial & Comissões  
**Versão:** 2.6.0  
**Data de Emissão:** 31 de Agosto de 2026  
**Status:** Homologado e em Produção  

---

## 1. 🎯 OBJETIVO E ESCOPO DA FUNCIONALIDADE

Esta documentação detalha as regras de negócio, algoritmos de cálculo, fluxo de dados e critérios de auditoria implementados no módulo de **Pesagem de Romaneios e Reconciliação Comercial de Vendas**.

O objetivo primordial é garantir:
1. **Rastreabilidade Ponta a Ponta:** Todo romaneio auditado possui vínculo direto com o faturamento da VP correspondente.
2. **Eliminação de Divergências:** Permite ao operador equalizar o peso da carga elegendo **"Considerar Peso Origem"** ou **"Considerar Peso Destino"**.
3. **Recálculo Automático e Instantâneo:** Ao salvar ou ajustar um romaneio, o sistema recalcula de forma atômica no banco de dados:
   - Peso Líquido da Venda (`totalKg`)
   - Volumes / Caixas / Sacas Equivalentes (`totalVolumes`)
   - Valor Total da Nota Fiscal (`totalOperation`)
   - Dedução Tributária do FUNRURAL (`funruralTotal` a 1,63%)
   - Base Comercial da VP (`valorTotalVP`)
   - Comissão de Intermediação (`totalCommission` a 3%)
   - Valor Líquido a Receber pelo Produtor
4. **Precisão para Commodities Granel e Embaladas:** Reconhecimento dinâmico entre cotações em R$/kg (ex: Cebola a granel) e R$/cx (ex: Cenoura 29kg, Milho 60kg).

---

## 2. 📐 REGRAS DE NEGÓCIO E FÓRMULAS MATEMÁTICAS

### 2.1. Auditoria e Tolerância de Pesagem
- **Tolerância Contratual Padrão:** $\le 0,25\%$ (quebra técnica admitida durante o transporte rodoviário).
- **Fórmula da Quebra:**
  $$\text{Diferença (kg)} = |\text{Peso Origem} - \text{Peso Destino}|$$
  $$\text{Diferença (\%)} = \left(\frac{\text{Diferença (kg)}}{\text{Peso Origem}}\right) \times 100$$
- Se $\text{Diferença (\%)} > 0,25\%$, o status é classificado como **`Divergente`** (destaque visual em laranja).

---

### 2.2. Equalização de Pesos no Romaneio
Ao abrir o modal de **Edição** ou **Tratamento de Divergência**:

| Opção Selecionada | Ação do Sistema em Tempo Real | Resultado no Romaneio |
| :--- | :--- | :--- |
| **🔘 Considerar Peso Origem** | `destWeightKg = originWeightKg` | Pesos igualados à Origem; Quebra = $0\text{ kg} (0\%)$; Status $\rightarrow$ `Ajustado`. |
| **🔘 Considerar Peso Destino** | `originWeightKg = destWeightKg` | Pesos igualados ao Destino; Quebra = $0\text{ kg} (0\%)$; Status $\rightarrow$ `Ajustado`. |

---

### 2.3. Conversão de Volumes / Embalagens por Produto
A conversão de peso bruto para volumes respeita a unidade padrão cadastrada do produto:

| Produto Cadastrado | Unidade Padrão | Divisor de Conversão | Exemplo: Carga de 25.420 kg |
| :--- | :---: | :---: | :---: |
| **Cenoura / Beterraba** | Caixa 29kg | $\text{Peso} / 29$ | **876,55 cx** |
| **Cebola (Granel)** | Granel (kg) | $\text{Peso} / 29$ (cx eq.) | **876,55 cx eq.** |
| **Tomate / Pimentão** | Caixa 20kg | $\text{Peso} / 20$ | **1.271,00 cx** |
| **Alho** | Caixa 10kg | $\text{Peso} / 10$ | **2.542,00 cx** |
| **Batata** | Saca 50kg | $\text{Peso} / 50$ | **508,40 sc** |
| **Milho / Soja / Feijão** | Saca 60kg | $\text{Peso} / 60$ | **423,67 sc** |

---

### 2.4. Precificação Comercial, Tributação e Comissão

#### A) Valor Total da Nota Fiscal (Faturamento Bruto)
$$\text{Valor Total NF} = \text{Peso Total (kg)} \times \text{Preço Unitário da NF (R\$/kg)}$$

#### B) FUNRURAL Retido na Fonte (1,63%)
Calculado com precisão bancária (*Half-Up*):
- Previdência Social: $1,20\%$
- RAT (Riscos Ambientais do Trabalho): $0,10\%$
- SENAR: $0,33\%$
- **Total FUNRURAL:** $1,63\%$ sobre o Valor Total da NF.
$$\text{FUNRURAL} = \text{Valor Total NF} \times 0,0163$$
$$\text{Líquido a Receber} = \text{Valor Total NF} - \text{FUNRURAL}$$

#### C) Valor Total da VP (Base Comercial de Corretagem)
- **Para Cotação em Quilos (Cotação $\le \text{R\$} 10,00/\text{kg}$ ou Granel):**
  $$\text{Valor Total VP} = \text{Peso Total (kg)} \times \text{Cotação (R\$/kg)}$$
  *Exemplo:* $25.420\text{ kg} \times \text{R\$} 2,15/\text{kg} = \mathbf{R\$\ 54.653,00}$
- **Para Cotação em Caixas (Cotação $> \text{R\$} 10,00/\text{cx}$):**
  $$\text{Valor Total VP} = \text{Caixas} \times \text{Cotação (R\$/cx)}$$
  *Exemplo:* $876,55\text{ cx} \times \text{R\$} 45,00/\text{cx} = \mathbf{R\$\ 39.444,75}$

#### D) Comissão AgroVenda (3%)
$$\text{Comissão (3\%)} = \text{Valor Total VP} \times 0,03$$
*Exemplo VP048:* $\text{R\$} 54.653,00 \times 3\% = \mathbf{R\$\ 1.639,59}$

---

## 3. 📂 ARQUITETURA DE CÓDIGO E ARQUIVOS AUDITADOS

```
AgroVenda V2/
├── backend/
│   ├── routes/
│   │   ├── weighings.routes.js   # [PUT /api/weighings/:id] & [PUT /:id/resolve] com syncLinkedSaleWeight
│   │   ├── sales.routes.js       # [GET /api/sales] com normalização dinâmica de volumes e comissões
│   │   └── reports.routes.js     # [POST /api/reports/trigger-n8n] exportação filtrada
│   ├── services/
│   │   └── webhook.service.js    # Disparo de eventos sale.updated e relatórios para n8n
│   └── utils/
│       └── money.js              # roundMoney, calculateFiscalDeductions, calculateCommission
└── frontend/
    └── src/
        ├── pages/
        │   ├── WeighingSlips.jsx # UI interativa com botões de equalização Peso Origem / Peso Destino
        │   ├── SalesHistory.jsx  # Tabela com exibição adaptativa de volumes e comissão sobre VP real
        │   ├── NewSale.jsx       # Formulário com precificação inteligente kg vs caixa
        │   └── Reports.jsx       # Filtros e geração de Base64 para Google Drive
        └── utils/
            └── calculations.js   # calculatePreciseSale e calculateFunrural
```

---

## 4. 🧪 ROTEIRO DE TESTES E PROCEDIMENTOS DE AUDITORIA

### Procedimento 1: Auditoria de Romaneio com Divergência
1. Acessar o menu **Romaneios & Pesagem**.
2. Localizar uma carga com status `Divergente` (ex: Origem `25.420 kg`, Destino `24.980 kg`).
3. Clicar no botão **`Tratar`** ou no ícone de lápis ✏️.
4. Clicar no botão **`Considerar Peso Destino`**:
   - **Resultado Esperado:** O campo de Peso Origem muda imediatamente para `24.980 kg` e a diferença vai para `0 kg`.
5. Clicar no botão **`Ajustar & Salvar`**:
   - **Resultado Esperado:** Mensagem de sucesso confirmando que o romaneio e a venda vinculada foram sincronizados.
6. Acessar o menu **Histórico de Vendas**:
   - **Resultado Esperado:** A venda vinculada exibe exatamente `24.980 kg`, volumes proporcionais e valores recalculados.

### Procedimento 2: Auditoria de Venda a Granel (Cebola - VP048)
- **Dados de Entrada:**
  - Produto: `Cebola - Granel (kg)`
  - Peso: `25.420 kg`
  - Preço NF: `R$ 2,20/kg`
  - Cotação Comercial: `R$ 2,15/kg`
- **Valores Auditados e Homologados:**
  - $\text{Valor Total da NF} = 25.420 \times 2,20 = \mathbf{R\$\ 55.924,00}$
  - $\text{FUNRURAL (1,63\%)} = 55.924,00 \times 0,0163 = \mathbf{R\$\ 911,56}$
  - $\text{Líquido a Receber} = 55.924,00 - 911,56 = \mathbf{R\$\ 55.012,44}$
  - $\text{Valor Total de VP} = 25.420 \times 2,15 = \mathbf{R\$\ 54.653,00}$
  - $\text{Comissão AgroVenda (3\%)} = 54.653,00 \times 0,03 = \mathbf{R\$\ 1.639,59}$
  - $\text{Volumes Equivalentes} = 25.420 / 29 = \mathbf{876,55\text{ cx eq. (29kg)}}$

---

## 5. 🔒 CRITÉRIOS DE CONFORMIDADE E SEGURANÇA

1. **Autenticação:** Todas as rotas de pesagem e vendas exigem token JWT ativo.
2. **Imutabilidade e Auditoria:** Toda alteração de romaneio insere uma tag de histórico no campo `notes` da venda (`[Pesagem: Peso Destino (25.420 kg - 877 cx)]`).
3. **Backup e Sincronia n8n:** Webhook automático `sale.updated` mantém os backups e eventos da agenda Google 100% atualizados.

---
*Documento aprovado pela equipe de engenharia e pronto para fins de auditoria interna e conformidade fiscal.*
