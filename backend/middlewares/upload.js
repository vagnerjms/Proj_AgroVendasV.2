const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/**
 * Sanitiza o nome do arquivo para prevenir problemas com URLs e caracteres especiais
 */
function sanitizeFilename(name) {
  if (!name) return 'arquivo';
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-zA-Z0-9._-]/g, '_') // substitui caracteres especiais por _
    .replace(/_{2,}/g, '_');
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const cleanName = sanitizeFilename(file.originalname);
    cb(null, `${uniqueSuffix}-${cleanName}`);
  }
});

const ALLOWED_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/xml',
  'text/xml',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv'
];

const fileFilter = (req, file, cb) => {
  const extValid = file.originalname && file.originalname.match(/\.(jpe?g|png|webp|pdf|xml|xls|xlsx|csv)$/i);
  if (ALLOWED_MIMES.includes(file.mimetype) || extValid) {
    cb(null, true);
  } else {
    cb(new Error(`Tipo de arquivo não permitido: ${file.mimetype || file.originalname}`), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 15 * 1024 * 1024 // 15MB
  }
});

module.exports = {
  upload,
  uploadDir,
  sanitizeFilename
};

