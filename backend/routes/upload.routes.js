const express = require('express');
const router = express.Router();
const { upload } = require('../middlewares/upload');
const NfeParserService = require('../services/nfeParser.service');

// POST /api/upload (Generic upload for canhotos, recibos, fotos)
router.post('/upload', upload.single('file'), (req, res) => {
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

// POST /api/nfe/parse (Parse XML/PDF DANFE)
router.post('/nfe/parse', upload.single('file'), async (req, res) => {
  try {
    const originalName = req.file ? req.file.originalname : 'nfe.xml';
    const filePath = req.file ? req.file.path : null;
    const rawXmlContent = req.body?.xmlContent;

    if (!filePath && !rawXmlContent) {
      return res.status(400).json({ error: 'Nenhum arquivo XML ou PDF fornecido' });
    }

    const parsedData = await NfeParserService.parse(filePath, originalName, rawXmlContent);
    if (req.file) {
      parsedData.filename = req.file.filename;
    }
    res.json(parsedData);
  } catch (err) {
    console.error('Erro ao processar NF-e:', err);
    res.status(400).json({ error: `Erro no processamento da NF-e: ${err.message}` });
  }
});

module.exports = router;
