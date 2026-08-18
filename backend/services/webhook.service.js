// Webhook Service for n8n & Google Calendar real-time sync

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'http://179.197.231.106:5678/webhook/agrovenda-sale';

function parseDueDate(sale) {
  if (sale.notes) {
    const match = sale.notes.match(/Vencimento:\s*([^\s|]+)/i);
    if (match && match[1]) {
      const parts = match[1].split('/');
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }
  }
  if (sale.saleDate) {
    const d = new Date(sale.saleDate);
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  }
  return sale.saleDate || new Date().toISOString().split('T')[0];
}

async function sendSaleWebhook(event, sale) {
  try {
    const dueDate = parseDueDate(sale);
    const totalOp = Number(sale.totalOperation) || 0;
    const clientName = sale.client || 'Cliente Geral';

    const payload = {
      event, // 'sale.created', 'sale.updated', 'sale.settled'
      saleId: sale.id,
      client: clientName,
      saleDate: sale.saleDate,
      dueDate: dueDate,
      totalOperation: totalOp,
      totalVolumes: sale.totalVolumes || 0,
      totalKg: sale.totalKg || 0,
      status: sale.status || 'Pendente',
      paymentStatus: sale.paymentStatus || 'A Receber',
      origin: sale.origin || '',
      nfNumber: sale.nfFile ? sale.nfFile.replace('NF-', '').replace('.pdf', '') : (sale.nfeKey ? sale.nfeKey.slice(-8) : 'Pendente'),
      calendar: {
        summary: `💰 ${clientName.split(' ')[0]} · R$ ${totalOp.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} (${sale.id})`,
        start: `${dueDate}T09:00:00-03:00`,
        end: `${dueDate}T10:00:00-03:00`,
        description: `🏪 Comprador: ${clientName}\n💰 Valor Comercial: R$ ${totalOp.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n📦 Volumes: ${sale.totalVolumes || 0} cx\n📄 Nota Fiscal: ${sale.nfFile || 'Pendente'}\n📌 Status: ${sale.status}\n🌱 Origem: ${sale.origin || 'AgroVenda'}`
      }
    };

    // Try sending to n8n webhook
    const targetUrls = [
      N8N_WEBHOOK_URL,
      'http://n8n_application:5678/webhook/agrovenda-sale',
      'http://127.0.0.1:5678/webhook/agrovenda-sale'
    ];

    for (const url of targetUrls) {
      try {
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).catch(() => {});
      } catch (e) {}
    }
  } catch (err) {
    console.warn('[Webhook] Erro ao disparar webhook para n8n:', err.message);
  }
}

module.exports = {
  sendSaleWebhook,
  parseDueDate
};
