const express = require('express');
const router = express.Router();
const { Client, Sale, getNextSequence } = require('../db');
const { escapeRegex } = require('../utils/security');
const { requireAuth } = require('../middlewares/auth');

// Protect all clients endpoints with JWT authentication
router.use(requireAuth);

// GET /api/clients
router.get('/', async (req, res) => {
  try {
    const { type, search } = req.query;
    let filter = {};
    if (type && type !== 'all') {
      filter.type = type;
    }
    if (search && search.trim()) {
      const escaped = escapeRegex(search);
      const regex = new RegExp(escaped, 'i');
      filter.$or = [
        { name: regex },
        { document: regex },
        { city: regex }
      ];
    }
    const clients = await Client.find(filter).sort({ name: 1 }).lean();
    res.json(clients);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar clientes' });
  }
});

// POST /api/clients
router.post('/', async (req, res) => {
  try {
    const seq = await getNextSequence('client_id', Client, 'CLI-');
    const newClient = new Client({
      id: `CLI-${seq}`,
      name: req.body.name,
      document: req.body.document,
      ie: req.body.ie || '',
      type: req.body.type || 'Comprador',
      city: req.body.city,
      uf: req.body.uf,
      email: req.body.email,
      phone: req.body.phone
    });
    await newClient.save();
    res.status(201).json(newClient);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao cadastrar cliente' });
  }
});

// PUT /api/clients/:id
router.put('/:id', async (req, res) => {
  try {
    const allowed = ['name', 'document', 'ie', 'type', 'city', 'uf', 'email', 'phone'];
    const updateData = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updateData[key] = req.body[key];
    }

    const updated = await Client.findOneAndUpdate(
      { id: req.params.id },
      updateData,
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Cliente não encontrado' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar cliente' });
  }
});

// DELETE /api/clients/:id
router.delete('/:id', async (req, res) => {
  try {
    const client = await Client.findOne({ id: req.params.id });
    if (!client) return res.status(404).json({ error: 'Cliente não encontrado' });

    // Check referential integrity with Sales
    const salesCount = await Sale.countDocuments({ client: client.name });
    if (salesCount > 0) {
      return res.status(400).json({ 
        error: `Não é possível excluir o parceiro "${client.name}" pois existem ${salesCount} vendas vinculadas a ele.` 
      });
    }

    await Client.findOneAndDelete({ id: req.params.id });
    res.json({ success: true, message: 'Cadastro excluído com sucesso' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir cliente' });
  }
});

module.exports = router;
