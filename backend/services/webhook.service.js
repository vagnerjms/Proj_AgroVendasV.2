// Webhook Service for n8n, Google Drive & Google Calendar real-time sync
const path = require('path');
const fs = require('fs');
const { uploadDir } = require('../middlewares/upload');
const { roundMoney } = require('../utils/money');
const {
  formatNfNumber,
  resolveRomaneioNumber,
  buildDriveAttachmentName,
  classifySaleAttachment
} = require('../utils/dataHelpers');

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || '';
const APP_BASE_URL = (process.env.APP_BASE_URL || 'http://localhost:3001').replace(/\/+$/, '');

function parseDueDate(sale) {
  if (sale.dueDate) {
    return sale.dueDate;
  }
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
    const d = new Date(sale.saleDate + 'T12:00:00Z');
    if (!isNaN(d.getTime())) {
      const days = Number(sale.paymentTermDays) || 30;
      d.setUTCDate(d.getUTCDate() + days);
      return d.toISOString().split('T')[0];
    }
  }
  return sale.saleDate || new Date().toISOString().split('T')[0];
}

function volumeUnitLabel(sale) {
  const unit = sale.items?.[0]?.unit || sale.unit || '';
  if (unit && String(unit).trim()) return String(unit).trim();
  return 'volumes';
}

