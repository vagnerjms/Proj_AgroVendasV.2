const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  category: { type: String, default: 'Hortifruti' },
  defaultUnit: { type: String, default: 'Caixas (29kg)' },
  unitKg: { type: Number, default: 29 },
  currentStock: { type: Number, default: 0 },
  averageCost: { type: Number, default: 0 }
});

ProductSchema.index({ name: 1 });

const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

module.exports = { ProductSchema, Product };
