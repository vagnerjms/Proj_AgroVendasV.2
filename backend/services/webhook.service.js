// Webhook Service for n8n, Google Drive & Google Calendar real-time sync
const path = require('path');
const fs = require('fs');
const { uploadDir } = require('../middlewares/upload');

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
    const clientName = sale.client || 'Cliente Geral';

    const caixas = sale.totalVolumes || (sale.totalKg > 0 ? (sale.totalKg / 29) : 0);
    let cotacao = 45.0;
    if (sale.notes) {
      const matchCot = sale.notes.match(/Cotação:?\s*R\$\s*([\d,.]+)/i);
      if (matchCot) cotacao = parseFloat(matchCot[1].replace(',', '.'));
    }
    const valorVP = caixas * cotacao;
    const valorFinal = valorVP > 0 ? valorVP : (Number(sale.totalOperation) || 0);
    const volumesInt = Math.round(caixas);

    // Dynamic folder names for Google Drive organization
    const dateObj = new Date(sale.saleDate || new Date());
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const folderMonth = `${year}-${month}`; // ex: "2026-08"

    // Search and attach actual files from disk for Google Drive upload
    const files = [];
    const targets = [sale.nfFile, sale.evidenceFile].filter(Boolean);
    if (fs.existsSync(uploadDir)) {
      const diskFiles = fs.readdirSync(uploadDir);
      for (const target of targets) {
        const diskMatch = diskFiles.find(df => 
          df === target || 
          df.endsWith(target) || 
          (target.includes('.') && df.includes(target))
        );
        if (diskMatch) {
          try {
            const filePath = path.join(uploadDir, diskMatch);
            const stat = fs.statSync(filePath);
            if (stat.isFile() && stat.size > 0 && stat.size <= 25 * 1024 * 1024) {
              const dataBuffer = fs.readFileSync(filePath);
              let cleanFileName = diskMatch.replace(/^\d+-\d+-/, '');
              let driveFileName = cleanFileName;
              if (!driveFileName.toUpperCase().startsWith(sale.id.toUpperCase())) {
                driveFileName = `${sale.id} - ${cleanFileName}`;
              }
              const ext = path.extname(cleanFileName).toLowerCase();
              const mimeType = ext === '.pdf' ? 'application/pdf' :
                               (ext === '.xml' ? 'application/xml' :
                               (ext === '.png' ? 'image/png' :
                               (ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'application/octet-stream')));
              files.push({
                filename: driveFileName,
                originalName: cleanFileName,
                mimeType,
                sizeBytes: stat.size,
                contentBase64: dataBuffer.toString('base64'),
                downloadUrl: `https://agrovendas.cloud/uploads/${diskMatch}`
              });
            }
          } catch (e) {}
        }
      }
    }

    const payload = {
      event, // 'sale.created', 'sale.updated', 'sale.settled', 'sale.manual_sync', 'sale.batch_sync'
      saleId: sale.id,
      client: clientName,
      saleDate: sale.saleDate,
      dueDate: dueDate,
      totalOperation: Number(sale.totalOperation) || 0,
      valorVP: valorFinal,
      totalVolumes: volumesInt,
      totalKg: sale.totalKg || 0,
      status: sale.status || 'Pendente',
      paymentStatus: sale.paymentStatus || 'A Receber',
      origin: sale.origin || '',
      nfNumber: sale.nfFile ? sale.nfFile.replace('NF-', '').replace('.pdf', '') : (sale.nfeKey ? sale.nfeKey.slice(-8) : 'Pendente'),
      hasFiles: files.length > 0,
      files: files,
      driveFolder: {
        monthFolder: folderMonth,
        clientFolder: clientName,
        saleId: sale.id,
        suggestedFolder: `${sale.id} - ${clientName} (${folderMonth})`
      },
      calendar: {
        summary: `💰 ${clientName.split(' ')[0]} · R$ ${valorFinal.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} (${sale.id})`,
        start: `${dueDate}T09:00:00-03:00`,
        end: `${dueDate}T10:00:00-03:00`,
        description: `🏪 Comprador: ${clientName}\n📅 Vencimento: ${dueDate.split('-').reverse().join('/')}\n💰 Valor a Receber: R$ ${valorFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n📦 Volumes: ${volumesInt} cx\n📄 Nota Fiscal: ${sale.nfFile || 'Pendente'}\n📌 Status: ${sale.status}\n🌱 Origem: ${sale.origin || 'AgroVenda'}`
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
