const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { connectDB } = require('./db');
const { uploadDir } = require('./middlewares/upload');

const app = express();
const PORT = process.env.PORT || 3001;

// Global Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static Uploads Serving
app.use('/uploads', express.static(uploadDir));

// Modular API Routes
app.use('/api', require('./routes/upload.routes'));
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/users.routes'));
app.use('/api/dashboard', require('./routes/dashboard.routes'));
app.use('/api/sales', require('./routes/sales.routes'));
app.use('/api/weighings', require('./routes/weighings.routes'));
app.use('/api/clients', require('./routes/clients.routes'));
app.use('/api/products', require('./routes/products.routes'));
app.use('/api/purchases', require('./routes/purchases.routes'));
app.use('/api/reports', require('./routes/reports.routes'));
app.use('/api/backup', require('./routes/backup.routes'));

// Static frontend serving in production
const frontendDist = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Start Server and MongoDB Connection
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`🌾 [AgroVenda V2 Backend] Servidor rodando na porta ${PORT}`);
  await connectDB();
});

module.exports = app;
