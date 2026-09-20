const path = require('path');
const fs = require('fs');
const { 
  Sale, 
  Client, 
  Product, 
  Purchase, 
  WeighingSlip, 
  FinancialSummary, 
  User 
} = require('../models');
const { recalibrateCounters } = require('./sequence.service');
const { uploadDir } = require('../middlewares/upload');

/**
 * Coleta estatísticas consolidadas de contagem de registros e tamanho em disco dos anexos
 */
async function getBackupStats() {
  const [salesCount, clientsCount, productsCount, purchasesCount, slipsCount] = await Promise.all([
    Sale.countDocuments(),
    Client.countDocuments(),
    Product.countDocuments(),
    Purchase ? Purchase.countDocuments() : 0,
    WeighingSlip.countDocuments()
  ]);

  let totalUploadsSize = 0;
  let filesCount = 0;
  let diskFiles = [];
  if (fs.existsSync(uploadDir)) {
    diskFiles = await fs.promises.readdir(uploadDir);
    filesCount = diskFiles.length;
    for (const f of diskFiles) {
      try {
        const stat = await fs.promises.stat(path.join(uploadDir, f));
        totalUploadsSize += stat.size;
      } catch (e) {}
    }
  }

  const salesWithFiles = await Sale.find({
    $or: [
      { nfFile: { $exists: true, $ne: null, $ne: '' } },
      { evidenceFile: { $exists: true, $ne: null, $ne: '' } },
      { paymentProofFile: { $exists: true, $ne: null, $ne: '' } }
    ]
  }, { id: 1, client: 1, nfFile: 1, evidenceFile: 1, paymentProofFile: 1 }).lean();

  return {
    salesCount,
    clientsCount,
    productsCount,
    purchasesCount,
    slipsCount,
    filesCount,
    totalUploadsSizeBytes: totalUploadsSize,
    totalUploadsSizeMB: (totalUploadsSize / (1024 * 1024)).toFixed(2),
    diskFiles,
    salesWithFiles
  };
}

/**
 * Gera o pacote completo de backup com banco de dados estruturado e anexos físicos em base64
 */
async function generateBackupPackage() {
  const [sales, clients, products, purchases, weighingSlips, financialSummaries, users] = await Promise.all([
    Sale.find().lean(),
    Client.find().lean(),
    Product.find().lean(),
    Purchase ? Purchase.find().lean() : [],
    WeighingSlip.find().lean(),
    FinancialSummary ? FinancialSummary.find().lean() : [],
    User.find({}, { password: 0 }).lean() // Sanitiza senhas no export
  ]);

  const files = [];
  if (fs.existsSync(uploadDir)) {
    const diskFiles = await fs.promises.readdir(uploadDir);
    const addedDiskFiles = new Set();

    const MAX_SINGLE_FILE_BYTES = 25 * 1024 * 1024;
    let currentTotalBytes = 0;
    const MAX_TOTAL_BACKUP_BYTES = 200 * 1024 * 1024;

    for (const s of sales) {
      const targets = [s.nfFile, s.evidenceFile, s.paymentProofFile].filter(Boolean);
      for (const target of targets) {
        const diskMatch = diskFiles.find(df => 
          df === target || 
          df.endsWith(target) || 
          (target.includes('.') && df.includes(target))
        );

        if (diskMatch && !addedDiskFiles.has(diskMatch)) {
          try {
            const filePath = path.join(uploadDir, diskMatch);
            const stat = await fs.promises.stat(filePath);
            if (stat.isFile() && stat.size > 0 && stat.size <= MAX_SINGLE_FILE_BYTES && (currentTotalBytes + stat.size) <= MAX_TOTAL_BACKUP_BYTES) {
              const dataBuffer = await fs.promises.readFile(filePath);
              let cleanFileName = diskMatch.replace(/^\d+-\d+-/, '');
              let driveFileName = cleanFileName;
              if (!driveFileName.toUpperCase().startsWith(s.id.toUpperCase())) {
                driveFileName = `${s.id} - ${cleanFileName}`;
              }

              files.push({
                filename: driveFileName,
                saleId: s.id,
                sizeBytes: stat.size,
                contentBase64: dataBuffer.toString('base64')
              });
              currentTotalBytes += stat.size;
              addedDiskFiles.add(diskMatch);
            }
          } catch (e) {}
        }
      }
    }

    // Exportar arquivos adicionais do disco (tickets de pesagem e outros anexos)
    for (const df of diskFiles) {
      if (!addedDiskFiles.has(df) && (currentTotalBytes <= MAX_TOTAL_BACKUP_BYTES)) {
        try {
          const filePath = path.join(uploadDir, df);
          const stat = await fs.promises.stat(filePath);
          if (stat.isFile() && stat.size > 0 && stat.size <= MAX_SINGLE_FILE_BYTES && (currentTotalBytes + stat.size) <= MAX_TOTAL_BACKUP_BYTES) {
            const dataBuffer = await fs.promises.readFile(filePath);
            let cleanFileName = df.replace(/^\d+-\d+-/, '');
            files.push({
              filename: cleanFileName,
              saleId: '',
              sizeBytes: stat.size,
              contentBase64: dataBuffer.toString('base64')
            });
            currentTotalBytes += stat.size;
            addedDiskFiles.add(df);
          }
        } catch (e) {}
      }
    }
  }

  return {
    system: 'AgroVenda V2',
    version: '2.0.0',
    exportedAt: new Date().toISOString(),
    stats: {
      salesCount: sales.length,
      clientsCount: clients.length,
      productsCount: products.length,
      purchasesCount: purchases.length,
      weighingSlipsCount: weighingSlips.length,
      usersCount: users.length,
      filesCount: files.length
    },
    database: {
      sales,
      clients,
      products,
      purchases,
      weighingSlips,
      financialSummaries,
      users
    },
    files
  };
}

