# 🌾 AgroVenda V2 — Especificação de Arquitetura, Serviços e Contratos de API

> **Versão da Arquitetura:** 2.2.0 (Service-Layer Decoupled & Modular Frontend)  
> **Status:** Homologada e Auditada  
> **Data:** Setembro / 2026  

---

## 📑 Índice
1. [Visão Geral e Diretrizes Arquiteturais](#1-visão-geral-e-diretrizes-arquiteturais)
2. [Estrutura de Camadas (Layered Architecture)](#2-estrutura-de-camadas-layered-architecture)
3. [Catálogo dos Serviços Especializados (Backend Services)](#3-catálogo-dos-serviços-especializados-backend-services)
4. [Especificação Completa dos Contratos de API (REST)](#4-especificação-completa-dos-contratos-de-api-rest)
5. [Arquitetura e Modularização do Frontend](#5-arquitetura-e-modularização-do-frontend)
6. [Regras Fiscais e Conciliação Contábil Oficial](#6-regras-fiscais-e-conciliação-contábil-oficial)
7. [Checklist Final de Conformidade Arquitetural](#7-checklist-final-de-conformidade-arquitetural)

---

## 1. Visão Geral e Diretrizes Arquiteturais

O **AgroVenda V2** é uma plataforma corporativa web voltada à comercialização, logística de pesagem, conciliação fiscal e liquidação financeira no agronegócio de hortifrúti.

### Pilares da Arquitetura Refatorada:
1. **Desacoplamento por Serviços (Service Layer):** Os arquivos de rotas do Express atuam estritamente como *thin controllers*, responsáveis apenas pela recepção de parâmetros HTTP, autenticação e despacho da resposta. Toda a lógica de negócio reside na camada `/services`.
2. **Centralização Fiscal e Contábil:** As regras de retenção de FUNRURAL, apuração de cotações VP e saldos parciais/totais são centralizadas em utilitários e serviços únicos, eliminando divergências entre telas.
3. **Integridade Referencial e Proteção de Dados:** Bloqueio de deleção de parceiros comerciais (produtores rurais e clientes) que possuam vendas ou romaneios vinculados, e blindagem do agendador de limpeza de uploads contra perda de comprovantes de pagamento.
4. **Segurança Uniforme:** 100% das rotas privadas e de upload são protegidas por tokens JWT, e todas as chamadas do frontend passam por um cliente HTTP centralizado ([`frontend/src/services/api.js`](file:///c:/Users/user/Desktop/Proj_AgroVendasV.2-main/frontend/src/services/api.js)).
5. **Portabilidade de Infraestrutura:** Eliminação de endereços de IP e domínios fixos no código; uso exclusivo de variáveis de ambiente (`APP_BASE_URL`, `N8N_WEBHOOK_URL`, `MONGO_URI`, `JWT_SECRET`).

---

## 2. Estrutura de Camadas (Layered Architecture)

```mermaid
graph TD
    subgraph Frontend [Frontend SPA - React 18 / Vite]
        Pages[Páginas: NewSale, SalesHistory, AgendaAlerts...]
        UIComp[Componentes Modulares: SaleFiscalSummary, Modais, AgendaTables...]
        ApiClient[HTTP Client Centralizado: api.js]
        Pages --> UIComp
        Pages --> ApiClient
        UIComp --> ApiClient
    end

    ApiClient -->|JWT Bearer Token / JSON / FormData| ExpressRoutes[Express Routes: backend/routes/*.routes.js]

    subgraph Backend [Backend API - Node.js / Express]
        AuthMW[Middleware: requireAuth JWT]
        ExpressRoutes --> AuthMW
        
        subgraph ServiceLayer [Camada de Serviços: backend/services/]
            SaleService[sale.service.js]
            FinancialService[financial.service.js]
            DashboardService[dashboard.service.js]
            WebhookService[webhook.service.js]
            CleanupService[cleanup.service.js]
            BackupService[backup.service.js]
        end

        AuthMW --> ServiceLayer

        subgraph DataAccess [Acesso a Dados & Utilitários]
            MongooseModels[(Mongoose Models: Sale, WeighingSlip, Client...)]
            MoneyUtils[utils/money.js & security.js]
            DiskStorage[/uploads/ - Arquivos Físicos]
        end

        ServiceLayer --> MongooseModels
        ServiceLayer --> MoneyUtils
        ServiceLayer --> DiskStorage
    end

    subgraph Integrations [Serviços Externos & Automação]
        N8NWebhook[n8n Automation Engine]
        GDrive[Google Drive]
        GCalendar[Google Calendar]
        ServiceLayer -->|HTTP POST Assíncrono| N8NWebhook
        N8NWebhook --> GDrive
        N8NWebhook --> GCalendar
    end
```

---

## 3. Catálogo dos Serviços Especializados (Backend Services)

| Serviço | Arquivo | Responsabilidades Principais |
| :--- | :--- | :--- |
| **Financial Service** | [`backend/services/financial.service.js`](file:///c:/Users/user/Desktop/Proj_AgroVendasV.2-main/backend/services/financial.service.js) | Consolidação em tempo real de recebíveis de clientes, apuração de contas a pagar a produtores, decomposição fiscal do FUNRURAL (Previdência 1,20%, RAT 0,10%, SENAR 0,33%), títulos vencidos e conciliação de liquidações parciais. |
| **Dashboard Service** | [`backend/services/dashboard.service.js`](file:///c:/Users/user/Desktop/Proj_AgroVendasV.2-main/backend/services/dashboard.service.js) | Agregação de KPIs comerciais, faturamento comercial VP, apuração de inadimplência (vencidos em aberto), detecção de notas pendentes e divergências de peso, transações recentes e gráfico de 7 dias. |
| **Sale Service** | [`backend/services/sale.service.js`](file:///c:/Users/user/Desktop/Proj_AgroVendasV.2-main/backend/services/sale.service.js) | Criação de vendas com sequenciamento atômico `VP00X`, auto-criação de romaneios vinculados, padronização de status de faturamento (`normalizeSaleNfStatus`), geração de eventos de agenda (`getAgendaEvents`), liquidação de recebimentos de clientes e repasses a produtores, e recálculo bidirecional de vendas por pesagem (`syncSaleWeightFromSlip`). |
| **Webhook Service** | [`backend/services/webhook.service.js`](file:///c:/Users/user/Desktop/Proj_AgroVendasV.2-main/backend/services/webhook.service.js) | Disparo assíncrono para o n8n com payload estruturado contendo anexos codificados em Base64, diretórios dinâmicos do Google Drive e eventos de cobrança para o Google Calendar, utilizando `APP_BASE_URL` configurável. |
| **Cleanup Service** | [`backend/services/cleanup.service.js`](file:///c:/Users/user/Desktop/Proj_AgroVendasV.2-main/backend/services/cleanup.service.js) | Agendador periódico de limpeza de uploads temporários que preserva notas fiscais, fotos de carga, comprovantes de recebimento e de repasses ao produtor (`producerPaymentProofFile`, `paymentHistory` e `producerPaymentHistory`). |
| **Backup Service** | [`backend/services/backup.service.js`](file:///c:/Users/user/Desktop/Proj_AgroVendasV.2-main/backend/services/backup.service.js) | Exportação de snapshots completos do banco em JSON/ZIP e restauração com validação de schemas. |

---

## 4. Especificação Completa dos Contratos de API (REST)

Todas as requisições autenticadas exigem o cabeçalho:
```http
Authorization: Bearer <JWT_TOKEN>
```

### 4.1. Módulo Financeiro (`/api/financial`)

#### `GET /api/financial`
Retorna a consolidação financeira e fiscal do período filtrado.
* **Query Parameters (Opcionais):**
  - `startDate` (String, formato `YYYY-MM-DD`): Data inicial da operação.
  - `endDate` (String, formato `YYYY-MM-DD`): Data final da operação.
  - `client` (String): Nome ou razão social do comprador.
  - `status` (String): `A Receber`, `Parcial`, `Recebido`.
* **Resposta de Sucesso (200 OK):**
```json
{
  "totalAReceber": 124500.00,
  "totalALiquidar": 124500.00,
  "totalAReceberVP": 124500.00,
  "totalComercialVP": 124500.00,
  "totalAReceberNF": 126563.50,
  "totalFaturadoNF": 126563.50,
  "liquidoNF": 124499.95,
  "totalAPagar": 35200.00,
  "totalRecebido": 89400.00,
  "vencidos": 15400.00,
  "totalFunrural": 2063.50,
  "totalPrevidencia": 1518.76,
  "totalRat": 126.56,
  "totalSenar": 417.66,
  "totalComissao": 3735.00,
  "totalLiquidoProdutor": 120765.00,
  "salesCount": 42
}
```

---

### 4.2. Módulo Dashboard (`/api/dashboard`)

#### `GET /api/dashboard`
Retorna as métricas e alertas da visão executiva.
* **Query Parameters (Opcionais):** `startDate`, `endDate`.
* **Resposta de Sucesso (200 OK):**
```json
{
  "period": { "startDate": "2026-09-01", "endDate": "2026-09-30" },
  "kpis": {
    "salesCount": 38,
    "totalSold": 450200.00,
    "totalSoldGrowth": "+0%",
    "totalAReceber": 115000.00,
    "totalAPagar": 28000.00,
    "grossProfit": 13506.00,
    "targetReached": true
  },
  "alerts": {
    "vencidos": 12000.00,
    "notasPendentes": 3,
    "divergentes": 1
  },
  "lastTransactions": [
    {
      "id": "VP042",
      "date": "20/09/2026",
      "rawDate": "2026-09-20",
      "module": "Venda",
      "type": "Intermediação (Corretagem / Comissão)",
      "client": "SUPERMERCADO CENTRAL LTDA",
      "value": 15400.00
    }
  ],
  "performanceDays": [
    { "date": "2026-09-20", "label": "20/09", "total": 28500.00, "count": 2 }
  ]
}
```

---

### 4.3. Módulo de Vendas (`/api/sales`)

#### `GET /api/sales`
Lista vendas cadastradas com paginação e busca inteligente.
* **Query Parameters:**
  - `page` (Inteiro, padrão: `1`)
  - `limit` (Inteiro, padrão: `50`, máximo: `500`)
  - `search` (String): Busca textual em ID, cliente, motorista, notas e produtor.
  - `status` (String): `Faturado`, `Pendente NF`, `all`.
  - `operationType` (String).
* **Headers de Resposta:** `X-Total-Count: <total_registros>`.

#### `GET /api/sales/agenda-events`
Retorna cobranças formatadas para integração com o Google Calendar / n8n.

#### `POST /api/sales/:id/settle-producer`
Registra liquidação total ou parcial de repasse ao Produtor Rural.
* **Corpo da Requisição (JSON):**
```json
{
  "amount": 15000.00,
  "paymentMethod": "PIX",
  "producerPaymentProofFile": "COMPROVANTE-PIX-12345.pdf",
  "notes": "Repasse referente à safra de cebola",
  "checkNumber": "",
  "checkBank": "",
  "checkDueDate": ""
}
```

#### `POST /api/sales/:id/unsettle-producer`
Reverte o repasse ao produtor rural (retornando o status financeiro do produtor para `A Pagar`).

---

### 4.4. Módulo de Pesagem & Romaneios (`/api/weighings`)

#### `PUT /api/weighings/:id/resolve`
Resolve uma divergência de pesagem entre balança de origem e destino, atualizando e recalculando a venda vinculada via `saleService.syncSaleWeightFromSlip`.
* **Corpo da Requisição (JSON):**
```json
{
  "action": "Ajustado",
  "resolutionNotes": "Divergência tratada considerando Peso Destino (14.200 kg)",
  "weightChoice": "dest"
}
```
* **Resposta de Sucesso (200 OK):**
```json
{
  "success": true,
  "slip": { "id": "ROM-VP042", "status": "Ajustado", "netWeightKg": 14200 },
  "saleUpdated": true,
  "saleId": "VP042"
}
```

---

## 5. Arquitetura e Modularização do Frontend

O frontend é construído em React 18 como Single Page Application (SPA), padronizado sobre os seguintes componentes modulares:

### 🧩 Componentes do Domínio de Vendas (`components/sales/`)
* **[`SaleFiscalSummary.jsx`](file:///c:/Users/user/Desktop/Proj_AgroVendasV.2-main/frontend/src/components/sales/SaleFiscalSummary.jsx):** Painel de resumo financeiro em tempo real com decomposição detalhada do FUNRURAL e cotação VP.
* **[`SaleItemsTable.jsx`](file:///c:/Users/user/Desktop/Proj_AgroVendasV.2-main/frontend/src/components/sales/SaleItemsTable.jsx):** Tabela dinâmica com suporte a múltiplos produtos por venda, cálculo por peso unitário de caixa (29kg cenoura / 25kg batata / 1kg granel) e valor da NF.
* **[`SaleDetailModal.jsx`](file:///c:/Users/user/Desktop/Proj_AgroVendasV.2-main/frontend/src/components/sales/SaleDetailModal.jsx):** Modal de rastreio com demonstrativo de liquidação, links diretos para documentos anexados e histórico completo de pagamentos.
* **[`SaleEditModal.jsx`](file:///c:/Users/user/Desktop/Proj_AgroVendasV.2-main/frontend/src/components/sales/SaleEditModal.jsx):** Edição ágil de dados operacionais sem necessidade de reabrir o formulário complexo de pesagens.
* **[`SettleModal.jsx`](file:///c:/Users/user/Desktop/Proj_AgroVendasV.2-main/frontend/src/components/sales/SettleModal.jsx):** Modal universal para quitação total e liquidações parciais com suporte a PIX, Cheque ou TED/DOC e upload direto de comprovantes.
* **[`QuickClientModal.jsx`](file:///c:/Users/user/Desktop/Proj_AgroVendasV.2-main/frontend/src/components/sales/QuickClientModal.jsx) & [`QuickProducerModal.jsx`](file:///c:/Users/user/Desktop/Proj_AgroVendasV.2-main/frontend/src/components/sales/QuickProducerModal.jsx):** Cadastro ágil de parceiros comerciais identificados automaticamente pelo parser de XML da NF-e.

### 📅 Componentes do Domínio de Agenda (`components/agenda/`)
* **[`AgendaKpiCards.jsx`](file:///c:/Users/user/Desktop/Proj_AgroVendasV.2-main/frontend/src/components/agenda/AgendaKpiCards.jsx):** Cards de indicadores segregados por aba.
* **[`AgendaLojasTable.jsx`](file:///c:/Users/user/Desktop/Proj_AgroVendasV.2-main/frontend/src/components/agenda/AgendaLojasTable.jsx):** Controle de Contas a Receber de compradores.
* **[`AgendaProdutoresTable.jsx`](file:///c:/Users/user/Desktop/Proj_AgroVendasV.2-main/frontend/src/components/agenda/AgendaProdutoresTable.jsx):** Controle de Contas a Pagar / Repasses a produtores rurais.

---

## 6. Regras Fiscais e Conciliação Contábil Oficial

### 🏛️ Tabela Oficial de Retenções do FUNRURAL (1,63%)
Aplicada sobre o valor total faturado da Nota Fiscal (NF):

$$\text{FUNRURAL Total} = \text{Valor Total NF} \times 1,63\%$$

| Tributo Componente | Alíquota Oficial | Código / Base Legal |
| :--- | :---: | :--- |
| **Previdência Social (INSS Rural)** | **1,20%** | Lei nº 8.212/1991, Art. 25, I |
| **RAT / GILRAT (Risco Ambiental do Trabalho)** | **0,10%** | Lei nº 8.212/1991, Art. 25, II |
| **SENAR (Serviço Nacional de Aprendizagem Rural)** | **0,33%** | Lei nº 9.528/1997 |
| **Total Consolidado da Retenção** | **1,63%** | Alíquota cheia retida na fonte |

### 💰 Conciliação de Venda Comercial (VP) vs. Nota Fiscal
- **Base Comercial da Venda:** O valor efetivo negociado (`valorTotalVP`) reflete o preço real acordado com o comprador (cotação do dia × volumes/peso).
- **Valor Líquido Oficial a Receber:**
  $$\text{Valor Líquido a Receber} = \max(0, \text{Valor Total Comercial (VP)} - \text{FUNRURAL Total})$$
- **Comissão AgroVenda (Padrão 3,0%):**
  $$\text{Comissão} = \text{Valor Total Comercial (VP)} \times 3,0\%$$
- **Valor Líquido a Repassar ao Produtor:**
  $$\text{Líquido Produtor} = \text{Valor Total NF} - \text{FUNRURAL Total} - \text{Comissão AgroVenda}$$

---

## 7. Checklist Final de Conformidade Arquitetural

| Item de Auditoria | Critério de Validação | Status |
| :--- | :--- | :---: |
| **Camada de Serviços Isolada** | Rotas não contêm manipulações diretas de schemas Mongoose ou cálculos de comissão inline. | ✅ Aprovado |
| **Segurança nas Rotas de Arquivos** | `/api/upload`, `/api/nfe/parse` e `/api/upload/cleanup` exigem token JWT. | ✅ Aprovado |
| **Integridade de Produtores** | Tentativas de deletar produtor com vendas vinculadas em `Sale.origin` retornam `400 Bad Request`. | ✅ Aprovado |
| **Preservação de Comprovantes** | O agendador de limpeza protege `producerPaymentProofFile`, `paymentHistory` e `producerPaymentHistory`. | ✅ Aprovado |
| **Cliente HTTP Centralizado** | Nenhuma página do frontend utiliza chamadas nativas `fetch` avulsas sem autenticação. | ✅ Aprovado |
| **Alíquotas Fiscais Sincronizadas** | Frontend e Backend utilizam exatamente 1,20% Previdência, 0,10% RAT e 0,33% SENAR (1,63% Total). | ✅ Aprovado |
| **Desacoplamento de Romaneios** | Atualizações de peso no romaneio delegam sincronização para `saleService.syncSaleWeightFromSlip`. | ✅ Aprovado |
| **Infraestrutura Sem IPs Hardcoded** | Webhooks utilizam variáveis de ambiente `APP_BASE_URL` e `N8N_WEBHOOK_URL` com fallbacks seguros. | ✅ Aprovado |
| **Modularidade do Frontend** | Megacomponentes divididos em componentes focados (< 600 linhas cada), garantindo legibilidade e manutenção. | ✅ Aprovado |

---
*Documento de arquitetura aprovado e homologado para a governança contínua do AgroVenda V2.*
