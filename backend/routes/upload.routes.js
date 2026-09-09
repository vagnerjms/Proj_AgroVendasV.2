const express = require('express');
const router = express.Router();
const fs = require('fs');
const { upload } = require('../middlewares/upload');
const NfeParserService = require('../services/nfeParser.service');
const { ensureProductsRegistered } = require('../services/product.service');
const { cleanupOrphanUploads } = require('../services/cleanup.service');

// POST /api/upload (Generic upload for canhotos, recibos, fotos with proper error handling)
router.post('/upload', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: `Erro no upload: ${err.message}` });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }
    res.json({
      success: true,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size
    });
  });
});

// POST /api/nfe/parse (Parse XML/PDF DANFE with automatic orphan cleanup on failure)
router.post('/nfe/parse', (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: `Erro no upload do documento fiscal: ${err.message}` });
    }

    const filePath = req.file ? req.file.path : null;
    const originalName = req.file ? req.file.originalname : 'nfe.xml';
    const rawXmlContent = req.body?.xmlContent;

    if (!filePath && !rawXmlContent) {
      return res.status(400).json({ error: 'Nenhum arquivo XML ou PDF fornecido' });
    }

    try {
      const parsedData = await NfeParserService.parse(filePath, originalName, rawXmlContent);
      if (req.file) {
        parsedData.filename = req.file.filename;
      }

      // Auto-cadastra os produtos da NF no Catálogo de Produtos do sistema se ainda não existirem
      if (parsedData.items && Array.isArray(parsedData.items) && parsedData.items.length > 0) {
        ensureProductsRegistered(parsedData.items).catch(e => 
          console.warn('Aviso ao auto-cadastrar produtos:', e.message)
        );
      }

      res.json(parsedData);
    } catch (parseErr) {
      // Clean up orphaned physical file immediately on parse failure
      if (filePath) {
        fs.promises.unlink(filePath).catch(() => {});
      }
      console.error('Erro ao processar NF-e:', parseErr);
      res.status(400).json({ error: `Erro no processamento da NF-e: ${parseErr.message}` });
    }
  });
});

// POST /api/upload/cleanup (Limpar arquivos temporários órfãos que não foram salvos em nenhuma venda)
router.post('/upload/cleanup', async (req, res) => {
  try {
    const result = await cleanupOrphanUploads();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: `Erro na limpeza de uploads: ${err.message}` });
  }
});

module.exports = router;