/**
 * Restaura o banco de dados e os arquivos físicos a partir do pacote de backup
 */
async function restoreBackup(backupData) {
  let database = null;
  let files = [];

  if (backupData && backupData.database && typeof backupData.database === 'object') {
    database = backupData.database;
    files = backupData.files || [];
  } else if (backupData && (backupData.sales || backupData.clients || backupData.products || backupData.weighingSlips)) {
    database = backupData;
    files = backupData.files || [];
  } else if (Array.isArray(backupData)) {
    database = { sales: backupData };
  }

  if (!database) {
    const err = new Error('Formato de arquivo de backup inválido.');
    err.statusCode = 400;
    throw err;
  }

  const { sales, clients, products, purchases, weighingSlips, financialSummaries } = database;

  if (Array.isArray(sales)) {
    await Sale.deleteMany({});
    if (sales.length > 0) await Sale.insertMany(sales);
  }

  if (Array.isArray(clients)) {
    await Client.deleteMany({});
    if (clients.length > 0) await Client.insertMany(clients);
  }

  if (Array.isArray(products)) {
    await Product.deleteMany({});
    if (products.length > 0) await Product.insertMany(products);
  }

  if (Array.isArray(purchases) && Purchase) {
    await Purchase.deleteMany({});
    if (purchases.length > 0) await Purchase.insertMany(purchases);
  }

  if (Array.isArray(weighingSlips)) {
    await WeighingSlip.deleteMany({});
    if (weighingSlips.length > 0) await WeighingSlip.insertMany(weighingSlips);
  }

  if (Array.isArray(financialSummaries) && FinancialSummary) {
    await FinancialSummary.deleteMany({});
    if (financialSummaries.length > 0) await FinancialSummary.insertMany(financialSummaries);
  }

  let restoredFilesCount = 0;
  if (Array.isArray(files)) {
    if (!fs.existsSync(uploadDir)) {
      await fs.promises.mkdir(uploadDir, { recursive: true });
    }
    for (const f of files) {
      try {
        if (f.filename && f.contentBase64) {
          const targetPath = path.join(uploadDir, f.filename);
          const buffer = Buffer.from(f.contentBase64, 'base64');
          await fs.promises.writeFile(targetPath, buffer);
          restoredFilesCount++;
        }
      } catch (e) {}
    }
  }

  await recalibrateCounters();

  return {
    success: true,
    message: 'Base de dados e arquivos restaurados com sucesso!',
    restoredStats: {
      sales: sales?.length || 0,
      clients: clients?.length || 0,
      products: products?.length || 0,
      purchases: purchases?.length || 0,
      slips: weighingSlips?.length || 0,
      files: restoredFilesCount
    }
  };
}

module.exports = {
  getBackupStats,
  generateBackupPackage,
  restoreBackup
};
