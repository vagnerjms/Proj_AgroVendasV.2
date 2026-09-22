const { Sale, WeighingSlip } = require('../db');
const { roundMoney } = require('../utils/money');

// Cache em memória para evitar queries repetitivas em múltiplos usuários/polling
let cachedNotifications = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 30 * 1000; // 30 segundos

/**
 * Normaliza qualquer formato de data para objeto Date seguro
 */
function parseSafeDate(dStr) {
  if (!dStr || typeof dStr !== 'string') return null;
  const trimmed = dStr.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return new Date(trimmed + 'T12:00:00Z');
  }
  if (/^\d{2}\/\d{2}\/\d{4}/.test(trimmed)) {
    const [d, m, y] = trimmed.split('/');
    return new Date(`${y}-${m}-${d}T12:00:00Z`);
  }
  const parsed = new Date(trimmed);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Calcula a diferença em dias entre duas datas
 */
function getDaysDiff(pastDate, todayDate = new Date()) {
  if (!pastDate) return 0;
  const ms = todayDate.getTime() - pastDate.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

/**
 * Formata moeda para exibição clara no alerta
 */
function formatMoeda(val) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val) || 0);
}

/**
 * Executa a auditoria completa de processos, repasses, notas e romaneios
 */
async function generateNotifications(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cachedNotifications && (now - lastCacheTime < CACHE_TTL_MS)) {
    return cachedNotifications;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Busca todas as vendas e romaneios em paralelo
  const [sales, weighingSlips] = await Promise.all([
    Sale.find().sort({ saleDate: -1 }).lean(),
    WeighingSlip.find().lean()
  ]);

  // Mapa de romaneios por saleId para checagem rápida
  const slipMap = new Map();
  for (const slip of weighingSlips) {
    if (slip.saleId) {
      if (!slipMap.has(slip.saleId)) slipMap.set(slip.saleId, []);
      slipMap.get(slip.saleId).push(slip);
    }
  }

  const notifications = [];

  for (const s of sales) {
    const saleId = s.id || 'Sem ID';
    const clientName = s.client || 'Cliente não informado';
    const produtorName = s.origin || 'Produtor não informado';
    const saleDate = parseSafeDate(s.saleDate);
    const dueDate = parseSafeDate(s.dueDate);
    const totalOp = roundMoney(s.totalOperation || 0);
    const valorVP = roundMoney(Number(s.valorTotalVP) > 0 ? s.valorTotalVP : totalOp);
    const funrural = roundMoney(s.funruralTotal || 0);
    const liquidoProdutor = roundMoney(Math.max(0, valorVP - funrural));
    const paidClient = roundMoney(s.paidAmount || 0);
    const isClientPaid = s.paymentStatus === 'Recebido' || (totalOp > 0 && paidClient >= totalOp);
    const isProducerPaid = s.producerPaymentStatus === 'Pago';

    // -------------------------------------------------------------
    // 1. REPASSE AO PRODUTOR PENDENTE COM LOJA JÁ QUITADA (CRÍTICO)
    // -------------------------------------------------------------
    if (isClientPaid && !isProducerPaid) {
      notifications.push({
        id: `notif-repasse-pendente-${s._id}`,
        category: 'financeiro',
        type: 'PRODUCER_PAYOUT_PENDING',
        severity: 'critical',
        title: `Repasse Pendente: ${saleId}`,
        description: `A loja ${clientName} já quitou esta venda, mas o repasse líquido de ${formatMoeda(liquidoProdutor)} ao produtor (${produtorName}) continua como 'A Pagar'.`,
        entityType: 'sale',
        entityId: saleId,
        date: s.saleDate,
        amount: liquidoProdutor,
        targetTab: 'produtores',
        targetPage: 'alerts',
        actionLabel: 'Realizar Repasse'
      });
    }

    // -------------------------------------------------------------
    // 2. INADIMPLÊNCIA DA LOJA / TÍTULO VENCIDO (CRÍTICO / ALERTA)
    // -------------------------------------------------------------
    if (!isClientPaid && dueDate && dueDate < today) {
      const daysOverdue = getDaysDiff(dueDate, today);
      const saldoDevedor = roundMoney(Math.max(0, totalOp - paidClient));
      if (saldoDevedor > 0) {
        notifications.push({
          id: `notif-inadimplencia-${s._id}`,
          category: 'financeiro',
          type: 'CLIENT_PAYMENT_OVERDUE',
          severity: daysOverdue > 5 ? 'critical' : 'warning',
          title: `Recebível Vencido: ${saleId} (${daysOverdue} dias)`,
          description: `Venda para ${clientName} venceu em ${s.dueDate}. Saldo pendente: ${formatMoeda(saldoDevedor)}.`,
          entityType: 'sale',
          entityId: saleId,
          date: s.dueDate,
          amount: saldoDevedor,
          targetTab: 'lojas',
          targetPage: 'alerts',
          actionLabel: 'Cobrar / Baixar'
        });
      }
    }

    // -------------------------------------------------------------
    // 3. FALTA DE COMPROVANTE BANCÁRIO APÓS BAIXA
    // -------------------------------------------------------------
    if (isClientPaid && (!s.paymentProofFile || s.paymentProofFile.trim() === '')) {
      notifications.push({
        id: `notif-sem-comprovante-loja-${s._id}`,
        category: 'financeiro',
        type: 'MISSING_CLIENT_PROOF',
        severity: 'warning',
        title: `Sem Comprovante da Loja: ${saleId}`,
        description: `Venda ${saleId} (${clientName}) foi marcada como quitada, mas não possui anexo de comprovante de pagamento.`,
        entityType: 'sale',
        entityId: saleId,
        date: s.saleDate,
        targetPage: 'sales-history',
        actionLabel: 'Anexar Comprovante'
      });
    }

    if (isProducerPaid && (!s.producerPaymentProofFile || s.producerPaymentProofFile.trim() === '')) {
      notifications.push({
        id: `notif-sem-comprovante-produtor-${s._id}`,
        category: 'financeiro',
        type: 'MISSING_PRODUCER_PROOF',
        severity: 'warning',
        title: `Sem Comprovante de Repasse: ${saleId}`,
        description: `Repasse ao produtor da venda ${saleId} foi marcado como pago, mas não possui comprovante PIX/Transferência anexado.`,
        entityType: 'sale',
        entityId: saleId,
        date: s.saleDate,
        targetPage: 'alerts',
        targetTab: 'produtores',
        actionLabel: 'Anexar Repasse'
      });
    }

    // -------------------------------------------------------------
    // 4. PENDÊNCIA FISCAL (DANFE / NF-e PENDENTE)
    // -------------------------------------------------------------
    const hasNf = s.nfFile && typeof s.nfFile === 'string' && s.nfFile.trim() !== '';
    const hasNfeKey = s.nfeKey && typeof s.nfeKey === 'string' && s.nfeKey.trim().length >= 10;
    const daysSinceSale = saleDate ? getDaysDiff(saleDate, today) : 0;

    if (!hasNf && (s.status === 'Pendente NF' || daysSinceSale >= 2)) {
      notifications.push({
        id: `notif-nf-pendente-${s._id}`,
        category: 'fiscal',
        type: 'PENDING_NF',
        severity: daysSinceSale >= 5 ? 'critical' : 'warning',
        title: `NF-e Não Anexada: ${saleId}`,
        description: `Venda para ${clientName} emitida há ${daysSinceSale} dias e ainda aguarda o anexo do DANFE/XML da NF-e.`,
        entityType: 'sale',
        entityId: saleId,
        date: s.saleDate,
        targetPage: 'sales-history',
        actionLabel: 'Anexar NF'
      });
    } else if (hasNf && !hasNfeKey) {
      notifications.push({
        id: `notif-sem-chave-nfe-${s._id}`,
        category: 'fiscal',
        type: 'MISSING_NFE_KEY',
        severity: 'warning',
        title: `Chave SEFAZ Ausente: ${saleId}`,
        description: `Venda ${saleId} possui arquivo de NF, mas a chave de acesso de 44 dígitos da SEFAZ não foi informada.`,
        entityType: 'sale',
        entityId: saleId,
        date: s.saleDate,
        targetPage: 'sales-history',
        actionLabel: 'Editar Venda'
      });
    }

    // -------------------------------------------------------------
    // 5. COTAÇÃO ZERADA EM VENDA FATURADA
    // -------------------------------------------------------------
    const quoteDoc = Number(s.dailyQuote) || 0;
    const quoteItem = Number(s.items?.[0]?.dailyQuote) || 0;
    const isGranelOrBatata = s.items?.[0]?.unit?.includes('Granel') || s.items?.[0]?.product?.toLowerCase().includes('batata');

    if (quoteDoc === 0 && quoteItem === 0 && !isGranelOrBatata && s.status === 'Faturado') {
      notifications.push({
        id: `notif-cotacao-zerada-${s._id}`,
        category: 'fiscal',
        type: 'ZERO_QUOTE',
        severity: 'warning',
        title: `Cotação Zerada: ${saleId}`,
        description: `Venda ${saleId} (${clientName}) faturada sem preenchimento da Cotação do Dia (R$/cx).`,
        entityType: 'sale',
        entityId: saleId,
        date: s.saleDate,
        targetPage: 'sales-history',
        actionLabel: 'Preencher Cotação'
      });
    }

    // -------------------------------------------------------------
    // 6. AUSÊNCIA DE ROMANEIO DE PESAGEM
    // -------------------------------------------------------------
    const slips = slipMap.get(saleId) || [];
    if (slips.length === 0 && s.status === 'Faturado') {
      notifications.push({
        id: `notif-sem-romaneio-${s._id}`,
        category: 'romaneios',
        type: 'MISSING_ROMANEIO',
        severity: 'warning',
        title: `Sem Romaneio Vinculado: ${saleId}`,
        description: `Venda ${saleId} faturada para ${clientName} sem nenhum Romaneio de Balança cadastrado.`,
        entityType: 'sale',
        entityId: saleId,
        date: s.saleDate,
        targetPage: 'weighing-slips',
        actionLabel: 'Lançar Romaneio'
      });
    }
  }

  // -------------------------------------------------------------
  // 7. DIVERGÊNCIAS ATIVAS EM ROMANEIOS
  // -------------------------------------------------------------
  for (const slip of weighingSlips) {
    if (slip.status === 'Divergente') {
      const diffKg = Number(slip.weightDifferenceKg) || 0;
      const diffPct = Number(slip.weightDifferencePct) || 0;
      const tolPct = Number(slip.tolerancePct) || 0.25;

      notifications.push({
        id: `notif-romaneio-divergente-${slip._id}`,
        category: 'romaneios',
        type: 'ROMANEIO_DIVERGENCE',
        severity: 'critical',
        title: `Quebra de Peso: ${slip.id || 'Romaneio'} (${slip.saleId || 'Sem Venda'})`,
        description: `Divergência de balança de ${diffKg.toFixed(2)} kg (${diffPct.toFixed(2)}%), excedendo a tolerância máxima permitida de ${tolPct}%.`,
        entityType: 'weighing',
        entityId: slip.id,
        date: slip.date,
        targetPage: 'weighing-slips',
        actionLabel: 'Conciliar Romaneio'
      });
    }
  }

  // Ordenação por severidade (crítica primeiro) e depois por data mais recente
  notifications.sort((a, b) => {
    if (a.severity === 'critical' && b.severity !== 'critical') return -1;
    if (a.severity !== 'critical' && b.severity === 'critical') return 1;
    return new Date(b.date || 0) - new Date(a.date || 0);
  });

  // Estatísticas agregadas
  const summary = {
    total: notifications.length,
    critical: notifications.filter(n => n.severity === 'critical').length,
    warning: notifications.filter(n => n.severity === 'warning').length,
    byCategory: {
      financeiro: notifications.filter(n => n.category === 'financeiro').length,
      fiscal: notifications.filter(n => n.category === 'fiscal').length,
      romaneios: notifications.filter(n => n.category === 'romaneios').length
    },
    lastUpdated: new Date().toISOString()
  };

  cachedNotifications = {
    summary,
    notifications
  };
  lastCacheTime = now;

  return cachedNotifications;
}

/**
 * Força a invalidação do cache de notificações
 */
function invalidateAuditCache() {
  cachedNotifications = null;
  lastCacheTime = 0;
}

module.exports = {
  generateNotifications,
  invalidateAuditCache
};
