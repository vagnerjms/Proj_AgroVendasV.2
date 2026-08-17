# AgroVenda V2 - Sistema de Gestão e Vendas Agrícolas (Docker + MongoDB)

Sistema completo para comercialização e gestão agrícola desenvolvido com base na identidade visual e fluxo operacional apresentados nos modelos, utilizando **MongoDB em container Docker** para persistência dos dados.

---

## 🚀 Funcionalidades Principais

### 1. 📊 Dashboard Gerencial Completo (Fiel à Imagem 1)
- Filtro por período de datas (*Data Inicial* e *Data Final*).
- **Indicadores de Desempenho (KPIs)**:
  - *Vendas do Período* (contagem de operações)
  - *Total Vendido (KPI)* com indicador percentual
  - *Total a Receber* (ex: R$ 1.139.246,39)
  - *Total a Pagar*
  - *Lucratividade Bruta* com meta atingida
- **Cards de Alerta**:
  - *Vencidos* (R$ 0,00)
  - *Notas Pendentes* (alerta de faturamento)
  - *Divergentes* (divergências de peso/romaneio)
- **Gráfico dos Últimos 7 Dias** e **Tabela das Últimas 5 Transações**.

### 2. 🌾 Módulo de Nova Venda (Fiel à Imagem 2)
- Título dinâmico de acordo com a operação selecionada.
- **Os 4 Tipos de Operação Agrícola**:
  1. `Revenda Padrão (Compra e Venda)`
  2. `Intermediação (Corretagem / Comissão)`
  3. `Venda Particular / Repasse Direto`
  4. `Venda de Estoque Próprio`
- Seleção de Cliente com busca rápida.
- Origem, Cidade de Destino e UF de Destino.
- Observações com anexo de **NF (PDF/XML)**.
- Pedido/Comanda como evidência documental.
- **Cálculo em Tempo Real no Resumo Financeiro**:
  - Total de volumes (ex: Sacas / Bags / Toneladas)
  - Total em kg (conversão automática)
  - Total da Operação (R$)
  - Total Comissão (Porcentagem %, Valor fixo por saca ou Valor fixo total)
  - **Detalhamento Completo do FUNRURAL (Total 1,63%)**:
    - Previdência Social (1,30%)
    - RAT (0,10%)
    - SENAR (0,23%)
- Botão **Confirmar venda** gravando diretamente no MongoDB.

---

## 🐳 Arquitetura Docker & MongoDB

O sistema está estruturado em múltiplos containers orquestrados com Docker Compose:

| Serviço | Imagem / Descrição | Porta |
| :--- | :--- | :--- |
| **`app`** | AgroVenda V2 (Frontend React + Backend Node.js API) | `3000` |
| **`mongodb`** | MongoDB 7.0 Oficial com persistência em volume | `27017` |
| **`mongo-express`**| Painel Web para visualização das coleções do MongoDB | `8081` |

---

## 🛠️ Como Iniciar o Sistema

1. Abra o terminal na pasta do projeto:
```bash
cd "c:\Users\vagnermoraes\Desktop\Agrovenda V2"
```

2. Suba todos os containers (App + MongoDB + Mongo-Express):
```bash
docker compose up -d --build
```

3. Acesse os serviços no navegador:
- 🌾 **Aplicação AgroVenda V2**: [http://localhost:3000](http://localhost:3000)
- 🗄️ **Painel do Banco MongoDB**: [http://localhost:8081](http://localhost:8081)

---

## 🛑 Como Parar os Containers

```bash
docker compose down
```
