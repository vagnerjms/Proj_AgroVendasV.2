const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { Sale, Client, Product, Purchase, WeighingSlip, FinancialSummary, User, recalibrateCounters } = require('../db');
const { upload, uploadDir } = require('../middlewares/upload');

// GET /api/backup/stats
router.get('/stats', async (req, res) => {
  try {
    const salesCount = await Sale.countDocuments();
    const clientsCount = await Client.countDocuments();
    const productsCount = await Product.countDocuments();
    const purchasesCount = await Purchase.countDocuments();
    const slipsCount = await WeighingSlip.countDocuments();

    let totalUploadsSize = 0;
    let filesCount = 0;
    if (fs.existsSync(uploadDir)) {
      const files = fs.readdirSync(uploadDir);
      filesCount = files.length;
      files.forEach(f => {
        const stat = fs.statSync(path.join(uploadDir, f));
        totalUploadsSize += stat.size;
      });
    }

    res.json({
      salesCount,
      clientsCount,
      productsCount,
      purchasesCount,
      slipsCount,
      filesCount,
      totalUploadsSizeBytes: totalUploadsSize,
      totalUploadsSizeMB: (totalUploadsSize / (1024 * 1024)).toFixed(2)
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao obter estatísticas de backup' });
  }
});

// GET /api/backup/export
router.get('/export', async (req, res) => {
  try {
    const [sales, clients, products, purchases, weighingSlips, financialSummaries, users] = await Promise.all([
      Sale.find().lean(),
      Client.find().lean(),
      Product.find().lean(),
      Purchase.find().lean(),
      WeighingSlip.find().lean(),
      FinancialSummary.find().lean(),
      User.find().lean()
    ]);

    const files = [];
    if (fs.existsSync(uploadDir)) {
      const diskFiles = fs.readdirSync(uploadDir);
      const addedDiskFiles = new Set();

      for (const s of sales) {
        const targets = [s.nfFile, s.evidenceFile].filter(Boolean);
        for (const target of targets) {
          // Localizar arquivo no disco por correspondência exata, sufixo ou nome original
          const diskMatch = diskFiles.find(df => 
            df === target || 
            df.endsWith(target) || 
            (target.includes('.') && df.includes(target)) ||
            (target.replace('NF-', '') && df.includes(target.replace('NF-', '').replace('.pdf', '')))
          );

          if (diskMatch && !addedDiskFiles.has(diskMatch)) {
            try {
              const filePath = path.join(uploadDir, diskMatch);
              const stat = fs.statSync(filePath);
              if (stat.isFile() && stat.size > 0) {
                const dataBuffer = fs.readFileSync(filePath);
                
                // Nome amigável e limpo para o Google Drive
                let cleanFileName = diskMatch;
                if (/^\d+-\d+-/.test(diskMatch)) {
                  cleanFileName = diskMatch.replace(/^\d+-\d+-/, '');
                }

                files.push({
                  filename: cleanFileName,
                  sizeBytes: stat.size,
                  contentBase64: dataBuffer.toString('base64')
                });
                addedDiskFiles.add(diskMatch);
              }
            } catch (e) {
              console.error(`Erro ao ler arquivo ${diskMatch} para backup:`, e);
            }
          }
        }
      }
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPackage = {
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

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="agrovenda_backup_completo_${timestamp}.json"`);
    res.send(JSON.stringify(backupPackage, null, 2));
  } catch (err) {
    console.error('Erro ao gerar exportação de backup:', err);
    res.status(500).json({ error: 'Erro ao gerar backup completo' });
  }
});

// POST /api/backup/restore
router.post('/restore', upload.single('backupFile'), async (req, res) => {
  try {
    let backupData = null;

    if (req.file) {
      const rawText = fs.readFileSync(req.file.path, 'utf-8');
      backupData = JSON.parse(rawText);
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    } else if (req.body.backupJson) {
      backupData = typeof req.body.backupJson === 'string' ? JSON.parse(req.body.backupJson) : req.body.backupJson;
    } else {
      return res.status(400).json({ error: 'Nenhum arquivo de backup fornecido' });
    }

    if (!backupData || !backupData.database) {
      return res.status(400).json({ error: 'Formato de arquivo de backup inválido' });
    }

    const { sales, clients, products, purchases, weighingSlips, financialSummaries, users } = backupData.database;

    // 1. Restore Collections
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

    if (Array.isArray(purchases)) {
      await Purchase.deleteMany({});
      if (purchases.length > 0) await Purchase.insertMany(purchases);
    }

    if (Array.isArray(weighingSlips)) {
      await WeighingSlip.deleteMany({});
      if (weighingSlips.length > 0) await WeighingSlip.insertMany(weighingSlips);
    }

    if (Array.isArray(financialSummaries)) {
      await FinancialSummary.deleteMany({});
      if (financialSummaries.length > 0) await FinancialSummary.insertMany(financialSummaries);
    }

    if (Array.isArray(users)) {
      await User.deleteMany({});
      if (users.length > 0) await User.insertMany(users);
    }

    // 2. Restore Files
    let restoredFilesCount = 0;
    if (Array.isArray(backupData.files)) {
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      backupData.files.forEach(f => {
        try {
          if (f.filename && f.contentBase64) {
            const targetPath = path.join(uploadDir, f.filename);
            const buffer = Buffer.from(f.contentBase64, 'base64');
            fs.writeFileSync(targetPath, buffer);
            restoredFilesCount++;
          }
        } catch (e) {
          console.error(`Erro ao restaurar arquivo ${f.filename}:`, e);
        }
      });
    }

    // 3. Recalibrate atomic sequence counters (Prevents E11000 duplicate key errors)
    await recalibrateCounters();

    res.json({
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
    });
  } catch (err) {
    console.error('Erro ao restaurar backup:', err);
    res.status(500).json({ error: `Falha na restauração: ${err.message}` });
  }
});

module.exports = router;
