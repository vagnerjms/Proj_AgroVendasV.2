const express = require('express');
const router = express.Router();
const { Purchase, getNextSequence } = require('../db');

// GET /api/purchases
router.get('/', async (req, res) => {
  try {
    const purchases = await Purchase.find().sort({ createdAt: -1 });
    res.json(purchases);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar compras' });
  }
});

// POST /api/purchases
router.post('/', async (req, res) => {
  try {
    const seq = await getNextSequence('purchase_id', Purchase, 'CMP-2026-');
    const newPurchase = new Purchase({
      id: `CMP-2026-${String(seq).padStart(3, '0')}`,
      producer: req.body.producer,
      date: req.body.date || new Date().toISOString().split('T')[0],
      product: req.body.product,
      quantity: Number(req.body.quantity) || 0,
      unit: req.body.unit || "Sacas (60kg)",
      unitPrice: Number(req.body.unitPrice) || 0,
      total: Number(req.body.total) || 0,
      status: req.body.status || "Recebido",
      paymentStatus: req.body.paymentStatus || "A Pagar"
    });
    await newPurchase.save();
    res.status(201).json(newPurchase);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao registrar compra' });
  }
});

// PUT /api/purchases/:id
router.put('/:id', async (req, res) => {
  try {
    const allowed = ['producer', 'date', 'product', 'quantity', 'unit', 'unitPrice', 'total', 'status', 'paymentStatus', 'paidAmount'];
    const updateData = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updateData[key] = req.body[key];
    }

    const updated = await Purchase.findOneAndUpdate(
      { id: req.params.id },
      updateData,
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Compra não encontrada' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar compra' });
  }
});

// DELETE /api/purchases/:id
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Purchase.findOneAndDelete({ id: req.params.id });
    if (!deleted) return res.status(404).json({ error: 'Compra não encontrada' });
    res.json({ success: true, message: 'Compra excluída com sucesso' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir compra' });
  }
});

module.exports = router;
