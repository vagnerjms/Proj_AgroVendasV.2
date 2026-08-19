const express = require('express');
const router = express.Router();
const { Product, Sale, getNextSequence } = require('../db');
const { escapeRegex } = require('../utils/security');

// GET /api/products
router.get('/', async (req, res) => {
  try {
    const { category, search } = req.query;
    let filter = {};
    if (category && category !== 'all') {
      filter.category = category;
    }
    if (search && search.trim()) {
      const escaped = escapeRegex(search);
      const regex = new RegExp(escaped, 'i');
      filter.name = regex;
    }
    const products = await Product.find(filter).sort({ name: 1 }).lean();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar produtos' });
  }
});

// POST /api/products
router.post('/', async (req, res) => {
  try {
    const seq = await getNextSequence('product_id', Product, 'PROD-');
    const newProduct = new Product({
      id: `PROD-${seq}`,
      name: req.body.name,
      category: req.body.category || 'Grãos',
      defaultUnit: req.body.defaultUnit || 'Caixas (29kg)',
      unitKg: Number(req.body.unitKg) || 29,
      currentStock: Number(req.body.currentStock) || 0,
      averageCost: Number(req.body.averageCost) || 0
    });
    await newProduct.save();
    res.status(201).json(newProduct);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao cadastrar produto' });
  }
});

// PUT /api/products/:id
router.put('/:id', async (req, res) => {
  try {
    const updateData = {};
    if (req.body.name !== undefined) updateData.name = req.body.name;
    if (req.body.category !== undefined) updateData.category = req.body.category;
    if (req.body.defaultUnit !== undefined) updateData.defaultUnit = req.body.defaultUnit;
    if (req.body.unitKg !== undefined) updateData.unitKg = Number(req.body.unitKg) || 29;
    if (req.body.currentStock !== undefined) updateData.currentStock = Number(req.body.currentStock) || 0;
    if (req.body.averageCost !== undefined) updateData.averageCost = Number(req.body.averageCost) || 0;

    const updated = await Product.findOneAndUpdate(
      { id: req.params.id },
      updateData,
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Produto não encontrado' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar produto' });
  }
});

// DELETE /api/products/:id
router.delete('/:id', async (req, res) => {
  try {
    const prod = await Product.findOne({ id: req.params.id });
    if (!prod) return res.status(404).json({ error: 'Produto não encontrado' });

    // Check referential integrity with Sales
    const salesCount = await Sale.countDocuments({ 'items.product': prod.name });
    if (salesCount > 0) {
      return res.status(400).json({ 
        error: `Não é possível excluir o produto "${prod.name}" pois existem ${salesCount} vendas associadas a ele.` 
      });
    }

    await Product.findOneAndDelete({ id: req.params.id });
    res.json({ success: true, message: 'Produto excluído com sucesso' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir produto' });
  }
});

module.exports = router;