async function sendSaleWebhook(event, sale) {
  try {
    const dueDate = parseDueDate(sale);
    const clientName = sale.client || 'Cliente Geral';
    const romaneioNumber = resolveRomaneioNumber(sale) || '';
    const nfNumber = formatNfNumber(sale.nfFile) || formatNfNumber(sale.nfeKey) || '';
    const nfLabel = nfNumber || 'Pendente';
    const paymentStatus = sale.paymentStatus || (Number(sale.paidAmount) > 0 ? 'Parcial' : 'A Receber');
    const status = sale.status || 'Pendente';

    // Prioriza o valor real acordado da VP; caso não haja, utiliza o valor total da NF
    let valorFinal = Number(sale.valorTotalVP) > 0 ? roundMoney(sale.valorTotalVP) : roundMoney(sale.totalOperation);
    if (valorFinal <= 0 && Number(sale.dailyQuote) > 0 && Number(sale.totalVolumes) > 0) {
      valorFinal = roundMoney(Number(sale.totalVolumes) * Number(sale.dailyQuote));
    }

    const volumesNum = Number(sale.totalVolumes) || (Number(sale.totalKg) > 0 ? Number(sale.totalKg) / 29 : 0);
    const volumesDisplay = Number.isFinite(volumesNum)
      ? volumesNum.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
      : '0';
    const volumeUnit = volumeUnitLabel(sale);

    // Formatação de diretórios dinâmicos do Google Drive
    const dateObj = new Date(sale.saleDate ? `${sale.saleDate}T12:00:00Z` : new Date());
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const folderMonth = `${year}-${month}`;

    // Leitura assíncrona não-bloqueante de anexos físicos
    const { resolveUploadFile } = require('../utils/resolveUploadFile');
    const files = [];
    const targets = [sale.nfFile, sale.evidenceFile, sale.paymentProofFile].filter(Boolean);
    try {
      if (fs.existsSync(uploadDir)) {
        const diskFiles = await fs.promises.readdir(uploadDir);
        for (const target of targets) {
          const resolved = resolveUploadFile(target, { dir: uploadDir, diskFiles });
          const diskMatch = resolved?.filename;
          if (diskMatch) {
            try {
              const filePath = resolved.absolutePath;
              const stat = await fs.promises.stat(filePath);
              if (stat.isFile() && stat.size > 0 && stat.size <= 5 * 1024 * 1024) {
                const dataBuffer = await fs.promises.readFile(filePath);
                let cleanFileName = diskMatch.replace(/^\d+-\d+-/, '');
                const kind = classifySaleAttachment(target, sale);
                const ext = path.extname(cleanFileName).toLowerCase() || path.extname(target).toLowerCase() || '.bin';
                const driveFileName = buildDriveAttachmentName(kind, {
                  romaneioNumber,
                  nfNumber: nfNumber || formatNfNumber(target) || formatNfNumber(cleanFileName),
                  ext,
                  originalName: cleanFileName,
                  nfFile: sale.nfFile
                });
                const mimeType = ext === '.pdf' ? 'application/pdf'
                  : (ext === '.xml' ? 'application/xml'
                    : (ext === '.png' ? 'image/png'
                      : (ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'application/octet-stream')));
                files.push({
                  filename: driveFileName,
                  originalName: cleanFileName,
                  kind,
                  mimeType,
                  sizeBytes: stat.size,
                  contentBase64: dataBuffer.toString('base64'),
                  downloadUrl: `${APP_BASE_URL}/uploads/${encodeURIComponent(diskMatch).replace(/%2F/gi, '/')}`
                });
              }
            } catch (eRead) {}
          }
        }
      }
    } catch (eDir) {}

    const dueBr = dueDate.split('-').reverse().join('/');
    const valorBr = valorFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const nfValBr = (Number(sale.totalOperation) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const payload = {
      event, // 'sale.created', 'sale.updated', 'sale.settled', 'sale.manual_sync', 'sale.batch_sync'
      saleId: sale.id,
      client: clientName,
      saleDate: sale.saleDate,
      dueDate: dueDate,
      totalOperation: Number(sale.totalOperation) || 0,
      valorVP: valorFinal,
      totalVolumes: Math.round(volumesNum) || 0,
      totalVolumesExact: volumesNum || 0,
      totalKg: sale.totalKg || 0,
      volumeUnit,
      status,
      paymentStatus,
      origin: sale.origin || '',
      romaneioNumber: romaneioNumber || '',
      nfNumber: nfLabel,
      nfFile: sale.nfFile || '',
      evidenceFile: sale.evidenceFile || '',
      hasFiles: files.length > 0,
      files,
      driveFolder: {
        monthFolder: folderMonth,
        clientFolder: clientName,
        saleId: sale.id,
        suggestedFolder: `${sale.id} - ${clientName} (${folderMonth})`
      },
      calendar: {
        summary: `${clientName.split(' ')[0]} · R$ ${valorFinal.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} (${sale.id}) · ${paymentStatus}`,
        start: `${dueDate}T09:00:00-03:00`,
        end: `${dueDate}T10:00:00-03:00`,
        description: [
          `Comprador: ${clientName}`,
          `VP: ${sale.id}`,
          romaneioNumber ? `Romaneio: ${romaneioNumber}` : null,
          `Vencimento: ${dueBr}`,
          `Valor comercial (VP): R$ ${valorBr}`,
          `Valor NF: R$ ${nfValBr}`,
          `Quantidade: ${volumesDisplay} ${volumeUnit}`,
          `Nº NF: ${nfLabel}`,
          sale.nfFile ? `Arquivo NF: ${sale.nfFile}` : null,
          sale.evidenceFile ? `Pedido/Canhoto: ${sale.evidenceFile}` : null,
          `Status: ${status}`,
          `Pagamento: ${paymentStatus}`,
          `Origem: ${sale.origin || 'AgroVenda'}`
        ].filter(Boolean).join('\n')
      }
    };

    // Execução assíncrona não-bloqueante (fire-and-forget) via setImmediate
    setImmediate(async () => {
      const targetUrls = [
        N8N_WEBHOOK_URL,
        'http://n8n_application:5678/webhook/agrovenda-sale',
        'http://127.0.0.1:5678/webhook/agrovenda-sale'
      ].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);

      let sent = false;
      for (const url of targetUrls) {
        if (sent) break;
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          if (res.ok) {
            sent = true;
          }
        } catch (e) {
          // Fallback to next candidate
        }
      }
    });
  } catch (err) {
    console.warn('[Webhook] Erro ao disparar webhook para n8n:', err.message);
  }
}

module.exports = {
  sendSaleWebhook,
  parseDueDate
};
